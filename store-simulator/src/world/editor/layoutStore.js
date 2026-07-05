const BASE_LAYOUT_URL = '/assets/layouts/furniture-layout.json';
const LOCAL_STORAGE_KEY = 'fourtwenty-editor-layout';

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
    return parseLayoutJSON(raw, 'fourtwenty-editor-layout localStorage');
  } catch (error) {
    console.warn('No se pudo leer fourtwenty-editor-layout desde localStorage.', error);
    return null;
  }
}

export async function loadInitialLayout() {
  const local = getLocalLayout();
  if (local) return local;
  return loadBaseLayout();
}

export function saveLocalLayout(layout) {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, formatLayoutJSON(layout));
    console.info('FOURTWENTY editor: layout guardado en localStorage. Para fijarlo en repo, exporta el JSON y reemplaza public/assets/layouts/furniture-layout.json.');
    return true;
  } catch (error) {
    console.warn('No se pudo guardar el layout en localStorage.', error);
    return false;
  }
}

export function clearLocalLayout() {
  try {
    localStorage.removeItem(LOCAL_STORAGE_KEY);
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
