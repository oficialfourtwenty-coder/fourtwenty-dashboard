// Cliente node de la API de Tiendanube. Corre SOLO en node (scripts npm y el
// middleware del servidor de desarrollo) — las credenciales jamás llegan al
// navegador. Flujo y formatos según la documentación oficial:
//   - Canje de code:   POST https://www.tiendanube.com/apps/authorize/token
//   - API:             https://api.tiendanube.com/v1/{store_id}/...
//   - Header de auth:  "Authentication: bearer TOKEN" (así, literal — la doc
//     clásica avisa que "Authorization" devuelve 401; las guías nuevas usan
//     "Authorization: Bearer", mandamos AMBOS por compatibilidad).
//   - User-Agent identificatorio obligatorio.
//   - Paginación: page / per_page (máx 200), total en header x-total-count.
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');

// .env plano (KEY=valor), sin dependencias. process.env pisa al archivo.
export function loadEnv(rootDir = ROOT) {
  const env = {};
  const file = resolve(rootDir, '.env');
  if (existsSync(file)) {
    for (const line of readFileSync(file, 'utf8').split('\n')) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
      if (m && !line.trim().startsWith('#')) env[m[1]] = m[2];
    }
  }
  for (const key of ['TN_CLIENT_ID', 'TN_CLIENT_SECRET', 'TN_ACCESS_TOKEN', 'TN_STORE_ID', 'TN_USER_AGENT']) {
    if (process.env[key]) env[key] = process.env[key];
  }
  return env;
}

export function credencialesCompletas(env) {
  return Boolean(env.TN_ACCESS_TOKEN && env.TN_STORE_ID);
}

function headers(env) {
  return {
    'Authentication': `bearer ${env.TN_ACCESS_TOKEN}`,
    'Authorization': `Bearer ${env.TN_ACCESS_TOKEN}`,
    'User-Agent': env.TN_USER_AGENT || 'FOURTWENTY Store Simulator (oficialfourtwenty@gmail.com)',
    'Content-Type': 'application/json',
  };
}

async function apiGet(env, path) {
  const url = `https://api.tiendanube.com/v1/${env.TN_STORE_ID}${path}`;
  const res = await fetch(url, { headers: headers(env) });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Tiendanube ${res.status} en ${path}: ${body.slice(0, 300)}`);
  }
  return res;
}

// Todos los productos publicados, paginando de a 200.
export async function fetchAllProducts(env) {
  const productos = [];
  for (let page = 1; page <= 50; page++) {
    const res = await apiGet(env, `/products?per_page=200&page=${page}&published=true`);
    const batch = await res.json();
    if (!Array.isArray(batch) || !batch.length) break;
    productos.push(...batch);
    const total = Number(res.headers.get('x-total-count') ?? 0);
    if (total && productos.length >= total) break;
    if (batch.length < 200) break;
  }
  return productos;
}

export async function fetchCategories(env) {
  const res = await apiGet(env, '/categories?per_page=200');
  return res.json();
}

// Moneda de la tienda (para etiquetar precios). Si falla, ARS.
export async function fetchStoreCurrency(env) {
  try {
    const res = await apiGet(env, '/store');
    const store = await res.json();
    return store.main_currency || 'ARS';
  } catch {
    return 'ARS';
  }
}

// Canje del authorization code (vence a los 5 minutos) por el access_token.
// Respuesta: { access_token, token_type: "bearer", scope, user_id } donde
// user_id ES el ID de la tienda para la API.
export async function exchangeCodeForToken(env, code) {
  if (!env.TN_CLIENT_ID || !env.TN_CLIENT_SECRET) {
    throw new Error('Faltan TN_CLIENT_ID / TN_CLIENT_SECRET en el .env (salen de tu app en partners.tiendanube.com).');
  }
  const res = await fetch('https://www.tiendanube.com/apps/authorize/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: env.TN_CLIENT_ID,
      client_secret: env.TN_CLIENT_SECRET,
      grant_type: 'authorization_code',
      code,
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.access_token) {
    throw new Error(`Canje de code falló (${res.status}): ${JSON.stringify(data).slice(0, 300)} — ojo: el code vence a los 5 minutos, generá uno nuevo reinstalando la app.`);
  }
  return data;
}
