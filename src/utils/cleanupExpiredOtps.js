const admin = require('firebase-admin');
const db = admin.firestore();

/**
 * Hapus semua dokumen OTP yang expired (> 5 menit)
 */
const cleanupExpiredOtps = async () => {
  const now = new Date();

  try {
    const snapshot = await db.collection('emailOtps')
      .where('expiresAt', '<=', now)
      .get();

    if (snapshot.empty) {
      console.log('🧹 Tidak ada OTP expired untuk dihapus.');
      return;
    }

    const batch = db.batch();

    snapshot.forEach(doc => {
      console.log(`🗑️ Menghapus OTP expired: ${doc.id}`);
      batch.delete(doc.ref);
    });

    await batch.commit();
    console.log(`✅ Berhasil menghapus ${snapshot.size} OTP yang sudah kadaluarsa.`);
  } catch (error) {
    console.error('❌ Gagal membersihkan OTP kadaluarsa:', error);
  }
};

module.exports = cleanupExpiredOtps;
