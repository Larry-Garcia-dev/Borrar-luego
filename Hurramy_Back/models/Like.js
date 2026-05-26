const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Like = sequelize.define('Like', {
    // Esta tabla es sencilla, su función principal es relacionar UserID y VideoID
    // para evitar duplicados.
}, {
    timestamps: true
});

module.exports = Like;