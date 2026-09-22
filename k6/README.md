# k6 Tests - Perpustakaan Digital

Load and end-to-end tests for the Perpustakaan Digital app, one scenario per file.

## Scenario 1 - Browser (Chromium) End-to-End

File: [`browser-e2e.js`](./browser-e2e.js)

A functional E2E test that drives the **real frontend** (nginx) which talks to
the **real backend**, exactly like a human using the app. It uses the k6
browser module (`k6/browser`) with headless Chromium.

**5 VUs, mapped 1:1 to 5 seeded accounts** (each VU runs one iteration):

| VU | Account            | Role   | Flow                                                              |
|----|--------------------|--------|-------------------------------------------------------------------|
| 1  | `admin@perpus.id`  | admin  | Admin: Kelola Data (Buku tambah+hapus, Kategori, Semua Peminjaman) |
| 2  | `admin2@perpus.id` | admin  | Admin flow                                                        |
| 3  | `budi@perpus.id`   | member | Member: login → katalog → pinjam → my-loans → kembalikan → logout |
| 4  | `siti@perpus.id`   | member | Member flow                                                       |
| 5  | `andi@perpus.id`   | member | Member flow                                                       |

The account is chosen deterministically by `exec.vu.idInTest`, so every seeded
account is exercised exactly once (index 0/1 = admins, 2/3/4 = members).

### Seeded credentials

These are seeded in `backend/src/db.js` (test data, known passwords):

| Email              | Password   | Role   |
|--------------------|------------|--------|
| `admin@perpus.id`  | `admin123` | admin  |
| `admin2@perpus.id` | `admin123` | admin  |
| `budi@perpus.id`   | `budi123`  | member |
| `siti@perpus.id`   | `siti123`  | member |
| `andi@perpus.id`   | `andi123`  | member |

### Member flow steps

1. `login.html` → type email/password, click `#loginBtn`, wait for navigation, assert URL contains `index`.
2. Catalog: wait for `.book-card`, assert at least one card rendered.
3. Click the first `.borrow-btn`, confirm via the custom dialog (`.modal-overlay.show .confirm-dialog button[data-role="confirm"]`), assert a `.toast.toast-success` appears.
4. `my-loans.html`: wait for a loan row, assert a `.badge-borrowed` (status "Dipinjam") exists.
5. Click `.return-btn`, confirm the dialog, assert success toast.
6. Logout via the navbar `#logoutBtn` ("Keluar"), wait for navigation, assert URL returns to `login`.

### Admin flow steps

1. Login (same as above), then navigate to `admin.html`.
2. **Buku** tab: `#addBookBtn` opens `#bookModal`; fill `#bookTitle`, `#bookAuthor`, `#bookCategory`, `#bookYear`, `#bookStock`; submit `#saveBookBtn`; assert the new row appears in `#booksBody`; then delete it via `.del-book-btn` + confirm dialog.
3. **Kategori** tab (`.tab-btn[data-tab="categories"]`): add a name via `#newCategoryInput` + `#addCategoryBtn`; assert it appears in `#categoriesBody`.
4. **Semua Peminjaman** tab (`.tab-btn[data-tab="loans"]`): assert `#loansBody` / `#tab-loans` renders.
5. Logout.

### Threshold / gating

`thresholds: { checks: ['rate>0.9'] }` — if the flow breaks, checks fail and k6
exits non-zero, which fails the Azure pipeline stage.

## Running locally

1. Start the app from the repo root (frontend at `http://localhost:5500`, backend at `http://localhost:4000`):

   ```bash
   docker compose up -d --build
   # wait until the backend is healthy:
   curl -fsS http://localhost:4000/api/health
   ```

2. Run the browser test with the k6 image that bundles Chromium:

   ```bash
   docker run --rm --network host \
     -e BASE_URL=http://localhost:5500 \
     -e K6_BROWSER_HEADLESS=true \
     -e K6_BROWSER_ARGS=no-sandbox \
     -v "$PWD":/work -w /work \
     grafana/k6:latest-with-browser \
     run k6/browser-e2e.js
   ```

   Or, with a locally installed k6 that has browser support:

   ```bash
   BASE_URL=http://localhost:5500 K6_BROWSER_HEADLESS=true \
     k6 run k6/browser-e2e.js
   ```

   `BASE_URL` defaults to `http://localhost:5500` if not set.

3. Tear down:

   ```bash
   docker compose down -v
   ```

## Azure DevOps

The pipeline [`azure-pipelines-scenario1.yml`](../azure-pipelines-scenario1.yml)
(at the repo root) automates the above: `docker compose up` → wait for backend
health → run the k6 with-browser docker image (`--network host`, headless,
no-sandbox, `BASE_URL`) → publish `k6-scenario1-summary.json` as an artifact →
`docker compose down -v`.

Keep one pipeline file per scenario; duplicate this file for scenario 2 (HTTP
load/stress/perf tests) and swap the script + image.
