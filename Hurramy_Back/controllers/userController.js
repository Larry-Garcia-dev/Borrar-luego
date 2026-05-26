const { User, Video, Comment, Like, Follow } = require('../models');
const { Sequelize } = require('sequelize');
const sequelize = require('../config/db');

// Get current user data (for refreshing user info)
exports.getMe = async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ message: 'No autenticado' });
        }

        const user = await User.findByPk(userId, {
            attributes: ['id', 'email', 'avatar', 'language', 'role', 'status', 'waiCoins', 'coinsFrozen']
        });

        if (!user) {
            return res.status(404).json({ message: 'Usuario no encontrado' });
        }

        res.json(user);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Req 7.2: Permitir al usuario seleccionar idioma
exports.updateLanguage = async (req, res) => {
    try {
        const { userId, language } = req.body;

        const validLangs = ['en', 'es', 'zh'];
        if (!validLangs.includes(language)) {
            return res.status(400).json({ message: 'Idioma no soportado. Use: en, es, zh' });
        }

        const user = await User.findByPk(userId);
        if (!user) {
            return res.status(404).json({ message: 'Usuario no encontrado' });
        }

        await user.update({ language });

        res.json({ message: 'Idioma actualizado', language: user.language });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Get top creators ranked by total views + likes + comments + followers
exports.getTopCreators = async (req, res) => {
    try {
        const currentUserId = req.query.userId ? parseInt(req.query.userId) : null;

        // Get all users who have uploaded at least 1 video
        const creators = await User.findAll({
            attributes: [
                'id',
                'email',
                [Sequelize.fn('COUNT', Sequelize.col('Videos.id')), 'videoCount'],
                [Sequelize.fn('COALESCE', Sequelize.fn('SUM', Sequelize.col('Videos.views')), 0), 'totalViews'],
            ],
            include: [
                {
                    model: Video,
                    attributes: [],
                }
            ],
           group: ['User.id'],
            // CORRECCIÓN AQUÍ: Cambiar " por ` (backticks)
            having: Sequelize.literal('COUNT(`Videos`.`id`) > 0'), 
            // CORRECCIÓN AQUÍ: Cambiar "totalViews" por `totalViews` o simplemente totalViews
            order: [[Sequelize.literal('totalViews'), 'DESC']], 
            limit: 10,
            subQuery: false,
        });

        // For each creator, get likes count, comments count, followers count
        const creatorData = await Promise.all(creators.map(async (creator) => {
            const creatorJSON = creator.toJSON();

            // Count total likes on all their videos
            const likeCount = await Like.count({
                include: [{
                    model: Video,
                    where: { userId: creator.id },
                    attributes: []
                }]
            });

            // Count total comments on all their videos
            const commentCount = await Comment.count({
                include: [{
                    model: Video,
                    where: { userId: creator.id },
                    attributes: []
                }]
            });

            // Count followers
            const followerCount = await Follow.count({
                where: { followingId: creator.id }
            });

            // Check if current user follows this creator
            let isFollowing = false;
            if (currentUserId) {
                const follow = await Follow.findOne({
                    where: { followerId: currentUserId, followingId: creator.id }
                });
                isFollowing = !!follow;
            }

            // Calculate a score for ranking
            const totalViews = parseInt(creatorJSON.totalViews) || 0;
            const score = totalViews + (likeCount * 5) + (commentCount * 3) + (followerCount * 10);

            // Extract username from email
            const username = creatorJSON.email.split('@')[0];

            return {
                id: creator.id,
                email: creatorJSON.email,
                username: `@${username}`,
                videoCount: parseInt(creatorJSON.videoCount) || 0,
                totalViews,
                totalLikes: likeCount,
                totalComments: commentCount,
                followers: followerCount,
                isFollowing,
                score,
            };
        }));

        // Sort by score descending
        creatorData.sort((a, b) => b.score - a.score);

        res.json(creatorData.slice(0, 5));
    } catch (error) {
        console.error('getTopCreators error:', error);
        res.status(500).json({ error: error.message });
    }
};

// Follow a user
exports.followUser = async (req, res) => {
    try {
        const { followerId, followingId } = req.body;

        if (!followerId || !followingId) {
            return res.status(400).json({ message: 'followerId and followingId are required' });
        }

        if (parseInt(followerId) === parseInt(followingId)) {
            return res.status(400).json({ message: 'Cannot follow yourself' });
        }

        // Check if already following
        const existing = await Follow.findOne({
            where: { followerId, followingId }
        });

        if (existing) {
            return res.status(400).json({ message: 'Already following this user' });
        }

        await Follow.create({ followerId, followingId });
        
        // Return updated follower count
        const followerCount = await Follow.count({ where: { followingId } });

        res.json({ message: 'Followed successfully', followers: followerCount, isFollowing: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Unfollow a user
exports.unfollowUser = async (req, res) => {
    try {
        const { followerId, followingId } = req.body;

        if (!followerId || !followingId) {
            return res.status(400).json({ message: 'followerId and followingId are required' });
        }

        const existing = await Follow.findOne({
            where: { followerId, followingId }
        });

        if (!existing) {
            return res.status(400).json({ message: 'Not following this user' });
        }

        await existing.destroy();

        const followerCount = await Follow.count({ where: { followingId } });

        res.json({ message: 'Unfollowed successfully', followers: followerCount, isFollowing: false });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Toggle follow (follow/unfollow in one endpoint)
exports.toggleFollow = async (req, res) => {
    try {
        const { followerId, followingId } = req.body;

        if (!followerId || !followingId) {
            return res.status(400).json({ message: 'followerId and followingId are required' });
        }

        if (parseInt(followerId) === parseInt(followingId)) {
            return res.status(400).json({ message: 'Cannot follow yourself' });
        }

        const existing = await Follow.findOne({
            where: { followerId, followingId }
        });

        if (existing) {
            await existing.destroy();
            const followerCount = await Follow.count({ where: { followingId } });
            return res.json({ message: 'Unfollowed', followers: followerCount, isFollowing: false });
        }

        await Follow.create({ followerId, followingId });
        const followerCount = await Follow.count({ where: { followingId } });

        res.json({ message: 'Followed', followers: followerCount, isFollowing: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Update profile (email, language, avatar)
exports.updateProfile = async (req, res) => {
    try {
        const { userId, email, language } = req.body;
        const avatarFile = req.files?.avatar?.[0] || req.file;

        const user = await User.findByPk(userId);
        if (!user) return res.status(404).json({ message: 'User not found' });

        if (email && email !== user.email) {
            const exists = await User.findOne({ where: { email } });
            if (exists && exists.id !== user.id) {
                return res.status(400).json({ message: 'Email already in use' });
            }
            user.email = email;
        }

        const validLangs = ['en', 'es', 'zh'];
        if (language && validLangs.includes(language)) {
            user.language = language;
        }

        if (avatarFile) {
            user.avatar = '/' + avatarFile.path.replace(/\\/g, '/');
        }

        await user.save();

        res.json({
            message: 'Profile updated',
            user: {
                id: user.id,
                email: user.email,
                avatar: user.avatar,
                language: user.language,
                role: user.role,
                waiCoins: user.waiCoins,
                coinsFrozen: user.coinsFrozen,
            }
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Get users the current user follows + their most viewed video
exports.getFollowingFeed = async (req, res) => {
    try {
        const { id } = req.params;

        // Get all users that this user follows
        const follows = await Follow.findAll({
            where: { followerId: id },
            include: [{
                model: User,
                as: 'following',
                attributes: ['id', 'email', 'avatar']
            }]
        });

        if (!follows.length) {
            return res.json([]);
        }

        // For each followed user, get their most viewed video
        const feed = await Promise.all(follows.map(async (f) => {
            const followedUser = f.following;
            const username = followedUser.email.split('@')[0];

            // Get follower count for this user
            const followerCount = await Follow.count({ where: { followingId: followedUser.id } });

            // Get their most viewed video
            const topVideo = await Video.findOne({
                where: { userId: followedUser.id },
                order: [['views', 'DESC']],
                include: [{ model: Like }]
            });

            // Get total video count
            const videoCount = await Video.count({ where: { userId: followedUser.id } });

            return {
                id: followedUser.id,
                email: followedUser.email,
                avatar: followedUser.avatar,
                username: `@${username}`,
                followers: followerCount,
                videoCount,
                topVideo: topVideo ? {
                    id: topVideo.id,
                    title: topVideo.title,
                    thumbnailUrl: topVideo.thumbnailUrl,
                    videoUrl: topVideo.videoUrl,
                    views: topVideo.views || 0,
                    likes: topVideo.Likes?.length || 0,
                    category: topVideo.category,
                } : null,
            };
        }));

        // Sort by follower count descending
        feed.sort((a, b) => b.followers - a.followers);

        res.json(feed);
    } catch (error) {
        console.error('getFollowingFeed error:', error);
        res.status(500).json({ error: error.message });
    }
};

// Get videos liked by the current user (favorites)
exports.getFavorites = async (req, res) => {
    try {
        const { id } = req.params;

        const likes = await Like.findAll({
            where: { userId: id },
            include: [{
                model: Video,
                include: [
                    { model: User, attributes: ['id', 'email', 'avatar'] },
                    { model: Like }
                ]
            }],
            order: [['createdAt', 'DESC']]
        });

        const videos = likes
            .filter(l => l.Video)
            .map(l => l.Video);

        res.json(videos);
    } catch (error) {
        console.error('getFavorites error:', error);
        res.status(500).json({ error: error.message });
    }
};

// Get follower count for a user
exports.getFollowerCount = async (req, res) => {
    try {
        const { id } = req.params;
        const followerCount = await Follow.count({ where: { followingId: id } });
        const followingCount = await Follow.count({ where: { followerId: id } });
        res.json({ followers: followerCount, following: followingCount });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
