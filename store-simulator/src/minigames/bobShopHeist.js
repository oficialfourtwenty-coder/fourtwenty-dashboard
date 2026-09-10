const WIDTH = 1200;
const HEIGHT = 760;
const GOAL = 1000000;
const PLAYER_RADIUS = 13;
const PLAYER_SPEED = 178;
const STEAL_SECONDS = 0.72;

const KEYS = {
  ArrowUp: [0, -1], KeyW: [0, -1],
  ArrowDown: [0, 1], KeyS: [0, 1],
  ArrowLeft: [-1, 0], KeyA: [-1, 0],
  ArrowRight: [1, 0], KeyD: [1, 0],
};

const WALLS = Object.freeze([
  // Perimeter and divider.
  { x: 28, y: 64, w: 1144, h: 18 },
  { x: 28, y: 676, w: 1144, h: 18 },
  { x: 28, y: 64, w: 18, h: 630 },
  { x: 1154, y: 64, w: 18, h: 630 },
  { x: 28, y: 370, w: 1010, h: 18 },
  { x: 1110, y: 370, w: 62, h: 18 },

  // Floor 1 aisles.
  { x: 115, y: 462, w: 205, h: 34 },
  { x: 115, y: 568, w: 205, h: 34 },
  { x: 395, y: 440, w: 36, h: 178 },
  { x: 510, y: 456, w: 265, h: 34 },
  { x: 510, y: 574, w: 265, h: 34 },
  { x: 868, y: 440, w: 44, h: 176 },

  // Floor 2 aisles.
  { x: 116, y: 142, w: 236, h: 34 },
  { x: 116, y: 258, w: 236, h: 34 },
  { x: 448, y: 126, w: 36, h: 204 },
  { x: 565, y: 142, w: 260, h: 34 },
  { x: 565, y: 258, w: 260, h: 34 },
  { x: 925, y: 126, w: 42, h: 204 },
]);

const COUNTERS = Object.freeze([
  { x: 58, y: 396, w: 128, h: 42, label: 'CAJA' },
  { x: 58, y: 92, w: 150, h: 42, label: 'STOCK' },
  { x: 1000, y: 98, w: 118, h: 236, label: 'VIDRIERA' },
  { x: 986, y: 426, w: 128, h: 206, label: 'PROBADOR' },
]);

const STAIRS = Object.freeze({
  down: { x: 1043, y: 394, w: 92, h: 78, label: 'SUBIR' },
  up: { x: 1043, y: 286, w: 92, h: 66, label: 'BAJAR' },
});

const ITEMS = Object.freeze([
  { id: 'hoodie-a', x: 196, y: 442, value: 82000, name: 'Hoodie ORIGEN' },
  { id: 'tee-a', x: 292, y: 522, value: 46000, name: 'Remera FT' },
  { id: 'pants-a', x: 526, y: 430, value: 118000, name: 'Jean BOB' },
  { id: 'jacket-a', x: 720, y: 537, value: 185000, name: 'Campera' },
  { id: 'bag-a', x: 886, y: 416, value: 96000, name: 'Bolso' },
  { id: 'cap-a', x: 905, y: 620, value: 39000, name: 'Gorra' },
  { id: 'sneaker-a', x: 262, y: 616, value: 145000, name: 'Zapas' },
  { id: 'chain-a', x: 582, y: 620, value: 128000, name: 'Cadena' },
  { id: 'hoodie-b', x: 172, y: 122, value: 89000, name: 'Hoodie BOB' },
  { id: 'jacket-b', x: 322, y: 218, value: 210000, name: 'Campera cuero' },
  { id: 'watch-b', x: 538, y: 112, value: 155000, name: 'Reloj' },
  { id: 'set-b', x: 790, y: 214, value: 240000, name: 'Set limitado' },
  { id: 'tee-b', x: 610, y: 332, value: 52000, name: 'Remera BOB' },
  { id: 'bag-b', x: 902, y: 334, value: 104000, name: 'Mochila' },
]);

const GUARDS = Object.freeze([
  {
    name: 'SEGURIDAD 1',
    color: '#e2bf52',
    path: [[226, 408], [226, 646], [860, 646], [860, 408]],
    speed: 82,
    cone: 170,
    fov: Math.PI * 0.34,
  },
  {
    name: 'SEGURIDAD 2',
    color: '#d65f5f',
    path: [[604, 414], [958, 520], [604, 646], [320, 520]],
    speed: 76,
    cone: 150,
    fov: Math.PI * 0.31,
  },
  {
    name: 'SEGURIDAD 3',
    color: '#5eb5d8',
    path: [[256, 110], [880, 110], [880, 326], [256, 326]],
    speed: 86,
    cone: 178,
    fov: Math.PI * 0.32,
  },
]);

function money(value) {
  return `$${Math.round(value).toLocaleString('es-AR')}`;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function pointInRect(point, rect, pad = 0) {
  return point.x >= rect.x - pad && point.x <= rect.x + rect.w + pad
    && point.y >= rect.y - pad && point.y <= rect.y + rect.h + pad;
}

function segmentIntersectsRect(a, b, rect) {
  if (pointInRect(a, rect) || pointInRect(b, rect)) return true;
  const edges = [
    [{ x: rect.x, y: rect.y }, { x: rect.x + rect.w, y: rect.y }],
    [{ x: rect.x + rect.w, y: rect.y }, { x: rect.x + rect.w, y: rect.y + rect.h }],
    [{ x: rect.x + rect.w, y: rect.y + rect.h }, { x: rect.x, y: rect.y + rect.h }],
    [{ x: rect.x, y: rect.y + rect.h }, { x: rect.x, y: rect.y }],
  ];
  return edges.some(([c, d]) => segmentsIntersect(a, b, c, d));
}

function segmentsIntersect(a, b, c, d) {
  const det = (b.x - a.x) * (d.y - c.y) - (b.y - a.y) * (d.x - c.x);
  if (Math.abs(det) < 0.0001) return false;
  const t = ((c.x - a.x) * (d.y - c.y) - (c.y - a.y) * (d.x - c.x)) / det;
  const u = ((c.x - a.x) * (b.y - a.y) - (c.y - a.y) * (b.x - a.x)) / det;
  return t >= 0 && t <= 1 && u >= 0 && u <= 1;
}

function collides(x, y) {
  const probe = { x, y };
  return WALLS.some((wall) => pointInRect(probe, wall, PLAYER_RADIUS))
    || COUNTERS.some((wall) => pointInRect(probe, wall, PLAYER_RADIUS));
}

function makeGuard(config) {
  const [x, y] = config.path[0];
  return {
    ...config,
    x,
    y,
    target: 1,
    angle: 0,
    pause: 0.5,
    sweep: 0,
    alert: 0,
  };
}

export function createBobShopHeistGame() {
  let root;
  let canvas;
  let ctx;
  let lootEl;
  let targetEl;
  let suspicionEl;
  let hintEl;
  let onResult = () => {};
  let keys = new Set();
  let pointer = null;
  let player;
  let guards;
  let items;
  let loot;
  let suspicion;
  let steal;
  let running = false;
  let finished = false;
  let animationFrame = 0;
  let previousTime = 0;
  let message = 'Robá prendas sin quedar en el cono de visión.';
  let messageTime = 4;

  function mount({ container, onResult: report }) {
    onResult = report;
    root = document.createElement('div');
    root.className = 'bob-heist-game';
    root.innerHTML = `
      <div class="bob-heist-hud">
        <span>BOB SHOP HEIST</span>
        <span>BOTIN <strong data-loot>$0</strong></span>
        <span>META <strong data-target>${money(GOAL)}</strong></span>
        <span>SOSPECHA <strong data-suspicion>0%</strong></span>
      </div>
      <canvas width="${WIDTH}" height="${HEIGHT}" aria-label="BOB robando prendas en FOURTWENTY"></canvas>
      <div class="bob-heist-hint" data-hint></div>
      <div class="bob-heist-progress" hidden><i></i></div>
    `;
    container.append(root);
    canvas = root.querySelector('canvas');
    ctx = canvas.getContext('2d');
    lootEl = root.querySelector('[data-loot]');
    targetEl = root.querySelector('[data-target]');
    suspicionEl = root.querySelector('[data-suspicion]');
    hintEl = root.querySelector('[data-hint]');
    targetEl.textContent = money(GOAL);
    window.addEventListener('keydown', onKeyDown, { capture: true });
    window.addEventListener('keyup', onKeyUp, { capture: true });
    canvas.addEventListener('pointerdown', onPointerDown);
    canvas.addEventListener('pointermove', onPointerMove);
    canvas.addEventListener('pointerup', onPointerUp);
    canvas.addEventListener('pointercancel', onPointerUp);
  }

  function start() {
    player = { x: 92, y: 636, vx: 0, vy: 0, floor: 1, moving: false };
    guards = GUARDS.map(makeGuard);
    items = ITEMS.map((item) => ({ ...item, stolen: false, progress: 0 }));
    loot = 0;
    suspicion = 0;
    steal = null;
    running = true;
    finished = false;
    previousTime = performance.now();
    updateHud();
    animationFrame = requestAnimationFrame(tick);
  }

  function tick(now) {
    if (!running || finished) return;
    const dt = Math.min(0.045, Math.max(0, (now - previousTime) / 1000));
    previousTime = now;
    updatePlayer(dt);
    updateGuards(dt);
    updateSteal(dt);
    updateSuspicion(dt);
    updateMessage(dt);
    updateHud();
    draw();
    if (!finished) animationFrame = requestAnimationFrame(tick);
  }

  function updatePlayer(dt) {
    let dx = 0;
    let dy = 0;
    for (const [code, dir] of Object.entries(KEYS)) {
      if (!keys.has(code)) continue;
      dx += dir[0];
      dy += dir[1];
    }
    if (pointer) {
      const mx = pointer.x - player.x;
      const my = pointer.y - player.y;
      const distance = Math.hypot(mx, my);
      if (distance > 8) {
        dx += mx / distance;
        dy += my / distance;
      }
    }
    const length = Math.hypot(dx, dy);
    player.moving = length > 0.05;
    if (length > 0.05) {
      const step = PLAYER_SPEED * dt;
      movePlayer((dx / length) * step, 0);
      movePlayer(0, (dy / length) * step);
    }
    const stairs = player.y > 370 ? STAIRS.down : STAIRS.up;
    if (pointInRect(player, stairs, 10)) {
      if (keys.has('KeyE') || keys.has('Space')) {
        player.y = player.y > 370 ? 326 : 434;
        player.x = 1088;
        pointer = null;
        setMessage(player.y > 370 ? 'Bajaste al primer piso.' : 'Subiste al segundo piso.', 1.5);
      } else {
        setMessage(`${stairs.label}: tocá E o ESPACIO`, 0.12);
      }
    }
  }

  function movePlayer(dx, dy) {
    const nextX = clamp(player.x + dx, 54, WIDTH - 54);
    const nextY = clamp(player.y + dy, 92, HEIGHT - 92);
    if (!collides(nextX, nextY)) {
      player.x = nextX;
      player.y = nextY;
    }
  }

  function updateGuards(dt) {
    for (const guard of guards) {
      if (guard.pause > 0) {
        guard.pause -= dt;
        guard.sweep += dt * 2.2;
        const next = guard.path[guard.target];
        guard.angle = Math.atan2(next[1] - guard.y, next[0] - guard.x) + Math.sin(guard.sweep) * 0.72;
        continue;
      }
      const next = guard.path[guard.target];
      const dx = next[0] - guard.x;
      const dy = next[1] - guard.y;
      const distance = Math.hypot(dx, dy);
      guard.angle = Math.atan2(dy, dx);
      if (distance < guard.speed * dt) {
        guard.x = next[0];
        guard.y = next[1];
        guard.target = (guard.target + 1) % guard.path.length;
        guard.pause = 0.55 + Math.random() * 0.55;
      } else {
        guard.x += (dx / distance) * guard.speed * dt;
        guard.y += (dy / distance) * guard.speed * dt;
      }
    }
  }

  function updateSteal(dt) {
    const nearby = nearestItem();
    const wantsSteal = keys.has('KeyE') || keys.has('Space');
    if (!nearby) {
      steal = null;
      setProgress(0);
      if (!messageTime) setMessage('Buscá prendas con precio y acercate.', 0.2);
      return;
    }
    if (!wantsSteal) {
      steal = null;
      setProgress(0);
      setMessage(`E para guardar ${nearby.name} (${money(nearby.value)})`, 0.12);
      return;
    }
    if (!steal || steal.id !== nearby.id) steal = { id: nearby.id, time: 0 };
    steal.time += dt;
    setProgress(steal.time / STEAL_SECONDS);
    player.moving = false;
    setMessage(`Guardando ${nearby.name}...`, 0.12);
    if (steal.time >= STEAL_SECONDS) {
      nearby.stolen = true;
      loot += nearby.value;
      setProgress(0);
      setMessage(`Te llevaste ${nearby.name}: ${money(nearby.value)}`, 1.4);
      steal = null;
      if (loot >= GOAL) finish('win');
    }
  }

  function updateSuspicion(dt) {
    const seen = guards.filter((guard) => guardSeesPlayer(guard));
    if (seen.length) {
      const stealingBoost = steal ? 30 : 0;
      const movementBoost = player.moving ? 24 : 8;
      suspicion += (34 + movementBoost + stealingBoost) * seen.length * dt;
      for (const guard of seen) guard.alert = 1;
      setMessage(steal ? 'Te están mirando mientras robás.' : 'Quieto: seguridad te está mirando.', 0.16);
    } else {
      suspicion -= (steal ? 4 : 22) * dt;
    }
    suspicion = clamp(suspicion, 0, 100);
    if (suspicion >= 100) finish('lose');
    for (const guard of guards) guard.alert = Math.max(0, guard.alert - dt * 1.4);
  }

  function updateMessage(dt) {
    messageTime = Math.max(0, messageTime - dt);
    if (hintEl) hintEl.textContent = message;
  }

  function nearestItem() {
    let winner = null;
    let best = 54;
    for (const item of items) {
      if (item.stolen) continue;
      const distance = Math.hypot(item.x - player.x, item.y - player.y);
      if (distance < best) {
        best = distance;
        winner = item;
      }
    }
    return winner;
  }

  function guardSeesPlayer(guard) {
    if ((guard.y < 370) !== (player.y < 370)) return false;
    const dx = player.x - guard.x;
    const dy = player.y - guard.y;
    const distance = Math.hypot(dx, dy);
    if (distance > guard.cone) return false;
    let angle = Math.atan2(dy, dx) - guard.angle;
    while (angle > Math.PI) angle -= Math.PI * 2;
    while (angle < -Math.PI) angle += Math.PI * 2;
    if (Math.abs(angle) > guard.fov) return false;
    const a = { x: guard.x, y: guard.y };
    const b = { x: player.x, y: player.y };
    return !WALLS.some((wall) => segmentIntersectsRect(a, b, wall));
  }

  function finish(result) {
    if (finished) return;
    finished = true;
    running = false;
    cancelAnimationFrame(animationFrame);
    onResult(result);
  }

  function setMessage(text, seconds) {
    if (messageTime > seconds && message === text) return;
    message = text;
    messageTime = seconds;
  }

  function setProgress(value) {
    const bar = root?.querySelector('.bob-heist-progress');
    const fill = bar?.querySelector('i');
    if (!bar || !fill) return;
    const visible = value > 0 && value < 1;
    bar.hidden = !visible;
    fill.style.width = `${clamp(value, 0, 1) * 100}%`;
  }

  function updateHud() {
    if (!lootEl) return;
    lootEl.textContent = money(loot);
    suspicionEl.textContent = `${Math.round(suspicion)}%`;
    suspicionEl.style.color = suspicion > 68 ? '#ff5c54' : suspicion > 35 ? '#ffd66b' : '#f4f4f4';
  }

  function draw() {
    ctx.clearRect(0, 0, WIDTH, HEIGHT);
    drawStore();
    drawGuardVision();
    drawItems();
    drawGuards();
    drawPlayer();
  }

  function drawStore() {
    ctx.fillStyle = '#151410';
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
    drawFloor(46, 82, 1108, 288, 'PISO 2 · BOB COLLECTION');
    drawFloor(46, 388, 1108, 288, 'PISO 1 · FOURTWENTY STORE');
    for (const wall of WALLS) drawBlock(wall, '#2a2921', '#494634');
    for (const counter of COUNTERS) {
      drawBlock(counter, '#26211d', '#70593c');
      label(counter.label, counter.x + counter.w / 2, counter.y + counter.h / 2 + 4, '#d4c391', 11);
    }
    drawStairs(STAIRS.down);
    drawStairs(STAIRS.up);
  }

  function drawFloor(x, y, w, h, title) {
    const grad = ctx.createLinearGradient(x, y, x, y + h);
    grad.addColorStop(0, '#242116');
    grad.addColorStop(1, '#12120f');
    ctx.fillStyle = grad;
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = '#5b5136';
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, w, h);
    ctx.fillStyle = 'rgba(255,255,255,0.035)';
    for (let ix = x; ix < x + w; ix += 48) ctx.fillRect(ix, y, 1, h);
    for (let iy = y; iy < y + h; iy += 48) ctx.fillRect(x, iy, w, 1);
    label(title, x + 16, y + 24, '#ecd783', 13, 'left');
  }

  function drawBlock(rect, fill, stroke) {
    ctx.fillStyle = fill;
    ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
    ctx.strokeStyle = stroke;
    ctx.lineWidth = 2;
    ctx.strokeRect(rect.x + 1, rect.y + 1, rect.w - 2, rect.h - 2);
  }

  function drawStairs(rect) {
    drawBlock(rect, '#20262b', '#6a8891');
    ctx.strokeStyle = '#9fb7bd';
    ctx.lineWidth = 2;
    for (let y = rect.y + 12; y < rect.y + rect.h; y += 14) {
      ctx.beginPath();
      ctx.moveTo(rect.x + 10, y);
      ctx.lineTo(rect.x + rect.w - 10, y);
      ctx.stroke();
    }
    label(rect.label, rect.x + rect.w / 2, rect.y + rect.h / 2 + 4, '#dff4f5', 12);
  }

  function drawGuardVision() {
    for (const guard of guards) {
      const gradient = ctx.createRadialGradient(guard.x, guard.y, 10, guard.x, guard.y, guard.cone);
      gradient.addColorStop(0, guard.alert > 0 ? 'rgba(255,72,54,0.35)' : 'rgba(248,210,78,0.22)');
      gradient.addColorStop(1, 'rgba(248,210,78,0)');
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.moveTo(guard.x, guard.y);
      ctx.arc(guard.x, guard.y, guard.cone, guard.angle - guard.fov, guard.angle + guard.fov);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = guard.alert > 0 ? 'rgba(255,85,72,0.7)' : 'rgba(255,227,100,0.36)';
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  }

  function drawItems() {
    for (const item of items) {
      if (item.stolen) continue;
      ctx.save();
      ctx.translate(item.x, item.y);
      ctx.fillStyle = item.value >= 180000 ? '#d65262' : item.value >= 100000 ? '#e6b94c' : '#7fbf78';
      ctx.strokeStyle = '#17140d';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.roundRect(-17, -12, 34, 24, 5);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#111';
      ctx.fillRect(-5, -17, 10, 7);
      ctx.restore();
      label(money(item.value), item.x, item.y - 24, '#f2e8b7', 10);
    }
  }

  function drawGuards() {
    for (const guard of guards) {
      ctx.save();
      ctx.translate(guard.x, guard.y);
      ctx.rotate(guard.angle);
      ctx.fillStyle = guard.alert > 0 ? '#ff4438' : guard.color;
      ctx.beginPath();
      ctx.arc(0, 0, 16, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#161616';
      ctx.fillRect(1, -5, 18, 10);
      ctx.restore();
    }
  }

  function drawPlayer() {
    ctx.save();
    ctx.translate(player.x, player.y);
    ctx.fillStyle = steal ? '#ffe05d' : '#7a5cff';
    ctx.beginPath();
    ctx.arc(0, 0, PLAYER_RADIUS, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#f6f1d0';
    ctx.beginPath();
    ctx.arc(5, -5, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    label('BOB', player.x, player.y - 22, '#ffffff', 11);
  }

  function label(text, x, y, color, size, align = 'center') {
    ctx.fillStyle = color;
    ctx.font = `700 ${size}px "Courier New", monospace`;
    ctx.textAlign = align;
    ctx.textBaseline = 'middle';
    ctx.fillText(text, x, y);
  }

  function canvasPoint(event) {
    const box = canvas.getBoundingClientRect();
    const scale = Math.min(box.width / WIDTH, box.height / HEIGHT);
    const drawnW = WIDTH * scale;
    const drawnH = HEIGHT * scale;
    return {
      x: clamp((event.clientX - box.left - (box.width - drawnW) / 2) / scale, 0, WIDTH),
      y: clamp((event.clientY - box.top - (box.height - drawnH) / 2) / scale, 0, HEIGHT),
    };
  }

  function onKeyDown(event) {
    if (!running) return;
    if (KEYS[event.code] || event.code === 'KeyE' || event.code === 'Space') {
      event.preventDefault();
      event.stopPropagation();
      keys.add(event.code);
    }
  }

  function onKeyUp(event) {
    if (KEYS[event.code] || event.code === 'KeyE' || event.code === 'Space') {
      event.preventDefault();
      event.stopPropagation();
      keys.delete(event.code);
    }
  }

  function onPointerDown(event) {
    pointer = canvasPoint(event);
    canvas.setPointerCapture?.(event.pointerId);
  }

  function onPointerMove(event) {
    if (!pointer) return;
    pointer = canvasPoint(event);
  }

  function onPointerUp() {
    pointer = null;
  }

  function pause() {
    running = false;
    cancelAnimationFrame(animationFrame);
  }

  function destroy() {
    pause();
    window.removeEventListener('keydown', onKeyDown, { capture: true });
    window.removeEventListener('keyup', onKeyUp, { capture: true });
    canvas?.removeEventListener('pointerdown', onPointerDown);
    canvas?.removeEventListener('pointermove', onPointerMove);
    canvas?.removeEventListener('pointerup', onPointerUp);
    canvas?.removeEventListener('pointercancel', onPointerUp);
    root?.remove();
    root = null;
  }

  return { mount, start, pause, destroy, resize: draw };
}
