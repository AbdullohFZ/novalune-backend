const express = require('express');
const router = express.Router();
const admin = require('firebase-admin');
const { db } = require('../config/firebase');
const { sendMail } = require('../utils/mailer');

// Controller
const {
  sendOtp,
  verifyOtp,
  resendOtp,
  login,
  resetPassword
} = require('../controllers/authController');

// ✅ Test Route
router.get('/test', (req, res) => {
  res.json({ message: 'Auth routes are working (Firestore ver)' });
});

// ✅ Register dengan Firebase Auth
router.post('/register', async (req, res) => {
  try {
    const { email, password, nama } = req.body;
    const user = await admin.auth().createUser({ email, password, displayName: nama });
    res.status(201).json({
      status: 'success',
      message: 'Registrasi berhasil',
      user
    });
  } catch (err) {
    res.status(400).json({
      status: 'error',
      message: err.message
    });
  }
});

// ✅ Login via Firestore & Firebase Auth
router.post('/login', login);

// ✅ Reset Password (setelah OTP diverifikasi)
router.post('/reset-password', resetPassword);

// ✅ Check email terdaftar
router.post('/check-email', async (req, res) => {
  try {
    const { email } = req.body;
    const snapshot = await db.collection('users').where('email', '==', email).get();
    res.json({ exists: !snapshot.empty });
  } catch (err) {
    res.status(500).json({ message: 'Gagal mengecek email' });
  }
});

// Hapus endpoint lama OTP
delete router.stack.find(r => r.route && r.route.path === '/send-otp');
delete router.stack.find(r => r.route && r.route.path === '/verify-otp');
delete router.stack.find(r => r.route && r.route.path === '/resend-otp');

module.exports = router;
