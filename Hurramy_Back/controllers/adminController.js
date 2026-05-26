const { Op } = require('sequelize');
const User = require('../models/User');

// Buscar usuarios (Solo Admin)
exports.searchUsers = async (req, res) => {
    try {
        const { email } = req.query;
        if (!email) return res.status(400).json({ message: 'Proporciona un email para buscar.' });

        const users = await User.findAll({
            where: { email: { [Op.like]: `%${email}%` } },
            attributes: ['id', 'email', 'role', 'status', 'waiCoins', 'coinsFrozen', 'createdAt'] // Protegemos las contraseñas
        });
        
        res.status(200).json(users);
    } catch (error) {
        console.error("Error en adminController - searchUsers:", error);
        res.status(500).json({ message: 'Error al buscar usuarios.' });
    }
};

// Cambiar el rol de un usuario (Solo Admin)
exports.updateUserRole = async (req, res) => {
    try {
        const { id } = req.params;
        const { role } = req.body;

        const validRoles = ['user', 'admin'];
        if (!validRoles.includes(role)) {
            return res.status(400).json({ message: 'Rol inválido.' });
        }

        const user = await User.findByPk(id);
        if (!user) return res.status(404).json({ message: 'Usuario no encontrado.' });

        await user.update({ role });
        res.status(200).json({ message: `Rol de ${user.email} actualizado a ${role}.` });
    } catch (error) {
        console.error("Error en adminController - updateUserRole:", error);
        res.status(500).json({ message: 'Error al actualizar el rol.' });
    }
};

// Update user's WAi Coins balance (Solo Admin)
exports.updateUserCoins = async (req, res) => {
    try {
        const { id } = req.params;
        const { waiCoins } = req.body;

        if (typeof waiCoins !== 'number' || waiCoins < 0) {
            return res.status(400).json({ message: 'El número de WAi Coins debe ser un número positivo.' });
        }

        const user = await User.findByPk(id);
        if (!user) return res.status(404).json({ message: 'Usuario no encontrado.' });

        await user.update({ waiCoins: Math.floor(waiCoins) });
        res.status(200).json({ 
            message: `WAi Coins de ${user.email} actualizado a ${Math.floor(waiCoins)}.`,
            user: { id: user.id, email: user.email, waiCoins: user.waiCoins, coinsFrozen: user.coinsFrozen }
        });
    } catch (error) {
        console.error("Error en adminController - updateUserCoins:", error);
        res.status(500).json({ message: 'Error al actualizar WAi Coins.' });
    }
};

// Toggle user's coins frozen status (Solo Admin)
exports.toggleCoinsFrozen = async (req, res) => {
    try {
        const { id } = req.params;

        const user = await User.findByPk(id);
        if (!user) return res.status(404).json({ message: 'Usuario no encontrado.' });

        const newFrozenStatus = !user.coinsFrozen;
        await user.update({ coinsFrozen: newFrozenStatus });
        
        res.status(200).json({ 
            message: `Cuenta de ${user.email} ${newFrozenStatus ? 'congelada' : 'descongelada'}.`,
            user: { id: user.id, email: user.email, waiCoins: user.waiCoins, coinsFrozen: user.coinsFrozen }
        });
    } catch (error) {
        console.error("Error en adminController - toggleCoinsFrozen:", error);
        res.status(500).json({ message: 'Error al cambiar estado de congelación.' });
    }
};

// Get user details with coin info (Solo Admin)
exports.getUserDetails = async (req, res) => {
    try {
        const { id } = req.params;

        const user = await User.findByPk(id, {
            attributes: ['id', 'email', 'role', 'status', 'waiCoins', 'coinsFrozen', 'createdAt']
        });
        
        if (!user) return res.status(404).json({ message: 'Usuario no encontrado.' });

        res.status(200).json(user);
    } catch (error) {
        console.error("Error en adminController - getUserDetails:", error);
        res.status(500).json({ message: 'Error al obtener detalles del usuario.' });
    }
};
