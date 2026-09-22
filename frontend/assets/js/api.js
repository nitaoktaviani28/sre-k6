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

/* =========================================================
   Shared UI helpers (monochrome, self-contained, no network)
   Ditambahkan untuk redesign: bookCoverSvg + UI.toast + UI.confirm.
   Tidak mengubah Auth/Api/apiRequest yang sudah ada.
   ========================================================= */

/**
 * Escape untuk konteks HTML. Didefinisikan lokal di sini agar helper UI
 * tetap bekerja di halaman yang TIDAK memuat nav.js (login/register).
 */
function escapeHtmlAttr(str) {
  return String(str == null ? '' : str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Menghasilkan data-URI SVG sampul buku monokrom (hitam/putih/abu) yang
 * dibuat deterministik dari data buku (judul + penulis). Tidak butuh jaringan.
 * @param {{title?:string, author?:string, id?:(number|string)}} book
 * @returns {string} data:image/svg+xml,... siap dipakai sebagai src <img>.
 */
function bookCoverSvg(book) {
  book = book || {};
  const title = String(book.title || 'Tanpa Judul');
  const author = String(book.author || '');

  // Inisial: sampai 2 huruf dari kata-kata judul.
  const initials = title
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w.charAt(0).toUpperCase())
    .join('') || 'B';

  // Nada abu deterministik dari judul+penulis (tetap gelap agar teks putih terbaca).
  const seedStr = `${title}|${author}`;
  let hash = 0;
  for (let i = 0; i < seedStr.length; i++) {
    hash = (hash * 31 + seedStr.charCodeAt(i)) & 0xffffffff;
  }
  const shade = 17 + (Math.abs(hash) % 46); // 17..62 -> abu gelap
  const bg = `rgb(${shade},${shade},${shade})`;
  const accent = `rgb(${Math.min(shade + 90, 235)},${Math.min(shade + 90, 235)},${Math.min(
    shade + 90,
    235
  )})`;

  // Potong judul agar muat.
  const shortTitle = title.length > 42 ? title.slice(0, 39) + '...' : title;
  const shortAuthor = author.length > 34 ? author.slice(0, 31) + '...' : author;

  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="300" height="420" viewBox="0 0 300 420">` +
    `<rect width="300" height="420" fill="${bg}"/>` +
    `<rect x="14" y="14" width="272" height="392" fill="none" stroke="${accent}" stroke-width="2"/>` +
    `<line x1="34" y1="150" x2="266" y2="150" stroke="${accent}" stroke-width="1"/>` +
    `<text x="150" y="112" text-anchor="middle" font-family="Georgia, serif" font-size="88" font-weight="700" fill="#ffffff">${escapeHtmlAttr(
      initials
    )}</text>` +
    `<text x="150" y="200" text-anchor="middle" font-family="Georgia, serif" font-size="20" font-weight="700" fill="#ffffff">${escapeHtmlAttr(
      shortTitle
    )}</text>` +
    `<text x="150" y="240" text-anchor="middle" font-family="Georgia, serif" font-size="14" fill="${accent}">${escapeHtmlAttr(
      shortAuthor
    )}</text>` +
    `</svg>`;

  return 'data:image/svg+xml,' + encodeURIComponent(svg);
}

const UI = {
  _toastContainer: null,
  // Jumlah dialog konfirmasi yang sedang terbuka. Dipakai agar keydown global
  // (Enter/Escape) hanya memengaruhi dialog paling atas/terbaru.
  _dialogCount: 0,

  /** Pastikan container toast tersedia (dibuat lazily). */
  _ensureToastContainer() {
    if (!this._toastContainer || !document.body.contains(this._toastContainer)) {
      let c = document.querySelector('.toast-container');
      if (!c) {
        c = document.createElement('div');
        c.className = 'toast-container';
        document.body.appendChild(c);
      }
      this._toastContainer = c;
    }
    return this._toastContainer;
  },

  /**
   * Menampilkan notifikasi sementara (monokrom).
   * @param {string} message
   * @param {'success'|'error'} [type='success']
   */
  toast(message, type = 'success') {
    const container = this._ensureToastContainer();
    const el = document.createElement('div');
    el.className = 'toast toast-' + (type === 'error' ? 'error' : 'success');
    el.textContent = String(message == null ? '' : message);
    container.appendChild(el);

    // Trigger transisi masuk.
    requestAnimationFrame(() => el.classList.add('show'));

    const remove = () => {
      el.classList.remove('show');
      setTimeout(() => {
        if (el.parentNode) el.parentNode.removeChild(el);
      }, 250);
    };
    setTimeout(remove, 3200);
  },

  /**
   * Dialog konfirmasi monokrom. Menyuntikkan overlay ke document.body sehingga
   * bekerja di semua halaman tanpa HTML tambahan.
   * @param {{title?:string, message?:string, confirmText?:string, cancelText?:string}} [opts]
   * @returns {Promise<boolean>} resolve true hanya jika pengguna menekan konfirmasi.
   */
  confirm(opts = {}) {
    const title = opts.title || 'Konfirmasi';
    const message = opts.message || 'Apakah Anda yakin?';
    const confirmText = opts.confirmText || 'Ya, lanjutkan';
    const cancelText = opts.cancelText || 'Batal';

    return new Promise((resolve) => {
      const overlay = document.createElement('div');
      overlay.className = 'modal-overlay';
      overlay.innerHTML =
        `<div class="confirm-dialog" role="dialog" aria-modal="true">` +
        `<h2>${escapeHtmlAttr(title)}</h2>` +
        `<p>${escapeHtmlAttr(message)}</p>` +
        `<div class="modal-actions">` +
        `<button type="button" class="btn btn-outline" data-role="cancel">${escapeHtmlAttr(
          cancelText
        )}</button>` +
        `<button type="button" class="btn btn-primary" data-role="confirm">${escapeHtmlAttr(
          confirmText
        )}</button>` +
        `</div></div>`;

      document.body.appendChild(overlay);
      // Setiap dialog punya nomor urut; hanya yang terbaru (paling atas) yang
      // boleh merespons Enter/Escape global agar dialog bertumpuk tidak ikut.
      UI._dialogCount += 1;
      const dialogLevel = UI._dialogCount;
      // Force reflow lalu tampilkan.
      requestAnimationFrame(() => overlay.classList.add('show'));

      let settled = false;
      const cleanup = (result) => {
        if (settled) return;
        settled = true;
        UI._dialogCount -= 1;
        overlay.classList.remove('show');
        document.removeEventListener('keydown', onKey);
        setTimeout(() => {
          if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
        }, 200);
        resolve(result);
      };

      const onKey = (e) => {
        // Abaikan jika ada dialog lain yang lebih baru terbuka di atas dialog ini.
        if (dialogLevel !== UI._dialogCount) return;
        if (e.key === 'Escape') cleanup(false);
        else if (e.key === 'Enter') cleanup(true);
      };
      document.addEventListener('keydown', onKey);

      overlay.addEventListener('click', (e) => {
        const role = e.target && e.target.getAttribute && e.target.getAttribute('data-role');
        if (role === 'confirm') cleanup(true);
        else if (role === 'cancel') cleanup(false);
        else if (e.target === overlay) cleanup(false);
      });

      const confirmBtn = overlay.querySelector('[data-role="confirm"]');
      if (confirmBtn) confirmBtn.focus();
    });
  },
};
