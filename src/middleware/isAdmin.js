const admin = require('firebase-admin');
const jwt = require('jsonwebtoken');
const { db } = require('../config/firebase');

const isAdmin = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Token tidak ditemukan' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const email = decoded.email;

    // Ambil user berdasarkan email dari Firestore
    const snapshot = await db.collection('users').where('email', '==', email).get();
    if (snapshot.empty) {
      return res.status(404).json({ message: 'User tidak ditemukan' });
    }

    const userData = snapshot.docs[0].data();

    // Cek role admin
    if (userData.role !== 'admin') {
      return res.status(403).json({ message: 'Akses ditolak, bukan admin' });
    }

    // Simpan user ke request biar bisa dipakai di route selanjutnya
    req.user = userData;
    next();

  } catch (error) {
    console.error('isAdmin error:', error);
    return res.status(401).json({ message: 'Token tidak valid atau expired' });
  }
};

module.exports = isAdmin;
