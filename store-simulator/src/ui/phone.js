const PHONE_ID = 'ft-phone';
const STYLE_ID = 'ft-phone-style';
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
      font-family: "Courier New", monospace; color: #f4f1e8;
    }
    #${PHONE_ID} .phone-shell {
      position: absolute; right: 24px; bottom: 18px;
      width: min(326px, calc(100vw - 24px)); height: min(600px, calc(100vh - 28px));
      box-sizing: border-box; padding: 10px; overflow: hidden; pointer-events: auto;
      background: #111318; border: 1px solid #62676f; border-radius: 24px;
      box-shadow: 0 24px 70px rgba(0,0,0,0.62), inset 0 0 0 2px #24272d;
      transform: translateY(calc(100% + 48px)); opacity: 0;
      transition: transform 260ms cubic-bezier(.2,.82,.25,1), opacity 180ms ease;
    }
    #${PHONE_ID}.is-open .phone-shell { transform: translateY(0); opacity: 1; }
    #${PHONE_ID} .phone-screen {
      height: 100%; overflow: hidden; display: grid; grid-template-rows: 30px minmax(0,1fr);
      background: #171a20; border: 1px solid #070809; border-radius: 16px;
    }
    #${PHONE_ID} .phone-status {
      min-width: 0; padding: 0 13px; display: flex; align-items: center; justify-content: space-between;
      color: rgba(244,241,232,0.72); background: #0b0d10; font-size: 10px; font-weight: 900;
    }
    #${PHONE_ID} .phone-view { min-height: 0; overflow: auto; padding: 14px; }
    #${PHONE_ID} .phone-view[hidden] { display: none; }
    #${PHONE_ID} .phone-brand { margin: 4px 0 15px; font-size: 19px; font-weight: 900; }
    #${PHONE_ID} .phone-app-grid {
      display: grid; grid-template-columns: repeat(2, minmax(0,1fr)); gap: 10px;
    }
    #${PHONE_ID} .phone-app {
      aspect-ratio: 1; min-width: 0; padding: 12px; display: grid; align-content: space-between;
      text-align: left; cursor: pointer; color: #f7f4ec; border: 1px solid rgba(255,255,255,0.24);
      border-radius: 7px; font: inherit; font-weight: 900; background: #242832;
    }
    #${PHONE_ID} .phone-app[data-app="music"] { background: #a83c31; }
    #${PHONE_ID} .phone-app[data-app="cart"] { background: #1f7255; }
    #${PHONE_ID} .phone-app[data-app="clock"] { background: #315374; }
    #${PHONE_ID} .phone-app[data-app="option4"] { background: #786326; }
    #${PHONE_ID} .phone-app:not([disabled]):hover,
    #${PHONE_ID} .phone-app:not([disabled]):focus-visible { border-color: #fff; outline: 2px solid #fff; outline-offset: 1px; }
    #${PHONE_ID} .phone-app[disabled] { cursor: default; }
    #${PHONE_ID} .phone-app-mark { font-size: 32px; line-height: 1; }
    #${PHONE_ID} .phone-app-name { min-width: 0; font-size: 12px; line-height: 1.25; overflow-wrap: anywhere; }
    #${PHONE_ID} .phone-badge {
      min-width: 20px; height: 20px; padding: 0 5px; display: inline-grid; place-items: center;
      justify-self: end; border-radius: 10px; color: #111; background: #fff; font-size: 10px;
    }
    #${PHONE_ID} .phone-badge[hidden] { display: none; }
    #${PHONE_ID} .phone-view-head { display: grid; grid-template-columns: 34px minmax(0,1fr) 34px; align-items: center; margin-bottom: 14px; }
    #${PHONE_ID} .phone-view-title { text-align: center; font-size: 15px; font-weight: 900; }
    #${PHONE_ID} .phone-icon-button {
      width: 34px; height: 34px; padding: 0; display: grid; place-items: center; cursor: pointer;
      color: #f4f1e8; background: #0d0f13; border: 1px solid #555b65; border-radius: 50%;
      font: 900 18px/1 Arial, sans-serif;
    }
    #${PHONE_ID} .phone-icon-button:hover,
    #${PHONE_ID} .phone-icon-button:focus-visible { border-color: #fff; outline: none; }
    #${PHONE_ID} .phone-source-switch { display: grid; grid-template-columns: 1fr 1fr; margin-bottom: 14px; border: 1px solid #565b63; }
    #${PHONE_ID} .phone-source {
      min-width: 0; min-height: 38px; padding: 8px; cursor: pointer; border: 0;
      color: #d8d5ce; background: #111318; font: inherit; font-size: 11px; font-weight: 900;
    }
    #${PHONE_ID} .phone-source + .phone-source { border-left: 1px solid #565b63; }
    #${PHONE_ID} .phone-source.is-selected { color: #111; background: #f2eee4; }
    #${PHONE_ID} .phone-now {
      min-height: 154px; padding: 16px; display: grid; align-content: end; gap: 7px;
      border: 1px solid #3e444d; background: #222630;
    }
    #${PHONE_ID} .phone-now-source { color: #f0a24a; font-size: 10px; font-weight: 900; text-transform: uppercase; }
    #${PHONE_ID} .phone-track { font-size: 17px; font-weight: 900; line-height: 1.25; overflow-wrap: anywhere; }
    #${PHONE_ID} .phone-artist { color: rgba(244,241,232,0.68); font-size: 11px; }
    #${PHONE_ID} .phone-player-controls { margin-top: 14px; display: flex; justify-content: center; gap: 14px; }
    #${PHONE_ID} .phone-player-controls .phone-icon-button { width: 50px; height: 50px; }
    #${PHONE_ID} .phone-icon-button[disabled] { opacity: 0.35; cursor: not-allowed; }
    #${PHONE_ID} .phone-clock-display {
      min-height: 150px; display: grid; place-content: center; gap: 7px; text-align: center;
      border-top: 1px solid #485260; border-bottom: 1px solid #485260; background: #101a26;
    }
    #${PHONE_ID} .phone-clock-time { font: 900 48px/1 "Courier New", monospace; }
    #${PHONE_ID} .phone-clock-phase { min-height: 14px; color: #f2bd54; font-size: 10px; font-weight: 900; }
    #${PHONE_ID} .phone-clock-mode { color: rgba(244,241,232,0.58); font-size: 9px; }
    #${PHONE_ID} .phone-clock-controls { margin-top: 18px; display: grid; gap: 13px; }
    #${PHONE_ID} .phone-clock-label { display: grid; gap: 7px; color: rgba(244,241,232,0.7); font-size: 9px; font-weight: 900; }
    #${PHONE_ID} .phone-clock-range { width: 100%; margin: 0; accent-color: #f2bd54; }
    #${PHONE_ID} .phone-clock-input {
      box-sizing: border-box; width: 100%; min-height: 42px; padding: 8px 10px;
      color: #f4f1e8; color-scheme: dark; background: #0d0f13; border: 1px solid #596371;
      font: 900 16px/1 "Courier New", monospace;
    }
    #${PHONE_ID} .phone-clock-now {
      min-height: 38px; padding: 8px 12px; cursor: pointer; color: #111820; background: #f2bd54;
      border: 1px solid #ffe09a; font: 900 10px/1 "Courier New", monospace;
    }
    #${PHONE_ID} .phone-cart-list { display: grid; gap: 8px; }
    #${PHONE_ID} .phone-cart-empty { padding: 48px 12px; text-align: center; color: rgba(244,241,232,0.56); font-size: 11px; }
    #${PHONE_ID} .phone-cart-item {
      min-width: 0; padding: 8px; display: grid; grid-template-columns: 58px minmax(0,1fr); gap: 9px;
      border: 1px solid #3e444d; background: #20242b;
    }
    #${PHONE_ID} .phone-cart-media { width: 58px; height: 70px; object-fit: cover; background: #111318; }
    #${PHONE_ID} .phone-cart-copy { min-width: 0; display: grid; align-content: space-between; gap: 7px; }
    #${PHONE_ID} .phone-cart-name { font-size: 11px; font-weight: 900; line-height: 1.25; overflow-wrap: anywhere; }
    #${PHONE_ID} .phone-cart-price { color: #68db9b; font-size: 11px; }
    #${PHONE_ID} .phone-cart-actions { display: flex; align-items: center; gap: 5px; }
    #${PHONE_ID} .phone-cart-actions button {
      width: 26px; height: 26px; padding: 0; cursor: pointer; color: #f4f1e8;
      background: #0d0f13; border: 1px solid #555b65; font: 900 14px/1 Arial, sans-serif;
    }
    #${PHONE_ID} .phone-cart-qty { min-width: 23px; text-align: center; font-size: 11px; }
    #${PHONE_ID} .phone-cart-remove { margin-left: auto; }
    #${PHONE_ID} .phone-cart-foot {
      position: sticky; bottom: -14px; margin: 12px -14px -14px; padding: 12px 14px;
      display: flex; align-items: center; justify-content: space-between; gap: 10px;
      border-top: 1px solid #474c55; background: #101217; font-size: 12px; font-weight: 900;
    }
    #${PHONE_ID} .phone-clear {
      padding: 7px 9px; cursor: pointer; color: #e8e4dc; background: transparent;
      border: 1px solid #646a74; font: inherit; font-size: 9px; font-weight: 900;
    }
    @media (max-width: 520px) {
      #${PHONE_ID} .phone-shell { right: 10px; bottom: 10px; width: min(326px, calc(100vw - 20px)); height: min(590px, calc(100dvh - 20px)); }
    }
    @media (pointer: coarse) {
      #${PHONE_ID} .phone-shell {
        right: max(10px, env(safe-area-inset-right));
        bottom: max(10px, env(safe-area-inset-bottom));
        width: min(326px, calc(100vw - 20px - env(safe-area-inset-left) - env(safe-area-inset-right)));
        height: min(590px, calc(100dvh - 20px - env(safe-area-inset-top) - env(safe-area-inset-bottom)));
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

export function createPhone({ music, cart, clock, isBlocked = () => false, onBeforeOpen = () => {} }) {
  injectStyles();
  const root = document.createElement('div');
  root.id = PHONE_ID;
  root.setAttribute('aria-hidden', 'true');
  root.innerHTML = `
    <section class="phone-shell" role="dialog" aria-label="Celular FOURTWENTY">
      <div class="phone-screen">
        <div class="phone-status"><span>FOURTWENTY</span><span data-field="clock"></span></div>
        <div class="phone-view" data-view="home">
          <div class="phone-brand">CELULAR</div>
          <div class="phone-app-grid">
            <button type="button" class="phone-app" data-app="music">
              <span class="phone-app-mark">M</span><span class="phone-app-name">MUSICA</span>
            </button>
            <button type="button" class="phone-app" data-app="cart">
              <span class="phone-badge" data-field="cart-badge" hidden></span>
              <span class="phone-app-mark">C</span><span class="phone-app-name">CARRITO</span>
            </button>
            <button type="button" class="phone-app" data-app="clock">
              <span class="phone-app-mark">12</span><span class="phone-app-name">RELOJ</span>
            </button>
            <button type="button" class="phone-app" data-app="option4" disabled>
              <span class="phone-app-mark">4</span><span class="phone-app-name">OPCION 4</span>
            </button>
          </div>
        </div>
        <div class="phone-view" data-view="music" hidden>
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
        <div class="phone-view" data-view="cart" hidden>
          <div class="phone-view-head">
            <button type="button" class="phone-icon-button" data-action="home" aria-label="Volver" title="Volver">&#8592;</button>
            <div class="phone-view-title">CARRITO</div><span></span>
          </div>
          <div class="phone-cart-list" data-field="cart-list"></div>
          <div class="phone-cart-foot">
            <button type="button" class="phone-clear" data-action="clear-cart">VACIAR</button>
            <span data-field="cart-total"></span>
          </div>
        </div>
        <div class="phone-view" data-view="clock" hidden>
          <div class="phone-view-head">
            <button type="button" class="phone-icon-button" data-action="home" aria-label="Volver" title="Volver">&#8592;</button>
            <div class="phone-view-title">RELOJ</div><span></span>
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
    field('clock').textContent = getClockState().hour;
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
    if (action === 'home') showView('home');
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
    root.setAttribute('aria-hidden', 'false');
    return true;
  }

  function hide() {
    if (!open) return;
    open = false;
    root.classList.remove('is-open');
    root.setAttribute('aria-hidden', 'true');
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
