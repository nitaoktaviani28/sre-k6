/**
 * Merender navbar bersama di semua halaman.
 * Membutuhkan sebuah elemen <div id="navbar"></div> di halaman
 * serta api.js dimuat sebelum file ini.
 */
function renderNavbar(activePage) {
  const mount = document.getElementById('navbar');
  if (!mount) return;

  Auth.requireLogin();

  const user = Auth.getUser();
  const isAdmin = Auth.isAdmin();

  const links = [
    { href: 'index.html', label: 'Katalog Buku', key: 'index' },
    { href: 'my-loans.html', label: 'Peminjaman Saya', key: 'my-loans', authOnly: true },
    { href: 'admin.html', label: 'Kelola Data', key: 'admin', adminOnly: true },
  ];

  const linksHtml = links
    .filter((l) => (!l.authOnly || user) && (!l.adminOnly || isAdmin))
    .map(
      (l) =>
        `<a href="${l.href}" class="${l.key === activePage ? 'active' : ''}">${l.label}</a>`
    )
    .join('');

  const rightHtml = user
    ? `
      <div class="nav-user">
        <span class="nav-user-name">Halo, <strong>${escapeHtml(user.name)}</strong> ${
          isAdmin ? '<span class="badge badge-admin">Admin</span>' : ''
        }</span>
        <button class="btn btn-outline btn-sm" id="logoutBtn">Keluar</button>
      </div>`
    : `<div class="nav-user"><a href="login.html" class="btn btn-primary btn-sm">Masuk</a></div>`;

  mount.innerHTML = `
    <div class="navbar-inner">
      <a href="index.html" class="brand" style="text-decoration:none;">
        <span class="brand-badge">📚</span>
        Perpustakaan Digital
      </a>
      <div class="nav-links">${linksHtml}</div>
      ${rightHtml}
    </div>
  `;

  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
      try {
        await Api.logout();
      } catch (e) {
        /* ignore network errors on logout */
      }
      Auth.clearSession();
      window.location.href = 'login.html';
    });
  }
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}
