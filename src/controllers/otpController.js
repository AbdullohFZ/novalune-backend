const { sendMail } = require('../utils/mailer');
const admin = require('firebase-admin');
const db = admin.firestore();

function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

exports.sendOtpUniversal = async (req, res) => {
  const { email, type, nama, password } = req.body;
  const validTypes = ['register', 'reset'];

  console.log('📤 Sending OTP request:', { email, type });

  if (!validTypes.includes(type)) {
    return res.status(400).json({ success: false, message: 'Jenis OTP tidak valid' });
  }

  if (type === 'register') {
    const existingUser = await db.collection('users').where('email', '==', email).get();
    if (!existingUser.empty) {
      return res.status(400).json({
        success: false,
        message: 'Email sudah terdaftar',
      });
    }
  } else if (type === 'reset') {
    const existingUser = await db.collection('users').where('email', '==', email).get();
    if (existingUser.empty) {
      return res.status(400).json({
        success: false,
        message: 'Email belum terdaftar',
      });
    }
  }

  const otp = generateOTP();
  const docId = `${type}_${email}`;
  const otpDocRef = db.collection('emailOtps').doc(docId);

  console.log('📄 Creating OTP document with ID:', docId);

  const now = new Date();
  const expiresAt = new Date(now.getTime() + 5 * 60 * 1000); // 5 menit dari sekarang

  let dataToSave = {
    email,
    otp,
    type,
    createdAt: now,
    expiresAt,
    used: false,
  };
  
  // 🔁 Cek apakah ini resend OTP untuk register
  if (type === 'register') {
    const oldDataSnap = await otpDocRef.get();
    if (oldDataSnap.exists) {
      const oldData = oldDataSnap.data();
      dataToSave.nama = oldData.nama || '';
      dataToSave.password = oldData.password || '';
    } else {
      // Kalau dokumen belum pernah ada sebelumnya
      dataToSave.nama = nama || '';
      dataToSave.password = password
        ? await require('bcryptjs').hash(password, 10)
        : '';
    }
  }
  
  await otpDocRef.set(dataToSave);  

  await sendMail({
    to: email,
    subject: `Kode OTP untuk ${type === 'register' ? 'Pendaftaran' : 'Reset Password'}`,
    text: `Kode OTP kamu: ${otp}`,
    html: `
  <div style="font-family: 'Segoe UI', 'Helvetica Neue', Arial, sans-serif; background-color: #f4f4f4; padding: 24px;">
  <div style="max-width: 600px; margin: auto; background: #fff; border-radius: 16px; padding: 28px; box-shadow: 0 4px 12px rgba(0,0,0,0.08);">
    <div style="text-align: center;">
      <!-- LOGO -->
      <img src="https://i.imgur.com/4QqN01v.png" alt="Novalune Logo" width="90" style="margin-bottom: 16px; border-radius: 8px;" />
      
      <!-- JUDUL -->
      <h2 style="color: #FF6B6B; font-size: 22px; margin-bottom: 12px;">
        Kode OTP ${type === 'register' ? 'Pendaftaran' : 'Reset Password'} Anda
      </h2>

      <!-- SALAM -->
      <p style="color: #333; font-size: 16px; margin-top: 0;">
        Halo ${nama || 'Pengguna'},
      </p>

      <!-- PESAN UTAMA -->
      <p style="color: #555; line-height: 1.6; font-size: 15px; margin: 16px 0;">
        Berikut adalah kode OTP untuk proses <strong>${type === 'register' ? 'pendaftaran akun' : 'reset kata sandi'}</strong> Anda di platform <strong>Novalune</strong>.
        Silakan masukkan kode ini untuk melanjutkan proses Anda.
      </p>

      <!-- KODE OTP -->
      <div style="
        font-size: 34px;
        font-weight: bold;
        margin: 24px auto;
        letter-spacing: 6px;
        background-color: #f8f8f8;
        color: #222;
        padding: 14px 20px;
        display: inline-block;
        border-radius: 10px;
        border: 1px dashed #FF6B6B;
        width: fit-content;
      ">
        ${otp}
      </div>

      <!-- INFO EXPIRE -->
      <p style="color: #888; margin-top: 12px; font-size: 13px;">
        Kode ini berlaku selama 5 menit.
      </p>

      <!-- GARIS PEMBATAS -->
      <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;" />

      <!-- PESAN KEAMANAN -->
      <p style="font-size: 12px; color: #999;">
        Jika Anda tidak meminta kode ini, Anda bisa mengabaikan email ini. Jangan bagikan kode ini kepada siapapun demi keamanan akun Anda.
      </p>

      <!-- FOOTER -->
      <p style="font-size: 11px; color: #bbb; margin-top: 30px;">
        © 2025 Novalune. All rights reserved.<br />
        Platform literasi digital untuk generasi muda. 🌙
      </p>
    </div>
  </div>
</div>
`,
  });

  console.log('✅ OTP sent successfully for:', { email, type, otp });
  res.json({ success: true, message: 'OTP berhasil dikirim!' });
};

exports.verifyOtpUniversal = async (req, res) => {
  const { email, otp, type } = req.body;

  console.log('📤 Verifying OTP request:', { email, type, otp });

  if (!email || !otp || !type) {
    return res.status(400).json({ 
      success: false, 
      message: 'Email, OTP, dan type wajib diisi!' 
    });
  }

  const validTypes = ['register', 'reset'];
  if (!validTypes.includes(type)) {
    return res.status(400).json({ 
      success: false, 
      message: 'Jenis OTP tidak valid' 
    });
  }

  const docId = `${type}_${email}`;
  const otpDocRef = db.collection('emailOtps').doc(docId);
  
  console.log('📄 Checking OTP document with ID:', docId);
  
  const otpSnap = await otpDocRef.get();

  if (!otpSnap.exists) {
    console.log('❌ OTP document not found:', docId);
    return res.status(404).json({ 
      success: false, 
      message: 'OTP tidak ditemukan' 
    });
  }

  const data = otpSnap.data();
  console.log('📄 OTP data from Firestore:', { 
    email: data.email, 
    type: data.type, 
    used: data.used,
    otp: data.otp ? '***' : 'null'
  });

  if (data.used) {
    console.log('❌ OTP already used');
    return res.status(400).json({ 
      success: false, 
      message: 'OTP sudah digunakan' 
    });
  }

  const now = new Date();
  const createdAt = data.createdAt.toDate();
  const diff = (now - createdAt) / 1000;

  console.log('⏰ OTP time check:', { 
    createdAt: createdAt.toISOString(), 
    now: now.toISOString(), 
    diffSeconds: diff 
  });

  if (diff > 300) {
    console.log('❌ OTP expired');
    return res.status(400).json({ 
      success: false, 
      message: 'OTP kedaluwarsa' 
    });
  }

  if (otp !== data.otp) {
    console.log('❌ OTP mismatch:', { 
      provided: otp, 
      stored: data.otp 
    });
    return res.status(400).json({ 
      success: false, 
      message: 'OTP salah' 
    });
  }

  await otpDocRef.update({ used: true });
  console.log('✅ OTP verified successfully for:', { email, type });

  if (type === 'register') {
    const usersRef = db.collection('users');
    const snapshot = await usersRef.where('email', '==', email).get();
  
    if (snapshot.empty) {
      // 🆕 Daftarkan juga ke Firebase Auth
      const userRecord = await admin.auth().createUser({
        email: email,
        password: data.password || 'default_password',
        displayName: data.nama || '',
      });
  
      await usersRef.doc(userRecord.uid).set({
        nama: data.nama || '',
        email,
        password: data.password || '',
        foto: '',
        verified: true,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        lastLogin: admin.firestore.FieldValue.serverTimestamp(),
        uid: userRecord.uid,
      });
  
      console.log('✅ User registered ke Firebase Auth dan Firestore:', email);
    } else {
      console.log('⚠️ User already exists di Firestore:', email);
    }
  }  

  res.json({ success: true, message: 'OTP valid' });
};

exports.getOtpNama = async (req, res) => {
  const { email, type } = req.query;
  if (!email || !type) {
    return res.status(400).json({ success: false, message: 'Email dan tipe wajib diisi' });
  }

  try {
    const doc = await db.collection('emailOtps').doc(`${type}_${email}`).get();
    if (!doc.exists) {
      return res.status(404).json({ success: false, message: 'OTP tidak ditemukan' });
    }
    const data = doc.data();
    return res.json({ success: true, nama: data.nama || '' });
  } catch (err) {
    console.error('❌ Gagal ambil nama dari OTP:', err);
    return res.status(500).json({ success: false, message: 'Gagal ambil data OTP' });
  }
}; 