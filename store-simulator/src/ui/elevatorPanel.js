const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const ROW_TOPS = new Map([
  [5, 12.0],
  [4, 20.4],
  [3, 28.6],
  [2, 36.9],
  [1, 45.1],
  [0, 53.1],
]);

function ledLines(destination) {
  if (!destination) return [];
  const label = String(destination.label ?? destination.hudLabel ?? '').trim().toUpperCase();
  const section = label.match(/^SECCION\s+(.+)$/);
  return section ? ['SECCION', section[1]] : [label];
}

export function initElevatorPanel({ destinations, onSelect }) {
  const panel = document.getElementById('elevator-panel');
  const options = document.getElementById('elevator-floor-options');
  const fade = document.getElementById('elevator-fade');
  const display = document.getElementById('elevator-led-display');
  const mask = document.createElement('canvas');
  const maskContext = mask.getContext('2d', { willReadFrequently: true });
  const buttons = new Map();
  const destinationsById = new Map(destinations.map((destination) => [destination.id, destination]));
  let visible = false;
  let busy = false;
  let displayedDestination = null;
  let selectTimer = 0;

  function drawLedDisplay(destination = displayedDestination) {
    if (!display || !maskContext) return;
    displayedDestination = destination;
    const rect = display.getBoundingClientRect();
    if (rect.width < 2 || rect.height < 2) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const pixelWidth = Math.max(1, Math.round(rect.width * dpr));
    const pixelHeight = Math.max(1, Math.round(rect.height * dpr));
    if (display.width !== pixelWidth || display.height !== pixelHeight) {
      display.width = pixelWidth;
      display.height = pixelHeight;
    }

    const context = display.getContext('2d');
    context.setTransform(dpr, 0, 0, dpr, 0, 0);
    context.clearRect(0, 0, rect.width, rect.height);
    const lines = ledLines(destination);
    display.setAttribute('aria-label', destination ? `Piso seleccionado: ${destination.label}` : 'Pantalla del ascensor apagada');
    if (!lines.length) return;

    const pitch = Math.max(4.5, Math.min(6.5, rect.width / 76));
    const columns = Math.max(32, Math.floor(rect.width / pitch));
    const rows = Math.max(16, Math.floor(rect.height / pitch));
    mask.width = columns;
    mask.height = rows;
    maskContext.clearRect(0, 0, columns, rows);
    maskContext.fillStyle = '#fff';
    maskContext.textAlign = 'center';
    maskContext.textBaseline = 'middle';

    let fontSize = Math.max(7, Math.floor(rows * (lines.length > 1 ? 0.27 : 0.38)));
    const maxTextWidth = columns - 7;
    const applyFont = () => {
      maskContext.font = `900 ${fontSize}px "Arial Narrow", Arial, sans-serif`;
    };
    applyFont();
    while (fontSize > 6 && Math.max(...lines.map((line) => maskContext.measureText(line).width)) > maxTextWidth) {
      fontSize -= 1;
      applyFont();
    }

    const lineHeight = fontSize * 1.22;
    const firstLineY = rows / 2 - ((lines.length - 1) * lineHeight) / 2;
    lines.forEach((line, index) => maskContext.fillText(line, columns / 2, firstLineY + index * lineHeight));

    const pixels = maskContext.getImageData(0, 0, columns, rows).data;
    const stepX = rect.width / columns;
    const stepY = rect.height / rows;
    const radius = Math.max(1, Math.min(stepX, stepY) * 0.24);
    const litDots = [];
    for (let y = 0; y < rows; y += 1) {
      for (let x = 0; x < columns; x += 1) {
        if (pixels[(y * columns + x) * 4 + 3] < 110) continue;
        litDots.push([(x + 0.5) * stepX, (y + 0.5) * stepY]);
      }
    }

    context.save();
    context.fillStyle = '#ef2029';
    context.shadowColor = '#ff1b25';
    context.shadowBlur = radius * 3.2;
    context.beginPath();
    for (const [x, y] of litDots) {
      context.moveTo(x + radius, y);
      context.arc(x, y, radius, 0, Math.PI * 2);
    }
    context.fill();
    context.shadowBlur = 0;
    context.fillStyle = '#ff7379';
    context.beginPath();
    for (const [x, y] of litDots) {
      context.moveTo(x + radius * 0.38, y);
      context.arc(x, y, radius * 0.38, 0, Math.PI * 2);
    }
    context.fill();
    context.restore();
  }

  for (const destination of [...destinations].sort((a, b) => b.id - a.id)) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'elevator-floor-option';
    button.style.top = `${ROW_TOPS.get(destination.id)}%`;
    button.dataset.destination = String(destination.id);
    button.setAttribute('aria-label', `${destination.id}, ${destination.label}`);
    button.addEventListener('click', () => select(destination.id));
    options.append(button);
    buttons.set(destination.id, button);
  }

  function select(id) {
    if (!visible || busy) return;
    busy = true;
    for (const [buttonId, button] of buttons) {
      button.disabled = true;
      button.classList.toggle('selected', buttonId === id);
    }
    drawLedDisplay(destinationsById.get(id));
    window.clearTimeout(selectTimer);
    selectTimer = window.setTimeout(() => {
      selectTimer = 0;
      onSelect(id);
    }, 1000);
  }

  function onKeyDown(event) {
    if (!visible || busy || event.metaKey || event.ctrlKey || event.altKey) return;
    if (!/^Digit[0-5]$/.test(event.code)) return;
    event.preventDefault();
    event.stopPropagation();
    select(Number(event.code.slice(-1)));
  }
  window.addEventListener('keydown', onKeyDown, true);

  async function fadeToBlack(durationMs = 850) {
    fade.style.transitionDuration = `${durationMs}ms`;
    fade.style.transitionDelay = '0s, 0s';
    fade.classList.add('show');
    await wait(durationMs + 40);
  }

  async function fadeFromBlack(durationMs = 650) {
    fade.style.transitionDuration = `${durationMs}ms`;
    fade.style.transitionDelay = `0s, ${durationMs}ms`;
    fade.classList.remove('show');
    await wait(durationMs + 40);
  }

  function show(currentId) {
    window.clearTimeout(selectTimer);
    selectTimer = 0;
    visible = true;
    busy = false;
    panel.classList.add('show');
    panel.setAttribute('aria-hidden', 'false');
    document.body.classList.add('elevator-panel-open');
    for (const [id, button] of buttons) {
      button.disabled = false;
      button.classList.remove('selected');
      button.classList.toggle('current', id === currentId);
    }
    displayedDestination = null;
    window.requestAnimationFrame(() => drawLedDisplay(null));
  }

  function hide() {
    window.clearTimeout(selectTimer);
    selectTimer = 0;
    visible = false;
    panel.classList.remove('show');
    panel.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('elevator-panel-open');
    for (const button of buttons.values()) {
      button.disabled = true;
      button.classList.remove('selected', 'current');
    }
    drawLedDisplay(null);
  }

  window.addEventListener('resize', () => drawLedDisplay());

  return {
    show,
    hide,
    fadeToBlack,
    fadeFromBlack,
    isVisible: () => visible,
    isBusy: () => busy,
  };
}
