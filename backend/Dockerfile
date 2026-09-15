# syntax=docker/dockerfile:1

# ---------------------------------------------------------------------------
# Perpustakaan Digital - Backend
# Node.js murni (tanpa dependency eksternal), sehingga image ini cukup ringan
# dan tidak memerlukan langkah `npm install`.
# ---------------------------------------------------------------------------
FROM node:20-alpine

# Metadata
LABEL org.opencontainers.image.title="perpustakaan-backend" \
      org.opencontainers.image.description="REST API aplikasi Perpustakaan Buku" \
      org.opencontainers.image.licenses="MIT"

WORKDIR /app

# Jalankan sebagai user non-root untuk keamanan
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

COPY package.json ./
COPY src ./src

ENV NODE_ENV=production \
    PORT=4000

EXPOSE 4000

USER appuser

# Healthcheck sederhana memanfaatkan endpoint /api/health
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:' + (process.env.PORT || 4000) + '/api/health', (res) => process.exit(res.statusCode === 200 ? 0 : 1)).on('error', () => process.exit(1))"

CMD ["node", "src/server.js"]
