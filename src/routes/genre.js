const express = require('express');
const router = express.Router();
const genreController = require('../controllers/genreController');

// 🎭 GET semua genre
router.get('/', genreController.getAllGenres);

// 🔍 GET genre berdasarkan ID
router.get('/:id', genreController.getGenreById);

// 🔗 GET genre dari satu buku tertentu
router.get('/book/:bookId', genreController.getBookGenres);

module.exports = router;
