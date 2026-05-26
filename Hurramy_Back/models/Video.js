const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Video = sequelize.define('Video', {
    title: {
        type: DataTypes.STRING,
        allowNull: false
    },
    description: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    videoUrl: {
        type: DataTypes.STRING,
        allowNull: false
    },
    thumbnailUrl: {
        type: DataTypes.STRING,
        allowNull: true
    },
    category: {
        type: DataTypes.STRING,
        allowNull: true,
        defaultValue: 'General'
    },
    tags: {
        type: DataTypes.TEXT,
        allowNull: true,
        get() {
            const raw = this.getDataValue('tags');
            return raw ? JSON.parse(raw) : [];
        },
        set(value) {
            this.setDataValue('tags', JSON.stringify(value));
        }
    },
    duration: {
        type: DataTypes.FLOAT, 
        allowNull: false
    },
    views: {
        type: DataTypes.INTEGER,
        defaultValue: 0
    },
    flowers: {
        type: DataTypes.INTEGER,
        defaultValue: 0
    }
}, {
    timestamps: true
});

module.exports = Video;
