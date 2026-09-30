// Panel de ADMINISTRACIÓN de prendas (para el dueño, sin programar):
// tecla P (en dev; en el build online agregar ?admin=1 a la URL — los
// visitantes normales no lo ven nunca). Lista las prendas por piso y deja
// cargar/editar imagen, nombre, descripción, precio y link de cada una.
//
// Guardado: TODO cambio se guarda solo (debounce) vía productosStore →
// localStorage siempre + el archivo real public/assets/data/productos.json
// cuando corre `npm run dev`. También: Exportar/Importar JSON y botón
// Sincronizar Tiendanube (si hay credenciales en el .env, llena este mismo
// catálogo con los productos reales — mismo formato, cero cambios visuales).
import {
  getProductos,
  saveProductos,
  reloadFromFile,
  exportProductos,
  importProductos,
  productoVacio,
  onProductosChange,
  notifyProductosChange,
} from '../data/productosStore.js';
import { getTnStatus, syncTiendanube } from '../integrations/tiendanube/client.js';
import { leerImagen } from './estampaImagen.js';

const PANEL_ID = 'ft-admin-panel';
const STYLE_ID = 'ft-admin-panel-style';

function injectStyles() {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    #${PANEL_ID} {
      position: fixed; top: 0; left: 0; bottom: 0; z-index: 95;
      width: min(460px, 100vw); display: none; flex-direction: column;
      color: #f5f1e8; background: rgba(10, 11, 12, 0.97);
      border-right: 1px solid rgba(57, 255, 106, 0.5);
      box-shadow: 12px 0 48px rgba(0,0,0,0.45);
      font-family: "Courier New", monospace; font-size: 12px; line-height: 1.4;
    }
    #${PANEL_ID}.is-visible { display: flex; }
    #${PANEL_ID} * { box-sizing: border-box; }
    #${PANEL_ID} .ap-head { padding: 14px 16px 10px; border-bottom: 1px solid rgba(255,255,255,0.09); }
    #${PANEL_ID} .ap-title { color: #39ff6a; font-weight: 900; letter-spacing: 2px; font-size: 13px; }
    #${PANEL_ID} .ap-sub { margin-top: 5px; color: rgba(245,241,232,0.6); font-size: 11px; }
    #${PANEL_ID} .ap-body { flex: 1; overflow: auto; padding: 12px 16px 20px; }
    #${PANEL_ID} .ap-col { margin-bottom: 16px; border: 1px solid rgba(255,255,255,0.1); }
    #${PANEL_ID} .ap-col-head {
      display: flex; align-items: center; justify-content: space-between; gap: 8px;
      padding: 9px 10px; cursor: pointer; background: rgba(255,255,255,0.05);
    }
    #${PANEL_ID} .ap-col-name { font-weight: 900; letter-spacing: 1.5px; color: #ff6d18; }
    #${PANEL_ID} .ap-col-count { color: rgba(245,241,232,0.55); font-size: 11px; }
    #${PANEL_ID} .ap-col-body { padding: 10px; display: none; }
    #${PANEL_ID} .ap-col.is-open .ap-col-body { display: block; }
    #${PANEL_ID} .ap-cat { display: flex; gap: 6px; align-items: center; margin-bottom: 10px; }
    #${PANEL_ID} .ap-cat label { color: rgba(245,241,232,0.6); font-size: 10px; white-space: nowrap; }
    #${PANEL_ID} .ap-prod { margin-bottom: 10px; padding: 9px; border: 1px solid rgba(255,255,255,0.12); background: rgba(255,255,255,0.03); }
    #${PANEL_ID} .ap-prod-head { display: flex; justify-content: space-between; gap: 8px; margin-bottom: 8px; align-items: center; }
    #${PANEL_ID} .ap-prod-n { color: #39ff6a; font-weight: 900; }
    #${PANEL_ID} .ap-field { margin-bottom: 6px; }
    #${PANEL_ID} .ap-field label { display: block; color: rgba(245,241,232,0.6); font-size: 10px; letter-spacing: 1px; text-transform: uppercase; margin-bottom: 2px; }
    #${PANEL_ID} input, #${PANEL_ID} textarea {
      width: 100%; min-height: 28px; padding: 5px 7px; font: inherit;
      color: #f5f1e8; background: rgba(0,0,0,0.4); border: 1px solid rgba(255,255,255,0.16);
    }
    #${PANEL_ID} textarea { min-height: 56px; resize: vertical; }
    #${PANEL_ID} input:focus, #${PANEL_ID} textarea:focus { outline: 1px solid #39ff6a; border-color: #39ff6a; }
    #${PANEL_ID} button {
      min-height: 30px; padding: 6px 10px; cursor: pointer; font: inherit;
      color: #f5f1e8; background: rgba(255,255,255,0.07); border: 1px solid rgba(255,255,255,0.16);
      text-transform: uppercase; letter-spacing: 1px; font-size: 11px;
    }
    #${PANEL_ID} button:hover { border-color: #39ff6a; background: rgba(57,255,106,0.12); }
    #${PANEL_ID} button.ap-danger:hover { border-color: #ff4b4b; background: rgba(255,75,75,0.12); }
    #${PANEL_ID} .ap-row { display: flex; gap: 6px; flex-wrap: wrap; }
    #${PANEL_ID} .ap-img-preview {
      width: 54px; height: 54px; flex: none; background: #17181b center/cover no-repeat;
      border: 1px solid rgba(255,255,255,0.14); display: flex; align-items: center;
      justify-content: center; color: rgba(245,241,232,0.3); font-size: 9px;
    }
    #${PANEL_ID} .ap-est-preview {
      width: 54px; height: 54px; flex: none; border: 1px solid rgba(255,255,255,0.14);
      display: flex; align-items: center; justify-content: center;
      color: rgba(245,241,232,0.3); font-size: 8px; letter-spacing: 1px;
      background-color: #17181b; background-position: center; background-size: contain;
      background-repeat: no-repeat;
    }
    /* damero: lo que se ve a cuadros es lo que quedo transparente */
    #${PANEL_ID} .ap-est-preview:not([style]) { background-image:
      linear-gradient(45deg, #24262a 25%, transparent 25%, transparent 75%, #24262a 75%),
      linear-gradient(45deg, #24262a 25%, transparent 25%, transparent 75%, #24262a 75%);
      background-size: 10px 10px; background-position: 0 0, 5px 5px; }
    #${PANEL_ID} .ap-est-nota { font-size: 10px; color: rgba(245,241,232,0.5); margin-top: 3px; line-height: 1.4; }
    #${PANEL_ID} .ap-est-nota button { padding: 0 5px; font-size: 10px; min-height: 0; }
    #${PANEL_ID} .ap-foot { padding: 10px 16px 14px; border-top: 1px solid rgba(255,255,255,0.09); display: grid; gap: 8px; }
    #${PANEL_ID} .ap-status { min-height: 16px; font-size: 11px; color: rgba(245,241,232,0.65); }
    #${PANEL_ID} .ap-tn { font-size: 11px; }
    #${PANEL_ID} .ap-tn .ok { color: #39ff6a; }
    #${PANEL_ID} .ap-tn .no { color: #ffb020; }
    #${PANEL_ID} .ap-close { position: absolute; top: 8px; right: 10px; border: 0 !important; background: transparent !important; font-size: 16px; }
  `;
  document.head.appendChild(style);
}

function isTyping(target) {
  return target?.matches?.('input, textarea, select, [contenteditable="true"]');
}

export function initAdminPanel({ isBlocked = () => false } = {}) {
  const params = new URLSearchParams(location.search);
  const allowed = import.meta.env.DEV || params.get('admin') === '1';
  if (!allowed) return { isOpen: () => false, toggle: () => {} };

  injectStyles();
  const root = document.createElement('div');
  root.id = PANEL_ID;
  root.innerHTML = `
    <div class="ap-head">
      <div class="ap-title">FOURTWENTY · ADMIN DE PRENDAS</div>
      <div class="ap-sub">Tecla P abre/cierra · los cambios se guardan solos · cada prenda de la lista es una percha del juego, en orden</div>
      <button type="button" class="ap-close" data-action="close" aria-label="Cerrar">✕</button>
    </div>
    <div class="ap-body" data-field="body"></div>
    <div class="ap-foot">
      <div class="ap-tn" data-field="tn">Tiendanube: consultando…</div>
      <div class="ap-row">
        <button type="button" data-action="sync">Sincronizar Tiendanube</button>
        <button type="button" data-action="export">Exportar JSON</button>
        <button type="button" data-action="import">Importar JSON</button>
      </div>
      <input type="file" accept="application/json,.json" data-field="file" style="display:none">
      <div class="ap-status" data-field="status"></div>
    </div>
  `;
  document.body.appendChild(root);

  const el = (name) => root.querySelector(`[data-field="${name}"]`);
  const statusEl = el('status');
  const openCols = new Set(['local']); // el local arranca desplegado

  let saveTimer = 0;
  function setStatus(msg) { statusEl.textContent = msg ?? ''; }

  function scheduleSave() {
    clearTimeout(saveTimer);
    saveTimer = window.setTimeout(async () => {
      const r = await saveProductos();
      setStatus(r.file
        ? 'Guardado en productos.json ✔ (commiteá el archivo para publicarlo)'
        : 'Guardado local ✔ — para publicar: Exportar JSON y reemplazar productos.json (o guardá corriendo npm run dev)');
    }, 500);
  }

  // ---- render ---------------------------------------------------------------
  function fieldHtml(colId, prodIdx, key, label, value, { textarea = false, placeholder = '' } = {}) {
    const common = `data-col="${colId}" data-idx="${prodIdx}" data-key="${key}" placeholder="${placeholder}"`;
    return `<div class="ap-field"><label>${label}</label>${
      textarea
        ? `<textarea ${common}>${value ?? ''}</textarea>`
        : `<input type="text" ${common} value="${String(value ?? '').replace(/"/g, '&quot;')}">`
    }</div>`;
  }

  function render() {
    const data = getProductos();
    el('body').innerHTML = data.colecciones.map((col) => `
      <div class="ap-col ${openCols.has(col.id) ? 'is-open' : ''}" data-col-id="${col.id}">
        <div class="ap-col-head" data-action="toggle-col" data-col="${col.id}">
          <span class="ap-col-name">${col.piso === 'local' ? '' : `PISO ${col.piso} · `}${col.nombre}</span>
          <span class="ap-col-count">${col.productos.length} prenda${col.productos.length === 1 ? '' : 's'} ${openCols.has(col.id) ? '▾' : '▸'}</span>
        </div>
        <div class="ap-col-body">
          <div class="ap-cat">
            <label>Categoría Tiendanube:</label>
            <input type="text" data-col="${col.id}" data-key="categoriaTN" value="${String(col.categoriaTN ?? '').replace(/"/g, '&quot;')}" placeholder="nombre o ID de la categoría (para el sync)">
          </div>
          ${col.productos.map((p, i) => `
            <div class="ap-prod">
              <div class="ap-prod-head">
                <span class="ap-prod-n">PERCHA ${i + 1}${p.productId ? ` · TN #${p.productId}` : ''}</span>
                <span class="ap-row">
                  <label style="display:flex;align-items:center;gap:4px;font-size:10px;color:rgba(245,241,232,0.6)">
                    <input type="checkbox" style="width:auto;min-height:0" data-col="${col.id}" data-idx="${i}" data-key="activo" ${p.activo !== false ? 'checked' : ''}> visible
                  </label>
                  <button type="button" class="ap-danger" data-action="del" data-col="${col.id}" data-idx="${i}">Borrar</button>
                </span>
              </div>
              <div class="ap-row" style="margin-bottom:6px">
                <div class="ap-img-preview" ${p.imagen ? `style="background-image:url('${p.imagen.replace(/'/g, '')}')"` : ''}>${p.imagen ? '' : 'FOTO'}</div>
                <div style="flex:1;min-width:200px">${fieldHtml(col.id, i, 'imagen', 'Imagen (URL)', p.imagen, { placeholder: 'https://…' })}</div>
              </div>
              <div class="ap-row ap-estampa" style="margin-bottom:6px">
                <div class="ap-est-preview" ${p.estampa ? `style="background-image:url('${p.estampa.replace(/'/g, '')}')"` : ''}>${p.estampa ? '' : 'ESTAMPA'}</div>
                <div style="flex:1;min-width:200px">
                  <label>Estampa de la prenda 3D (PNG del diseño)</label>
                  <input type="file" accept="image/*" data-action="estampa" data-col="${col.id}" data-idx="${i}">
                  <div class="ap-est-nota">${p.estampa
                    ? `${p.estampa} · <button type="button" class="ap-danger" data-action="del-estampa" data-col="${col.id}" data-idx="${i}">Quitar</button>`
                    : 'Se le saca el fondo y el margen solos. Es el diseño que va sobre la remera del perchero, no la foto del producto.'}</div>
                </div>
              </div>
              ${fieldHtml(col.id, i, 'nombre', 'Nombre', p.nombre)}
              ${fieldHtml(col.id, i, 'precio', 'Precio (solo números)', p.precio, { placeholder: '25000' })}
              ${fieldHtml(col.id, i, 'link', 'Link de compra (Tiendanube)', p.link, { placeholder: 'https://tutienda.mitiendanube.com/productos/…' })}
              ${fieldHtml(col.id, i, 'descripcion', 'Descripción', p.descripcion, { textarea: true })}
            </div>
          `).join('')}
          <button type="button" data-action="add" data-col="${col.id}">+ Agregar prenda</button>
        </div>
      </div>
    `).join('');
  }

  // ---- eventos ---------------------------------------------------------------
  root.addEventListener('input', (e) => {
    const t = e.target;
    const colId = t.dataset.col;
    if (!colId || !t.dataset.key) return;
    const data = getProductos();
    const col = data.colecciones.find((c) => c.id === colId);
    if (!col) return;
    if (t.dataset.idx === undefined) {
      // campo de la colección (categoriaTN)
      col[t.dataset.key] = t.value;
    } else {
      const p = col.productos[Number(t.dataset.idx)];
      if (!p) return;
      p[t.dataset.key] = t.type === 'checkbox' ? t.checked : t.value;
      if (t.dataset.key === 'imagen') {
        const preview = t.closest('.ap-prod')?.querySelector('.ap-img-preview');
        if (preview) {
          preview.style.backgroundImage = t.value ? `url('${t.value.replace(/'/g, '')}')` : '';
          preview.textContent = t.value ? '' : 'FOTO';
        }
      }
      if (t.dataset.key === 'imagen' || t.dataset.key === 'activo') notifyProductosChange();
    }
    scheduleSave();
  });

  // Subida de la estampa. Se procesa con el MISMO codigo que el editor de
  // prenda (quita el fondo y recorta el margen) y despues se guarda como
  // archivo real del repo via /api/estampa. Si ese endpoint no existe —o sea,
  // en el build publicado— se cae al dataURL, que anda pero no se puede
  // commitear y ocupa lugar en el navegador.
  root.addEventListener('change', async (e) => {
    const input = e.target;
    if (input.dataset.action !== 'estampa') return;
    const file = input.files?.[0];
    if (!file) return;
    const data = getProductos();
    const col = data.colecciones.find((c) => c.id === input.dataset.col);
    const p = col?.productos?.[Number(input.dataset.idx)];
    if (!p) return;

    setStatus('Procesando la estampa…');
    try {
      const { url, recorte, margen } = await leerImagen(file);
      const nombre = `${col.id}-${Number(input.dataset.idx) + 1}-${p.nombre || 'estampa'}`;
      let ruta = url;
      let enArchivo = false;
      try {
        const r = await fetch('/api/estampa', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ nombre, dataUrl: url }),
        });
        if (r.ok) { ruta = (await r.json()).ruta; enArchivo = true; }
      } catch {
        // sin servidor de desarrollo: queda el dataURL
      }
      p.estampa = ruta;
      render();
      notifyProductosChange();
      scheduleSave();
      const detalle = margen ? ` (se recorto ${margen}% de margen vacio)` : '';
      const aviso = recorte.quitado ? 'Estampa cargada' : `Estampa cargada SIN quitarle el fondo: ${recorte.motivo}`;
      setStatus(enArchivo
        ? `${aviso}${detalle} → ${ruta} · commitea la carpeta assets/estampas/`
        : `${aviso}${detalle} · sin npm run dev queda guardada en el navegador, no en el repo`);
    } catch (error) {
      setStatus(`No se pudo cargar la estampa: ${error.message}`);
    }
  });

  root.addEventListener('click', async (e) => {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;
    const action = btn.dataset.action;
    const data = getProductos();

    if (action === 'close') { hide(); return; }
    if (action === 'toggle-col') {
      const id = btn.dataset.col;
      openCols.has(id) ? openCols.delete(id) : openCols.add(id);
      render();
      return;
    }
    if (action === 'add') {
      const col = data.colecciones.find((c) => c.id === btn.dataset.col);
      col.productos.push(productoVacio(col.id, col.productos.length + 1));
      openCols.add(col.id);
      render();
      scheduleSave();
      return;
    }
    if (action === 'del') {
      const col = data.colecciones.find((c) => c.id === btn.dataset.col);
      col.productos.splice(Number(btn.dataset.idx), 1);
      render();
      scheduleSave();
      return;
    }
    if (action === 'del-estampa') {
      const col = data.colecciones.find((c) => c.id === btn.dataset.col);
      const p = col?.productos?.[Number(btn.dataset.idx)];
      if (p) { p.estampa = ''; render(); notifyProductosChange(); scheduleSave(); }
      return;
    }
    if (action === 'export') { exportProductos(); setStatus('productos.json descargado.'); return; }
    if (action === 'import') { el('file').click(); return; }
    if (action === 'sync') {
      setStatus('Sincronizando con Tiendanube…');
      btn.disabled = true;
      const r = await syncTiendanube();
      btn.disabled = false;
      if (!r.ok) { setStatus(`Sync: ${r.motivo}`); return; }
      await reloadFromFile();
      render();
      const detalle = (r.resumen ?? []).filter((x) => x.estado.includes('sincronizada')).map((x) => `${x.coleccion}: ${x.cantidad}`).join(' · ');
      setStatus(`Sync ✔ ${r.totalTN} productos leídos. ${detalle || 'Ninguna colección tenía categoría con matches.'}`);
      return;
    }
  });

  el('file').addEventListener('change', async () => {
    const file = el('file').files?.[0];
    if (!file) return;
    try {
      await importProductos(file);
      render();
      setStatus('JSON importado y guardado.');
    } catch (err) {
      setStatus(`No se pudo importar: ${err.message}`);
    }
    el('file').value = '';
  });

  // que el juego no reciba las teclas mientras se tipea en el panel
  root.addEventListener('keydown', (e) => e.stopPropagation());
  root.addEventListener('pointerdown', (e) => e.stopPropagation());

  onProductosChange(() => { if (root.classList.contains('is-visible')) refreshTnLine(); });

  async function refreshTnLine() {
    const tn = el('tn');
    const st = await getTnStatus();
    if (!st.disponible) {
      tn.innerHTML = 'Tiendanube: <span class="no">sync disponible solo corriendo npm run dev</span> (mientras tanto: carga manual, que es esta pantalla)';
    } else if (st.configurado) {
      tn.innerHTML = `Tiendanube: <span class="ok">credenciales OK</span> · tienda #${st.storeId}`;
    } else {
      tn.innerHTML = 'Tiendanube: <span class="no">sin credenciales</span> — ver .env.example (el juego funciona igual con esta carga manual)';
    }
  }

  function show() {
    render();
    refreshTnLine();
    root.classList.add('is-visible');
  }
  function hide() {
    clearTimeout(saveTimer);
    saveProductos(); // flush final por si quedó un cambio sin guardar
    root.classList.remove('is-visible');
  }
  function toggle() {
    root.classList.contains('is-visible') ? hide() : show();
  }

  window.addEventListener('keydown', (e) => {
    if (e.code !== 'KeyP' || isTyping(e.target) || e.metaKey || e.ctrlKey) return;
    if (isBlocked()) return; // p.ej. editor de mundo activo (usa P para "padre")
    toggle();
  });

  return {
    isOpen: () => root.classList.contains('is-visible'),
    toggle,
  };
}
