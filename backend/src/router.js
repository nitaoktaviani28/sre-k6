'use strict';

const { URL } = require('url');
const { fail } = require('./http-helpers');

const authRoutes = require('./routes/auth-routes');
const categoryRoutes = require('./routes/category-routes');
const bookRoutes = require('./routes/book-routes');
const loanRoutes = require('./routes/loan-routes');

/**
 * Route table. Each entry: [METHOD, pathPattern, handler]
 * pathPattern segments starting with ':' are treated as params.
 */
const routes = [
  ['GET', '/api/health', async (req, res) => {
    const { ok } = require('./http-helpers');
    ok(res, { status: 'up', timestamp: new Date().toISOString() });
  }],

  // Auth
  ['POST', '/api/auth/register', authRoutes.register],
  ['POST', '/api/auth/login', authRoutes.login],
  ['POST', '/api/auth/logout', authRoutes.logout],
  ['GET', '/api/auth/me', authRoutes.me],

  // Categories
  ['GET', '/api/categories', categoryRoutes.list],
  ['POST', '/api/categories', categoryRoutes.create],
  ['DELETE', '/api/categories/:id', categoryRoutes.remove],

  // Books
  ['GET', '/api/books', bookRoutes.list],
  ['GET', '/api/books/:id', bookRoutes.getOne],
  ['POST', '/api/books', bookRoutes.create],
  ['PUT', '/api/books/:id', bookRoutes.update],
  ['DELETE', '/api/books/:id', bookRoutes.remove],

  // Loans
  ['GET', '/api/loans', loanRoutes.list],
  ['POST', '/api/loans', loanRoutes.create],
  ['POST', '/api/loans/:id/return', loanRoutes.returnLoan],
];

function matchPath(pattern, pathname) {
  const patternParts = pattern.split('/').filter(Boolean);
  const pathParts = pathname.split('/').filter(Boolean);
  if (patternParts.length !== pathParts.length) return null;

  const params = {};
  for (let i = 0; i < patternParts.length; i++) {
    const p = patternParts[i];
    const v = pathParts[i];
    if (p.startsWith(':')) {
      params[p.slice(1)] = decodeURIComponent(v);
    } else if (p !== v) {
      return null;
    }
  }
  return params;
}

async function handleRequest(req, res) {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    });
    return res.end();
  }

  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const query = Object.fromEntries(url.searchParams.entries());

  for (const [method, pattern, handler] of routes) {
    if (method !== req.method) continue;
    const params = matchPath(pattern, url.pathname);
    if (params) {
      try {
        return await handler(req, res, params, query);
      } catch (err) {
        console.error('Unhandled route error:', err);
        return fail(res, 500, 'Terjadi kesalahan pada server', err.message);
      }
    }
  }

  return fail(res, 404, `Route ${req.method} ${url.pathname} tidak ditemukan`);
}

module.exports = { handleRequest };
