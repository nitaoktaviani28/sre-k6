'use strict';

const http = require('http');
const { handleRequest } = require('./router');

const PORT = process.env.PORT || 4000;

const server = http.createServer((req, res) => {
  handleRequest(req, res).catch((err) => {
    console.error('Fatal request error:', err);
    if (!res.headersSent) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, message: 'Internal server error' }));
    }
  });
});

server.listen(PORT, () => {
  console.log(`📚 Perpustakaan API berjalan di http://localhost:${PORT}`);
  console.log(`   Health check: GET /api/health`);
});

module.exports = server;
