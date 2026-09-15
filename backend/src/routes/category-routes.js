'use strict';

const { ok, fail, readBody } = require('../http-helpers');
const { categories, books, nextCategoryId } = require('../db');
const { getUserFromRequest } = require('../auth');

/** GET /api/categories */
async function list(req, res) {
  const withCount = categories.map((c) => ({
    ...c,
    bookCount: books.filter((b) => b.categoryId === c.id).length,
  }));
  return ok(res, withCount);
}

/** POST /api/categories  (admin only) */
async function create(req, res) {
  const auth = getUserFromRequest(req);
  if (!auth) return fail(res, 401, 'Tidak terautentikasi');
  if (auth.user.role !== 'admin') return fail(res, 403, 'Hanya admin yang dapat menambah kategori');

  let body;
  try {
    body = await readBody(req);
  } catch (e) {
    return fail(res, 400, e.message);
  }

  const { name } = body;
  if (!name || !String(name).trim()) return fail(res, 400, 'Nama kategori wajib diisi');
  if (categories.some((c) => c.name.toLowerCase() === String(name).toLowerCase())) {
    return fail(res, 409, 'Kategori sudah ada');
  }

  const category = { id: nextCategoryId(), name: String(name).trim() };
  categories.push(category);
  return ok(res, category, 201);
}

/** DELETE /api/categories/:id (admin only) */
async function remove(req, res, params) {
  const auth = getUserFromRequest(req);
  if (!auth) return fail(res, 401, 'Tidak terautentikasi');
  if (auth.user.role !== 'admin') return fail(res, 403, 'Hanya admin yang dapat menghapus kategori');

  const id = Number(params.id);
  const idx = categories.findIndex((c) => c.id === id);
  if (idx === -1) return fail(res, 404, 'Kategori tidak ditemukan');

  if (books.some((b) => b.categoryId === id)) {
    return fail(res, 409, 'Kategori masih memiliki buku, tidak dapat dihapus');
  }

  categories.splice(idx, 1);
  return ok(res, { message: 'Kategori dihapus' });
}

module.exports = { list, create, remove };
