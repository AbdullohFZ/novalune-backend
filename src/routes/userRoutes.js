const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');

// 🔐 Login user manual (email + password dari Firestore)
router.post('/login', userController.loginUser);

// 🧍‍♂️ GET user berdasarkan ID
router.get('/:id', userController.getUserById);

// ➕ Tambah user (REGISTER)
router.post('/', userController.createUser);

// ✏️ Update profil user
router.put('/:id', userController.updateUser);

// ❌ Hapus user
router.delete('/:id', userController.deleteUser);

router.get('/', userController.getAllUsers);
router.patch('/:id/ban', userController.banUser);
router.patch('/:id/disable', userController.disableUser);

module.exports = router;
