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
- Build ulang & push image, masing-masing dengan **satu tag: `<git-sha>`**
  (contoh: `namauser/perpustakaan-backend:a1b2c3d...`). Tag ini selalu unik
  dan berubah setiap ada commit/build baru — tidak memakai tag `latest`,
  supaya jelas versi mana yang sedang berjalan di VM.

### 3. `deploy`
- Copy `docker-compose.prod.yml` ke VM tujuan lewat SCP
- SSH ke VM, tulis file `.env` berisi nama image & tag SHA commit saat ini
- `docker login` di VM, lalu `docker compose pull` + `docker compose up -d`
- Bersihkan image lama yang tidak terpakai (`docker image prune -f`)

VM tujuan **harus sudah punya Docker & Docker Compose terinstall** (sesuai
informasi yang diberikan) — pipeline ini tidak melakukan instalasi Docker di VM.

## Konfigurasi yang di-hardcode di pipeline

Beberapa nilai **tidak** dijadikan variable, melainkan langsung ditulis di
blok `env:` pada `.github/workflows/ci-cd.yml`:

| Nilai | Lokasi di workflow | Default saat ini |
|---|---|---|
| Nama image backend | `env.IMAGE_BACKEND` | `namauser/perpustakaan-backend` |
| Nama image frontend | `env.IMAGE_FRONTEND` | `namauser/perpustakaan-frontend` |
| Path deploy di VM | `env.VM_DEPLOY_PATH` | `/opt/perpustakaan-digital` |

**Ganti `namauser` sesuai akun registry Anda** sebelum pipeline pertama kali
dijalankan (edit langsung di file workflow, bagian paling atas `env:`).
Tag image tetap dinamis memakai `${{ github.sha }}` sehingga setiap build
menghasilkan image baru secara otomatis.

### Konfigurasi yang wajib dibuat sebagai GitHub Actions Secret

Buka **Settings → Secrets and variables → Actions → Secrets tab → New
repository secret**, lalu buat secret berikut:

| Nama Variable | Contoh nilai | Keterangan |
|---|---|---|
| `DOCKER_REGISTRY` | `docker.io` | Bisa juga `ghcr.io` untuk GitHub Container Registry |
| `DOCKER_USERNAME` | `namauser` | Username akun registry |
| `DOCKER_PASSWORD` | `xxxxxxxx` | Password atau access token registry |
| `VM_HOST` | `203.0.113.10` | IP/hostname publik VM tujuan deploy |
| `VM_USER` | `deploy` | Username SSH di VM |
| `VM_SSH_PRIVATE_KEY` | `-----BEGIN OPENSSH PRIVATE KEY-----...` | Private key SSH (format PEM) untuk login ke VM |
| `VM_SSH_PORT` | `22` | (opsional) Port SSH, default 22 kalau tidak diisi |

> **Catatan penting soal keamanan.** Workflow menggunakan `secrets.NAMA`, jadi
> semua nilai di atas harus dibuat pada tab **Secrets**. Secret terenkripsi dan
> otomatis di-mask pada log, terutama untuk `DOCKER_PASSWORD` dan
> `VM_SSH_PRIVATE_KEY`.

## Persiapan di sisi VM

1. Pastikan Docker & Docker Compose plugin sudah terinstall (sesuai info,
   sudah ada).
2. Buat folder deploy sesuai `VM_DEPLOY_PATH` yang di-hardcode di workflow
   (default `/opt/perpustakaan-digital`):
   ```bash
   sudo mkdir -p /opt/perpustakaan-digital
   sudo chown $USER:$USER /opt/perpustakaan-digital
   ```
3. Buat user/akses SSH khusus deploy (opsional tapi disarankan), lalu daftarkan
   public key-nya di `~/.ssh/authorized_keys` VM tersebut, dan simpan private
   key-nya ke variable `VM_SSH_PRIVATE_KEY`.
4. Pastikan port yang dipetakan container (`4000` untuk backend, `5500` untuk
   frontend) terbuka di firewall/security group VM.

## Menjalankan deploy pertama kali secara manual (opsional)

Sebelum mengandalkan pipeline, Anda bisa uji `docker-compose.prod.yml` secara
manual di VM untuk memastikan image bisa di-pull & berjalan (ganti `IMAGE_TAG`
dengan SHA commit yang sudah di-push ke registry):

```bash
cd /opt/perpustakaan-digital
cat > .env <<EOF
DOCKER_REGISTRY=docker.io
DOCKER_IMAGE_BACKEND=namauser/perpustakaan-backend
DOCKER_IMAGE_FRONTEND=namauser/perpustakaan-frontend
IMAGE_TAG=<sha-commit>
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
 │    push     │  docker login → build & push image (tag: github.sha)
 └──────┬──────┘
        ▼
 ┌─────────────┐
 │   deploy    │  scp docker-compose.prod.yml → VM
 │             │  ssh: tulis .env (IMAGE_TAG=sha) → docker compose pull → up -d
 └─────────────┘
```
