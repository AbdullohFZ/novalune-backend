const admin = require('firebase-admin');
const db = admin.firestore();

// ✅ GET semua buku
exports.getBooksWithFilters = async (req, res) => {
  try {
    const snapshot = await db.collection('books').get();
    const books = [];

    snapshot.forEach(doc => {
      books.push({
        id: doc.id,
        ...doc.data(),
      });
    });

    res.status(200).json({ success: true, data: books });
  } catch (error) {
    console.error('❌ Gagal ambil buku:', error);
    res.status(500).json({ success: false, message: 'Gagal ambil buku' });
  }
};

// ✅ GET detail buku by ID
exports.getBookById = async (req, res) => {
  const { id } = req.params;

  try {
    const bookRef = db.collection('books').doc(id);
    const doc = await bookRef.get();

    if (!doc.exists) {
      return res.status(404).json({ success: false, message: 'Buku tidak ditemukan' });
    }

    const bookData = {
      id: doc.id,
      ...doc.data(),
    };

    res.status(200).json({ success: true, data: bookData });
  } catch (error) {
    console.error('❌ Gagal ambil detail buku:', error);
    res.status(500).json({ success: false, message: 'Terjadi kesalahan saat ambil detail buku' });
  }
};

// 🔹 GET semua komentar buku
exports.getComments = async (req, res) => {
  const { id } = req.params; // book id
  try {
    const snapshot = await db
      .collection('books')
      .doc(id)
      .collection('comments')
      .orderBy('createdAt', 'desc')
      .get();

    const comments = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.status(200).json({ success: true, data: comments });
  } catch (error) {
    console.error('❌ Gagal ambil komentar:', error);
    res.status(500).json({ success: false, message: 'Gagal ambil komentar' });
  }
};

// 🔹 POST komentar baru
exports.postComment = async (req, res) => {
  const { id } = req.params; // book id
  const { userId, username, text } = req.body;

  if (!userId || !username || !text) {
    return res
      .status(400)
      .json({ success: false, message: 'userId, username, dan text harus diisi' });
  }

  try {
    const commentRef = db.collection('books').doc(id).collection('comments').doc();
    await commentRef.set({
      userId,
      username,
      text,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    res.status(201).json({
      success: true,
      message: 'Komentar berhasil ditambahkan',
      data: { id: commentRef.id },
    });
  } catch (error) {
    console.error('❌ Gagal tambah komentar:', error);
    res.status(500).json({ success: false, message: 'Gagal tambah komentar' });
  }
};

exports.addBook = async (req, res) => {
  try {
    const {
      judul,
      penulis,
      tahun,
      cover_url,
      genre,
      jumlah_halaman,
      penerbit,
      rating,
      deskripsi,
      pdf_url,
    } = req.body;

    if (!judul || !penulis) {
      return res.status(400).json({
        success: false,
        message: 'Judul dan penulis wajib diisi',
      });
    }

    const newBook = {
      judul,
      penulis,
      tahun_terbit: tahun || '-',
      cover_url: cover_url || '',
      genre: genre || [],
      jumlah_halaman: jumlah_halaman || 0,
      penerbit: penerbit || '',
      rating: rating || 0,
      deskripsi: deskripsi || '',
      pdf_url: pdf_url || '',
      created_at: admin.firestore.FieldValue.serverTimestamp(),
      updated_at: admin.firestore.FieldValue.serverTimestamp(),
    };

    const bookRef = await db.collection('books').add(newBook);

    res.status(201).json({
      success: true,
      message: 'Buku berhasil ditambahkan',
      data: { id: bookRef.id, ...newBook },
    });
  } catch (error) {
    console.error('❌ Gagal tambah buku:', error);
    res.status(500).json({ success: false, message: 'Gagal menambahkan buku' });
  }
};

exports.updateBook = async (req, res) => {
  const { id } = req.params;
  const data = req.body;

  try {
    const bookRef = db.collection("books").doc(id);
    await bookRef.update({
      ...data,
      updated_at: admin.firestore.FieldValue.serverTimestamp(),
    });
    res.status(200).json({ success: true, message: "Buku berhasil diperbarui" });
  } catch (err) {
    console.error("❌ Gagal update buku:", err);
    res.status(500).json({ success: false, message: "Gagal update buku" });
  }
};

// 🔹 DELETE buku
exports.deleteBook = async (req, res) => {
  const { id } = req.params;

  try {
    const bookRef = db.collection("books").doc(id);
    const doc = await bookRef.get();

    if (!doc.exists) {
      return res.status(404).json({ success: false, message: "Buku tidak ditemukan" });
    }

    await bookRef.delete();
    res.status(200).json({ success: true, message: "Buku berhasil dihapus" });
  } catch (err) {
    console.error("❌ Gagal hapus buku:", err);
    res.status(500).json({ success: false, message: "Gagal hapus buku" });
  }
};
