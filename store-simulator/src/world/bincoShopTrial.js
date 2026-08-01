import * as THREE from 'three';
import { box } from './gfxUtils.js';
import { garmentTexture } from './gallery.js';
import { bindProductVisual } from './productVisuals.js';

const ROOM_W = 12;
const ROOM_D = 18;
const ROOM_H = 3.55;
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
  texture.anisotropy = 8;
  return texture;
}

function loadTexture(path) {
  const texture = new THREE.TextureLoader().load(path);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  return texture;
}

function brickTexture(repeatX, repeatY) {
  return canvasTexture(512, 256, (ctx, width, height) => {
    const random = seededRandom(518420);
    ctx.fillStyle = '#9b9285';
    ctx.fillRect(0, 0, width, height);
    const brickW = 64;
    const brickH = 31;
    for (let row = 0; row < Math.ceil(height / brickH); row++) {
      const offset = row % 2 ? -brickW / 2 : 0;
      for (let x = offset; x < width; x += brickW) {
        const value = 83 + Math.floor(random() * 28);
        ctx.fillStyle = `rgb(${value + 22},${value + 9},${value})`;
        ctx.fillRect(x + 3, row * brickH + 3, brickW - 6, brickH - 6);
        ctx.fillStyle = `rgba(255,238,210,${0.025 + random() * 0.04})`;
        ctx.fillRect(x + 5, row * brickH + 5, brickW - 10, 3);
      }
    }
    const wash = ctx.createLinearGradient(0, 0, 0, height);
    wash.addColorStop(0, 'rgba(224,216,198,0.28)');
    wash.addColorStop(0.62, 'rgba(69,61,52,0.08)');
    wash.addColorStop(1, 'rgba(26,29,27,0.34)');
    ctx.fillStyle = wash;
    ctx.fillRect(0, 0, width, height);
    for (let i = 0; i < 120; i++) {
      ctx.fillStyle = random() > 0.48 ? 'rgba(20,18,16,0.08)' : 'rgba(255,246,224,0.07)';
      ctx.fillRect(random() * width, random() * height, 4 + random() * 34, 1 + random() * 7);
    }
  }, { repeatX, repeatY });
}

function floorTexture() {
  return canvasTexture(768, 768, (ctx, width, height) => {
    const random = seededRandom(42051);
    ctx.fillStyle = '#696966';
    ctx.fillRect(0, 0, width, height);
    const tile = 96;
    for (let y = 0; y < height; y += tile) {
      for (let x = 0; x < width; x += tile) {
        const tone = 94 + Math.floor(random() * 18);
        ctx.fillStyle = `rgb(${tone + 5},${tone + 4},${tone})`;
        ctx.fillRect(x + 3, y + 3, tile - 6, tile - 6);
        ctx.strokeStyle = 'rgba(226,220,205,0.06)';
        ctx.strokeRect(x + 8, y + 8, tile - 16, tile - 16);
      }
    }
    for (let i = 0; i < 1300; i++) {
      const alpha = 0.02 + random() * 0.055;
      ctx.fillStyle = random() > 0.5 ? `rgba(255,252,235,${alpha})` : `rgba(20,18,16,${alpha})`;
      const size = 1 + random() * 4;
      ctx.fillRect(random() * width, random() * height, size, size);
    }
    for (let i = 0; i < 28; i++) {
      ctx.strokeStyle = `rgba(26,22,19,${0.035 + random() * 0.08})`;
      ctx.lineWidth = 1 + random() * 3;
      ctx.beginPath();
      ctx.moveTo(random() * width, random() * height);
      ctx.quadraticCurveTo(random() * width, random() * height, random() * width, random() * height);
      ctx.stroke();
    }
  }, { repeatX: 4, repeatY: 6 });
}

function plasterTexture(repeatX, repeatY) {
  return canvasTexture(384, 384, (ctx, width, height) => {
    const random = seededRandom(1992420);
    ctx.fillStyle = '#b7b1a4';
    ctx.fillRect(0, 0, width, height);
    for (let i = 0; i < 1800; i++) {
      ctx.fillStyle = random() > 0.48 ? 'rgba(255,250,232,0.035)' : 'rgba(31,29,27,0.045)';
      const size = 1 + random() * 4;
      ctx.fillRect(random() * width, random() * height, size, size);
    }
    for (let i = 0; i < 16; i++) {
      ctx.fillStyle = `rgba(50,43,37,${0.025 + random() * 0.04})`;
      ctx.fillRect(random() * width, random() * height, 30 + random() * 120, 2 + random() * 10);
    }
  }, { repeatX, repeatY });
}

function pegboardTexture() {
  return canvasTexture(256, 256, (ctx, width, height) => {
    ctx.fillStyle = '#343635';
    ctx.fillRect(0, 0, width, height);
    ctx.fillStyle = '#171918';
    for (let y = 12; y < height; y += 18) {
      for (let x = 12; x < width; x += 18) {
        ctx.beginPath();
        ctx.arc(x, y, 2.6, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.fillStyle = 'rgba(255,255,255,0.025)';
    ctx.fillRect(0, 0, width, 6);
  }, { repeatX: 3, repeatY: 2 });
}

function curtainTexture() {
  return canvasTexture(256, 256, (ctx, width, height) => {
    const gradient = ctx.createLinearGradient(0, 0, width, 0);
    for (let i = 0; i <= 16; i++) {
      const value = i % 2 ? '#293b31' : '#18271f';
      gradient.addColorStop(i / 16, value);
    }
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
    ctx.fillStyle = 'rgba(255,255,255,0.035)';
    for (let y = 12; y < height; y += 24) ctx.fillRect(0, y, width, 1);
  });
}

function signTexture(title, subtitle, {
  background = '#e8dfcc',
  foreground = '#171918',
  accent = '#da612d',
} = {}) {
  return canvasTexture(768, 256, (ctx, width, height) => {
    ctx.fillStyle = background;
    ctx.fillRect(0, 0, width, height);
    ctx.fillStyle = accent;
    ctx.fillRect(0, 0, 22, height);
    ctx.fillRect(0, height - 18, width, 18);
    ctx.fillStyle = foreground;
    ctx.font = '900 76px Arial, sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(title, 54, 98, width - 100);
    ctx.font = '700 25px Courier New, monospace';
    ctx.fillText(subtitle, 58, 174, width - 120);
    ctx.fillStyle = accent;
    ctx.fillRect(width - 112, 38, 64, 64);
    ctx.fillStyle = foreground;
    ctx.font = '900 28px Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('420', width - 80, 71);
  });
}

function registerTexture() {
  return canvasTexture(384, 240, (ctx, width, height) => {
    ctx.fillStyle = '#111616';
    ctx.fillRect(0, 0, width, height);
    ctx.strokeStyle = '#3d4945';
    ctx.lineWidth = 8;
    ctx.strokeRect(5, 5, width - 10, height - 10);
    ctx.fillStyle = '#8be36e';
    ctx.font = '700 28px Courier New, monospace';
    ctx.fillText('FOURTWENTY POS', 28, 48);
    ctx.fillStyle = '#d8ded7';
    ctx.font = '700 19px Courier New, monospace';
    ctx.fillText('HOOP SEASON', 28, 90);
    ctx.fillText('TOTAL     $ 04.20', 28, 128);
    ctx.fillStyle = '#d46635';
    ctx.fillRect(28, 164, 132, 38);
    ctx.fillStyle = '#101313';
    ctx.font = '900 20px Arial, sans-serif';
    ctx.fillText('PAGAR', 59, 190);
  });
}

function rodBetween(start, end, radius, material, radialSegments = 10) {
  const direction = new THREE.Vector3().subVectors(end, start);
  const rod = new THREE.Mesh(
    new THREE.CylinderGeometry(radius, radius, direction.length(), radialSegments),
    material,
  );
  rod.position.copy(start).add(end).multiplyScalar(0.5);
  rod.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize());
  return rod;
}

function addNamed(group, object, name) {
  object.name = name;
  group.add(object);
  return object;
}

function materials() {
  return {
    darkSteel: new THREE.MeshStandardMaterial({ color: 0x252827, roughness: 0.46, metalness: 0.72 }),
    wornSteel: new THREE.MeshStandardMaterial({ color: 0x636561, roughness: 0.62, metalness: 0.55 }),
    black: new THREE.MeshStandardMaterial({ color: 0x151716, roughness: 0.82, metalness: 0.08 }),
    green: new THREE.MeshStandardMaterial({ color: 0x244b34, roughness: 0.84 }),
    orange: new THREE.MeshStandardMaterial({ color: 0xd45e2b, roughness: 0.7 }),
    cream: new THREE.MeshStandardMaterial({ color: 0xe2dacb, roughness: 0.9 }),
    timber: new THREE.MeshStandardMaterial({ color: 0x765338, roughness: 0.74, metalness: 0.02 }),
    timberDark: new THREE.MeshStandardMaterial({ color: 0x49392d, roughness: 0.8 }),
    skin: new THREE.MeshStandardMaterial({ color: 0xb9825c, roughness: 0.72 }),
    rubber: new THREE.MeshStandardMaterial({ color: 0x202322, roughness: 0.96 }),
  };
}

function addFluorescent(group, x, z, length, mats) {
  group.add(box(length + 0.18, 0.09, 0.38, x, ROOM_H - 0.18, z, mats.darkSteel));
  group.add(box(
    length,
    0.025,
    0.26,
    x,
    ROOM_H - 0.235,
    z,
    new THREE.MeshStandardMaterial({
      color: 0xe7eeea,
      emissive: 0xdde8e3,
      emissiveIntensity: 1.45,
      roughness: 0.34,
    }),
  ));
}

export function buildBincoShopShell(scene) {
  const group = new THREE.Group();
  group.name = 'PRUEBA BINCO · arquitectura completa';
  const mats = materials();
  const floorMaterial = new THREE.MeshPhysicalMaterial({
    map: floorTexture(),
    color: 0xb9b6ad,
    roughness: 0.54,
    metalness: 0.04,
    clearcoat: 0.12,
    clearcoatRoughness: 0.68,
  });
  const brickMaterial = new THREE.MeshStandardMaterial({
    map: brickTexture(7, 3),
    color: 0xd0c8ba,
    roughness: 0.94,
  });
  const plasterMaterial = new THREE.MeshStandardMaterial({
    map: plasterTexture(5, 3),
    color: 0xc7c2b8,
    roughness: 0.92,
  });
  const ceilingMaterial = new THREE.MeshStandardMaterial({
    map: plasterTexture(5, 7),
    color: 0x424744,
    roughness: 0.95,
  });

  group.add(box(ROOM_W, 0.3, ROOM_D, 0, -0.15, ROOM_CENTER_Z, floorMaterial));
  group.add(box(ROOM_W, 0.18, ROOM_D, 0, ROOM_H + 0.09, ROOM_CENTER_Z, ceilingMaterial));
  group.add(box(ROOM_W + WALL_T * 2, ROOM_H, WALL_T, 0, ROOM_H / 2, ROOM_MAX_Z + WALL_T / 2, brickMaterial));
  group.add(box(WALL_T, ROOM_H, ROOM_D, -ROOM_HALF_W - WALL_T / 2, ROOM_H / 2, ROOM_CENTER_Z, brickMaterial));
  group.add(box(WALL_T, ROOM_H, ROOM_D, ROOM_HALF_W + WALL_T / 2, ROOM_H / 2, ROOM_CENTER_Z, brickMaterial));

  // Paredes con profundidad: paños pintados sobre ladrillo, como un local reacondicionado.
  group.add(box(0.08, 1.75, 5.3, -ROOM_HALF_W + 0.01, 1.85, 1.1, plasterMaterial));
  group.add(box(0.08, 1.75, 4.8, ROOM_HALF_W - 0.01, 1.85, 4.6, plasterMaterial));
  group.add(box(4.15, 1.72, 0.08, -3.82, 1.86, ROOM_MAX_Z - 0.02, plasterMaterial));
  group.add(box(4.15, 1.72, 0.08, 3.82, 1.86, ROOM_MAX_Z - 0.02, plasterMaterial));
  group.add(box(0.1, 0.92, ROOM_D - 0.25, -ROOM_HALF_W + 0.03, 0.46, ROOM_CENTER_Z, mats.green));
  group.add(box(0.1, 0.92, ROOM_D - 0.25, ROOM_HALF_W - 0.03, 0.46, ROOM_CENTER_Z, mats.green));

  // Frente vidriado con un fondo fotográfico original de calle.
  const streetTexture = loadTexture('assets/environments/binco-trial-street.jpg');
  const street = new THREE.Mesh(
    new THREE.PlaneGeometry(11.82, 3.25),
    new THREE.MeshBasicMaterial({ map: streetTexture, toneMapped: false }),
  );
  street.position.set(0, 1.63, ROOM_MIN_Z - 0.34);
  street.name = 'BINCO · calle fotográfica exterior';
  group.add(street);

  const glassMaterial = new THREE.MeshPhysicalMaterial({
    color: 0xcfe0df,
    transparent: true,
    opacity: 0.19,
    roughness: 0.08,
    metalness: 0.08,
    transmission: 0.16,
    depthWrite: false,
  });
  group.add(box(ROOM_W, 0.32, 0.25, 0, 0.16, ROOM_MIN_Z, brickMaterial));
  group.add(box(ROOM_W, 0.45, 0.25, 0, ROOM_H - 0.225, ROOM_MIN_Z, brickMaterial));
  for (const x of [-5.92, -3, 0, 3, 5.92]) {
    group.add(box(0.15, ROOM_H - 0.68, 0.18, x, 1.74, ROOM_MIN_Z + 0.01, mats.darkSteel));
  }
  for (const x of [-4.5, -1.5, 1.5, 4.5]) {
    group.add(box(2.82, ROOM_H - 0.82, 0.045, x, 1.73, ROOM_MIN_Z + 0.08, glassMaterial));
  }
  group.add(box(2.3, 0.04, 0.58, 0, 0.03, ROOM_MIN_Z + 0.36, mats.rubber));

  // Vigas, conductos, cables y rociadores visibles.
  for (const z of [-2.7, 0.3, 3.3, 6.3, 9.3, 12.3]) {
    group.add(box(ROOM_W - 0.25, 0.18, 0.2, 0, ROOM_H - 0.08, z, mats.darkSteel));
  }
  const duct = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 14.6, 14), mats.wornSteel);
  duct.rotation.x = Math.PI / 2;
  duct.position.set(4.9, ROOM_H - 0.35, 4.3);
  duct.name = 'BINCO · conducto de ventilación';
  group.add(duct);
  for (const z of [-2.2, 1.4, 5, 8.6, 11.5]) {
    const joint = new THREE.Mesh(new THREE.TorusGeometry(0.245, 0.026, 8, 16), mats.darkSteel);
    joint.rotation.x = Math.PI / 2;
    joint.position.set(4.9, ROOM_H - 0.35, z);
    group.add(joint);
  }
  const cable = rodBetween(
    new THREE.Vector3(-4.75, ROOM_H - 0.26, -3.2),
    new THREE.Vector3(-4.75, ROOM_H - 0.26, 12.4),
    0.035,
    mats.black,
    8,
  );
  group.add(cable);
  for (const z of [-1, 3.1, 7.1, 11.1]) {
    const sprinkler = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.22, 8), mats.wornSteel);
    sprinkler.position.set(-4.75, ROOM_H - 0.38, z);
    group.add(sprinkler);
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.04, 0.035, 12), mats.orange);
    cap.position.set(-4.75, ROOM_H - 0.5, z);
    group.add(cap);
  }

  for (const [x, z, length] of [
    [-2.6, -1.35, 2.7], [2.4, -1.35, 2.7],
    [-2.6, 3.7, 2.7], [2.4, 3.7, 2.7],
    [-2.6, 8.4, 2.7], [2.4, 8.4, 2.7],
  ]) addFluorescent(group, x, z, length, mats);

  group.traverse((object) => {
    if (!object.isMesh) return;
    object.castShadow = !object.material.transparent;
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

export function addBincoShopLights(scene, shadows) {
  scene.add(new THREE.HemisphereLight(0xd9e5e4, 0x302a25, 0.64));

  const daylight = new THREE.DirectionalLight(0xe6eef0, 1.22);
  daylight.position.set(-1.5, 7.4, -8.5);
  daylight.target.position.set(0, 0.8, 4.8);
  daylight.castShadow = shadows;
  if (shadows) {
    daylight.shadow.mapSize.set(1024, 1024);
    daylight.shadow.camera.left = -8;
    daylight.shadow.camera.right = 8;
    daylight.shadow.camera.top = 9;
    daylight.shadow.camera.bottom = -5;
    daylight.shadow.camera.near = 1;
    daylight.shadow.camera.far = 24;
    daylight.shadow.bias = -0.00035;
  }
  scene.add(daylight, daylight.target);

  for (const [x, z, color, intensity] of [
    [-2.7, -0.7, 0xf4f2df, 4.8],
    [2.5, 2.8, 0xffddba, 4.2],
    [-2.7, 7.1, 0xe9f4ef, 4.6],
    [2.5, 10.1, 0xffd2a4, 4.3],
  ]) {
    const spot = new THREE.SpotLight(color, intensity, 8.5, 0.86, 0.76, 1.35);
    spot.position.set(x, ROOM_H - 0.22, z);
    spot.target.position.set(x * 0.82, 0, z + 0.2);
    scene.add(spot, spot.target);
  }

  const counterGlow = new THREE.PointLight(0xf0aa69, 2.7, 4.8, 2);
  counterGlow.position.set(3.8, 1.8, 10.4);
  scene.add(counterGlow);
}

let teeGeometryCache = null;
function teeGeometry() {
  if (teeGeometryCache) return teeGeometryCache;
  const shape = new THREE.Shape();
  shape.moveTo(-0.19, 0.38);
  shape.lineTo(-0.39, 0.27);
  shape.lineTo(-0.33, 0.04);
  shape.lineTo(-0.23, 0.09);
  shape.lineTo(-0.2, -0.39);
  shape.lineTo(0.2, -0.39);
  shape.lineTo(0.23, 0.09);
  shape.lineTo(0.33, 0.04);
  shape.lineTo(0.39, 0.27);
  shape.lineTo(0.19, 0.38);
  shape.quadraticCurveTo(0.08, 0.28, 0, 0.3);
  shape.quadraticCurveTo(-0.08, 0.28, -0.19, 0.38);
  teeGeometryCache = new THREE.ExtrudeGeometry(shape, {
    depth: 0.045,
    bevelEnabled: true,
    bevelSegments: 2,
    bevelSize: 0.018,
    bevelThickness: 0.012,
  });
  teeGeometryCache.center();
  return teeGeometryCache;
}

function createHanger(mats, width = 0.48) {
  const group = new THREE.Group();
  const points = [
    -width / 2, 0, 0, 0, 0.18, 0,
    0, 0.18, 0, width / 2, 0, 0,
    width / 2, 0, 0, -width / 2, 0, 0,
    0, 0.18, 0, 0, 0.27, 0,
    0, 0.27, 0, 0.055, 0.32, 0,
    0.055, 0.32, 0, 0.105, 0.285, 0,
  ];
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(points, 3));
  group.add(new THREE.LineSegments(geometry, new THREE.LineBasicMaterial({ color: 0x9a9c98 })));
  return group;
}

function createGarment({ color, slot, type = 'jersey', mats }) {
  const group = new THREE.Group();
  group.name = `BINCO · prenda interactiva ${slot.index + 1}`;
  const cloth = new THREE.MeshStandardMaterial({ color, roughness: 0.96, side: THREE.DoubleSide });
  const body = new THREE.Mesh(teeGeometry(), cloth);
  body.scale.set(0.94, 1.05, 1);
  body.position.y = -0.28;
  group.add(body);

  const fallback = garmentTexture(color, type, { number: (slot.index + 1) * 7 });
  const face = new THREE.Mesh(
    new THREE.PlaneGeometry(0.68, 0.8),
    new THREE.MeshStandardMaterial({
      map: fallback,
      transparent: true,
      alphaTest: 0.35,
      roughness: 0.94,
      side: THREE.DoubleSide,
    }),
  );
  face.position.set(0, -0.28, 0.045);
  bindProductVisual(face, slot, fallback);
  group.add(face);

  const collar = new THREE.Mesh(new THREE.TorusGeometry(0.082, 0.012, 6, 16, Math.PI), mats.black);
  collar.position.set(0, 0.065, 0.06);
  collar.rotation.z = Math.PI;
  group.add(collar);
  const creaseGeometry = new THREE.BufferGeometry();
  creaseGeometry.setAttribute('position', new THREE.Float32BufferAttribute([
    -0.08, -0.08, 0.066, -0.08, -0.49, 0.066,
    0.11, -0.16, 0.066, 0.11, -0.5, 0.066,
  ], 3));
  group.add(new THREE.LineSegments(creaseGeometry, new THREE.LineBasicMaterial({ color })));

  const hanger = createHanger(mats);
  hanger.position.y = 0.11;
  group.add(hanger);
  return group;
}

function createWallBay(group, colliders, {
  side,
  centerZ,
  colors,
  slotOffset,
  mats,
}) {
  const bay = new THREE.Group();
  bay.name = `BINCO · exhibidor mural ${side} ${centerZ}`;
  bay.add(box(3.45, 2.3, 0.12, 0, 1.35, -0.04, new THREE.MeshStandardMaterial({ map: pegboardTexture(), roughness: 0.88 })));
  bay.add(box(3.62, 0.1, 0.22, 0, 0.2, 0.03, mats.timberDark));
  bay.add(box(3.62, 0.12, 0.22, 0, 2.53, 0.03, mats.timberDark));
  for (const x of [-1.76, 1.76]) bay.add(box(0.11, 2.46, 0.2, x, 1.35, 0.03, mats.darkSteel));
  bay.add(rodBetween(new THREE.Vector3(-1.53, 1.86, 0.2), new THREE.Vector3(1.53, 1.86, 0.2), 0.026, mats.wornSteel));
  bay.add(box(3.2, 0.08, 0.42, 0, 0.68, 0.2, mats.timber));

  for (let i = 0; i < 4; i++) {
    const garment = createGarment({
      color: colors[i % colors.length],
      slot: { piso: 3, index: (slotOffset + i) % 4 },
      type: i % 2 ? 'tee' : 'jersey',
      mats,
    });
    garment.position.set(-1.14 + i * 0.76, 1.72, 0.25);
    garment.scale.setScalar(0.78);
    bay.add(garment);
  }

  for (let i = 0; i < 7; i++) {
    const folded = box(0.34, 0.055, 0.3, -1.32 + i * 0.44, 0.77, 0.2,
      new THREE.MeshStandardMaterial({ color: colors[(i + 1) % colors.length], roughness: 0.98 }));
    bay.add(folded);
    bay.add(box(0.25, 0.012, 0.01, -1.32 + i * 0.44, 0.785, 0.355, mats.cream));
  }

  const wallX = side === 'left' ? -5.72 : 5.72;
  bay.position.set(wallX, 0, centerZ);
  bay.rotation.y = side === 'left' ? Math.PI / 2 : -Math.PI / 2;
  group.add(bay);
  colliders.push({
    minX: side === 'left' ? -5.95 : 5.08,
    maxX: side === 'left' ? -5.08 : 5.95,
    minY: 0,
    maxY: 2.65,
    minZ: centerZ - 1.9,
    maxZ: centerZ + 1.9,
  });
}

function createRollingRack(group, colliders, { x, z, colors, mats, rotation = 0, slotOffset = 0 }) {
  const rack = new THREE.Group();
  rack.name = 'BINCO · perchero profesional con ruedas';
  rack.add(rodBetween(new THREE.Vector3(-1.25, 1.72, 0), new THREE.Vector3(1.25, 1.72, 0), 0.035, mats.darkSteel));
  for (const side of [-1, 1]) {
    rack.add(rodBetween(new THREE.Vector3(side * 1.18, 0.14, 0), new THREE.Vector3(side * 1.18, 1.72, 0), 0.035, mats.darkSteel));
    rack.add(rodBetween(new THREE.Vector3(side * 1.35, 0.14, -0.42), new THREE.Vector3(side * 1.35, 0.14, 0.42), 0.03, mats.darkSteel));
    for (const dz of [-0.38, 0.38]) {
      const wheel = new THREE.Mesh(new THREE.TorusGeometry(0.07, 0.023, 6, 12), mats.rubber);
      wheel.rotation.y = Math.PI / 2;
      wheel.position.set(side * 1.35, 0.07, dz);
      rack.add(wheel);
    }
  }
  rack.add(rodBetween(new THREE.Vector3(-1.25, 0.18, -0.32), new THREE.Vector3(1.25, 0.18, -0.32), 0.025, mats.wornSteel));
  rack.add(rodBetween(new THREE.Vector3(-1.25, 0.18, 0.32), new THREE.Vector3(1.25, 0.18, 0.32), 0.025, mats.wornSteel));

  for (let i = 0; i < 7; i++) {
    const garment = createGarment({
      color: colors[i % colors.length],
      slot: { piso: 3, index: (slotOffset + i) % 4 },
      type: i % 3 === 0 ? 'jersey' : 'tee',
      mats,
    });
    garment.position.set(-1.02 + i * 0.34, 1.47, (i % 2 ? 0.035 : -0.035));
    garment.scale.setScalar(0.72);
    rack.add(garment);
  }
  rack.position.set(x, 0, z);
  rack.rotation.y = rotation;
  group.add(rack);
  const halfX = rotation ? 0.55 : 1.5;
  const halfZ = rotation ? 1.5 : 0.55;
  colliders.push({ minX: x - halfX, maxX: x + halfX, minY: 0, maxY: 1.9, minZ: z - halfZ, maxZ: z + halfZ });
}

function createFoldedStack(group, x, y, z, colors, mats) {
  for (let i = 0; i < 5; i++) {
    const cloth = box(0.48, 0.065, 0.38, x, y + i * 0.066, z,
      new THREE.MeshStandardMaterial({ color: colors[i % colors.length], roughness: 0.98 }));
    cloth.rotation.y = (i % 2 ? -1 : 1) * 0.035;
    group.add(cloth);
    group.add(box(0.3, 0.012, 0.008, x, y + 0.035 + i * 0.066, z + 0.195, mats.cream));
  }
}

function createDisplayTable(group, colliders, { x, z, colors, mats }) {
  const table = new THREE.Group();
  table.name = 'BINCO · mesa industrial de prendas';
  table.add(box(2.35, 0.13, 1.15, 0, 0.92, 0, mats.timber));
  table.add(box(2.2, 0.09, 1.0, 0, 0.84, 0, mats.timberDark));
  for (const px of [-0.94, 0.94]) {
    for (const pz of [-0.39, 0.39]) table.add(box(0.11, 0.84, 0.11, px, 0.42, pz, mats.darkSteel));
  }
  table.add(box(2.05, 0.07, 0.08, 0, 0.24, -0.4, mats.darkSteel));
  table.add(box(2.05, 0.07, 0.08, 0, 0.24, 0.4, mats.darkSteel));
  createFoldedStack(table, -0.65, 1.01, -0.18, colors, mats);
  createFoldedStack(table, 0.05, 1.01, 0.17, colors.slice().reverse(), mats);
  createFoldedStack(table, 0.7, 1.01, -0.12, colors, mats);
  table.position.set(x, 0, z);
  group.add(table);
  colliders.push({ minX: x - 1.2, maxX: x + 1.2, minY: 0, maxY: 1.4, minZ: z - 0.62, maxZ: z + 0.62 });
}

function createShoe(group, x, y, z, color, mats, rotationY = 0) {
  const shoe = new THREE.Group();
  const upper = new THREE.Mesh(new THREE.SphereGeometry(0.18, 12, 8), new THREE.MeshStandardMaterial({ color, roughness: 0.86 }));
  upper.scale.set(1.55, 0.62, 0.82);
  upper.position.set(-0.02, 0.06, 0);
  shoe.add(upper);
  const toe = new THREE.Mesh(new THREE.SphereGeometry(0.13, 12, 8), new THREE.MeshStandardMaterial({ color, roughness: 0.88 }));
  toe.scale.set(1.45, 0.48, 0.82);
  toe.position.set(0.2, 0.015, 0);
  shoe.add(toe);
  shoe.add(box(0.58, 0.055, 0.25, 0.03, -0.035, 0, mats.cream));
  const laceGeometry = new THREE.BufferGeometry();
  const laces = [];
  for (let i = 0; i < 4; i++) laces.push(-0.11 + i * 0.07, 0.12, -0.1, -0.11 + i * 0.07, 0.12, 0.1);
  laceGeometry.setAttribute('position', new THREE.Float32BufferAttribute(laces, 3));
  shoe.add(new THREE.LineSegments(laceGeometry, new THREE.LineBasicMaterial({ color: 0xe7e0d1 })));
  shoe.position.set(x, y, z);
  shoe.rotation.y = rotationY;
  group.add(shoe);
}

function createShoeWall(group, colliders, { side, centerZ, colors, mats }) {
  const display = new THREE.Group();
  display.name = 'BINCO · pared de zapatillas';
  display.add(box(3.4, 2.45, 0.12, 0, 1.35, -0.05, new THREE.MeshStandardMaterial({ map: pegboardTexture(), roughness: 0.9 })));
  display.add(box(3.55, 0.12, 0.2, 0, 0.18, 0, mats.darkSteel));
  display.add(box(3.55, 0.12, 0.2, 0, 2.58, 0, mats.darkSteel));
  for (const sy of [0.62, 1.15, 1.68, 2.2]) {
    display.add(box(3.15, 0.06, 0.42, 0, sy, 0.2, mats.timberDark));
  }
  let index = 0;
  for (const sy of [0.69, 1.22, 1.75, 2.27]) {
    for (const sx of [-1.05, -0.34, 0.37, 1.08]) {
      createShoe(display, sx, sy, 0.27, colors[index % colors.length], mats, index % 2 ? 0.08 : -0.08);
      index++;
    }
  }
  const wallX = side === 'left' ? -5.72 : 5.72;
  display.position.set(wallX, 0, centerZ);
  display.rotation.y = side === 'left' ? Math.PI / 2 : -Math.PI / 2;
  group.add(display);
  colliders.push({
    minX: side === 'left' ? -5.95 : 5.0,
    maxX: side === 'left' ? -5.0 : 5.95,
    minY: 0,
    maxY: 2.7,
    minZ: centerZ - 1.85,
    maxZ: centerZ + 1.85,
  });
}

function createMannequin(group, colliders, { x, z, rotation, shirtColor, pantsColor, mats, cap = false }) {
  const mannequin = new THREE.Group();
  mannequin.name = 'BINCO · maniquí anatómico';
  mannequin.add(new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.34, 0.08, 20), mats.darkSteel));
  mannequin.children[0].position.y = 0.04;

  for (const side of [-1, 1]) {
    const thigh = new THREE.Mesh(new THREE.CylinderGeometry(0.105, 0.12, 0.48, 12), new THREE.MeshStandardMaterial({ color: pantsColor, roughness: 0.94 }));
    thigh.position.set(side * 0.12, 0.67, 0);
    thigh.rotation.z = side * 0.035;
    mannequin.add(thigh);
    const knee = new THREE.Mesh(new THREE.SphereGeometry(0.105, 12, 8), new THREE.MeshStandardMaterial({ color: pantsColor, roughness: 0.94 }));
    knee.scale.y = 0.8;
    knee.position.set(side * 0.13, 0.43, 0.005);
    mannequin.add(knee);
    const calf = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.095, 0.37, 12), mats.skin);
    calf.position.set(side * 0.14, 0.23, 0.01);
    mannequin.add(calf);
    const shoe = box(0.2, 0.1, 0.38, side * 0.14, 0.1, 0.1, mats.rubber);
    shoe.rotation.x = -0.05;
    mannequin.add(shoe);
  }

  const hips = new THREE.Mesh(new THREE.SphereGeometry(0.25, 16, 10), new THREE.MeshStandardMaterial({ color: pantsColor, roughness: 0.94 }));
  hips.scale.set(1, 0.62, 0.72);
  hips.position.y = 0.91;
  mannequin.add(hips);
  const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.27, 0.2, 0.56, 16), new THREE.MeshStandardMaterial({ color: shirtColor, roughness: 0.92 }));
  torso.position.y = 1.29;
  mannequin.add(torso);
  const chest = new THREE.Mesh(new THREE.SphereGeometry(0.25, 16, 10), new THREE.MeshStandardMaterial({ color: shirtColor, roughness: 0.92 }));
  chest.scale.set(1.12, 0.62, 0.78);
  chest.position.y = 1.47;
  mannequin.add(chest);

  for (const side of [-1, 1]) {
    const sleeve = new THREE.Mesh(new THREE.SphereGeometry(0.12, 12, 8), new THREE.MeshStandardMaterial({ color: shirtColor, roughness: 0.92 }));
    sleeve.scale.set(1.15, 1, 0.95);
    sleeve.position.set(side * 0.3, 1.49, 0);
    mannequin.add(sleeve);
    const shoulder = new THREE.Vector3(side * 0.34, 1.45, 0);
    const elbow = new THREE.Vector3(side * 0.4, 1.13, side * -0.025);
    const hand = new THREE.Vector3(side * 0.34, 0.88, 0.08);
    mannequin.add(rodBetween(shoulder, elbow, 0.065, mats.skin, 10));
    mannequin.add(rodBetween(elbow, hand, 0.057, mats.skin, 10));
    const palm = new THREE.Mesh(new THREE.SphereGeometry(0.067, 10, 8), mats.skin);
    palm.scale.y = 1.25;
    palm.position.copy(hand);
    mannequin.add(palm);
  }

  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.08, 0.13, 12), mats.skin);
  neck.position.y = 1.69;
  mannequin.add(neck);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.14, 16, 12), mats.skin);
  head.scale.set(0.86, 1.14, 0.92);
  head.position.y = 1.86;
  mannequin.add(head);
  const nose = new THREE.Mesh(new THREE.SphereGeometry(0.035, 8, 6), mats.skin);
  nose.scale.set(0.75, 0.8, 1.3);
  nose.position.set(0, 1.86, 0.135);
  mannequin.add(nose);
  if (cap) {
    const crown = new THREE.Mesh(new THREE.SphereGeometry(0.145, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), mats.green);
    crown.position.y = 1.98;
    mannequin.add(crown);
    mannequin.add(box(0.2, 0.025, 0.14, 0, 1.98, 0.13, mats.green));
  }

  mannequin.position.set(x, 0, z);
  mannequin.rotation.y = rotation;
  group.add(mannequin);
  colliders.push({ minX: x - 0.38, maxX: x + 0.38, minY: 0, maxY: 2.08, minZ: z - 0.38, maxZ: z + 0.38 });
}

function addPhotoPoster(group, { path, x, y, z, rotationY, width, height, mats }) {
  const poster = new THREE.Group();
  poster.name = 'BINCO · campaña fotográfica';
  poster.add(box(width + 0.14, height + 0.14, 0.07, 0, 0, -0.04, mats.darkSteel));
  const image = new THREE.Mesh(new THREE.PlaneGeometry(width, height), new THREE.MeshBasicMaterial({ map: loadTexture(path) }));
  image.position.z = 0.005;
  poster.add(image);
  poster.position.set(x, y, z);
  poster.rotation.y = rotationY;
  group.add(poster);
}

function createFittingRooms(group, colliders, mats) {
  const fitting = new THREE.Group();
  fitting.name = 'BINCO · probadores';
  const curtainMat = new THREE.MeshStandardMaterial({ map: curtainTexture(), roughness: 0.96, side: THREE.DoubleSide });
  fitting.add(box(3.1, 0.12, 1.85, -4.32, 2.48, 11.55, mats.darkSteel));
  for (const x of [-5.82, -4.78, -3.74, -2.78]) {
    fitting.add(box(0.09, 2.45, 1.85, x, 1.23, 11.55, mats.darkSteel));
  }
  for (const x of [-5.3, -4.25, -3.25]) {
    const curtain = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 2.15, 14, 8), curtainMat);
    curtain.position.set(x, 1.28, 10.64);
    fitting.add(curtain);
    fitting.add(rodBetween(new THREE.Vector3(x - 0.45, 2.38, 10.62), new THREE.Vector3(x + 0.45, 2.38, 10.62), 0.024, mats.wornSteel));
  }
  group.add(fitting);
  colliders.push({ minX: -5.95, maxX: -2.68, minY: 0, maxY: 2.55, minZ: 10.55, maxZ: 12.55 });
}

function createCounter(group, colliders, mats) {
  const counter = new THREE.Group();
  counter.name = 'BINCO · caja detallada';
  counter.add(box(3.25, 0.92, 0.88, 3.82, 0.46, 10.65, mats.timberDark));
  counter.add(box(3.38, 0.11, 1.0, 3.82, 0.98, 10.65, mats.timber));
  for (let i = 0; i < 13; i++) counter.add(box(0.14, 0.72, 0.04, 2.35 + i * 0.245, 0.48, 10.2, i % 2 ? mats.timber : mats.timberDark));
  const glass = new THREE.MeshPhysicalMaterial({ color: 0xcad8d5, transparent: true, opacity: 0.32, roughness: 0.08, transmission: 0.18 });
  counter.add(box(1.1, 0.45, 0.04, 4.65, 0.66, 10.19, glass));

  const screen = new THREE.Group();
  screen.add(box(0.62, 0.42, 0.08, 0, 0, 0, mats.black));
  const screenFace = new THREE.Mesh(new THREE.PlaneGeometry(0.55, 0.34), new THREE.MeshBasicMaterial({ map: registerTexture() }));
  screenFace.position.z = 0.045;
  screen.add(screenFace);
  screen.position.set(3.2, 1.32, 10.55);
  screen.rotation.x = -0.12;
  counter.add(screen);
  counter.add(box(0.28, 0.09, 0.18, 4.0, 1.12, 10.45, mats.black));
  counter.add(box(0.09, 0.22, 0.12, 4.0, 1.24, 10.45, mats.black));
  createFoldedStack(counter, 4.72, 1.08, 10.63, [0x1c1c1c, 0xd96b2f, 0xf5f2ea], mats);
  group.add(counter);
  colliders.push({ minX: 2.15, maxX: 5.55, minY: 0, maxY: 1.48, minZ: 10.1, maxZ: 11.2 });
}

function createBench(group, colliders, mats) {
  const bench = new THREE.Group();
  bench.name = 'BINCO · banco de prueba';
  bench.add(box(2.15, 0.17, 0.72, -3.82, 0.54, 8.15, mats.timber));
  for (const x of [-4.65, -3.0]) bench.add(box(0.16, 0.5, 0.58, x, 0.25, 8.15, mats.darkSteel));
  bench.add(box(2.22, 0.05, 0.79, -3.82, 0.66, 8.15, mats.green));
  group.add(bench);
  colliders.push({ minX: -4.95, maxX: -2.7, minY: 0, maxY: 0.75, minZ: 7.75, maxZ: 8.55 });
}

function createMirror(group, colliders, mats) {
  const mirror = new THREE.Group();
  mirror.name = 'BINCO · espejo de cuerpo entero';
  mirror.add(box(1.35, 2.5, 0.09, 0, 1.3, -0.05, mats.darkSteel));
  const glass = new THREE.MeshPhysicalMaterial({ color: 0xd9e5e5, roughness: 0.05, metalness: 0.9, clearcoat: 1 });
  mirror.add(box(1.18, 2.32, 0.035, 0, 1.3, 0.01, glass));
  mirror.position.set(5.78, 0, 8.45);
  mirror.rotation.y = -Math.PI / 2;
  group.add(mirror);
  colliders.push({ minX: 5.35, maxX: 5.95, minY: 0, maxY: 2.65, minZ: 7.75, maxZ: 9.15 });
}

function addHangingSign(group, texture, x, z, width, height, mats) {
  const sign = new THREE.Group();
  sign.add(box(width + 0.12, height + 0.12, 0.075, 0, 0, 0, mats.darkSteel));
  const front = new THREE.Mesh(new THREE.PlaneGeometry(width, height), new THREE.MeshBasicMaterial({ map: texture }));
  front.position.z = 0.045;
  sign.add(front);
  const back = front.clone();
  back.rotation.y = Math.PI;
  back.position.z = -0.045;
  sign.add(back);
  sign.position.set(x, 2.55, z);
  group.add(sign);
  group.add(rodBetween(new THREE.Vector3(x - width * 0.32, 2.94, z), new THREE.Vector3(x - width * 0.32, ROOM_H - 0.08, z), 0.015, mats.darkSteel));
  group.add(rodBetween(new THREE.Vector3(x + width * 0.32, 2.94, z), new THREE.Vector3(x + width * 0.32, ROOM_H - 0.08, z), 0.015, mats.darkSteel));
}

export function buildBincoShopSet(scene, collection) {
  const group = new THREE.Group();
  group.name = 'PRUEBA BINCO · tienda FOURTWENTY completa';
  const colliders = [];
  const mats = materials();
  const colors = collection?.colors ?? [0xd96b2f, 0x1c1c1c, 0xf5f2ea, 0x4b2e83, 0xd4af37];

  // Arcos antihurto de entrada.
  for (const x of [-2.15, 2.15]) {
    group.add(box(0.14, 1.65, 0.35, x, 0.83, -3.55, mats.wornSteel));
    group.add(box(0.32, 0.09, 0.52, x, 0.045, -3.55, mats.darkSteel));
    group.add(box(0.32, 0.09, 0.52, x, 1.68, -3.55, mats.darkSteel));
  }

  createWallBay(group, colliders, { side: 'left', centerZ: 0.1, colors, slotOffset: 0, mats });
  createWallBay(group, colliders, { side: 'left', centerZ: 4.55, colors: colors.slice().reverse(), slotOffset: 2, mats });
  createWallBay(group, colliders, { side: 'right', centerZ: 0.5, colors, slotOffset: 1, mats });
  createShoeWall(group, colliders, { side: 'right', centerZ: 5.45, colors, mats });

  createRollingRack(group, colliders, { x: -2.55, z: 3.4, colors, mats, slotOffset: 0 });
  createRollingRack(group, colliders, { x: 2.55, z: 6.8, colors: colors.slice().reverse(), mats, rotation: Math.PI / 2, slotOffset: 2 });
  createDisplayTable(group, colliders, { x: 2.35, z: 2.6, colors, mats });

  createMannequin(group, colliders, { x: -4.4, z: -2.9, rotation: 0.08, shirtColor: colors[0], pantsColor: 0x232527, mats, cap: true });
  createMannequin(group, colliders, { x: 4.4, z: -2.9, rotation: -0.12, shirtColor: colors[3], pantsColor: 0x1d1e20, mats });
  createMannequin(group, colliders, { x: -1.35, z: 8.55, rotation: Math.PI, shirtColor: colors[2], pantsColor: colors[1], mats, cap: true });

  createCounter(group, colliders, mats);
  createFittingRooms(group, colliders, mats);
  createBench(group, colliders, mats);
  createMirror(group, colliders, mats);

  addPhotoPoster(group, {
    path: 'assets/ui/hoop-season-loading.png',
    x: -5.82, y: 2.0, z: 8.0, rotationY: Math.PI / 2,
    width: 3.7, height: 1.85, mats,
  });
  addPhotoPoster(group, {
    path: 'assets/magazine/twenty-time/spread-03.jpg',
    x: 5.82, y: 2.0, z: 10.2, rotationY: -Math.PI / 2,
    width: 2.7, height: 1.6, mats,
  });

  addHangingSign(
    group,
    signTexture('FOURTWENTY', 'BUDGET STORE / BURELA BASE', { background: '#dfd7c8', accent: '#d55f2c' }),
    0,
    -1.25,
    3.5,
    1.12,
    mats,
  );
  addHangingSign(
    group,
    signTexture('HOOP SEASON', 'JERSEYS / TEES / STREET', { background: '#244b34', foreground: '#eee5d2', accent: '#d8aa42' }),
    0.1,
    9.1,
    3.2,
    1.0,
    mats,
  );

  // Pequeños detalles que rompen la geometría limpia de una maqueta.
  group.add(box(0.34, 0.88, 0.18, -5.75, 0.55, 9.7, mats.orange));
  const extinguisher = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.48, 12), mats.orange);
  extinguisher.position.set(-5.54, 0.45, 9.7);
  group.add(extinguisher);
  group.add(rodBetween(new THREE.Vector3(-5.54, 0.7, 9.7), new THREE.Vector3(-5.4, 0.84, 9.7), 0.018, mats.black, 6));
  for (let i = 0; i < 4; i++) {
    const carton = box(0.52 + i * 0.04, 0.28, 0.42, -5.35 + (i % 2) * 0.38, 0.14 + Math.floor(i / 2) * 0.29, 12.82 - (i % 2) * 0.18,
      new THREE.MeshStandardMaterial({ color: 0x8a704f, roughness: 0.97 }));
    carton.rotation.y = (i - 1.5) * 0.05;
    group.add(carton);
  }

  group.traverse((object) => {
    if (!object.isMesh) return;
    object.castShadow = !object.material.transparent;
    object.receiveShadow = true;
  });
  scene.add(group);
  return colliders;
}
