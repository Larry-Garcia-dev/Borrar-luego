const { Sequelize } = require('sequelize');
require('dotenv').config();

// Configura tus credenciales en el archivo .env más tarde
const sequelize = new Sequelize(
    process.env.DB_NAME,     // Nombre de la base de datos
    process.env.DB_USER,     // Usuario (ej. root)
    process.env.DB_PASS,     // Contraseña
    {
        host: process.env.DB_HOST, // ej. localhost
        dialect: 'mysql',
        logging: false, // Pon true si quieres ver las consultas SQL en la consola
    }
);

module.exports = sequelize;