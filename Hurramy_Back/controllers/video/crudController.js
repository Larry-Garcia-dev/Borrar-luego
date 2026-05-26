const { Video, User, Comment, Like } = require('../../models');
const { formatMediaUrl } = require('../../helpers/mediaHelper');
const { getVideoDurationInSeconds } = require('get-video-duration');
const ffprobe = require('ffprobe-static');
const { S3Client, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const fs = require('fs'); // Agregado para poder borrar archivos locales
const path = require('path');

// 1. Verificar si usamos S3 o Local
const useS3 = Boolean(process.env.AWS_S3_BUCKET_NAME);

let s3;
if (useS3) {
    s3 = new S3Client({
        region: process.env.AWS_REGION,
        credentials: {
            accessKeyId: process.env.AWS_ACCESS_KEY_ID,
            secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
        }
    });
}

// Función auxiliar para eliminar archivos físicos o en la nube
const deleteFile = async (fileKeyOrUrl) => {
    if (!fileKeyOrUrl) return;
    try {
        if (useS3 && fileKeyOrUrl.includes(process.env.CDN_URL || '')) {
            const key = fileKeyOrUrl.split('/').pop();
            await s3.send(new DeleteObjectCommand({ Bucket: process.env.AWS_S3_BUCKET_NAME, Key: key }));
        } else if (!useS3) {
            // Extraer el nombre del archivo de la URL local y borrarlo
            const fileName = fileKeyOrUrl.split('/').pop();
            const localPath = path.join(process.cwd(), 'uploads', fileName);
            if (fs.existsSync(localPath)) fs.unlinkSync(localPath);
        }
    } catch (e) {
        console.error('Error al intentar borrar archivo:', e.message);
    }
};

exports.uploadVideo = async (req, res) => {
    try {
        const videoFile = req.files?.videoFile?.[0];
        const thumbnailFile = req.files?.thumbnail?.[0];

        if (!videoFile) return res.status(400).json({ message: 'No video file provided' });
        
        let finalVideoUrl = '';
        let finalThumbUrl = null;
        let pathForDuration = ''; // Ruta o URL que usará ffprobe

        // Generar URLs dependiendo del entorno (Local vs S3)
        if (useS3) {
            const cdnBase = (process.env.CDN_URL || '').replace(/\/$/, '');
            finalVideoUrl = `${cdnBase}/${videoFile.key}`;
            if (thumbnailFile) finalThumbUrl = `${cdnBase}/${thumbnailFile.key}`;
            pathForDuration = finalVideoUrl;
        } else {
            const baseUrl = `${req.protocol}://${req.get('host')}/uploads`;
            finalVideoUrl = `${baseUrl}/${videoFile.filename}`;
            if (thumbnailFile) finalThumbUrl = `${baseUrl}/${thumbnailFile.filename}`;
            pathForDuration = videoFile.path; // Archivo local para ffprobe
        }

        // ==========================================
        // ⏱ OBTENER DURACIÓN
        // ==========================================
        const duration = await getVideoDurationInSeconds(pathForDuration, ffprobe.path);
        
        if (duration > 600) {
            // Eliminar los archivos si excede el límite
            if (useS3) {
                await deleteFile(finalVideoUrl);
                if (thumbnailFile) await deleteFile(finalThumbUrl);
            } else {
                if (fs.existsSync(videoFile.path)) fs.unlinkSync(videoFile.path);
                if (thumbnailFile && fs.existsSync(thumbnailFile.path)) fs.unlinkSync(thumbnailFile.path);
            }
            return res.status(400).json({ message: 'Video exceeds 10 minutes limit.' });
        }

        // Procesar tags
        let tags = [];
        if (req.body.tags) {
            try {
                tags = typeof req.body.tags === 'string' ? req.body.tags.split(',').map(t => t.trim()).filter(Boolean) : [];
            } catch { tags = []; }
        }

        // 3. Guardar en Base de Datos
        const newVideo = await Video.create({
            title: req.body.title,
            description: req.body.description,
            videoUrl: finalVideoUrl,
            thumbnailUrl: finalThumbUrl,
            category: req.body.category || 'General',
            tags: tags,
            duration: duration,
            userId: req.body.userId
        });
        
        res.status(201).json({ message: 'Video uploaded successfully', video: newVideo });
    } catch (e) {
        console.error('Error al procesar el video:', e);
        
        // Limpieza de seguridad si falla la DB
        try {
            if (useS3) {
                if (req.files?.videoFile?.[0]?.key) await s3.send(new DeleteObjectCommand({ Bucket: process.env.AWS_S3_BUCKET_NAME, Key: req.files.videoFile[0].key }));
                if (req.files?.thumbnail?.[0]?.key) await s3.send(new DeleteObjectCommand({ Bucket: process.env.AWS_S3_BUCKET_NAME, Key: req.files.thumbnail[0].key }));
            } else {
                if (req.files?.videoFile?.[0]?.path && fs.existsSync(req.files.videoFile[0].path)) fs.unlinkSync(req.files.videoFile[0].path);
                if (req.files?.thumbnail?.[0]?.path && fs.existsSync(req.files.thumbnail[0].path)) fs.unlinkSync(req.files.thumbnail[0].path);
            }
        } catch (cleanupErr) {
            console.error('Error al intentar limpiar archivos fallidos:', cleanupErr);
        }

        res.status(500).json({ error: e.message || 'Internal server error during video upload' });
    }
};

exports.updateVideo = async (req, res) => {
    try {
        const { id } = req.params;
        const { title, description } = req.body;
        const thumbnailFile = req.files?.thumbnail?.[0] || req.file;

        const video = await Video.findByPk(id);
        if (!video) return res.status(404).json({ message: 'Video not found' });

        if (title !== undefined) video.title = title;
        if (description !== undefined) video.description = description;
        
        // Si subió una nueva miniatura
        if (thumbnailFile) {
            if (video.thumbnailUrl) await deleteFile(video.thumbnailUrl); // Borra la vieja
            
            if (useS3) {
                const cdnBase = (process.env.CDN_URL || '').replace(/\/$/, '');
                video.thumbnailUrl = `${cdnBase}/${thumbnailFile.key}`;
            } else {
                const baseUrl = `${req.protocol}://${req.get('host')}/uploads`;
                video.thumbnailUrl = `${baseUrl}/${thumbnailFile.filename}`;
            }
        }

        await video.save();
        res.json({ message: 'Video updated', video: video.toJSON() });
    } catch (error) {
        // Limpiar la miniatura recién subida si falla la BD
        if (req.files?.thumbnail?.[0]) {
            if (useS3) {
                await s3.send(new DeleteObjectCommand({ Bucket: process.env.AWS_S3_BUCKET_NAME, Key: req.files.thumbnail[0].key })).catch(e=>console.log(e));
            } else {
                if (fs.existsSync(req.files.thumbnail[0].path)) fs.unlinkSync(req.files.thumbnail[0].path);
            }
        }
        res.status(500).json({ error: error.message });
    }
};

exports.deleteVideo = async (req, res) => {
    try {
        const { id } = req.params;
        const { userId } = req.body;

        const video = await Video.findByPk(id);
        if (!video) return res.status(404).json({ message: 'Video not found' });

        if (video.userId !== userId) {
            return res.status(403).json({ message: 'Not authorized' });
        }

        // Borrar archivos físicos (S3 o Local)
        await deleteFile(video.videoUrl);
        await deleteFile(video.thumbnailUrl);

        await Like.destroy({ where: { videoId: id } });
        await Comment.destroy({ where: { videoId: id } });
        await video.destroy();

        res.json({ message: 'Video deleted' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.getMyVideos = async (req, res) => {
  try {
    const userId = req.user.id;
    const videos = await Video.findAll({
      where: { userId },
      include: [User, Like]
    });
    // Normalize URLs
    const formatted = videos.map(v => {
      const vid = v.toJSON();
      if (vid.videoUrl) vid.videoUrl = formatMediaUrl(vid.videoUrl);
      if (vid.thumbnailUrl) vid.thumbnailUrl = formatMediaUrl(vid.thumbnailUrl);
      return vid;
    });
    res.json(formatted);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
};

exports.getAllVideos = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 6;
        const offset = (page - 1) * limit;

        const { count, rows } = await Video.findAndCountAll({
            include: [
                { model: User, attributes: ['email'] },
                { model: Like }
            ],
            order: [['createdAt', 'DESC']],
            limit,
            offset,
            distinct: true 
        });

        // Normalizar URLs de video y thumbnail antes de enviarlas
        const formattedVideos = rows.map(v => {
          const vid = v.toJSON();
          if (vid.videoUrl) vid.videoUrl = formatMediaUrl(vid.videoUrl);
          if (vid.thumbnailUrl) vid.thumbnailUrl = formatMediaUrl(vid.thumbnailUrl);
          return vid;
        });
        res.status(200).json({
          videos: formattedVideos,
          currentPage: page,
          totalPages: Math.ceil(count / limit),
          totalVideos: count,
          hasMore: page < Math.ceil(count / limit)
        });
    } catch (error) {
        res.status(500).json({ message: 'Error al obtener videos', error });
    }
};

exports.getVideoById = async (req, res) => {
    try {
        const { id } = req.params;
        const video = await Video.findByPk(id, {
            include: [
                { model: User, attributes: ['email'] }, 
                { model: Comment, include: [User] },    
                { model: Like }                         
            ]
        });

        if (!video) return res.status(404).json({ message: 'Video no encontrado' });

        // Normalizar URLs antes de responder
        const vid = video.toJSON();
        if (vid.videoUrl) vid.videoUrl = formatMediaUrl(vid.videoUrl);
        if (vid.thumbnailUrl) vid.thumbnailUrl = formatMediaUrl(vid.thumbnailUrl);
        res.json(vid);
    } catch (error) {
        res.status(500).json({ message: 'Error server', error });
    }
};