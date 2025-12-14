const express = require('express');
const router = express.Router();
const { register, login, getMe, sendLoginOTP, googleOAuth } = require('../controllers/authController');
const { protect } = require('../middleware/auth');

router.post('/register', register);
router.post('/login', login);
router.post('/send-otp', sendLoginOTP);
router.post('/oauth/google', googleOAuth);
router.get('/me', protect, getMe);

module.exports = router;

