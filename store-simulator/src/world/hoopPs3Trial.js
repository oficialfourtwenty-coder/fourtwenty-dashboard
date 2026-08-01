import * as THREE from 'three';
import { box } from './gfxUtils.js';

const ROOM_W = 12;
const ROOM_D = 18;
const ROOM_H = 3.4;
const WALL_T = 0.3;
const ROOM_MIN_Z = -4.5;
const ROOM_MAX_Z = 13.5;
const ROOM_CENTER_Z = 4.5;
const ROOM_HALF_W = ROOM_W / 2;

function seededRandom(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

function canvasTexture(width, height, draw, { repeatX = 1, repeatY = 1 } = {}) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  draw(context, width, height);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(repeatX, repeatY);
  texture.magFilter = THREE.LinearFilter;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.generateMipmaps = true;
  texture.anisotropy = 8;
  return texture;
}

function concreteTexture(repeatX, repeatY) {
  return canvasTexture(256, 256, (ctx, width, height) => {
    const random = seededRandom(420);
    ctx.fillStyle = '#77766f';
    ctx.fillRect(0, 0, width, height);
    for (let i = 0; i < 1500; i++) {
      const light = random() > 0.48;
      ctx.fillStyle = light ? 'rgba(255,255,245,0.055)' : 'rgba(28,25,22,0.07)';
      const size = 1 + Math.floor(random() * 3);
      ctx.fillRect(random() * width, random() * height, size, size);
    }
    ctx.strokeStyle = 'rgba(35,33,30,0.32)';
    ctx.lineWidth = 3;
    ctx.strokeRect(2, 2, width - 4, height - 4);
    for (let i = 0; i < 8; i++) {
      ctx.strokeStyle = `rgba(42,39,35,${0.05 + random() * 0.08})`;
      ctx.beginPath();
      ctx.moveTo(random() * width, random() * height);
      ctx.bezierCurveTo(random() * width, random() * height, random() * width, random() * height, random() * width, random() * height);
      ctx.stroke();
    }
  }, { repeatX, repeatY });
}

function paintedBrickTexture(repeatX, repeatY) {
  return canvasTexture(384, 256, (ctx, width, height) => {
    const random = seededRandom(20420);
    ctx.fillStyle = '#9b988d';
    ctx.fillRect(0, 0, width, height);
    const brickW = 48;
    const brickH = 24;
    for (let row = 0; row < Math.ceil(height / brickH); row++) {
      const offset = row % 2 ? -brickW / 2 : 0;
      for (let x = offset; x < width; x += brickW) {
        const value = 76 + Math.floor(random() * 26);
        ctx.fillStyle = `rgb(${value + 18},${value + 10},${value})`;
        ctx.fillRect(x + 2, row * brickH + 2, brickW - 4, brickH - 4);
      }
    }
    const wash = ctx.createLinearGradient(0, 0, 0, height);
    wash.addColorStop(0, 'rgba(221,217,204,0.54)');
    wash.addColorStop(0.58, 'rgba(205,201,188,0.35)');
    wash.addColorStop(1, 'rgba(38,48,42,0.25)');
    ctx.fillStyle = wash;
    ctx.fillRect(0, 0, width, height);
    for (let i = 0; i < 70; i++) {
      ctx.fillStyle = random() > 0.5 ? 'rgba(30,27,24,0.08)' : 'rgba(255,248,226,0.08)';
      ctx.fillRect(random() * width, random() * height, 8 + random() * 30, 2 + random() * 8);
    }
  }, { repeatX, repeatY });
}

function courtTexture() {
  return canvasTexture(768, 640, (ctx, width, height) => {
    const random = seededRandom(4203);
    const plankW = 32;
    for (let x = 0; x < width; x += plankW) {
      const tone = 145 + Math.floor(random() * 28);
      ctx.fillStyle = `rgb(${tone + 30},${tone + 3},${Math.max(75, tone - 45)})`;
      ctx.fillRect(x, 0, plankW, height);
      ctx.fillStyle = 'rgba(45,25,12,0.2)';
      ctx.fillRect(x, 0, 2, height);
      for (let y = (Math.floor(random() * 5) * 90); y < height; y += 180) {
        ctx.fillRect(x, y, plankW, 2);
      }
    }
    for (let i = 0; i < 90; i++) {
      ctx.fillStyle = `rgba(62,34,16,${0.025 + random() * 0.045})`;
      ctx.fillRect(random() * width, random() * height, 25 + random() * 100, 2);
    }
    ctx.strokeStyle = '#efe7d3';
    ctx.lineWidth = 8;
    ctx.strokeRect(18, 18, width - 36, height - 36);
    ctx.beginPath();
    ctx.moveTo(18, height * 0.5);
    ctx.lineTo(width - 18, height * 0.5);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(width / 2, height / 2, 92, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeRect(width / 2 - 118, height - 218, 236, 200);
    ctx.beginPath();
    ctx.arc(width / 2, height - 218, 118, Math.PI, 0);
    ctx.stroke();
    ctx.fillStyle = 'rgba(31,77,46,0.9)';
    ctx.beginPath();
    ctx.arc(width / 2, height / 2, 68, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#eee7d7';
    ctx.font = '900 54px Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('FT', width / 2, height / 2 + 2);
  });
}

function cityWindowTexture() {
  return canvasTexture(512, 256, (ctx, width, height) => {
    const random = seededRandom(2570);
    const sky = ctx.createLinearGradient(0, 0, 0, height);
    sky.addColorStop(0, '#8ea3af');
    sky.addColorStop(0.52, '#d09b72');
    sky.addColorStop(1, '#59473f');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, width, height);
    let x = 0;
    while (x < width) {
      const buildingW = 45 + random() * 70;
      const buildingH = 70 + random() * 115;
      ctx.fillStyle = random() > 0.5 ? '#353a3c' : '#45433f';
      ctx.fillRect(x, height - buildingH, buildingW, buildingH);
      ctx.fillStyle = 'rgba(246,205,121,0.62)';
      for (let wx = x + 10; wx < x + buildingW - 7; wx += 16) {
        for (let wy = height - buildingH + 13; wy < height - 12; wy += 20) {
          if (random() > 0.42) ctx.fillRect(wx, wy, 7, 8);
        }
      }
      x += buildingW + 5;
    }
    ctx.fillStyle = 'rgba(35,38,38,0.62)';
    ctx.fillRect(0, height - 20, width, 20);
  });
}

function signTexture(title, subtitle, { background = '#ece7d8', foreground = '#17191a', accent = '#d96b2f' } = {}) {
  return canvasTexture(640, 240, (ctx, width, height) => {
    ctx.fillStyle = background;
    ctx.fillRect(0, 0, width, height);
    ctx.fillStyle = accent;
    ctx.fillRect(0, 0, 18, height);
    ctx.fillRect(0, height - 18, width, 18);
    ctx.fillStyle = foreground;
    ctx.font = '900 72px Arial, sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(title, 46, 94, width - 70);
    ctx.font = '700 24px Courier New, monospace';
    ctx.fillText(subtitle, 50, 168, width - 80);
    ctx.fillStyle = accent;
    ctx.fillRect(width - 104, 42, 58, 58);
    ctx.fillStyle = foreground;
    ctx.font = '900 26px Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('420', width - 75, 72);
  });
}

function scoreboardTexture() {
  return canvasTexture(768, 256, (ctx, width, height) => {
    ctx.fillStyle = '#111416';
    ctx.fillRect(0, 0, width, height);
    ctx.strokeStyle = '#646967';
    ctx.lineWidth = 10;
    ctx.strokeRect(7, 7, width - 14, height - 14);
    ctx.fillStyle = '#b8b8ac';
    ctx.font = '700 25px Courier New, monospace';
    ctx.textAlign = 'center';
    ctx.fillText('FOURTWENTY ATHLETICS', width / 2, 38);
    ctx.fillStyle = '#e3482d';
    ctx.shadowColor = '#e3482d';
    ctx.shadowBlur = 12;
    ctx.font = '900 78px Courier New, monospace';
    ctx.fillText('FT  04:20  00', width / 2, 137);
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#d6d2c8';
    ctx.font = '700 19px Courier New, monospace';
    ctx.fillText('HOOP SEASON / BURELA', width / 2, 206);
  });
}

function plane(width, height, material, x, y, z, rotationY = 0) {
  const object = new THREE.Mesh(new THREE.PlaneGeometry(width, height), material);
  object.position.set(x, y, z);
  object.rotation.y = rotationY;
  return object;
}

function addFluorescentFixture(group, x, z, length = 2.5) {
  const casing = new THREE.MeshStandardMaterial({ color: 0x24282a, roughness: 0.6, metalness: 0.58 });
  const panel = new THREE.MeshStandardMaterial({
    color: 0xdbe6e6,
    emissive: 0xcfe5e6,
    emissiveIntensity: 1.25,
    roughness: 0.32,
  });
  group.add(box(length + 0.12, 0.08, 0.34, x, ROOM_H - 0.16, z, casing));
  group.add(box(length, 0.025, 0.24, x, ROOM_H - 0.215, z, panel));
}

export function buildHoopPs3Shell(scene) {
  const group = new THREE.Group();
  group.name = 'PRUEBA HOOP PS3 · arquitectura tipo tienda urbana';

  const floorMaterial = new THREE.MeshStandardMaterial({
    map: concreteTexture(4, 6),
    color: 0xc0bdb3,
    roughness: 0.74,
    metalness: 0.03,
  });
  const wallMaterial = new THREE.MeshStandardMaterial({
    map: paintedBrickTexture(7, 3),
    color: 0xd0cbbd,
    roughness: 0.93,
  });
  const ceilingMaterial = new THREE.MeshStandardMaterial({
    map: concreteTexture(4, 5),
    color: 0x555957,
    roughness: 0.94,
  });
  const steelMaterial = new THREE.MeshStandardMaterial({ color: 0x252a2b, roughness: 0.5, metalness: 0.68 });
  const greenMaterial = new THREE.MeshStandardMaterial({ color: 0x244d36, roughness: 0.82, metalness: 0.02 });

  group.add(box(ROOM_W, 0.3, ROOM_D, 0, -0.15, ROOM_CENTER_Z, floorMaterial));
  group.add(box(ROOM_W, 0.18, ROOM_D, 0, ROOM_H + 0.09, ROOM_CENTER_Z, ceilingMaterial));
  group.add(box(ROOM_W + WALL_T * 2, ROOM_H, WALL_T, 0, ROOM_H / 2, ROOM_MAX_Z + WALL_T / 2, wallMaterial));
  group.add(box(ROOM_W + WALL_T * 2, ROOM_H, WALL_T, 0, ROOM_H / 2, ROOM_MIN_Z - WALL_T / 2, wallMaterial));
  group.add(box(WALL_T, ROOM_H, ROOM_D, -ROOM_HALF_W - WALL_T / 2, ROOM_H / 2, ROOM_CENTER_Z, wallMaterial));
  group.add(box(WALL_T, ROOM_H, ROOM_D, ROOM_HALF_W + WALL_T / 2, ROOM_H / 2, ROOM_CENTER_Z, wallMaterial));

  group.add(box(0.09, 1.05, ROOM_D - 0.2, -ROOM_HALF_W + 0.02, 0.525, ROOM_CENTER_Z, greenMaterial));
  group.add(box(0.09, 1.05, ROOM_D - 0.2, ROOM_HALF_W - 0.02, 0.525, ROOM_CENTER_Z, greenMaterial));
  group.add(box(ROOM_W - 0.2, 1.05, 0.09, 0, 0.525, ROOM_MAX_Z - 0.02, greenMaterial));

  for (const z of [-3, 0.5, 4, 7.5, 11, 13]) {
    group.add(box(ROOM_W - 0.3, 0.16, 0.22, 0, ROOM_H - 0.08, z, steelMaterial));
    group.add(box(0.2, ROOM_H, 0.2, -ROOM_HALF_W + 0.22, ROOM_H / 2, z, steelMaterial));
    group.add(box(0.2, ROOM_H, 0.2, ROOM_HALF_W - 0.22, ROOM_H / 2, z, steelMaterial));
  }

  const duct = new THREE.Mesh(new THREE.CylinderGeometry(0.19, 0.19, 14.5, 12), steelMaterial);
  duct.name = 'HOOP · conducto industrial';
  duct.rotation.x = Math.PI / 2;
  duct.position.set(4.9, ROOM_H - 0.3, 4.2);
  group.add(duct);
  for (const z of [-2.5, 1.5, 5.5, 9.5]) {
    const joint = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.025, 6, 12), steelMaterial);
    joint.rotation.x = Math.PI / 2;
    joint.position.set(4.9, ROOM_H - 0.3, z);
    group.add(joint);
  }

  const cityTexture = cityWindowTexture();
  const windowMaterial = new THREE.MeshStandardMaterial({
    map: cityTexture,
    emissiveMap: cityTexture,
    emissive: 0x47382e,
    emissiveIntensity: 0.45,
    roughness: 0.24,
    metalness: 0.08,
  });
  for (const x of [-3.7, 0, 3.7]) {
    const window = plane(2.55, 1.35, windowMaterial, x, 2.05, ROOM_MIN_Z + 0.018);
    window.name = 'HOOP · ventana urbana';
    group.add(window);
    group.add(box(2.7, 0.08, 0.08, x, 2.75, ROOM_MIN_Z + 0.01, steelMaterial));
    group.add(box(2.7, 0.08, 0.08, x, 1.35, ROOM_MIN_Z + 0.01, steelMaterial));
    group.add(box(0.08, 1.48, 0.08, x - 1.31, 2.05, ROOM_MIN_Z + 0.01, steelMaterial));
    group.add(box(0.08, 1.48, 0.08, x + 1.31, 2.05, ROOM_MIN_Z + 0.01, steelMaterial));
  }

  addFluorescentFixture(group, -2.8, -1.4, 2.6);
  addFluorescentFixture(group, 2.8, -1.4, 2.6);
  addFluorescentFixture(group, -2.8, 4.7, 2.9);
  addFluorescentFixture(group, 2.8, 4.7, 2.9);
  addFluorescentFixture(group, -2.8, 8.3, 2.9);
  addFluorescentFixture(group, 2.8, 8.3, 2.9);

  group.traverse((object) => {
    if (!object.isMesh) return;
    object.castShadow = true;
    object.receiveShadow = true;
  });
  scene.add(group);

  return [
    { minX: -ROOM_HALF_W - WALL_T, maxX: ROOM_HALF_W + WALL_T, minY: 0, maxY: ROOM_H, minZ: ROOM_MAX_Z - 0.15, maxZ: ROOM_MAX_Z + WALL_T },
    { minX: -ROOM_HALF_W - WALL_T, maxX: ROOM_HALF_W + WALL_T, minY: 0, maxY: ROOM_H, minZ: ROOM_MIN_Z - WALL_T, maxZ: ROOM_MIN_Z + 0.15 },
    { minX: -ROOM_HALF_W - WALL_T, maxX: -ROOM_HALF_W + 0.15, minY: 0, maxY: ROOM_H, minZ: ROOM_MIN_Z, maxZ: ROOM_MAX_Z },
    { minX: ROOM_HALF_W - 0.15, maxX: ROOM_HALF_W + WALL_T, minY: 0, maxY: ROOM_H, minZ: ROOM_MIN_Z, maxZ: ROOM_MAX_Z },
  ];
}

export function addHoopPs3Lights(scene, shadows) {
  scene.add(new THREE.HemisphereLight(0xcfe0e4, 0x302b27, 0.58));

  const windowLight = new THREE.DirectionalLight(0xd8ecf5, 0.96);
  windowLight.position.set(-5.5, 7.5, -7);
  windowLight.target.position.set(0, 0.8, 4.5);
  windowLight.castShadow = shadows;
  if (shadows) {
    windowLight.shadow.mapSize.set(1024, 1024);
    windowLight.shadow.camera.left = -8;
    windowLight.shadow.camera.right = 8;
    windowLight.shadow.camera.top = 9;
    windowLight.shadow.camera.bottom = -5;
    windowLight.shadow.camera.near = 1;
    windowLight.shadow.camera.far = 22;
    windowLight.shadow.bias = -0.00035;
  }
  scene.add(windowLight, windowLight.target);

  const fixtures = [
    [-2.8, -1.4, 0xe9f5f4, 5.8],
    [2.8, -1.4, 0xffd1a1, 5.4],
    [-2.8, 6.5, 0xe9f5f4, 6.2],
    [2.8, 6.5, 0xffc98f, 5.9],
  ];
  for (const [x, z, color, intensity] of fixtures) {
    const spot = new THREE.SpotLight(color, intensity, 9.5, 0.82, 0.78, 1.45);
    spot.position.set(x, ROOM_H - 0.25, z);
    spot.target.position.set(x * 0.72, 0, z + 0.25);
    scene.add(spot, spot.target);
  }

  const orangeAccent = new THREE.PointLight(0xff7b38, 4.2, 5.5, 2);
  orangeAccent.position.set(-5.1, 1.8, 8.5);
  scene.add(orangeAccent);
  const greenAccent = new THREE.PointLight(0x4db878, 3.4, 5.5, 2);
  greenAccent.position.set(5.1, 1.5, 4.5);
  scene.add(greenAccent);
}

function addWallPoster(group, texture, x, y, z, rotationY, width = 3.1, height = 1.18) {
  const frameMaterial = new THREE.MeshStandardMaterial({ color: 0x202425, roughness: 0.48, metalness: 0.72 });
  const frame = box(width + 0.12, height + 0.12, 0.055, 0, 0, -0.038, frameMaterial);
  const face = new THREE.Mesh(new THREE.PlaneGeometry(width, height), new THREE.MeshBasicMaterial({ map: texture }));
  const poster = new THREE.Group();
  poster.add(frame, face);
  poster.position.set(x, y, z);
  poster.rotation.y = rotationY;
  group.add(poster);
}

export function buildHoopPs3Set(scene) {
  const group = new THREE.Group();
  group.name = 'PRUEBA HOOP PS3 · cancha y ambientacion FOURTWENTY';
  const colliders = [];

  const court = new THREE.Mesh(
    new THREE.PlaneGeometry(8.6, 7.5),
    new THREE.MeshStandardMaterial({ map: courtTexture(), roughness: 0.48, metalness: 0.01 }),
  );
  court.name = 'HOOP · cancha principal de madera';
  court.rotation.x = -Math.PI / 2;
  court.position.set(0, 0.025, 6.8);
  court.receiveShadow = true;
  group.add(court);

  const steel = new THREE.MeshStandardMaterial({ color: 0x282d2e, roughness: 0.42, metalness: 0.76 });
  const boardMaterial = new THREE.MeshPhysicalMaterial({
    color: 0xd8ddda,
    transparent: true,
    opacity: 0.78,
    roughness: 0.2,
    metalness: 0.05,
    transmission: 0.08,
  });
  const orange = new THREE.MeshStandardMaterial({ color: 0xd85b25, roughness: 0.4, metalness: 0.55 });
  const netMaterial = new THREE.MeshStandardMaterial({ color: 0xe6dfd1, roughness: 0.88 });
  const hoopX = -2.8;

  group.add(box(1.05, 0.16, 0.95, hoopX, 0.08, 10.55, steel));
  group.add(box(0.18, 2.65, 0.18, hoopX, 1.38, 10.55, steel));
  group.add(box(0.18, 0.16, 0.85, hoopX, 2.62, 10.18, steel));
  group.add(box(1.85, 0.95, 0.07, hoopX, 2.48, 9.78, boardMaterial));
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.24, 0.025, 10, 28), orange);
  ring.rotation.x = Math.PI / 2;
  ring.position.set(hoopX, 2.28, 9.45);
  group.add(ring);
  for (let i = 0; i < 10; i++) {
    const angle = (i / 10) * Math.PI * 2;
    const strand = box(0.012, 0.36, 0.012, hoopX + Math.cos(angle) * 0.2, 2.08, 9.45 + Math.sin(angle) * 0.2, netMaterial);
    strand.rotation.z = Math.cos(angle) * 0.22;
    strand.rotation.x = -Math.sin(angle) * 0.22;
    group.add(strand);
  }
  colliders.push({ minX: hoopX - 0.58, maxX: hoopX + 0.58, minY: 0, maxY: 2.9, minZ: 10.0, maxZ: 11.05 });

  const bleacherMaterial = new THREE.MeshStandardMaterial({ color: 0x5c5b55, roughness: 0.82, metalness: 0.08 });
  const seatMaterial = new THREE.MeshStandardMaterial({ color: 0x263f34, roughness: 0.76 });
  const tiers = [
    { x: -5.45, h: 0.72 },
    { x: -5.03, h: 0.48 },
    { x: -4.61, h: 0.24 },
  ];
  for (const { x, h } of tiers) {
    group.add(box(0.42, h, 4.8, x, h / 2, 6.8, bleacherMaterial));
    group.add(box(0.44, 0.055, 4.82, x, h + 0.025, 6.8, seatMaterial));
  }
  colliders.push({ minX: -5.72, maxX: -4.35, minY: 0, maxY: 0.82, minZ: 4.35, maxZ: 9.25 });

  const rackX = 5.1;
  const rackZ = 6.8;
  group.add(box(0.08, 1.35, 2.2, rackX, 0.68, rackZ, steel));
  for (const y of [0.45, 1.0]) group.add(box(0.72, 0.05, 2.2, rackX - 0.3, y, rackZ, steel));
  const ballMaterial = new THREE.MeshStandardMaterial({ color: 0xc85b28, roughness: 0.82, metalness: 0.01 });
  for (let row = 0; row < 2; row++) {
    for (let i = 0; i < 4; i++) {
      const ball = new THREE.Mesh(new THREE.SphereGeometry(0.18, 12, 8), ballMaterial);
      ball.position.set(rackX - 0.34, 0.67 + row * 0.55, rackZ - 0.78 + i * 0.52);
      ball.castShadow = true;
      group.add(ball);
    }
  }
  colliders.push({ minX: 4.65, maxX: 5.55, minY: 0, maxY: 1.45, minZ: 5.65, maxZ: 7.95 });

  const backboard = plane(
    5.3,
    1.78,
    new THREE.MeshBasicMaterial({ map: scoreboardTexture() }),
    0,
    2.18,
    11.25,
    Math.PI,
  );
  backboard.name = 'HOOP · marcador 04:20';
  group.add(backboard);

  addWallPoster(
    group,
    signTexture('HOOP SEASON', 'FOURTWENTY ATHLETICS / BURELA', { background: '#e6dfce', accent: '#d45b27' }),
    -5.82,
    2.08,
    1.6,
    Math.PI / 2,
    3.5,
    1.32,
  );
  addWallPoster(
    group,
    signTexture('WE ROLL', 'DIFFERENT / DROP 04', { background: '#244d36', foreground: '#f0eadb', accent: '#e1ac43' }),
    5.82,
    2.02,
    2.8,
    -Math.PI / 2,
    3.2,
    1.22,
  );

  const hangingSignMaterial = new THREE.MeshBasicMaterial({
    map: signTexture('HOOP DROP', 'JERSEYS / BASICS / FOURTWENTY', { background: '#d9d2c2', accent: '#d45b27' }),
  });
  const hangingSign = plane(2.75, 1.03, hangingSignMaterial, 2.6, 2.28, 1.6, Math.PI);
  group.add(hangingSign);
  group.add(box(0.025, 0.58, 0.025, 1.65, 2.92, 1.6, steel));
  group.add(box(0.025, 0.58, 0.025, 3.55, 2.92, 1.6, steel));

  const floorStripeMaterial = new THREE.MeshStandardMaterial({ color: 0xe5b13e, roughness: 0.68 });
  for (const x of [-4.6, 4.6]) group.add(box(0.12, 0.018, 13.4, x, 0.018, 4.0, floorStripeMaterial));
  for (const z of [2.75, 10.85]) group.add(box(9.3, 0.018, 0.12, 0, 0.018, z, floorStripeMaterial));

  group.traverse((object) => {
    if (!object.isMesh || object.material.isMeshBasicMaterial) return;
    object.castShadow = true;
    object.receiveShadow = true;
  });
  scene.add(group);
  return colliders;
}
