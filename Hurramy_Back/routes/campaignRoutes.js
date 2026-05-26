const express = require('express');
const router = express.Router();
const campaignController = require('../controllers/campaignController');
const { verifyToken, isAdmin } = require('../middleware/authMiddleware');
const upload = require('../config/multer');

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

// Upload team member picture
router.post('/upload-team-picture', verifyToken, isAdmin, upload.single('team_picture'), campaignController.uploadTeamPicture);

// Upload campaign banner (10:1 aspect ratio)
router.post('/upload-banner', verifyToken, isAdmin, upload.single('campaign_banner'), campaignController.uploadCampaignBanner);

// Upload campaign instructions image
router.post('/upload-instructions', verifyToken, isAdmin, upload.single('campaign_instructions'), campaignController.uploadCampaignInstructions);

module.exports = router;
