const { Campaign, Video, User, Like } = require('../models');
const { formatMediaUrl } = require('../helpers/mediaHelper');
const sequelize = require('../config/db');

// 1. Crear Campaña (Admin)
exports.createCampaign = async (req, res) => {
    try {
        const { name, description, startDate, endDate } = req.body;
        const newCampaign = await Campaign.create({
            name,
            description,
            startDate,
            endDate,
            status: 'Active'
        });
        res.status(201).json(newCampaign);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// 2. Obtener todas las campañas activas
exports.getActiveCampaigns = async (req, res) => {
    try {
        const campaigns = await Campaign.findAll({ where: { status: 'Active' } });
        res.json(campaigns);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// 3. Obtener Detalles de Campaña + Ranking (Top Videos)
exports.getCampaignDetails = async (req, res) => {
    try {
        const { id } = req.params;
        const campaign = await Campaign.findByPk(id, {
            include: [{
                model: Video,
                include: [User, Like], // Traer dueño y likes para contar
                through: { attributes: [] } // Ocultar tabla intermedia
            }]
        });

        if (!campaign) return res.status(404).json({ message: 'Campaña no encontrada' });

        // LOGICA DE RANKING: Ordenar videos por cantidad de Likes
        // Convertimos a JSON puro para poder manipular el array
        const campaignData = campaign.toJSON();
        
        // Calculamos likes y ordenamos
        campaignData.Videos.sort((a, b) => b.Likes.length - a.Likes.length);

        // Tomamos solo el Top 10
        campaignData.Videos = campaignData.Videos.slice(0, 10);

        // Normalizar URLs de video y thumbnail en los videos de la campaña
        campaignData.Videos = campaignData.Videos.map(v => {
          if (v.videoUrl) v.videoUrl = formatMediaUrl(v.videoUrl);
          if (v.thumbnailUrl) v.thumbnailUrl = formatMediaUrl(v.thumbnailUrl);
          return v;
        });
        res.json(campaignData);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
};

// 4. Unirse a campaña (Enlazar un video existente a la campaña)
exports.joinCampaign = async (req, res) => {
    try {
        const { id } = req.params; // ID Campaña
        const { videoId } = req.body; // ID Video a inscribir

        const campaign = await Campaign.findByPk(id);
        const video = await Video.findByPk(videoId);

        if (!campaign || !video) {
            return res.status(404).json({ message: 'Campaña o Video no encontrado' });
        }

        // Método mágico de Sequelize para relaciones N:M
        await campaign.addVideo(video);
        
        res.json({ message: '¡Video inscrito en la campaña exitosamente!' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// 5. Actualizar Campaña (Admin)
exports.updateCampaign = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, description, startDate, endDate, status } = req.body;

        const campaign = await Campaign.findByPk(id);
        if (!campaign) {
            return res.status(404).json({ message: 'Campaña no encontrada' });
        }

        // Actualizar solo los campos proporcionados
        if (name !== undefined) campaign.name = name;
        if (description !== undefined) campaign.description = description;
        if (startDate !== undefined) campaign.startDate = startDate;
        if (endDate !== undefined) campaign.endDate = endDate;
        if (status !== undefined) campaign.status = status;

        await campaign.save();
        res.json({ message: 'Campaña actualizada correctamente', campaign });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// 6. Eliminar Campaña (Admin)
exports.deleteCampaign = async (req, res) => {
    try {
        const { id } = req.params;

        const campaign = await Campaign.findByPk(id);
        if (!campaign) {
            return res.status(404).json({ message: 'Campaña no encontrada' });
        }

        await campaign.destroy();
        res.json({ message: 'Campaña eliminada correctamente' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
