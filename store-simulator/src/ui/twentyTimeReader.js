const ROOT_ID = 'twenty-time-reader';
const STYLE_ID = 'twenty-time-reader-style';
const ASSET_ROOT = '/assets/magazine/twenty-time';
const TURN_DURATION_MS = 820;

export const TWENTY_TIME_ISSUE = Object.freeze([
  Object.freeze({
    image: `${ASSET_ROOT}/spread-01.jpg`,
    imagePosition: 'center 47%',
    alt: 'Collage editorial de una revista abierta',
    layout: 'opening',
    section: 'EDITORIAL',
    kicker: 'ISSUE 00 / BURELA',
    title: 'TWENTY TIME',
    body: 'Un archivo vivo de FOURTWENTY: ropa, musica, amigos y las ideas que convierten una tienda en un punto de encuentro.',
  }),
  Object.freeze({
    image: `${ASSET_ROOT}/spread-02.jpg`,
    imagePosition: 'center 31%',
    alt: 'Editorial de moda urbana en una revista abierta',
    layout: 'vogue',
    section: 'PROYECTO 01',
    kicker: 'ESTUDIO CONCEPTUAL / NO OFICIAL',
    title: 'VOGUE X FOURTWENTY',
    body: 'Una pagina imaginada para llevar la energia de Burela a una lectura de moda global, sin perder calle, identidad ni comunidad.',
    note: 'Concepto editorial temporal. No representa una colaboracion oficial.',
  }),
  Object.freeze({
    image: `${ASSET_ROOT}/spread-03.jpg`,
    imagePosition: 'center center',
    alt: 'Doble pagina tipografica de cultura y comunidad',
    layout: 'bobilonia',
    section: 'PROYECTO 02',
    kicker: 'MUNDO DIGITAL / EN DESARROLLO',
    title: 'BOBILONIA',
    body: 'Comprar tambien puede ser recorrer un mundo. BOB camina por Burela, escucha musica, descubre pisos, juegos y prendas antes de llegar al pago.',
    insets: Object.freeze([
      Object.freeze({
        image: `${ASSET_ROOT}/simulator-street.jpg`,
        alt: 'BOB frente al local FOURTWENTY dentro del simulador',
        className: 'tt-inset-street',
      }),
      Object.freeze({
        image: '/assets/minigames/bobs-maze/maze-420.png',
        alt: 'Mapa 420 del minijuego de BOB',
        className: 'tt-inset-maze',
      }),
    ]),
  }),
  Object.freeze({
    image: `${ASSET_ROOT}/spread-04.jpg`,
    imagePosition: 'center 44%',
    alt: 'Editorial de indumentaria fotografiada sobre fondo azul',
    layout: 'manifesto',
    section: 'MANIFIESTO',
    kicker: 'BURELA / BUENOS AIRES',
    title: 'WE ROLL DIFFERENT',
    body: 'FOURTWENTY conecta prendas, artistas y experiencias. Cada proyecto suma una parte del mismo universo, construido con independencia y curiosidad.',
  }),
]);

function injectStyles() {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    body.twenty-time-open { overflow: hidden; }
    #${ROOT_ID} {
      position: fixed; inset: 0; z-index: 118; display: grid;
      grid-template-rows: 58px minmax(0, 1fr) 42px;
      color: #f4f1e9; background: rgba(5, 6, 7, 0.96);
      visibility: hidden; opacity: 0; pointer-events: none;
      transition: opacity 220ms ease, visibility 0s linear 220ms;
    }
    #${ROOT_ID}.is-open {
      visibility: visible; opacity: 1; pointer-events: auto;
      transition: opacity 220ms ease, visibility 0s;
    }
    #${ROOT_ID} button { font: inherit; }
    #${ROOT_ID} .tt-topbar {
      display: grid; grid-template-columns: 1fr auto 1fr; align-items: center;
      min-width: 0; padding: 0 20px; border-bottom: 1px solid rgba(255,255,255,0.18);
      background: #0a0b0c;
    }
    #${ROOT_ID} .tt-brand { min-width: 0; display: flex; align-items: baseline; gap: 12px; }
    #${ROOT_ID} .tt-brand strong {
      overflow: hidden; color: #f36a21; font: 900 15px/1 Arial, sans-serif;
      letter-spacing: 0; white-space: nowrap; text-overflow: ellipsis;
    }
    #${ROOT_ID} .tt-brand span,
    #${ROOT_ID} .tt-counter,
    #${ROOT_ID} .tt-section {
      color: rgba(244,241,233,0.68); font: 700 11px/1 "Courier New", monospace;
      letter-spacing: 0;
    }
    #${ROOT_ID} .tt-counter { min-width: 62px; text-align: center; }
    #${ROOT_ID} .tt-close {
      justify-self: end; width: 34px; height: 34px; padding: 0; display: grid; place-items: center;
      color: #f4f1e9; background: transparent; border: 1px solid rgba(255,255,255,0.4);
      border-radius: 2px; cursor: pointer; font: 400 24px/1 Arial, sans-serif;
    }
    #${ROOT_ID} .tt-close:hover,
    #${ROOT_ID} .tt-close:focus-visible { color: #111; background: #f36a21; border-color: #f36a21; outline: none; }
    #${ROOT_ID} .tt-stage {
      min-height: 0; display: grid; grid-template-columns: 44px minmax(0, auto) 44px;
      justify-content: center; align-items: center; gap: 16px; padding: 18px 20px 12px;
    }
    #${ROOT_ID} .tt-nav {
      width: 44px; height: 54px; padding: 0; display: grid; place-items: center;
      color: #f4f1e9; background: #121416; border: 1px solid rgba(255,255,255,0.3);
      border-radius: 2px; cursor: pointer; font: 300 34px/1 Arial, sans-serif;
    }
    #${ROOT_ID} .tt-nav:hover:not(:disabled),
    #${ROOT_ID} .tt-nav:focus-visible:not(:disabled) { color: #111; background: #f36a21; border-color: #f36a21; outline: none; }
    #${ROOT_ID} .tt-nav:disabled { opacity: 0.22; cursor: default; }
    #${ROOT_ID} .tt-magazine {
      position: relative; width: min(calc(100vw - 176px), calc((100svh - 130px) * 1.55));
      aspect-ratio: 1.55 / 1; overflow: hidden; isolation: isolate;
      background: #e7e4dc; border: 1px solid rgba(255,255,255,0.38); border-radius: 2px;
      box-shadow: 0 22px 70px rgba(0,0,0,0.62); perspective: 1900px;
    }
    #${ROOT_ID} .tt-current,
    #${ROOT_ID} .tt-transition { position: absolute; inset: 0; }
    #${ROOT_ID} .tt-current { z-index: 1; }
    #${ROOT_ID} .tt-current.is-turning .tt-editorial { opacity: 0; }
    #${ROOT_ID} .tt-main-image {
      position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover;
      user-select: none; -webkit-user-drag: none;
    }
    #${ROOT_ID} .tt-paper-tint { position: absolute; inset: 0; background: rgba(244,240,229,0.025); pointer-events: none; }
    #${ROOT_ID} .tt-fold {
      position: absolute; z-index: 5; top: 0; bottom: 0; left: 50%; width: 2px;
      background: rgba(15,15,15,0.2); box-shadow: -10px 0 18px rgba(0,0,0,0.16), 10px 0 18px rgba(0,0,0,0.12);
      transform: translateX(-1px); pointer-events: none;
    }
    #${ROOT_ID} .tt-editorial { position: absolute; inset: 0; z-index: 4; transition: opacity 120ms ease; pointer-events: none; }
    #${ROOT_ID} .tt-copy {
      position: absolute; margin: 0; box-sizing: border-box; border-radius: 0;
    }
    #${ROOT_ID} .tt-copy .tt-kicker {
      display: block; margin-bottom: 8px; font: 900 10px/1.2 "Courier New", monospace; letter-spacing: 0;
    }
    #${ROOT_ID} .tt-copy h2 {
      margin: 0 0 10px; font: 900 31px/0.94 Arial, sans-serif; letter-spacing: 0;
    }
    #${ROOT_ID} .tt-copy p {
      max-width: 43ch; margin: 0; font: 700 12px/1.42 Arial, sans-serif; letter-spacing: 0;
    }
    #${ROOT_ID} .tt-copy small {
      display: block; margin-top: 10px; font: 700 9px/1.3 "Courier New", monospace; letter-spacing: 0;
    }
    #${ROOT_ID} [data-layout="opening"] .tt-copy {
      right: 4%; bottom: 6%; width: 41%; padding: 18px 20px;
      color: #f4f1e9; background: rgba(9,10,11,0.9); border-left: 5px solid #f36a21;
    }
    #${ROOT_ID} [data-layout="vogue"] .tt-copy {
      left: 4%; bottom: 5%; width: 39%; padding: 16px 18px;
      color: #101112; background: rgba(242,240,232,0.93); border-top: 5px solid #9eb323;
    }
    #${ROOT_ID} [data-layout="vogue"] .tt-copy h2 { font-size: 25px; }
    #${ROOT_ID} [data-layout="bobilonia"] .tt-copy {
      left: 3.2%; bottom: 4.5%; width: 45%; padding: 14px 16px;
      color: #f5f2e9; background: rgba(8,9,10,0.92); border-top: 5px solid #f36a21;
    }
    #${ROOT_ID} [data-layout="bobilonia"] .tt-copy h2 { font-size: 28px; }
    #${ROOT_ID} [data-layout="manifesto"] .tt-copy {
      right: 3.5%; bottom: 5%; width: 42%; padding: 16px 18px;
      color: #101112; background: rgba(244,241,233,0.94); border-left: 5px solid #f36a21;
    }
    #${ROOT_ID} [data-layout="manifesto"] .tt-copy h2 { font-size: 27px; }
    #${ROOT_ID} .tt-inset {
      position: absolute; z-index: 3; margin: 0; overflow: hidden;
      background: #08090a; border: 4px solid #f2efe8; box-shadow: 0 8px 22px rgba(0,0,0,0.42);
    }
    #${ROOT_ID} .tt-inset img { display: block; width: 100%; height: 100%; object-fit: cover; }
    #${ROOT_ID} .tt-inset-street { top: 9%; right: 4%; width: 43%; aspect-ratio: 16 / 9; }
    #${ROOT_ID} .tt-inset-maze { right: 6%; bottom: 6%; width: 18%; aspect-ratio: 1 / 1; border-width: 3px; }
    #${ROOT_ID} .tt-transition { z-index: 8; transform-style: preserve-3d; }
    #${ROOT_ID} .tt-transition[hidden] { display: none; }
    #${ROOT_ID} .tt-slice,
    #${ROOT_ID} .tt-turn-sheet,
    #${ROOT_ID} .tt-sheet-face { position: absolute; top: 0; width: 50%; height: 100%; overflow: hidden; }
    #${ROOT_ID} .tt-slice::before,
    #${ROOT_ID} .tt-sheet-face::before {
      content: ""; position: absolute; top: 0; width: 200%; height: 100%;
      background-image: var(--tt-image); background-size: cover; background-position: var(--tt-position);
      background-repeat: no-repeat;
    }
    #${ROOT_ID} .tt-left { left: 0; }
    #${ROOT_ID} .tt-right { right: 0; }
    #${ROOT_ID} .tt-left::before { left: 0; }
    #${ROOT_ID} .tt-right::before { left: -100%; }
    #${ROOT_ID} .tt-turn-sheet { z-index: 3; overflow: visible; transform-style: preserve-3d; }
    #${ROOT_ID} .tt-turn-sheet.is-forward { left: 50%; transform-origin: left center; }
    #${ROOT_ID} .tt-turn-sheet.is-backward { left: 0; transform-origin: right center; }
    #${ROOT_ID} .tt-turn-sheet.is-forward.is-turning { animation: tt-turn-forward 820ms cubic-bezier(0.58,0.03,0.2,1) forwards; }
    #${ROOT_ID} .tt-turn-sheet.is-backward.is-turning { animation: tt-turn-backward 820ms cubic-bezier(0.58,0.03,0.2,1) forwards; }
    #${ROOT_ID} .tt-sheet-face { inset: 0; width: 100%; backface-visibility: hidden; background: #dedbd2; }
    #${ROOT_ID} .tt-sheet-back { transform: rotateY(180deg); }
    #${ROOT_ID} .tt-turn-sheet.is-forward .tt-sheet-front::before { left: -100%; }
    #${ROOT_ID} .tt-turn-sheet.is-forward .tt-sheet-back::before { left: 0; }
    #${ROOT_ID} .tt-turn-sheet.is-backward .tt-sheet-front::before { left: 0; }
    #${ROOT_ID} .tt-turn-sheet.is-backward .tt-sheet-back::before { left: -100%; }
    #${ROOT_ID} .tt-sheet-front { box-shadow: -12px 0 24px rgba(0,0,0,0.28); }
    #${ROOT_ID} .tt-sheet-back { box-shadow: 12px 0 24px rgba(0,0,0,0.28); }
    #${ROOT_ID} .tt-footer {
      min-width: 0; display: grid; grid-template-columns: 1fr auto 1fr; align-items: center;
      padding: 0 20px; background: #0a0b0c; border-top: 1px solid rgba(255,255,255,0.14);
    }
    #${ROOT_ID} .tt-dots { display: flex; align-items: center; gap: 8px; }
    #${ROOT_ID} .tt-dot {
      width: 20px; height: 20px; padding: 0; display: grid; place-items: center;
      background: transparent; border: 0; cursor: pointer;
    }
    #${ROOT_ID} .tt-dot::before { content: ""; width: 5px; height: 5px; background: #777; border-radius: 50%; }
    #${ROOT_ID} .tt-dot.is-active::before { width: 12px; border-radius: 1px; background: #f36a21; }
    #${ROOT_ID} .tt-credit { justify-self: end; color: rgba(244,241,233,0.5); font: 700 10px/1 "Courier New", monospace; }
    @keyframes tt-turn-forward { from { transform: rotateY(0deg); } to { transform: rotateY(-180deg); } }
    @keyframes tt-turn-backward { from { transform: rotateY(0deg); } to { transform: rotateY(180deg); } }
    @media (max-width: 820px) {
      #${ROOT_ID} { grid-template-rows: 46px minmax(0, 1fr) 34px; }
      #${ROOT_ID} .tt-topbar, #${ROOT_ID} .tt-footer { padding-inline: 10px; }
      #${ROOT_ID} .tt-brand span, #${ROOT_ID} .tt-credit { display: none; }
      #${ROOT_ID} .tt-stage { grid-template-columns: 34px minmax(0, auto) 34px; gap: 6px; padding: 8px 6px; }
      #${ROOT_ID} .tt-nav { width: 34px; height: 46px; font-size: 28px; }
      #${ROOT_ID} .tt-magazine { width: min(calc(100vw - 80px), calc((100svh - 98px) * 1.55)); }
      #${ROOT_ID} .tt-copy { padding: 9px 10px !important; }
      #${ROOT_ID} .tt-copy .tt-kicker { margin-bottom: 4px; font-size: 7px; }
      #${ROOT_ID} .tt-copy h2 { margin-bottom: 5px; font-size: 16px !important; }
      #${ROOT_ID} .tt-copy p { font-size: 8px; line-height: 1.28; }
      #${ROOT_ID} .tt-copy small { display: none; }
      #${ROOT_ID} .tt-inset { border-width: 2px; }
    }
    @media (prefers-reduced-motion: reduce) {
      #${ROOT_ID}, #${ROOT_ID} .tt-current,
      #${ROOT_ID} .tt-turn-sheet { transition: none; animation-duration: 1ms !important; }
    }
  `;
  document.head.appendChild(style);
}

function editorialMarkup(spread) {
  const insets = (spread.insets ?? []).map((inset) => `
    <figure class="tt-inset ${inset.className}">
      <img src="${inset.image}" alt="${inset.alt}">
    </figure>
  `).join('');
  return `
    <div class="tt-editorial" data-layout="${spread.layout}">
      ${insets}
      <div class="tt-copy">
        <span class="tt-kicker">${spread.kicker}</span>
        <h2>${spread.title}</h2>
        <p>${spread.body}</p>
        ${spread.note ? `<small>${spread.note}</small>` : ''}
      </div>
    </div>
  `;
}

function setSlice(element, spread, side) {
  element.className = `tt-slice tt-${side}`;
  element.style.setProperty('--tt-image', `url("${spread.image}")`);
  element.style.setProperty('--tt-position', spread.imagePosition);
}

function setSheetFace(element, spread) {
  element.style.setProperty('--tt-image', `url("${spread.image}")`);
  element.style.setProperty('--tt-position', spread.imagePosition);
}

export function createTwentyTimeReader({ onOpenChange = () => {} } = {}) {
  injectStyles();
  const root = document.createElement('section');
  root.id = ROOT_ID;
  root.setAttribute('role', 'dialog');
  root.setAttribute('aria-modal', 'true');
  root.setAttribute('aria-label', 'Lector de Twenty Time');
  root.setAttribute('aria-hidden', 'true');
  root.innerHTML = `
    <header class="tt-topbar">
      <div class="tt-brand"><strong>TWENTY TIME</strong><span>EDICION DE PRUEBA</span></div>
      <span class="tt-counter" aria-live="polite"></span>
      <button type="button" class="tt-close" data-action="close" aria-label="Cerrar revista" title="Cerrar">x</button>
    </header>
    <div class="tt-stage">
      <button type="button" class="tt-nav tt-prev" data-action="previous" aria-label="Pagina anterior" title="Pagina anterior">&#8249;</button>
      <div class="tt-magazine">
        <article class="tt-current"></article>
        <div class="tt-transition" hidden aria-hidden="true">
          <div class="tt-slice tt-base-left"></div>
          <div class="tt-slice tt-base-right"></div>
          <div class="tt-turn-sheet">
            <div class="tt-sheet-face tt-sheet-front"></div>
            <div class="tt-sheet-face tt-sheet-back"></div>
          </div>
        </div>
        <div class="tt-fold" aria-hidden="true"></div>
      </div>
      <button type="button" class="tt-nav tt-next" data-action="next" aria-label="Pagina siguiente" title="Pagina siguiente">&#8250;</button>
    </div>
    <footer class="tt-footer">
      <span class="tt-section"></span>
      <div class="tt-dots" aria-label="Paginas"></div>
      <span class="tt-credit">FOURTWENTY / BURELA</span>
    </footer>
  `;
  document.body.appendChild(root);

  const current = root.querySelector('.tt-current');
  const transition = root.querySelector('.tt-transition');
  const baseLeft = root.querySelector('.tt-base-left');
  const baseRight = root.querySelector('.tt-base-right');
  const sheet = root.querySelector('.tt-turn-sheet');
  const sheetFront = root.querySelector('.tt-sheet-front');
  const sheetBack = root.querySelector('.tt-sheet-back');
  const previousButton = root.querySelector('.tt-prev');
  const nextButton = root.querySelector('.tt-next');
  const closeButton = root.querySelector('.tt-close');
  const counter = root.querySelector('.tt-counter');
  const section = root.querySelector('.tt-section');
  const dots = root.querySelector('.tt-dots');
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  let index = 0;
  let open = false;
  let turning = false;
  let turnRevision = 0;
  let focusBeforeOpen = null;

  for (const [dotIndex] of TWENTY_TIME_ISSUE.entries()) {
    const dot = document.createElement('button');
    dot.type = 'button';
    dot.className = 'tt-dot';
    dot.dataset.page = String(dotIndex);
    dot.setAttribute('aria-label', `Abrir pagina ${dotIndex + 1}`);
    dots.appendChild(dot);
  }

  for (const spread of TWENTY_TIME_ISSUE) {
    const image = new Image();
    image.decoding = 'async';
    image.src = spread.image;
    for (const inset of spread.insets ?? []) {
      const insetImage = new Image();
      insetImage.decoding = 'async';
      insetImage.src = inset.image;
    }
  }

  function renderCurrent() {
    const spread = TWENTY_TIME_ISSUE[index];
    current.dataset.layout = spread.layout;
    current.innerHTML = `
      <img class="tt-main-image" src="${spread.image}" alt="${spread.alt}" style="object-position:${spread.imagePosition}">
      <div class="tt-paper-tint" aria-hidden="true"></div>
      ${editorialMarkup(spread)}
    `;
  }

  function syncControls() {
    const spread = TWENTY_TIME_ISSUE[index];
    previousButton.disabled = turning || index === 0;
    nextButton.disabled = turning || index === TWENTY_TIME_ISSUE.length - 1;
    counter.textContent = `${String(index + 1).padStart(2, '0')} / ${String(TWENTY_TIME_ISSUE.length).padStart(2, '0')}`;
    section.textContent = spread.section;
    for (const [dotIndex, dot] of Array.from(dots.children).entries()) {
      dot.classList.toggle('is-active', dotIndex === index);
      dot.setAttribute('aria-current', dotIndex === index ? 'page' : 'false');
      dot.disabled = turning;
    }
  }

  function finishTurn(targetIndex, revision) {
    if (revision !== turnRevision || !turning) return;
    index = targetIndex;
    turning = false;
    transition.hidden = true;
    sheet.className = 'tt-turn-sheet';
    current.classList.remove('is-turning');
    renderCurrent();
    syncControls();
  }

  function turnTo(targetIndex) {
    if (!open || turning || targetIndex === index || !TWENTY_TIME_ISSUE[targetIndex]) return false;
    if (reduceMotion.matches) {
      index = targetIndex;
      renderCurrent();
      syncControls();
      return true;
    }

    turning = true;
    const revision = ++turnRevision;
    const outgoing = TWENTY_TIME_ISSUE[index];
    const incoming = TWENTY_TIME_ISSUE[targetIndex];
    const forward = targetIndex > index;
    current.classList.add('is-turning');
    transition.hidden = false;

    setSlice(baseLeft, forward ? outgoing : incoming, 'left');
    setSlice(baseRight, forward ? incoming : outgoing, 'right');
    setSheetFace(sheetFront, outgoing);
    setSheetFace(sheetBack, incoming);
    sheet.className = `tt-turn-sheet ${forward ? 'is-forward' : 'is-backward'}`;
    syncControls();

    requestAnimationFrame(() => {
      if (revision !== turnRevision) return;
      sheet.classList.add('is-turning');
    });
    const onAnimationEnd = () => finishTurn(targetIndex, revision);
    sheet.addEventListener('animationend', onAnimationEnd, { once: true });
    window.setTimeout(onAnimationEnd, TURN_DURATION_MS + 120);
    return true;
  }

  function show() {
    if (open) return false;
    open = true;
    index = 0;
    turning = false;
    turnRevision += 1;
    focusBeforeOpen = document.activeElement;
    transition.hidden = true;
    renderCurrent();
    syncControls();
    root.classList.add('is-open');
    root.setAttribute('aria-hidden', 'false');
    document.body.classList.add('twenty-time-open');
    onOpenChange(true);
    requestAnimationFrame(() => closeButton.focus({ preventScroll: true }));
    return true;
  }

  function hide() {
    if (!open) return false;
    open = false;
    turning = false;
    turnRevision += 1;
    transition.hidden = true;
    root.classList.remove('is-open');
    root.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('twenty-time-open');
    onOpenChange(false);
    focusBeforeOpen?.focus?.({ preventScroll: true });
    focusBeforeOpen = null;
    return true;
  }

  root.addEventListener('click', (event) => {
    event.stopPropagation();
    const button = event.target.closest('button');
    if (!button) return;
    if (button.dataset.action === 'close') hide();
    if (button.dataset.action === 'previous') turnTo(index - 1);
    if (button.dataset.action === 'next') turnTo(index + 1);
    if (button.dataset.page !== undefined) turnTo(Number(button.dataset.page));
  });
  root.addEventListener('pointerdown', (event) => event.stopPropagation());
  window.addEventListener('keydown', (event) => {
    if (!open) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      hide();
    } else if (event.key === 'ArrowRight' || event.key === 'PageDown') {
      event.preventDefault();
      turnTo(index + 1);
    } else if (event.key === 'ArrowLeft' || event.key === 'PageUp') {
      event.preventDefault();
      turnTo(index - 1);
    }
  }, true);

  return {
    show,
    hide,
    next: () => turnTo(index + 1),
    previous: () => turnTo(index - 1),
    isOpen: () => open,
    getPage: () => index,
  };
}
