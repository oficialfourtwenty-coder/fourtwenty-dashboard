import { assetUrl } from '../core/assetUrl.js';

const ROOT_ID = 'ft-car-interior';
const STYLE_ID = 'ft-car-interior-style';

function injectStyles() {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    #${ROOT_ID} {
      position: fixed; inset: 0; z-index: 82; overflow: hidden;
      visibility: hidden; opacity: 0; pointer-events: none; background: #000;
      transition: opacity 280ms ease, visibility 0s linear 280ms;
    }
    #${ROOT_ID}.is-visible {
      visibility: visible; opacity: 1; pointer-events: auto;
      transition: opacity 280ms ease, visibility 0s;
    }
    #${ROOT_ID} .civ-image {
      position: absolute; inset: 0; width: 100%; height: 100%;
      object-fit: cover; opacity: 0; transform: scale(1.008);
      transition: opacity 420ms ease, transform 700ms ease;
      user-select: none; -webkit-user-drag: none; pointer-events: none;
    }
    #${ROOT_ID}.is-ready .civ-image { opacity: 1; transform: scale(1); }
    #${ROOT_ID} .civ-radio-hotspot {
      position: absolute; z-index: 2; padding: 0; cursor: pointer;
      border: 1px solid transparent; background: transparent;
    }
    #${ROOT_ID} .civ-radio-hotspot:hover,
    #${ROOT_ID} .civ-radio-hotspot:focus-visible {
      outline: none; border-color: rgba(57,255,106,0.62);
      background: rgba(57,255,106,0.06);
      box-shadow: 0 0 24px rgba(57,255,106,0.15);
    }
    #${ROOT_ID} .civ-exit {
      position: absolute; top: 18px; right: 18px; z-index: 3;
      min-height: 34px; padding: 7px 12px; cursor: pointer;
      color: #f5f1e8; background: rgba(8,9,10,0.78);
      border: 1px solid rgba(245,241,232,0.52);
      font: 900 11px/1 "Courier New", monospace; letter-spacing: 1px;
    }
    #${ROOT_ID} .civ-exit:hover { background: rgba(8,9,10,0.94); border-color: #f5f1e8; }
  `;
  document.head.appendChild(style);
}

export function createCarInteriorView({ onRadio, onExit } = {}) {
  injectStyles();
  const root = document.createElement('div');
  root.id = ROOT_ID;
  root.setAttribute('aria-hidden', 'true');
  root.innerHTML = `
    <img class="civ-image" alt="">
    <button type="button" class="civ-radio-hotspot" aria-label="Abrir radio" title="Abrir radio"></button>
    <button type="button" class="civ-exit" aria-label="Bajar del auto">SALIR</button>
  `;
  document.body.appendChild(root);

  const image = root.querySelector('.civ-image');
  const radioHotspot = root.querySelector('.civ-radio-hotspot');
  const exitButton = root.querySelector('.civ-exit');
  let activeCar = null;
  let activeConfig = null;
  let loadRevision = 0;

  function syncHotspot() {
    if (!activeConfig?.radio) return;
    const sourceWidth = image.naturalWidth || activeConfig.width || 1448;
    const sourceHeight = image.naturalHeight || activeConfig.height || 1086;
    const viewportWidth = root.clientWidth || window.innerWidth;
    const viewportHeight = root.clientHeight || window.innerHeight;
    const scale = Math.max(viewportWidth / sourceWidth, viewportHeight / sourceHeight);
    const renderedWidth = sourceWidth * scale;
    const renderedHeight = sourceHeight * scale;
    const offsetX = (viewportWidth - renderedWidth) * 0.5;
    const offsetY = (viewportHeight - renderedHeight) * 0.5;
    const radio = activeConfig.radio;
    radioHotspot.style.left = `${offsetX + radio.x * scale}px`;
    radioHotspot.style.top = `${offsetY + radio.y * scale}px`;
    radioHotspot.style.width = `${radio.width * scale}px`;
    radioHotspot.style.height = `${radio.height * scale}px`;
  }

  function finishImageLoad(revision) {
    if (revision !== loadRevision || !activeCar) return;
    syncHotspot();
    requestAnimationFrame(() => root.classList.add('is-ready'));
  }

  image.addEventListener('load', () => finishImageLoad(loadRevision));
  window.addEventListener('resize', syncHotspot);
  window.visualViewport?.addEventListener('resize', syncHotspot);

  radioHotspot.addEventListener('click', (event) => {
    event.preventDefault();
    event.stopPropagation();
    if (activeCar) onRadio?.(activeCar);
  });
  exitButton.addEventListener('click', (event) => {
    event.preventDefault();
    event.stopPropagation();
    onExit?.();
  });

  return {
    show(car) {
      const config = car?.interiorView;
      if (!config?.image) return false;
      activeCar = car;
      activeConfig = config;
      loadRevision += 1;
      const revision = loadRevision;
      root.classList.remove('is-ready');
      root.classList.add('is-visible');
      root.setAttribute('aria-hidden', 'false');
      image.alt = `Interior de ${car.model}`;
      image.src = assetUrl(config.image);
      if (image.complete && image.naturalWidth) finishImageLoad(revision);
      return true;
    },
    hide() {
      loadRevision += 1;
      activeCar = null;
      activeConfig = null;
      root.classList.remove('is-ready', 'is-visible');
      root.setAttribute('aria-hidden', 'true');
    },
    isVisible: () => root.classList.contains('is-visible'),
  };
}
