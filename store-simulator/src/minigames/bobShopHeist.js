import * as THREE from 'three';

const GOAL = 1000000;
const PLAYER_RADIUS = 0.34;
const WALK_SPEED = 3.15;
const CROUCH_SPEED = 1.85;
const STEAL_SECONDS = 0.82;
const STORE_W = 15.5;
const STORE_D = 22;
const UPPER_Y = 3.15;

const INPUT = {
  KeyW: [0, -1], ArrowUp: [0, -1],
  KeyS: [0, 1], ArrowDown: [0, 1],
  KeyA: [-1, 0], ArrowLeft: [-1, 0],
  KeyD: [1, 0], ArrowRight: [1, 0],
};

const WALLS = Object.freeze([
  { x: -STORE_W / 2, z: 0, w: 0.35, d: STORE_D },
  { x: STORE_W / 2, z: 0, w: 0.35, d: STORE_D },
  { x: 0, z: -STORE_D / 2, w: STORE_W, d: 0.35 },
  { x: 0, z: STORE_D / 2, w: STORE_W, d: 0.35 },
  { x: -4.5, z: -4.8, w: 0.35, d: 4.2 },
  { x: 4.7, z: -4.6, w: 0.35, d: 4.4 },
  { x: -3.8, z: 3.2, w: 3.2, d: 0.45 },
  { x: 3.8, z: 3.2, w: 3.2, d: 0.45 },
  { x: -6.2, z: 6.9, w: 2.4, d: 0.55 },
  { x: 6.15, z: 6.7, w: 2.5, d: 0.55 },
]);

const SHELVES = Object.freeze([
  { x: -6.1, z: -6.8, rot: 0, color: 0xf3f1e8, type: 'rack' },
  { x: 6.1, z: -6.6, rot: Math.PI, color: 0xf3f1e8, type: 'rack' },
  { x: -6.25, z: 1.2, rot: 0, color: 0xf7f5ed, type: 'wall' },
  { x: 6.25, z: 1.0, rot: Math.PI, color: 0xf7f5ed, type: 'wall' },
  { x: -2.3, z: -0.9, rot: Math.PI / 2, color: 0xe7c89f, type: 'table' },
  { x: 2.3, z: -0.7, rot: Math.PI / 2, color: 0xe3c097, type: 'table' },
  { x: -2.5, z: 5.75, rot: Math.PI / 2, color: 0xe7c89f, type: 'table' },
  { x: 2.5, z: 5.75, rot: Math.PI / 2, color: 0xe3c097, type: 'table' },
]);

const ITEMS = Object.freeze([
  { id: 'hoodie-origen', x: -2.8, z: -1.4, y: 0.95, value: 92000, name: 'Hoodie ORIGEN', color: 0x3a3a3a },
  { id: 'hoodie-bordo', x: -1.6, z: -0.85, y: 0.95, value: 118000, name: 'Hoodie bordo', color: 0x6d1f2b },
  { id: 'tee-white', x: 1.7, z: -1.1, y: 0.95, value: 47000, name: 'Remera blanca', color: 0xf2f0e7 },
  { id: 'pants-cargo', x: 2.8, z: -0.45, y: 0.95, value: 142000, name: 'Cargo camo', color: 0x556044 },
  { id: 'cap-white', x: -3.0, z: 5.45, y: 0.95, value: 38000, name: 'Gorra blanca', color: 0xf4f1e8 },
  { id: 'bag-black', x: -1.8, z: 6.08, y: 0.95, value: 155000, name: 'Bolso negro', color: 0x161616 },
  { id: 'set-blue', x: 1.8, z: 5.45, y: 0.95, value: 224000, name: 'Set azul', color: 0x172a5c },
  { id: 'jacket-black', x: 3.0, z: 6.1, y: 0.95, value: 260000, name: 'Campera negra', color: 0x0f0f12 },
  { id: 'upper-maroon', x: -5.45, z: -6.2, y: UPPER_Y + 1.2, level: 1, value: 180000, name: 'Hoodie premium', color: 0x7d2432 },
  { id: 'upper-watch', x: 5.45, z: -5.9, y: UPPER_Y + 1.2, level: 1, value: 210000, name: 'Reloj FT', color: 0xe2c25a },
]);

const GUARDS = Object.freeze([
  {
    name: 'Seguridad pasillo',
    path: [[-4.8, -7.5, 0], [-4.8, 8.0, 0], [0.8, 8.0, 0], [0.8, -7.5, 0]],
    speed: 1.48,
    range: 5.1,
    fov: Math.PI * 0.22,
  },
  {
    name: 'Seguridad central',
    path: [[4.9, -7.8, 0], [4.9, 7.6, 0], [-1.2, 7.6, 0], [-1.2, -7.8, 0]],
    speed: 1.35,
    range: 5.6,
    fov: Math.PI * 0.24,
  },
  {
    name: 'Seguridad arriba',
    path: [[-5.8, -8.4, 1], [5.8, -8.4, 1], [5.8, -3.8, 1], [-5.8, -3.8, 1]],
    speed: 1.5,
    range: 4.8,
    fov: Math.PI * 0.23,
  },
]);

function money(value) {
  return `$${Math.round(value).toLocaleString('es-AR')}`;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function disposeObject(root) {
  root?.traverse?.((obj) => {
    obj.geometry?.dispose?.();
    if (Array.isArray(obj.material)) obj.material.forEach((m) => m.dispose?.());
    else obj.material?.dispose?.();
  });
}

function rectHit(x, z, rect, pad = PLAYER_RADIUS) {
  return x > rect.x - rect.w / 2 - pad && x < rect.x + rect.w / 2 + pad
    && z > rect.z - rect.d / 2 - pad && z < rect.z + rect.d / 2 + pad;
}

function segmentIntersectsRect(a, b, rect) {
  if (rectHit(a.x, a.z, rect, 0) || rectHit(b.x, b.z, rect, 0)) return true;
  const x0 = rect.x - rect.w / 2;
  const x1 = rect.x + rect.w / 2;
  const z0 = rect.z - rect.d / 2;
  const z1 = rect.z + rect.d / 2;
  const edges = [
    [{ x: x0, z: z0 }, { x: x1, z: z0 }],
    [{ x: x1, z: z0 }, { x: x1, z: z1 }],
    [{ x: x1, z: z1 }, { x: x0, z: z1 }],
    [{ x: x0, z: z1 }, { x: x0, z: z0 }],
  ];
  return edges.some(([c, d]) => lineCross(a, b, c, d));
}

function lineCross(a, b, c, d) {
  const det = (b.x - a.x) * (d.z - c.z) - (b.z - a.z) * (d.x - c.x);
  if (Math.abs(det) < 0.0001) return false;
  const t = ((c.x - a.x) * (d.z - c.z) - (c.z - a.z) * (d.x - c.x)) / det;
  const u = ((c.x - a.x) * (b.z - a.z) - (c.z - a.z) * (b.x - a.x)) / det;
  return t >= 0 && t <= 1 && u >= 0 && u <= 1;
}

function makeMat(color, roughness = 0.75, metalness = 0.02) {
  return new THREE.MeshStandardMaterial({ color, roughness, metalness });
}

function roundedBox(w, h, d, mat) {
  return new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
}

function labelTexture(text, width = 512, height = 128, color = '#171717') {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = 'rgba(255,255,255,0)';
  ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = color;
  ctx.font = '700 58px Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, width / 2, height / 2);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createTextSign(text, w, h) {
  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(w, h),
    new THREE.MeshBasicMaterial({ map: labelTexture(text), transparent: true }),
  );
  return mesh;
}

function makeStack(color, count = 4) {
  const group = new THREE.Group();
  const mat = makeMat(color, 0.92, 0);
  for (let i = 0; i < count; i++) {
    const cloth = roundedBox(0.86, 0.08, 0.48, mat);
    cloth.position.y = i * 0.085;
    cloth.rotation.y = (i % 2 ? -0.05 : 0.05);
    group.add(cloth);
  }
  return group;
}

function makePlant() {
  const group = new THREE.Group();
  const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.32, 0.42, 12), makeMat(0xd7d0bd));
  pot.position.y = 0.21;
  group.add(pot);
  const leafMat = makeMat(0x4d7a43, 0.82, 0);
  for (let i = 0; i < 9; i++) {
    const leaf = new THREE.Mesh(new THREE.ConeGeometry(0.075, 0.75, 6), leafMat);
    leaf.position.set(Math.cos(i) * 0.16, 0.75, Math.sin(i) * 0.16);
    leaf.rotation.z = Math.sin(i * 1.7) * 0.55;
    leaf.rotation.x = 0.75 + Math.cos(i) * 0.3;
    group.add(leaf);
  }
  return group;
}

function makeBob() {
  const group = new THREE.Group();
  const fur = makeMat(0x8b4b22, 0.88, 0);
  const hoodie = makeMat(0x651f2d, 0.92, 0);
  const pants = makeMat(0x4a5138, 0.88, 0);
  const shoe = makeMat(0x15151a, 0.65, 0.05);

  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.33, 0.72, 8, 16), hoodie);
  body.position.y = 0.72;
  body.rotation.x = 0.48;
  group.add(body);

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.31, 18, 14), fur);
  head.position.set(0, 1.17, -0.22);
  head.scale.set(1.08, 0.9, 1);
  group.add(head);
  for (const sx of [-1, 1]) {
    const ear = new THREE.Mesh(new THREE.SphereGeometry(0.13, 12, 10), fur);
    ear.position.set(sx * 0.29, 1.18, -0.18);
    group.add(ear);
  }
  const brow = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.035, 0.035), makeMat(0x17100a));
  brow.position.set(0.02, 1.22, -0.52);
  brow.rotation.z = -0.12;
  group.add(brow);

  for (const sx of [-1, 1]) {
    const arm = new THREE.Mesh(new THREE.CapsuleGeometry(0.07, 0.55, 6, 10), fur);
    arm.position.set(sx * 0.31, 0.58, -0.27);
    arm.rotation.x = 1.18;
    arm.rotation.z = sx * 0.26;
    group.add(arm);
    const leg = new THREE.Mesh(new THREE.CapsuleGeometry(0.1, 0.48, 6, 10), pants);
    leg.position.set(sx * 0.16, 0.32, 0.16);
    leg.rotation.x = sx < 0 ? -0.35 : 0.25;
    group.add(leg);
    const foot = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.1, 0.34), shoe);
    foot.position.set(sx * 0.18, 0.08, -0.08);
    group.add(foot);
  }
  group.scale.setScalar(0.82);
  return group;
}

function makeGuard() {
  const group = new THREE.Group();
  const uniform = makeMat(0x172b4a, 0.75, 0.02);
  const fur = makeMat(0x8b4b22, 0.88, 0);
  const black = makeMat(0x111318, 0.65, 0.08);
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.28, 0.86, 8, 16), uniform);
  body.position.y = 0.93;
  group.add(body);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.24, 16, 12), fur);
  head.position.y = 1.55;
  group.add(head);
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 0.1, 16), black);
  cap.position.y = 1.75;
  group.add(cap);
  const brim = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.035, 0.16), black);
  brim.position.set(0, 1.72, -0.18);
  group.add(brim);
  const torch = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.055, 0.35, 8), black);
  torch.position.set(0.28, 1.1, -0.26);
  torch.rotation.x = Math.PI / 2;
  group.add(torch);
  return group;
}

function makeVisionCone(range, fov) {
  const shape = new THREE.Shape();
  shape.moveTo(0, 0);
  const steps = 18;
  for (let i = 0; i <= steps; i++) {
    const a = -fov + (i / steps) * fov * 2;
    shape.lineTo(Math.sin(a) * range, -Math.cos(a) * range);
  }
  shape.lineTo(0, 0);
  const geo = new THREE.ShapeGeometry(shape);
  const mat = new THREE.MeshBasicMaterial({
    color: 0xffe27a,
    transparent: true,
    opacity: 0.22,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.y = 0.035;
  return mesh;
}

function collides(x, z, level) {
  if (x < -STORE_W / 2 + 0.65 || x > STORE_W / 2 - 0.65 || z < -STORE_D / 2 + 0.65 || z > STORE_D / 2 - 0.65) return true;
  if (level === 1 && z > -2.6) return true;
  return WALLS.some((wall) => rectHit(x, z, wall));
}

function makeGuardState(config) {
  const [x, z, level] = config.path[0];
  const mesh = makeGuard();
  const cone = makeVisionCone(config.range, config.fov);
  return { ...config, x, z, level, y: level ? UPPER_Y : 0, target: 1, pause: 0.4, angle: 0, mesh, cone, alert: 0 };
}

export function createBobShopHeistGame() {
  let root;
  let host;
  let renderer;
  let scene;
  let camera;
  let cameraPivot;
  let bob;
  let bobBaseY = 0;
  let guards = [];
  let itemStates = [];
  let keys = new Set();
  let pointer = null;
  let running = false;
  let finished = false;
  let frame = 0;
  let previous = 0;
  let player;
  let loot = 0;
  let suspicion = 0;
  let steal = null;
  let message = 'Movete agachado, robá con E y evitá la linterna.';
  let messageTime = 4;
  let onResult = () => {};
  let lootEl;
  let suspicionEl;
  let hintEl;
  let progressEl;

  function mount({ container, onResult: report }) {
    onResult = report;
    root = document.createElement('div');
    root.className = 'bob-heist-game bob-heist-3d';
    root.innerHTML = `
      <div class="bob-heist-hud bob-heist-hud-3d">
        <div class="bob-heist-face"><span>BOB</span></div>
        <div class="bob-heist-bananas"><i></i><i></i><i class="dim"></i></div>
        <span>BOTIN <strong data-loot>$0</strong></span>
        <span>META <strong>${money(GOAL)}</strong></span>
        <span>SOSPECHA <strong data-suspicion>0%</strong></span>
      </div>
      <div class="bob-heist-render"></div>
      <div class="bob-heist-minimap"><b></b><i></i><i></i><i></i></div>
      <button type="button" class="bob-heist-action" aria-label="Robar prenda">👕</button>
    <div class="bob-heist-hint" data-hint></div>
      <div class="bob-heist-progress" hidden><i></i></div>
    `;
    container.append(root);
    container.closest('.minigame-frame')?.classList.add('minigame-frame-wide');
    host = root.querySelector('.bob-heist-render');
    lootEl = root.querySelector('[data-loot]');
    suspicionEl = root.querySelector('[data-suspicion]');
    hintEl = root.querySelector('[data-hint]');
    progressEl = root.querySelector('.bob-heist-progress');
    root.querySelector('.bob-heist-action')?.addEventListener('pointerdown', () => keys.add('KeyE'));
    root.querySelector('.bob-heist-action')?.addEventListener('pointerup', () => keys.delete('KeyE'));

    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.04;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    host.append(renderer.domElement);

    scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf3efe3);
    scene.fog = new THREE.Fog(0xf3efe3, 18, 34);

    camera = new THREE.PerspectiveCamera(48, 1, 0.1, 80);
    cameraPivot = new THREE.Vector3();
    buildStore();

    window.addEventListener('keydown', onKeyDown, { capture: true });
    window.addEventListener('keyup', onKeyUp, { capture: true });
    renderer.domElement.addEventListener('pointerdown', onPointerDown);
    renderer.domElement.addEventListener('pointermove', onPointerMove);
    renderer.domElement.addEventListener('pointerup', onPointerUp);
    renderer.domElement.addEventListener('pointercancel', onPointerUp);
    resize();
  }

  function buildStore() {
    const floorMat = makeMat(0xf0ede2, 0.56, 0.03);
    const wallMat = makeMat(0xf7f4eb, 0.82, 0);
    const woodMat = makeMat(0xd6b384, 0.72, 0.02);
    const blackMat = makeMat(0x171717, 0.7, 0.1);

    scene.add(new THREE.HemisphereLight(0xffffff, 0xb49d75, 1.8));
    const sun = new THREE.DirectionalLight(0xffffff, 1.7);
    sun.position.set(-4, 10, 5);
    sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024);
    scene.add(sun);

    const floor = new THREE.Mesh(new THREE.PlaneGeometry(STORE_W, STORE_D), floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);

    const upper = new THREE.Mesh(new THREE.BoxGeometry(STORE_W - 1.4, 0.22, 5.8), floorMat);
    upper.position.set(0, UPPER_Y - 0.11, -6.3);
    upper.receiveShadow = true;
    upper.castShadow = true;
    scene.add(upper);

    addWall(0, -STORE_D / 2, STORE_W, 3.8, 0, wallMat);
    addWall(-STORE_W / 2, 0, STORE_D, 3.8, Math.PI / 2, wallMat);
    addWall(STORE_W / 2, 0, STORE_D, 3.8, -Math.PI / 2, wallMat);
    addWall(0, STORE_D / 2, STORE_W, 2.8, Math.PI, wallMat);

    const origen = createTextSign('ORIGEN', 3.2, 0.55);
    origen.position.set(0, 2.8, -STORE_D / 2 + 0.04);
    scene.add(origen);
    const brand = createTextSign('FOURTWENTY', 3.4, 0.55);
    brand.position.set(-5.25, 2.75, -STORE_D / 2 + 0.05);
    scene.add(brand);

    for (const shelf of SHELVES) addFixture(shelf, woodMat, blackMat);
    for (const [x, z] of [[-6.4, -2.2], [6.3, -2.6], [-6.2, 8.8], [6.1, 8.4], [0.2, -8.2]]) {
      const plant = makePlant();
      plant.position.set(x, 0, z);
      scene.add(plant);
    }

    addStairs(5.9, -2.2, woodMat, blackMat);
    addLightingStrips();

    bob = makeBob();
    scene.add(bob);
    guards = GUARDS.map(makeGuardState);
    for (const guard of guards) {
      scene.add(guard.mesh);
      scene.add(guard.cone);
    }

    itemStates = ITEMS.map((item) => {
      const stack = makeStack(item.color, item.value > 170000 ? 5 : 4);
      stack.position.set(item.x, item.y, item.z);
      stack.userData.itemId = item.id;
      scene.add(stack);
      return { ...item, mesh: stack, stolen: false };
    });
  }

  function addWall(x, z, w, h, rot, mat) {
    const wall = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.22), mat);
    wall.position.set(x, h / 2, z);
    wall.rotation.y = rot;
    wall.receiveShadow = true;
    wall.castShadow = true;
    scene.add(wall);
  }

  function addFixture(config, woodMat, blackMat) {
    const group = new THREE.Group();
    group.position.set(config.x, config.type === 'wall' ? 0.4 : 0, config.z);
    group.rotation.y = config.rot;
    if (config.type === 'table') {
      const top = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.18, 1.2), woodMat);
      top.position.y = 0.74;
      top.castShadow = true;
      top.receiveShadow = true;
      group.add(top);
      for (const sx of [-1, 1]) {
        for (const sz of [-1, 1]) {
          const leg = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.75, 0.08), blackMat);
          leg.position.set(sx * 1.14, 0.36, sz * 0.48);
          group.add(leg);
        }
      }
      const strip = new THREE.PointLight(0xffdca0, 0.55, 2.4);
      strip.position.set(0, 0.42, 0);
      group.add(strip);
    } else {
      const frame = new THREE.Mesh(new THREE.BoxGeometry(0.1, 2.35, 0.08), blackMat);
      const frame2 = frame.clone();
      frame.position.set(-0.85, 1.15, 0);
      frame2.position.set(0.85, 1.15, 0);
      group.add(frame, frame2);
      const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 1.8, 8), blackMat);
      rod.rotation.z = Math.PI / 2;
      rod.position.y = 1.95;
      group.add(rod);
      for (let i = 0; i < 6; i++) {
        const shirt = new THREE.Mesh(new THREE.BoxGeometry(0.23, 0.56, 0.05), makeMat(i % 2 ? 0x202020 : 0xf1eee5));
        shirt.position.set(-0.65 + i * 0.26, 1.55, 0.06);
        group.add(shirt);
      }
      const light = new THREE.PointLight(0xffdfaa, 0.7, 3.0);
      light.position.set(0, 2.1, 0.3);
      group.add(light);
    }
    scene.add(group);
  }

  function addStairs(x, z, woodMat, blackMat) {
    const group = new THREE.Group();
    group.position.set(x, 0, z);
    for (let i = 0; i < 11; i++) {
      const step = new THREE.Mesh(new THREE.BoxGeometry(1.55, 0.18, 0.58), woodMat);
      step.position.set(0, i * 0.285, i * -0.44);
      step.castShadow = true;
      step.receiveShadow = true;
      group.add(step);
    }
    const rail = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.05, 4.9), blackMat);
    rail.position.set(-0.88, 1.55, -2.18);
    rail.rotation.x = -0.48;
    group.add(rail);
    scene.add(group);
  }

  function addLightingStrips() {
    const mat = new THREE.MeshBasicMaterial({ color: 0xffdca0 });
    for (const [x, z, rot] of [[-6.05, -2.0, 0], [6.05, -2.0, 0], [-6.05, 5.0, 0], [6.05, 5.0, 0], [0, -10.85, Math.PI / 2]]) {
      const strip = new THREE.Mesh(new THREE.BoxGeometry(0.035, 1.7, 0.035), mat);
      strip.position.set(x, 1.55, z);
      strip.rotation.y = rot;
      scene.add(strip);
      const light = new THREE.PointLight(0xffdca0, 0.72, 3.4);
      light.position.set(x, 1.55, z);
      scene.add(light);
    }
  }

  function start() {
    player = { x: -4.7, z: 6.15, y: 0, level: 0, yaw: 0, moving: false, crouch: true };
    loot = 0;
    suspicion = 0;
    steal = null;
    running = true;
    finished = false;
    previous = performance.now();
    message = 'Movete agachado, robá con E y evitá la linterna.';
    messageTime = 4;
    updateHud();
    frame = requestAnimationFrame(tick);
  }

  function tick(now) {
    if (!running || finished) return;
    const dt = Math.min(0.05, Math.max(0, (now - previous) / 1000));
    previous = now;
    updatePlayer(dt);
    updateGuards(dt);
    updateSteal(dt);
    updateSuspicion(dt);
    updateCamera(dt);
    updateHud(dt);
    renderer.render(scene, camera);
    frame = requestAnimationFrame(tick);
  }

  function updatePlayer(dt) {
    let dx = 0;
    let dz = 0;
    for (const [code, dir] of Object.entries(INPUT)) {
      if (!keys.has(code)) continue;
      dx += dir[0];
      dz += dir[1];
    }
    if (pointer) {
      dx += pointer.x;
      dz += pointer.z;
    }
    const len = Math.hypot(dx, dz);
    player.crouch = !keys.has('ShiftLeft') && !keys.has('ShiftRight');
    player.moving = len > 0.05;
    if (len > 0.05) {
      const speed = player.crouch ? CROUCH_SPEED : WALK_SPEED;
      const nx = dx / len;
      const nz = dz / len;
      player.yaw = Math.atan2(nx, nz);
      movePlayer(nx * speed * dt, nz * speed * dt);
    }
    const nearStairs = player.x > 4.55 && player.x < 7.05 && player.z < -1.5 && player.z > -7.2;
    if (nearStairs && wantsAction()) {
      player.level = player.level ? 0 : 1;
      player.y = player.level ? UPPER_Y : 0;
      player.x = 5.85;
      player.z = player.level ? -6.8 : -2.2;
      setMessage(player.level ? 'Subiste al segundo piso.' : 'Bajaste al primer piso.', 1.4);
    } else if (nearStairs) {
      setMessage(player.level ? 'E para bajar por la escalera.' : 'E para subir al segundo piso.', 0.12);
    }
    const bobY = player.y;
    bob.position.set(player.x, bobY, player.z);
    bob.rotation.y = player.yaw + Math.PI;
    bob.rotation.z = Math.sin(nowish() * 6) * (player.moving ? 0.035 : 0.012);
    bobBaseY = bobY;
  }

  function nowish() {
    return performance.now() / 1000;
  }

  function movePlayer(dx, dz) {
    const nextX = clamp(player.x + dx, -STORE_W / 2 + 0.7, STORE_W / 2 - 0.7);
    const nextZ = clamp(player.z + dz, -STORE_D / 2 + 0.7, STORE_D / 2 - 0.7);
    if (!collides(nextX, player.z, player.level)) player.x = nextX;
    if (!collides(player.x, nextZ, player.level)) player.z = nextZ;
  }

  function updateGuards(dt) {
    for (const guard of guards) {
      if (guard.pause > 0) {
        guard.pause -= dt;
        guard.angle += Math.sin(nowish() * 2.2) * 0.01;
      } else {
        const [tx, tz, level] = guard.path[guard.target];
        const dx = tx - guard.x;
        const dz = tz - guard.z;
        const len = Math.hypot(dx, dz);
        guard.angle = Math.atan2(dx, dz);
        if (len < guard.speed * dt) {
          guard.x = tx;
          guard.z = tz;
          guard.level = level;
          guard.y = level ? UPPER_Y : 0;
          guard.target = (guard.target + 1) % guard.path.length;
          guard.pause = 0.45 + Math.random() * 0.5;
        } else {
          guard.x += (dx / len) * guard.speed * dt;
          guard.z += (dz / len) * guard.speed * dt;
        }
      }
      guard.mesh.position.set(guard.x, guard.y, guard.z);
      guard.mesh.rotation.y = guard.angle + Math.PI;
      guard.cone.position.set(guard.x, guard.y + 0.04, guard.z);
      guard.cone.rotation.y = guard.angle;
      guard.cone.material.opacity = guard.alert > 0 ? 0.36 : 0.2;
      guard.cone.material.color.setHex(guard.alert > 0 ? 0xff5545 : 0xffe27a);
      guard.alert = Math.max(0, guard.alert - dt * 1.25);
    }
  }

  function updateSteal(dt) {
    const item = nearestItem();
    const stealing = wantsAction() && item;
    if (!item) {
      steal = null;
      setProgress(0);
      return;
    }
    if (!stealing) {
      steal = null;
      setProgress(0);
      setMessage(`E para guardar ${item.name} (${money(item.value)})`, 0.12);
      return;
    }
    if (!steal || steal.id !== item.id) steal = { id: item.id, time: 0 };
    steal.time += dt;
    setProgress(steal.time / STEAL_SECONDS);
    setMessage(`Guardando ${item.name}...`, 0.12);
    if (steal.time >= STEAL_SECONDS) {
      item.stolen = true;
      item.mesh.visible = false;
      loot += item.value;
      steal = null;
      setProgress(0);
      setMessage(`Te llevaste ${item.name}: ${money(item.value)}`, 1.4);
      if (loot >= GOAL) finish('win');
    }
  }

  function nearestItem() {
    let winner = null;
    let best = 0.9;
    for (const item of itemStates) {
      if (item.stolen || (item.level ?? 0) !== player.level) continue;
      const dist = Math.hypot(item.x - player.x, item.z - player.z);
      if (dist < best) {
        best = dist;
        winner = item;
      }
    }
    return winner;
  }

  function wantsAction() {
    return keys.has('KeyE') || keys.has('Space');
  }

  function updateSuspicion(dt) {
    const seen = guards.filter((guard) => guardSeesPlayer(guard));
    if (seen.length) {
      const moving = player.moving && !player.crouch ? 22 : player.moving ? 10 : 4;
      const stealing = steal ? 36 : 0;
      suspicion += (26 + moving + stealing) * seen.length * dt;
      for (const guard of seen) guard.alert = 1;
      setMessage(steal ? 'Te están alumbrando mientras robás.' : 'Quedate quieto: seguridad te vio.', 0.12);
    } else {
      suspicion -= (steal ? 3 : 18) * dt;
    }
    suspicion = clamp(suspicion, 0, 100);
    if (suspicion >= 100) finish('lose');
  }

  function guardSeesPlayer(guard) {
    if (guard.level !== player.level) return false;
    const dx = player.x - guard.x;
    const dz = player.z - guard.z;
    const dist = Math.hypot(dx, dz);
    if (dist > guard.range) return false;
    let angle = Math.atan2(dx, dz) - guard.angle;
    while (angle > Math.PI) angle -= Math.PI * 2;
    while (angle < -Math.PI) angle += Math.PI * 2;
    if (Math.abs(angle) > guard.fov) return false;
    const a = { x: guard.x, z: guard.z };
    const b = { x: player.x, z: player.z };
    return !WALLS.some((wall) => segmentIntersectsRect(a, b, wall));
  }

  function updateCamera(dt) {
    const target = new THREE.Vector3(player.x, bobBaseY + 0.75, player.z);
    cameraPivot.lerp(target, 1 - Math.pow(0.001, dt));
    const offset = new THREE.Vector3(0, 2.55, 4.7);
    if (player.level) offset.set(0, 2.7, 4.4);
    camera.position.copy(cameraPivot).add(offset);
    camera.lookAt(cameraPivot.x, cameraPivot.y + 0.78, cameraPivot.z - 2.4);
  }

  function updateHud(dt = 0) {
    if (lootEl) lootEl.textContent = money(loot);
    if (suspicionEl) {
      suspicionEl.textContent = `${Math.round(suspicion)}%`;
      suspicionEl.style.color = suspicion > 68 ? '#ff6158' : suspicion > 36 ? '#ffe275' : '#ffffff';
    }
    if (messageTime > 0) messageTime = Math.max(0, messageTime - dt);
    if (hintEl) hintEl.textContent = message;
    updateMinimap();
  }

  function updateMinimap() {
    const dots = root?.querySelectorAll('.bob-heist-minimap i');
    if (!dots?.length) return;
    guards.slice(0, 3).forEach((guard, i) => {
      dots[i].style.left = `${50 + (guard.x / STORE_W) * 78}%`;
      dots[i].style.top = `${50 + (guard.z / STORE_D) * 78}%`;
      dots[i].style.opacity = guard.level === player.level ? 1 : 0.32;
    });
    const arrow = root.querySelector('.bob-heist-minimap b');
    arrow.style.left = `${50 + (player.x / STORE_W) * 78}%`;
    arrow.style.top = `${50 + (player.z / STORE_D) * 78}%`;
    arrow.style.transform = `translate(-50%, -50%) rotate(${player.yaw}rad)`;
  }

  function setMessage(text, seconds) {
    if (messageTime > seconds && message === text) return;
    message = text;
    messageTime = seconds;
  }

  function setProgress(value) {
    if (!progressEl) return;
    const fill = progressEl.querySelector('i');
    progressEl.hidden = value <= 0 || value >= 1;
    fill.style.width = `${clamp(value, 0, 1) * 100}%`;
  }

  function finish(result) {
    if (finished) return;
    finished = true;
    running = false;
    cancelAnimationFrame(frame);
    onResult(result);
  }

  function onKeyDown(event) {
    if (!running) return;
    if (INPUT[event.code] || ['KeyE', 'Space', 'ShiftLeft', 'ShiftRight'].includes(event.code)) {
      event.preventDefault();
      event.stopPropagation();
      keys.add(event.code);
    }
  }

  function onKeyUp(event) {
    if (INPUT[event.code] || ['KeyE', 'Space', 'ShiftLeft', 'ShiftRight'].includes(event.code)) {
      event.preventDefault();
      event.stopPropagation();
      keys.delete(event.code);
    }
  }

  function onPointerDown(event) {
    const rect = renderer.domElement.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width - 0.5) * 2;
    const z = ((event.clientY - rect.top) / rect.height - 0.5) * 2;
    pointer = { x: clamp(x, -1, 1), z: clamp(z, -1, 1) };
    renderer.domElement.setPointerCapture?.(event.pointerId);
  }

  function onPointerMove(event) {
    if (!pointer) return;
    onPointerDown(event);
  }

  function onPointerUp() {
    pointer = null;
    keys.delete('KeyE');
  }

  function pause() {
    running = false;
    cancelAnimationFrame(frame);
  }

  function resize() {
    if (!renderer || !host) return;
    const w = host.clientWidth || 960;
    const h = host.clientHeight || 720;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }

  function destroy() {
    pause();
    window.removeEventListener('keydown', onKeyDown, { capture: true });
    window.removeEventListener('keyup', onKeyUp, { capture: true });
    renderer?.domElement?.removeEventListener('pointerdown', onPointerDown);
    renderer?.domElement?.removeEventListener('pointermove', onPointerMove);
    renderer?.domElement?.removeEventListener('pointerup', onPointerUp);
    renderer?.domElement?.removeEventListener('pointercancel', onPointerUp);
    disposeObject(scene);
    renderer?.dispose();
    renderer?.forceContextLoss?.();
    root?.closest('.minigame-frame')?.classList.remove('minigame-frame-wide');
    root?.remove();
    root = null;
  }

  return { mount, start, pause, destroy, resize };
}
