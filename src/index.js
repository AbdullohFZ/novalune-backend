const express = require('express');
const cors = require('cors');
require('dotenv').config();

// 🔥 Firebase sudah diinisialisasi di config/firebase.js
const { admin } = require('./config/firebase');

// 🔧 Routes Import
const bookRoutes = require('./routes/book');
const genreRoutes = require('./routes/genre');
const authRoutes = require('./routes/auth');
const otpRoutes = require('./routes/otpRoutes');
const favoritesRoutes = require('./routes/favoriteRoutes');
const historyRoutes = require('./routes/history');
const userRoutes = require('./routes/userRoutes');
const commentRoutes = require('./routes/update_comment_firestore');
const adminRoutes = require('./routes/adminRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

// 🌐 Middleware CORS
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

// 🧾 Logger
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});

// 📦 Parser
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 💚 Health Check (wajib untuk Render)
app.get('/health', (req, res) => {
  res.status(200).json({ ok: true, time: new Date().toISOString() });
});

// 🧪 Test Auth Endpoint
app.get('/api/test-auth', (req, res) => {
  res.json({
    status: 'success',
    message: 'Auth endpoints are available',
    endpoints: {
      register: {
        method: 'POST',
        url: '/api/auth/register',
        body: { email: 'string', nama: 'string', password: 'string' }
      },
      sendOTP: {
        method: 'POST',
        url: '/api/otp/send',
        body: { email: 'string', type: 'register|reset' },
        note: 'Universal OTP endpoint'
      },
      verifyOTP: {
        method: 'POST',
        url: '/api/otp/verify',
        body: { email: 'string', otp: 'string', type: 'register|reset' },
        note: 'Universal OTP verification'
      },
      login: {
        method: 'POST',
        url: '/api/auth/login',
        body: { email: 'string', password: 'string' }
      },
      resetPassword: {
        method: 'POST',
        url: '/api/auth/reset-password',
        body: { email: 'string', password: 'string' }
      }
    }
  });
});

// 🏠 Root API Info
app.get('/api', (req, res) => {
  res.json({
    status: 'success',
    message: 'Welcome to Reading App API',
    endpoints: {
      auth: {
        register: '/api/auth/register',
        login: '/api/auth/login',
        resetPassword: '/api/auth/reset-password'
      },
      otp: {
        send: '/api/otp/send',
        verify: '/api/otp/verify'
      },
      books: '/api/books',
      genres: '/api/genres',
    }
  });
});

// 🚀 Routes
app.use('/api/books', bookRoutes);
app.use('/api/genres', genreRoutes);

app.use('/api/auth', (req, res, next) => {
  console.log(`📡 Auth: ${req.method} ${req.originalUrl}`);
  next();
}, authRoutes);

app.use('/api/otp', (req, res, next) => {
  console.log(`📡 OTP: ${req.method} ${req.originalUrl}`);
  next();
}, otpRoutes);

app.use('/api/favorites', favoritesRoutes);
app.use('/api', historyRoutes);
app.use('/api/users', userRoutes);

app.use('/api/comments', commentRoutes.default || commentRoutes);
app.use('/admin', adminRoutes);

// ⚠️ Global Error Handler
app.use((err, req, res, next) => {
  console.error('🔥 Error:', err);
  res.status(500).json({
    status: 'error',
    message: 'Terjadi kesalahan pada server',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// 🧹 Auto Cleanup OTP
const cleanupExpiredOtps = require('./utils/cleanupExpiredOtps');

setInterval(() => {
  console.log('⏰ Menjalankan cleanup OTP...');
  cleanupExpiredOtps();
}, 5 * 60 * 1000); // setiap 5 menit

// 🟢 Start Server
app.listen(PORT, () => {
  console.log(`🔥 Server berjalan di port ${PORT}`);
  console.log(`🧪 Test endpoint: http://localhost:${PORT}/api/test-auth`);
  console.log(`💚 Health check: http://localhost:${PORT}/health`);
});
