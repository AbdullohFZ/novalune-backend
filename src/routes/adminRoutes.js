const express = require('express');
const router = express.Router();
const isAdmin = require('../middleware/isAdmin');
const adminController = require('../controllers/adminController');

// Semua route di bawah ini wajib admin
router.use(isAdmin);

// 🔹 Dapatkan semua user
router.get('/users', adminController.getAllUsers);

// 🔹 Ambil semua komentar dari semua buku
router.get('/comments', adminController.getAllComments);

// 🔹 Hapus komentar dari subcollection buku tertentu
router.delete('/comments/:bookId/:commentId', adminController.deleteComment);

// 🔹 Tambah buku baru
router.post('/books', adminController.addBook);

// 🔹 Update buku
router.put('/books/:id', adminController.updateBook);

// 🔹 Hapus buku
router.delete('/books/:id', adminController.deleteBook);

module.exports = router;
