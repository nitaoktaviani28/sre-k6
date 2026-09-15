# Perpustakaan Digital — Frontend

Frontend aplikasi Perpustakaan Buku. Dibangun dengan **HTML, CSS, dan
JavaScript murni (vanilla)** — tanpa framework maupun proses build — dengan
tema warna **biru muda & putih** yang profesional.

## Menjalankan

Frontend ini adalah kumpulan file statis. Jalankan dengan server statis
sederhana, misalnya:

```bash
cd frontend
npx serve .
# atau
python3 -m http.server 5500
```

Lalu buka `http://localhost:5500` (atau port yang ditampilkan) di browser.

> Pastikan **backend** sudah berjalan di `http://localhost:4000` (lihat
> `../backend/README.md`). Jika backend berjalan di host/port lain, jalankan
> baris berikut di console browser sebelum memuat halaman, atau ubah
> `assets/js/config.js`:
>
> ```js
> localStorage.setItem('perpus_api_base_url', 'http://localhost:5000/api');
> ```

## Struktur Halaman

| Halaman           | Deskripsi                                                    |
|--------------------|----------------------------------------------------------------|
| `login.html`       | Halaman login (tombol **Masuk**)                                |
| `register.html`    | Halaman pendaftaran anggota baru                                |
| `index.html`       | Katalog buku: cari, filter kategori, pinjam buku                |
| `my-loans.html`    | Riwayat & status peminjaman milik pengguna, tombol kembalikan   |
| `admin.html`       | Panel admin: kelola buku, kategori, dan lihat semua peminjaman  |

## Struktur Aset

```
frontend/
├── login.html
├── register.html
├── index.html
├── my-loans.html
├── admin.html
└── assets/
    ├── css/
    │   └── style.css      # tema biru muda & putih
    └── js/
        ├── config.js      # konfigurasi API_BASE_URL
        ├── api.js         # helper Auth + panggilan Api ke backend
        └── nav.js         # navbar bersama antar halaman
```

## Akun Demo

| Role   | Email             | Password  |
|--------|-------------------|-----------|
| Admin  | admin@perpus.id   | admin123  |
| Member | budi@perpus.id    | budi123   |

Login sebagai **admin** untuk mengakses menu **Kelola Data** (tambah/ubah/hapus
buku & kategori). Login sebagai **member** untuk meminjam dan mengembalikan buku.
