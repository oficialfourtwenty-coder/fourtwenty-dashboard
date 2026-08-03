import './burelaDelivery.css';

const WORLD = Object.freeze({ width: 2440, height: 1600 });
const ROAD_WIDTH = 116;
const ROAD_X = Object.freeze([100, 470, 840, 1210, 1580, 1950, 2320]);
const ROAD_Y = Object.freeze([100, 450, 800, 1150, 1500]);
const MAP_SCALE = 0.5;

const START = Object.freeze({ x: 1210, y: 445 });
const PAKA_POSITION = Object.freeze({ x: 1160, y: 445 });
const COROLLA_START = Object.freeze({ x: 1210, y: 570, angle: Math.PI });
const NOTA_POSITION = Object.freeze({ x: 2260, y: 150 });
const DELIVERY_POSITION = Object.freeze({ x: 145, y: 1450 });

const OBJECTIVES = Object.freeze({
  pickup: 'RECOGE LA PAKA',
  car: 'SUBITE AL COROLLA',
  findNota: 'BUSCA A LA NOTA',
  transportNota: 'LLEVA A LA NOTA AL PUNTO',
});

const POLICE_SPAWNS = Object.freeze([1, 5, 8, 13, 14, 20, 25, 31]);
const CONTROL_CODES = new Set([
  'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight',
  'KeyW', 'KeyA', 'KeyS', 'KeyD', 'KeyE',
]);

const ROAD_NODES = ROAD_Y.flatMap((y, row) => (
  ROAD_X.map((x, col) => ({ id: row * ROAD_X.length + col, row, col, x, y }))
));

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function distance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function seededRandom(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

function roundedRectPath(ctx, x, y, width, height, radius) {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + width - r, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + r);
  ctx.lineTo(x + width, y + height - r);
  ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
  ctx.lineTo(x + r, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function circleHitsRect(x, y, radius, rect) {
  const nearestX = clamp(x, rect.x, rect.x + rect.w);
  const nearestY = clamp(y, rect.y, rect.y + rect.h);
  return Math.hypot(x - nearestX, y - nearestY) < radius;
}

function angleDelta(from, to) {
  let delta = (to - from + Math.PI) % (Math.PI * 2) - Math.PI;
  if (delta < -Math.PI) delta += Math.PI * 2;
  return delta;
}

function nearestRoadNode(x, y) {
  let winner = ROAD_NODES[0];
  let best = Infinity;
  for (const node of ROAD_NODES) {
    const next = (node.x - x) ** 2 + (node.y - y) ** 2;
    if (next < best) {
      best = next;
      winner = node;
    }
  }
  return winner;
}

function nodeNeighbors(id) {
  const node = ROAD_NODES[id];
  const result = [];
  if (node.col > 0) result.push(id - 1);
  if (node.col < ROAD_X.length - 1) result.push(id + 1);
  if (node.row > 0) result.push(id - ROAD_X.length);
  if (node.row < ROAD_Y.length - 1) result.push(id + ROAD_X.length);
  return result;
}

function shortestRoadPath(fromId, toId) {
  if (fromId === toId) return [fromId];
  const queue = [fromId];
  const previous = new Map([[fromId, null]]);
  for (let cursor = 0; cursor < queue.length; cursor++) {
    const current = queue[cursor];
    for (const next of nodeNeighbors(current)) {
      if (previous.has(next)) continue;
      previous.set(next, current);
      if (next === toId) {
        const path = [toId];
        let step = current;
        while (step !== null) {
          path.push(step);
          step = previous.get(step) ?? null;
        }
        return path.reverse();
      }
      queue.push(next);
    }
  }
  return [fromId];
}

function createCityModel() {
  const random = seededRandom(4201992);
  const blocks = [];
  const buildings = [];
  const trees = [];
  const parkedCars = [];
  const roofColors = ['#a68168', '#668589', '#8f765f', '#a6a39a', '#7b8d78', '#9b6c58'];

  function addBuilding(x, y, w, h, options = {}) {
    buildings.push({
      x, y, w, h,
      color: options.color ?? roofColors[Math.floor(random() * roofColors.length)],
      trim: options.trim ?? (random() > 0.5 ? '#d6c9b2' : '#454f4d'),
      rotation: options.rotation ?? 0,
      tower: Boolean(options.tower),
      industrial: Boolean(options.industrial),
    });
  }

  for (let row = 0; row < ROAD_Y.length - 1; row++) {
    for (let col = 0; col < ROAD_X.length - 1; col++) {
      const left = ROAD_X[col] + ROAD_WIDTH / 2;
      const right = ROAD_X[col + 1] - ROAD_WIDTH / 2;
      const top = ROAD_Y[row] + ROAD_WIDTH / 2;
      const bottom = ROAD_Y[row + 1] - ROAD_WIDTH / 2;
      const block = {
        row,
        col,
        x: left,
        y: top,
        w: right - left,
        h: bottom - top,
        kind: col === 2 && row === 0 ? 'towers' : (col === 3 && row === 0 ? 'industrial' : 'residential'),
      };
      blocks.push(block);

      const pad = 24;
      const x = left + pad;
      const y = top + pad;
      const w = block.w - pad * 2;
      const h = block.h - pad * 2;

      if (block.kind === 'towers') {
        const towerW = 72;
        const towerH = 112;
        const placements = [
          [x + 22, y + 16, -0.14],
          [x + w - towerW - 22, y + 20, 0.16],
          [x + w / 2 - towerW / 2, y + h / 2 - towerH / 2, -0.06],
          [x + 34, y + h - towerH - 12, 0.13],
          [x + w - towerW - 34, y + h - towerH - 15, -0.15],
        ];
        for (const [towerX, towerY, rotation] of placements) {
          addBuilding(towerX, towerY, towerW, towerH, {
            color: '#7f9998',
            trim: '#b85d4b',
            rotation,
            tower: true,
          });
        }
      } else if (block.kind === 'industrial') {
        addBuilding(x + 8, y + 10, w - 16, h - 20, {
          color: '#a4a6a2',
          trim: '#65716f',
          industrial: true,
        });
      } else {
        const gap = 16;
        const pattern = (row * 7 + col) % 3;
        if (pattern === 0) {
          const split = w * (0.47 + random() * 0.08);
          addBuilding(x, y, split - gap / 2, h);
          addBuilding(x + split + gap / 2, y, w - split - gap / 2, h);
        } else if (pattern === 1) {
          const halfW = (w - gap) / 2;
          const halfH = (h - gap) / 2;
          addBuilding(x, y, halfW, halfH);
          addBuilding(x + halfW + gap, y, halfW, halfH);
          addBuilding(x, y + halfH + gap, halfW, halfH);
          addBuilding(x + halfW + gap, y + halfH + gap, halfW, halfH);
        } else {
          const topH = h * 0.58;
          addBuilding(x, y, w, topH - gap / 2);
          addBuilding(x, y + topH + gap / 2, w * 0.58, h - topH - gap / 2);
          addBuilding(x + w * 0.58 + gap, y + topH + gap / 2, w * 0.42 - gap, h - topH - gap / 2);
        }
      }

      for (let index = 0; index < 8; index++) {
        const horizontal = index < 4;
        const treeX = horizontal
          ? left + 20 + random() * (block.w - 40)
          : (index % 2 ? right - 13 : left + 13);
        const treeY = horizontal
          ? (index % 2 ? bottom - 13 : top + 13)
          : top + 20 + random() * (block.h - 40);
        trees.push({ x: treeX, y: treeY, r: 8 + random() * 7, tone: random() });
      }
    }
  }

  for (let index = 0; index < 30; index++) {
    const vertical = random() > 0.52;
    if (vertical) {
      const x = ROAD_X[Math.floor(random() * ROAD_X.length)] + (random() > 0.5 ? -32 : 32);
      parkedCars.push({ x, y: 180 + random() * (WORLD.height - 360), vertical: true, color: roofColors[index % roofColors.length] });
    } else {
      parkedCars.push({
        x: 180 + random() * (WORLD.width - 360),
        y: ROAD_Y[Math.floor(random() * ROAD_Y.length)] + (random() > 0.5 ? -32 : 32),
        vertical: false,
        color: roofColors[index % roofColors.length],
      });
    }
  }

  return { blocks, buildings, trees, parkedCars };
}

function createMapCanvas(city) {
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(WORLD.width * MAP_SCALE);
  canvas.height = Math.round(WORLD.height * MAP_SCALE);
  const ctx = canvas.getContext('2d');
  ctx.scale(MAP_SCALE, MAP_SCALE);

  ctx.fillStyle = '#34473a';
  ctx.fillRect(0, 0, WORLD.width, WORLD.height);

  ctx.fillStyle = '#30363a';
  for (const x of ROAD_X) ctx.fillRect(x - ROAD_WIDTH / 2, 0, ROAD_WIDTH, WORLD.height);
  for (const y of ROAD_Y) ctx.fillRect(0, y - ROAD_WIDTH / 2, WORLD.width, ROAD_WIDTH);

  ctx.strokeStyle = 'rgba(230, 222, 190, 0.18)';
  ctx.lineWidth = 3;
  for (const x of ROAD_X) {
    ctx.beginPath();
    ctx.moveTo(x - ROAD_WIDTH / 2 + 7, 0);
    ctx.lineTo(x - ROAD_WIDTH / 2 + 7, WORLD.height);
    ctx.moveTo(x + ROAD_WIDTH / 2 - 7, 0);
    ctx.lineTo(x + ROAD_WIDTH / 2 - 7, WORLD.height);
    ctx.stroke();
  }
  for (const y of ROAD_Y) {
    ctx.beginPath();
    ctx.moveTo(0, y - ROAD_WIDTH / 2 + 7);
    ctx.lineTo(WORLD.width, y - ROAD_WIDTH / 2 + 7);
    ctx.moveTo(0, y + ROAD_WIDTH / 2 - 7);
    ctx.lineTo(WORLD.width, y + ROAD_WIDTH / 2 - 7);
    ctx.stroke();
  }

  ctx.fillStyle = 'rgba(224, 199, 112, 0.45)';
  for (const x of ROAD_X) {
    for (let y = 0; y < WORLD.height; y += 54) ctx.fillRect(x - 2, y, 4, 25);
  }
  for (const y of ROAD_Y) {
    for (let x = 0; x < WORLD.width; x += 54) ctx.fillRect(x, y - 2, 25, 4);
  }

  for (const block of city.blocks) {
    ctx.fillStyle = block.kind === 'towers' ? '#557454' : '#a4a39a';
    ctx.fillRect(block.x, block.y, block.w, block.h);
    ctx.strokeStyle = 'rgba(31, 36, 34, 0.42)';
    ctx.lineWidth = 4;
    ctx.strokeRect(block.x + 2, block.y + 2, block.w - 4, block.h - 4);
  }

  for (const building of city.buildings) {
    const centerX = building.x + building.w / 2;
    const centerY = building.y + building.h / 2;
    ctx.save();
    ctx.translate(centerX, centerY);
    ctx.rotate(building.rotation);
    ctx.fillStyle = 'rgba(15, 19, 18, 0.36)';
    ctx.fillRect(-building.w / 2 + 10, -building.h / 2 + 12, building.w, building.h);
    ctx.fillStyle = building.color;
    ctx.fillRect(-building.w / 2, -building.h / 2, building.w, building.h);
    ctx.strokeStyle = building.trim;
    ctx.lineWidth = building.tower ? 8 : 5;
    ctx.strokeRect(-building.w / 2 + 4, -building.h / 2 + 4, building.w - 8, building.h - 8);
    ctx.fillStyle = 'rgba(238, 234, 218, 0.19)';
    for (let x = -building.w / 2 + 16; x < building.w / 2 - 8; x += 26) {
      ctx.fillRect(x, -building.h / 2 + 14, 10, building.h - 28);
    }
    if (building.industrial) {
      ctx.strokeStyle = 'rgba(51, 61, 60, 0.42)';
      ctx.lineWidth = 3;
      for (let y = -building.h / 2 + 24; y < building.h / 2 - 10; y += 30) {
        ctx.beginPath();
        ctx.moveTo(-building.w / 2 + 16, y);
        ctx.lineTo(building.w / 2 - 16, y);
        ctx.stroke();
      }
    }
    ctx.restore();
  }

  for (const tree of city.trees) {
    ctx.fillStyle = 'rgba(19, 29, 22, 0.28)';
    ctx.beginPath();
    ctx.arc(tree.x + 4, tree.y + 5, tree.r + 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = tree.tone > 0.5 ? '#42643e' : '#315737';
    ctx.beginPath();
    ctx.arc(tree.x, tree.y, tree.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(144, 174, 91, 0.3)';
    ctx.beginPath();
    ctx.arc(tree.x - tree.r * 0.25, tree.y - tree.r * 0.28, tree.r * 0.52, 0, Math.PI * 2);
    ctx.fill();
  }

  for (const car of city.parkedCars) {
    ctx.save();
    ctx.translate(car.x, car.y);
    if (car.vertical) ctx.rotate(Math.PI / 2);
    ctx.fillStyle = 'rgba(8, 10, 10, 0.35)';
    roundedRectPath(ctx, -13 + 3, -7 + 3, 26, 14, 3);
    ctx.fill();
    ctx.fillStyle = car.color;
    roundedRectPath(ctx, -13, -7, 26, 14, 3);
    ctx.fill();
    ctx.fillStyle = '#263034';
    ctx.fillRect(-5, -6, 10, 12);
    ctx.restore();
  }

  ctx.save();
  ctx.translate(1025, 300);
  ctx.rotate(-0.05);
  ctx.fillStyle = 'rgba(12, 18, 14, 0.72)';
  roundedRectPath(ctx, -126, -21, 252, 42, 4);
  ctx.fill();
  ctx.fillStyle = '#f1ead8';
  ctx.font = '900 22px Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('LAS 5 TORRES · BURELA', 0, 1);
  ctx.restore();

  return canvas;
}

function isBlocked(city, x, y, radius) {
  if (x - radius < 26 || y - radius < 26 || x + radius > WORLD.width - 26 || y + radius > WORLD.height - 26) {
    return true;
  }
  return city.buildings.some((building) => circleHitsRect(x, y, radius, building));
}

function moveCircle(city, actor, dx, dy, radius) {
  let blockedX = false;
  let blockedY = false;
  const nextX = actor.x + dx;
  if (!isBlocked(city, nextX, actor.y, radius)) actor.x = nextX;
  else blockedX = true;

  const nextY = actor.y + dy;
  if (!isBlocked(city, actor.x, nextY, radius)) actor.y = nextY;
  else blockedY = true;

  return { blockedX, blockedY };
}

function drawBob(ctx, bob, time, invulnerable) {
  if (invulnerable && Math.floor(time * 12) % 2 === 0) return;
  ctx.save();
  ctx.translate(bob.x, bob.y);
  ctx.rotate(bob.angle);
  ctx.fillStyle = 'rgba(0, 0, 0, 0.32)';
  ctx.beginPath();
  ctx.ellipse(3, 7, 18, 12, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#6f3d25';
  ctx.beginPath();
  ctx.ellipse(0, 5, 12, 16, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(0, -10, 15, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#c47a3b';
  for (const x of [-14, 14]) {
    ctx.beginPath();
    ctx.arc(x, -10, 6, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.beginPath();
  ctx.ellipse(0, -8, 9, 7, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#111514';
  ctx.beginPath();
  ctx.arc(-4, -13, 1.8, 0, Math.PI * 2);
  ctx.arc(4, -13, 1.8, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#e28742';
  ctx.fillRect(-11, 18, 8, 5);
  ctx.fillRect(3, 18, 8, 5);
  ctx.restore();
}

function drawCorolla(ctx, car, { passenger = false, invulnerable = false, time = 0 } = {}) {
  if (invulnerable && Math.floor(time * 12) % 2 === 0) return;
  ctx.save();
  ctx.translate(car.x, car.y);
  ctx.rotate(car.angle + Math.PI / 2);
  ctx.fillStyle = 'rgba(0, 0, 0, 0.34)';
  roundedRectPath(ctx, -31 + 4, -17 + 5, 62, 34, 8);
  ctx.fill();
  ctx.fillStyle = '#f0f0ea';
  roundedRectPath(ctx, -31, -17, 62, 34, 8);
  ctx.fill();
  ctx.strokeStyle = '#1a1c1d';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = '#23282b';
  roundedRectPath(ctx, -14, -14, 29, 28, 5);
  ctx.fill();
  ctx.fillStyle = '#53646a';
  ctx.fillRect(-10, -12, 8, 24);
  ctx.fillRect(3, -12, 8, 24);
  ctx.fillStyle = '#17181a';
  for (const x of [-22, 20]) {
    ctx.fillRect(x, -20, 12, 5);
    ctx.fillRect(x, 15, 12, 5);
  }
  ctx.fillStyle = '#f5e49a';
  ctx.fillRect(-28, -13, 4, 8);
  ctx.fillRect(-28, 5, 4, 8);
  ctx.fillStyle = '#bf252a';
  ctx.fillRect(25, -13, 4, 8);
  ctx.fillRect(25, 5, 4, 8);
  if (passenger) {
    ctx.fillStyle = '#d39362';
    ctx.beginPath();
    ctx.arc(3, 7, 4, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawPoliceCar(ctx, police, time) {
  ctx.save();
  ctx.translate(police.x, police.y);
  ctx.rotate(police.angle + Math.PI / 2);
  ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
  roundedRectPath(ctx, -29 + 4, -16 + 5, 58, 32, 7);
  ctx.fill();
  ctx.fillStyle = police.alert ? '#e8e8e4' : '#cfd2d1';
  roundedRectPath(ctx, -29, -16, 58, 32, 7);
  ctx.fill();
  ctx.strokeStyle = '#11191f';
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.fillStyle = '#14283d';
  ctx.fillRect(-11, -15, 25, 30);
  ctx.fillStyle = '#11181d';
  ctx.fillRect(-25, -16, 13, 32);
  ctx.fillStyle = Math.floor(time * 10) % 2 ? '#f23838' : '#3b78ff';
  ctx.fillRect(-2, -18, 8, 5);
  ctx.fillStyle = Math.floor(time * 10) % 2 ? '#3b78ff' : '#f23838';
  ctx.fillRect(6, -18, 8, 5);
  ctx.fillStyle = '#11181d';
  ctx.font = '900 7px Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('POLICIA', 0, 1);
  ctx.restore();
}

function drawPaka(ctx, position, time) {
  const pulse = 1 + Math.sin(time * 5) * 0.08;
  ctx.save();
  ctx.translate(position.x, position.y);
  ctx.scale(pulse, pulse);
  ctx.shadowColor = '#39ff6a';
  ctx.shadowBlur = 24;
  ctx.fillStyle = 'rgba(57, 255, 106, 0.24)';
  ctx.beginPath();
  ctx.arc(0, 0, 31, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;
  for (let index = 0; index < 4; index++) {
    ctx.fillStyle = index % 2 ? '#78c870' : '#9bdd83';
    roundedRectPath(ctx, -17 + index * 4, -10 - index * 3, 28, 14, 2);
    ctx.fill();
    ctx.fillStyle = '#e2d79a';
    ctx.fillRect(-5 + index * 4, -10 - index * 3, 5, 14);
  }
  ctx.fillStyle = '#d7ffe0';
  ctx.font = '900 11px "Courier New", monospace';
  ctx.textAlign = 'center';
  ctx.fillText('LA PAKA', 0, -31);
  ctx.restore();
}

function drawNota(ctx, nota, time) {
  const pulse = 1 + Math.sin(time * 4) * 0.04;
  ctx.save();
  ctx.translate(nota.x, nota.y);
  ctx.scale(pulse, pulse);
  ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
  ctx.beginPath();
  ctx.ellipse(3, 10, 14, 9, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#1c2938';
  ctx.beginPath();
  ctx.ellipse(0, 4, 11, 15, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#b8794b';
  ctx.beginPath();
  ctx.arc(0, -11, 9, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#f0c851';
  ctx.fillRect(-12, 1, 24, 4);
  ctx.fillStyle = '#ffffff';
  ctx.font = '900 11px "Courier New", monospace';
  ctx.textAlign = 'center';
  ctx.fillText('LA NOTA', 0, -28);
  ctx.restore();
}

function drawDeliveryZone(ctx, position, time) {
  const pulse = 42 + Math.sin(time * 4) * 7;
  ctx.save();
  ctx.translate(position.x, position.y);
  ctx.strokeStyle = '#f3cf4f';
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.arc(0, 0, pulse, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(243, 207, 79, 0.3)';
  ctx.lineWidth = 12;
  ctx.beginPath();
  ctx.arc(0, 0, pulse + 9, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = '#fff1b5';
  ctx.font = '900 11px "Courier New", monospace';
  ctx.textAlign = 'center';
  ctx.fillText('ENTREGA', 0, -57);
  ctx.restore();
}

export function createBurelaDeliveryGame() {
  let root = null;
  let canvas = null;
  let ctx = null;
  let objectiveEl = null;
  let damageEl = null;
  let locationEl = null;
  let promptEl = null;
  let toastEl = null;
  let stickEl = null;
  let stickKnobEl = null;
  let actionEl = null;
  let resizeObserver = null;
  let city = null;
  let mapCanvas = null;
  let reportResult = () => {};
  let state = null;
  let animationFrame = 0;
  let previousTime = 0;
  let running = false;
  let resultTimer = 0;
  let toastTimer = 0;
  let lastPrompt = '';
  let viewWidth = 960;
  let viewHeight = 640;
  let pixelRatio = 1;
  let touchPointerId = null;
  const touchInput = { x: 0, y: 0 };
  const keys = { up: false, down: false, left: false, right: false };
  const random = seededRandom(8420);

  function createPolice(nodeId, index) {
    const node = ROAD_NODES[nodeId];
    const neighbors = nodeNeighbors(nodeId);
    return {
      id: index,
      x: node.x,
      y: node.y,
      angle: index % 2 ? Math.PI / 2 : 0,
      alert: false,
      detection: 205 + (index % 3) * 18,
      currentNode: nodeId,
      previousNode: null,
      targetNode: neighbors[index % neighbors.length],
      path: [],
      reroute: 0,
      speed: 76 + (index % 2) * 8,
    };
  }

  function resetState() {
    state = {
      phase: 'pickup',
      hits: 0,
      hitCooldown: 0,
      policeGrace: 0,
      ended: false,
      inCar: false,
      hasPaka: false,
      notaOnboard: false,
      elapsed: 0,
      lastAlertToast: -10,
      bob: { x: START.x, y: START.y, angle: -Math.PI / 2 },
      car: {
        x: COROLLA_START.x,
        y: COROLLA_START.y,
        angle: COROLLA_START.angle,
        speed: 0,
        vx: 0,
        vy: 0,
      },
      police: POLICE_SPAWNS.map(createPolice),
      particles: [],
      camera: { x: START.x, y: START.y, zoom: 1.18, shake: 0 },
    };
    updateHud();
    setPrompt('');
    announce('ENCONTRA LA PAKA CERCA DE LAS 5 TORRES');
  }

  function updateHud() {
    if (!state) return;
    if (objectiveEl) objectiveEl.textContent = OBJECTIVES[state.phase] ?? 'MISION COMPLETADA';
    if (damageEl) damageEl.textContent = `IMPACTOS ${state.hits} / 2`;
  }

  function announce(text, alert = false) {
    if (!toastEl) return;
    clearTimeout(toastTimer);
    toastEl.textContent = text;
    toastEl.classList.toggle('alert', alert);
    toastEl.classList.add('show');
    toastTimer = window.setTimeout(() => toastEl?.classList.remove('show'), 2200);
  }

  function setPrompt(text) {
    if (!promptEl || text === lastPrompt) return;
    lastPrompt = text;
    promptEl.hidden = !text;
    promptEl.textContent = text;
  }

  function setPhase(phase, message) {
    state.phase = phase;
    updateHud();
    if (message) announce(message);
  }

  function spawnBurst(x, y, color, count = 16) {
    for (let index = 0; index < count; index++) {
      const angle = random() * Math.PI * 2;
      const speed = 45 + random() * 120;
      state.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0.45 + random() * 0.45,
        maxLife: 0.9,
        size: 2 + random() * 4,
        color,
      });
    }
  }

  function activeActor() {
    return state.inCar ? state.car : state.bob;
  }

  function objectiveTarget() {
    if (state.phase === 'pickup') return PAKA_POSITION;
    if (state.phase === 'car') return state.car;
    if (state.phase === 'findNota') return NOTA_POSITION;
    return DELIVERY_POSITION;
  }

  function enterCar() {
    state.inCar = true;
    state.policeGrace = Math.max(state.policeGrace, 5.5);
    state.bob.x = state.car.x;
    state.bob.y = state.car.y;
    if (state.phase === 'car') setPhase('findNota', 'BUSCA A LA NOTA EN LA ESQUINA DEL MAPA');
    else announce('VOLVISTE AL COROLLA');
  }

  function exitCar() {
    const offsets = [
      [Math.cos(state.car.angle) * 42, Math.sin(state.car.angle) * 42],
      [-Math.cos(state.car.angle) * 42, -Math.sin(state.car.angle) * 42],
      [Math.sin(state.car.angle) * 42, -Math.cos(state.car.angle) * 42],
    ];
    for (const [dx, dy] of offsets) {
      const x = state.car.x + dx;
      const y = state.car.y + dy;
      if (isBlocked(city, x, y, 15)) continue;
      state.bob.x = x;
      state.bob.y = y;
      state.bob.angle = state.car.angle;
      state.inCar = false;
      state.car.speed = 0;
      state.car.vx = 0;
      state.car.vy = 0;
      announce('BAJASTE DEL COROLLA');
      return;
    }
  }

  function interact() {
    if (!state || state.ended) return;
    const actor = activeActor();

    if (state.phase === 'findNota' && distance(actor, NOTA_POSITION) < 88) {
      if (!state.inCar) {
        announce('VOLVE CON EL COROLLA PARA LLEVAR A LA NOTA', true);
        return;
      }
      state.notaOnboard = true;
      state.hasPaka = false;
      setPhase('transportNota', 'LA NOTA SUBIO. LLEVALA A LA OTRA ESQUINA');
      spawnBurst(NOTA_POSITION.x, NOTA_POSITION.y, '#f0c851', 20);
      return;
    }

    if (state.phase === 'transportNota' && distance(actor, DELIVERY_POSITION) < 94) {
      if (!state.inCar) {
        announce('LA NOTA TIENE QUE LLEGAR EN EL COROLLA', true);
        return;
      }
      spawnBurst(DELIVERY_POSITION.x, DELIVERY_POSITION.y, '#f3cf4f', 34);
      finish('win', 'ENTREGA COMPLETADA');
      return;
    }

    if (!state.inCar && state.phase !== 'pickup' && distance(state.bob, state.car) < 76) {
      enterCar();
      return;
    }

    if (state.inCar) exitCar();
  }

  function updateOnFoot(dt, horizontal, vertical) {
    const length = Math.hypot(horizontal, vertical);
    if (length < 0.05) return;
    const x = horizontal / Math.max(1, length);
    const y = vertical / Math.max(1, length);
    state.bob.angle = Math.atan2(x, -y);
    moveCircle(city, state.bob, x * 170 * dt, y * 170 * dt, 15);
  }

  function updateCar(dt, horizontal, vertical) {
    const car = state.car;
    const forward = vertical < -0.05;
    const reverse = vertical > 0.05;

    if (forward) car.speed += (car.speed < -8 ? 470 : 325) * dt;
    else if (reverse) car.speed -= (car.speed > 8 ? 470 : 215) * dt;
    else car.speed *= Math.exp(-2.3 * dt);

    car.speed = clamp(car.speed, -105, 285);
    if (Math.abs(car.speed) < 1.2 && !forward && !reverse) car.speed = 0;

    if (Math.abs(horizontal) > 0.04) {
      const speedRatio = clamp(Math.abs(car.speed) / 285, 0, 1);
      const movingFactor = clamp(Math.abs(car.speed) / 34, 0, 1);
      const steeringRate = (2.05 - speedRatio * 0.5) * movingFactor;
      const direction = car.speed < -1 ? -1 : 1;
      car.angle += horizontal * direction * steeringRate * dt;
    }

    const desiredVx = Math.sin(car.angle) * car.speed;
    const desiredVy = -Math.cos(car.angle) * car.speed;
    const speedRatio = clamp(Math.abs(car.speed) / 285, 0, 1);
    const grip = Math.max(4.2, 8.2 - speedRatio * 2.3 - Math.abs(horizontal) * 1.5);
    const gripBlend = 1 - Math.exp(-grip * dt);
    car.vx += (desiredVx - car.vx) * gripBlend;
    car.vy += (desiredVy - car.vy) * gripBlend;

    const movement = moveCircle(city, car, car.vx * dt, car.vy * dt, 25);
    if (movement.blockedX) car.vx *= -0.14;
    if (movement.blockedY) car.vy *= -0.14;
    if (movement.blockedX || movement.blockedY) {
      car.speed *= -0.18;
      state.camera.shake = Math.max(state.camera.shake, 4);
    }
  }

  function choosePatrolTarget(police) {
    const neighbors = nodeNeighbors(police.currentNode);
    const choices = neighbors.filter((id) => id !== police.previousNode);
    const pool = choices.length ? choices : neighbors;
    police.targetNode = pool[Math.floor(random() * pool.length)];
  }

  function movePoliceToward(police, target, speed, dt) {
    const dx = target.x - police.x;
    const dy = target.y - police.y;
    const length = Math.hypot(dx, dy);
    if (length < 0.01) return length;
    const desiredAngle = Math.atan2(dx, -dy);
    police.angle += angleDelta(police.angle, desiredAngle) * Math.min(1, dt * 7);
    const step = Math.min(length, speed * dt);
    police.x += (dx / length) * step;
    police.y += (dy / length) * step;
    return length;
  }

  function updatePolice(police, dt, target, canDetect) {
    if (canDetect && !police.alert && distance(police, target) < police.detection) {
      police.alert = true;
      police.path = [];
      police.reroute = 0;
      if (state.elapsed - state.lastAlertToast > 1.4) {
        state.lastAlertToast = state.elapsed;
        announce('UNA PATRULLA TE VIO', true);
      }
    }

    if (!police.alert) {
      const waypoint = ROAD_NODES[police.targetNode];
      if (movePoliceToward(police, waypoint, police.speed, dt) < 12) {
        police.previousNode = police.currentNode;
        police.currentNode = police.targetNode;
        choosePatrolTarget(police);
      }
      return;
    }

    police.reroute -= dt;
    if (police.reroute <= 0 || !police.path.length) {
      const start = nearestRoadNode(police.x, police.y);
      const end = nearestRoadNode(target.x, target.y);
      police.path = shortestRoadPath(start.id, end.id).slice(1);
      police.reroute = 0.58 + police.id * 0.018;
    }

    let waypoint = police.path.length ? ROAD_NODES[police.path[0]] : target;
    if (movePoliceToward(police, waypoint, 205 + (police.id % 3) * 8, dt) < 18 && police.path.length) {
      police.path.shift();
      waypoint = police.path.length ? ROAD_NODES[police.path[0]] : target;
    }
  }

  function registerHit(police = null) {
    if (state.hitCooldown > 0 || state.ended) return;
    state.hits += 1;
    state.hitCooldown = 1.45;
    state.policeGrace = 2.8;
    state.camera.shake = 18;
    if (state.inCar) {
      state.car.speed *= -0.36;
      state.car.vx *= -0.28;
      state.car.vy *= -0.28;
    }
    if (police) {
      const target = activeActor();
      const dx = police.x - target.x;
      const dy = police.y - target.y;
      const length = Math.max(1, Math.hypot(dx, dy));
      police.x += (dx / length) * 128;
      police.y += (dy / length) * 128;
      police.alert = false;
      police.currentNode = nearestRoadNode(police.x, police.y).id;
      police.previousNode = null;
      police.path = [];
      choosePatrolTarget(police);
    }
    updateHud();
    spawnBurst(activeActor().x, activeActor().y, '#ff5148', 24);
    if (state.hits >= 2) finish('lose', 'TE ATRAPARON');
    else announce('PRIMER CHOQUE. UNO MAS Y PERDES', true);
  }

  function updateMission() {
    if (state.phase === 'pickup' && distance(state.bob, PAKA_POSITION) < 34) {
      state.hasPaka = true;
      spawnBurst(PAKA_POSITION.x, PAKA_POSITION.y, '#39ff6a', 28);
      setPhase('car', 'AGARRASTE LA PAKA. SUBITE AL COROLLA');
    }

    const actor = activeActor();
    let prompt = '';
    if (!state.inCar && state.phase !== 'pickup' && distance(state.bob, state.car) < 76) {
      prompt = '[E] SUBIR AL COROLLA';
    } else if (state.phase === 'findNota' && distance(actor, NOTA_POSITION) < 88) {
      prompt = state.inCar ? '[E] CAMBIAR LA PAKA CON LA NOTA' : 'VOLVE AL COROLLA';
    } else if (state.phase === 'transportNota' && distance(actor, DELIVERY_POSITION) < 94) {
      prompt = state.inCar ? '[E] COMPLETAR ENTREGA' : 'VOLVE AL COROLLA';
    } else if (state.inCar) {
      prompt = '[E] BAJAR DEL COROLLA';
    }
    setPrompt(prompt);
  }

  function updateParticles(dt) {
    for (let index = state.particles.length - 1; index >= 0; index--) {
      const particle = state.particles[index];
      particle.x += particle.vx * dt;
      particle.y += particle.vy * dt;
      particle.vx *= Math.exp(-2.8 * dt);
      particle.vy *= Math.exp(-2.8 * dt);
      particle.life -= dt;
      if (particle.life <= 0) state.particles.splice(index, 1);
    }
  }

  function updateCamera(dt) {
    const target = activeActor();
    const camera = state.camera;
    const targetZoom = state.inCar ? 0.95 : 1.18;
    camera.zoom += (targetZoom - camera.zoom) * Math.min(1, dt * 3.2);
    const halfW = viewWidth / (2 * camera.zoom);
    const halfH = viewHeight / (2 * camera.zoom);
    const targetX = clamp(target.x, halfW, WORLD.width - halfW);
    const targetY = clamp(target.y, halfH, WORLD.height - halfH);
    camera.x += (targetX - camera.x) * Math.min(1, dt * 6.5);
    camera.y += (targetY - camera.y) * Math.min(1, dt * 6.5);
    camera.shake *= Math.exp(-8 * dt);
  }

  function update(dt) {
    if (!state || state.ended) return;
    state.elapsed += dt;
    state.hitCooldown = Math.max(0, state.hitCooldown - dt);
    state.policeGrace = Math.max(0, state.policeGrace - dt);

    const horizontal = clamp(
      (keys.right ? 1 : 0) - (keys.left ? 1 : 0) + touchInput.x,
      -1,
      1,
    );
    const vertical = clamp(
      (keys.down ? 1 : 0) - (keys.up ? 1 : 0) + touchInput.y,
      -1,
      1,
    );
    if (state.inCar) updateCar(dt, horizontal, vertical);
    else updateOnFoot(dt, horizontal, vertical);

    updateMission();
    const target = activeActor();
    const policeEnabled = state.phase === 'findNota' || state.phase === 'transportNota';
    const policeCanEngage = policeEnabled && state.policeGrace <= 0;
    for (const police of state.police) updatePolice(police, dt, target, policeCanEngage);

    if (policeCanEngage && state.hitCooldown <= 0) {
      const hitRadius = state.inCar ? 48 : 39;
      for (const police of state.police) {
        if (distance(police, target) >= hitRadius) continue;
        registerHit(police);
        break;
      }
    }
    updateParticles(dt);
    updateCamera(dt);
    if (locationEl) {
      locationEl.textContent = state.inCar
        ? `COROLLA · ${Math.round(Math.abs(state.car.speed) * 0.42)} KM/H`
        : 'BOB · A PIE';
    }
  }

  function drawPoliceDetection(ctx2d, police, time) {
    ctx2d.save();
    ctx2d.strokeStyle = police.alert ? 'rgba(255, 67, 58, 0.34)' : 'rgba(91, 157, 219, 0.18)';
    ctx2d.lineWidth = police.alert ? 4 : 2;
    ctx2d.setLineDash(police.alert ? [16, 10] : [9, 14]);
    ctx2d.lineDashOffset = -time * (police.alert ? 32 : 12);
    ctx2d.beginPath();
    ctx2d.arc(police.x, police.y, police.detection, 0, Math.PI * 2);
    ctx2d.stroke();
    ctx2d.restore();
  }

  function drawParticles(ctx2d) {
    for (const particle of state.particles) {
      ctx2d.globalAlpha = clamp(particle.life / particle.maxLife, 0, 1);
      ctx2d.fillStyle = particle.color;
      ctx2d.beginPath();
      ctx2d.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
      ctx2d.fill();
    }
    ctx2d.globalAlpha = 1;
  }

  function drawObjectivePointer(ctx2d, target) {
    const camera = state.camera;
    const screenX = (target.x - camera.x) * camera.zoom + viewWidth / 2;
    const screenY = (target.y - camera.y) * camera.zoom + viewHeight / 2;
    const topMargin = 112;
    const sideMargin = 42;
    const bottomMargin = 58;
    const visible = screenX > sideMargin
      && screenX < viewWidth - sideMargin
      && screenY > topMargin
      && screenY < viewHeight - bottomMargin;
    if (visible) return;

    const dx = screenX - viewWidth / 2;
    const dy = screenY - viewHeight / 2;
    const horizontalScale = (viewWidth / 2 - sideMargin) / Math.max(1, Math.abs(dx));
    const verticalLimit = dy < 0 ? viewHeight / 2 - topMargin : viewHeight / 2 - bottomMargin;
    const verticalScale = verticalLimit / Math.max(1, Math.abs(dy));
    const scale = Math.min(horizontalScale, verticalScale);
    const x = viewWidth / 2 + dx * scale;
    const y = viewHeight / 2 + dy * scale;
    const angle = Math.atan2(dy, dx);
    const meters = Math.max(1, Math.round(distance(activeActor(), target) / 5.2));

    ctx2d.save();
    ctx2d.translate(x, y);
    ctx2d.rotate(angle);
    ctx2d.fillStyle = 'rgba(9, 13, 11, 0.88)';
    ctx2d.beginPath();
    ctx2d.arc(0, 0, 22, 0, Math.PI * 2);
    ctx2d.fill();
    ctx2d.fillStyle = '#f3cf4f';
    ctx2d.beginPath();
    ctx2d.moveTo(15, 0);
    ctx2d.lineTo(-7, -9);
    ctx2d.lineTo(-7, 9);
    ctx2d.closePath();
    ctx2d.fill();
    ctx2d.rotate(-angle);
    ctx2d.fillStyle = '#ffffff';
    ctx2d.font = '900 9px "Courier New", monospace';
    ctx2d.textAlign = 'center';
    ctx2d.fillText(`${meters}M`, 0, 36);
    ctx2d.restore();
  }

  function render(time = 0) {
    if (!ctx || !state || !mapCanvas) return;
    ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    ctx.clearRect(0, 0, viewWidth, viewHeight);
    const shakeX = state.camera.shake ? (random() - 0.5) * state.camera.shake : 0;
    const shakeY = state.camera.shake ? (random() - 0.5) * state.camera.shake : 0;

    ctx.save();
    ctx.translate(viewWidth / 2 + shakeX, viewHeight / 2 + shakeY);
    ctx.scale(state.camera.zoom, state.camera.zoom);
    ctx.translate(-state.camera.x, -state.camera.y);
    ctx.drawImage(mapCanvas, 0, 0, WORLD.width, WORLD.height);

    if (state.phase === 'pickup') drawPaka(ctx, PAKA_POSITION, time);
    if (state.phase === 'findNota') drawNota(ctx, NOTA_POSITION, time);
    if (state.phase === 'transportNota') drawDeliveryZone(ctx, DELIVERY_POSITION, time);

    for (const police of state.police) drawPoliceDetection(ctx, police, time);
    drawCorolla(ctx, state.car, {
      passenger: state.notaOnboard,
      invulnerable: state.inCar && state.hitCooldown > 0,
      time,
    });
    for (const police of state.police) drawPoliceCar(ctx, police, time);
    if (!state.inCar) drawBob(ctx, state.bob, time, state.hitCooldown > 0);
    drawParticles(ctx);
    ctx.restore();

    drawObjectivePointer(ctx, objectiveTarget());
    if (state.hitCooldown > 0) {
      ctx.fillStyle = `rgba(218, 28, 24, ${Math.min(0.2, state.hitCooldown * 0.13)})`;
      ctx.fillRect(0, 0, viewWidth, viewHeight);
    }
  }

  function tick(now) {
    if (!running) return;
    if (!previousTime) previousTime = now;
    const dt = Math.min(0.034, Math.max(0, (now - previousTime) / 1000));
    previousTime = now;
    update(dt);
    render(now / 1000);
    animationFrame = requestAnimationFrame(tick);
  }

  function finish(result, message) {
    if (state.ended) return;
    state.ended = true;
    setPrompt('');
    announce(message, result === 'lose');
    clearTimeout(resultTimer);
    resultTimer = window.setTimeout(() => reportResult(result), result === 'win' ? 850 : 600);
  }

  function resize() {
    if (!root || !canvas) return;
    const rect = root.getBoundingClientRect();
    viewWidth = Math.max(320, Math.round(rect.width || 960));
    viewHeight = Math.max(320, Math.round(rect.height || 640));
    pixelRatio = Math.min(window.devicePixelRatio || 1, 1.5);
    canvas.width = Math.round(viewWidth * pixelRatio);
    canvas.height = Math.round(viewHeight * pixelRatio);
    render(state?.elapsed ?? 0);
  }

  function setKey(code, pressed) {
    if (code === 'ArrowUp' || code === 'KeyW') keys.up = pressed;
    if (code === 'ArrowDown' || code === 'KeyS') keys.down = pressed;
    if (code === 'ArrowLeft' || code === 'KeyA') keys.left = pressed;
    if (code === 'ArrowRight' || code === 'KeyD') keys.right = pressed;
  }

  function onKeyDown(event) {
    if (!CONTROL_CODES.has(event.code)) return;
    event.preventDefault();
    event.stopPropagation();
    if (event.code === 'KeyE' && !event.repeat) interact();
    else setKey(event.code, true);
  }

  function onKeyUp(event) {
    if (!CONTROL_CODES.has(event.code)) return;
    event.preventDefault();
    event.stopPropagation();
    setKey(event.code, false);
  }

  function clearInputs() {
    keys.up = false;
    keys.down = false;
    keys.left = false;
    keys.right = false;
    touchInput.x = 0;
    touchInput.y = 0;
    if (stickKnobEl) stickKnobEl.style.transform = 'translate(-50%, -50%)';
  }

  function updateTouchStick(event) {
    const rect = stickEl.getBoundingClientRect();
    const x = event.clientX - (rect.left + rect.width / 2);
    const y = event.clientY - (rect.top + rect.height / 2);
    const max = rect.width * 0.34;
    const length = Math.max(1, Math.hypot(x, y));
    const scale = Math.min(1, max / length);
    const knobX = x * scale;
    const knobY = y * scale;
    touchInput.x = clamp(x / max, -1, 1);
    touchInput.y = clamp(y / max, -1, 1);
    stickKnobEl.style.transform = `translate(calc(-50% + ${knobX}px), calc(-50% + ${knobY}px))`;
  }

  function onStickDown(event) {
    touchPointerId = event.pointerId;
    stickEl.setPointerCapture?.(event.pointerId);
    updateTouchStick(event);
  }

  function onStickMove(event) {
    if (event.pointerId !== touchPointerId) return;
    updateTouchStick(event);
  }

  function onStickUp(event) {
    if (event.pointerId !== touchPointerId) return;
    touchPointerId = null;
    touchInput.x = 0;
    touchInput.y = 0;
    stickKnobEl.style.transform = 'translate(-50%, -50%)';
  }

  function mount({ container, onResult }) {
    if (!container) throw new Error('Burela Delivery: falta el container.');
    reportResult = typeof onResult === 'function' ? onResult : () => {};
    root = document.createElement('div');
    root.className = 'burela-delivery';
    root.innerHTML = `
      <canvas aria-label="Mapa cenital de Burela"></canvas>
      <div class="burela-delivery__hud">
        <div class="burela-delivery__panel">
          <div class="burela-delivery__brand">BURELA DELIVERY</div>
          <div class="burela-delivery__location" data-location>BOB · A PIE</div>
        </div>
        <div class="burela-delivery__panel burela-delivery__mission">
          <span class="burela-delivery__kicker">MISION ACTUAL</span>
          <strong class="burela-delivery__objective" data-objective>RECOGE LA PAKA</strong>
        </div>
        <div class="burela-delivery__panel burela-delivery__damage" data-damage>IMPACTOS 0 / 2</div>
      </div>
      <div class="burela-delivery__toast" role="status"></div>
      <div class="burela-delivery__prompt" data-prompt hidden></div>
      <div class="burela-delivery__touch">
        <div class="burela-delivery__stick" aria-label="Control de movimiento">
          <div class="burela-delivery__stick-knob"></div>
        </div>
        <button class="burela-delivery__action" type="button" aria-label="Interactuar">E</button>
      </div>
    `;
    container.append(root);
    canvas = root.querySelector('canvas');
    ctx = canvas.getContext('2d', { alpha: false });
    objectiveEl = root.querySelector('[data-objective]');
    damageEl = root.querySelector('[data-damage]');
    locationEl = root.querySelector('[data-location]');
    promptEl = root.querySelector('[data-prompt]');
    toastEl = root.querySelector('.burela-delivery__toast');
    stickEl = root.querySelector('.burela-delivery__stick');
    stickKnobEl = root.querySelector('.burela-delivery__stick-knob');
    actionEl = root.querySelector('.burela-delivery__action');
    city = createCityModel();
    mapCanvas = createMapCanvas(city);

    window.addEventListener('keydown', onKeyDown, { capture: true });
    window.addEventListener('keyup', onKeyUp, { capture: true });
    window.addEventListener('blur', clearInputs);
    stickEl.addEventListener('pointerdown', onStickDown);
    stickEl.addEventListener('pointermove', onStickMove);
    stickEl.addEventListener('pointerup', onStickUp);
    stickEl.addEventListener('pointercancel', onStickUp);
    actionEl.addEventListener('click', interact);
    resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(root);
  }

  function start() {
    if (!root) throw new Error('Burela Delivery: mount() debe ejecutarse antes de start().');
    clearTimeout(resultTimer);
    clearTimeout(toastTimer);
    resetState();
    resize();
    running = true;
    previousTime = performance.now();
    cancelAnimationFrame(animationFrame);
    animationFrame = requestAnimationFrame(tick);
  }

  function pause() {
    running = false;
    cancelAnimationFrame(animationFrame);
    clearInputs();
  }

  function destroy() {
    pause();
    clearTimeout(resultTimer);
    clearTimeout(toastTimer);
    window.removeEventListener('keydown', onKeyDown, { capture: true });
    window.removeEventListener('keyup', onKeyUp, { capture: true });
    window.removeEventListener('blur', clearInputs);
    stickEl?.removeEventListener('pointerdown', onStickDown);
    stickEl?.removeEventListener('pointermove', onStickMove);
    stickEl?.removeEventListener('pointerup', onStickUp);
    stickEl?.removeEventListener('pointercancel', onStickUp);
    actionEl?.removeEventListener('click', interact);
    resizeObserver?.disconnect();
    if (mapCanvas) {
      mapCanvas.width = 1;
      mapCanvas.height = 1;
    }
    root?.remove();
    root = null;
    canvas = null;
    ctx = null;
    mapCanvas = null;
    city = null;
    state = null;
  }

  function getState() {
    if (!state) return { mounted: Boolean(root), running: false };
    return {
      mounted: Boolean(root),
      running,
      phase: state.phase,
      hits: state.hits,
      inCar: state.inCar,
      hasPaka: state.hasPaka,
      notaOnboard: state.notaOnboard,
      alertedPolice: state.police.filter((police) => police.alert).length,
      bob: { x: Math.round(state.bob.x), y: Math.round(state.bob.y) },
      car: { x: Math.round(state.car.x), y: Math.round(state.car.y), speed: Math.round(state.car.speed) },
    };
  }

  function debugTeleportToObjective() {
    if (!state || state.ended) return;
    const target = objectiveTarget();
    const actor = activeActor();
    actor.x = target.x - 18;
    actor.y = target.y;
    state.policeGrace = 2.5;
    if (state.phase === 'pickup') updateMission();
    state.camera.x = actor.x;
    state.camera.y = actor.y;
    render(state.elapsed);
  }

  const api = { mount, start, pause, destroy, resize, getState };
  if (import.meta.env.DEV) {
    api.debug = {
      teleportToObjective: debugTeleportToObjective,
      interact,
      takeHit: () => registerHit(),
    };
  }
  return api;
}
