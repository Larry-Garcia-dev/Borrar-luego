const multer = require('multer');
const multerS3 = require('multer-s3');
const { S3Client } = require('@aws-sdk/client-s3');
const path = require('path');
require('dotenv').config();

const useS3 = Boolean(process.env.AWS_S3_BUCKET_NAME);

let selectedStorage;


// 1. Inicializar el cliente de S3 v3
const s3 = new S3Client({
    region: process.env.AWS_REGION,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
    }
});

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    // Asegúrate de crear una carpeta llamada "uploads" en la raíz de tu proyecto
    cb(null, './uploads'); 
  },
  filename: function (req, file, cb) {
    // Guarda el archivo con la fecha actual para evitar nombres duplicados
    cb(null, Date.now() + '-' + file.originalname);
  }
});

// 2. Configurar fileFilter (se mantiene casi igual a tu versión anterior)
const fileFilter = (req, file, cb) => {
    if (file.fieldname === 'thumbnail' || file.fieldname === 'avatar' || file.fieldname === 'ai_image' || file.fieldname === 'team_picture' || file.fieldname === 'campaign_banner') {
        const allowedImages = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
        if (allowedImages.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Image: solo JPG, PNG, WEBP, GIF.'), false);
        }
    } else if (file.fieldname === 'ai_audio') {
        const allowedAudio = ['audio/mpeg', 'audio/wav', 'audio/mp3', 'audio/x-wav', 'audio/ogg', 'audio/webm'];
        if (allowedAudio.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Audio: solo MP3, WAV, OGG, WEBM.'), false);
        }
    } else {
        const allowedVideos = ['video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/webm'];
        if (allowedVideos.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Video: solo MP4, MOV, AVI, WEBM.'), false);
        }
    }
};

// 3. Configurar Multer-S3
// 1. Verificamos si tenemos el nombre del bucket en el .env

// 2. Condicional: Elegir S3 o Local
if (useS3) {
    console.log('☁️ Multer configurado: Usando Amazon S3');
    selectedStorage = multerS3({
        s3: s3,
        bucket: process.env.AWS_S3_BUCKET_NAME,
        metadata: function (req, file, cb) {
            cb(null, { fieldName: file.fieldname });
        },
        key: function (req, file, cb) {
            const ext = path.extname(file.originalname);
            let folder = 'uploads/';
            let prefix = 'file';
            let cleanName = '';

            // Nombres aleatorios para la IA, team pictures, y campaign banners
            if (file.fieldname === 'ai_image' || file.fieldname === 'ai_audio' || file.fieldname === 'team_picture' || file.fieldname === 'campaign_banner') {
                const randomName = Math.random().toString(36).substring(2, 7);
                let folder = 'ai-media/';
                if (file.fieldname === 'team_picture') folder = 'team-pictures/';
                if (file.fieldname === 'campaign_banner') folder = 'campaign-banners/';
                return cb(null, `${folder}${randomName}${ext}`);
            }

            // Para videos y thumbnails
            const baseName = req.body.title ? req.body.title : path.parse(file.originalname).name;
            cleanName = baseName.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').substring(0, 30);

            // Asignar "carpetas" dentro del bucket S3
            if (file.fieldname === 'thumbnail') {
                folder = 'thumbnails/';
                prefix = 'thumb';
            } else if (file.fieldname === 'videoFile') {
                folder = 'videos/';
                prefix = 'vid';
            } else if (file.fieldname === 'avatar') {
                folder = 'avatars/';
                prefix = 'avatar';
            }

            cb(null, `${folder}${prefix}-${Date.now()}-${cleanName}${ext}`);
        }
    });
} else {
    console.log('📁 Multer configurado: Usando almacenamiento LOCAL');
    selectedStorage = multer.diskStorage({
        destination: function (req, file, cb) {
            // Recuerda tener creada la carpeta 'uploads' en tu proyecto
            cb(null, './uploads'); 
        },
        filename: function (req, file, cb) {
            cb(null, Date.now() + '-' + file.originalname);
        }
    });
}

// 3. Inicializar Multer pasándole el storage dinámico que elegimos arriba
const upload = multer({
    fileFilter: fileFilter,
    limits: { fileSize: 500 * 1024 * 1024 }, // Límite de 500 MB
    storage: selectedStorage
});

module.exports = upload;
