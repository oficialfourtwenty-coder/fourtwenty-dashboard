import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, resolve, sep } from 'node:path';
import { generateChalaContext, PROJECT_ROOT } from './generar-contexto.mjs';

const HOST = '127.0.0.1';
const PORT = Number(process.env.CHALA_PORT || 5203);
const STATIC_ROOT = resolve(PROJECT_ROOT, 'tools/chala');
const ASSETS_ROOT = resolve(PROJECT_ROOT, 'public/assets');
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
};

let context = generateChalaContext();

function send(res, status, body, type = 'application/json; charset=utf-8') {
  res.writeHead(status, {
    'Content-Type': type,
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'no-referrer',
  });
  res.end(body);
}

function safeResolve(root, requestPath) {
  const decoded = decodeURIComponent(requestPath).replace(/^\/+/, '');
  const candidate = resolve(root, decoded);
  return candidate === root || candidate.startsWith(`${root}${sep}`) ? candidate : null;
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url ?? '/', `http://${HOST}:${PORT}`);
  if (req.method === 'GET' && url.pathname === '/api/contexto') {
    send(res, 200, JSON.stringify(context));
    return;
  }
  if (req.method === 'POST' && url.pathname === '/api/actualizar') {
    context = generateChalaContext();
    send(res, 200, JSON.stringify({ ok: true, generatedAt: context.generatedAt }));
    return;
  }
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    send(res, 405, JSON.stringify({ error: 'Metodo no permitido.' }));
    return;
  }

  let filePath;
  if (url.pathname.startsWith('/assets/')) {
    filePath = safeResolve(ASSETS_ROOT, url.pathname.slice('/assets/'.length));
  } else {
    filePath = safeResolve(STATIC_ROOT, url.pathname === '/' ? 'index.html' : url.pathname);
  }
  if (!filePath) {
    send(res, 403, 'Acceso rechazado.', 'text/plain; charset=utf-8');
    return;
  }

  try {
    const body = await readFile(filePath);
    send(res, 200, req.method === 'HEAD' ? '' : body, MIME[extname(filePath).toLowerCase()] || 'application/octet-stream');
  } catch {
    send(res, 404, 'No encontrado.', 'text/plain; charset=utf-8');
  }
});

server.listen(PORT, HOST, () => {
  console.log(`Chala Offline lista en http://${HOST}:${PORT}/`);
  console.log(`Contexto: ${context.branch} @ ${context.commit.short} · ${context.assets.length} assets · ${context.chunks.length} fragmentos`);
});

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => server.close(() => process.exit(0)));
}
