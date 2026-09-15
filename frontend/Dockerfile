# syntax=docker/dockerfile:1

# ---------------------------------------------------------------------------
# Perpustakaan Digital - Frontend
# Static site (HTML/CSS/JS murni) disajikan lewat Nginx.
# ---------------------------------------------------------------------------
FROM nginx:1.27-alpine

LABEL org.opencontainers.image.title="perpustakaan-frontend" \
      org.opencontainers.image.description="Frontend aplikasi Perpustakaan Buku" \
      org.opencontainers.image.licenses="MIT"

# Konfigurasi nginx khusus (SPA-friendly fallback & caching aset statis)
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Salin seluruh halaman & aset statis
COPY . /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget --quiet --spider http://127.0.0.1:80/login.html || exit 1

CMD ["nginx", "-g", "daemon off;"]
