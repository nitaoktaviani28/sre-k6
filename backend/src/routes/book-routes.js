'use strict';

const { ok, fail, readBody } = require('../http-helpers');
const { books, categories, nextBookId } = require('../db');
const { getUserFromRequest } = require('../auth');

function enrich(book) {
  const category = categories.find((c) => c.id === book.categoryId);
  return { ...book, categoryName: category ? category.name : null };
}

/**
 * GET /api/books?search=&categoryId=&page=&pageSize=
 */
async function list(req, res, params, query) {
  let result = books.map(enrich);

  if (query.search) {
    const q = query.search.toLowerCase();
    result = result.filter(
      (b) => b.title.toLowerCase().includes(q) || b.author.toLowerCase().includes(q)
    );
  }
  if (query.categoryId) {
    const catId = Number(query.categoryId);
    result = result.filter((b) => b.categoryId === catId);
  }

  const page = Math.max(1, Number(query.page) || 1);
  const pageSize = Math.min(50, Math.max(1, Number(query.pageSize) || 10));
  const total = result.length;
  const start = (page - 1) * pageSize;
  const paged = result.slice(start, start + pageSize);

  return ok(res, {
    items: paged,
    pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) || 1 },
  });
}

/** GET /api/books/:id */
async function getOne(req, res, params) {
  const id = Number(params.id);
  const book = books.find((b) => b.id === id);
  if (!book) return fail(res, 404, 'Buku tidak ditemukan');
  return ok(res, enrich(book));
}

/** POST /api/books (admin only) */
async function create(req, res) {
  const auth = getUserFromRequest(req);
  if (!auth) return fail(res, 401, 'Tidak terautentikasi');
  if (auth.user.role !== 'admin') return fail(res, 403, 'Hanya admin yang dapat menambah buku');

  let body;
  try {
    body = await readBody(req);
  } catch (e) {
    return fail(res, 400, e.message);
  }

  const { title, author, categoryId, year, stock, synopsis } = body;
  if (!title || !author || !categoryId) {
    return fail(res, 400, 'title, author, dan categoryId wajib diisi');
  }
  const category = categories.find((c) => c.id === Number(categoryId));
  if (!category) return fail(res, 400, 'categoryId tidak valid');

  const stockNum = Number.isFinite(Number(stock)) ? Math.max(0, Number(stock)) : 1;
  const book = {
    id: nextBookId(),
    title: String(title).trim(),
    author: String(author).trim(),
    categoryId: category.id,
    year: Number(year) || null,
    stock: stockNum,
    totalStock: stockNum,
    synopsis: synopsis ? String(synopsis).trim() : '',
    createdAt: new Date().toISOString(),
  };
  books.push(book);
  return ok(res, enrich(book), 201);
}

/** PUT /api/books/:id (admin only) */
async function update(req, res, params) {
  const auth = getUserFromRequest(req);
  if (!auth) return fail(res, 401, 'Tidak terautentikasi');
  if (auth.user.role !== 'admin') return fail(res, 403, 'Hanya admin yang dapat mengubah buku');

  const id = Number(params.id);
  const book = books.find((b) => b.id === id);
  if (!book) return fail(res, 404, 'Buku tidak ditemukan');

  let body;
  try {
    body = await readBody(req);
  } catch (e) {
    return fail(res, 400, e.message);
  }

  const { title, author, categoryId, year, stock, synopsis } = body;
  if (categoryId !== undefined) {
    const category = categories.find((c) => c.id === Number(categoryId));
    if (!category) return fail(res, 400, 'categoryId tidak valid');
    book.categoryId = category.id;
  }
  if (title !== undefined) book.title = String(title).trim();
  if (author !== undefined) book.author = String(author).trim();
  if (year !== undefined) book.year = Number(year) || null;
  if (synopsis !== undefined) book.synopsis = String(synopsis).trim();
  if (stock !== undefined) {
    const diff = Number(stock) - book.totalStock;
    book.totalStock = Math.max(0, Number(stock));
    book.stock = Math.max(0, book.stock + diff);
  }

  return ok(res, enrich(book));
}

/** DELETE /api/books/:id (admin only) */
async function remove(req, res, params) {
  const auth = getUserFromRequest(req);
  if (!auth) return fail(res, 401, 'Tidak terautentikasi');
  if (auth.user.role !== 'admin') return fail(res, 403, 'Hanya admin yang dapat menghapus buku');

  const id = Number(params.id);
  const idx = books.findIndex((b) => b.id === id);
  if (idx === -1) return fail(res, 404, 'Buku tidak ditemukan');

  books.splice(idx, 1);
  return ok(res, { message: 'Buku dihapus' });
}

module.exports = { list, getOne, create, update, remove };
