'use strict';

const crypto = require('crypto');
const { users, tokens } = require('./db');

const TOKEN_TTL_MS = 1000 * 60 * 60 * 8; // 8 hours

function createToken(userId) {
  const token = crypto.randomBytes(32).toString('hex');
  tokens.set(token, { userId, expiresAt: Date.now() + TOKEN_TTL_MS });
  return token;
}

function revokeToken(token) {
  tokens.delete(token);
}

function getUserFromRequest(req) {
  const header = req.headers['authorization'] || '';
  const [scheme, token] = header.split(' ');
  if (scheme !== 'Bearer' || !token) return null;

  const entry = tokens.get(token);
  if (!entry) return null;
  if (entry.expiresAt < Date.now()) {
    tokens.delete(token);
    return null;
  }

  const user = users.find((u) => u.id === entry.userId);
  return user ? { user, token } : null;
}

function publicUser(user) {
  return { id: user.id, name: user.name, email: user.email, role: user.role, createdAt: user.createdAt };
}

module.exports = { createToken, revokeToken, getUserFromRequest, publicUser };
