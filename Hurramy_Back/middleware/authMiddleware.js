const jwt = require('jsonwebtoken');

// Verificar Token (Login)
const verifyToken = (req, res, next) => {
    const token = req.header('Authorization'); // Puede venir como 'Bearer token' o directo

    if (!token) {
        return res.status(401).json({ message: 'No token, authorization denied' });
    }

    try {
        // Limpiamos el token si viene con "Bearer "
        const tokenString = token.startsWith('Bearer ') ? token.slice(7, token.length) : token;
        
        // Usa una clave secreta fuerte en producción (process.env.JWT_SECRET)
        const decoded = jwt.verify(tokenString, process.env.JWT_SECRET || 'secret_key');
        req.user = decoded; // Aquí guardamos { id, role, ... }
        next();
    } catch (err) {
        res.status(401).json({ message: 'Token is not valid' });
    }
};

// Verificar si es Administrador
const isAdmin = (req, res, next) => {
    if (req.user && req.user.role === 'admin') {
        next();
    } else {
        res.status(403).json({ message: 'Access denied. Admins only.' });
    }
};

module.exports = { verifyToken, isAdmin };