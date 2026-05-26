const { Campaign, Video, User, Like, CampaignTeamMember } = require('../models');
const { formatMediaUrl } = require('../helpers/mediaHelper');
const sequelize = require('../config/db');

// 1. Crear Campaña (Admin)
exports.createCampaign = async (req, res) => {
    try {
        const { name, description, startDate, endDate, bannerUrl, teamMembers } = req.body;
        const newCampaign = await Campaign.create({
            name,
            description,
            startDate,
            endDate,
            bannerUrl: bannerUrl || null,
            status: 'Active'
        });

        // Create team members if provided
        if (teamMembers && Array.isArray(teamMembers) && teamMembers.length > 0) {
            for (const member of teamMembers) {
                await CampaignTeamMember.create({
                    name: member.name,
                    role: member.role,
                    pictureUrl: member.pictureUrl || null,
                    bio: member.bio || null,
                    campaignId: newCampaign.id
                });
            }
        }

        // Fetch the campaign with team members
        const campaignWithTeam = await Campaign.findByPk(newCampaign.id, {
            include: [{ model: CampaignTeamMember, as: 'teamMembers' }]
        });

        res.status(201).json(campaignWithTeam);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// 2. Obtener todas las campañas activas
exports.getActiveCampaigns = async (req, res) => {
    try {
        const campaigns = await Campaign.findAll({ 
            where: { status: 'Active' },
            include: [{ model: CampaignTeamMember, as: 'teamMembers' }]
        });
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
            include: [
                {
                    model: Video,
                    include: [User, Like], // Traer dueño y likes para contar
                    through: { attributes: [] } // Ocultar tabla intermedia
                },
                {
                    model: CampaignTeamMember,
                    as: 'teamMembers'
                }
            ]
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
        const { name, description, startDate, endDate, status, bannerUrl, teamMembers } = req.body;

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
        if (bannerUrl !== undefined) campaign.bannerUrl = bannerUrl;

        await campaign.save();

        // Update team members if provided
        if (teamMembers !== undefined && Array.isArray(teamMembers)) {
            // Delete existing team members
            await CampaignTeamMember.destroy({ where: { campaignId: id } });
            
            // Create new team members
            for (const member of teamMembers) {
                await CampaignTeamMember.create({
                    name: member.name,
                    role: member.role,
                    pictureUrl: member.pictureUrl || null,
                    bio: member.bio || null,
                    campaignId: id
                });
            }
        }

        // Fetch updated campaign with team members
        const updatedCampaign = await Campaign.findByPk(id, {
            include: [{ model: CampaignTeamMember, as: 'teamMembers' }]
        });

        res.json({ message: 'Campaña actualizada correctamente', campaign: updatedCampaign });
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

        // Delete team members first
        await CampaignTeamMember.destroy({ where: { campaignId: id } });

        await campaign.destroy();
        res.json({ message: 'Campaña eliminada correctamente' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// 7. Upload Team Member Picture
exports.uploadTeamPicture = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'No file uploaded' });
        }

        // Return the URL - handle both S3 and local storage
        const url = req.file.location || `/uploads/${req.file.filename}`;
        res.json({ url, message: 'Picture uploaded successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// 8. Upload Campaign Banner (10:1 aspect ratio)
exports.uploadCampaignBanner = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'No file uploaded' });
        }

        // Return the URL - handle both S3 and local storage
        const url = req.file.location || `/uploads/${req.file.filename}`;
        res.json({ url, message: 'Banner uploaded successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
