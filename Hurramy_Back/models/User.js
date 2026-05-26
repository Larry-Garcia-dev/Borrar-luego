const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const User = sequelize.define('User', {
    email: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
            isEmail: true
        }
        // QUITAR "unique: true" DE AQUÍ
    },
    password: {
        type: DataTypes.STRING,
        allowNull: true
    },
    googleId: {
        type: DataTypes.STRING,
        allowNull: true
        // QUITAR "unique: true" DE AQUÍ
    },
    avatar: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    role: {
        type: DataTypes.ENUM('user', 'admin'),
        defaultValue: 'user'
    },
    status: {
        type: DataTypes.ENUM('Active', 'Disabled', 'Locked'),
        defaultValue: 'Active'
    },
    failedLoginAttempts: {
        type: DataTypes.INTEGER,
        defaultValue: 0
    },
    lockUntil: {
        type: DataTypes.DATE,
        allowNull: true
    },
    resetPasswordToken: {
        type: DataTypes.STRING,
        allowNull: true
    },
    resetPasswordExpire: {
        type: DataTypes.DATE,
        allowNull: true
    },
    language: {
        type: DataTypes.ENUM('en', 'es', 'zh'),
        defaultValue: 'en'
    },
    waiCoins: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        allowNull: false
    },
    coinsFrozen: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        allowNull: false
    }
}, {
    timestamps: true,
    // AGREGAR ESTO AL FINAL:
    indexes: [
        {
            unique: true,
            fields: ['email'],
            name: 'users_email_unique' // Nombre fijo para evitar duplicados
        },
        {
            unique: true,
            fields: ['googleId'],
            name: 'users_googleId_unique' // Nombre fijo
        }
    ]
});

module.exports = User;
