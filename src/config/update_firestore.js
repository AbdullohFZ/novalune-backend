const admin = require('firebase-admin');
const bcrypt = require('bcryptjs');
const path = require('path');

// 🔹 Inisialisasi Firebase Admin
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

async function updateFirestore() {
  try {
    console.log('🚀 Memulai update Firestore...');

    // 1️⃣ Collection: emailOtps
    console.log('📧 Update collection emailOtps...');
    const emailOtpsRef = db.collection('emailOtps');
    await emailOtpsRef.doc('register_example@email.com').set({
      email: 'example@email.com',
      otp: '123456',
      type: 'register',
      used: false,
      nama: 'Example User',
      password: await bcrypt.hash('examplepassword', 10),
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      expiresAt: admin.firestore.Timestamp.fromDate(new Date(Date.now() + 5 * 60000)), // 5 menit
    }, { merge: true });

    // 2️⃣ Collection: users
    console.log('👥 Update collection users...');
    const userId = 'example-user-id';
    const usersRef = db.collection('users');
    await usersRef.doc(userId).set({
      nama: 'Example User',
      email: 'example@email.com',
      foto: 'https://example.com/user.jpg',
      verified: true,
      password: await bcrypt.hash('examplepassword', 10),
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      lastLogin: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });

    // Subcollection: favorites
    console.log('⭐ Update subcollection favorites...');
    await usersRef.doc(userId).collection('favorites').doc('book1').set({
      judul: 'Contoh Buku 1',
      cover: 'https://example.com/cover1.jpg',
      tanggal: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });

    // Subcollection: history_reads
    console.log('📖 Update subcollection history_reads...');
    await usersRef.doc(userId).collection('history_reads').doc('book1').set({
      judul: 'Contoh Buku 1',
      cover: 'https://example.com/cover1.jpg',
      tanggal: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });

    // 3️⃣ Collection: books
    console.log('📚 Update collection books...');
    const booksRef = db.collection('books');
    await booksRef.doc('book1').set({
      judul: 'Contoh Buku 1',
      penulis: 'Penulis 1',
      deskripsi: 'Deskripsi buku 1',
      rating: 4.5,
      penerbit: 'Penerbit 1',
      tahun_terbit: 2024,
      jumlah_halaman: 200,
      cover_url: 'https://example.com/cover1.jpg',
      pdf_url: 'https://example.com/book1.pdf',
      genre: ['Drama', 'Psikologi', 'Klasik'], // pakai array genre
      updated_at: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });

    // 4️⃣ Collection: loginAttempts
    console.log('🔐 Update collection loginAttempts...');
    const loginAttemptsRef = db.collection('loginAttempts');
    await loginAttemptsRef.doc('example@email.com').set({
      failedCount: 2,
      lastFailedAt: admin.firestore.FieldValue.serverTimestamp(),
      cooldownUntil: admin.firestore.Timestamp.fromDate(new Date(Date.now() + 30000)), // 30 detik cooldown
    }, { merge: true });

    // 5️⃣ Subcollection: comments per buku
    console.log('💬 Update subcollection comments...');
    const commentsRef = booksRef.doc('book1').collection('comments');
    const newComment = await commentsRef.add({
      bookId: 'book1',
      userId: userId,
      username: 'Example User',
      userPhoto: 'https://example.com/user.jpg',
      text: 'Ini komentar pertama untuk buku ini!',
      rating: 4.5,
      likes: [],
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // 6️⃣ Subcollection: replies dalam komentar
    console.log('💭 Tambahkan contoh reply di komentar...');
    const repliesRef = commentsRef.doc(newComment.id).collection('replies');
    await repliesRef.add({
      userId: userId,
      username: 'Example User 2',
      text: 'Setuju banget sama komentar ini 😄',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // BONUS 🔁: Update semua buku lama yang belum punya 'genre'
    console.log('🛠️ Mengecek buku lama yang belum punya field genre...');
    const snapshot = await booksRef.get();
    let countUpdated = 0;

    for (const doc of snapshot.docs) {
      const data = doc.data();
      if (!data.genre) {
        await booksRef.doc(doc.id).set({
          genre: ['Umum'], // default genre
          updated_at: admin.firestore.FieldValue.serverTimestamp(),
        }, { merge: true });
        console.log(`✅ Buku '${doc.id}' ditambahkan genre default ['Umum']`);
        countUpdated++;
      }
    }

    if (countUpdated === 0) {
      console.log('✨ Semua buku sudah memiliki field genre, tidak ada update tambahan.');
    } else {
      console.log(`🎯 Total ${countUpdated} buku lama berhasil ditambahkan genre default.`);
    }

    console.log('\n✅ Firestore berhasil diupdate tanpa hapus data lama!');
    console.log(`
📁 Struktur Firestore:
├── emailOtps
│   └── register_example@email.com
├── users
│   └── example-user-id
│       ├── favorites
│       └── history_reads
├── books
│   └── book1
│       ├── comments
│       │   └── commentId
│       │       └── replies
└── loginAttempts
    `);

    process.exit(0);
  } catch (error) {
    console.error('❌ Error saat update Firestore:', error);
    process.exit(1);
  }
}

// Jalankan update
updateFirestore();