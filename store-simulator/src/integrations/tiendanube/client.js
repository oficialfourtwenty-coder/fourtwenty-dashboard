// Lado NAVEGADOR de la integración Tiendanube. Importante: el navegador jamás
// habla con api.tiendanube.com ni ve credenciales — solo consulta dos
// endpoints locales que existen únicamente en `npm run dev` (los sirve el
// middleware de vite.config.js, que corre en node con el .env):
//   GET  /api/tn/status  → ¿hay credenciales configuradas?
//   POST /api/tn/sync    → corre el sync y escribe productos.json
// En el build online estos endpoints no existen: las funciones devuelven
// { disponible: false } y el juego sigue con el catálogo cargado a mano.

export async function getTnStatus() {
  try {
    const res = await fetch('/api/tn/status');
    if (!res.ok) return { disponible: false };
    return { disponible: true, ...(await res.json()) };
  } catch {
    return { disponible: false };
  }
}

export async function syncTiendanube() {
  try {
    const res = await fetch('/api/tn/sync', { method: 'POST' });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { ok: false, motivo: data.motivo ?? `Error ${res.status}` };
    return data;
  } catch {
    return { ok: false, motivo: 'El sync solo está disponible corriendo `npm run dev` (o por consola: npm run tn:sync).' };
  }
}
