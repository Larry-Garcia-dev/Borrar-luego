const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const CampaignTeamMember = sequelize.define('CampaignTeamMember', {
    name: {
        type: DataTypes.STRING(100),
        allowNull: false,
        validate: {
            len: [1, 100]
        }
    },
    role: {
        type: DataTypes.ENUM('Organizer', 'Judge'),
        allowNull: false,
        defaultValue: 'Organizer'
    },
    pictureUrl: {
        type: DataTypes.STRING,
        allowNull: true
    },
    bio: {
        type: DataTypes.STRING(500),
        allowNull: true,
        validate: {
            len: [0, 500]
        }
    },
    campaignId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'Campaigns',
            key: 'id'
        }
    }
});

module.exports = CampaignTeamMember;
