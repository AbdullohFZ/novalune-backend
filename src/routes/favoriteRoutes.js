const express = require('express');
const router = express.Router();
const admin = require('firebase-admin');

// 🔥 Tambah ke favorit
router.post('/:userId', async (req, res) => {
  const { userId } = req.params;
  const { bookId, judul, cover } = req.body;

  if (!bookId || !judul || !cover) {
    return res.status(400).json({ success: false, message: 'Data tidak lengkap!' });
  }

  try {
    const favoriteRef = admin.firestore()
      .collection('users')
      .doc(userId)
      .collection('favorites')
      .doc(bookId);

    await favoriteRef.set({
      judul,
      cover,
      added_at: admin.firestore.FieldValue.serverTimestamp(), // ⏱️ waktu ditambahkan ke favorit
    });

    res.status(200).json({ success: true, message: 'Buku ditambahkan ke favorit' });
  } catch (error) {
    console.error('❌ Gagal menambahkan ke favorit:', error);
    res.status(500).json({ success: false, message: 'Gagal menambahkan ke favorit' });
  }
});

// 🧊 Ambil daftar favorit
router.get('/:userId', async (req, res) => {
  const { userId } = req.params;

  try {
    const snapshot = await admin.firestore()
      .collection('users')
      .doc(userId)
      .collection('favorites')
      .get();

    const favorites = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));

    res.status(200).json({ success: true, data: favorites });
  } catch (error) {
    console.error('❌ Gagal ambil data favorites:', error);
    res.status(500).json({ success: false, message: 'Gagal ambil data favorites' });
  }
});

// ❌ Hapus dari favorit
router.delete('/:userId/:bookId', async (req, res) => {
  const { userId, bookId } = req.params;

  try {
    await admin.firestore()
      .collection('users')
      .doc(userId)
      .collection('favorites')
      .doc(bookId)
      .delete();

    res.status(200).json({ success: true, message: 'Buku dihapus dari favorit' });
  } catch (error) {
    console.error('❌ Gagal hapus favorit:', error);
    res.status(500).json({ success: false, message: 'Gagal hapus favorit' });
  }
});

module.exports = router;
