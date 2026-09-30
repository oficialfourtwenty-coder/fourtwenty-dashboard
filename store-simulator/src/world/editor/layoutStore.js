const BASE_LAYOUT_URL = '/assets/layouts/furniture-layout.json';
const LOCAL_STORAGE_KEY = 'fourtwenty-editor-layout-burela-retro';
const HOOP_BASE_MIGRATION_KEY = 'fourtwenty-editor-hoop-base-all-floors-v1';
const ORIGIN_RESET_MIGRATION_KEY = 'fourtwenty-editor-origin-reset-v1';
const HOOP_DESTINATION_ID = 2;
const HOOP_BASE_TARGETS = [1, 3, 4, 5];

function isLayout(value) {
  return Array.isArray(value);
}

export function formatLayoutJSON(layout) {
  return JSON.stringify(layout, null, 2);
}

export function parseLayoutJSON(text, source = 'layout JSON') {
  try {
    const parsed = JSON.parse(text);
    if (!isLayout(parsed)) {
      console.warn(`${source}: formato invalido, se esperaba un array.`);
      return null;
    }
    return parsed;
  } catch (error) {
    console.warn(`${source}: JSON invalido.`, error);
    return null;
  }
}

export async function loadBaseLayout() {
  try {
    const res = await fetch(BASE_LAYOUT_URL, { cache: 'no-store' });
    if (!res.ok) {
      console.warn(`No se pudo cargar layout base (${res.status}) desde ${BASE_LAYOUT_URL}.`);
      return [];
    }
    const parsed = await res.json();
    if (!isLayout(parsed)) {
      console.warn(`Layout base invalido en ${BASE_LAYOUT_URL}: se esperaba un array.`);
      return [];
    }
    return parsed;
  } catch (error) {
    console.warn(`No se pudo cargar layout base desde ${BASE_LAYOUT_URL}.`, error);
    return [];
  }
}

export function getLocalLayout() {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!raw) return null;
    return parseLayoutJSON(raw, `${LOCAL_STORAGE_KEY} localStorage`);
  } catch (error) {
    console.warn(`No se pudo leer ${LOCAL_STORAGE_KEY} desde localStorage.`, error);
    return null;
  }
}

function destinationPrefix(destinationId) {
  return `destino-${destinationId}:`;
}

function copyHoopBaseToAllFloors(layout) {
  const sourcePrefix = destinationPrefix(HOOP_DESTINATION_ID);
  const sourceItems = layout.filter((item) => item?.id?.startsWith(sourcePrefix));
  if (!sourceItems.length) return null;

  const targetPrefixes = HOOP_BASE_TARGETS.map(destinationPrefix);
  const migrated = layout.filter((item) => !targetPrefixes.some((prefix) => item?.id?.startsWith(prefix)));

  for (const targetId of HOOP_BASE_TARGETS) {
    const targetPrefix = destinationPrefix(targetId);
    for (const source of sourceItems) {
      const copy = {
        ...source,
        id: `${targetPrefix}${source.id.slice(sourcePrefix.length)}`,
      };
      if (typeof source.type === 'string' && source.type === `destino-${HOOP_DESTINATION_ID}`) {
        copy.type = `destino-${targetId}`;
      }
      if (source.cloneOf?.startsWith(sourcePrefix)) {
        copy.cloneOf = `${targetPrefix}${source.cloneOf.slice(sourcePrefix.length)}`;
      }
      migrated.push(copy);
    }
  }
  return migrated;
}

function migrateHoopBaseLayout(layout) {
  try {
    if (localStorage.getItem(HOOP_BASE_MIGRATION_KEY) === '1') return layout;
    const migrated = copyHoopBaseToAllFloors(layout);
    if (!migrated) return layout;
    localStorage.setItem(LOCAL_STORAGE_KEY, formatLayoutJSON(migrated));
    localStorage.setItem(HOOP_BASE_MIGRATION_KEY, '1');
    console.info('FOURTWENTY editor: la base guardada de Hoop Season se copio a los demas pisos.');
    return migrated;
  } catch (error) {
    console.warn('No se pudo copiar la base de Hoop Season a los demas pisos.', error);
    return layout;
  }
}

function migrateOriginToUploadedBase(layout) {
  try {
    if (localStorage.getItem(ORIGIN_RESET_MIGRATION_KEY) === '1') return layout;
    // El reset automatico de ORIGEN ya cumplio su funcion. Desde ahora el piso
    // se edita a mano y su guardado local es la fuente de verdad: borrarlo en
    // una migracion destruiria los percheros y las prendas acomodadas.
    localStorage.setItem(ORIGIN_RESET_MIGRATION_KEY, '1');
    return layout;
  } catch (error) {
    console.warn('No se pudo marcar la migracion de ORIGEN.', error);
    return layout;
  }
}

export async function loadInitialLayout() {
  // Recuperacion manual: abrir una vez con `?restaurar-layout=1` descarta el
  // borrador local y vuelve al JSON bueno. El parametro se quita enseguida para
  // no borrar cambios nuevos durante la misma sesion.
  const url = new URL(window.location.href);
  if (url.searchParams.get('restaurar-layout') === '1') {
    try { localStorage.removeItem(LOCAL_STORAGE_KEY); } catch { /* sin persistencia */ }
    url.searchParams.delete('restaurar-layout');
    window.history.replaceState({}, '', url);
  }
  const local = getLocalLayout();
  if (local) return migrateOriginToUploadedBase(migrateHoopBaseLayout(local));
  try { localStorage.setItem(ORIGIN_RESET_MIGRATION_KEY, '1'); } catch { /* sin persistencia */ }
  return loadBaseLayout();
}

// ⚠️ `porId` (opcional): mapa id → objeto del mismo layout. Hace falta para las
// COPIAS. Una prenda duplicada con el editor (`prenda:remera-...-copia-3`) no
// guarda el piso: lo guarda solo el original, en `prendaGlb.destinationId`. Sin
// seguir `cloneOf`, las copias quedaban clasificadas como Burela. En ORIGEN son
// 10 de las 12 prendas colgadas.
function destinationScope(item, porId = null, visto = new Set()) {
  const nestedDestination = item?.piece?.destinationId
    ?? item?.mueble?.destinationId
    ?? item?.prendaGlb?.destinationId;
  if (Number.isFinite(Number(nestedDestination))) return Number(nestedDestination);
  const id = String(item?.id ?? '');
  const prefixed = id.match(/^destino-(\d+):/);
  if (prefixed) return Number(prefixed[1]);
  const elevator = id.match(/^elevator-destination-(\d+)$/);
  if (elevator) return Number(elevator[1]);
  const arcade = id.match(/^destination-(\d+)-minigame-arcade/);
  if (arcade) return Number(arcade[1]);
  if (id.startsWith('origin-minigame-arcade')) return 1;
  // Copia: pertenece al piso de su original. `visto` corta una cadena circular
  // si algun dia un layout roto la trajera.
  if (item?.cloneOf && porId && !visto.has(id)) {
    visto.add(id);
    const original = porId.get(item.cloneOf);
    if (original) return destinationScope(original, porId, visto);
  }
  return null;
}

const mapaPorId = (...layouts) => {
  const mapa = new Map();
  for (const layout of layouts) for (const item of layout ?? []) if (item?.id) mapa.set(item.id, item);
  return mapa;
};

const NOMBRES_PISOS = { 1: 'ORIGEN', 2: 'HOOP SEASON', 3: 'CULTURA', 4: 'BOB', 5: 'TERRAZA' };

// TRAER LOS PISOS DEL REPO SIN TOCAR BURELA — boton "Traer pisos de Fer" (T).
//
// POR QUE EXISTE. Lo guardado en el navegador MANDA sobre el archivo del repo
// (`loadInitialLayout`: si hay algo local, el archivo se ignora ENTERO). Asi
// que cuando Fer sube pisos nuevos, Kusher no los ve: su navegador tiene un
// guardado viejo de esos pisos. Paso el 25/09 con ORIGEN: el repo tenia 12
// prendas colgadas (verificado abriendo el piso con un navegador limpio) y
// Kusher veia el piso vacio.
//
// La salida de siempre era "Clear Local", pero eso borra TAMBIEN lo que Kusher
// acomodo en Burela y todavia no subio. Esto separa: Burela sale del navegador
// (lo de Kusher) y los cinco pisos salen del repo (lo de Fer).
//
// A que escena pertenece cada objeto lo decide `destinationScope`, la misma
// regla que ya usa el guardado. Los objetos CREADOS adentro de un piso (una
// prenda, un mueble) no dicen el piso en el id, pero lo guardan adentro
// (`prendaGlb.destinationId`, `mueble.destinationId`): por eso no se pierden,
// que es el agujero que tuvo `fusionar-layouts.mjs` el 10/09.
//
// ⚠️ ANTES DE TOCAR NADA SE DESCARGA UN RESPALDO de lo que habia en el
// navegador. Ya se perdio trabajo de layout mas de una vez; un archivo en
// Descargas es la unica garantia que no depende de este codigo.
export async function traerPisosDelRepo() {
  const local = getLocalLayout() ?? [];
  const repo = await loadBaseLayout();
  if (!repo.length) {
    return { ok: false, motivo: 'No se pudo leer el archivo del repo. ¿Esta andando el servidor?' };
  }

  const fecha = new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-');
  const respaldo = `respaldo-layout-antes-de-traer-pisos-${fecha}.json`;
  if (local.length && !downloadLayout(local, respaldo)) {
    // Sin respaldo no se sigue: preferible no traer nada a arriesgar lo suyo.
    return { ok: false, motivo: 'No se pudo descargar el respaldo. No se toco nada.' };
  }

  const idsLocal = mapaPorId(local);
  const idsRepo = mapaPorId(repo);
  const burela = local.filter((item) => destinationScope(item, idsLocal) === null);
  const pisos = repo.filter((item) => destinationScope(item, idsRepo) !== null);
  const resultado = [...burela, ...pisos];
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, formatLayoutJSON(resultado));
  } catch (error) {
    console.warn('No se pudo guardar el layout con los pisos traidos.', error);
    return { ok: false, motivo: 'No se pudo guardar (¿memoria del navegador llena?). No se toco nada.' };
  }

  const porPiso = {};
  for (const item of pisos) {
    const piso = destinationScope(item, idsRepo);
    const nombre = NOMBRES_PISOS[piso] ?? `piso ${piso}`;
    porPiso[nombre] = (porPiso[nombre] ?? 0) + 1;
  }
  const prendas = pisos.filter((item) => String(item.id).startsWith('prenda:') && item.visible !== false).length;
  return { ok: true, burela: burela.length, porPiso, prendas, respaldo: local.length ? respaldo : null };
}

function preserveUnloadedDestinations(layout) {
  const previous = getLocalLayout();
  if (!previous) return layout;
  // ⚠️ Con flecha y el mapa, NO `layout.map(destinationScope)`: `map` le pasa
  // tambien el indice y el array, y `destinationScope` ahora recibe el mapa de
  // ids como segundo argumento (para seguir las copias). Pasado directo,
  // guardar reventaba al primer objeto copiado.
  const ids = mapaPorId(previous, layout);
  const loadedDestinations = new Set(layout.map((item) => destinationScope(item, ids)).filter(Number.isFinite));
  const idsActuales = new Set(layout.map((item) => item?.id));
  const preserved = previous.filter((item) => {
    const scope = destinationScope(item, ids);
    return Number.isFinite(scope) && !loadedDestinations.has(scope) && !idsActuales.has(item?.id);
  });
  return [...preserved, ...layout];
}

export function saveLocalLayout(layout, { preserveOtherDestinations = false } = {}) {
  try {
    const layoutToSave = preserveOtherDestinations ? preserveUnloadedDestinations(layout) : layout;
    localStorage.setItem(LOCAL_STORAGE_KEY, formatLayoutJSON(layoutToSave));
    console.info(`FOURTWENTY editor: layout guardado en ${LOCAL_STORAGE_KEY}. Para fijarlo en repo, exporta el JSON y reemplaza public/assets/layouts/furniture-layout.json.`);
    return true;
  } catch (error) {
    console.warn('No se pudo guardar el layout en localStorage.', error);
    return false;
  }
}

export function clearLocalLayout() {
  try {
    localStorage.removeItem(LOCAL_STORAGE_KEY);
    localStorage.removeItem(HOOP_BASE_MIGRATION_KEY);
    localStorage.removeItem(ORIGIN_RESET_MIGRATION_KEY);
    return true;
  } catch (error) {
    console.warn('No se pudo limpiar el layout local.', error);
    return false;
  }
}

export function downloadLayout(layout, filename = 'furniture-layout.json') {
  try {
    const blob = new Blob([formatLayoutJSON(layout)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    return true;
  } catch (error) {
    console.warn('No se pudo descargar el layout JSON.', error);
    return false;
  }
}

export async function copyLayoutToClipboard(layout) {
  const json = formatLayoutJSON(layout);
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(json);
      return true;
    }
  } catch (error) {
    console.warn('Clipboard API no disponible, usando fallback.', error);
  }

  try {
    const ta = document.createElement('textarea');
    ta.value = json;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand('copy');
    ta.remove();
    return ok;
  } catch (error) {
    console.warn('No se pudo copiar el layout al portapapeles.', error);
    return false;
  }
}
