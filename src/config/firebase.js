const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

// 🔐 Inisialisasi Firebase Admin SDK
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore(); // Instance Firestore utama

// ✅ Export supaya bisa dipakai di mana-mana
module.exports = { admin, db };
