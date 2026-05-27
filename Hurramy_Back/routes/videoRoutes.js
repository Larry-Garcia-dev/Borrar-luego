const express = require('express');
const router = express.Router();
const videoController = require('../controllers/videoController');
const upload = require('../config/multer');
const { verifyToken } = require('../middleware/authMiddleware');

// ========== RUTAS PUBLICAS (sin autenticacion) ==========
router.get('/', videoController.getAllVideos);
router.get('/top', videoController.getTopVideos);
router.get('/trending', videoController.getTrendingVideos);
router.get('/my', verifyToken, videoController.getMyVideos);

router.get('/:id', videoController.getVideoById);
router.post('/:id/view', videoController.incrementViews);

// ========== RUTAS PROTEGIDAS (requieren token) ==========
// Upload video
router.post('/upload', verifyToken, upload.fields([
    { name: 'videoFile', maxCount: 1 },
    { name: 'thumbnail', maxCount: 1 }
]), videoController.uploadVideo);

// Update video (title, description, thumbnail)
router.put('/:id', verifyToken, upload.fields([{ name: 'thumbnail', maxCount: 1 }]), videoController.updateVideo);

// Delete video
router.delete('/:id', verifyToken, videoController.deleteVideo);

// Likes
router.post('/:id/like', verifyToken, videoController.likeVideo);
router.delete('/:id/like', verifyToken, videoController.unlikeVideo);
router.post('/:id/toggle-like', verifyToken, videoController.toggleLike);

// Comments
router.post('/:id/comment', verifyToken, videoController.commentVideo);
router.delete('/:id/comment/:commentId', verifyToken, videoController.deleteComment);

// Flowers
router.post('/:id/flowers', verifyToken, videoController.giveFlowers);

module.exports = router;
