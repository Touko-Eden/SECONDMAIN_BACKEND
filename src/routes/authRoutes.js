const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');

// Routes publiques
router.post('/register', authController.register);
router.post('/login', authController.login);

// Routes protégées (nécessitent authentification)
router.get('/me', protect, authController.getMe);
router.put('/profile', protect, authController.updateProfile);
router.post('/verify-phone', protect, authController.verifyPhone);
router.post('/resend-otp', protect, authController.resendOTP);

module.exports = router;