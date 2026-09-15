# Perpustakaan Digital — Backend API

Backend REST API untuk aplikasi Perpustakaan Buku. Dibangun murni menggunakan
modul bawaan Node.js (`http`, `crypto`, `url`) — **tanpa dependency eksternal**,
jadi tidak perlu `npm install`.

## Menjalankan

```bash
cd backend
npm start
# atau
node src/server.js
```

Secara default server berjalan di `http://localhost:4000`. Untuk mengubah port:

```bash
PORT=5000 node src/server.js
```

## Struktur Proyek

```
backend/
├── package.json
└── src/
    ├── server.js          # entrypoint HTTP server
    ├── router.js          # routing manual berbasis pattern matching
    ├── auth.js            # pembuatan & validasi token sesi
    ├── db.js              # "database" in-memory + data awal (seed)
    ├── http-helpers.js    # helper response JSON & parsing body
    └── routes/
        ├── auth-routes.js
        ├── book-routes.js
        ├── category-routes.js
        └── loan-routes.js
```

> Catatan: data disimpan di memori (in-memory) dan akan reset setiap kali
> server di-restart. Untuk produksi, ganti `db.js` dengan koneksi ke database
> sungguhan (PostgreSQL, MySQL, MongoDB, dll).

## Akun Demo

| Role   | Email             | Password  |
|--------|-------------------|-----------|
| Admin  | admin@perpus.id   | admin123  |
| Member | budi@perpus.id    | budi123   |

## Daftar Endpoint API

Semua response berbentuk `{ success: boolean, data?: ..., message?: ... }`.
Endpoint yang memerlukan login mengharapkan header `Authorization: Bearer <token>`.

### Auth
| Method | Endpoint             | Auth | Deskripsi                       |
|--------|----------------------|------|----------------------------------|
| POST   | `/api/auth/register`  | ❌   | Daftar akun anggota baru        |
| POST   | `/api/auth/login`     | ❌   | Login, mengembalikan token      |
| POST   | `/api/auth/logout`    | ✅   | Logout / revoke token           |
| GET    | `/api/auth/me`        | ✅   | Info user yang sedang login     |

### Kategori
| Method | Endpoint               | Auth        | Deskripsi                  |
|--------|-------------------------|-------------|------------------------------|
| GET    | `/api/categories`       | ❌          | Daftar semua kategori       |
| POST   | `/api/categories`       | ✅ admin    | Tambah kategori baru        |
| DELETE | `/api/categories/:id`   | ✅ admin    | Hapus kategori              |

### Buku
| Method | Endpoint          | Auth        | Deskripsi                                            |
|--------|-------------------|-------------|-------------------------------------------------------|
| GET    | `/api/books`       | ❌          | Daftar buku (`?search=&categoryId=&page=&pageSize=`) |
| GET    | `/api/books/:id`   | ❌          | Detail satu buku                                      |
| POST   | `/api/books`       | ✅ admin    | Tambah buku baru                                      |
| PUT    | `/api/books/:id`   | ✅ admin    | Ubah data buku                                        |
| DELETE | `/api/books/:id`   | ✅ admin    | Hapus buku                                            |

### Peminjaman
| Method | Endpoint                  | Auth   | Deskripsi                                              |
|--------|----------------------------|--------|-----------------------------------------------------------|
| GET    | `/api/loans`               | ✅     | Daftar peminjaman (admin: semua, member: milik sendiri)  |
| POST   | `/api/loans`                | ✅     | Pinjam buku — body `{ bookId }`                          |
| POST   | `/api/loans/:id/return`     | ✅     | Kembalikan buku yang dipinjam                            |

### Kesehatan Server
| Method | Endpoint       | Auth | Deskripsi          |
|--------|----------------|------|---------------------|
| GET    | `/api/health`  | ❌   | Cek status server   |

## Contoh cURL

```bash
# Login sebagai admin
curl -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@perpus.id","password":"admin123"}'

# Ambil daftar buku
curl http://localhost:4000/api/books

# Pinjam buku (butuh token dari hasil login)
curl -X POST http://localhost:4000/api/loans \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <TOKEN>" \
  -d '{"bookId": 1}'
```
