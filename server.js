const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 2000;
const ROOT = path.join(__dirname, 'prototype');

const mime = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.ico': 'image/x-icon',
};

const server = http.createServer((req, res) => {
  let file = req.url === '/' ? '/index.html' : req.url;
  file = path.join(ROOT, path.normalize(file));
  if (!file.startsWith(ROOT)) {
    res.statusCode = 403;
    res.end();
    return;
  }
  fs.readFile(file, (err, data) => {
    if (err) {
      res.statusCode = err.code === 'ENOENT' ? 404 : 500;
      res.end(err.code === 'ENOENT' ? 'Not found' : 'Server error');
      return;
    }
    const ext = path.extname(file);
    res.setHeader('Content-Type', mime[ext] || 'application/octet-stream');
    res.end(data);
  });
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`Petcom running at http://localhost:${PORT}/`);
});
