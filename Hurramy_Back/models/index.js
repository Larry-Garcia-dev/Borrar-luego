const User = require('./User');
const Video = require('./Video');
const Comment = require('./Comment');
const Like = require('./Like');
const Campaign = require('./Campaign');
const Follow = require('./Follow');

// --- Relaciones Usuario - Video ---
User.hasMany(Video, { foreignKey: 'userId' });
Video.belongsTo(User, { foreignKey: 'userId' });

// --- Relaciones Comentarios ---
User.hasMany(Comment, { foreignKey: 'userId' });
Comment.belongsTo(User, { foreignKey: 'userId' });

Video.hasMany(Comment, { foreignKey: 'videoId' });
Comment.belongsTo(Video, { foreignKey: 'videoId' });

// --- Relaciones Likes ---
User.hasMany(Like, { foreignKey: 'userId' });
Like.belongsTo(User, { foreignKey: 'userId' });

Video.hasMany(Like, { foreignKey: 'videoId' });
Like.belongsTo(Video, { foreignKey: 'videoId' });

// --- Relaciones Follow ---
// Un usuario puede seguir a muchos usuarios
User.belongsToMany(User, {
    as: 'Followers',
    through: Follow,
    foreignKey: 'followingId',
    otherKey: 'followerId'
});
User.belongsToMany(User, {
    as: 'Following',
    through: Follow,
    foreignKey: 'followerId',
    otherKey: 'followingId'
});
Follow.belongsTo(User, { as: 'follower', foreignKey: 'followerId' });
Follow.belongsTo(User, { as: 'following', foreignKey: 'followingId' });

// --- Relaciones Campanas ---
Campaign.belongsToMany(Video, { through: 'CampaignVideos' });
Video.belongsToMany(Campaign, { through: 'CampaignVideos' });

module.exports = {
    User,
    Video,
    Comment,
    Like,
    Campaign,
    Follow
};
