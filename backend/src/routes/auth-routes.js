'use strict';

const { ok, fail, readBody } = require('../http-helpers');
const { users, hashPassword, verifyPassword, nextUserId } = require('../db');
const { createToken, revokeToken, getUserFromRequest, publicUser } = require('../auth');

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * POST /api/auth/register
 * body: { name, email, password }
 */
async function register(req, res) {
  let body;
  try {
    body = await readBody(req);
  } catch (e) {
    return fail(res, 400, e.message);
  }

  const { name, email, password } = body;
  if (!name || !email || !password) {
    return fail(res, 400, 'name, email, dan password wajib diisi');
  }
  if (!EMAIL_RE.test(email)) {
    return fail(res, 400, 'Format email tidak valid');
  }
  if (String(password).length < 6) {
    return fail(res, 400, 'Password minimal 6 karakter');
  }
  if (users.some((u) => u.email.toLowerCase() === String(email).toLowerCase())) {
    return fail(res, 409, 'Email sudah terdaftar');
  }

  const { salt, hash } = hashPassword(password);
  const user = {
    id: nextUserId(),
    name,
    email,
    role: 'member',
    salt,
    hash,
    createdAt: new Date().toISOString(),
  };
  users.push(user);

  const token = createToken(user.id);
  return ok(res, { token, user: publicUser(user) }, 201);
}

/**
 * POST /api/auth/login
 * body: { email, password }
 */
async function login(req, res) {
  let body;
  try {
    body = await readBody(req);
  } catch (e) {
    return fail(res, 400, e.message);
  }

  const { email, password } = body;
  if (!email || !password) {
    return fail(res, 400, 'email dan password wajib diisi');
  }

  const user = users.find((u) => u.email.toLowerCase() === String(email).toLowerCase());
  if (!user || !verifyPassword(password, user.salt, user.hash)) {
    return fail(res, 401, 'Email atau password salah');
  }

  const token = createToken(user.id);
  return ok(res, { token, user: publicUser(user) });
}

/** POST /api/auth/logout */
async function logout(req, res) {
  const auth = getUserFromRequest(req);
  if (auth) revokeToken(auth.token);
  return ok(res, { message: 'Logout berhasil' });
}

/** GET /api/auth/me */
async function me(req, res) {
  const auth = getUserFromRequest(req);
  if (!auth) return fail(res, 401, 'Tidak terautentikasi');
  return ok(res, { user: publicUser(auth.user) });
}

module.exports = { register, login, logout, me };
