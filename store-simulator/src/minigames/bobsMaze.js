export const BOBS_MAZE_CONFIG = Object.freeze({
  playerSpritePath: '/assets/minigames/bobs-maze/bob-face.png',
  powerUpSpritePath: '/assets/minigames/bobs-maze/joint-fruit.png',
  mapBackgroundPath: '/assets/minigames/bobs-maze/maze-420.png',
  dotSpritePath: null,
  villainsSpriteSheetPath: null,
  villainSheetColumns: 4,
  villainSheetRows: 1,
  roundSeconds: 95,
  frightenedSeconds: 8,
});

const BOARD_W = 960;
const BOARD_H = 1106;
const DOT_LINK_DISTANCE = 40.5;
const KEY_DIRECTIONS = {
  ArrowUp: [0, -1], KeyW: [0, -1],
  ArrowDown: [0, 1], KeyS: [0, 1],
  ArrowLeft: [-1, 0], KeyA: [-1, 0],
  ArrowRight: [1, 0], KeyD: [1, 0],
};

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`No se pudo cargar ${src}`));
    image.src = src;
  });
}

function cropTransparentSprite(image, mode) {
  const source = document.createElement('canvas');
  source.width = image.naturalWidth;
  source.height = image.naturalHeight;
  const ctx = source.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(image, 0, 0);
  const frame = ctx.getImageData(0, 0, source.width, source.height);
  const { data } = frame;
  const total = source.width * source.height;
  const seed = new Uint8Array(total);

  for (let i = 0; i < total; i++) {
    const offset = i * 4;
    const r = data[offset];
    const g = data[offset + 1];
    const b = data[offset + 2];
    const spread = Math.max(r, g, b) - Math.min(r, g, b);
    const light = (r + g + b) / 3;
    seed[i] = mode === 'joint'
      ? (light > 26 ? 1 : 0)
      : (spread > 30 || light < 92 ? 1 : 0);
  }

  let mask;
  if (mode === 'joint') {
    mask = largestComponent(seed, source.width, source.height);
  } else {
    const outside = floodOutside(seed, source.width, source.height);
    mask = new Uint8Array(total);
    for (let i = 0; i < total; i++) mask[i] = outside[i] ? 0 : 1;
  }

  let minX = source.width;
  let minY = source.height;
  let maxX = 0;
  let maxY = 0;
  for (let y = 0; y < source.height; y++) {
    for (let x = 0; x < source.width; x++) {
      const index = y * source.width + x;
      data[index * 4 + 3] = mask[index] ? 255 : 0;
      if (!mask[index]) continue;
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    }
  }
  ctx.putImageData(frame, 0, 0);

  const padding = 3;
  minX = Math.max(0, minX - padding);
  minY = Math.max(0, minY - padding);
  maxX = Math.min(source.width - 1, maxX + padding);
  maxY = Math.min(source.height - 1, maxY + padding);
  const output = document.createElement('canvas');
  output.width = Math.max(1, maxX - minX + 1);
  output.height = Math.max(1, maxY - minY + 1);
  output.getContext('2d').drawImage(source, minX, minY, output.width, output.height, 0, 0, output.width, output.height);
  return output;
}

function floodOutside(seed, width, height) {
  const outside = new Uint8Array(seed.length);
  const queue = new Int32Array(seed.length);
  let read = 0;
  let write = 0;
  const add = (index) => {
    if (seed[index] || outside[index]) return;
    outside[index] = 1;
    queue[write++] = index;
  };
  for (let x = 0; x < width; x++) {
    add(x);
    add((height - 1) * width + x);
  }
  for (let y = 0; y < height; y++) {
    add(y * width);
    add(y * width + width - 1);
  }
  while (read < write) {
    const index = queue[read++];
    const x = index % width;
    const y = (index / width) | 0;
    if (x > 0) add(index - 1);
    if (x + 1 < width) add(index + 1);
    if (y > 0) add(index - width);
    if (y + 1 < height) add(index + width);
  }
  return outside;
}

function largestComponent(seed, width, height) {
  const visited = new Uint8Array(seed.length);
  const queue = new Int32Array(seed.length);
  let winner = [];
  for (let start = 0; start < seed.length; start++) {
    if (!seed[start] || visited[start]) continue;
    let read = 0;
    let write = 0;
    const component = [];
    queue[write++] = start;
    visited[start] = 1;
    while (read < write) {
      const index = queue[read++];
      component.push(index);
      const x = index % width;
      const y = (index / width) | 0;
      const neighbours = [x > 0 ? index - 1 : -1, x + 1 < width ? index + 1 : -1, y > 0 ? index - width : -1, y + 1 < height ? index + width : -1];
      for (const next of neighbours) {
        if (next < 0 || !seed[next] || visited[next]) continue;
        visited[next] = 1;
        queue[write++] = next;
      }
    }
    if (component.length > winner.length) winner = component;
  }
  const mask = new Uint8Array(seed.length);
  for (const index of winner) mask[index] = 1;
  return mask;
}

function prepareBoard(image) {
  const canvas = document.createElement('canvas');
  canvas.width = BOARD_W;
  canvas.height = BOARD_H;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(image, 0, 0, BOARD_W, BOARD_H);
  const frame = ctx.getImageData(0, 0, BOARD_W, BOARD_H);
  const { data } = frame;
  const total = BOARD_W * BOARD_H;
  const yellow = new Uint8Array(total);
  const walls = new Uint8Array(total);

  for (let i = 0; i < total; i++) {
    const offset = i * 4;
    const r = data[offset];
    const g = data[offset + 1];
    const b = data[offset + 2];
    yellow[i] = r > 150 && g > 125 && b < 155 && r - b > 45 ? 1 : 0;
    walls[i] = b > 55 && b - r > 25 && b - g > 15 ? 1 : 0;
  }

  const visited = new Uint8Array(total);
  const queue = new Int32Array(total);
  const nodes = [];
  for (let start = 0; start < total; start++) {
    if (!yellow[start] || visited[start]) continue;
    let read = 0;
    let write = 0;
    let sumX = 0;
    let sumY = 0;
    let minX = BOARD_W;
    let minY = BOARD_H;
    let maxX = 0;
    let maxY = 0;
    queue[write++] = start;
    visited[start] = 1;
    while (read < write) {
      const index = queue[read++];
      const x = index % BOARD_W;
      const y = (index / BOARD_W) | 0;
      sumX += x;
      sumY += y;
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
      const neighbours = [x > 0 ? index - 1 : -1, x + 1 < BOARD_W ? index + 1 : -1, y > 0 ? index - BOARD_W : -1, y + 1 < BOARD_H ? index + BOARD_W : -1];
      for (const next of neighbours) {
        if (next < 0 || !yellow[next] || visited[next]) continue;
        visited[next] = 1;
        queue[write++] = next;
      }
    }
    if (write < 8) continue;
    nodes.push({
      id: nodes.length,
      x: sumX / write,
      y: sumY / write,
      radius: write > 80 ? 10 : 4.2,
      eaten: false,
      neighbours: [],
    });
    for (let y = Math.max(0, minY - 3); y <= Math.min(BOARD_H - 1, maxY + 3); y++) {
      for (let x = Math.max(0, minX - 3); x <= Math.min(BOARD_W - 1, maxX + 3); x++) {
        const offset = (y * BOARD_W + x) * 4;
        data[offset] = 14;
        data[offset + 1] = 14;
        data[offset + 2] = 16;
      }
    }
  }

  // La marca gris de la esquina no forma parte del tablero.
  for (let y = 900; y < BOARD_H; y++) {
    for (let x = 790; x < BOARD_W; x++) {
      const offset = (y * BOARD_W + x) * 4;
      const r = data[offset];
      const g = data[offset + 1];
      const b = data[offset + 2];
      if (Math.max(r, g, b) - Math.min(r, g, b) < 18 && (r + g + b) / 3 > 45) {
        data[offset] = 14;
        data[offset + 1] = 14;
        data[offset + 2] = 16;
      }
    }
  }
  ctx.putImageData(frame, 0, 0);

  const lineIsClear = (a, b) => {
    const distance = Math.hypot(b.x - a.x, b.y - a.y);
    const steps = Math.ceil(distance);
    for (let step = 2; step < steps - 2; step++) {
      const t = step / steps;
      const x = Math.round(a.x + (b.x - a.x) * t);
      const y = Math.round(a.y + (b.y - a.y) * t);
      for (let oy = -1; oy <= 1; oy++) {
        for (let ox = -1; ox <= 1; ox++) {
          const px = x + ox;
          const py = y + oy;
          if (px >= 0 && px < BOARD_W && py >= 0 && py < BOARD_H && walls[py * BOARD_W + px]) return false;
        }
      }
    }
    return true;
  };

  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const distance = Math.hypot(nodes[i].x - nodes[j].x, nodes[i].y - nodes[j].y);
      if (distance > DOT_LINK_DISTANCE || !lineIsClear(nodes[i], nodes[j])) continue;
      nodes[i].neighbours.push(j);
      nodes[j].neighbours.push(i);
    }
  }
  return { canvas, nodes };
}

function closestNode(nodes, x, y, excluded = new Set()) {
  let winner = null;
  let distance = Infinity;
  for (const node of nodes) {
    if (excluded.has(node.id)) continue;
    const nextDistance = Math.hypot(node.x - x, node.y - y);
    if (nextDistance < distance) {
      winner = node;
      distance = nextDistance;
    }
  }
  return winner;
}

export function createBobsMazeGame(config = BOBS_MAZE_CONFIG) {
  let root;
  let canvas;
  let ctx;
  let loading;
  let dotsEl;
  let timeEl;
  let onResult = () => {};
  let board;
  let bobSprite;
  let jointSprite;
  let player;
  let enemies = [];
  let powerNode;
  let fruitAvailable = true;
  let eaten = 0;
  let remainingTime = config.roundSeconds;
  let frightened = 0;
  let running = false;
  let finished = false;
  let animationFrame = 0;
  let previousTime = 0;
  let desired = { x: 1, y: 0 };
  let pointerStart = null;

  function mount({ container, onResult: report }) {
    onResult = report;
    root = document.createElement('div');
    root.className = 'maze-game';
    root.innerHTML = `
      <div class="maze-status">
        <span>BOB'S MAZE</span>
        <span>PUNTOS <strong data-dots>0/0</strong></span>
        <span>TIEMPO <strong data-time>${config.roundSeconds}</strong></span>
      </div>
      <div class="maze-canvas-wrap">
        <canvas width="${BOARD_W}" height="${BOARD_H}" aria-label="Laberinto 420"></canvas>
        <div class="maze-loading">CARGANDO LABERINTO</div>
      </div>
    `;
    container.append(root);
    canvas = root.querySelector('canvas');
    ctx = canvas.getContext('2d');
    loading = root.querySelector('.maze-loading');
    dotsEl = root.querySelector('[data-dots]');
    timeEl = root.querySelector('[data-time]');
    window.addEventListener('keydown', keyDown, { capture: true });
    canvas.addEventListener('pointerdown', pointerDown);
    canvas.addEventListener('pointermove', pointerMove);
    canvas.addEventListener('pointerup', pointerUp);
    canvas.addEventListener('pointercancel', pointerUp);
  }

  async function start() {
    try {
      const [mapImage, bobImage, jointImage] = await Promise.all([
        loadImage(config.mapBackgroundPath),
        loadImage(config.playerSpritePath),
        loadImage(config.powerUpSpritePath),
      ]);
      if (!root) return;
      board = prepareBoard(mapImage);
      bobSprite = cropTransparentSprite(bobImage, 'bob');
      jointSprite = cropTransparentSprite(jointImage, 'joint');
      resetActors();
      loading.hidden = true;
      running = true;
      previousTime = performance.now();
      animationFrame = requestAnimationFrame(tick);
    } catch (error) {
      console.error('No se pudo iniciar BOB\'S MAZE.', error);
      loading.textContent = 'NO SE PUDO CARGAR EL JUEGO';
    }
  }

  function resetActors() {
    for (const node of board.nodes) node.eaten = false;
    const startNode = closestNode(board.nodes, 112, 811);
    powerNode = closestNode(board.nodes, 560, 510, new Set([startNode.id]));
    player = makeMover(startNode, 205);
    player.heading = { x: 1, y: 0 };
    startNode.eaten = true;
    eaten = 1;
    fruitAvailable = true;
    frightened = 0;
    remainingTime = config.roundSeconds;
    const used = new Set([startNode.id, powerNode.id]);
    const enemyTargets = [[480, 570], [430, 650], [530, 650], [610, 610]];
    enemies = enemyTargets.map(([x, y], index) => {
      const node = closestNode(board.nodes, x, y, used);
      used.add(node.id);
      return { ...makeMover(node, 112 + index * 5), color: ['#e63232', '#ff78bd', '#43d8e7', '#ff9f35'][index], spawn: node.id };
    });
    updateStatus();
  }

  function makeMover(node, speed) {
    return { node: node.id, target: null, previous: null, x: node.x, y: node.y, speed, heading: { x: 0, y: 0 } };
  }

  function choosePlayerTarget() {
    const node = board.nodes[player.node];
    let best = null;
    let bestScore = -Infinity;
    for (const id of node.neighbours) {
      const candidate = board.nodes[id];
      const dx = candidate.x - node.x;
      const dy = candidate.y - node.y;
      const length = Math.hypot(dx, dy) || 1;
      const score = (dx / length) * desired.x + (dy / length) * desired.y;
      if (score > bestScore) {
        best = id;
        bestScore = score;
      }
    }
    if (bestScore < 0.28) {
      for (const id of node.neighbours) {
        const candidate = board.nodes[id];
        const dx = candidate.x - node.x;
        const dy = candidate.y - node.y;
        const length = Math.hypot(dx, dy) || 1;
        const score = (dx / length) * player.heading.x + (dy / length) * player.heading.y;
        if (score > bestScore) {
          best = id;
          bestScore = score;
        }
      }
    }
    return bestScore >= 0.28 ? best : null;
  }

  function chooseEnemyTarget(enemy) {
    const node = board.nodes[enemy.node];
    const options = node.neighbours.filter((id) => id !== enemy.previous || node.neighbours.length === 1);
    let winner = options[0] ?? enemy.previous;
    let winnerScore = frightened > 0 ? -Infinity : Infinity;
    for (const id of options) {
      const candidate = board.nodes[id];
      const distance = Math.hypot(candidate.x - player.x, candidate.y - player.y);
      const noise = Math.random() * 18;
      const score = frightened > 0 ? distance + noise : distance - noise;
      if ((frightened > 0 && score > winnerScore) || (frightened <= 0 && score < winnerScore)) {
        winner = id;
        winnerScore = score;
      }
    }
    return winner;
  }

  function advanceMover(mover, dt, chooseTarget, onArrive) {
    let distanceLeft = mover.speed * dt;
    while (distanceLeft > 0) {
      if (mover.target == null) mover.target = chooseTarget(mover);
      if (mover.target == null) return;
      const target = board.nodes[mover.target];
      const dx = target.x - mover.x;
      const dy = target.y - mover.y;
      const distance = Math.hypot(dx, dy);
      if (distance > distanceLeft) {
        mover.x += (dx / distance) * distanceLeft;
        mover.y += (dy / distance) * distanceLeft;
        mover.heading = { x: dx / distance, y: dy / distance };
        return;
      }
      mover.x = target.x;
      mover.y = target.y;
      distanceLeft -= distance;
      mover.previous = mover.node;
      mover.node = mover.target;
      mover.target = null;
      onArrive?.(mover);
    }
  }

  function collect() {
    const node = board.nodes[player.node];
    if (!node.eaten) {
      node.eaten = true;
      eaten++;
      updateStatus();
    }
    if (fruitAvailable && node.id === powerNode.id) {
      fruitAvailable = false;
      frightened = config.frightenedSeconds;
    }
    if (eaten >= board.nodes.length) finish('win');
  }

  function checkEnemyHits() {
    for (const enemy of enemies) {
      if (Math.hypot(enemy.x - player.x, enemy.y - player.y) > 27) continue;
      if (frightened > 0) {
        const spawn = board.nodes[enemy.spawn];
        enemy.node = spawn.id;
        enemy.target = null;
        enemy.previous = null;
        enemy.x = spawn.x;
        enemy.y = spawn.y;
      } else {
        finish('lose');
      }
    }
  }

  function tick(now) {
    if (!running || finished) return;
    const dt = Math.max(0, Math.min(0.04, (now - previousTime) / 1000));
    previousTime = now;
    remainingTime = Math.max(0, remainingTime - dt);
    frightened = Math.max(0, frightened - dt);
    advanceMover(player, dt, choosePlayerTarget, collect);
    for (const enemy of enemies) advanceMover(enemy, dt, chooseEnemyTarget);
    checkEnemyHits();
    if (remainingTime <= 0) finish('lose');
    updateStatus();
    draw();
    if (!finished) animationFrame = requestAnimationFrame(tick);
  }

  function draw() {
    if (!board) return;
    ctx.clearRect(0, 0, BOARD_W, BOARD_H);
    ctx.drawImage(board.canvas, 0, 0);
    for (const node of board.nodes) {
      if (node.eaten || (fruitAvailable && node.id === powerNode.id)) continue;
      ctx.fillStyle = '#ffe98c';
      ctx.beginPath();
      ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2);
      ctx.fill();
    }
    if (fruitAvailable) {
      const width = 46;
      const height = width * (jointSprite.height / jointSprite.width);
      ctx.drawImage(jointSprite, powerNode.x - width / 2, powerNode.y - height / 2, width, height);
    }
    drawBob();
    enemies.forEach(drawEnemy);
  }

  function drawBob() {
    const size = 62;
    ctx.save();
    ctx.translate(player.x, player.y);
    const facingLeft = player.heading.x < -0.12;
    if (facingLeft) ctx.scale(-1, 1);
    ctx.drawImage(bobSprite, -size / 2, -size / 2, size, size);
    ctx.restore();
  }

  function drawEnemy(enemy) {
    ctx.save();
    ctx.translate(enemy.x, enemy.y);
    ctx.fillStyle = frightened > 0 ? '#3151d4' : enemy.color;
    ctx.beginPath();
    ctx.arc(0, 0, 18, Math.PI, 0);
    ctx.lineTo(18, 16);
    ctx.lineTo(9, 10);
    ctx.lineTo(0, 16);
    ctx.lineTo(-9, 10);
    ctx.lineTo(-18, 16);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(-6, -3, 5, 0, Math.PI * 2);
    ctx.arc(6, -3, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#171737';
    ctx.beginPath();
    ctx.arc(-5, -2, 2.2, 0, Math.PI * 2);
    ctx.arc(7, -2, 2.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function updateStatus() {
    if (!dotsEl || !board) return;
    dotsEl.textContent = `${eaten}/${board.nodes.length}`;
    timeEl.textContent = String(Math.ceil(remainingTime));
  }

  function finish(result) {
    if (finished) return;
    finished = true;
    running = false;
    cancelAnimationFrame(animationFrame);
    onResult(result);
  }

  function setDirection(x, y) {
    const length = Math.hypot(x, y);
    if (length < 4) return;
    if (Math.abs(x) > Math.abs(y)) desired = { x: Math.sign(x), y: 0 };
    else desired = { x: 0, y: Math.sign(y) };
  }

  function keyDown(event) {
    if (!running || !KEY_DIRECTIONS[event.code]) return;
    event.preventDefault();
    event.stopPropagation();
    const [x, y] = KEY_DIRECTIONS[event.code];
    desired = { x, y };
  }

  function pointerDown(event) {
    pointerStart = { x: event.clientX, y: event.clientY };
    canvas.setPointerCapture?.(event.pointerId);
  }

  function pointerMove(event) {
    if (!pointerStart) return;
    setDirection(event.clientX - pointerStart.x, event.clientY - pointerStart.y);
  }

  function pointerUp(event) {
    if (pointerStart) setDirection(event.clientX - pointerStart.x, event.clientY - pointerStart.y);
    pointerStart = null;
  }

  function pause() {
    running = false;
    cancelAnimationFrame(animationFrame);
  }

  function destroy() {
    pause();
    window.removeEventListener('keydown', keyDown, { capture: true });
    canvas?.removeEventListener('pointerdown', pointerDown);
    canvas?.removeEventListener('pointermove', pointerMove);
    canvas?.removeEventListener('pointerup', pointerUp);
    canvas?.removeEventListener('pointercancel', pointerUp);
    root?.remove();
    root = null;
  }

  return { mount, start, pause, destroy, resize: () => {} };
}
