'use strict';

/**
 * Simple in-memory "database" for the Library (Perpustakaan) app.
 * No external DB is required to run this project out of the box.
 * Replace this module with a real database layer (Postgres/MySQL/Mongo)
 * for production use.
 */

const crypto = require('crypto');

function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
  const hash = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
  return { salt, hash };
}

function verifyPassword(password, salt, hash) {
  const check = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
  return crypto.timingSafeEqual(Buffer.from(check, 'hex'), Buffer.from(hash, 'hex'));
}

// ---- Autoincrement id helpers -------------------------------------------------
let userSeq = 0;
let categorySeq = 0;
let bookSeq = 0;
let loanSeq = 0;

const nextUserId = () => ++userSeq;
const nextCategoryId = () => ++categorySeq;
const nextBookId = () => ++bookSeq;
const nextLoanId = () => ++loanSeq;

// ---- Collections ---------------------------------------------------------------
const users = [];
const categories = [];
const books = [];
const loans = [];

/** token -> { userId, expiresAt } */
const tokens = new Map();

// ---- Seed data -------------------------------------------------------------------
function seed() {
  const adminPass = hashPassword('admin123');
  const memberPass = hashPassword('budi123');

  users.push(
    {
      id: nextUserId(),
      name: 'Admin Perpustakaan',
      email: 'admin@perpus.id',
      role: 'admin',
      salt: adminPass.salt,
      hash: adminPass.hash,
      createdAt: new Date().toISOString(),
    },
    {
      id: nextUserId(),
      name: 'Budi Santoso',
      email: 'budi@perpus.id',
      role: 'member',
      salt: memberPass.salt,
      hash: memberPass.hash,
      createdAt: new Date().toISOString(),
    }
  );

  const categoryNames = ['Fiksi', 'Non-Fiksi', 'Sains & Teknologi', 'Sejarah', 'Anak-Anak', 'Biografi'];
  categoryNames.forEach((name) => categories.push({ id: nextCategoryId(), name }));

  const catId = (name) => categories.find((c) => c.name === name).id;

  const sampleBooks = [
    {
      title: 'Laskar Pelangi',
      author: 'Andrea Hirata',
      categoryId: catId('Fiksi'),
      year: 2005,
      stock: 4,
      synopsis: 'Kisah perjuangan anak-anak Belitung mengejar pendidikan di tengah keterbatasan.',
    },
    {
      title: 'Bumi Manusia',
      author: 'Pramoedya Ananta Toer',
      categoryId: catId('Fiksi'),
      year: 1980,
      stock: 3,
      synopsis: 'Novel sejarah tentang kehidupan pada masa kolonial Hindia Belanda.',
    },
    {
      title: 'Sapiens: A Brief History of Humankind',
      author: 'Yuval Noah Harari',
      categoryId: catId('Non-Fiksi'),
      year: 2011,
      stock: 2,
      synopsis: 'Perjalanan panjang sejarah manusia dari masa berburu hingga era modern.',
    },
    {
      title: 'Cosmos',
      author: 'Carl Sagan',
      categoryId: catId('Sains & Teknologi'),
      year: 1980,
      stock: 2,
      synopsis: 'Eksplorasi alam semesta dan tempat manusia di dalamnya.',
    },
    {
      title: 'Clean Code',
      author: 'Robert C. Martin',
      categoryId: catId('Sains & Teknologi'),
      year: 2008,
      stock: 5,
      synopsis: 'Panduan menulis kode yang rapi, mudah dibaca, dan mudah dirawat.',
    },
    {
      title: 'Sejarah Indonesia Modern',
      author: 'M.C. Ricklefs',
      categoryId: catId('Sejarah'),
      year: 1981,
      stock: 3,
      synopsis: 'Rangkuman sejarah Indonesia dari masa kerajaan hingga era kemerdekaan.',
    },
    {
      title: 'Si Kancil dan Buaya',
      author: 'Cerita Rakyat Nusantara',
      categoryId: catId('Anak-Anak'),
      year: 2015,
      stock: 6,
      synopsis: 'Kumpulan dongeng nusantara yang penuh pesan moral untuk anak-anak.',
    },
    {
      title: 'Steve Jobs',
      author: 'Walter Isaacson',
      categoryId: catId('Biografi'),
      year: 2011,
      stock: 2,
      synopsis: 'Biografi resmi pendiri Apple, Steve Jobs.',
    },
    {
      title: 'Atomic Habits',
      author: 'James Clear',
      categoryId: catId('Non-Fiksi'),
      year: 2018,
      stock: 4,
      synopsis: 'Cara membangun kebiasaan baik dan menghilangkan kebiasaan buruk secara bertahap.',
    },
    {
      title: 'Filosofi Teras',
      author: 'Henry Manampiring',
      categoryId: catId('Non-Fiksi'),
      year: 2018,
      stock: 3,
      synopsis: 'Pengantar filsafat stoa untuk mengelola emosi di kehidupan modern.',
    },
  ];

  sampleBooks.forEach((b) =>
    books.push({
      id: nextBookId(),
      totalStock: b.stock,
      stock: b.stock,
      createdAt: new Date().toISOString(),
      ...b,
    })
  );
}

seed();

module.exports = {
  users,
  categories,
  books,
  loans,
  tokens,
  nextUserId,
  nextCategoryId,
  nextBookId,
  nextLoanId,
  hashPassword,
  verifyPassword,
};
