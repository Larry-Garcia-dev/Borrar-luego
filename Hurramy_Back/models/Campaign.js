const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Campaign = sequelize.define('Campaign', {
    name: {
        type: DataTypes.STRING,
        allowNull: false
    },
    objective: {
        type: DataTypes.STRING,
        allowNull: true
    },
    description: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    startDate: {
        type: DataTypes.DATEONLY,
        allowNull: false
    },
    endDate: {
        type: DataTypes.DATEONLY,
        allowNull: false
    },
    status: {
        type: DataTypes.ENUM('Active', 'Inactive'),
        defaultValue: 'Active'
    }
});

module.exports = Campaign;