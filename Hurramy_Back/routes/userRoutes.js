const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const upload = require('../config/multer');
const { verifyToken } = require('../middleware/authMiddleware');

// ========== RUTAS PUBLICAS (sin autenticacion) ==========
// Creadores populares (para mostrar en homepage)
router.get('/top-creators', userController.getTopCreators);

// Follower count (informacion publica del perfil)
router.get('/:id/followers', userController.getFollowerCount);

// ========== RUTAS PROTEGIDAS (requieren token) ==========
// Get current user data
router.get('/me', verifyToken, userController.getMe);

// Profile update (with avatar upload)
router.put('/profile', verifyToken, upload.fields([{ name: 'avatar', maxCount: 1 }]), userController.updateProfile);

// Idioma
router.put('/language', verifyToken, userController.updateLanguage);

// Follow / Unfollow
router.post('/follow', verifyToken, userController.followUser);
router.post('/unfollow', verifyToken, userController.unfollowUser);
router.post('/toggle-follow', verifyToken, userController.toggleFollow);

// Following feed (users I follow + their top video)
router.get('/:id/following-feed', verifyToken, userController.getFollowingFeed);

// Favorites (videos I liked)
router.get('/:id/favorites', verifyToken, userController.getFavorites);

module.exports = router;
