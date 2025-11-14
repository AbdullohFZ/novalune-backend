const { db } = require('../config/firebase');

const genreController = {
  // Get all genres
  getAllGenres: async (req, res) => {
    try {
      const snapshot = await db.collection('genres').get();
      const genres = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      res.json({
        status: 'success',
        data: genres
      });
    } catch (error) {
      console.error('Error in getAllGenres:', error);
      res.status(500).json({
        status: 'error',
        message: error.message
      });
    }
  },

  // Get genre by ID
  getGenreById: async (req, res) => {
    try {
      const { id } = req.params;
      const doc = await db.collection('genres').doc(id).get();
      
      if (!doc.exists) {
        return res.status(404).json({
          status: 'error',
          message: 'Genre tidak ditemukan'
        });
      }

      res.json({
        status: 'success',
        data: { id: doc.id, ...doc.data() }
      });
    } catch (error) {
      console.error('Error in getGenreById:', error);
      res.status(500).json({
        status: 'error',
        message: error.message
      });
    }
  },

  // Get genres for a specific book
  getBookGenres: async (req, res) => {
    try {
      const { bookId } = req.params;
      const bookDoc = await db.collection('books').doc(bookId).get();
      
      if (!bookDoc.exists) {
        return res.status(404).json({
          status: 'error',
          message: 'Buku tidak ditemukan'
        });
      }

      const bookData = bookDoc.data();
      const genreIds = bookData.genre || [];

      const genres = [];
      for (const genreId of genreIds) {
        const genreDoc = await db.collection('genres').doc(genreId).get();
        if (genreDoc.exists) {
          genres.push({ id: genreDoc.id, ...genreDoc.data() });
        }
      }
      
      res.json({
        status: 'success',
        data: genres
      });
    } catch (error) {
      console.error('Error in getBookGenres:', error);
      res.status(500).json({
        status: 'error',
        message: error.message
      });
    }
  }
};

module.exports = genreController; 