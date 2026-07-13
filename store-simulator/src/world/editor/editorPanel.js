const PANEL_ID = 'ft-world-editor';
const STYLE_ID = 'ft-world-editor-style';

function injectStyles() {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    #${PANEL_ID} {
      position: fixed; top: 14px; right: 14px; z-index: 100;
      width: min(360px, calc(100vw - 28px)); max-height: calc(100vh - 28px);
      box-sizing: border-box; overflow: auto; display: none;
      color: #f5f1e8; background: rgba(10, 11, 12, 0.92);
      border: 1px solid rgba(255, 110, 24, 0.55);
      box-shadow: 0 16px 48px rgba(0,0,0,0.38), inset 0 0 0 1px rgba(255,255,255,0.05);
      font-family: "Courier New", monospace; font-size: 12px; line-height: 1.35;
      backdrop-filter: blur(10px);
    }
    #${PANEL_ID}.is-visible { display: block; }
    #${PANEL_ID} * { box-sizing: border-box; }
    #${PANEL_ID} .we-head { padding: 14px 14px 10px; border-bottom: 1px solid rgba(255,255,255,0.09); }
    #${PANEL_ID} .we-title { color: #ff6d18; font-weight: 900; letter-spacing: 2px; font-size: 13px; }
    #${PANEL_ID} .we-sub { margin-top: 6px; color: rgba(245,241,232,0.62); font-size: 11px; }
    #${PANEL_ID} .we-body { padding: 12px 14px 14px; display: grid; gap: 12px; }
    #${PANEL_ID} .we-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; }
    #${PANEL_ID} .we-row { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
    #${PANEL_ID} .we-pill { color: #ff6d18; font-weight: 900; }
    #${PANEL_ID} .we-section { padding-top: 10px; border-top: 1px solid rgba(255,255,255,0.09); }
    #${PANEL_ID} .we-label { margin-bottom: 6px; color: rgba(245,241,232,0.72); letter-spacing: 1px; text-transform: uppercase; font-size: 10px; }
    #${PANEL_ID} button {
      min-height: 30px; padding: 6px 8px; border: 1px solid rgba(255,255,255,0.15);
      color: #f5f1e8; background: rgba(255,255,255,0.06); cursor: pointer;
      font: inherit; text-transform: uppercase; letter-spacing: 0.5px;
    }
    #${PANEL_ID} button:hover { border-color: rgba(255, 110, 24, 0.75); background: rgba(255,110,24,0.12); }
    #${PANEL_ID} button.is-active { color: #111; background: #ff6d18; border-color: #ff6d18; font-weight: 900; }
    #${PANEL_ID} input {
      width: 100%; min-height: 28px; padding: 5px 6px;
      color: #f5f1e8; background: rgba(0,0,0,0.35);
      border: 1px solid rgba(255,255,255,0.16); font: inherit;
    }
    #${PANEL_ID} input:focus { outline: 1px solid #ff6d18; border-color: #ff6d18; }
    #${PANEL_ID} [hidden] { display: none !important; }
    #${PANEL_ID} .we-color-row {
      display: grid; grid-template-columns: 48px minmax(0, 1fr); gap: 8px; align-items: center;
    }
    #${PANEL_ID} input[type="color"] {
      width: 48px; height: 34px; min-height: 34px; padding: 3px; cursor: pointer;
    }
    #${PANEL_ID} input:disabled { cursor: not-allowed; opacity: 0.38; }
    #${PANEL_ID} .we-color-note { margin-top: 6px; color: rgba(245,241,232,0.55); font-size: 10px; }
    #${PANEL_ID} .we-object-list { display: grid; gap: 5px; max-height: 200px; overflow: auto; margin-top: 6px; }
    #${PANEL_ID} .we-object {
      width: 100%; text-align: left; text-transform: none; letter-spacing: 0;
      display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
    }
    #${PANEL_ID} .we-object small { color: rgba(245,241,232,0.52); }
    #${PANEL_ID} .we-selected {
      min-height: 48px; padding: 8px; background: rgba(255,255,255,0.045);
      border: 1px solid rgba(255,255,255,0.08); overflow-wrap: anywhere;
    }
    #${PANEL_ID} .we-status { color: rgba(245,241,232,0.62); font-size: 11px; min-height: 16px; }
  `;
  document.head.appendChild(style);
}

function stopCanvasEvent(event) {
  event.stopPropagation();
}

function button(label, action) {
  return `<button type="button" data-action="${action}">${label}</button>`;
}

function inputRow(group, values = [0, 0, 0]) {
  return `
    <div class="we-grid">
      ${['x', 'y', 'z'].map((axis, index) => `
        <input type="number" step="0.01" data-transform="${group}" data-index="${index}" aria-label="${group} ${axis}" value="${values[index] ?? 0}">
      `).join('')}
    </div>
  `;
}

export function createEditorPanel(callbacks = {}) {
  injectStyles();
  const root = document.createElement('div');
  root.id = PANEL_ID;
  root.innerHTML = `
    <div class="we-head">
      <div class="we-title">FOURTWENTY WORLD EDITOR</div>
      <div class="we-sub">T/Tab ON-OFF · 1 move · 2 rotate · 3 scale · Q space · G snap<br>
      Ctrl+C copiar · Ctrl+V pegar · Ctrl+D duplicar · Supr borrar · P grupo padre</div>
    </div>
    <div class="we-body">
      <div class="we-row"><span>Estado</span><span class="we-pill" data-field="enabled">OFF</span></div>
      <div class="we-row"><span>Modo</span><span class="we-pill" data-field="mode">translate</span></div>
      <div class="we-row"><span>Space</span><span class="we-pill" data-field="space">world</span></div>
      <div class="we-row"><span>Snapping</span><span class="we-pill" data-field="snapping">OFF</span></div>

      <div class="we-selected" data-field="selected">Sin objeto seleccionado</div>

      <div class="we-section" data-field="colorSection" hidden>
        <div class="we-label">Color del objeto</div>
        <div class="we-color-row">
          <input type="color" data-field="colorPicker" value="#ffffff" aria-label="Elegir color del objeto">
          <input type="text" data-field="colorHex" value="#ffffff" maxlength="7" spellcheck="false" aria-label="Color hexadecimal">
        </div>
        <div class="we-color-note" data-field="colorNote"></div>
      </div>

      <div class="we-section">
        <div class="we-label">Objects <span data-field="objectCount"></span></div>
        <input type="text" data-field="filter" placeholder="filtrar por nombre…" autocomplete="off" spellcheck="false">
        <div class="we-object-list" data-field="objectList"></div>
      </div>

      <div class="we-section">
        <div class="we-label">Transform</div>
        <div class="we-grid">
          ${button('Move', 'mode:translate')}
          ${button('Rotate', 'mode:rotate')}
          ${button('Scale', 'mode:scale')}
          ${button('World/Local', 'space')}
          ${button('Snap', 'snap')}
          ${button('Deselect', 'deselect')}
          ${button('Duplicate', 'duplicate')}
          ${button('Delete', 'delete')}
          ${button('Parent', 'parent')}
          ${button('Show/Hide', 'visible')}
        </div>
      </div>

      <div class="we-section">
        <div class="we-label">Add</div>
        <div class="we-grid">
          ${button('Cantero', 'add:cantero')}
          ${button('Building GLB', 'add:apartment-building')}
        </div>
      </div>

      <div class="we-section">
        <div class="we-label">Position</div>
        ${inputRow('position')}
      </div>
      <div class="we-section">
        <div class="we-label">Rotation</div>
        ${inputRow('rotation')}
      </div>
      <div class="we-section">
        <div class="we-label">Scale</div>
        ${inputRow('scale', [1, 1, 1])}
      </div>

      <div class="we-section">
        <div class="we-label">Layout</div>
        <div class="we-grid">
          ${button('Save Local', 'save')}
          ${button('Copy JSON', 'copy')}
          ${button('Download', 'download')}
          ${button('Reset File', 'reset')}
          ${button('Clear Local', 'clear')}
          ${button('Import JSON', 'import')}
        </div>
        <input type="file" accept="application/json,.json" data-field="fileInput" style="display:none">
      </div>

      <div class="we-status" data-field="status"></div>
    </div>
  `;

  root.addEventListener('pointerdown', stopCanvasEvent);
  root.addEventListener('click', stopCanvasEvent);
  root.addEventListener('wheel', stopCanvasEvent);
  document.body.appendChild(root);

  const fields = {
    enabled: root.querySelector('[data-field="enabled"]'),
    mode: root.querySelector('[data-field="mode"]'),
    space: root.querySelector('[data-field="space"]'),
    snapping: root.querySelector('[data-field="snapping"]'),
    selected: root.querySelector('[data-field="selected"]'),
    objectList: root.querySelector('[data-field="objectList"]'),
    objectCount: root.querySelector('[data-field="objectCount"]'),
    filter: root.querySelector('[data-field="filter"]'),
    status: root.querySelector('[data-field="status"]'),
    fileInput: root.querySelector('[data-field="fileInput"]'),
    colorSection: root.querySelector('[data-field="colorSection"]'),
    colorPicker: root.querySelector('[data-field="colorPicker"]'),
    colorHex: root.querySelector('[data-field="colorHex"]'),
    colorNote: root.querySelector('[data-field="colorNote"]'),
  };

  // lista con filtro: con TODO el mundo registrado son cientos de objetos
  const MAX_LIST = 400;
  let lastObjects = [];
  let lastSelectedId = null;

  function searchableText(value) {
    return String(value ?? '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, ' ')
      .trim();
  }

  function renderObjectList() {
    const terms = searchableText(fields.filter.value).split(/\s+/).filter(Boolean);
    const filtered = terms.length
      ? lastObjects.filter((obj) => {
        const haystack = searchableText(obj.name);
        return terms.every((term) => haystack.includes(term));
      })
      : lastObjects;
    fields.objectCount.textContent = `(${filtered.length}/${lastObjects.length})`;
    const shown = filtered.slice(0, MAX_LIST);
    fields.objectList.innerHTML = shown.length
      ? shown.map((obj) => `
        <button type="button" class="we-object ${obj.id === lastSelectedId ? 'is-active' : ''}" data-object-id="${obj.id}">
          ${obj.name}${obj.effectiveVisible === false || obj.visible === false || obj.object3D?.visible === false ? ' · <small>OCULTO</small>' : ''}<br><small>${obj.cloneOf ? 'copia editable' : 'pieza editable'}</small>
        </button>
      `).join('') + (filtered.length > MAX_LIST ? `<div class="we-status">…y ${filtered.length - MAX_LIST} más (usá el filtro)</div>` : '')
      : '<div class="we-status">No hay objetos editables cargados.</div>';
  }

  fields.filter.addEventListener('input', renderObjectList);

  root.addEventListener('click', (event) => {
    const objectButton = event.target.closest('[data-object-id]');
    if (objectButton) {
      callbacks.onSelectId?.(objectButton.dataset.objectId);
      return;
    }

    const actionButton = event.target.closest('[data-action]');
    if (!actionButton) return;
    const action = actionButton.dataset.action;
    if (action.startsWith('mode:')) callbacks.onMode?.(action.split(':')[1]);
    else if (action === 'space') callbacks.onToggleSpace?.();
    else if (action === 'snap') callbacks.onToggleSnap?.();
    else if (action === 'deselect') callbacks.onDeselect?.();
    else if (action === 'duplicate') callbacks.onDuplicate?.();
    else if (action === 'delete') callbacks.onDelete?.();
    else if (action === 'parent') callbacks.onSelectParent?.();
    else if (action === 'visible') callbacks.onToggleVisible?.();
    else if (action.startsWith('add:')) callbacks.onAddModel?.(action.slice(4));
    else if (action === 'save') callbacks.onSave?.();
    else if (action === 'copy') callbacks.onCopy?.();
    else if (action === 'download') callbacks.onDownload?.();
    else if (action === 'reset') callbacks.onReset?.();
    else if (action === 'clear') callbacks.onClear?.();
    else if (action === 'import') fields.fileInput.click();
  });

  fields.fileInput.addEventListener('change', () => {
    const file = fields.fileInput.files?.[0];
    if (file) callbacks.onImportFile?.(file);
    fields.fileInput.value = '';
  });

  function applyTransformField(event) {
    const input = event.target.closest('[data-transform]');
    if (!input) return;
    const value = Number(input.value);
    if (input.value === '' || !Number.isFinite(value)) return;
    callbacks.onTransformInput?.(input.dataset.transform, Number(input.dataset.index), value);
  }
  root.addEventListener('input', applyTransformField);
  root.addEventListener('change', applyTransformField);

  function normalizeHex(value) {
    const raw = String(value ?? '').trim();
    const short = raw.match(/^#?([0-9a-f]{3})$/i);
    if (short) return `#${short[1].split('').map((digit) => `${digit}${digit}`).join('').toLowerCase()}`;
    const full = raw.match(/^#?([0-9a-f]{6})$/i);
    return full ? `#${full[1].toLowerCase()}` : null;
  }

  fields.colorPicker.addEventListener('input', () => {
    fields.colorHex.value = fields.colorPicker.value;
    callbacks.onColorInput?.(fields.colorPicker.value);
  });
  fields.colorHex.addEventListener('input', () => {
    const color = normalizeHex(fields.colorHex.value);
    if (!color) return;
    fields.colorPicker.value = color;
    callbacks.onColorInput?.(color);
  });
  fields.colorHex.addEventListener('change', () => {
    const color = normalizeHex(fields.colorHex.value);
    fields.colorHex.value = color ?? fields.colorPicker.value;
  });

  function setButtons(state) {
    root.querySelectorAll('[data-action^="mode:"]').forEach((btn) => {
      btn.classList.toggle('is-active', btn.dataset.action === `mode:${state.mode}`);
    });
    root.querySelector('[data-action="space"]')?.classList.toggle('is-active', state.space === 'local');
    root.querySelector('[data-action="snap"]')?.classList.toggle('is-active', state.snapping);
  }

  return {
    root,
    show() { root.classList.add('is-visible'); },
    hide() { root.classList.remove('is-visible'); },
    setState(state) {
      fields.enabled.textContent = state.enabled ? 'ON' : 'OFF';
      fields.mode.textContent = state.mode;
      fields.space.textContent = state.space;
      fields.snapping.textContent = state.snapping ? 'ON' : 'OFF';
      setButtons(state);
    },
    setObjects(objects, selectedId) {
      lastObjects = objects;
      lastSelectedId = selectedId;
      renderObjectList();
    },
    setSelected(entry, colorInfo = null) {
      if (!entry) {
        fields.selected.textContent = 'Sin objeto seleccionado';
        fields.colorSection.hidden = true;
        return;
      }
      fields.selected.innerHTML = `<strong>${entry.name}</strong><br>${entry.id}<br>${entry.type}${entry.locked ? ' · LOCKED' : ''}`;
      fields.colorSection.hidden = false;
      const supportsColor = colorInfo?.supported === true;
      const color = normalizeHex(colorInfo?.value) ?? '#ffffff';
      fields.colorPicker.value = color;
      fields.colorHex.value = color;
      fields.colorPicker.disabled = !supportsColor;
      fields.colorHex.disabled = !supportsColor;
      fields.colorNote.textContent = supportsColor
        ? (colorInfo.mixed ? 'La pieza tiene varios colores. El nuevo color se aplicara a toda la seleccion.' : 'El cambio se aplica en vivo y queda guardado en este piso.')
        : 'Este objeto no tiene un material compatible con color.';
      const transforms = {
        position: entry.object3D.position.toArray(),
        rotation: [entry.object3D.rotation.x, entry.object3D.rotation.y, entry.object3D.rotation.z],
        scale: entry.object3D.scale.toArray(),
      };
      for (const [group, values] of Object.entries(transforms)) {
        root.querySelectorAll(`[data-transform="${group}"]`).forEach((input) => {
          input.value = Number(values[Number(input.dataset.index)]).toFixed(3);
        });
      }
    },
    setStatus(message) {
      fields.status.textContent = message ?? '';
    },
    dispose() {
      root.remove();
    },
  };
}
