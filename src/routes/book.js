const express = require('express');
const router = express.Router();
const bookController = require('../controllers/bookController');

// ✅ GET semua buku
router.get('/', bookController.getBooksWithFilters);

// ✅ GET detail buku by ID
router.get('/id/:id', bookController.getBookById);

// ✅ POST buku baru
router.post('/', bookController.addBook);

// 🔹 GET semua komentar buku
router.get('/:id/comments', bookController.getComments);

// 🔹 POST komentar baru
router.post('/:id/comments', bookController.postComment);

router.put("/:id", bookController.updateBook);      // <--- wajib ada
router.delete("/:id", bookController.deleteBook);   // <--- wajib ada

module.exports = router;
