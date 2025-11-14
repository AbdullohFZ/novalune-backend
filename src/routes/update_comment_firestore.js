import express from 'express';
import admin from 'firebase-admin';

const router = express.Router();
const db = admin.firestore();

/**
 * ✅ Tambah Komentar Baru
 */
router.post('/add', async (req, res) => {
  try {
    const { bookId, userId, username, userPhoto, rating, text } = req.body;

    if (!bookId || !userId || !text) {
      return res.status(400).json({ error: 'Data komentar tidak lengkap.' });
    }

    // Simpan di subcollection sesuai buku
    const commentRef = db.collection('books').doc(bookId).collection('comments').doc();
    const newComment = {
      id: commentRef.id,
      bookId,
      userId,
      username,
      userPhoto,
      rating: rating || 0,
      text,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      upvotes: [],
      reports: [],
    };

    await commentRef.set(newComment);

    res.status(201).json({ 
      success: true,
      message: 'Komentar berhasil ditambahkan.', 
      data: newComment 
    });
  } catch (error) {
    console.error('🔥 Error add comment:', error);
    res.status(500).json({ error: 'Gagal menambahkan komentar.' });
  }
});

/**
 * ✅ Ambil Semua Komentar Berdasarkan bookId
 */
router.get('/:bookId', async (req, res) => {
  try {
    const { bookId } = req.params;

    const snapshot = await db
      .collection('books')
      .doc(bookId)
      .collection('comments')
      .orderBy('createdAt', 'desc')
      .get();

    const comments = await Promise.all(snapshot.docs.map(async (doc) => {
      const data = doc.data();
      const commentId = doc.id; // pakai doc.id langsung

      // Ambil replies
      const repliesSnapshot = await db
        .collection('books')
        .doc(bookId)
        .collection('comments')
        .doc(commentId)
        .collection('replies')
        .orderBy('createdAt', 'asc')
        .get();

      const replies = repliesSnapshot.docs.map(r => ({ id: r.id, ...r.data() }));
       // 🔥 Konversi Firestore Timestamp jadi angka (milliseconds)
      return {
        id: commentId,
        ...data,
        createdAt: data.createdAt?._seconds ? data.createdAt._seconds * 1000 : null,
        updatedAt: data.updatedAt?._seconds ? data.updatedAt._seconds * 1000 : null,
        replies,
      };
    }));

    res.status(200).json({ success: true, data: comments });
  } catch (error) {
    console.error('🔥 Error get comments:', error);
    res.status(500).json({ error: 'Gagal mengambil komentar.' });
  }
});

/**
 * ✅ Balas Komentar
 */
router.post('/reply', async (req, res) => {
  try {
    const { bookId, parentId, userId, username, userPhoto, text } = req.body;

    if (!bookId || !parentId || !userId || !text) {
      return res.status(400).json({ error: 'Data balasan tidak lengkap.' });
    }

    const replyRef = db.collection('books').doc(bookId).collection('comments').doc(parentId).collection('replies').doc();
    const newReply = {
      id: replyRef.id,
      parentId,
      userId,
      username,
      userPhoto,
      text,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    await replyRef.set(newReply);
    res.status(201).json({ 
      success: true,
      message: 'Balasan berhasil ditambahkan.', 
      data: newReply 
    });
  } catch (error) {
    console.error('🔥 Error reply comment:', error);
    res.status(500).json({ error: 'Gagal membalas komentar.' });
  }
});

/**
 * ✅ Upvote Komentar
 */
router.post('/upvote', async (req, res) => {
  try {
    const { bookId, commentId, userId } = req.body;

    if (!bookId || !commentId || !userId) {
      return res.status(400).json({ error: 'Data upvote tidak lengkap.' });
    }

    const commentRef = db.collection('books').doc(bookId).collection('comments').doc(commentId);
    const docSnap = await commentRef.get();

    if (!docSnap.exists) return res.status(404).json({ error: 'Komentar tidak ditemukan.' });

    const commentData = docSnap.data();
    let updatedUpvotes = commentData.upvotes || [];

    if (updatedUpvotes.includes(userId)) {
      updatedUpvotes = updatedUpvotes.filter(id => id !== userId);
    } else {
      updatedUpvotes.push(userId);
    }

    await commentRef.update({ upvotes: updatedUpvotes });
    res.status(200).json({ success: true, message: 'Upvote berhasil diperbarui.', data: { upvotes: updatedUpvotes } });
  } catch (error) {
    console.error('🔥 Error upvote comment:', error);
    res.status(500).json({ error: 'Gagal memproses upvote.' });
  }
});

/**
 * ✅ Laporkan Komentar
 */
router.post('/report', async (req, res) => {
  try {
    const { bookId, commentId, userId, reason } = req.body;

    if (!bookId || !commentId || !userId) {
      return res.status(400).json({ error: 'Data laporan tidak lengkap.' });
    }

    const commentRef = db.collection('books').doc(bookId).collection('comments').doc(commentId);
    const docSnap = await commentRef.get();

    if (!docSnap.exists) {
      return res.status(404).json({ error: 'Komentar tidak ditemukan.' });
    }

    // Buat objek laporan manual
    const newReport = {
      userId,
      reason,
      reportedAt: Date.now(), // ✅ pakai timestamp biasa
    };

    // Update pakai arrayUnion biar efisien dan aman
    await commentRef.update({
      reports: admin.firestore.FieldValue.arrayUnion(newReport),
    });

    res.status(200).json({
      success: true,
      message: 'Komentar berhasil dilaporkan.',
      data: { report: newReport },
    });
  } catch (error) {
    console.error('🔥 Error report comment:', error);
    res.status(500).json({ error: 'Gagal melaporkan komentar.' });
  }
});

/**
 * ✅ Hapus Komentar
 */
router.delete('/:bookId/:commentId', async (req, res) => {
  try {
    const { bookId, commentId } = req.params;
    await db.collection('books').doc(bookId).collection('comments').doc(commentId).delete();
    res.status(200).json({ success: true, message: 'Komentar berhasil dihapus.' });
  } catch (error) {
    console.error('🔥 Error delete comment:', error);
    res.status(500).json({ error: 'Gagal menghapus komentar.' });
  }
});

export default router;
