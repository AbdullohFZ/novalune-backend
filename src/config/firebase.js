const admin = require('firebase-admin');

// 🔐 Ambil service account dari ENV (string JSON)
const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);

// 🔐 Inisialisasi Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      project_id: serviceAccount.project_id,
      private_key: serviceAccount.private_key.replace(/\\n/g, '\n'),
      client_email: serviceAccount.client_email,
    }),
  });
}

const db = admin.firestore();

module.exports = { admin, db };
