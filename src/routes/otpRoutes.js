const express = require('express');
const router = express.Router();
const otpController = require('../controllers/otpController');

router.post('/send', otpController.sendOtpUniversal);
router.post('/verify', otpController.verifyOtpUniversal);
router.get('/get-name', otpController.getOtpNama);

module.exports = router; 