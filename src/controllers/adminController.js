const { db } = require('../config/firebase');

// 🔹 Ambil semua user
exports.getAllUsers = async (req, res) => {
  try {
    const snapshot = await db.collection('users').get();
    const users = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json({ success: true, users });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Gagal mengambil data user', error: err.message });
  }
};

// 🔹 Ambil semua komentar dari semua buku
exports.getAllComments = async (req, res) => {
  try {
    const booksSnapshot = await db.collection('books').get();
    let allComments = [];

    for (const bookDoc of booksSnapshot.docs) {
      const bookId = bookDoc.id;
      const commentsSnapshot = await db
        .collection('books')
        .doc(bookId)
        .collection('comments')
        .orderBy('createdAt', 'desc')
        .get();

      const comments = commentsSnapshot.docs.map(doc => ({
        id: doc.id,
        bookId,
        ...doc.data(),
        createdAt: doc.data().createdAt?._seconds ? doc.data().createdAt._seconds * 1000 : null,
        updatedAt: doc.data().updatedAt?._seconds ? doc.data().updatedAt._seconds * 1000 : null,
      }));

      allComments = allComments.concat(comments);
    }

    res.json({ success: true, comments: allComments });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Gagal mengambil komentar', error: err.message });
  }
};

// 🔹 Hapus komentar dari subcollection buku
exports.deleteComment = async (req, res) => {
  try {
    const { bookId, commentId } = req.params;

    await db.collection('books').doc(bookId).collection('comments').doc(commentId).delete();

    res.json({ success: true, message: 'Komentar berhasil dihapus' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Gagal menghapus komentar', error: err.message });
  }
};

// 🔹 Tambah buku baru
exports.addBook = async (req, res) => {
  try {
    const data = req.body;
    await db.collection('books').add(data);
    res.json({ success: true, message: 'Buku berhasil ditambahkan' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Gagal menambah buku', error: err.message });
  }
};

// 🔹 Update buku
exports.updateBook = async (req, res) => {
  try {
    const { id } = req.params;
    const data = req.body;
    await db.collection('books').doc(id).update(data);
    res.json({ success: true, message: 'Buku berhasil diperbarui' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Gagal memperbarui buku', error: err.message });
  }
};

// 🔹 Hapus buku
exports.deleteBook = async (req, res) => {
  try {
    const { id } = req.params;
    await db.collection('books').doc(id).delete();
    res.json({ success: true, message: 'Buku berhasil dihapus' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Gagal menghapus buku', error: err.message });
  }
};
