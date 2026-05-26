const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/forgot-password', authController.forgotPassword); // Req 2.3
router.put('/reset-password/:token', authController.resetPassword); // Req 2.3
router.post('/google', authController.googleLogin);

module.exports = router;