const express = require('express');
const router = express.Router();
const campaignController = require('../controllers/campaignController');
const { verifyToken, isAdmin } = require('../middleware/authMiddleware');

// ========== RUTAS PUBLICAS (sin autenticacion) ==========
router.get('/', campaignController.getActiveCampaigns);    // Listar campanas activas
router.get('/:id', campaignController.getCampaignDetails); // Ver detalles y ranking

// ========== RUTAS PROTEGIDAS (requieren token) ==========
// Unirse a campana (solo usuarios logueados)
router.post('/:id/join', verifyToken, campaignController.joinCampaign);

// ========== RUTAS DE ADMIN (requieren token + rol admin) ==========
router.post('/create', verifyToken, isAdmin, campaignController.createCampaign);
router.put('/:id', verifyToken, isAdmin, campaignController.updateCampaign);
router.delete('/:id', verifyToken, isAdmin, campaignController.deleteCampaign);

module.exports = router;
