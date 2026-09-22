// =========================================================
// SCENARIO 1 - Browser (Chromium) End-to-End UI test
// =========================================================
//
// Functional E2E test that drives the REAL frontend (nginx) which in turn
// talks to the REAL backend, mirroring how a human uses the app.
//
// 5 VUs are mapped 1:1 to 5 distinct seeded accounts:
//   VU 1  -> admin@perpus.id   (admin)   -> ADMIN flow
//   VU 2  -> admin2@perpus.id  (admin)   -> ADMIN flow
//   VU 3  -> budi@perpus.id    (member)  -> MEMBER flow
//   VU 4  -> siti@perpus.id    (member)  -> MEMBER flow
//   VU 5  -> andi@perpus.id    (member)  -> MEMBER flow
//
// The account is picked deterministically by exec.vu.idInTest so every seeded
// account is exercised exactly once.
//
// Run locally (app must be up, see k6/README.md):
//   docker run --rm --network host \
//     -e BASE_URL=http://localhost:5500 \
//     -e K6_BROWSER_HEADLESS=true -e K6_BROWSER_ARGS=no-sandbox \
//     -v "$PWD":/work -w /work grafana/k6:latest-with-browser \
//     run k6/browser-e2e.js
// =========================================================

import { browser } from 'k6/browser';
import { check, sleep, group } from 'k6';
import exec from 'k6/execution';

// BASE_URL is configurable so the same script runs locally and in the pipeline.
const BASE_URL = __ENV.BASE_URL || 'http://localhost:5500';

// The 5 seeded accounts, indexed by VU id (idInTest is 1-based).
// Order matters: index 0/1 = admins, index 2/3/4 = members.
const ACCOUNTS = [
  { email: 'admin@perpus.id', password: 'admin123', role: 'admin' },
  { email: 'admin2@perpus.id', password: 'admin123', role: 'admin' },
  { email: 'budi@perpus.id', password: 'budi123', role: 'member' },
  { email: 'siti@perpus.id', password: 'siti123', role: 'member' },
  { email: 'andi@perpus.id', password: 'andi123', role: 'member' },
];

export const options = {
  scenarios: {
    scenario1_browser_e2e: {
      executor: 'per-vu-iterations',
      vus: 5,
      iterations: 1, // one iteration per VU -> each account runs its flow once
      maxDuration: '3m',
      options: {
        browser: {
          type: 'chromium',
        },
      },
    },
  },
  // Functional gate: if the flow breaks, most checks fail and the run exits
  // non-zero, which fails the Azure pipeline stage.
  thresholds: {
    checks: ['rate>0.9'],
  },
};

// -----------------------------------------------------
// Helper: perform the shared login step on login.html
// -----------------------------------------------------
async function login(page, account) {
  await page.goto(`${BASE_URL}/login.html`);
  await page.locator('#email').type(account.email);
  await page.locator('#password').type(account.password);

  // Login submits the form and then navigates to index.html.
  await Promise.all([
    page.waitForNavigation(),
    page.locator('#loginBtn').click(),
  ]);

  const landedOnCatalog = page.url().includes('index');
  check(landedOnCatalog, {
    'login: landed on catalog (index)': (ok) => ok === true,
  });
  return landedOnCatalog;
}

// -----------------------------------------------------
// Helper: click a button inside the custom confirm dialog.
// api.js UI.confirm() injects `.modal-overlay.show > .confirm-dialog`
// with buttons `[data-role="confirm"]` and `[data-role="cancel"]`.
// -----------------------------------------------------
async function clickConfirmDialog(page) {
  const confirmBtn = page.locator('.modal-overlay.show .confirm-dialog button[data-role="confirm"]');
  await confirmBtn.waitFor({ state: 'visible' });
  await confirmBtn.click();
}

// -----------------------------------------------------
// MEMBER flow: login -> catalog -> borrow -> my-loans -> return -> logout
// -----------------------------------------------------
async function memberFlow(page, account) {
  await group('Login', async () => {
    await login(page, account);
  });
  sleep(1);

  await group('Katalog', async () => {
    // Catalog renders one .book-card per book.
    await page.locator('.book-card').first().waitFor({ state: 'visible' });
    const cardCount = await page.locator('.book-card').count();
    check(cardCount, {
      'katalog: minimal satu book card tampil': (c) => c > 0,
    });
  });
  sleep(1);

  await group('Pinjam', async () => {
    // Borrow the first available book. The click opens the custom confirm
    // dialog (NOT a native browser dialog); confirm it, then expect a toast.
    await page.locator('.borrow-btn').first().click();
    await clickConfirmDialog(page);

    const toast = page.locator('.toast.toast-success');
    await toast.waitFor({ state: 'visible' });
    const toastVisible = await toast.isVisible();
    check(toastVisible, {
      'pinjam: toast sukses muncul': (ok) => ok === true,
    });
  });
  sleep(1);

  await group('Peminjaman Saya', async () => {
    await page.goto(`${BASE_URL}/my-loans.html`);
    // Wait for the borrowed-status badge to render in the loans table.
    await page.locator('#loansBody tr').first().waitFor({ state: 'visible' });
    const borrowedCount = await page.locator('.badge-borrowed').count();
    check(borrowedCount, {
      'my-loans: ada peminjaman berstatus Dipinjam': (c) => c > 0,
    });
  });
  sleep(1);

  await group('Kembalikan', async () => {
    // Return the just-borrowed book via the same custom confirm dialog.
    await page.locator('.return-btn').first().click();
    await clickConfirmDialog(page);

    const toast = page.locator('.toast.toast-success');
    await toast.waitFor({ state: 'visible' });
    const toastVisible = await toast.isVisible();
    check(toastVisible, {
      'kembalikan: toast sukses muncul': (ok) => ok === true,
    });
  });
  sleep(1);

  await group('Logout', async () => {
    // The shared navbar (nav.js) renders a "Keluar" button with id #logoutBtn.
    await Promise.all([
      page.waitForNavigation(),
      page.locator('#logoutBtn').click(),
    ]);
    check(page.url().includes('login'), {
      'logout: kembali ke halaman login': (ok) => ok === true,
    });
  });
}

// -----------------------------------------------------
// ADMIN flow: login -> admin.html -> Buku / Kategori / Peminjaman tabs
// -----------------------------------------------------
async function adminFlow(page, account) {
  await group('Login', async () => {
    await login(page, account);
  });
  sleep(1);

  await group('Buka Kelola Data', async () => {
    // Admins land on index.html after login; navigate to the admin panel.
    await page.goto(`${BASE_URL}/admin.html`);
    await page.locator('#booksBody tr').first().waitFor({ state: 'visible' });
    const adminReady = await page.locator('#addBookBtn').isVisible();
    check(adminReady, {
      'admin: panel kelola data terbuka': (ok) => ok === true,
    });
  });
  sleep(1);

  // Unique title so we can assert the new row appears.
  const newTitle = `Buku Uji VU${exec.vu.idInTest}-${Date.now()}`;

  await group('Tab Buku - Tambah Buku', async () => {
    await page.locator('#addBookBtn').click();
    // Modal #bookModal opens (gets .show).
    await page.locator('#bookModal.show #bookTitle').waitFor({ state: 'visible' });

    await page.locator('#bookTitle').type(newTitle);
    await page.locator('#bookAuthor').type('Penulis Uji');

    // Pick the first real category option value from the select.
    const firstCategoryValue = await page.locator('#bookCategory option').first().getAttribute('value');
    await page.locator('#bookCategory').selectOption(firstCategoryValue);

    await page.locator('#bookYear').type('2024');
    await page.locator('#bookStock').type('3');

    // Create has NO confirm dialog; submit the form directly.
    await page.locator('#saveBookBtn').click();

    // The new book row should appear in #booksBody.
    await page.locator(`#booksBody tr:has-text("${newTitle}")`).waitFor({ state: 'visible' });
    const rowCount = await page.locator(`#booksBody tr:has-text("${newTitle}")`).count();
    check(rowCount, {
      'admin: buku baru muncul di tabel': (c) => c > 0,
    });
  });
  sleep(1);

  await group('Tab Buku - Hapus Buku (confirm dialog)', async () => {
    // Delete the just-created book to exercise the custom confirm dialog.
    // Guard with an existence check so the flow stays robust.
    const row = page.locator(`#booksBody tr:has-text("${newTitle}")`);
    const exists = (await row.count()) > 0;
    if (exists) {
      await row.locator('.del-book-btn').first().click();
      await clickConfirmDialog(page);
      const toast = page.locator('.toast.toast-success');
      await toast.waitFor({ state: 'visible' });
      const toastVisible = await toast.isVisible();
      check(toastVisible, {
        'admin: hapus buku toast sukses': (ok) => ok === true,
      });
    }
  });
  sleep(1);

  await group('Tab Kategori - Tambah Kategori', async () => {
    await page.locator('.tab-btn[data-tab="categories"]').click();
    await page.locator('#newCategoryInput').waitFor({ state: 'visible' });

    const newCategory = `Kategori Uji VU${exec.vu.idInTest}-${Date.now()}`;
    await page.locator('#newCategoryInput').type(newCategory);
    await page.locator('#addCategoryBtn').click();

    await page.locator(`#categoriesBody tr:has-text("${newCategory}")`).waitFor({ state: 'visible' });
    const catRowCount = await page.locator(`#categoriesBody tr:has-text("${newCategory}")`).count();
    check(catRowCount, {
      'admin: kategori baru muncul di tabel': (c) => c > 0,
    });
  });
  sleep(1);

  await group('Tab Semua Peminjaman', async () => {
    // Clicking this tab triggers loadLoans(); assert the table body renders.
    await page.locator('.tab-btn[data-tab="loans"]').click();
    await page.locator('#loansBody').waitFor({ state: 'attached' });
    const loansBodyVisible = await page.locator('#tab-loans').isVisible();
    check(loansBodyVisible, {
      'admin: tab semua peminjaman terbuka': (ok) => ok === true,
    });
  });
  sleep(1);

  await group('Logout', async () => {
    await Promise.all([
      page.waitForNavigation(),
      page.locator('#logoutBtn').click(),
    ]);
    check(page.url().includes('login'), {
      'logout: kembali ke halaman login': (ok) => ok === true,
    });
  });
}

export default async function () {
  // idInTest is 1-based; map VU -> account index (0-based).
  const idx = (exec.vu.idInTest - 1) % ACCOUNTS.length;
  const account = ACCOUNTS[idx];

  const page = await browser.newPage();
  try {
    if (account.role === 'admin') {
      await adminFlow(page, account);
    } else {
      await memberFlow(page, account);
    }
  } finally {
    await page.close();
  }
}
