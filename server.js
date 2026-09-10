#!/usr/bin/env node
'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');

const HOST = '127.0.0.1';
const PORT = 8787;
const API_ORIGIN = 'https://unclothy.com';
const ROOT = __dirname;

function send(res, status, type, body) {
  res.writeHead(status, {
    'Content-Type': type,
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff'
  });
  res.end(body);
}

function serveIndex(res) {
  fs.readFile(path.join(ROOT, 'index.html'), (error, data) => {
    if (error) return send(res, 500, 'text/plain; charset=utf-8', 'Không thể đọc index.html.');
    send(res, 200, 'text/html; charset=utf-8', data);
  });
}

function proxyApi(req, res) {
  const target = new URL(req.url, API_ORIGIN);
  const headers = { accept: req.headers.accept || 'application/json' };
  if (req.headers['content-type']) headers['content-type'] = req.headers['content-type'];
  if (req.headers['x-api-key']) headers['x-api-key'] = req.headers['x-api-key'];

  const upstream = httpsRequest(target, { method: req.method, headers }, req, res);
  upstream.on('error', () => send(res, 502, 'application/json; charset=utf-8', JSON.stringify({
    success: false,
    message: 'Không thể kết nối đến máy chủ API.'
  })));
}

function httpsRequest(target, options, incoming, outgoing) {
  const https = require('https');
  const request = https.request(target, options, response => {
    outgoing.writeHead(response.statusCode, {
      'Content-Type': response.headers['content-type'] || 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff'
    });
    response.pipe(outgoing);
  });
  incoming.pipe(request);
  return request;
}

const server = http.createServer((req, res) => {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, { Allow: 'GET, POST, OPTIONS' });
    return res.end();
  }
  if (req.url === '/' || req.url === '/index.html') return serveIndex(res);
  if (req.url.startsWith('/api/')) return proxyApi(req, res);
  send(res, 404, 'text/plain; charset=utf-8', 'Không tìm thấy trang.');
});

server.listen(PORT, HOST, () => {
  console.log(`Unclothy Studio đang chạy tại http://localhost:${PORT}`);
  console.log('Giữ cửa sổ này mở trong khi sử dụng trang.');
});

process.on('SIGINT', () => server.close(() => process.exit(0)));
process.on('SIGTERM', () => server.close(() => process.exit(0)));
