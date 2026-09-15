'use strict';

const { ok, fail, readBody } = require('../http-helpers');
const { books, loans, nextLoanId, users } = require('../db');
const { getUserFromRequest } = require('../auth');

const LOAN_DAYS = 7;

function enrich(loan) {
  const book = books.find((b) => b.id === loan.bookId);
  const user = users.find((u) => u.id === loan.userId);
  return {
    ...loan,
    bookTitle: book ? book.title : null,
    userName: user ? user.name : null,
  };
}

/** GET /api/loans (admin: all loans, member: own loans) */
async function list(req, res) {
  const auth = getUserFromRequest(req);
  if (!auth) return fail(res, 401, 'Tidak terautentikasi');

  const result =
    auth.user.role === 'admin' ? loans : loans.filter((l) => l.userId === auth.user.id);

  return ok(res, result.map(enrich));
}

/** POST /api/loans  body: { bookId }  -- borrow a book */
async function create(req, res) {
  const auth = getUserFromRequest(req);
  if (!auth) return fail(res, 401, 'Tidak terautentikasi');

  let body;
  try {
    body = await readBody(req);
  } catch (e) {
    return fail(res, 400, e.message);
  }

  const bookId = Number(body.bookId);
  const book = books.find((b) => b.id === bookId);
  if (!book) return fail(res, 404, 'Buku tidak ditemukan');
  if (book.stock < 1) return fail(res, 409, 'Stok buku tidak tersedia');

  const alreadyBorrowed = loans.some(
    (l) => l.userId === auth.user.id && l.bookId === bookId && l.status === 'borrowed'
  );
  if (alreadyBorrowed) return fail(res, 409, 'Anda sudah meminjam buku ini');

  book.stock -= 1;

  const now = new Date();
  const dueDate = new Date(now.getTime() + LOAN_DAYS * 24 * 60 * 60 * 1000);
  const loan = {
    id: nextLoanId(),
    userId: auth.user.id,
    bookId,
    borrowedAt: now.toISOString(),
    dueDate: dueDate.toISOString(),
    returnedAt: null,
    status: 'borrowed',
  };
  loans.push(loan);

  return ok(res, enrich(loan), 201);
}

/** POST /api/loans/:id/return -- return a book */
async function returnLoan(req, res, params) {
  const auth = getUserFromRequest(req);
  if (!auth) return fail(res, 401, 'Tidak terautentikasi');

  const id = Number(params.id);
  const loan = loans.find((l) => l.id === id);
  if (!loan) return fail(res, 404, 'Data peminjaman tidak ditemukan');

  if (auth.user.role !== 'admin' && loan.userId !== auth.user.id) {
    return fail(res, 403, 'Anda tidak dapat mengembalikan peminjaman milik pengguna lain');
  }
  if (loan.status === 'returned') return fail(res, 409, 'Buku sudah dikembalikan');

  loan.status = 'returned';
  loan.returnedAt = new Date().toISOString();

  const book = books.find((b) => b.id === loan.bookId);
  if (book) book.stock = Math.min(book.totalStock, book.stock + 1);

  return ok(res, enrich(loan));
}

module.exports = { list, create, returnLoan };
