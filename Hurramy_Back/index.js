const express = require('express');
const cors = require('cors');
const sequelize = require('./config/db');
const path = require('path');
require('dotenv').config();

// Modelos
const { User, Video, Comment, Like, Campaign, Follow } = require('./models');

// Rutas
const authRoutes = require('./routes/authRoutes');
const videoRoutes = require('./routes/videoRoutes');
const campaignRoutes = require('./routes/campaignRoutes');
const userRoutes = require('./routes/userRoutes'); // Nueva ruta
const adminRoutes = require('./routes/adminRoutes');
const aiRoutes = require('./routes/aiRoutes');

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true })); // Para parsear form-data si es necesario

// Endpoints
app.use('/api/auth', authRoutes);
app.use('/api/videos', videoRoutes);
app.use('/api/campaigns', campaignRoutes);
app.use('/api/users', userRoutes); // Endpoint de usuarios
app.use('/api/admin', adminRoutes);
app.use('/api/ai', aiRoutes);

// Static Files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.get('/', (req, res) => {
    res.send('API ShortVideo v1.0.0 Online');
});

// Server Start hola mundo
const PORT = process.env.PORT || 5000;

// Lógica de seguridad para la base de datos
const isProduction = process.env.NODE_ENV === 'production';

const syncOptions = isProduction
    ? { alter: false }  // EN PRODUCCIÓN: No tocar la estructura automáticamente (seguridad)
    : { alter: true };  // EN DESARROLLO: Intentar actualizar cambios

sequelize.sync(syncOptions)
    .then(() => {
        console.log(`✅ Base de datos sincronizada (Modo: ${isProduction ? 'Producción' : 'Desarrollo'})`);
        app.listen(PORT, () => {
            console.log(`🚀 Servidor corriendo en puerto ${PORT}`);
        });
    })
    .catch(error => {
        console.error('❌ Error conexión BD:', error);
    });
