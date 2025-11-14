const { db, admin } = require('../config/firebase');

const userController = {
  // Mendapatkan user berdasarkan ID
  getUserById: async (req, res) => {
    try {
      const { id } = req.params;
      const userDoc = await db.collection('users').doc(id).get();

      if (!userDoc.exists) {
        return res.status(404).json({
          status: 'error',
          message: 'User tidak ditemukan'
        });
      }

      const userData = userDoc.data();
      res.json({
        status: 'success',
        data: {
          id: userDoc.id,
          ...userData
        }
      });
    } catch (error) {
      console.error('Error getting user:', error);
      res.status(500).json({
        status: 'error',
        message: 'Terjadi kesalahan saat mengambil data user'
      });
    }
  },

  // Mendapatkan semua user
getAllUsers: async (req, res) => {
  try {
    const snapshot = await db.collection('users').get();
    const users = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        createdAt: data.createdAt || new admin.firestore.Timestamp.now() // pastikan selalu ada
      };
    });
    res.json({ status: 'success', data: users });
  } catch (error) {
    console.error(error);
    res.status(500).json({ status: 'error', message: 'Gagal mengambil data user' });
  }
},

  // Membuat user baru
  createUser: async (req, res) => {
    try {
      const { nama, email, password } = req.body;

      if (!nama || !email || !password) {
        return res.status(400).json({
          status: 'error',
          message: 'Semua field harus diisi'
        });
      }

      const userRecord = await admin.auth().getUserByEmail(email).catch(() => null);
      if (userRecord) {
        return res.status(400).json({
          status: 'error',
          message: 'Email sudah terdaftar'
        });
      }

      const newUser = await admin.auth().createUser({
        email,
        password,
        displayName: nama
      });

      await db.collection('users').doc(newUser.uid).set({
        nama,
        email,
        createdAt: new Date()
      });

      res.status(201).json({
        status: 'success',
        message: 'User berhasil dibuat',
        data: {
          id: newUser.uid,
          nama,
          email
        }
      });
    } catch (error) {
      console.error('Error creating user:', error);
      res.status(500).json({
        status: 'error',
        message: 'Terjadi kesalahan saat membuat user'
      });
    }
  },

  // Update user
  updateUser: async (req, res) => {
    try {
      const { id } = req.params;
      const { nama, email, foto } = req.body;

      if (!nama || !email) {
        return res.status(400).json({
          status: 'error',
          message: 'Nama dan email harus diisi'
        });
      }

      const userDoc = await db.collection('users').doc(id).get();
      if (!userDoc.exists) {
        return res.status(404).json({
          status: 'error',
          message: 'User tidak ditemukan'
        });
      }

      await admin.auth().updateUser(id, {
        displayName: nama,
        email
      });

      await db.collection('users').doc(id).update({
        nama,
        email,
        ...(foto && { foto }),
        updatedAt: new Date()
      });

      res.json({
        status: 'success',
        message: 'User berhasil diupdate'
      });
    } catch (error) {
      console.error('Error updating user:', error);
      res.status(500).json({
        status: 'error',
        message: 'Terjadi kesalahan saat mengupdate user'
      });
    }
  },

  // Delete user
  deleteUser: async (req, res) => {
    try {
      const { id } = req.params;

      const userDoc = await db.collection('users').doc(id).get();
      if (!userDoc.exists) {
        return res.status(404).json({
          status: 'error',
          message: 'User tidak ditemukan'
        });
      }

      await admin.auth().deleteUser(id);
      await db.collection('users').doc(id).delete();

      res.json({
        status: 'success',
        message: 'User berhasil dihapus'
      });
    } catch (error) {
      console.error('Error deleting user:', error);
      res.status(500).json({
        status: 'error',
        message: 'Terjadi kesalahan saat menghapus user'
      });
    }
  },

  // Login user
  loginUser: async (req, res) => {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({
          status: 'error',
          message: 'Email dan password harus diisi'
        });
      }

      const userRecord = await admin.auth().getUserByEmail(email);
      const userDoc = await db.collection('users').doc(userRecord.uid).get();
      const userData = userDoc.data();

      res.json({
        status: 'success',
        message: 'Login berhasil',
        data: {
          id: userRecord.uid,
          ...userData
        }
      });
    } catch (error) {
      console.error('Error logging in:', error);
      res.status(401).json({
        status: 'error',
        message: 'Email atau password salah'
      });
    }
  },

  // Tambah buku ke favorit
  addToFavorites: async (req, res) => {
    try {
      const { uid } = req.params;
      const { bookId, judul, cover } = req.body;

      await db.collection('users').doc(uid)
        .collection('favorites').doc(bookId).set({
          judul,
          cover,
          tanggal: new Date()
        });

      res.json({
        status: 'success',
        message: 'Buku berhasil ditambahkan ke favorit'
      });
    } catch (error) {
      console.error('Error adding to favorites:', error);
      res.status(500).json({
        status: 'error',
        message: 'Terjadi kesalahan saat menambahkan ke favorit'
      });
    }
  },

  // Hapus buku dari favorit
  removeFromFavorites: async (req, res) => {
    try {
      const { uid, bookId } = req.params;

      await db.collection('users').doc(uid)
        .collection('favorites').doc(bookId).delete();

      res.json({
        status: 'success',
        message: 'Buku berhasil dihapus dari favorit'
      });
    } catch (error) {
      console.error('Error removing from favorites:', error);
      res.status(500).json({
        status: 'error',
        message: 'Terjadi kesalahan saat menghapus dari favorit'
      });
    }
  },

  // Update history baca
  updateReadingHistory: async (req, res) => {
    try {
      const { uid } = req.params;
      const { bookId, judul, halaman_terakhir } = req.body;

      await db.collection('users').doc(uid)
        .collection('history_reads').doc(bookId).set({
          judul,
          halaman_terakhir,
          tanggal_baca: new Date()
        });

      res.json({
        status: 'success',
        message: 'History baca berhasil diupdate'
      });
    } catch (error) {
      console.error('Error updating reading history:', error);
      res.status(500).json({
        status: 'error',
        message: 'Terjadi kesalahan saat mengupdate history baca'
      });
    }
  },

  // Ban / Unban user
  banUser: async (req, res) => {
    try {
      const { id } = req.params;
      const userRef = db.collection('users').doc(id);
      const userDoc = await userRef.get();
      if (!userDoc.exists) return res.status(404).json({ status: 'error', message: 'User tidak ditemukan' });

      const banned = !userDoc.data().banned;
      await userRef.update({ banned });
      res.json({ status: 'success', message: banned ? 'User banned' : 'User unbanned' });
    } catch (err) {
      console.error(err);
      res.status(500).json({ status: 'error', message: 'Terjadi kesalahan' });
    }
  },

  // Disable / Enable user
  disableUser: async (req, res) => {
    try {
      const { id } = req.params;
      const userRef = db.collection('users').doc(id);
      const userDoc = await userRef.get();
      if (!userDoc.exists) return res.status(404).json({ status: 'error', message: 'User tidak ditemukan' });

      const disabled = !userDoc.data().disabled;
      await userRef.update({ disabled });
      res.json({ status: 'success', message: disabled ? 'User disabled' : 'User enabled' });
    } catch (err) {
      console.error(err);
      res.status(500).json({ status: 'error', message: 'Terjadi kesalahan' });
    }
  }
};

module.exports = userController;
