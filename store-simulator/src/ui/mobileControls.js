const ROOT_ID = 'ft-mobile-controls';
const STYLE_ID = 'ft-mobile-controls-style';
const ORIENTATION_ID = 'ft-mobile-orientation';
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
    #${ORIENTATION_ID} {
      position: fixed; inset: 0; z-index: 200; display: none; place-items: center;
      padding: max(24px, env(safe-area-inset-top)) max(24px, env(safe-area-inset-right))
        max(24px, env(safe-area-inset-bottom)) max(24px, env(safe-area-inset-left));
      box-sizing: border-box; color: #f5f1e8; background: #090a0c;
      font: 900 13px/1.2 "Courier New", monospace; letter-spacing: 2px;
      text-align: center; touch-action: none; user-select: none; -webkit-user-select: none;
    }
    #${ORIENTATION_ID}.is-visible { display: grid; }
    #${ORIENTATION_ID} .mobile-orientation-content { display: grid; justify-items: center; gap: 18px; }
    #${ORIENTATION_ID} .mobile-orientation-phone {
      position: relative; width: 48px; height: 82px; border: 3px solid #f5f1e8;
      border-radius: 8px; transform: rotate(90deg);
    }
    #${ORIENTATION_ID} .mobile-orientation-phone::after {
      content: ""; position: absolute; left: 50%; bottom: 5px; width: 5px; height: 5px;
      border-radius: 50%; background: #f5f1e8; transform: translateX(-50%);
    }
    #${ORIENTATION_ID} .mobile-orientation-label { color: #f36a21; }
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

  const orientationOverlay = document.createElement('div');
  orientationOverlay.id = ORIENTATION_ID;
  orientationOverlay.setAttribute('role', 'status');
  orientationOverlay.innerHTML = `
    <div class="mobile-orientation-content">
      <span class="mobile-orientation-phone" aria-hidden="true"></span>
      <span class="mobile-orientation-label">MODO HORIZONTAL</span>
    </div>
  `;
  document.body.appendChild(orientationOverlay);

  const interactButton = root.querySelector('[data-action="interact"]');
  const phoneButton = root.querySelector('[data-action="phone"]');
  let activePointer = null;
  let originX = 0;
  let originY = 0;
  let moved = false;
  let suppressClickUntil = 0;
  let movementEnabled = true;

  const preventGestureZoom = (event) => event.preventDefault();
  for (const eventName of ['gesturestart', 'gesturechange', 'gestureend']) {
    document.addEventListener(eventName, preventGestureZoom, { passive: false });
  }

  function syncOrientation() {
    const portrait = window.matchMedia('(orientation: portrait)').matches;
    orientationOverlay.classList.toggle('is-visible', portrait);
    orientationOverlay.setAttribute('aria-hidden', String(!portrait));
    document.body.classList.toggle('mobile-portrait-blocked', portrait);
    if (portrait) release();
  }

  window.addEventListener('resize', syncOrientation);
  window.addEventListener('orientationchange', syncOrientation);
  window.visualViewport?.addEventListener('resize', syncOrientation);

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

  syncOrientation();

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
