// Intro de video del piso CULTURA: la primera vez que el jugador entra a ese
// piso en la sesión, reproduce public/assets/ui/cultura-intro.mp4 a pantalla
// completa (con audio, sin controles nativos) y al terminar devuelve el
// control solo. Se puede saltar con ESC o click. Una sola vez por sesión.
//
// Módulo AISLADO: arma su propio overlay DOM, no toca cámara/controles/Bob.
// main.js solo lo consulta: isPlaying() para pausar el update, y
// maybePlayFor(zoneName) cuando cambia la zona.

const OVERLAY_ID = 'ft-cultura-intro';
const STYLE_ID = 'ft-cultura-intro-style';

function injectStyles() {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    #${OVERLAY_ID} {
      position: fixed; inset: 0; z-index: 120; display: none;
      background: #000; align-items: center; justify-content: center;
      cursor: pointer;
    }
    #${OVERLAY_ID}.is-visible { display: flex; }
    #${OVERLAY_ID} video {
      width: 100%; height: 100%; object-fit: contain; background: #000;
    }
    #${OVERLAY_ID} .ci-skip {
      position: absolute; bottom: 22px; right: 26px;
      font-family: "Courier New", monospace; font-size: 12px; letter-spacing: 2px;
      color: rgba(245,241,232,0.85); background: rgba(0,0,0,0.4);
      border: 1px solid rgba(255,255,255,0.35); padding: 7px 14px;
      pointer-events: none; user-select: none;
    }
  `;
  document.head.appendChild(style);
}

// zoneName exacto que dispara la intro (nombre de la colección del piso 5)
const CULTURA_ZONE = 'CULTURA';

export function initCulturaIntro({ videoUrl = 'assets/ui/cultura-intro.mp4', onStart, onEnd } = {}) {
  injectStyles();

  const overlay = document.createElement('div');
  overlay.id = OVERLAY_ID;
  overlay.innerHTML = `
    <video playsinline preload="auto">
      <source src="${videoUrl}" type="video/mp4">
    </video>
    <div class="ci-skip">ESC / CLICK PARA SALTAR</div>
  `;
  document.body.appendChild(overlay);
  const video = overlay.querySelector('video');

  let playedThisSession = false;
  let playing = false;

  function finish() {
    if (!playing) return;
    playing = false;
    overlay.classList.remove('is-visible');
    try { video.pause(); } catch {}
    try { video.currentTime = 0; } catch {}
    onEnd?.();
  }

  video.addEventListener('ended', finish);
  // si el asset falta o no puede reproducirse, no congelar el juego: seguir
  video.addEventListener('error', finish);
  video.addEventListener('stalled', () => { /* deja que el usuario saltee */ });

  // saltar: ESC o click en cualquier lado del overlay
  overlay.addEventListener('click', finish);
  window.addEventListener('keydown', (e) => {
    if (e.code === 'Escape' && playing) { e.preventDefault(); e.stopPropagation(); finish(); }
  }, true);

  function play() {
    playing = true;
    playedThisSession = true;
    overlay.classList.add('is-visible');
    onStart?.();
    video.muted = false;
    video.volume = 1;
    try { video.currentTime = 0; } catch {}
    const p = video.play();
    // si el navegador rechaza el autoplay con sonido (raro acá: ya hubo
    // gestos del jugador al llegar a Cultura), no dejamos el juego trabado.
    if (p?.catch) p.catch(() => finish());
  }

  return {
    // llamar en cada frame con la zona actual; dispara la intro una sola vez
    maybePlayFor(zoneName) {
      if (playing || playedThisSession) return;
      if (zoneName === CULTURA_ZONE) play();
    },
    isPlaying: () => playing,
  };
}
