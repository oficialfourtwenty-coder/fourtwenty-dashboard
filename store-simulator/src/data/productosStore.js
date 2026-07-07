// Catálogo de productos del simulador — ÚNICA fuente de datos para el panel
// de producto (click en una prenda) y el panel de administración (tecla P).
//
// Dos formas de llenarlo, MISMO formato:
//   1. A mano: panel de administración (tecla P / ?admin=1) → se guarda acá.
//   2. Automático: sync con Tiendanube (npm run tn:sync o botón del admin)
//      → escribe el mismo archivo (ver src/integrations/tiendanube/).
//
// Persistencia (mismo patrón que el layout del editor):
//   - Archivo base del repo: public/assets/data/productos.json
//   - Cambios del admin: localStorage SIEMPRE (instantáneo) + POST /api/productos
//     (solo existe en `npm run dev`: un middleware de Vite escribe el archivo
//     real del repo — así el dueño no edita JSON a mano). En el build online
//     no hay endpoint: queda localStorage + botón Exportar.

const BASE_URL = 'assets/data/productos.json';
const API_URL = '/api/productos';
const LS_KEY = 'fourtwenty-productos';

// Colecciones fijas del juego: 'local' (adentro del local de Burela) + los
// 4 pisos con colección de BOBILONIA. `piso` linkea con el mundo 3D.
export const COLECCIONES_BASE = [
  { id: 'local', nombre: 'LOCAL BURELA', piso: 'local' },
  { id: 'origen', nombre: 'ORIGEN', piso: 2 },
  { id: 'hoop', nombre: 'HOOP SEASON', piso: 3 },
  { id: 'bob', nombre: 'BOB', piso: 4 },
  { id: 'cultura', nombre: 'CULTURA', piso: 5 },
];

export function productoVacio(coleccionId, n) {
  return {
    id: `${coleccionId}-${Date.now().toString(36)}-${n}`,
    productId: null,
    nombre: '',
    descripcion: '',
    precio: '',
    moneda: 'ARS',
    imagen: '',
    link: '',
    activo: true,
  };
}

// Estructura mínima garantizada aunque el JSON venga viejo/incompleto.
function normalize(raw) {
  const data = raw && typeof raw === 'object' && Array.isArray(raw.colecciones)
    ? raw
    : { version: 1, actualizado: null, origen: 'manual', colecciones: [] };
  for (const base of COLECCIONES_BASE) {
    let col = data.colecciones.find((c) => c.id === base.id);
    if (!col) {
      col = { ...base, categoriaTN: '', productos: [] };
      data.colecciones.push(col);
    }
    col.nombre = col.nombre || base.nombre;
    col.piso = base.piso; // el piso lo define el juego, no el JSON
    col.categoriaTN = col.categoriaTN ?? '';
    if (!Array.isArray(col.productos)) col.productos = [];
    col.productos = col.productos.filter((p) => p && typeof p === 'object');
  }
  return data;
}

let state = normalize(null);
let loaded = false;
const listeners = new Set();

function emit() {
  for (const cb of listeners) {
    try { cb(state); } catch (e) { console.warn('productosStore listener:', e); }
  }
}

export function onProductosChange(cb) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export function getProductos() {
  return state;
}

export function getColeccion(id) {
  return state.colecciones.find((c) => c.id === id) ?? null;
}

export function getColeccionByPiso(piso) {
  return state.colecciones.find((c) => c.piso === piso) ?? null;
}

// Producto para el gancho N de una colección: los `activo` en orden, ciclando
// (si hay 4 productos y 12 ganchos, se repiten). Sin productos → null.
export function getProductoForSlot(piso, index) {
  const col = getColeccionByPiso(piso);
  if (!col) return null;
  const activos = col.productos.filter((p) => p.activo !== false);
  if (!activos.length) return null;
  return { producto: activos[index % activos.length], coleccion: col };
}

export async function loadProductos() {
  // localStorage primero (borrador del dueño), después el archivo del repo.
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) {
      state = normalize(JSON.parse(raw));
      loaded = true;
      emit();
      return state;
    }
  } catch (e) {
    console.warn('productos: localStorage ilegible, se usa el archivo base.', e);
  }
  try {
    const res = await fetch(BASE_URL, { cache: 'no-store' });
    if (res.ok) state = normalize(await res.json());
  } catch (e) {
    console.warn('productos: no se pudo leer productos.json — catálogo vacío.', e);
  }
  loaded = true;
  emit();
  return state;
}

// Guarda: localStorage siempre; el archivo real solo si el endpoint dev existe.
// Devuelve { local, file } para que el admin muestre dónde quedó guardado.
export async function saveProductos(next = state) {
  state = normalize(next);
  state.actualizado = new Date().toISOString();
  let local = false;
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(state));
    local = true;
  } catch (e) {
    console.warn('productos: no se pudo guardar en localStorage.', e);
  }
  let file = false;
  try {
    const res = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(state, null, 2),
    });
    file = res.ok;
  } catch {
    // build online: no hay endpoint — queda el localStorage + Exportar.
  }
  emit();
  return { local, file };
}

// Cuando el sync de Tiendanube escribió el archivo, hay que descartar el
// borrador local para ver lo nuevo.
export async function reloadFromFile() {
  try { localStorage.removeItem(LS_KEY); } catch {}
  loaded = false;
  return loadProductos();
}

export function exportProductos() {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'productos.json';
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export async function importProductos(file) {
  const parsed = JSON.parse(await file.text());
  return saveProductos(parsed);
}

export function isLoaded() {
  return loaded;
}
