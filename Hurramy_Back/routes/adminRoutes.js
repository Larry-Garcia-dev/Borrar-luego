const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { verifyToken, isAdmin } = require('../middleware/authMiddleware');

// 🛡️ BARRERA DE SEGURIDAD GLOBAL PARA ESTE ARCHIVO
// Cualquier ruta debajo de esta línea requerirá Token Y ser Admin
router.use(verifyToken, isAdmin);

// Rutas de Administración de Usuarios
router.get('/users/search', adminController.searchUsers);
router.put('/users/:id/role', adminController.updateUserRole);

// Rutas de WAi Coins Management
router.get('/users/:id', adminController.getUserDetails);
router.put('/users/:id/coins', adminController.updateUserCoins);
router.put('/users/:id/freeze', adminController.toggleCoinsFrozen);

// En el futuro puedes añadir aquí: router.delete('/videos/:id', adminController.deleteVideo);

module.exports = router;
