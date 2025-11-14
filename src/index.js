const express = require('express');
const cors = require('cors');
require('dotenv').config();

// ✅ NEW: Tambahkan try-catch biar Firebase bisa jalan di lokal & Render
const admin = require('firebase-admin');

let serviceAccount;
if (process.env.FIREBASE_SERVICE_ACCOUNT) {
  try {
    serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    console.log("🔥 Firebase service account loaded from ENV");
  } catch (e) {
    console.error("⚠️ FIREBASE_SERVICE_ACCOUNT is not valid JSON:", e.message);
    process.exit(1);
  }
} else {
  console.log("🧩 Using local Firebase serviceAccountKey.json");
  serviceAccount = require('./config/serviceAccountKey.json');
}

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

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

// ✅ NEW: Health check route buat Render
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
        note: 'Universal OTP endpoint untuk register dan reset password'
      },
      verifyOTP: {
        method: 'POST',
        url: '/api/otp/verify',
        body: { email: 'string', otp: 'string', type: 'register|reset' },
        note: 'Universal OTP verification endpoint'
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
        send: '/api/otp/send (universal - register & reset)',
        verify: '/api/otp/verify (universal - register & reset)'
      },
      books: '/api/books',
      bookById: '/api/books/:id',
      booksByGenre: '/api/books/genre/:genre',
      searchBooks: '/api/books/search?q=query',
      genres: '/api/genres',
      genreById: '/api/genres/:id',
      bookGenres: '/api/genres/book/:bookId'
    }
  });
});

// 🚀 Routes
app.use('/api/books', bookRoutes);
app.use('/api/genres', genreRoutes);
app.use('/api/auth', (req, res, next) => {
  console.log(`📡 Incoming auth request: ${req.method} ${req.originalUrl}`);
  next();
}, authRoutes);
app.use('/api/otp', (req, res, next) => {
  console.log(`📡 Incoming OTP request: ${req.method} ${req.originalUrl}`);
  next();
}, otpRoutes);
app.use('/api/favorites', favoritesRoutes);
app.use('/api', historyRoutes);
app.use('/api/users', userRoutes);
app.use('/api/comments', commentRoutes.default || commentRoutes);
app.use('/admin', adminRoutes);

// ⚠️ Global Error Handling
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({
    status: 'error',
    message: 'Terjadi kesalahan pada server',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// ✅ Import fungsi
const cleanupExpiredOtps = require('./utils/cleanupExpiredOtps');

// ✅ Jalankan setiap 5 menit
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
