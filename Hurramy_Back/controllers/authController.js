const User = require('../models/User');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { Op } = require('sequelize');
const axios = require('axios');
const nodemailer = require('nodemailer');

// Regex de contraseña (8-12 chars, 1 Mayúscula, 1 Número, 1 Especial)
const passwordRegex = /^(?=.*[A-Z])(?=.*\d)(?=.*[^a-zA-Z0-9]).{8,12}$/;

// Configuración de Nodemailer usando variables de entorno
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.USER,
        pass: process.env.PASS
    }
});

exports.register = async (req, res) => {
    try {
        const { email, password, language } = req.body;
        if (!passwordRegex.test(password)) {
            return res.status(400).json({
                message: 'La contraseña debe tener 8-12 caracteres, incluir 1 mayúscula, 1 número y 1 símbolo.'
            });
        }
        const existingUser = await User.findOne({ where: { email } });
        if (existingUser) {
            return res.status(400).json({ message: 'El correo ya está registrado.' });
        }
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);
        const newUser = await User.create({
            email,
            password: hashedPassword,
            language: language || 'en',
            role: 'user'
        });
        res.status(201).json({
            message: 'Usuario creado exitosamente',
            user: { id: newUser.id, email: newUser.email, language: newUser.language, role: newUser.role, waiCoins: newUser.waiCoins, coinsFrozen: newUser.coinsFrozen }
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error en el servidor' });
    }
};

exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ where: { email } });
        if (!user) {
            return res.status(404).json({ message: 'Credenciales inválidas' });
        }
        if (user.status === 'Locked') {
           return res.status(403).json({ message: 'Cuenta bloqueada por demasiados intentos fallidos.' });
        }
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            const newAttempts = user.failedLoginAttempts + 1;
            let updateData = { failedLoginAttempts: newAttempts };
            if (newAttempts >= 3) {
                updateData.status = 'Locked';
                updateData.lockUntil = new Date(Date.now() + 30 * 60 * 1000);
            }
            await user.update(updateData);
            if (updateData.status === 'Locked') {
                return res.status(403).json({ message: 'Cuenta bloqueada. Ha excedido el número de intentos.' });
            }
            return res.status(401).json({
                message: `Contraseña incorrecta. Intento ${newAttempts} de 3.`
            });
        }
        await user.update({ failedLoginAttempts: 0, lockUntil: null, status: 'Active' });
        const token = jwt.sign(
            { id: user.id, role: user.role },
            process.env.JWT_SECRET || 'secret_key',
            { expiresIn: '24h' }
        );
        res.status(200).json({
            message: 'Login exitoso',
            token,
            user: { id: user.id, email: user.email, status: user.status, language: user.language, role: user.role, waiCoins: user.waiCoins, coinsFrozen: user.coinsFrozen }
        });
    } catch (error) {
        res.status(500).json({ message: 'Error en el login', error: error.message });
    }
};

exports.forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;
        const user = await User.findOne({ where: { email } });

        if (!user) {
            return res.status(404).json({ message: 'No existe usuario con ese email' });
        }

        // 1. GENERAR TOKEN PLANO (Se envía al usuario)
        const resetToken = crypto.randomBytes(20).toString('hex');
        
        // 2. HASHEAR EL TOKEN (Se guarda en la DB)
        const resetPasswordToken = crypto.createHash('sha256').update(resetToken).digest('hex');
        
        // 3. EXPIRACIÓN A 1 HORA (60 minutos para evitar problemas de reloj)
        const resetPasswordExpire = Date.now() + 60 * 60 * 1000;

        await user.update({ resetPasswordToken, resetPasswordExpire });

        // Link dinámico
        const host = req.get('host');
        const protocol = host.includes('hurammy.com') ? 'https' : 'http';
        const domain = host.includes('localhost') ? 'localhost:5173' : 'hurammy.com';
        
        // IMPORTANTE: Se envía el resetToken (plano) en la URL
        const resetUrl = `${protocol}://${domain}/reset-password/${resetToken}`;

        const mailOptions = {
            from: `"Hurammy Support" <${process.env.USER}>`,
            to: user.email,
            subject: 'Recuperación de contraseña',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; padding: 20px; border: 1px solid #ddd; border-radius: 10px;">
                    <h2 style="color: #333;">Solicitaste restablecer tu contraseña</h2>
                    <p>Haz clic en el siguiente botón para crear una nueva contraseña. Este enlace expira en 1 hora.</p>
                    <a href="${resetUrl}" style="display: inline-block; padding: 10px 20px; color: #fff; background-color: #007bff; text-decoration: none; border-radius: 5px;">Restablecer Contraseña</a>
                    <p style="margin-top: 20px; font-size: 12px; color: #777;">Si no solicitaste este cambio, puedes ignorar este correo de forma segura.</p>
                </div>
            `
        };

        await transporter.sendMail(mailOptions);

        res.status(200).json({ message: 'Correo de recuperación enviado con éxito.' });

    } catch (error) {
        console.error("Error envío correo:", error);
        res.status(500).json({ message: 'Error al enviar el correo de recuperación' });
    }
};

exports.resetPassword = async (req, res) => {
    try {
        const { token } = req.params;
        const { password } = req.body;
        
        // Hasheamos el token que viene de la URL para compararlo con la DB
        const resetPasswordToken = crypto.createHash('sha256').update(token).digest('hex');

        const user = await User.findOne({
            where: {
                resetPasswordToken,
                resetPasswordExpire: { [Op.gt]: Date.now() }
            }
        });

        if (!user) {
            return res.status(400).json({ message: 'Token inválido o expirado' });
        }

        if (!passwordRegex.test(password)) {
            return res.status(400).json({
                message: 'La contraseña debe tener 8-12 caracteres, incluir 1 mayúscula, 1 número y 1 símbolo.'
            });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        await user.update({
            password: hashedPassword,
            resetPasswordToken: null,
            resetPasswordExpire: null,
            status: 'Active',
            failedLoginAttempts: 0
        });

        res.status(200).json({ message: 'Contraseña actualizada correctamente.' });
    } catch (error) {
        res.status(500).json({ message: 'Error al resetear contraseña' });
    }
};

exports.googleLogin = async (req, res) => {
    try {
        const { accessToken } = req.body;
        const googleResponse = await axios.get(`https://www.googleapis.com/oauth2/v3/userinfo`, {
            headers: { Authorization: `Bearer ${accessToken}` }
        });

        const { email, sub: googleId, picture, locale } = googleResponse.data;
        let user = await User.findOne({ where: { email } });

        if (!user) {
            user = await User.create({
                email,
                googleId,
                avatar: picture,
                language: locale === 'zh' ? 'zh' : (locale === 'es' ? 'es' : 'en'),
                role: 'user',
                status: 'Active',
                password: null
            });
        } else {
            if (!user.googleId) {
                await user.update({ googleId, avatar: picture });
            }
            if (user.status === 'Locked') {
                return res.status(403).json({ message: 'Cuenta bloqueada.' });
            }
        }

        const token = jwt.sign(
            { id: user.id, role: user.role },
            process.env.JWT_SECRET || 'secret_key',
            { expiresIn: '24h' }
        );

        res.status(200).json({
            message: 'Google login exitoso',
            token,
            user: { id: user.id, email: user.email, role: user.role, language: user.language, avatar: user.avatar, waiCoins: user.waiCoins, coinsFrozen: user.coinsFrozen }
        });
    } catch (error) {
        console.error("Google Auth Error:", error.response?.data || error.message);
        res.status(401).json({ message: 'Token de Google inválido o expirado' });
    }
};
