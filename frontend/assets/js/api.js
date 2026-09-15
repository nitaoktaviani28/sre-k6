/**
 * Lapisan pemanggilan API ke backend Perpustakaan Digital.
 * Semua fungsi mengembalikan Promise yang resolve ke `data` (bagian sukses)
 * atau reject dengan Error berisi message dari server.
 */

const TOKEN_KEY = 'perpus_token';
const USER_KEY = 'perpus_user';

const Auth = {
  getToken() {
    return window.localStorage.getItem(TOKEN_KEY);
  },
  getUser() {
    const raw = window.localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  },
  setSession(token, user) {
    window.localStorage.setItem(TOKEN_KEY, token);
    window.localStorage.setItem(USER_KEY, JSON.stringify(user));
  },
  clearSession() {
    window.localStorage.removeItem(TOKEN_KEY);
    window.localStorage.removeItem(USER_KEY);
  },
  isLoggedIn() {
    return Boolean(this.getToken());
  },
  isAdmin() {
    const user = this.getUser();
    return Boolean(user && user.role === 'admin');
  },
  /** Redirect ke login.html jika belum login. Panggil di awal halaman yang butuh auth. */
  requireLogin() {
    if (!this.isLoggedIn()) {
      window.location.href = 'login.html';
    }
  },
  /** Redirect ke index.html jika bukan admin. */
  requireAdmin() {
    this.requireLogin();
    if (!this.isAdmin()) {
      window.location.href = 'index.html';
    }
  },
};

async function apiRequest(path, { method = 'GET', body, auth = true } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (auth) {
    const token = Auth.getToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;
  }

  let response;
  try {
    response = await fetch(`${window.APP_CONFIG.API_BASE_URL}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch (err) {
    throw new Error(
      'Tidak dapat terhubung ke server backend. Pastikan backend berjalan di ' +
        window.APP_CONFIG.API_BASE_URL
    );
  }

  let payload;
  try {
    payload = await response.json();
  } catch (err) {
    throw new Error('Respons server tidak valid');
  }

  if (!response.ok || !payload.success) {
    if (response.status === 401 && auth) {
      Auth.clearSession();
    }
    throw new Error(payload.message || 'Terjadi kesalahan');
  }

  return payload.data;
}

const Api = {
  // ---- Auth ----
  register(data) {
    return apiRequest('/auth/register', { method: 'POST', body: data, auth: false });
  },
  login(data) {
    return apiRequest('/auth/login', { method: 'POST', body: data, auth: false });
  },
  logout() {
    return apiRequest('/auth/logout', { method: 'POST' });
  },
  me() {
    return apiRequest('/auth/me');
  },

  // ---- Categories ----
  listCategories() {
    return apiRequest('/categories', { auth: false });
  },
  createCategory(data) {
    return apiRequest('/categories', { method: 'POST', body: data });
  },
  deleteCategory(id) {
    return apiRequest(`/categories/${id}`, { method: 'DELETE' });
  },

  // ---- Books ----
  listBooks(query = {}) {
    const params = new URLSearchParams(
      Object.entries(query).filter(([, v]) => v !== undefined && v !== '')
    );
    const qs = params.toString();
    return apiRequest(`/books${qs ? `?${qs}` : ''}`, { auth: false });
  },
  getBook(id) {
    return apiRequest(`/books/${id}`, { auth: false });
  },
  createBook(data) {
    return apiRequest('/books', { method: 'POST', body: data });
  },
  updateBook(id, data) {
    return apiRequest(`/books/${id}`, { method: 'PUT', body: data });
  },
  deleteBook(id) {
    return apiRequest(`/books/${id}`, { method: 'DELETE' });
  },

  // ---- Loans ----
  listLoans() {
    return apiRequest('/loans');
  },
  borrowBook(bookId) {
    return apiRequest('/loans', { method: 'POST', body: { bookId } });
  },
  returnLoan(id) {
    return apiRequest(`/loans/${id}/return`, { method: 'POST' });
  },
};
