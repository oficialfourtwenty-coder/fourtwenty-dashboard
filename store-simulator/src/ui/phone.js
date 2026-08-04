const PHONE_ID = 'ft-phone';
const STYLE_ID = 'ft-phone-style';
const BANAPOD_CLOSED_URL = '/assets/ui/banapod/banapod-closed-small.png';
const BANAPOD_OPEN_URL = '/assets/ui/banapod/banapod-open.png';
const PLAYLISTS = [
  { id: 'fer', label: 'Corolla', mark: 'C' },
  { id: 'luca', label: 'Pepper', mark: 'P' },
];

function injectStyles() {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    #${PHONE_ID} {
      position: fixed; inset: 0; z-index: 92; pointer-events: none;
      font-family: -apple-system, BlinkMacSystemFont, "Helvetica Neue", Arial, sans-serif; color: #f4f1e8;
      contain: layout style paint;
      -webkit-tap-highlight-color: transparent;
    }
    #${PHONE_ID} .phone-launcher {
      position: absolute; right: 18px; bottom: 16px; width: 48px; min-height: 92px;
      padding: 0; border: 0; display: grid; justify-items: center; align-content: end; gap: 2px;
      pointer-events: auto; cursor: pointer; color: #fff; background: transparent;
      font: 700 10px/1.1 -apple-system, BlinkMacSystemFont, "Helvetica Neue", Arial, sans-serif;
      text-shadow: 0 2px 6px rgba(0,0,0,0.75);
      transition: opacity 160ms ease, transform 180ms ease;
    }
    #${PHONE_ID} .phone-launcher:hover,
    #${PHONE_ID} .phone-launcher:focus-visible {
      outline: none; transform: translateY(-2px);
    }
    #${PHONE_ID}.is-open .phone-launcher {
      opacity: 0; pointer-events: none; transform: translateY(12px) scale(0.92);
    }
    #${PHONE_ID} .phone-launcher img {
      width: 34px; height: auto; display: block; object-fit: contain;
    }
    #${PHONE_ID} .phone-shell {
      position: absolute; right: 20px; bottom: 14px;
      height: min(790px, calc(100dvh - 28px)); max-width: calc(100vw - 24px);
      aspect-ratio: 530 / 1215; overflow: hidden; pointer-events: none; visibility: hidden;
      background: transparent; border: 0; border-radius: 0;
      transform: translateY(calc(100% + 48px)) scale(0.98); opacity: 0;
      transition: transform 220ms cubic-bezier(.2,.82,.25,1), opacity 160ms ease, visibility 0s linear 220ms;
      contain: layout style paint;
    }
    #${PHONE_ID}.is-open .phone-shell {
      transform: translateY(0) scale(1); opacity: 1; pointer-events: auto; visibility: visible;
      transition: transform 220ms cubic-bezier(.2,.82,.25,1), opacity 160ms ease;
    }
    #${PHONE_ID} .phone-open-bg {
      position: absolute; inset: 0; width: 100%; height: 100%; object-fit: contain;
      user-select: none; pointer-events: none;
    }
    #${PHONE_ID} .phone-view { position: absolute; inset: 0; min-height: 0; }
    #${PHONE_ID} .phone-view[hidden] { display: none; }
    #${PHONE_ID} .phone-app {
      position: absolute; margin: 0; padding: 0; cursor: pointer; color: transparent;
      border: 0; border-radius: 999px; background: transparent; outline: none;
      -webkit-tap-highlight-color: transparent; user-select: none;
    }
    #${PHONE_ID} .phone-app:hover,
    #${PHONE_ID} .phone-app:active,
    #${PHONE_ID} .phone-app:focus-visible {
      outline: none; border: 0; box-shadow: none; background: transparent;
    }
    #${PHONE_ID} .phone-home-time-button {
      left: 21.5%; top: 56.9%; width: 24.5%; height: 16.5%;
    }
    #${PHONE_ID} .phone-home-time-button strong,
    #${PHONE_ID} .phone-home-time-button span { display: none; }
    #${PHONE_ID} .phone-home-music-button { left: 21.5%; top: 40.6%; width: 24.5%; height: 16.5%; }
    #${PHONE_ID} .phone-home-cart-button { left: 49.2%; top: 40.6%; width: 24.5%; height: 16.5%; }
    #${PHONE_ID} .phone-home-club-button {
      left: 49.2%; top: 56.9%; width: 24.5%; height: 16.5%;
      cursor: default; opacity: 1;
    }
    #${PHONE_ID} .phone-home-club-button:hover,
    #${PHONE_ID} .phone-home-club-button:focus-visible {
      border-color: transparent; box-shadow: none;
    }
    #${PHONE_ID} .phone-badge {
      position: absolute; left: 66.5%; top: 40.9%; min-width: 21px; height: 21px; padding: 0 5px;
      display: inline-grid; place-items: center; border-radius: 11px; color: #111;
      background: #fff; font-size: 11px; font-weight: 800; box-shadow: 0 2px 8px rgba(0,0,0,0.36);
    }
    #${PHONE_ID} .phone-badge[hidden] { display: none; }
    #${PHONE_ID} .phone-panel {
      position: absolute; left: 20.5%; top: 27.2%; width: 49.5%; height: 48.5%;
      box-sizing: border-box; padding: 42px 23px 30px 25px; overflow: auto;
      color: #f8f8f8; background: #050606;
      border-radius: 28px 30px 36px 34px;
      clip-path: polygon(
        5% 0%, 95% 0%, 100% 6%, 100% 92%,
        92% 100%, 20% 100%, 11% 96%, 6% 88%,
        3% 74%, 0% 56%, 0% 17%, 4% 5%
      );
    }
    #${PHONE_ID} .phone-view-head {
      display: grid; grid-template-columns: 30px minmax(0,1fr) 30px; align-items: center;
      gap: 7px; margin-bottom: 14px;
    }
    #${PHONE_ID} .phone-view-title { text-align: center; font-size: 13px; font-weight: 800; }
    #${PHONE_ID} .phone-icon-button {
      width: 30px; height: 30px; padding: 0; display: grid; place-items: center; cursor: pointer;
      color: #f8f8f8; background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.18);
      border-radius: 50%; font: 800 16px/1 Arial, sans-serif;
    }
    #${PHONE_ID} .phone-icon-button:hover,
    #${PHONE_ID} .phone-icon-button:focus-visible { border-color: #fff; outline: none; }
    #${PHONE_ID} .phone-source-switch { display: grid; grid-template-columns: 1fr 1fr; margin-bottom: 13px; border: 1px solid rgba(255,255,255,0.18); border-radius: 14px; overflow: hidden; }
    #${PHONE_ID} .phone-source {
      min-width: 0; min-height: 34px; padding: 7px 5px; cursor: pointer; border: 0;
      color: rgba(255,255,255,0.74); background: rgba(255,255,255,0.04);
      font: 800 10px/1 -apple-system, BlinkMacSystemFont, "Helvetica Neue", Arial, sans-serif;
    }
    #${PHONE_ID} .phone-source + .phone-source { border-left: 1px solid rgba(255,255,255,0.18); }
    #${PHONE_ID} .phone-source.is-selected { color: #111; background: #f7f4ec; }
    #${PHONE_ID} .phone-now {
      min-height: 126px; padding: 14px; display: grid; align-content: end; gap: 7px;
      border: 1px solid rgba(255,255,255,0.16); border-radius: 22px;
      background: linear-gradient(160deg, rgba(235,44,111,0.42), rgba(68,92,228,0.24));
    }
    #${PHONE_ID} .phone-now-source { color: #ffd8e8; font-size: 10px; font-weight: 800; text-transform: uppercase; }
    #${PHONE_ID} .phone-track { font-size: 15px; font-weight: 800; line-height: 1.22; overflow-wrap: anywhere; }
    #${PHONE_ID} .phone-artist { color: rgba(255,255,255,0.68); font-size: 11px; }
    #${PHONE_ID} .phone-player-controls { margin-top: 14px; display: flex; justify-content: center; gap: 14px; }
    #${PHONE_ID} .phone-player-controls .phone-icon-button { width: 48px; height: 48px; }
    #${PHONE_ID} .phone-icon-button[disabled] { opacity: 0.35; cursor: not-allowed; }
    #${PHONE_ID} .phone-clock-display {
      min-height: 120px; display: grid; place-content: center; gap: 7px; text-align: center;
      border: 1px solid rgba(255,255,255,0.16); border-radius: 22px;
      background: rgba(255,255,255,0.06);
    }
    #${PHONE_ID} .phone-clock-time { font: 300 44px/1 -apple-system, BlinkMacSystemFont, "Helvetica Neue", Arial, sans-serif; }
    #${PHONE_ID} .phone-clock-phase { min-height: 14px; color: #ffd65b; font-size: 10px; font-weight: 800; }
    #${PHONE_ID} .phone-clock-mode { color: rgba(255,255,255,0.58); font-size: 9px; }
    #${PHONE_ID} .phone-clock-controls { margin-top: 16px; display: grid; gap: 12px; }
    #${PHONE_ID} .phone-clock-label { display: grid; gap: 7px; color: rgba(255,255,255,0.72); font-size: 9px; font-weight: 800; }
    #${PHONE_ID} .phone-clock-range { width: 100%; margin: 0; accent-color: #ffd65b; }
    #${PHONE_ID} .phone-clock-input {
      box-sizing: border-box; width: 100%; min-height: 42px; padding: 8px 10px;
      color: #f8f8f8; color-scheme: dark; background: rgba(255,255,255,0.07);
      border: 1px solid rgba(255,255,255,0.18); border-radius: 14px;
      font: 800 16px/1 -apple-system, BlinkMacSystemFont, "Helvetica Neue", Arial, sans-serif;
    }
    #${PHONE_ID} .phone-clock-now {
      min-height: 38px; padding: 8px 12px; cursor: pointer; color: #111820; background: #ffd65b;
      border: 1px solid #ffe48a; border-radius: 14px;
      font: 800 10px/1 -apple-system, BlinkMacSystemFont, "Helvetica Neue", Arial, sans-serif;
    }
    #${PHONE_ID} .phone-cart-list { display: grid; gap: 8px; }
    #${PHONE_ID} .phone-cart-empty { padding: 45px 12px; text-align: center; color: rgba(255,255,255,0.56); font-size: 11px; }
    #${PHONE_ID} .phone-cart-item {
      min-width: 0; padding: 8px; display: grid; grid-template-columns: 52px minmax(0,1fr); gap: 9px;
      border: 1px solid rgba(255,255,255,0.16); border-radius: 18px; background: rgba(255,255,255,0.06);
    }
    #${PHONE_ID} .phone-cart-media { width: 52px; height: 64px; object-fit: cover; background: #111318; border-radius: 10px; }
    #${PHONE_ID} .phone-cart-copy { min-width: 0; display: grid; align-content: space-between; gap: 7px; }
    #${PHONE_ID} .phone-cart-name { font-size: 11px; font-weight: 800; line-height: 1.25; overflow-wrap: anywhere; }
    #${PHONE_ID} .phone-cart-price { color: #91b4ff; font-size: 11px; }
    #${PHONE_ID} .phone-cart-actions { display: flex; align-items: center; gap: 5px; }
    #${PHONE_ID} .phone-cart-actions button {
      width: 25px; height: 25px; padding: 0; cursor: pointer; color: #f8f8f8;
      background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.16);
      border-radius: 50%; font: 800 14px/1 Arial, sans-serif;
    }
    #${PHONE_ID} .phone-cart-qty { min-width: 23px; text-align: center; font-size: 11px; }
    #${PHONE_ID} .phone-cart-remove { margin-left: auto; }
    #${PHONE_ID} .phone-cart-foot {
      position: sticky; bottom: -28px; margin: 12px -20px -28px; padding: 12px 20px 18px;
      display: flex; align-items: center; justify-content: space-between; gap: 10px;
      border-top: 1px solid rgba(255,255,255,0.15); background: rgba(5,5,5,0.88);
      font-size: 12px; font-weight: 800;
    }
    #${PHONE_ID} .phone-clear {
      padding: 7px 9px; cursor: pointer; color: #f8f8f8; background: transparent;
      border: 1px solid rgba(255,255,255,0.22); border-radius: 12px;
      font: inherit; font-size: 9px; font-weight: 800;
    }
    @media (max-width: 520px), (max-height: 700px) {
      #${PHONE_ID} .phone-shell { right: 10px; bottom: 10px; height: min(680px, calc(100dvh - 20px)); }
      #${PHONE_ID} .phone-panel { padding: 36px 20px 28px 22px; }
    }
    @media (pointer: coarse) {
      #${PHONE_ID} .phone-shell {
        right: max(10px, env(safe-area-inset-right));
        bottom: max(10px, env(safe-area-inset-bottom));
        height: min(680px, calc(100dvh - 20px - env(safe-area-inset-top) - env(safe-area-inset-bottom)));
      }
    }
    @media (prefers-reduced-motion: reduce) {
      #${PHONE_ID} .phone-shell { transition: none; }
    }
  `;
  document.head.appendChild(style);
}

function isTypingTarget(target) {
  return target?.matches?.('input, textarea, select, [contenteditable="true"]');
}

function priceText(value, currency = 'ARS') {
  const number = Number(value);
  if (!Number.isFinite(number)) return '';
  return `$ ${number.toLocaleString('es-AR')} ${currency || ''}`.trim();
}

function shortDateText(date = new Date()) {
  const weekdays = ['Dom', 'Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab'];
  const months = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  return `${weekdays[date.getDay()]}, ${date.getDate()} de ${months[date.getMonth()]}`;
}

export function createPhone({ music, cart, clock, isBlocked = () => false, onBeforeOpen = () => {} }) {
  injectStyles();
  const root = document.createElement('div');
  root.id = PHONE_ID;
  root.setAttribute('aria-hidden', 'false');
  root.innerHTML = `
    <button type="button" class="phone-launcher" data-action="phone-toggle" aria-label="Abrir Banapod">
      <img src="${BANAPOD_CLOSED_URL}" alt="">
      <span>Banapod</span>
    </button>
    <section class="phone-shell" role="dialog" aria-label="Banapod">
      <img class="phone-open-bg" src="${BANAPOD_OPEN_URL}" alt="">
      <span data-field="clock" hidden></span>
      <div class="phone-view" data-view="home">
        <button type="button" class="phone-app phone-home-time-button" data-app="clock" aria-label="Elegir hora">
          <strong data-field="home-clock"></strong>
          <span data-field="home-date"></span>
        </button>
        <button type="button" class="phone-app phone-home-music-button" data-app="music" aria-label="Abrir Musica"></button>
        <button type="button" class="phone-app phone-home-cart-button" data-app="cart" aria-label="Abrir Tienda"></button>
        <button type="button" class="phone-app phone-home-club-button" data-app="club" aria-label="Club" disabled></button>
        <span class="phone-badge" data-field="cart-badge" hidden></span>
      </div>
      <div class="phone-view" data-view="music" hidden>
        <div class="phone-panel">
          <div class="phone-view-head">
            <button type="button" class="phone-icon-button" data-action="home" aria-label="Volver" title="Volver">&#8592;</button>
            <div class="phone-view-title">MUSICA</div><span></span>
          </div>
          <div class="phone-source-switch">
            <button type="button" class="phone-source" data-playlist="fer">COROLLA</button>
            <button type="button" class="phone-source" data-playlist="luca">PEPPER</button>
          </div>
          <div class="phone-now">
            <div class="phone-now-source" data-field="music-source"></div>
            <div class="phone-track" data-field="track"></div>
            <div class="phone-artist" data-field="artist"></div>
          </div>
          <div class="phone-player-controls">
            <button type="button" class="phone-icon-button" data-action="play" aria-label="Reproducir o pausar" title="Reproducir o pausar">&#9654;</button>
            <button type="button" class="phone-icon-button" data-action="next" aria-label="Siguiente tema" title="Siguiente tema">&#8811;</button>
          </div>
        </div>
      </div>
      <div class="phone-view" data-view="cart" hidden>
        <div class="phone-panel">
          <div class="phone-view-head">
            <button type="button" class="phone-icon-button" data-action="home" aria-label="Volver" title="Volver">&#8592;</button>
            <div class="phone-view-title">TIENDA</div><span></span>
          </div>
          <div class="phone-cart-list" data-field="cart-list"></div>
          <div class="phone-cart-foot">
            <button type="button" class="phone-clear" data-action="clear-cart">VACIAR</button>
            <span data-field="cart-total"></span>
          </div>
        </div>
      </div>
      <div class="phone-view" data-view="clock" hidden>
        <div class="phone-panel">
          <div class="phone-view-head">
            <button type="button" class="phone-icon-button" data-action="home" aria-label="Volver" title="Volver">&#8592;</button>
            <div class="phone-view-title">HORA</div><span></span>
          </div>
          <div class="phone-clock-display">
            <div class="phone-clock-time" data-field="clock-display"></div>
            <div class="phone-clock-phase" data-field="clock-phase"></div>
            <div class="phone-clock-mode" data-field="clock-mode"></div>
          </div>
          <div class="phone-clock-controls">
            <label class="phone-clock-label">MOVER EL CIELO
              <input class="phone-clock-range" data-field="clock-range" type="range" min="0" max="23.75" step="0.25">
            </label>
            <label class="phone-clock-label">ELEGIR HORA
              <input class="phone-clock-input" data-field="clock-input" type="time" step="900">
            </label>
            <button type="button" class="phone-clock-now" data-action="clock-now">USAR HORA REAL</button>
          </div>
        </div>
      </div>
    </section>
  `;
  document.body.appendChild(root);

  const field = (name) => root.querySelector(`[data-field="${name}"]`);
  const views = [...root.querySelectorAll('[data-view]')];
  const lastIndexes = new Map();
  let open = false;
  let currentView = 'home';
  let selectedPlaylist = 'fer';
  let playerState = music.getState();
  let cartState = cart.getState();
  let previousFocus = null;

  function fallbackClockState() {
    const now = new Date();
    const hourValue = now.getHours() + now.getMinutes() / 60;
    return {
      hourValue,
      hour: `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`,
      phase: '',
      manual: false,
    };
  }

  function getClockState() {
    clock?.update?.();
    return clock?.getState?.() ?? fallbackClockState();
  }

  function updateClock() {
    const state = getClockState();
    field('clock').textContent = state.hour;
    field('home-clock').textContent = state.hour;
    field('home-date').textContent = shortDateText();
    if (currentView === 'clock') renderClock();
  }
  updateClock();
  window.setInterval(updateClock, 30000);

  function showView(name) {
    currentView = name;
    for (const view of views) view.hidden = view.dataset.view !== name;
    if (name === 'clock') renderClock();
    root.querySelector(`[data-view="${name}"] button:not([disabled])`)?.focus({ preventScroll: true });
  }

  function renderClock() {
    const state = getClockState();
    const hour = Number.isFinite(state.hourValue) ? state.hourValue : 0;
    field('clock-display').textContent = state.hour;
    field('clock-phase').textContent = state.phase;
    field('clock-mode').textContent = state.manual ? 'HORA MANUAL' : 'HORA REAL';
    field('clock-range').value = String(hour);
    field('clock-input').value = state.hour;
  }

  function setClockFromTime(value) {
    const [hours, minutes] = String(value).split(':').map(Number);
    if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return;
    clock?.setHour?.(hours + minutes / 60);
    clock?.update?.(true);
    renderClock();
    updateClock();
  }

  field('clock-range').addEventListener('input', (event) => {
    clock?.setHour?.(Number(event.currentTarget.value));
    renderClock();
    field('clock').textContent = getClockState().hour;
  });
  field('clock-range').addEventListener('change', () => clock?.update?.(true));
  field('clock-input').addEventListener('change', (event) => setClockFromTime(event.currentTarget.value));

  function renderMusic() {
    const source = PLAYLISTS.find((item) => item.id === selectedPlaylist) || PLAYLISTS[0];
    const playlist = music.getPlaylist(selectedPlaylist);
    const isSelectedPlaying = playerState.playlistId === selectedPlaylist;
    const track = isSelectedPlaying ? playerState.track : null;
    for (const button of root.querySelectorAll('[data-playlist]')) {
      button.classList.toggle('is-selected', button.dataset.playlist === selectedPlaylist);
    }
    field('music-source').textContent = source.label;
    field('track').textContent = track?.titulo || (playlist.temas.length ? 'LISTA PREPARADA' : 'SIN TEMAS');
    field('artist').textContent = track?.artista || playlist.titulo || '';
    const playButton = root.querySelector('[data-action="play"]');
    const nextButton = root.querySelector('[data-action="next"]');
    const hasTracks = playlist.temas.length > 0;
    playButton.disabled = !hasTracks;
    nextButton.disabled = !hasTracks;
    playButton.innerHTML = isSelectedPlaying && playerState.playing ? '&#8545;' : '&#9654;';
  }

  function renderCart() {
    const badge = field('cart-badge');
    badge.hidden = cartState.count === 0;
    badge.textContent = String(cartState.count);
    const list = field('cart-list');
    list.replaceChildren();
    if (!cartState.items.length) {
      const empty = document.createElement('div');
      empty.className = 'phone-cart-empty';
      empty.textContent = 'TU CARRITO ESTA VACIO';
      list.appendChild(empty);
    }
    for (const item of cartState.items) {
      const row = document.createElement('article');
      row.className = 'phone-cart-item';
      row.dataset.key = item.key;
      const media = document.createElement('img');
      media.className = 'phone-cart-media';
      media.alt = '';
      if (item.imagen) media.src = item.imagen;
      const copy = document.createElement('div');
      copy.className = 'phone-cart-copy';
      copy.innerHTML = `
        <div class="phone-cart-name"></div>
        <div class="phone-cart-price"></div>
        <div class="phone-cart-actions">
          <button type="button" data-cart-action="minus" aria-label="Quitar una unidad" title="Quitar una unidad">-</button>
          <span class="phone-cart-qty"></span>
          <button type="button" data-cart-action="plus" aria-label="Agregar una unidad" title="Agregar una unidad">+</button>
          <button type="button" class="phone-cart-remove" data-cart-action="remove" aria-label="Eliminar prenda" title="Eliminar prenda">&#215;</button>
        </div>`;
      copy.querySelector('.phone-cart-name').textContent = item.nombre;
      copy.querySelector('.phone-cart-price').textContent = priceText(item.precio, item.moneda);
      copy.querySelector('.phone-cart-qty').textContent = String(item.cantidad);
      row.append(media, copy);
      list.appendChild(row);
    }
    field('cart-total').textContent = `TOTAL ${priceText(cartState.total, cartState.moneda)}`;
    root.querySelector('[data-action="clear-cart"]').disabled = cartState.count === 0;
  }

  async function selectPlaylist(id) {
    selectedPlaylist = id;
    renderMusic();
    await music.whenReady();
    const playlist = music.getPlaylist(id);
    if (!playlist.temas.length) { renderMusic(); return; }
    const state = music.getState();
    if (state.playlistId === id && state.track) return;
    const remembered = Math.min(lastIndexes.get(id) ?? 0, playlist.temas.length - 1);
    music.play(id, remembered);
  }

  async function toggleMusic() {
    await music.whenReady();
    const state = music.getState();
    if (state.playlistId === selectedPlaylist && state.track) music.toggle();
    else selectPlaylist(selectedPlaylist);
  }

  async function nextTrack() {
    await music.whenReady();
    const state = music.getState();
    if (state.playlistId === selectedPlaylist && state.track) music.next();
    else selectPlaylist(selectedPlaylist);
  }

  root.addEventListener('click', (event) => {
    const app = event.target.closest('[data-app]:not([disabled])');
    if (app) { showView(app.dataset.app); return; }
    const playlist = event.target.closest('[data-playlist]');
    if (playlist) { selectPlaylist(playlist.dataset.playlist); return; }
    const action = event.target.closest('[data-action]')?.dataset.action;
    if (action === 'phone-toggle') toggle();
    else if (action === 'home') showView('home');
    else if (action === 'play') toggleMusic();
    else if (action === 'next') nextTrack();
    else if (action === 'clear-cart') cart.clear();
    else if (action === 'clock-now') {
      clock?.useRealTime?.();
      renderClock();
      updateClock();
    }

    const cartButton = event.target.closest('[data-cart-action]');
    const row = cartButton?.closest('[data-key]');
    if (!cartButton || !row) return;
    const item = cartState.items.find((candidate) => candidate.key === row.dataset.key);
    if (!item) return;
    if (cartButton.dataset.cartAction === 'minus') cart.setQuantity(item.key, item.cantidad - 1);
    else if (cartButton.dataset.cartAction === 'plus') cart.setQuantity(item.key, item.cantidad + 1);
    else if (cartButton.dataset.cartAction === 'remove') cart.remove(item.key);
  });

  music.subscribe((state) => {
    playerState = state;
    if (state.playlistId && state.index >= 0) {
      lastIndexes.set(state.playlistId, state.index);
      selectedPlaylist = state.playlistId;
    }
    renderMusic();
  });
  cart.subscribe((state) => { cartState = state; renderCart(); });
  music.whenReady().then(renderMusic);

  function show() {
    if (open || isBlocked()) return false;
    onBeforeOpen();
    previousFocus = document.activeElement;
    open = true;
    showView('home');
    root.classList.add('is-open');
    return true;
  }

  function hide() {
    if (!open) return;
    open = false;
    root.classList.remove('is-open');
    showView('home');
    previousFocus?.focus?.({ preventScroll: true });
    previousFocus = null;
  }

  function toggle() {
    if (open) { hide(); return true; }
    return show();
  }

  window.addEventListener('keydown', (event) => {
    if (event.code === 'KeyC' && !event.metaKey && !event.ctrlKey && !event.altKey && !isTypingTarget(event.target)) {
      if (!open && isBlocked()) return;
      event.preventDefault();
      event.stopPropagation();
      toggle();
      return;
    }
    if (event.code === 'Escape' && open) {
      event.preventDefault();
      event.stopPropagation();
      hide();
    }
  }, true);

  return { show, hide, toggle, isOpen: () => open, getView: () => currentView };
}
