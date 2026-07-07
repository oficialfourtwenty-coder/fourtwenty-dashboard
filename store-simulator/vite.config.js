import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { defineConfig } from 'vite';

// Endpoints locales SOLO del servidor de desarrollo (npm run dev):
//   GET/POST /api/productos → lee/escribe public/assets/data/productos.json,
//     así el panel de administración guarda el catálogo en el archivo real
//     del repo sin que el dueño edite JSON a mano.
//   GET /api/tn/status · POST /api/tn/sync → estado de credenciales y sync
//     con Tiendanube. Corren en node con el .env; las credenciales jamás
//     llegan al navegador ni al bundle.
// En el build de producción nada de esto existe: el juego lee el JSON
// estático y el admin guarda en localStorage + Exportar.
function adminApiPlugin() {
  const productosPath = resolve(import.meta.dirname, 'public/assets/data/productos.json');

  const readBody = (req) => new Promise((resolveBody, reject) => {
    let body = '';
    req.on('data', (chunk) => { body += chunk; });
    req.on('end', () => resolveBody(body));
    req.on('error', reject);
  });

  const json = (res, status, data) => {
    res.statusCode = status;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(data));
  };

  return {
    name: 'fourtwenty-admin-api',
    configureServer(server) {
      server.middlewares.use('/api/productos', async (req, res) => {
        try {
          if (req.method === 'GET') {
            if (!existsSync(productosPath)) return json(res, 404, { error: 'productos.json no existe' });
            res.setHeader('Content-Type', 'application/json');
            res.end(readFileSync(productosPath, 'utf8'));
            return;
          }
          if (req.method === 'POST') {
            const body = await readBody(req);
            const data = JSON.parse(body); // valida que sea JSON de verdad
            if (!data || !Array.isArray(data.colecciones)) {
              return json(res, 400, { error: 'formato inválido: falta colecciones[]' });
            }
            writeFileSync(productosPath, `${JSON.stringify(data, null, 2)}\n`);
            return json(res, 200, { ok: true });
          }
          json(res, 405, { error: 'método no soportado' });
        } catch (e) {
          json(res, 500, { error: String(e.message ?? e) });
        }
      });

      server.middlewares.use('/api/tn/status', async (req, res) => {
        try {
          const { loadEnv, credencialesCompletas } = await import('./tools/tiendanube/api.mjs');
          const env = loadEnv(import.meta.dirname);
          json(res, 200, {
            configurado: credencialesCompletas(env),
            storeId: env.TN_STORE_ID || null, // id de tienda no es secreto
          });
        } catch (e) {
          json(res, 500, { configurado: false, error: String(e.message ?? e) });
        }
      });

      server.middlewares.use('/api/tn/sync', async (req, res) => {
        if (req.method !== 'POST') return json(res, 405, { error: 'usar POST' });
        try {
          const { runSync } = await import('./tools/tiendanube/sync.mjs');
          const result = await runSync({ rootDir: import.meta.dirname });
          json(res, result.ok ? 200 : 409, result);
        } catch (e) {
          json(res, 500, { ok: false, motivo: String(e.message ?? e) });
        }
      });
    },
  };
}

export default defineConfig({
  base: './',
  server: { host: true },
  plugins: [adminApiPlugin()],
});
