// Punto único desde donde salen las URLs de los assets PESADOS del juego
// (GLB, música, texturas, fotos). Existe para poder mudar esos archivos a un
// bucket R2 de Cloudflare sin tocar una sola línea de la lógica del mundo.
//
// Cómo funciona:
//   - Si NO hay variable de entorno → devuelve la ruta tal cual, relativa,
//     exactamente como venía funcionando hasta hoy. Cero cambios de conducta.
//   - Si hay VITE_ASSETS_BASE_URL → antepone esa base y los archivos se
//     descargan del bucket en vez del hosting.
//
// Se resuelve en tiempo de BUILD (Vite reemplaza import.meta.env), así que no
// cuesta nada en runtime y no hay forma de que quede una URL a medio armar.
//
// ⚠️ Los JSON de DATOS (productos.json, furniture-layout.json, playlists.json)
// NO pasan por acá a propósito: son livianos, cambian seguido y son parte del
// deploy. Viajan siempre con el sitio. Solo se muda lo que pesa.

const RAW_BASE = import.meta.env?.VITE_ASSETS_BASE_URL ?? '';

// Sin barra final, para poder concatenar sin duplicarla.
const BASE = String(RAW_BASE).trim().replace(/\/+$/, '');

/** true cuando los assets pesados se están sirviendo desde R2/CDN. */
export const usingRemoteAssets = BASE !== '';

/**
 * Devuelve la URL final de un asset pesado.
 * Se le pasa SIEMPRE la ruta como está hoy en el repo ('assets/bob/bob.glb').
 *
 *   assetUrl('assets/bob/bob.glb')
 *     sin  env → 'assets/bob/bob.glb'            (igual que siempre)
 *     con  env → 'https://cdn.fourtwenty.com/assets/bob/bob.glb'
 */
export function assetUrl(path) {
  const clean = String(path ?? '').replace(/^\/+/, '');
  if (!BASE) return path; // ruta original intacta: relativa o absoluta según el llamador
  return `${BASE}/${clean}`;
}
