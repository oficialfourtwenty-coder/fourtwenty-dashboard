// Panel de producto: se abre al clickear una prenda (src/interact/productClicks.js).
// Muestra imagen, nombre, descripción y precio del catálogo (productosStore) y
// el botón COMPRAR que solo REDIRIGE al link de compra de Tiendanube — el
// juego jamás procesa pagos. DOM plano, aislado: no toca cámara ni controles.

const PANEL_ID = 'ft-product-panel';
const STYLE_ID = 'ft-product-panel-style';

function injectStyles() {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    #${PANEL_ID} {
      position: fixed; inset: 0; z-index: 90; display: none;
      align-items: center; justify-content: center;
      background: rgba(6, 7, 8, 0.62);
      font-family: "Courier New", monospace; color: #f5f1e8;
    }
    #${PANEL_ID}.is-visible { display: flex; }
    #${PANEL_ID} .pp-card {
      width: min(720px, calc(100vw - 32px)); max-height: calc(100vh - 48px);
      overflow: auto; display: grid; grid-template-columns: 280px 1fr;
      background: rgba(12, 13, 15, 0.97);
      border: 1px solid rgba(255, 110, 24, 0.65);
      box-shadow: 0 24px 64px rgba(0,0,0,0.55), inset 0 0 0 1px rgba(255,255,255,0.05);
    }
    @media (max-width: 640px) { #${PANEL_ID} .pp-card { grid-template-columns: 1fr; } }
    #${PANEL_ID} .pp-media {
      min-height: 280px; background: #17181b center/cover no-repeat;
      display: flex; align-items: center; justify-content: center;
      color: rgba(245,241,232,0.35); font-size: 12px; letter-spacing: 1px;
    }
    #${PANEL_ID} .pp-body { padding: 20px 22px; display: grid; gap: 12px; align-content: start; }
    #${PANEL_ID} .pp-kicker { color: #ff6d18; font-size: 11px; letter-spacing: 2px; }
    #${PANEL_ID} .pp-name { font-size: 20px; font-weight: 900; letter-spacing: 1px; line-height: 1.25; }
    #${PANEL_ID} .pp-price { color: #39ff6a; font-size: 18px; font-weight: 900; }
    #${PANEL_ID} .pp-desc { font-size: 13px; line-height: 1.5; color: rgba(245,241,232,0.82); white-space: pre-line; }
    #${PANEL_ID} .pp-actions { margin-top: 6px; display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
    #${PANEL_ID} .pp-buy {
      min-height: 44px; padding: 10px 16px; cursor: pointer;
      font: inherit; font-weight: 900; letter-spacing: 2px; font-size: 14px;
      color: #111; background: #ff6d18; border: 1px solid #ff6d18;
    }
    #${PANEL_ID} .pp-buy:hover { background: #ff8b45; }
    #${PANEL_ID} .pp-cart {
      min-height: 44px; padding: 10px 12px; cursor: pointer;
      font: inherit; font-weight: 900; letter-spacing: 1px; font-size: 12px;
      color: #f5f1e8; background: #1f7255; border: 1px solid #4ac48e;
    }
    #${PANEL_ID} .pp-cart:hover { background: #278a68; }
    #${PANEL_ID} .pp-buy[disabled], #${PANEL_ID} .pp-cart[disabled] { opacity: 0.4; cursor: not-allowed; }
    #${PANEL_ID} .pp-hint { font-size: 11px; color: rgba(245,241,232,0.5); }
    #${PANEL_ID} .pp-close {
      position: absolute; top: 10px; right: 12px; cursor: pointer;
      font: inherit; font-size: 18px; font-weight: 900; line-height: 1;
      color: #f5f1e8; background: transparent; border: 0; padding: 8px;
    }
    #${PANEL_ID} .pp-cardwrap { position: relative; }
    @media (max-width: 440px) { #${PANEL_ID} .pp-actions { grid-template-columns: 1fr; } }
  `;
  document.head.appendChild(style);
}

function precioTexto(producto) {
  const n = Number(producto.precio);
  if (!producto.precio || Number.isNaN(n)) return '';
  return `$ ${n.toLocaleString('es-AR')} ${producto.moneda ?? ''}`.trim();
}

export function createProductPanel({ onAddToCart = () => false } = {}) {
  injectStyles();
  const root = document.createElement('div');
  root.id = PANEL_ID;
  root.innerHTML = `
    <div class="pp-cardwrap">
      <div class="pp-card">
        <div class="pp-media" data-field="media"></div>
        <div class="pp-body">
          <div class="pp-kicker" data-field="kicker"></div>
          <div class="pp-name" data-field="name"></div>
          <div class="pp-price" data-field="price"></div>
          <div class="pp-desc" data-field="desc"></div>
          <div class="pp-actions">
            <button type="button" class="pp-cart" data-field="cart">AGREGAR AL CARRITO</button>
            <button type="button" class="pp-buy" data-field="buy">COMPRAR</button>
          </div>
          <div class="pp-hint" data-field="hint"></div>
        </div>
      </div>
      <button type="button" class="pp-close" data-field="close" aria-label="Cerrar">✕</button>
    </div>
  `;
  document.body.appendChild(root);

  const el = (name) => root.querySelector(`[data-field="${name}"]`);
  let currentLink = '';
  let currentProduct = null;
  let cartFeedbackTimer = 0;

  function hide() {
    window.clearTimeout(cartFeedbackTimer);
    root.classList.remove('is-visible');
  }

  // click en el fondo oscuro (no en la tarjeta) cierra
  root.addEventListener('click', (e) => {
    if (e.target === root) hide();
  });
  el('close').addEventListener('click', hide);
  window.addEventListener('keydown', (e) => {
    if (e.code === 'Escape' && root.classList.contains('is-visible')) hide();
  });
  el('buy').addEventListener('click', () => {
    // Solo redirigimos al checkout/página real de Tiendanube. Nada de pagos acá.
    if (currentLink) window.open(currentLink, '_blank', 'noopener');
  });
  el('cart').addEventListener('click', () => {
    if (!currentProduct || !onAddToCart(currentProduct)) return;
    window.clearTimeout(cartFeedbackTimer);
    el('cart').textContent = 'AGREGADO';
    cartFeedbackTimer = window.setTimeout(() => { el('cart').textContent = 'AGREGAR AL CARRITO'; }, 900);
  });

  function show({ producto, coleccion, slotIndex }) {
    window.clearTimeout(cartFeedbackTimer);
    el('cart').textContent = 'AGREGAR AL CARRITO';
    const kicker = coleccion ? `FOURTWENTY · ${coleccion.nombre}` : 'FOURTWENTY';
    el('kicker').textContent = kicker;
    if (!producto) {
      el('media').style.backgroundImage = '';
      el('media').textContent = 'SIN FOTO';
      el('name').textContent = 'Prenda sin cargar';
      el('price').textContent = '';
      el('desc').textContent = `Todavía no hay un producto cargado para esta percha (lugar ${(slotIndex ?? 0) + 1}).`;
      el('hint').textContent = 'Cargalo desde el panel de administración (tecla P).';
      currentLink = '';
      currentProduct = null;
      el('buy').disabled = true;
      el('cart').disabled = true;
    } else {
      if (producto.imagen) {
        el('media').style.backgroundImage = `url("${producto.imagen}")`;
        el('media').textContent = '';
      } else {
        el('media').style.backgroundImage = '';
        el('media').textContent = 'SIN FOTO';
      }
      el('name').textContent = producto.nombre || 'Prenda sin nombre';
      el('price').textContent = precioTexto(producto);
      el('desc').textContent = producto.descripcion || '';
      currentLink = producto.link || '';
      currentProduct = producto;
      el('buy').disabled = !currentLink;
      el('cart').disabled = false;
      el('hint').textContent = currentLink
        ? 'Comprar abre la página del producto en la tienda (Tiendanube).'
        : 'Sin link de compra: cargalo en el panel de administración (tecla P).';
    }
    root.classList.add('is-visible');
  }

  return {
    show,
    hide,
    isOpen: () => root.classList.contains('is-visible'),
  };
}
