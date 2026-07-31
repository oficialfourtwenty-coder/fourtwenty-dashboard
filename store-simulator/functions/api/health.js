// Endpoint mínimo para confirmar que el runtime de Workers está vivo en
// Cloudflare Pages. No toca datos ni credenciales: solo responde OK.
//
// Para qué sirve: después del primer deploy, abrís
//   https://<tu-sitio>.pages.dev/api/health
// Si ves el JSON, las Functions andan y el backend de la Fase 1 (Mercado Pago
// + Tiendanube) tiene dónde vivir. Si ves un 404, Pages no está tomando la
// carpeta functions/ y hay que revisar el "root directory" del proyecto.
//
// ⚠️ Los endpoints /api/productos, /api/tn/status y /api/tn/sync que ves en
// vite.config.js NO viven acá: son middleware del servidor de desarrollo
// (npm run dev) y nunca existieron en producción. No hay nada que portar.
// El backend real de pagos todavía no está escrito — ver Fase 1 del PLAN
// MAESTRO en Notion. Cuando se escriba, cada endpoint es un archivo en esta
// misma carpeta: functions/api/checkout.js → /api/checkout

export function onRequestGet() {
  return new Response(
    JSON.stringify({
      ok: true,
      servicio: 'simulador-bobilonia',
      runtime: 'cloudflare-pages-functions',
      ts: new Date().toISOString(),
    }, null, 2),
    {
      status: 200,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'no-store',
      },
    },
  );
}
