// Agregador de módulos
const crudController = require('./video/crudController');
const trendingController = require('./video/trendingController');
const interactionController = require('./video/interactionController');

// Exportamos todo en un solo objeto para no romper el archivo de rutas (videoRoutes.js)
module.exports = {
    ...crudController,
    ...trendingController,
    ...interactionController
};

// const { Video, User, Comment, Like } = require('../models'); // Importar todos los modelos
// const { getVideoDurationInSeconds } = require('get-video-duration');
// const ffprobe = require('ffprobe-static');
// const fs = require('fs');

// // ... (Mantén aquí tu función uploadVideo tal cual como estaba) ...
// // Para ahorrar espacio, solo pongo el código nuevo abajo, 
// // pero asegúrate de NO borrar uploadVideo.

// exports.uploadVideo = async (req, res) => {
//     try {
//         const videoFile = req.files?.videoFile?.[0];
//         const thumbnailFile = req.files?.thumbnail?.[0];

//         if (!videoFile) return res.status(400).json({ message: 'No video file provided' });
        
//         const videoPath = videoFile.path;
//         const duration = await getVideoDurationInSeconds(videoPath, ffprobe.path);
        
//         if (duration > 600) {
//             fs.unlinkSync(videoPath);
//             if (thumbnailFile) fs.unlinkSync(thumbnailFile.path);
//             return res.status(400).json({ message: 'Video exceeds 10 minutes limit.' });
//         }

//         // Parse tags from comma-separated string
//         let tags = [];
//         if (req.body.tags) {
//             try {
//                 tags = typeof req.body.tags === 'string' ? req.body.tags.split(',').map(t => t.trim()).filter(Boolean) : [];
//             } catch { tags = []; }
//         }

//         const newVideo = await Video.create({
//             title: req.body.title,
//             description: req.body.description,
//             videoUrl: videoPath,
//             thumbnailUrl: thumbnailFile ? thumbnailFile.path : null,
//             category: req.body.category || 'General',
//             tags: tags,
//             duration: duration,
//             userId: req.body.userId
//         });
//         res.status(201).json({ message: 'Video uploaded successfully', video: newVideo });
//     } catch (e) {
//         res.status(500).json({ error: e.message });
//     }
// };

// // Update video (title, description, thumbnail)
// exports.updateVideo = async (req, res) => {
//     try {
//         const { id } = req.params;
//         const { title, description } = req.body;
//         const thumbnailFile = req.files?.thumbnail?.[0] || req.file;

//         const video = await Video.findByPk(id);
//         if (!video) return res.status(404).json({ message: 'Video not found' });

//         if (title !== undefined) video.title = title;
//         if (description !== undefined) video.description = description;
//         if (thumbnailFile) {
//             video.thumbnailUrl = thumbnailFile.path;
//         }

//         await video.save();

//         res.json({
//             message: 'Video updated',
//             video: video.toJSON()
//         });
//     } catch (error) {
//         res.status(500).json({ error: error.message });
//     }
// };

// // Delete video
// exports.deleteVideo = async (req, res) => {
//     try {
//         const { id } = req.params;
//         const { userId } = req.body;

//         const video = await Video.findByPk(id);
//         if (!video) return res.status(404).json({ message: 'Video not found' });

//         // Only allow the owner to delete
//         if (video.userId !== userId) {
//             return res.status(403).json({ message: 'Not authorized' });
//         }

//         // Delete files from disk
//         if (video.videoUrl && fs.existsSync(video.videoUrl)) {
//             fs.unlinkSync(video.videoUrl);
//         }
//         if (video.thumbnailUrl && fs.existsSync(video.thumbnailUrl)) {
//             fs.unlinkSync(video.thumbnailUrl);
//         }

//         // Delete related likes and comments first
//         await Like.destroy({ where: { videoId: id } });
//         await Comment.destroy({ where: { videoId: id } });
//         await video.destroy();

//         res.json({ message: 'Video deleted' });
//     } catch (error) {
//         res.status(500).json({ error: error.message });
//     }
// };

// exports.getAllVideos = async (req, res) => {
//     try {
//         // Pagination parameters from query string
//         const page = parseInt(req.query.page) || 1;
//         const limit = parseInt(req.query.limit) || 6;
//         const offset = (page - 1) * limit;

//         // Use findAndCountAll for pagination with total count
//         const { count, rows } = await Video.findAndCountAll({
//             include: [
//                 { model: User, attributes: ['email'] },
//                 { model: Like }
//             ],
//             order: [['createdAt', 'DESC']],
//             limit,
//             offset,
//             distinct: true // Important when using include to avoid incorrect count
//         });

//         const totalPages = Math.ceil(count / limit);
//         const hasMore = page < totalPages;

//         res.status(200).json({
//             videos: rows,
//             currentPage: page,
//             totalPages,
//             totalVideos: count,
//             hasMore
//         });
//     } catch (error) {
//         res.status(500).json({ message: 'Error al obtener videos', error });
//     }
// };

// // Top 10 most-viewed / most-liked videos
// exports.getTopVideos = async (req, res) => {
//     try {
//         const videos = await Video.findAll({
//             include: [
//                 { model: User, attributes: ['email'] },
//                 { model: Like }
//             ],
//             order: [['views', 'DESC']],
//             limit: 10,
//         });

//         // Secondary sort: by likes count descending (for equal views)
//         const sorted = videos
//             .map(v => {
//                 const vj = v.toJSON();
//                 vj.likeCount = (vj.Likes || []).length;
//                 return vj;
//             })
//             .sort((a, b) => {
//                 if (b.views !== a.views) return b.views - a.views;
//                 return b.likeCount - a.likeCount;
//             });

//         res.json(sorted);
//     } catch (error) {
//         res.status(500).json({ message: 'Error fetching top videos', error });
//     }
// };

// // Trending videos: highest (views + likes*3) / ageInHours  --  rewards recent viral content
// exports.getTrendingVideos = async (req, res) => {
//     try {
//         const videos = await Video.findAll({
//             include: [
//                 { model: User, attributes: ['id', 'email', 'avatar'] },
//                 { model: Like }
//             ],
//         });

//         const now = Date.now();

//         const scored = videos.map(v => {
//             const vj = v.toJSON();
//             const likes = (vj.Likes || []).length;
//             const views = vj.views || 0;
//             const ageMs = now - new Date(vj.createdAt).getTime();
//             // Minimum 1 hour to avoid division by near-zero
//             const ageHours = Math.max(ageMs / (1000 * 60 * 60), 1);
//             // Score: engagement per hour, likes weighted x3
//             vj.trendingScore = (views + likes * 3) / ageHours;
//             vj.likeCount = likes;
//             return vj;
//         });

//         scored.sort((a, b) => b.trendingScore - a.trendingScore);

//         res.json(scored.slice(0, 30));
//     } catch (error) {
//         res.status(500).json({ message: 'Error fetching trending videos', error });
//     }
// };

// // Trending hashtags extracted from all video descriptions + tags
// exports.getTrendingHashtags = async (req, res) => {
//     try {
//         const videos = await Video.findAll({
//             attributes: ['description', 'tags', 'views'],
//             include: [{ model: Like, attributes: ['id'] }],
//         });

//         const hashtagMap = {};
//         videos.forEach(video => {
//             const vj = video.toJSON();
//             const likeCount = (vj.Likes || []).length;
//             const viewWeight = vj.views || 0;

//             // Extract #hashtags from description
//             const desc = vj.description || '';
//             const matches = desc.match(/#[\w\u00C0-\u024F\u4e00-\u9fff]+/g) || [];
//             matches.forEach(tag => {
//                 const lower = tag.toLowerCase();
//                 if (!hashtagMap[lower]) hashtagMap[lower] = { tag: lower, count: 0, weight: 0 };
//                 hashtagMap[lower].count += 1;
//                 hashtagMap[lower].weight += viewWeight + likeCount * 3;
//             });

//             // Also count comma-separated tags field
//             let tagList = [];
//             try {
//                 const rawTags = vj.tags;
//                 if (typeof rawTags === 'string') {
//                     tagList = rawTags.split(',').map(t => t.trim()).filter(Boolean);
//                 } else if (Array.isArray(rawTags)) {
//                     tagList = rawTags;
//                 }
//             } catch { /* ignore */ }

//             tagList.forEach(tagStr => {
//                 const ht = `#${tagStr.toLowerCase().replace(/^#/, '')}`;
//                 if (!hashtagMap[ht]) hashtagMap[ht] = { tag: ht, count: 0, weight: 0 };
//                 hashtagMap[ht].count += 1;
//                 hashtagMap[ht].weight += viewWeight + likeCount * 3;
//             });
//         });

//         // Sort by weighted score (views + likes * 3), then by count
//         const sorted = Object.values(hashtagMap)
//             .sort((a, b) => {
//                 if (b.weight !== a.weight) return b.weight - a.weight;
//                 return b.count - a.count;
//             })
//             .slice(0, 10);

//         res.json(sorted);
//     } catch (error) {
//         res.status(500).json({ message: 'Error fetching trending hashtags', error });
//     }
// };

// // --- NUEVAS FUNCIONES ---

// // 1. Obtener un solo video y sus detalles (Comentarios y Likes)
// exports.getVideoById = async (req, res) => {
//     try {
//         const { id } = req.params;
//         const video = await Video.findByPk(id, {
//             include: [
//                 { model: User, attributes: ['email'] }, // Dueño del video
//                 { model: Comment, include: [User] },    // Comentarios y sus autores
//                 { model: Like }                         // Likes
//             ]
//         });

//         if (!video) return res.status(404).json({ message: 'Video no encontrado' });

//         // Incrementar Vistas (Requerimiento 5.4)
//         video.views += 1;
//         await video.save();

//         res.json(video);
//     } catch (error) {
//         res.status(500).json({ message: 'Error server', error });
//     }
// };

// // 2. Dar Like (Requerimiento 5.5)
// exports.likeVideo = async (req, res) => {
//     try {
//         const { id } = req.params;
//         const { userId } = req.body;

//         // Verificar si ya dio like
//         const existingLike = await Like.findOne({ where: { videoId: id, userId } });
        
//         if (existingLike) {
//             return res.status(400).json({ message: 'Ya diste like a este video' });
//         }

//         await Like.create({ videoId: id, userId });
//         res.json({ message: 'Like agregado' });
//     } catch (error) {
//         res.status(500).json({ error });
//     }
// };

// // 3. Comentar (Requerimiento 5.6)
// exports.commentVideo = async (req, res) => {
//     try {
//         const { id } = req.params;
//         const { userId, text } = req.body;

//         const newComment = await Comment.create({
//             text,
//             videoId: id,
//             userId
//         });
        
//         // Devolvemos el comentario con el usuario para mostrarlo al instante
//         const commentWithUser = await Comment.findByPk(newComment.id, { include: [User] });
//         res.json(commentWithUser);
//     } catch (error) {
//         res.status(500).json({ error });
//     }
// };

// // 4. Unlike Video (Toggle like)
// exports.unlikeVideo = async (req, res) => {
//     try {
//         const { id } = req.params;
//         const { userId } = req.body;

//         const existingLike = await Like.findOne({ where: { videoId: id, userId } });
        
//         if (!existingLike) {
//             return res.status(400).json({ message: 'You have not liked this video' });
//         }

//         await existingLike.destroy();
//         res.json({ message: 'Like removed' });
//     } catch (error) {
//         res.status(500).json({ error });
//     }
// };

// // 5. Delete Comment
// exports.deleteComment = async (req, res) => {
//     try {
//         const { id, commentId } = req.params;
//         const { userId } = req.body;

//         const comment = await Comment.findByPk(commentId);
        
//         if (!comment) {
//             return res.status(404).json({ message: 'Comment not found' });
//         }

//         // Only allow the comment owner to delete
//         if (comment.userId !== userId) {
//             return res.status(403).json({ message: 'Not authorized to delete this comment' });
//         }

//         await comment.destroy();
//         res.json({ message: 'Comment deleted' });
//     } catch (error) {
//         res.status(500).json({ error });
//     }
// };

// // 6. Toggle Like (Like if not liked, unlike if already liked)
// exports.toggleLike = async (req, res) => {
//     try {
//         const { id } = req.params;
//         const { userId } = req.body;

//         const existingLike = await Like.findOne({ where: { videoId: id, userId } });
        
//         if (existingLike) {
//             await existingLike.destroy();
//             return res.json({ message: 'Like removed', liked: false });
//         }

//         await Like.create({ videoId: id, userId });
//         res.json({ message: 'Like added', liked: true });
//     } catch (error) {
//         res.status(500).json({ error });
//     }
// };
