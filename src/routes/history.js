const express = require('express');
const router = express.Router();
const admin = require('firebase-admin');
const db = admin.firestore(); // ✅ Ambil Firestore dari Firebase Admin SDK

// 📥 POST /history/save → Simpan progress baca
router.post('/history/save', async (req, res) => {
  const { userId, bookId, title, coverUrl, pdfUrl, lastPage, durationInSeconds } = req.body;

  console.log('📥 POST /history/save:', req.body);

  if (!userId || !bookId) {
    return res.status(400).json({ error: 'Missing userId or bookId' });
  }

  try {
    const historyRef = db
      .collection('users')
      .doc(userId)
      .collection('history')
      .doc(bookId);

    const dataToSave = {
      title,
      coverUrl,
      pdfUrl,
      lastPage: lastPage || 1,
      lastReadAt: new Date(),
    };

    if (typeof durationInSeconds === 'number') {
      dataToSave.durationInSeconds = durationInSeconds;
    }

    await historyRef.set(dataToSave, { merge: true });

    console.log('✅ History saved for', userId, bookId);
    return res.status(200).json({ message: 'Success' });
  } catch (err) {
    console.error('❌ Failed to save history:', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// 📤 GET /history/:userId → Ambil daftar riwayat berdasarkan user ID
router.get('/history/:userId', async (req, res) => {
  const { userId } = req.params;

  try {
    const snapshot = await db
      .collection('users')
      .doc(userId)
      .collection('history')
      .orderBy('lastReadAt', 'desc')
      .get();

    const history = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    return res.json({ success: true, data: history });
  } catch (error) {
    console.error('🔥 Error ambil history:', error);
    return res.status(500).json({ success: false, error: 'Gagal ambil data history' });
  }
});

// ❌ DELETE /history/:userId → Hapus semua riwayat
router.delete('/history/:userId', async (req, res) => {
  const { userId } = req.params;

  try {
    const historyRef = db.collection('users').doc(userId).collection('history');
    const snapshot = await historyRef.get();

    const batch = db.batch();
    snapshot.forEach(doc => {
      batch.delete(doc.ref);
    });

    await batch.commit();

    console.log(`🧹 Semua riwayat ${userId} berhasil dihapus`);
    return res.status(200).json({ success: true, message: 'Semua riwayat dihapus' });
  } catch (err) {
    console.error('❌ Gagal hapus semua riwayat:', err);
    return res.status(500).json({ success: false, error: 'Gagal hapus semua riwayat' });
  }
});

// 🧺 POST /history/deleteMany → Hapus beberapa item history
router.post('/history/deleteMany', async (req, res) => {
  const { userId, bookIds } = req.body;

  if (!userId || !Array.isArray(bookIds)) {
    return res.status(400).json({ success: false, error: 'userId dan bookIds dibutuhkan' });
  }

  try {
    const batch = db.batch();

    bookIds.forEach(bookId => {
      const docRef = db.collection('users').doc(userId).collection('history').doc(bookId);
      batch.delete(docRef);
    });

    await batch.commit();

    console.log(`🗑️ Riwayat terpilih untuk ${userId} berhasil dihapus`);
    return res.status(200).json({ success: true, message: 'Riwayat terpilih dihapus' });
  } catch (err) {
    console.error('❌ Gagal hapus riwayat terpilih:', err);
    return res.status(500).json({ success: false, error: 'Gagal hapus riwayat terpilih' });
  }
});

module.exports = router;
