// La radio del auto. Se abre cuando BOB está sentado adentro y se aprieta la
// radio del tablero. Deja elegir tema de la playlist de ESE auto y muestra el
// crédito del artista (nombre + link a su perfil) mientras suena.
//
// Es un panel abajo, con forma de estéreo de auto, para no tapar a BOB sentado.
// DOM plano y aislado: no toca cámara ni controles. La estética fina viene
// después (ver PLAN MAESTRO en Notion) — esto es la versión funcional.

const PANEL_ID = 'ft-car-radio';
const STYLE_ID = 'ft-car-radio-style';

function injectStyles() {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    #${PANEL_ID} {
      position: fixed; left: 50%; bottom: 18px; transform: translateX(-50%);
      z-index: 88; display: none; width: min(620px, calc(100vw - 24px));
      font-family: "Courier New", monospace; color: #f5f1e8;
      background: rgba(10, 11, 12, 0.96);
      border: 1px solid rgba(57, 255, 106, 0.45);
      box-shadow: 0 20px 56px rgba(0,0,0,0.6), inset 0 0 0 1px rgba(255,255,255,0.04);
    }
    #${PANEL_ID}.is-visible { display: block; }
    #${PANEL_ID} .cr-head {
      display: flex; align-items: center; justify-content: space-between; gap: 10px;
      padding: 9px 12px; border-bottom: 1px solid rgba(255,255,255,0.10);
      background: rgba(255,255,255,0.03);
    }
    #${PANEL_ID} .cr-car { font-size: 11px; letter-spacing: 2px; color: #ff6d18; font-weight: 900; }
    #${PANEL_ID} .cr-owner { font-size: 10px; letter-spacing: 1px; color: rgba(245,241,232,0.5); }
    #${PANEL_ID} .cr-exit {
      cursor: pointer; font: inherit; font-size: 10px; font-weight: 900; letter-spacing: 1px;
      color: #f5f1e8; background: transparent; border: 1px solid rgba(245,241,232,0.35);
      padding: 6px 10px; min-height: 32px;
    }
    #${PANEL_ID} .cr-exit:hover { background: rgba(245,241,232,0.1); }
    #${PANEL_ID} .cr-screen {
      margin: 10px 12px; padding: 10px 12px; background: #08130c;
      border: 1px solid rgba(57,255,106,0.3); min-height: 52px;
    }
    #${PANEL_ID} .cr-track { font-size: 14px; font-weight: 900; color: #39ff6a; letter-spacing: 1px; }
    #${PANEL_ID} .cr-artist { font-size: 11px; color: rgba(245,241,232,0.72); margin-top: 3px; }
    #${PANEL_ID} .cr-artist a { color: #ff6d18; text-decoration: none; }
    #${PANEL_ID} .cr-artist a:hover { text-decoration: underline; }
    #${PANEL_ID} .cr-controls { display: flex; gap: 8px; padding: 0 12px 10px; align-items: center; }
    #${PANEL_ID} .cr-btn {
      cursor: pointer; font: inherit; font-weight: 900; font-size: 13px;
      color: #111; background: #39ff6a; border: 0; min-width: 44px; min-height: 36px;
    }
    #${PANEL_ID} .cr-btn:hover { background: #6bffa0; }
    #${PANEL_ID} .cr-btn[disabled] { opacity: 0.35; cursor: not-allowed; }
    #${PANEL_ID} .cr-vol { flex: 1; accent-color: #39ff6a; }
    #${PANEL_ID} .cr-list { max-height: 168px; overflow: auto; border-top: 1px solid rgba(255,255,255,0.08); }
    #${PANEL_ID} .cr-item {
      display: flex; gap: 10px; align-items: baseline; width: 100%;
      padding: 9px 12px; cursor: pointer; font: inherit; text-align: left;
      color: #f5f1e8; background: transparent; border: 0;
      border-bottom: 1px solid rgba(255,255,255,0.05);
    }
    #${PANEL_ID} .cr-item:hover { background: rgba(57,255,106,0.09); }
    #${PANEL_ID} .cr-item.is-current { background: rgba(57,255,106,0.16); }
    #${PANEL_ID} .cr-num { font-size: 10px; color: rgba(245,241,232,0.4); min-width: 18px; }
    #${PANEL_ID} .cr-title { font-size: 12px; font-weight: 700; }
    #${PANEL_ID} .cr-by { font-size: 10px; color: rgba(245,241,232,0.5); margin-left: auto; }
    #${PANEL_ID} .cr-empty { padding: 16px 12px; font-size: 11px; line-height: 1.6; color: rgba(245,241,232,0.6); }
    #${PANEL_ID} .cr-empty code { color: #39ff6a; }
  `;
  document.head.appendChild(style);
}

export function createCarRadio({ music, onExit }) {
  injectStyles();

  const panel = document.createElement('div');
  panel.id = PANEL_ID;
  panel.innerHTML = `
    <div class="cr-head">
      <div>
        <div class="cr-car" data-field="car"></div>
        <div class="cr-owner" data-field="owner"></div>
      </div>
      <button type="button" class="cr-exit" data-field="exit">BAJAR DEL AUTO (ESC)</button>
    </div>
    <div class="cr-screen">
      <div class="cr-track" data-field="track">— RADIO APAGADA —</div>
      <div class="cr-artist" data-field="artist"></div>
    </div>
    <div class="cr-controls">
      <button type="button" class="cr-btn" data-field="prev">◀◀</button>
      <button type="button" class="cr-btn" data-field="toggle">▶</button>
      <button type="button" class="cr-btn" data-field="next">▶▶</button>
      <input type="range" class="cr-vol" data-field="vol" min="0" max="100" value="55" aria-label="Volumen">
    </div>
    <div class="cr-list" data-field="list"></div>
  `;
  document.body.appendChild(panel);

  const el = (name) => panel.querySelector(`[data-field="${name}"]`);
  const carEl = el('car');
  const ownerEl = el('owner');
  const trackEl = el('track');
  const artistEl = el('artist');
  const listEl = el('list');
  const toggleEl = el('toggle');
  const volEl = el('vol');

  let activeCar = null;
  let open = false;

  function renderList() {
    if (!activeCar) return;
    const list = music.getPlaylist(activeCar.playlist);
    const state = music.getState();
    if (!list.temas.length) {
      listEl.innerHTML = `<div class="cr-empty">
        Todavía no hay temas cargados en esta playlist.<br>
        Poné los MP3 en <code>public/assets/musica/</code> y anotalos en
        <code>playlists.json</code> — mirá el README de esa carpeta.
      </div>`;
      return;
    }
    listEl.innerHTML = '';
    list.temas.forEach((tema, index) => {
      const isCurrent = state.playlistId === activeCar.playlist && state.index === index;
      const item = document.createElement('button');
      item.type = 'button';
      item.className = `cr-item${isCurrent ? ' is-current' : ''}`;
      const num = document.createElement('span');
      num.className = 'cr-num';
      num.textContent = String(index + 1).padStart(2, '0');
      const title = document.createElement('span');
      title.className = 'cr-title';
      title.textContent = tema.titulo ?? tema.archivo;
      const by = document.createElement('span');
      by.className = 'cr-by';
      by.textContent = tema.artista ?? '';
      item.append(num, title, by);
      item.addEventListener('click', () => { music.play(activeCar.playlist, index); });
      listEl.appendChild(item);
    });
  }

  function renderNowPlaying(state) {
    const track = state.track;
    if (!track) {
      trackEl.textContent = '— RADIO APAGADA —';
      artistEl.textContent = '';
      toggleEl.textContent = '▶';
      return;
    }
    trackEl.textContent = (track.titulo ?? track.archivo).toUpperCase();
    artistEl.innerHTML = '';
    if (track.artista) {
      artistEl.append(document.createTextNode('por '));
      if (track.link) {
        const a = document.createElement('a');
        a.href = track.link;
        a.target = '_blank';
        a.rel = 'noopener noreferrer';
        a.textContent = track.artista;
        artistEl.appendChild(a);
      } else {
        artistEl.append(document.createTextNode(track.artista));
      }
    }
    toggleEl.textContent = state.playing ? '❚❚' : '▶';
  }

  music.subscribe((state) => {
    if (!open) return;
    renderNowPlaying(state);
    renderList();
    volEl.value = String(Math.round(state.volume * 100));
  });

  el('prev').addEventListener('click', () => music.prev());
  el('next').addEventListener('click', () => music.next());
  toggleEl.addEventListener('click', () => {
    const state = music.getState();
    if (!state.track && activeCar) music.play(activeCar.playlist, 0);
    else music.toggle();
  });
  volEl.addEventListener('input', () => music.setVolume(Number(volEl.value) / 100));
  el('exit').addEventListener('click', () => onExit?.());

  return {
    show(car) {
      activeCar = car;
      open = true;
      carEl.textContent = car.radioLabel ?? car.model.toUpperCase();
      ownerEl.textContent = `${car.model} · ${car.owner}`;
      panel.classList.add('is-visible');
      music.whenReady().then(() => { if (open) renderList(); });
      renderNowPlaying(music.getState());
      renderList();
    },
    hide() {
      open = false;
      activeCar = null;
      panel.classList.remove('is-visible');
    },
    isOpen: () => open,
  };
}
