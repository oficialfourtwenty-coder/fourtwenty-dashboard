const BASE_LAYOUT_URL = '/assets/layouts/furniture-layout.json';
const LOCAL_STORAGE_KEY = 'fourtwenty-editor-layout-burela-retro';
const HOOP_BASE_MIGRATION_KEY = 'fourtwenty-editor-hoop-base-all-floors-v1';
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

export async function loadInitialLayout() {
  const local = getLocalLayout();
  if (local) return migrateHoopBaseLayout(local);
  return loadBaseLayout();
}

function destinationScope(item) {
  const id = String(item?.id ?? '');
  const prefixed = id.match(/^destino-(\d+):/);
  if (prefixed) return Number(prefixed[1]);
  const elevator = id.match(/^elevator-destination-(\d+)$/);
  if (elevator) return Number(elevator[1]);
  const arcade = id.match(/^destination-(\d+)-minigame-arcade/);
  if (arcade) return Number(arcade[1]);
  if (id.startsWith('origin-minigame-arcade')) return 1;
  return null;
}

function preserveUnloadedDestinations(layout) {
  const previous = getLocalLayout();
  if (!previous) return layout;
  const loadedDestinations = new Set(layout.map(destinationScope).filter(Number.isFinite));
  const preserved = previous.filter((item) => {
    const scope = destinationScope(item);
    return Number.isFinite(scope) && !loadedDestinations.has(scope);
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
