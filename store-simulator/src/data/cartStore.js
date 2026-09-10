// Carrito local del simulador. Vive fuera de las escenas 3D para conservarse
// al viajar en ascensor y persiste en este navegador mediante localStorage.
const STORAGE_KEY = 'fourtwenty-cart-v1';

function productKey(product) {
  const value = product?.id ?? product?.productId ?? product?.link ?? product?.nombre;
  return value === null || value === undefined || value === '' ? '' : String(value);
}

function snapshot(product) {
  const key = productKey(product);
  if (!key) return null;
  return {
    key,
    id: product.id ?? null,
    productId: product.productId ?? null,
    nombre: product.nombre || 'Prenda sin nombre',
    precio: product.precio ?? '',
    moneda: product.moneda || 'ARS',
    imagen: product.imagen || '',
    link: product.link || '',
    cantidad: 1,
  };
}

function loadItems() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((item) => {
        const clean = snapshot(item);
        if (!clean) return null;
        clean.cantidad = Math.max(1, Math.floor(Number(item.cantidad) || 1));
        return clean;
      })
      .filter(Boolean);
  } catch (error) {
    console.warn('[cart] no se pudo leer el carrito guardado.', error);
    return [];
  }
}

export function createCartStore() {
  let items = loadItems();
  const listeners = new Set();

  function getState() {
    const copies = items.map((item) => ({ ...item }));
    return {
      items: copies,
      count: copies.reduce((sum, item) => sum + item.cantidad, 0),
      total: copies.reduce((sum, item) => {
        const price = Number(item.precio);
        return sum + (Number.isFinite(price) ? price * item.cantidad : 0);
      }, 0),
      moneda: copies.find((item) => item.moneda)?.moneda || 'ARS',
    };
  }

  function persist() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch (error) {
      console.warn('[cart] no se pudo guardar el carrito.', error);
    }
  }

  function notify() {
    persist();
    const state = getState();
    for (const listener of listeners) {
      try { listener(state); } catch (error) { console.warn('[cart] listener fallo.', error); }
    }
  }

  function add(product) {
    const next = snapshot(product);
    if (!next) return false;
    const existing = items.find((item) => item.key === next.key);
    if (existing) existing.cantidad += 1;
    else items.push(next);
    notify();
    return true;
  }

  function setQuantity(key, quantity) {
    const item = items.find((candidate) => candidate.key === String(key));
    if (!item) return false;
    const next = Math.floor(Number(quantity));
    if (!Number.isFinite(next) || next <= 0) {
      items = items.filter((candidate) => candidate !== item);
    } else {
      item.cantidad = next;
    }
    notify();
    return true;
  }

  function remove(key) {
    const before = items.length;
    items = items.filter((item) => item.key !== String(key));
    if (items.length === before) return false;
    notify();
    return true;
  }

  function clear() {
    if (!items.length) return;
    items = [];
    notify();
  }

  return {
    getState,
    add,
    setQuantity,
    remove,
    clear,
    subscribe(listener) {
      listeners.add(listener);
      listener(getState());
      return () => listeners.delete(listener);
    },
  };
}
