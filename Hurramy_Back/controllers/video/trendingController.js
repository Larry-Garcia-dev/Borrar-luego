const { Video, User, Like } = require('../../models');

exports.getTopVideos = async (req, res) => {
    try {
        const videos = await Video.findAll({
            include: [
                { model: User, attributes: ['email'] },
                { model: Like }
            ],
            order: [['views', 'DESC']],
            limit: 10,
        });

        const sorted = videos
            .map(v => {
                const vj = v.toJSON();
                vj.likeCount = (vj.Likes || []).length;
                return vj;
            })
            .sort((a, b) => {
                if (b.views !== a.views) return b.views - a.views;
                return b.likeCount - a.likeCount;
            });

        res.json(sorted);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching top videos', error });
    }
};

exports.getTrendingVideos = async (req, res) => {
    try {
        const videos = await Video.findAll({
            include: [
                { model: User, attributes: ['id', 'email', 'avatar'] },
                { model: Like }
            ],
        });

        const now = Date.now();

        const scored = videos.map(v => {
            const vj = v.toJSON();
            const likes = (vj.Likes || []).length;
            const views = vj.views || 0;
            const ageMs = now - new Date(vj.createdAt).getTime();
            const ageHours = Math.max(ageMs / (1000 * 60 * 60), 1);
            
            vj.trendingScore = (views + likes * 3) / ageHours;
            vj.likeCount = likes;
            return vj;
        });

        scored.sort((a, b) => b.trendingScore - a.trendingScore);

        res.json(scored.slice(0, 30));
    } catch (error) {
        res.status(500).json({ message: 'Error fetching trending videos', error });
    }
};

exports.getTrendingHashtags = async (req, res) => {
    try {
        const videos = await Video.findAll({
            attributes: ['description', 'tags', 'views'],
            include: [{ model: Like, attributes: ['id'] }],
        });

        const hashtagMap = {};
        videos.forEach(video => {
            const vj = video.toJSON();
            const likeCount = (vj.Likes || []).length;
            const viewWeight = vj.views || 0;

            const desc = vj.description || '';
            const matches = desc.match(/#[\w\u00C0-\u024F\u4e00-\u9fff]+/g) || [];
            matches.forEach(tag => {
                const lower = tag.toLowerCase();
                if (!hashtagMap[lower]) hashtagMap[lower] = { tag: lower, count: 0, weight: 0 };
                hashtagMap[lower].count += 1;
                hashtagMap[lower].weight += viewWeight + likeCount * 3;
            });

            let tagList = [];
            try {
                const rawTags = vj.tags;
                if (typeof rawTags === 'string') {
                    tagList = rawTags.split(',').map(t => t.trim()).filter(Boolean);
                } else if (Array.isArray(rawTags)) {
                    tagList = rawTags;
                }
            } catch { /* ignore */ }

            tagList.forEach(tagStr => {
                const ht = `#${tagStr.toLowerCase().replace(/^#/, '')}`;
                if (!hashtagMap[ht]) hashtagMap[ht] = { tag: ht, count: 0, weight: 0 };
                hashtagMap[ht].count += 1;
                hashtagMap[ht].weight += viewWeight + likeCount * 3;
            });
        });

        const sorted = Object.values(hashtagMap)
            .sort((a, b) => {
                if (b.weight !== a.weight) return b.weight - a.weight;
                return b.count - a.count;
            })
            .slice(0, 10);

        res.json(sorted);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching trending hashtags', error });
    }
};