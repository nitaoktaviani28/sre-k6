# CI/CD Pipeline — Perpustakaan Digital

Pipeline ini dijalankan lewat **GitHub Actions** dan terdiri dari 3 tahap:

```
build  →  push (ke Docker registry)  →  deploy (ke VM via SSH + docker compose)
```

File workflow: [`.github/workflows/ci-cd.yml`](../.github/workflows/ci-cd.yml)

## Kapan pipeline berjalan

| Event | Job yang berjalan |
|---|---|
| Pull Request ke `main` | `build` saja (build image + smoke test, **tidak** push/deploy) |
| Push ke `main` (misal setelah PR di-merge) | `build` → `push` → `deploy` |
| Manual (`workflow_dispatch`) | `build` saja (kecuali push ke `main`) |

Ini memastikan setiap PR diuji dulu (image bisa dibangun & backend bisa start),
sementara push/deploy ke registry & VM hanya terjadi setelah kode benar-benar
masuk ke `main`.

## Tahapan detail

### 1. `build`
- Build image `backend` dan `frontend` dari masing-masing `Dockerfile`
- Jalankan container backend sebentar dan cek `GET /api/health` (smoke test)

### 2. `push`
- Login ke Docker registry
- Build ulang & push image dengan 2 tag: `<git-sha>` dan `latest`

### 3. `deploy`
- Copy `docker-compose.prod.yml` ke VM tujuan lewat SCP
- SSH ke VM, tulis file `.env` berisi info image & tag terbaru
- `docker login` di VM, lalu `docker compose pull` + `docker compose up -d`
- Bersihkan image lama yang tidak terpakai (`docker image prune -f`)

VM tujuan **harus sudah punya Docker & Docker Compose terinstall** (sesuai
informasi yang diberikan) — pipeline ini tidak melakukan instalasi Docker di VM.

## Konfigurasi yang wajib dibuat di GitHub

Buka **Settings → Secrets and variables → Actions → Variables tab → New
repository variable**, lalu buat variable berikut:

| Nama Variable | Contoh nilai | Keterangan |
|---|---|---|
| `DOCKER_REGISTRY` | `docker.io` | Bisa juga `ghcr.io` untuk GitHub Container Registry |
| `DOCKER_USERNAME` | `namauser` | Username akun registry |
| `DOCKER_PASSWORD` | `xxxxxxxx` | Password atau access token registry |
| `DOCKER_IMAGE_BACKEND` | `namauser/perpustakaan-backend` | Nama image backend (tanpa tag) |
| `DOCKER_IMAGE_FRONTEND` | `namauser/perpustakaan-frontend` | Nama image frontend (tanpa tag) |
| `VM_HOST` | `203.0.113.10` | IP/hostname VM tujuan deploy |
| `VM_USER` | `deploy` | Username SSH di VM |
| `VM_SSH_PRIVATE_KEY` | `-----BEGIN OPENSSH PRIVATE KEY-----...` | Private key SSH (format PEM) untuk login ke VM |
| `VM_SSH_PORT` | `22` | (opsional) Port SSH, default 22 kalau tidak diisi |
| `VM_DEPLOY_PATH` | `/opt/perpustakaan` | Folder di VM tempat `docker-compose.prod.yml` disimpan & dijalankan |

> **Catatan penting soal keamanan.** Anda meminta kredensial dibuat sebagai
> **Variables**, bukan **Secrets** — ini sudah diikuti pada workflow ini.
> Namun perlu diketahui bahwa GitHub Actions **Variables tidak dienkripsi**
> dan **tidak otomatis di-mask** di log workflow (nilainya bisa terlihat plain
> text kalau ada langkah yang mencetaknya). Untuk data sensitif seperti
> `DOCKER_PASSWORD` dan `VM_SSH_PRIVATE_KEY`, sangat disarankan pindah ke tab
> **Secrets** (bentuknya sama, tinggal ganti `vars.NAMA` jadi `secrets.NAMA`
> di file workflow) supaya nilainya otomatis di-mask dan dienkripsi at-rest.
> Silakan beri tahu saya kapan saja jika ingin saya migrasikan ke Secrets.

## Persiapan di sisi VM

1. Pastikan Docker & Docker Compose plugin sudah terinstall (sesuai info,
   sudah ada).
2. Buat folder deploy, contoh:
   ```bash
   sudo mkdir -p /opt/perpustakaan
   sudo chown $USER:$USER /opt/perpustakaan
   ```
3. Buat user/akses SSH khusus deploy (opsional tapi disarankan), lalu daftarkan
   public key-nya di `~/.ssh/authorized_keys` VM tersebut, dan simpan private
   key-nya ke variable `VM_SSH_PRIVATE_KEY`.
4. Pastikan port yang dipetakan container (`4000` untuk backend, `5500` untuk
   frontend) terbuka di firewall/security group VM.

## Menjalankan deploy pertama kali secara manual (opsional)

Sebelum mengandalkan pipeline, Anda bisa uji `docker-compose.prod.yml` secara
manual di VM untuk memastikan image bisa di-pull & berjalan:

```bash
cd /opt/perpustakaan
cat > .env <<EOF
DOCKER_REGISTRY=docker.io
DOCKER_IMAGE_BACKEND=namauser/perpustakaan-backend
DOCKER_IMAGE_FRONTEND=namauser/perpustakaan-frontend
IMAGE_TAG=latest
EOF

docker compose -f docker-compose.prod.yml --env-file .env pull
docker compose -f docker-compose.prod.yml --env-file .env up -d
```

## Diagram alur singkat

```
Developer push/merge ke main
        │
        ▼
 ┌─────────────┐
 │   build     │  build image backend & frontend, smoke test /api/health
 └──────┬──────┘
        ▼
 ┌─────────────┐
 │    push     │  docker login → build & push image (tag: sha & latest)
 └──────┬──────┘
        ▼
 ┌─────────────┐
 │   deploy    │  scp docker-compose.prod.yml → VM
 │             │  ssh: tulis .env → docker compose pull → up -d
 └─────────────┘
```
