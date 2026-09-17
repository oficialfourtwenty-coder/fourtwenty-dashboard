import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { defineConfig } from 'vite';
import { buildMusicManifest } from './tools/musicManifest.mjs';

// Endpoints locales SOLO del servidor de desarrollo (npm run dev):
//   GET/POST /api/productos → lee/escribe public/assets/data/productos.json,
//     así el panel de administración guarda el catálogo en el archivo real
//     del repo sin que el dueño edite JSON a mano.
//   GET /api/tn/status · POST /api/tn/sync → estado de credenciales y sync
//     con Tiendanube. Corren en node con el .env; las credenciales jamás
//     llegan al navegador ni al bundle.
// En el build de producción nada de esto existe: el juego lee el JSON
// estático y el admin guarda en localStorage + Exportar.
//
// ⚠️⚠️ ESTOS ENDPOINTS SOLO ATIENDEN A LA PROPIA MAQUINA. Comprobado el 16/09
// atacandolos de verdad: sin esta guarda, cualquiera en la misma red —un wifi
// de bar, la red de un coworking— podia, SIN NINGUNA CREDENCIAL:
//   · GET  /api/productos  → bajarse el catalogo entero
//   · POST /api/productos  → PISAR productos.json en el disco (medido: quedo
//                            una sola coleccion llamada "prueba-intrusion")
//   · POST /api/estampa    → escribir archivos dentro del repo
//   · GET  /api/tn/status  → ver el id de la tienda y si hay credenciales
//   · POST /api/tn/sync    → disparar un sync con el token de Tiendanube
//
// El servidor normal escucha solo en esta Mac. Para probar desde el celular en
// una red propia y confiable hay que pedirlo explicitamente con `npm run
// dev:lan`. La guarda por IP de los endpoints se conserva como segunda barrera.
function adminApiPlugin() {
  const productosPath = resolve(import.meta.dirname, 'public/assets/data/productos.json');
  const estampasDir = resolve(import.meta.dirname, 'public/assets/estampas');
  // Carpetas donde el panel puede escribir imagenes. Es una lista blanca a
  // proposito: el nombre de carpeta lo manda el navegador y sin esto se podria
  // escribir en cualquier lado del repo.
  const CARPETAS = {
    estampas: 'public/assets/estampas',
    campana: 'public/assets/campana',
  };

  // ⚠️ CON TOPE DE TAMAÑO. Sin tope, un cuerpo interminable llena la memoria
  // del proceso hasta voltearlo: no hace falta ser hacker, alcanza con un bug.
  // 12 MB entran de sobra para una estampa (100-400 KB) y para el catalogo.
  const TOPE_CUERPO = 12 * 1024 * 1024;
  const readBody = (req) => new Promise((resolveBody, reject) => {
    let body = '';
    let bytes = 0;
    req.on('data', (chunk) => {
      bytes += chunk.length;
      if (bytes > TOPE_CUERPO) {
        req.destroy();
        reject(new Error(`cuerpo demasiado grande (tope ${TOPE_CUERPO} bytes)`));
        return;
      }
      body += chunk;
    });
    req.on('end', () => resolveBody(body));
    req.on('error', reject);
  });

  // ¿La peticion viene de esta misma computadora?
  // ⚠️ Se mira la IP del socket, no una cabecera: `Host`, `Origin` y
  // `X-Forwarded-For` los escribe quien llama y se falsifican escribiendolas.
  // La IP del otro extremo de la conexion TCP no.
  const ES_LOCAL = new Set(['127.0.0.1', '::1', '::ffff:127.0.0.1']);
  function soloDeEstaMaquina(req, res) {
    const quien = req.socket?.remoteAddress ?? '';
    if (ES_LOCAL.has(quien)) return true;
    json(res, 403, {
      error: 'Esta funcion solo se puede usar desde la computadora donde corre el simulador.',
      detalle: `pedido desde ${quien}`,
    });
    console.warn(`[seguridad] ${req.method} ${req.url} rechazado: viene de ${quien}, no de esta maquina.`);
    return false;
  }

  const json = (res, status, data) => {
    res.statusCode = status;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(data));
  };

  return {
    name: 'fourtwenty-admin-api',
    buildStart() {
      buildMusicManifest({ rootDir: import.meta.dirname });
    },
    configureServer(server) {
      server.middlewares.use('/assets/musica/playlists.json', (_req, res) => {
        try {
          const playlists = buildMusicManifest({ rootDir: import.meta.dirname });
          res.setHeader('Content-Type', 'application/json');
          res.setHeader('Cache-Control', 'no-store');
          res.end(JSON.stringify(playlists, null, 2));
        } catch (e) {
          json(res, 500, { error: String(e.message ?? e) });
        }
      });

      server.middlewares.use('/api/productos', async (req, res) => {
        if (!soloDeEstaMaquina(req, res)) return;
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

      // POST /api/estampa → guarda el diseño de una prenda como PNG REAL en
      // public/assets/estampas/ y devuelve su ruta.
      //
      // POR QUE UN ARCHIVO Y NO TEXTO ADENTRO DEL JSON
      // Una estampa pesa entre 100 y 400 KB. Guardarla como dataURL adentro de
      // productos.json (o de localStorage) revienta a las ~20: localStorage
      // aguanta ~5 MB en total, y productos.json se carga entero al arrancar el
      // juego. Como archivo suelto queda versionado en git, se baja solo cuando
      // hace falta y no hay tope practico.
      // `carpeta` elige el destino: 'estampas' (diseños de prenda) o 'campana'
      // (fotos de campaña para los cuadros). Por defecto estampas, para que la
      // llamada vieja siga funcionando igual.
      server.middlewares.use('/api/estampa', async (req, res) => {
        if (!soloDeEstaMaquina(req, res)) return;
        if (req.method !== 'POST') return json(res, 405, { error: 'usar POST' });
        try {
          const { nombre, dataUrl, carpeta = 'estampas' } = JSON.parse(await readBody(req));
          const base64 = String(dataUrl ?? '').split(',')[1];
          if (!base64) return json(res, 400, { error: 'falta la imagen' });

          // El nombre lo arma el navegador, asi que se sanea: solo letras,
          // numeros y guiones. Sin esto un nombre con ../ escribiria fuera de
          // la carpeta.
          const limpio = String(nombre ?? 'estampa')
            .toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
            .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'estampa';

          const relativa = CARPETAS[carpeta];
          if (!relativa) return json(res, 400, { error: `carpeta no permitida: ${carpeta}` });
          const destino = resolve(import.meta.dirname, relativa);
          mkdirSync(destino, { recursive: true });
          // Las fotos de campaña van en JPEG: son fotograficas y no necesitan
          // transparencia. Una foto de 1280 px pesa ~180 KB en JPEG y ~1.4 MB
          // en PNG, y son 42.
          const ext = dataUrl.startsWith('data:image/jpeg') ? 'jpg' : 'png';
          const archivo = `${limpio}.${ext}`;
          writeFileSync(resolve(destino, archivo), Buffer.from(base64, 'base64'));
          json(res, 200, { ok: true, ruta: `${relativa.replace('public/', '')}/${archivo}` });
        } catch (e) {
          json(res, 500, { error: String(e.message ?? e) });
        }
      });

      server.middlewares.use('/api/tn/status', async (req, res) => {
        if (!soloDeEstaMaquina(req, res)) return;
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
        if (!soloDeEstaMaquina(req, res)) return;
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
  server: { host: '127.0.0.1' },
  plugins: [adminApiPlugin()],
});
