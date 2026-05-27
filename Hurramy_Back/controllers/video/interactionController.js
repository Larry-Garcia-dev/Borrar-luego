const { Comment, Like, User, Video } = require('../../models');

exports.likeVideo = async (req, res) => {
    try {
        const { id } = req.params;
        const { userId } = req.body;

        const existingLike = await Like.findOne({ where: { videoId: id, userId } });
        if (existingLike) return res.status(400).json({ message: 'Ya diste like a este video' });

        await Like.create({ videoId: id, userId });
        res.json({ message: 'Like agregado' });
    } catch (error) {
        res.status(500).json({ error });
    }
};

exports.unlikeVideo = async (req, res) => {
    try {
        const { id } = req.params;
        const { userId } = req.body;

        const existingLike = await Like.findOne({ where: { videoId: id, userId } });
        if (!existingLike) return res.status(400).json({ message: 'You have not liked this video' });

        await existingLike.destroy();
        res.json({ message: 'Like removed' });
    } catch (error) {
        res.status(500).json({ error });
    }
};

exports.toggleLike = async (req, res) => {
    try {
        const { id } = req.params;
        const { userId } = req.body;

        const existingLike = await Like.findOne({ where: { videoId: id, userId } });
        
        if (existingLike) {
            await existingLike.destroy();
            return res.json({ message: 'Like removed', liked: false });
        }

        await Like.create({ videoId: id, userId });
        res.json({ message: 'Like added', liked: true });
    } catch (error) {
        res.status(500).json({ error });
    }
};

exports.commentVideo = async (req, res) => {
    try {
        const { id } = req.params;
        const { userId, text } = req.body;

        const newComment = await Comment.create({ text, videoId: id, userId });
        const commentWithUser = await Comment.findByPk(newComment.id, { include: [User] });
        res.json(commentWithUser);
    } catch (error) {
        res.status(500).json({ error });
    }
};

exports.deleteComment = async (req, res) => {
    try {
        const { commentId } = req.params;
        const { userId } = req.body;

        const comment = await Comment.findByPk(commentId);
        if (!comment) return res.status(404).json({ message: 'Comment not found' });

        if (comment.userId !== userId) {
            return res.status(403).json({ message: 'Not authorized to delete this comment' });
        }

        await comment.destroy();
        res.json({ message: 'Comment deleted' });
    } catch (error) {
        res.status(500).json({ error });
    }
};

exports.giveFlowers = async (req, res) => {
    try {
        const { id } = req.params;
        const { userId, flowersCount } = req.body;

        if (!flowersCount || flowersCount <= 0) {
            return res.status(400).json({ message: 'Invalid number of flowers' });
        }

        const user = await User.findByPk(userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        const requiredCoins = flowersCount * 10;
        if (user.waiCoins < requiredCoins) {
            return res.status(400).json({ message: 'Insufficient WAi coins' });
        }

        const video = await Video.findByPk(id);
        if (!video) {
            return res.status(404).json({ message: 'Video not found' });
        }

        // Deduct coins and add flowers
        user.waiCoins -= requiredCoins;
        video.flowers = (video.flowers || 0) + flowersCount;

        await user.save();
        await video.save();

        res.json({ 
            message: 'Flowers given successfully', 
            flowersGiven: flowersCount,
            videoFlowersTotal: video.flowers,
            remainingCoins: user.waiCoins 
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.incrementViews = async (req, res) => {
    try {
        const { id } = req.params;
        const video = await Video.findByPk(id);
        if (!video) return res.status(404).json({ message: 'Video not found' });
        video.views = (video.views || 0) + 1;
        await video.save();
        res.json({ message: 'View counted successfully', views: video.views });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};