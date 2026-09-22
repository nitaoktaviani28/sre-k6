# Perpustakaan Digital

Aplikasi Perpustakaan Buku sederhana dengan arsitektur **frontend & backend
terpisah** (bukan microservice) — satu backend REST API yang menyediakan
beberapa endpoint (buku, kategori, peminjaman, autentikasi), dan satu frontend
web dengan tema warna **hitam & putih (monokrom)** yang bersih dan profesional.

## Fitur Utama

- 🔐 **Login & Registrasi** anggota, dengan sesi berbasis token
- 📚 **Katalog buku** — cari, filter kategori, lihat sinopsis & ketersediaan stok
- 🔄 **Peminjaman & pengembalian buku** oleh anggota
- 🛠️ **Panel admin** — kelola buku, kelola kategori, pantau seluruh peminjaman
- 🎨 UI bertema hitam & putih (monokrom), responsif, tanpa framework

## Struktur Repo

```
sre-k6/
├── backend/     # REST API (Node.js murni, tanpa dependency eksternal)
│   └── README.md
└── frontend/    # Web app (HTML/CSS/JS vanilla)
    └── README.md
```

Lihat masing-masing README untuk detail cara menjalankan:
- [`backend/README.md`](backend/README.md) — cara menjalankan API & daftar endpoint
- [`frontend/README.md`](frontend/README.md) — cara menjalankan web app

## Menjalankan Cepat (Quick Start)

### Opsi 1 — Tanpa Docker

Buka **dua terminal**:

**Terminal 1 — Backend**
```bash
cd backend
node src/server.js
# Server berjalan di http://localhost:4000
```

**Terminal 2 — Frontend**
```bash
cd frontend
python3 -m http.server 5500
# Buka http://localhost:5500/login.html
```

### Opsi 2 — Dengan Docker

Setiap aplikasi (backend & frontend) memiliki `Dockerfile` masing-masing, dan
tersedia `docker-compose.yml` di root untuk menjalankan keduanya sekaligus.

```bash
docker compose up --build
```

- Backend API: `http://localhost:4000`
- Frontend: `http://localhost:5500/login.html`

Atau jalankan masing-masing secara manual:

```bash
# Backend
cd backend
docker build -t perpustakaan-backend .
docker run -p 4000:4000 perpustakaan-backend

# Frontend
cd frontend
docker build -t perpustakaan-frontend .
docker run -p 5500:80 perpustakaan-frontend
```

## Akun Demo

| Role   | Email             | Password  |
|--------|-------------------|-----------|
| Admin  | admin@perpus.id   | admin123  |
| Member | budi@perpus.id    | budi123   |

## CI/CD Pipeline

Repo ini memiliki GitHub Actions pipeline (`.github/workflows/ci-cd.yml`) yang
otomatis **build → push image ke Docker registry → deploy ke VM** setiap ada
push ke `main`. Lihat dokumentasi lengkap & daftar variable yang perlu
dikonfigurasi di [`docs/CI-CD.md`](docs/CI-CD.md).

## Teknologi

- **Backend:** Node.js (modul bawaan `http`, `crypto`, `url` — tanpa framework/dependency eksternal)
- **Frontend:** HTML5, CSS3, JavaScript (vanilla, tanpa build tool)
- **Autentikasi:** Token sesi (mirip Bearer token), password di-hash dengan PBKDF2
- **Data:** In-memory (reset saat server direstart) — mudah diganti ke database sungguhan
