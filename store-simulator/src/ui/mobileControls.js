const ROOT_ID = 'ft-mobile-controls';
const STYLE_ID = 'ft-mobile-controls-style';
const JOYSTICK_RADIUS = 58;
const DEAD_ZONE = 6;

function shouldEnable() {
  const forced = new URLSearchParams(location.search).get('mobileControls') === '1';
  return forced || navigator.maxTouchPoints > 0 || window.matchMedia('(pointer: coarse)').matches;
}

function injectStyles() {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    #${ROOT_ID} { position: fixed; inset: 0; z-index: 94; pointer-events: none; }
    #${ROOT_ID}[hidden], #${ROOT_ID}.is-suppressed { display: none; }
    #${ROOT_ID} .mobile-action {
      position: absolute; right: max(18px, env(safe-area-inset-right));
      width: 54px; height: 54px; padding: 0; display: grid; place-items: center;
      pointer-events: auto; touch-action: manipulation; user-select: none; -webkit-user-select: none;
      color: #fff; background: rgba(10,12,16,0.78); border: 1px solid rgba(255,255,255,0.74);
      border-radius: 50%; box-shadow: 0 5px 18px rgba(0,0,0,0.38);
      font: 900 22px/1 "Courier New", monospace;
    }
    #${ROOT_ID} .mobile-phone { bottom: max(18px, env(safe-area-inset-bottom)); }
    #${ROOT_ID} .mobile-interact {
      bottom: calc(max(18px, env(safe-area-inset-bottom)) + 68px);
      color: #111; background: rgba(255,109,24,0.94); border-color: #ffb17e;
    }
    #${ROOT_ID} .mobile-interact[hidden] { display: none; }
    #${ROOT_ID} .mobile-action:active { transform: scale(0.94); }
  `;
  document.head.appendChild(style);
}

export function initMobileControls({ canvas, input, onPhone, onInteract }) {
  injectStyles();
  const root = document.createElement('div');
  root.id = ROOT_ID;
  root.innerHTML = `
    <button type="button" class="mobile-action mobile-interact" data-action="interact" aria-label="Interactuar" hidden>E</button>
    <button type="button" class="mobile-action mobile-phone" data-action="phone" aria-label="Celular">C</button>
  `;
  document.body.appendChild(root);

  const enabled = shouldEnable();
  root.hidden = !enabled;
  if (!enabled) {
    return { isEnabled: () => false, setState() {} };
  }

  const interactButton = root.querySelector('[data-action="interact"]');
  const phoneButton = root.querySelector('[data-action="phone"]');
  let activePointer = null;
  let originX = 0;
  let originY = 0;
  let moved = false;
  let suppressClickUntil = 0;
  let movementEnabled = true;

  canvas.style.touchAction = 'none';

  function release(pointerId = activePointer) {
    if (pointerId === null || pointerId !== activePointer) return;
    activePointer = null;
    input.clearVirtualAxes();
    if (moved) suppressClickUntil = performance.now() + 350;
    moved = false;
  }

  canvas.addEventListener('pointerdown', (event) => {
    if (!movementEnabled || activePointer !== null) return;
    if (event.pointerType !== 'touch' && new URLSearchParams(location.search).get('mobileControls') !== '1') return;
    if (event.clientX > window.innerWidth * 0.58 || event.clientY < window.innerHeight * 0.34) return;
    activePointer = event.pointerId;
    originX = event.clientX;
    originY = event.clientY;
    moved = false;
    canvas.setPointerCapture?.(event.pointerId);
    event.preventDefault();
  }, { passive: false });

  canvas.addEventListener('pointermove', (event) => {
    if (event.pointerId !== activePointer) return;
    const dx = event.clientX - originX;
    const dy = event.clientY - originY;
    const distance = Math.hypot(dx, dy);
    if (distance > DEAD_ZONE) moved = true;
    if (distance <= DEAD_ZONE) {
      input.clearVirtualAxes();
    } else {
      const scale = Math.min(1, (distance - DEAD_ZONE) / (JOYSTICK_RADIUS - DEAD_ZONE));
      input.setVirtualAxes((dx / distance) * scale, (-dy / distance) * scale);
    }
    event.preventDefault();
  }, { passive: false });

  canvas.addEventListener('pointerup', (event) => release(event.pointerId));
  canvas.addEventListener('pointercancel', (event) => release(event.pointerId));
  canvas.addEventListener('lostpointercapture', (event) => release(event.pointerId));
  canvas.addEventListener('click', (event) => {
    if (performance.now() >= suppressClickUntil) return;
    event.preventDefault();
    event.stopImmediatePropagation();
  }, true);

  for (const button of root.querySelectorAll('button')) {
    button.addEventListener('pointerdown', (event) => event.stopPropagation());
  }
  phoneButton.addEventListener('click', () => onPhone?.());
  interactButton.addEventListener('click', () => onInteract?.());

  function setState({ suppressed = false, phoneOpen = false, interactionAvailable = false, canMove = true }) {
    root.classList.toggle('is-suppressed', suppressed);
    interactButton.hidden = suppressed || phoneOpen || !interactionAvailable;
    movementEnabled = !suppressed && !phoneOpen && canMove;
    if (!movementEnabled) release();
  }

  return { isEnabled: () => true, setState };
}
