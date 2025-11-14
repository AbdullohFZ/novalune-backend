const admin = require('firebase-admin');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { sendMail } = require('../utils/mailer');

// 🔐 OTP generator
const generateOTP = () => Math.floor(100000 + Math.random() * 900000).toString();

// 🔁 Tambah percobaan login gagal
const increaseLoginAttempt = async (email) => {
  const ref = admin.firestore().collection('loginAttempts').doc(email);
  const doc = await ref.get();
  const now = new Date();
  let failedCount = 1;
  let cooldownMs = 0;

  if (doc.exists) {
    failedCount = doc.data().failedCount + 1;
  }

  if (failedCount >= 3 && failedCount < 6) {
    cooldownMs = 30 * 1000; // 30 detik
  } else if (failedCount >= 6) {
    cooldownMs = 2 * 60 * 1000; // 2 menit
    try {
      const user = await admin.auth().getUserByEmail(email);
      await admin.auth().updateUser(user.uid, { disabled: true });
      console.log(`🔒 Akun ${email} dinonaktifkan karena gagal login berulang.`);
    } catch (err) {
      console.warn(`⚠️ Gagal menonaktifkan akun: ${err.message}`);
    }
  }

  await ref.set({
    failedCount,
    lastFailedAt: admin.firestore.FieldValue.serverTimestamp(),
    cooldownUntil: cooldownMs
      ? admin.firestore.Timestamp.fromDate(new Date(Date.now() + cooldownMs))
      : null,
  });
};

// ✅ Login
const login = async (req, res) => {
  const { email, password } = req.body;
  const loginAttemptRef = admin.firestore().collection('loginAttempts').doc(email);
  const now = new Date();

  try {
    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email dan password harus diisi' });
    }

    // Ambil data percobaan sebelumnya
    const attemptSnap = await loginAttemptRef.get();
    const attemptData = attemptSnap.exists ? attemptSnap.data() : {};
    let failedCount = (attemptData.failedCount || 0);
    const cooldownUntil = attemptData.cooldownUntil?.toDate?.() || null;

    // Kalau dalam masa cooldown, tetap hitung sebagai gagal
    if (cooldownUntil && now < cooldownUntil) {
      failedCount += 1;

      if (failedCount >= 5) {
        try {
          const userAuth = await admin.auth().getUserByEmail(email);
          await admin.auth().updateUser(userAuth.uid, { disabled: true });
        } catch (e) {
          console.error('❌ Gagal disable akun:', e.message);
        }

        await loginAttemptRef.set({
          failedCount,
          lastFailedAt: admin.firestore.Timestamp.fromDate(now),
        }, { merge: true });

        return res.status(403).json({
          success: false,
          message: 'Akun dinonaktifkan karena terlalu banyak percobaan login.',
        });
      }

      const cooldownSec = 15 * (failedCount - 2);
      const nextCooldown = new Date(now.getTime() + cooldownSec * 1000);
      await loginAttemptRef.set({
        failedCount,
        lastFailedAt: admin.firestore.Timestamp.fromDate(now),
        cooldownUntil: admin.firestore.Timestamp.fromDate(nextCooldown),
      }, { merge: true });

      const sisa = Math.ceil((nextCooldown - now) / 1000);
      return res.status(403).json({
        success: false,
        message: `Terlalu banyak percobaan. Coba lagi dalam ${sisa} detik.`,
      });
    }

    // Cari user
    const snapshot = await admin.firestore().collection('users').where('email', '==', email).get();
    if (snapshot.empty) throw new Error('Email atau password salah');

    const userDoc = snapshot.docs[0];
    const user = userDoc.data();

    // Cek password
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) throw new Error('Email atau password salah');

    // ✅ Login berhasil → reset attempt
    await loginAttemptRef.delete().catch(() => {});
    const token = jwt.sign({ email: user.email }, process.env.JWT_SECRET, { expiresIn: '7d' });
    delete user.password;

    return res.json({ success: true, data: { token, user } });

  } catch (error) {
    // ❌ Login gagal → tambah count
    const attemptSnap = await loginAttemptRef.get();
    let prev = attemptSnap.exists ? attemptSnap.data() : {};
    let failedCount = (prev.failedCount || 0) + 1;

    // Jika count ke-5 → disable akun
    if (failedCount >= 5) {
      try {
        const userAuth = await admin.auth().getUserByEmail(email);
        await admin.auth().updateUser(userAuth.uid, { disabled: true });
      } catch (e) {
        console.error('❌ Gagal disable akun:', e.message);
      }

      await loginAttemptRef.set({
        failedCount,
        lastFailedAt: admin.firestore.Timestamp.fromDate(now),
      }, { merge: true });

      return res.status(403).json({
        success: false,
        message: 'Akun dinonaktifkan karena terlalu banyak percobaan login.',
      });
    }

    // ⏳ Tambah cooldown kalau >= percobaan ke-3
    let updateData = {
      failedCount,
      lastFailedAt: admin.firestore.Timestamp.fromDate(now),
    };

    if (failedCount >= 3) {
      const cooldownSec = 15 * (failedCount - 2); // 15s, 30s
      updateData.cooldownUntil = admin.firestore.Timestamp.fromDate(new Date(now.getTime() + cooldownSec * 1000));
    }

    await loginAttemptRef.set(updateData, { merge: true });

    return res.status(400).json({
      success: false,
      message: error.message || 'Email atau password salah',
    });
  }
};

// ✅ Reset Password
const resetPassword = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email dan password baru harus diisi' });
    }

    const userAuth = await admin.auth().getUserByEmail(email);
    const uid = userAuth.uid;

    const userDoc = await admin.firestore().collection('users').doc(uid).get();
    if (!userDoc.exists) {
      return res.status(404).json({ success: false, message: 'User tidak ditemukan di Firestore' });
    }

    const userData = userDoc.data();
    const isSamePassword = await bcrypt.compare(password, userData.password);
    if (isSamePassword) {
      return res.status(400).json({
        success: false,
        message: 'Password baru tidak boleh sama',
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    await admin.firestore().collection('users').doc(uid).update({ password: hashedPassword });
    // ✅ Update password & aktifkan akun kembali di Firebase Authentication
    await admin.auth().updateUser(uid, {
      password,
      disabled: false, // 🔓 Otomatis aktifkan kembali
    });

    // ✅ Hapus loginAttempts agar failedCount reset
    await admin.firestore().collection('loginAttempts').doc(email).delete().catch(() => {});
    try {
      await admin.firestore().collection('emailOtps').doc(`reset_${email}`).delete();
    } catch (err) {
      console.warn('⚠️ Gagal hapus OTP reset (tidak masalah):', err.message);
    }

    res.json({ success: true, message: 'Password berhasil diubah!' });
  } catch (error) {
    console.error('Error reset password:', error);
    res.status(500).json({ success: false, message: 'Gagal reset password' });
  }
};

module.exports = {
  login,
  resetPassword,
};
