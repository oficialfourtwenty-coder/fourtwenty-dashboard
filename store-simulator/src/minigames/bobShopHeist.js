import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { clone as cloneSkeleton } from 'three/addons/utils/SkeletonUtils.js';
import displayUrl from '../assets/origen/origen-display-3-v1.glb?url';
import islandUrl from '../assets/origen/origen-central-island-v1.glb?url';
import railUrl from '../assets/origen/origen-barral-pared-3-hoodies.glb?url';
import sofaUrl from '../assets/origen/origen-sofa-v1.glb?url';
import glassTableUrl from '../assets/origen/origen-glass-table-v1.glb?url';
import vinylUrl from '../assets/origen/origen-vinyl-dr-dre-v1.glb?url';
import vinylCabinetUrl from '../assets/origen/origen-vinyl-cabinet-v1.glb?url';
import { ThirdPersonCamera } from '../core/camera.js';
import { BOTON, leerMando } from '../core/mando.js';
import { gltfLoader } from '../world/gltfLoaders.js';
import { normalizeGLTFHeight } from '../world/gltfUtils.js';

const GOAL = 1000000;
const STORE_W = 18;
const STORE_D = 28;
const UPPER_Y = 3.45;
const PLAYER_RADIUS = 0.36;
const WALK_SPEED = 3.25;
const CROUCH_SPEED = 1.75;
const RUN_SPEED = 5.35;
const TURN_SPEED = 2.7;
const ACCELERATION = 9;
const DECELERATION = 12;
const STEAL_SECONDS = 1.55;
const BOB_HEIGHT = 1.75;

const ASSETS = Object.freeze({
  bob: '/assets/bob/bob-meshy.glb',
  display: displayUrl,
  island: islandUrl,
  rail: railUrl,
  sofa: sofaUrl,
  glassTable: glassTableUrl,
  vinyl: vinylUrl,
  vinylCabinet: vinylCabinetUrl,
  tee: '/assets/garments/remera-oversize.glb',
  hoodie: '/assets/garments/hoodie.glb',
  jeanFolded: '/assets/garments/jean-doblado.glb',
  jeanHanging: '/assets/garments/jean-colgado.glb',
});

const SOLID_WALLS = Object.freeze([
  { x: -STORE_W / 2, z: 0, w: 0.3, d: STORE_D, h: 4.2, levels: [0, 1] },
  { x: STORE_W / 2, z: 0, w: 0.3, d: STORE_D, h: 4.2, levels: [0, 1] },
  { x: 0, z: -STORE_D / 2, w: STORE_W, d: 0.3, h: 7.5, levels: [0, 1] },
  { x: 0, z: STORE_D / 2, w: STORE_W, d: 0.3, h: 3.1, levels: [0] },
]);

const COVER = Object.freeze([
  { x: 0, z: 3.2, w: 3.35, d: 1.9, h: 1.08, levels: [0] },
  { x: -3.35, z: -0.7, w: 2.8, d: 1.35, h: 0.92, levels: [0] },
  { x: 3.35, z: -0.7, w: 2.8, d: 1.35, h: 0.92, levels: [0] },
  { x: -3.3, z: 7.1, w: 2.8, d: 1.35, h: 0.92, levels: [0] },
  { x: 3.3, z: 7.1, w: 2.8, d: 1.35, h: 0.92, levels: [0] },
  { x: -7.15, z: -2.2, w: 1.2, d: 3.1, h: 2.25, levels: [0] },
  { x: 7.15, z: 4.2, w: 1.2, d: 3.1, h: 2.25, levels: [0] },
  { x: -7.15, z: 4.5, w: 1.2, d: 3.1, h: 2.25, levels: [0] },
  { x: -3.2, z: -10.5, w: 2.8, d: 1.25, h: 1.05, levels: [1] },
  { x: 2.2, z: -10.5, w: 2.8, d: 1.25, h: 1.05, levels: [1] },
  { x: -7.0, z: -10.4, w: 1.15, d: 3.2, h: 2.25, levels: [1] },
  { x: 7.0, z: -10.8, w: 1.15, d: 2.4, h: 2.25, levels: [1] },
]);

const ITEMS = Object.freeze([
  { id: 'hoodie-origen', asset: 'hoodie', x: -3.75, z: -0.7, y: 1.12, value: 118000, name: 'Hoodie ORIGEN', color: 0x202020 },
  { id: 'tee-white', asset: 'tee', x: -2.85, z: -0.72, y: 1.08, value: 57000, name: 'Remera oversize', color: 0xf1eee8 },
  { id: 'jean-folded', asset: 'jeanFolded', x: 3.05, z: -0.72, y: 1.02, value: 142000, name: 'Jean cargo', color: 0x53604b },
  { id: 'tee-maroon', asset: 'tee', x: 3.8, z: -0.72, y: 1.08, value: 86000, name: 'Remera bordó', color: 0x762735 },
  { id: 'cap-premium', asset: null, x: -3.75, z: 7.05, y: 1.05, value: 48000, name: 'Gorra FOURTWENTY', color: 0xe8e3d8 },
  { id: 'bag-black', asset: null, x: -2.85, z: 7.08, y: 1.02, value: 126000, name: 'Bolso técnico', color: 0x15171a },
  { id: 'hoodie-blue', asset: 'hoodie', x: 3.02, z: 7.05, y: 1.12, value: 154000, name: 'Hoodie edición azul', color: 0x172a5c },
  { id: 'jacket-black', asset: 'hoodie', x: 3.85, z: 7.05, y: 1.12, value: 165000, name: 'Campera premium', color: 0x111214 },
  { id: 'upper-hoodie', asset: 'hoodie', x: -3.65, z: -10.5, y: UPPER_Y + 1.1, level: 1, value: 185000, name: 'Hoodie limitado', color: 0x6f2432 },
  { id: 'upper-jean', asset: 'jeanFolded', x: 2.25, z: -10.5, y: UPPER_Y + 1.02, level: 1, value: 154000, name: 'Jean edición ORIGEN', color: 0x323a35 },
]);

const GUARDS = Object.freeze([
  {
    name: 'Seguridad entrada',
    path: [[-5.4, 9.5, 0], [-5.4, 1.0, 0], [-1.2, 1.0, 0], [-1.2, 9.5, 0]],
    speed: 1.55,
    range: 7.4,
    fov: Math.PI * 0.24,
  },
  {
    name: 'Seguridad salón',
    path: [[5.3, 8.8, 0], [5.3, -4.8, 0], [1.25, -4.8, 0], [1.25, 5.1, 0]],
    speed: 1.42,
    range: 7.8,
    fov: Math.PI * 0.25,
  },
  {
    name: 'Seguridad entrepiso',
    path: [[-5.8, -9.0, 1], [4.4, -9.0, 1], [4.4, -12.1, 1], [-5.8, -12.1, 1]],
    speed: 1.5,
    range: 7.0,
    fov: Math.PI * 0.24,
  },
]);

const SHOPPERS = Object.freeze([
  { path: [[-6.1, 10.3], [-6.1, 5.6], [-5.1, 5.6], [-5.1, 10.3]], speed: 0.82 },
  { path: [[0.2, -4.8], [-3.1, -4.8], [-3.1, -6.1], [0.2, -6.1]], speed: 0.68 },
]);

const KEYBOARD_CODES = new Set([
  'KeyW', 'KeyA', 'KeyS', 'KeyD',
  'ArrowUp', 'ArrowLeft', 'ArrowDown', 'ArrowRight',
  'KeyE', 'Space', 'ShiftLeft', 'ShiftRight', 'ControlLeft', 'ControlRight',
]);

const clamp = THREE.MathUtils.clamp;
const wrap = (angle) => Math.atan2(Math.sin(angle), Math.cos(angle));

function money(value) {
  return `$${Math.round(value).toLocaleString('es-AR')}`;
}

function easeInOut(value) {
  const t = clamp(value, 0, 1);
  return t * t * (3 - 2 * t);
}

function makeMaterial(color, roughness = 0.78, metalness = 0.02) {
  return new THREE.MeshStandardMaterial({ color, roughness, metalness });
}

function makeBox(size, material, position = null) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), material);
  if (position) mesh.position.fromArray(position);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function disposeObject(root) {
  const materials = new Set();
  const textures = new Set();
  root?.traverse?.((object) => {
    object.geometry?.dispose?.();
    const list = Array.isArray(object.material) ? object.material : [object.material];
    for (const material of list) {
      if (!material || materials.has(material)) continue;
      materials.add(material);
      for (const value of Object.values(material)) if (value?.isTexture) textures.add(value);
      material.dispose?.();
    }
  });
  for (const texture of textures) texture.dispose?.();
}

function rectHit(x, z, rect, pad = PLAYER_RADIUS) {
  return x > rect.x - rect.w / 2 - pad && x < rect.x + rect.w / 2 + pad
    && z > rect.z - rect.d / 2 - pad && z < rect.z + rect.d / 2 + pad;
}

function lineCross(a, b, c, d) {
  const det = (b.x - a.x) * (d.z - c.z) - (b.z - a.z) * (d.x - c.x);
  if (Math.abs(det) < 0.0001) return false;
  const t = ((c.x - a.x) * (d.z - c.z) - (c.z - a.z) * (d.x - c.x)) / det;
  const u = ((c.x - a.x) * (b.z - a.z) - (c.z - a.z) * (b.x - a.x)) / det;
  return t >= 0 && t <= 1 && u >= 0 && u <= 1;
}

function segmentIntersectsRect(a, b, rect) {
  if (rectHit(a.x, a.z, rect, 0) || rectHit(b.x, b.z, rect, 0)) return true;
  const x0 = rect.x - rect.w / 2;
  const x1 = rect.x + rect.w / 2;
  const z0 = rect.z - rect.d / 2;
  const z1 = rect.z + rect.d / 2;
  return [
    [{ x: x0, z: z0 }, { x: x1, z: z0 }],
    [{ x: x1, z: z0 }, { x: x1, z: z1 }],
    [{ x: x1, z: z1 }, { x: x0, z: z1 }],
    [{ x: x0, z: z1 }, { x: x0, z: z0 }],
  ].some(([c, d]) => lineCross(a, b, c, d));
}

function configureModel(model, { vertexColors = false, color = null } = {}) {
  model.traverse((object) => {
    if (!object.isMesh && !object.isSkinnedMesh) return;
    object.castShadow = true;
    object.receiveShadow = true;
    if (vertexColors) {
      object.material = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.88, metalness: 0 });
    } else if (color !== null) {
      object.material = object.material?.clone?.() ?? makeMaterial(color);
      object.material.color?.setHex(color);
      object.material.roughness = 0.82;
    }
  });
}

function makeTextTexture(text, {
  width = 512,
  height = 128,
  color = '#161616',
  background = 'rgba(255,255,255,0)',
  font = '700 58px Arial',
} = {}) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  context.fillStyle = background;
  context.fillRect(0, 0, width, height);
  context.fillStyle = color;
  context.font = font;
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.fillText(text, width / 2, height / 2);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function makeTextPlane(text, width, height, options = {}) {
  return new THREE.Mesh(
    new THREE.PlaneGeometry(width, height),
    new THREE.MeshBasicMaterial({
      map: makeTextTexture(text, options),
      transparent: true,
      depthWrite: false,
      toneMapped: false,
      side: THREE.DoubleSide,
    }),
  );
}

function makeStatusMarker() {
  const group = new THREE.Group();
  const question = new THREE.Sprite(new THREE.SpriteMaterial({
    map: makeTextTexture('?', { width: 128, height: 128, color: '#ffd865', font: '900 112px Arial' }),
    transparent: true,
    depthTest: false,
  }));
  const alert = new THREE.Sprite(new THREE.SpriteMaterial({
    map: makeTextTexture('!', { width: 128, height: 128, color: '#ff4038', font: '900 112px Arial' }),
    transparent: true,
    depthTest: false,
  }));
  question.scale.setScalar(0.48);
  alert.scale.setScalar(0.54);
  question.visible = false;
  alert.visible = false;
  group.add(question, alert);
  return { group, question, alert };
}

function makeBlobShadow(size = 1.12) {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const context = canvas.getContext('2d');
  const gradient = context.createRadialGradient(32, 32, 3, 32, 32, 30);
  gradient.addColorStop(0, 'rgba(0,0,0,0.42)');
  gradient.addColorStop(1, 'rgba(0,0,0,0)');
  context.fillStyle = gradient;
  context.fillRect(0, 0, 64, 64);
  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(size, size),
    new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(canvas), transparent: true, depthWrite: false }),
  );
  mesh.rotation.x = -Math.PI / 2;
  mesh.renderOrder = 1;
  return mesh;
}

function makeSecurityUniform() {
  const group = new THREE.Group();
  const navy = makeMaterial(0x17283f, 0.86, 0.02);
  const black = makeMaterial(0x111318, 0.65, 0.08);
  const yellow = makeMaterial(0xe6b84e, 0.55, 0.18);
  const vest = new THREE.Mesh(new THREE.CapsuleGeometry(0.31, 0.48, 7, 14), navy);
  vest.position.y = 1.05;
  vest.scale.set(1.12, 1, 0.78);
  group.add(vest);
  const belt = new THREE.Mesh(new THREE.CylinderGeometry(0.33, 0.33, 0.09, 16), black);
  belt.position.y = 0.77;
  group.add(belt);
  const shorts = new THREE.Mesh(new THREE.CapsuleGeometry(0.31, 0.18, 6, 12), navy);
  shorts.position.y = 0.65;
  shorts.scale.z = 0.78;
  group.add(shorts);
  const rearPanel = new THREE.Mesh(new RoundedBoxGeometry(0.52, 0.5, 0.2, 3, 0.04), navy);
  rearPanel.position.set(0, 0.72, -0.22);
  group.add(rearPanel);
  for (const side of [-1, 1]) {
    const trouser = new THREE.Mesh(new THREE.CapsuleGeometry(0.12, 0.4, 6, 10), navy);
    trouser.position.set(side * 0.16, 0.35, 0);
    group.add(trouser);
  }
  const badge = new THREE.Mesh(new THREE.CircleGeometry(0.07, 12), yellow);
  badge.position.set(-0.18, 1.18, 0.255);
  group.add(badge);
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.27, 0.28, 0.13, 18), navy);
  cap.position.y = 1.86;
  group.add(cap);
  group.add(makeBox([0.37, 0.035, 0.18], navy, [0, 1.82, 0.18]));
  const label = makeTextPlane('SEGURIDAD', 0.52, 0.14, { width: 512, height: 128, color: '#ffffff', font: '900 54px Arial' });
  label.position.set(0, 1.17, -0.285);
  label.rotation.y = Math.PI;
  group.add(label);
  const flashlight = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.055, 0.36, 10), black);
  flashlight.position.set(0.34, 1.04, 0.25);
  flashlight.rotation.x = Math.PI / 2;
  group.add(flashlight);
  return group;
}

function makeBackpack() {
  const group = new THREE.Group();
  const fabric = makeMaterial(0x101216, 0.92, 0);
  const zip = makeMaterial(0xc9a446, 0.42, 0.6);
  const bag = new THREE.Mesh(new RoundedBoxGeometry(0.46, 0.59, 0.21, 4, 0.055), fabric);
  bag.position.set(0, 1.03, -0.27);
  group.add(bag);
  group.add(makeBox([0.32, 0.022, 0.018], zip, [0, 1.18, -0.385]));
  const handle = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.018, 7, 14, Math.PI), fabric);
  handle.position.set(0, 1.36, -0.27);
  handle.rotation.z = Math.PI;
  group.add(handle);
  return group;
}

function makeFallbackBob({ guard = false } = {}) {
  const group = new THREE.Group();
  const fur = makeMaterial(0x8d4e25, 0.9, 0);
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.32, 0.72, 8, 16), makeMaterial(guard ? 0x17283f : 0x6f2534));
  body.position.y = 0.88;
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.31, 16, 12), fur);
  head.position.y = 1.55;
  group.add(body, head);
  return group;
}

function makeBobActor(gltf, { guard = false } = {}) {
  const rig = new THREE.Group();
  const pose = new THREE.Group();
  rig.add(pose);
  let visual;
  let mixer = null;
  const actions = {};
  if (gltf?.scene) {
    visual = cloneSkeleton(gltf.scene);
    // SkeletonUtils necesita las matrices del clon actualizadas antes de medirlo.
    // Sin esto Box3 ve el bind pose diminuto y el BOB renderizado queda gigante.
    visual.updateMatrixWorld(true);
    normalizeGLTFHeight(visual, BOB_HEIGHT);
    configureModel(visual, { vertexColors: true });
    pose.add(visual);
    const clips = gltf.animations ?? [];
    if (clips.length) {
      mixer = new THREE.AnimationMixer(visual);
      const find = (pattern) => clips.find((clip) => pattern.test(clip.name));
      const walkClip = find(/walk/i);
      const runClip = find(/run/i);
      const boxingClip = find(/box|punch/i);
      if (walkClip) actions.walk = mixer.clipAction(walkClip).play();
      if (runClip) actions.run = mixer.clipAction(runClip).play();
      if (boxingClip && !guard) {
        const reachClip = THREE.AnimationUtils.subclip(boxingClip, 'Guardar prenda', 0, 34, 30);
        actions.steal = mixer.clipAction(reachClip);
        actions.steal.loop = THREE.LoopOnce;
        actions.steal.clampWhenFinished = true;
        actions.steal.enabled = false;
      }
    }
  } else {
    visual = makeFallbackBob({ guard });
    pose.add(visual);
  }
  if (guard) pose.add(makeSecurityUniform());
  else pose.add(makeBackpack());
  rig.add(makeBlobShadow(guard ? 1.02 : 1.18));
  let stealPlaying = false;

  function beginSteal() {
    if (!actions.steal) return;
    actions.steal.enabled = true;
    actions.steal.reset();
    actions.steal.timeScale = 0.72;
    actions.steal.play();
    stealPlaying = true;
  }

  function endSteal() {
    if (!actions.steal) return;
    actions.steal.stop();
    actions.steal.enabled = false;
    actions.steal.weight = 0;
    stealPlaying = false;
  }

  function update(dt, { speed = 0, crouch = false, stealing = false } = {}) {
    const movingWeight = clamp(speed / WALK_SPEED, 0, 1);
    const runWeight = clamp((speed - WALK_SPEED) / Math.max(0.1, RUN_SPEED - WALK_SPEED), 0, 1);
    const stealWeight = stealing && stealPlaying ? 1 : 0;
    if (actions.walk) {
      // El modelo no trae idle. Pausar Walking en su primer cuadro deja una
      // pose natural; peso 0 devolvería al bind pose en T.
      actions.walk.weight = (1 - runWeight) * (1 - stealWeight);
      actions.walk.paused = speed < 0.04;
      actions.walk.timeScale = clamp(speed / WALK_SPEED, 0.55, 1.35);
    }
    if (actions.run) {
      actions.run.weight = runWeight * (1 - stealWeight);
      actions.run.paused = speed < 0.04;
      actions.run.timeScale = clamp(speed / RUN_SPEED, 0.7, 1.2);
    }
    if (actions.steal) actions.steal.weight = stealWeight;
    const targetScaleY = crouch ? 0.8 : 1;
    pose.scale.y += (targetScaleY - pose.scale.y) * Math.min(1, dt * 12);
    const targetLean = (crouch ? 0.14 : 0) + (stealing ? 0.2 : 0);
    pose.rotation.x += (targetLean - pose.rotation.x) * Math.min(1, dt * 12);
    pose.position.y = Math.sin(performance.now() * 0.0035) * 0.012 * movingWeight;
    mixer?.update(dt);
  }

  return { rig, beginSteal, endSteal, update };
}

function makeVisionCone(range, fov) {
  const vertices = [];
  const steps = 28;
  for (let index = 0; index < steps; index++) {
    const angleA = -fov + (index / steps) * fov * 2;
    const angleB = -fov + ((index + 1) / steps) * fov * 2;
    vertices.push(
      0, 0, 0,
      Math.sin(angleA) * range, 0, Math.cos(angleA) * range,
      Math.sin(angleB) * range, 0, Math.cos(angleB) * range,
    );
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  const cone = new THREE.Mesh(
    geometry,
    new THREE.MeshBasicMaterial({
      color: 0xffdd7b,
      transparent: true,
      opacity: 0.17,
      depthWrite: false,
      side: THREE.DoubleSide,
      polygonOffset: true,
      polygonOffsetFactor: -2,
    }),
  );
  cone.renderOrder = 2;
  return cone;
}

function fitModel(gltf, maxDimension, { color = null } = {}) {
  const wrapper = new THREE.Group();
  if (!gltf?.scene) return wrapper;
  const model = gltf.scene.clone(true);
  configureModel(model, { color });
  model.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(model);
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());
  const largest = Math.max(size.x, size.y, size.z, 0.001);
  model.position.set(-center.x, -box.min.y, -center.z);
  wrapper.scale.setScalar(maxDimension / largest);
  wrapper.add(model);
  return wrapper;
}

function makeProceduralItem(item) {
  const group = new THREE.Group();
  const material = makeMaterial(item.color, 0.9, 0);
  if (item.id.includes('cap')) {
    group.add(new THREE.Mesh(new THREE.SphereGeometry(0.28, 18, 10, 0, Math.PI * 2, 0, Math.PI / 2), material));
    group.add(makeBox([0.38, 0.035, 0.18], material, [0, 0.02, 0.18]));
  } else {
    group.add(makeBox([0.58, 0.48, 0.28], material, [0, 0.24, 0]));
    const handle = new THREE.Mesh(new THREE.TorusGeometry(0.18, 0.035, 8, 16, Math.PI), material);
    handle.position.y = 0.56;
    group.add(handle);
  }
  return group;
}

function groundAt(x, z, currentLevel = 0) {
  if (x > 5.7 && x < 7.9 && z < -1.9 && z > -8.15) return clamp((-z - 1.9) / 6.25, 0, 1) * UPPER_Y;
  if (currentLevel === 1 && z <= -7.72) return UPPER_Y;
  return 0;
}

function levelAt(x, z, y = 0) {
  return groundAt(x, z) > UPPER_Y * 0.5 || y > UPPER_Y * 0.5 ? 1 : 0;
}

class TensionAudio {
  constructor() {
    this.context = null;
    this.lastBeat = 0;
    this.wasSeen = false;
  }

  ensure() {
    const AudioContextClass = window.AudioContext ?? window.webkitAudioContext;
    if (this.context || !AudioContextClass) return;
    this.context = new AudioContextClass();
  }

  tone(frequency, duration, volume, type = 'sine') {
    this.ensure();
    if (!this.context || this.context.state === 'suspended') this.context?.resume?.();
    if (!this.context) return;
    const now = this.context.currentTime;
    const oscillator = this.context.createOscillator();
    const gain = this.context.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, now);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(volume, now + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    oscillator.connect(gain).connect(this.context.destination);
    oscillator.start(now);
    oscillator.stop(now + duration + 0.02);
  }

  update(now, suspicion, seen) {
    if (seen && !this.wasSeen) this.tone(118, 0.34, 0.075, 'sawtooth');
    this.wasSeen = seen;
    if (suspicion < 28) return;
    const interval = THREE.MathUtils.lerp(1.25, 0.38, suspicion / 100);
    if (now - this.lastBeat < interval) return;
    this.lastBeat = now;
    this.tone(54, 0.12, 0.045);
    window.setTimeout(() => this.tone(47, 0.1, 0.032), 115);
  }

  stolen() {
    this.tone(330, 0.08, 0.035, 'triangle');
    window.setTimeout(() => this.tone(494, 0.12, 0.03, 'triangle'), 75);
  }

  destroy() {
    this.context?.close?.();
    this.context = null;
  }
}

export function createBobShopHeistGame() {
  let root;
  let host;
  let renderer;
  let scene;
  let camera;
  let followCamera;
  let playerActor;
  let architecture;
  let guards = [];
  let shoppers = [];
  let itemStates = [];
  let keys = new Set();
  let running = false;
  let finished = false;
  let destroyed = false;
  let frame = 0;
  let previous = 0;
  let phase = 'loading';
  let phaseTime = 0;
  let player;
  let loot = 0;
  let missionStage = 'steal';
  let suspicion = 0;
  let steal = null;
  let visibleGuards = [];
  let loadProgress = 0;
  let assetsPromise;
  let onResult = () => {};
  let missionMessage = 'Entrá sin llamar la atención.';
  let messageTime = 4;
  let pointerAxes = { x: 0, z: 0 };
  let touchCrouch = false;
  let touchRun = false;
  let actionHeld = false;
  let lootEl;
  let suspicionEl;
  let suspicionFillEl;
  let statusEl;
  let hintEl;
  let progressEl;
  let progressLabelEl;
  let loadingFillEl;
  let objectiveEl;
  let exitMarker;
  const audio = new TensionAudio();
  const tempTarget = new THREE.Vector3();

  function mount({ container, onResult: report }) {
    onResult = report;
    root = document.createElement('div');
    root.className = 'bob-heist-game bob-heist-3d is-loading';
    root.innerHTML = `
      <div class="bob-heist-render"></div>
      <div class="bob-heist-cinematic"></div>
      <div class="bob-heist-danger"></div>
      <div class="bob-heist-mission-card" aria-live="polite"><span>MISIÓN</span><strong>ORIGEN: UN MILLÓN</strong><p>Vaciá la tienda sin que seguridad confirme tu identidad.</p></div>
      <div class="bob-heist-loading"><div class="bob-heist-loading-mark">FOURTWENTY</div><p>CARGANDO MISIÓN</p><strong>ORIGEN: UN MILLÓN</strong><div class="bob-heist-loading-rules"><span>01 · ROBÁ PRENDAS POR $1.000.000</span><span>02 · CORTÁ LA VISIÓN CON LOS MUEBLES</span><span>03 · VOLVÉ A LA ENTRADA PARA ESCAPAR</span></div><div class="bob-heist-loading-track"><i data-loading-fill></i></div><small>Preparando local, prendas y seguridad...</small></div>
      <header class="bob-heist-hud bob-heist-hud-3d">
        <div class="bob-heist-objective"><span>MISIÓN</span><strong data-objective>ROBAR ${money(GOAL)}</strong></div>
        <div class="bob-heist-money"><span>BOTÍN</span><strong data-loot>$0</strong></div>
        <div class="bob-heist-wanted"><div><span data-status>OCULTO</span><strong data-suspicion>0%</strong></div><div class="bob-heist-wanted-track"><i data-suspicion-fill></i></div></div>
      </header>
      <div class="bob-heist-minimap" aria-label="Mapa de la misión"><span class="bob-heist-floor">PB</span><b></b><i></i><i></i><i></i></div>
      <div class="bob-heist-hint" data-hint></div>
      <div class="bob-heist-progress" hidden><span data-progress-label>GUARDANDO PRENDA</span><i></i></div>
      <div class="bob-heist-stick" aria-hidden="true"><i></i></div>
      <div class="bob-heist-touch-actions"><button type="button" class="bob-heist-crouch" aria-label="Agacharse"><span>CTRL</span></button><button type="button" class="bob-heist-action" aria-label="Robar prenda"><span>E</span></button><button type="button" class="bob-heist-run" aria-label="Correr"><span>⇧</span></button></div>
      <div class="bob-heist-controls">W/S AVANZAR · A/D GIRAR · CTRL AGACHARSE · SHIFT CORRER · E ROBAR</div>
    `;
    container.append(root);
    container.closest('.minigame-frame')?.classList.add('minigame-frame-wide', 'minigame-frame-mission');
    host = root.querySelector('.bob-heist-render');
    lootEl = root.querySelector('[data-loot]');
    suspicionEl = root.querySelector('[data-suspicion]');
    suspicionFillEl = root.querySelector('[data-suspicion-fill]');
    statusEl = root.querySelector('[data-status]');
    hintEl = root.querySelector('[data-hint]');
    progressEl = root.querySelector('.bob-heist-progress');
    progressLabelEl = root.querySelector('[data-progress-label]');
    loadingFillEl = root.querySelector('[data-loading-fill]');
    objectiveEl = root.querySelector('[data-objective]');

    renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.08;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    host.append(renderer.domElement);
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0xd9d2c4);
    scene.fog = new THREE.FogExp2(0xd9d2c4, 0.018);
    camera = new THREE.PerspectiveCamera(52, 1, 0.08, 90);
    followCamera = new ThirdPersonCamera(camera, { minX: -STORE_W / 2, maxX: STORE_W / 2, minZ: -STORE_D / 2, maxZ: STORE_D / 2 });
    followCamera.dist = 3.55;
    architecture = new THREE.Group();
    scene.add(architecture);
    buildArchitecture();
    exitMarker = makeExitMarker();
    exitMarker.visible = false;
    scene.add(exitMarker);
    bindControls();
    resize();
    assetsPromise = loadAssets();
  }

  function bindControls() {
    window.addEventListener('keydown', onKeyDown, { capture: true });
    window.addEventListener('keyup', onKeyUp, { capture: true });
    const action = root.querySelector('.bob-heist-action');
    const crouch = root.querySelector('.bob-heist-crouch');
    const run = root.querySelector('.bob-heist-run');
    action.addEventListener('pointerdown', onActionDown);
    action.addEventListener('pointerup', onActionUp);
    action.addEventListener('pointercancel', onActionUp);
    crouch.addEventListener('pointerdown', onCrouchDown);
    crouch.addEventListener('pointerup', onCrouchUp);
    crouch.addEventListener('pointercancel', onCrouchUp);
    run.addEventListener('pointerdown', onRunDown);
    run.addEventListener('pointerup', onRunUp);
    run.addEventListener('pointercancel', onRunUp);
    const stick = root.querySelector('.bob-heist-stick');
    stick.addEventListener('pointerdown', onStickMove);
    stick.addEventListener('pointermove', onStickMove);
    stick.addEventListener('pointerup', onStickEnd);
    stick.addEventListener('pointercancel', onStickEnd);
  }

  function buildArchitecture() {
    const floorMaterial = new THREE.MeshPhysicalMaterial({ color: 0xdad9d5, roughness: 0.48, metalness: 0.02, clearcoat: 0.2, clearcoatRoughness: 0.5 });
    const wallMaterial = makeMaterial(0xf0ece4, 0.82, 0);
    const blackMaterial = makeMaterial(0x151618, 0.62, 0.18);
    const woodMaterial = makeMaterial(0xaa8159, 0.72, 0.02);
    scene.add(new THREE.HemisphereLight(0xfffbef, 0x665a47, 1.65));
    const key = new THREE.DirectionalLight(0xfff6df, 2.15);
    key.position.set(-5, 12, 9);
    key.castShadow = true;
    key.shadow.mapSize.set(1536, 1536);
    key.shadow.camera.left = -13;
    key.shadow.camera.right = 13;
    key.shadow.camera.top = 17;
    key.shadow.camera.bottom = -17;
    key.shadow.bias = -0.0003;
    scene.add(key);
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(STORE_W, STORE_D), floorMaterial);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    architecture.add(floor);
    architecture.add(makeBox([STORE_W - 0.5, 0.24, 6.25], floorMaterial, [0, UPPER_Y - 0.12, -10.85]));
    addWall(0, -STORE_D / 2, STORE_W, 7.2, 0, wallMaterial);
    addWall(-STORE_W / 2, 0, STORE_D, 4.25, Math.PI / 2, wallMaterial);
    addWall(STORE_W / 2, 0, STORE_D, 4.25, -Math.PI / 2, wallMaterial);
    addWall(0, STORE_D / 2, STORE_W, 3.2, Math.PI, wallMaterial);
    const origen = makeTextPlane('O R I G E N', 4.2, 0.72, { color: '#171513', font: '600 64px Arial' });
    origen.position.set(0, 5.95, -STORE_D / 2 + 0.17);
    architecture.add(origen);
    const brand = makeTextPlane('FOURTWENTY', 3.25, 0.62, { color: '#171513', font: '800 58px Arial' });
    brand.position.set(-5.6, 2.88, -STORE_D / 2 + 0.16);
    architecture.add(brand);
    addTable(-3.35, -0.7, woodMaterial, blackMaterial);
    addTable(3.35, -0.7, woodMaterial, blackMaterial);
    addTable(-3.3, 7.1, woodMaterial, blackMaterial);
    addTable(3.3, 7.1, woodMaterial, blackMaterial);
    addTable(-3.2, -10.5, woodMaterial, blackMaterial, UPPER_Y);
    addTable(2.2, -10.5, woodMaterial, blackMaterial, UPPER_Y);
    addStairs(6.8, -1.9, woodMaterial, blackMaterial);
    addRailing(blackMaterial);
    addCeilingLights();
    addWindowPanels();
    addPlants();
  }

  function addWall(x, z, width, height, rotation, material) {
    const wall = makeBox([width, height, 0.28], material, [x, height / 2, z]);
    wall.rotation.y = rotation;
    architecture.add(wall);
  }

  function addTable(x, z, wood, black, y = 0) {
    const group = new THREE.Group();
    group.position.set(x, y, z);
    group.add(makeBox([2.8, 0.18, 1.35], wood, [0, 0.82, 0]));
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) group.add(makeBox([0.09, 0.78, 0.09], black, [sx * 1.22, 0.39, sz * 0.52]));
    group.add(makeBox([2.58, 0.08, 1.14], wood, [0, 0.34, 0]));
    const glow = new THREE.PointLight(0xffbf74, 0.45, 2.5, 2);
    glow.position.set(0, 0.5, 0);
    group.add(glow);
    architecture.add(group);
  }

  function addStairs(x, z, wood, black) {
    const group = new THREE.Group();
    group.position.set(x, 0, z);
    const steps = 15;
    for (let index = 0; index < steps; index++) {
      const t = index / (steps - 1);
      group.add(makeBox([1.9, 0.22, 0.48], wood, [0, t * UPPER_Y, -t * 6.15]));
    }
    const rail = makeBox([0.07, 0.07, 6.6], black, [-1.02, 2.05, -3.05]);
    rail.rotation.x = -0.51;
    group.add(rail);
    architecture.add(group);
  }

  function addRailing(material) {
    for (const x of [-8.1, -4.1, -0.1, 3.9]) {
      architecture.add(makeBox([3.7, 0.07, 0.07], material, [x + 1.85, UPPER_Y + 1.0, -7.75]));
      architecture.add(makeBox([0.06, 1.0, 0.06], material, [x, UPPER_Y + 0.5, -7.75]));
    }
  }

  function addCeilingLights() {
    const emissive = new THREE.MeshStandardMaterial({ color: 0xffe0ae, emissive: 0xffbd70, emissiveIntensity: 4.2, roughness: 0.3 });
    for (const x of [-6, -2, 2, 6]) for (const z of [-11.5, -6, 0, 6, 11]) architecture.add(makeBox([1.8, 0.035, 0.08], emissive, [x, z < -7.8 ? 6.95 : 3.82, z]));
    for (const [x, z, y] of [[-5.8, 4.2, 2.2], [5.8, 4.2, 2.2], [-5.8, -2.2, 2.2], [5.8, -2.2, 2.2]]) {
      const light = new THREE.PointLight(0xffc47d, 0.75, 5, 2);
      light.position.set(x, y, z);
      architecture.add(light);
    }
  }

  function addWindowPanels() {
    const treeMaterial = new THREE.MeshBasicMaterial({ color: 0x638151 });
    const skyMaterial = new THREE.MeshBasicMaterial({ color: 0xa8c8c2 });
    for (const side of [-1, 1]) {
      architecture.add(makeBox([0.04, 2.15, 3.4], skyMaterial, [side * 8.82, 2.02, 9.4]));
      for (let index = 0; index < 5; index++) {
        const crown = new THREE.Mesh(new THREE.SphereGeometry(0.44 + index * 0.04, 8, 6), treeMaterial);
        crown.position.set(side * 8.72, 1.4 + (index % 2) * 0.45, 8.25 + index * 0.56);
        architecture.add(crown);
      }
    }
  }

  function addPlants() {
    for (const [x, z, y] of [[-7.6, 11.5, 0], [7.6, 11.2, 0], [-7.7, -6.7, 0], [7.7, -12.4, UPPER_Y]]) {
      const group = new THREE.Group();
      group.position.set(x, y, z);
      const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.38, 0.5, 12), makeMaterial(0xb7aa98));
      pot.position.y = 0.25;
      group.add(pot);
      for (let index = 0; index < 10; index++) {
        const leaf = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.85, 7), makeMaterial(0x426941, 0.88, 0));
        leaf.position.set(Math.cos(index * 2.3) * 0.18, 0.85, Math.sin(index * 2.3) * 0.18);
        leaf.rotation.z = Math.sin(index) * 0.52;
        leaf.rotation.x = 0.45 + Math.cos(index * 1.3) * 0.35;
        group.add(leaf);
      }
      architecture.add(group);
    }
  }

  function makeExitMarker() {
    const group = new THREE.Group();
    group.position.set(0, 0.05, 12.15);
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(0.72, 0.92, 36),
      new THREE.MeshBasicMaterial({ color: 0x9bc968, transparent: true, opacity: 0.72, side: THREE.DoubleSide, depthWrite: false }),
    );
    ring.rotation.x = -Math.PI / 2;
    group.add(ring);
    const light = new THREE.PointLight(0x9bc968, 1.2, 4, 2);
    light.position.y = 0.55;
    group.add(light);
    return group;
  }

  async function loadAssets() {
    const entries = Object.entries(ASSETS);
    const loaded = {};
    let completed = 0;
    await Promise.all(entries.map(async ([key, url]) => {
      try {
        loaded[key] = await gltfLoader().loadAsync(url);
      } catch (error) {
        console.warn(`[BOB SHOP HEIST] no se pudo cargar ${key}`, error);
        loaded[key] = null;
      } finally {
        completed += 1;
        loadProgress = completed / entries.length;
      }
    }));
    if (destroyed) return;
    populateStore(loaded);
    createActors(loaded.bob);
    phase = 'briefing';
    phaseTime = 0;
    loadProgress = 1;
    root.classList.remove('is-loading');
    root.classList.add('is-briefing');
  }

  function populateStore(loaded) {
    const placements = [
      ['display', [-7.15, 0, -2.2], Math.PI / 2, 2.7],
      ['display', [-7.15, 0, 4.5], Math.PI / 2, 2.7],
      ['display', [7.15, 0, 4.2], -Math.PI / 2, 2.7],
      ['display', [-7.0, UPPER_Y, -10.4], Math.PI / 2, 2.7],
      ['display', [7.0, UPPER_Y, -10.8], -Math.PI / 2, 2.7],
      ['island', [0, 0, 3.2], 0, 3.35],
      ['rail', [0, UPPER_Y + 1.42, -13.72], 0, 4.6],
      ['sofa', [-6.1, 0, -6.35], Math.PI / 2, 2.75],
      ['glassTable', [-4.1, 0, -6.35], 0, 1.7],
      ['vinyl', [-4.1, 0.56, -6.35], Math.PI / 2, 0.68],
      ['vinylCabinet', [7.1, 0, -5.85], -Math.PI / 2, 2.5],
    ];
    for (const [key, position, rotation, dimension] of placements) {
      const model = fitModel(loaded[key], dimension);
      model.position.fromArray(position);
      model.rotation.y = rotation;
      architecture.add(model);
    }
    itemStates = ITEMS.map((item) => {
      let visual;
      if (item.asset && loaded[item.asset]) {
        visual = fitModel(loaded[item.asset], item.asset === 'hoodie' ? 0.78 : 0.68, { color: item.color });
        if (item.asset === 'tee' || item.asset === 'jeanHanging') visual.rotation.x = -Math.PI / 2;
      } else visual = makeProceduralItem(item);
      visual.position.set(item.x, item.y, item.z);
      visual.rotation.y = item.x < 0 ? 0.12 : -0.12;
      scene.add(visual);
      return {
        ...item,
        mesh: visual,
        basePosition: visual.position.clone(),
        baseScale: visual.scale.clone(),
        baseRotation: visual.rotation.clone(),
        stolen: false,
      };
    });
  }

  function createActors(bobGltf) {
    playerActor = makeBobActor(bobGltf);
    scene.add(playerActor.rig);
    guards = GUARDS.map((config, index) => {
      const actor = makeBobActor(bobGltf, { guard: true });
      const [x, z, level] = config.path[0];
      const cone = makeVisionCone(config.range, config.fov);
      const marker = makeStatusMarker();
      marker.group.position.y = 2.25;
      actor.rig.add(marker.group);
      const spotlight = new THREE.SpotLight(0xffe4b0, 2.5, config.range, config.fov * 0.8, 0.55, 1.5);
      spotlight.castShadow = index === 1;
      spotlight.shadow.mapSize.set(512, 512);
      const lightTarget = new THREE.Object3D();
      scene.add(actor.rig, cone, spotlight, lightTarget);
      return {
        ...config, x, z, level, y: level ? UPPER_Y : 0, target: 1, angle: index % 2 ? Math.PI : 0,
        state: 'patrol', pause: 0.7 + index * 0.25, sweep: 0, awareness: 0, lostTime: 0,
        lastSeen: { x, z }, actor, cone, marker, spotlight, lightTarget,
      };
    });
    shoppers = SHOPPERS.map((config, index) => {
      const actor = makeBobActor(bobGltf);
      const [x, z] = config.path[0];
      scene.add(actor.rig);
      return { ...config, x, z, target: 1, angle: index ? Math.PI / 2 : Math.PI, pause: index * 0.8, actor };
    });
  }

  function updateShoppers(dt) {
    for (const shopper of shoppers) {
      let speed = 0;
      if (shopper.pause > 0) shopper.pause -= dt;
      else {
        const [targetX, targetZ] = shopper.path[shopper.target];
        const dx = targetX - shopper.x;
        const dz = targetZ - shopper.z;
        const distance = Math.hypot(dx, dz);
        if (distance < 0.12) {
          shopper.target = (shopper.target + 1) % shopper.path.length;
          shopper.pause = 1.2 + Math.random() * 2.1;
        } else {
          const targetAngle = Math.atan2(dx, dz);
          shopper.angle += wrap(targetAngle - shopper.angle) * Math.min(1, dt * 4);
          const step = Math.min(distance, shopper.speed * dt);
          shopper.x += Math.sin(shopper.angle) * step;
          shopper.z += Math.cos(shopper.angle) * step;
          speed = shopper.speed;
        }
      }
      shopper.actor.rig.position.set(shopper.x, 0, shopper.z);
      shopper.actor.rig.rotation.y = shopper.angle;
      shopper.actor.update(dt, { speed });
    }
  }

  function start() {
    player = { x: 0, z: 10.15, y: 0, level: 0, yaw: Math.PI, velocity: 0, moving: false, crouch: true, running: false };
    loot = 0;
    missionStage = 'steal';
    suspicion = 0;
    steal = null;
    visibleGuards = [];
    running = true;
    finished = false;
    destroyed = false;
    phase = 'loading';
    previous = performance.now();
    missionMessage = 'Infiltrate. Los muebles altos cortan la visión.';
    messageTime = 5;
    frame = requestAnimationFrame(tick);
  }

  function tick(nowMs) {
    if (!running || finished || destroyed) return;
    const dt = Math.min(0.05, Math.max(0, (nowMs - previous) / 1000));
    previous = nowMs;
    phaseTime += dt;
    if (loadingFillEl) loadingFillEl.style.width = `${Math.round(loadProgress * 100)}%`;
    if (phase === 'briefing' && phaseTime > 2.7) {
      phase = 'playing';
      phaseTime = 0;
      root.classList.remove('is-briefing');
      root.classList.add('is-playing');
    }
    if (phase === 'playing') {
      updatePlayer(dt);
      updateGuards(dt);
      updateShoppers(dt);
      updateSteal(dt);
      updateSuspicion(dt, nowMs / 1000);
      updateMissionStage(dt);
    } else if (playerActor) {
      placePlayerActor(dt);
      updateGuards(dt, true);
      updateShoppers(dt);
    }
    updateCamera(dt);
    updateHud(dt);
    renderer.render(scene, camera);
    frame = requestAnimationFrame(tick);
  }

  function readMovement() {
    const keyboardTurn = (keys.has('KeyD') || keys.has('ArrowRight') ? 1 : 0) - (keys.has('KeyA') || keys.has('ArrowLeft') ? 1 : 0);
    const keyboardForward = (keys.has('KeyW') || keys.has('ArrowUp') ? 1 : 0) - (keys.has('KeyS') || keys.has('ArrowDown') ? 1 : 0);
    const pad = leerMando();
    return {
      turn: clamp(keyboardTurn + pointerAxes.x + (pad?.mover.x ?? 0), -1, 1),
      forward: clamp(keyboardForward + pointerAxes.z + (pad?.mover.z ?? 0), -1, 1),
      crouch: touchCrouch || keys.has('ControlLeft') || keys.has('ControlRight') || Boolean(pad?.apretados.has(BOTON.L2)),
      run: touchRun || keys.has('ShiftLeft') || keys.has('ShiftRight') || Boolean(pad?.apretados.has(BOTON.L3)),
      action: actionHeld || keys.has('KeyE') || keys.has('Space') || Boolean(pad?.apretados.has(BOTON.CIRCULO)),
    };
  }

  function updatePlayer(dt) {
    const input = readMovement();
    player.crouch = input.crouch;
    player.running = input.run && !player.crouch;
    const canMove = !steal;
    if (canMove) player.yaw -= input.turn * TURN_SPEED * dt;
    const topSpeed = player.crouch ? CROUCH_SPEED : player.running ? RUN_SPEED : WALK_SPEED;
    const targetVelocity = canMove ? input.forward * topSpeed * (input.forward < 0 ? 0.58 : 1) : 0;
    const rate = Math.abs(targetVelocity) > 0.01 ? ACCELERATION : DECELERATION;
    player.velocity += (targetVelocity - player.velocity) * (1 - Math.exp(-rate * dt));
    player.moving = Math.abs(player.velocity) > 0.08;
    if (player.moving) {
      movePlayer(Math.sin(player.yaw) * player.velocity * dt, Math.cos(player.yaw) * player.velocity * dt);
    }
    player.y = groundAt(player.x, player.z, player.level);
    player.level = levelAt(player.x, player.z, player.y);
    placePlayerActor(dt);
  }

  function movePlayer(dx, dz) {
    const nextX = clamp(player.x + dx, -STORE_W / 2 + 0.65, STORE_W / 2 - 0.65);
    const nextZ = clamp(player.z + dz, -STORE_D / 2 + 0.65, STORE_D / 2 - 0.65);
    const nextY = groundAt(nextX, nextZ, player.level);
    const level = levelAt(nextX, nextZ, nextY);
    if (!collides(nextX, player.z, level)) player.x = nextX;
    if (!collides(player.x, nextZ, level)) player.z = nextZ;
  }

  function collides(x, z, level) {
    if (x < -STORE_W / 2 + 0.55 || x > STORE_W / 2 - 0.55 || z < -STORE_D / 2 + 0.55 || z > STORE_D / 2 - 0.55) return true;
    if (level === 0 && z < -7.72 && !(x > 5.45 && x < 8.1 && z > -8.2)) return true;
    if (level === 1 && z > -7.72 && !(x > 5.45 && x < 8.1 && z < -1.6)) return true;
    return [...SOLID_WALLS, ...COVER].some((obstacle) => obstacle.levels.includes(level) && rectHit(x, z, obstacle));
  }

  function placePlayerActor(dt) {
    if (!playerActor || !player) return;
    playerActor.rig.position.set(player.x, player.y, player.z);
    playerActor.rig.rotation.y = player.yaw;
    playerActor.update(dt, { speed: Math.abs(player.velocity), crouch: player.crouch, stealing: Boolean(steal) });
  }

  function updateGuards(dt, ambientOnly = false) {
    if (!guards.length) return;
    for (const guard of guards) {
      const seesPlayer = !ambientOnly && guardSeesPlayer(guard);
      const seesTheft = seesPlayer && Boolean(steal);
      if (seesTheft) {
        guard.lastSeen.x = player.x;
        guard.lastSeen.z = player.z;
        guard.lostTime = 0;
        guard.awareness = clamp(guard.awareness + dt * 1.35, 0, 1);
        guard.state = guard.awareness > 0.7 || suspicion > 68 ? 'chase' : 'investigate';
      } else if (guard.state === 'chase' && seesPlayer) {
        // Una vez que presencio el robo, puede seguir a BOB mientras lo vea.
        // Ver a un cliente antes del delito nunca alcanza para llegar aca.
        guard.lastSeen.x = player.x;
        guard.lastSeen.z = player.z;
        guard.lostTime = 0;
      } else {
        guard.awareness = clamp(guard.awareness - dt * 0.58, 0, 1);
        if (guard.state !== 'patrol') {
          guard.lostTime += dt;
          const calmDelay = guard.state === 'chase' ? 6.2 : 2.2;
          if (guard.lostTime > calmDelay) {
            guard.state = 'patrol';
            guard.pause = 0.9;
            guard.lostTime = 0;
          }
        }
      }
      if (!ambientOnly && player.running && guard.level === player.level) {
        const noiseDistance = Math.hypot(player.x - guard.x, player.z - guard.z);
        if (noiseDistance < 6.2 && guard.state === 'patrol') {
          guard.state = 'investigate';
          guard.lastSeen.x = player.x;
          guard.lastSeen.z = player.z;
          guard.lostTime = 0;
          guard.awareness = Math.max(guard.awareness, 0.24);
        }
      }
      moveGuard(guard, dt, ambientOnly);
      guard.actor.rig.position.set(guard.x, guard.y, guard.z);
      guard.actor.rig.rotation.y = guard.angle;
      guard.actor.update(dt, { speed: guard.currentSpeed, crouch: false, stealing: false });
      guard.cone.position.set(guard.x, guard.y + 0.035, guard.z);
      guard.cone.rotation.y = guard.angle;
      const alert = guard.state === 'chase';
      const investigate = guard.state === 'investigate';
      guard.cone.material.color.setHex(alert ? 0xff302a : investigate ? 0xffa52f : 0xffdd7b);
      guard.cone.material.opacity = alert ? 0.27 : investigate ? 0.2 : 0.12;
      guard.marker.alert.visible = alert;
      guard.marker.question.visible = investigate && !alert;
      guard.spotlight.color.setHex(alert ? 0xff6a50 : 0xffe4b0);
      guard.spotlight.intensity = alert ? 4.2 : 2.25;
      guard.spotlight.position.set(guard.x, guard.y + 1.18, guard.z);
      guard.lightTarget.position.set(guard.x + Math.sin(guard.angle) * guard.range, guard.y + 0.32, guard.z + Math.cos(guard.angle) * guard.range);
      guard.spotlight.target = guard.lightTarget;
      if (!ambientOnly && guard.state === 'chase' && guard.level === player.level && Math.hypot(player.x - guard.x, player.z - guard.z) < 0.78) finish('lose');
    }
  }

  function moveGuard(guard, dt, ambientOnly) {
    let targetX;
    let targetZ;
    const difficulty = loot >= 700000 ? 1.18 : loot >= 350000 ? 1.08 : 1;
    let speed = guard.speed * difficulty;
    if (!ambientOnly && guard.state !== 'patrol') {
      targetX = guard.lastSeen.x;
      targetZ = guard.lastSeen.z;
      speed *= guard.state === 'chase' ? 2.25 : 1.28;
    } else [targetX, targetZ] = guard.path[guard.target];
    if (guard.pause > 0 && guard.state === 'patrol') {
      guard.pause -= dt;
      guard.sweep += dt;
      guard.angle += Math.sin(guard.sweep * 3.1) * dt * 0.8;
      guard.currentSpeed = 0;
      return;
    }
    const dx = targetX - guard.x;
    const dz = targetZ - guard.z;
    const distance = Math.hypot(dx, dz);
    if (distance < 0.16) {
      guard.currentSpeed = 0;
      if (guard.state === 'patrol') {
        guard.target = (guard.target + 1) % guard.path.length;
        guard.pause = 0.65 + Math.random() * 1.1;
        guard.sweep = Math.random() * Math.PI;
      } else guard.angle += dt * 0.9;
      return;
    }
    const targetAngle = Math.atan2(dx, dz);
    guard.angle += wrap(targetAngle - guard.angle) * Math.min(1, dt * 5.5);
    const step = Math.min(distance, speed * dt);
    guard.x += Math.sin(guard.angle) * step;
    guard.z += Math.cos(guard.angle) * step;
    guard.y = guard.level ? UPPER_Y : 0;
    guard.currentSpeed = speed;
  }

  function guardSeesPlayer(guard) {
    if (guard.level !== player.level) return false;
    const dx = player.x - guard.x;
    const dz = player.z - guard.z;
    const distance = Math.hypot(dx, dz);
    const difficulty = loot >= 700000 ? 1.15 : loot >= 350000 ? 1.07 : 1;
    const range = guard.range * difficulty * (guard.state === 'chase' ? 1.25 : 1);
    if (distance > range) return false;
    const angle = wrap(Math.atan2(dx, dz) - guard.angle);
    if (Math.abs(angle) > guard.fov * (guard.state === 'chase' ? 1.35 : 1)) return false;
    const start = { x: guard.x, z: guard.z };
    const end = { x: player.x, z: player.z };
    const coverHeightNeeded = player.crouch ? 0.72 : 1.45;
    return ![...SOLID_WALLS, ...COVER].some((obstacle) => obstacle.levels.includes(player.level) && obstacle.h >= coverHeightNeeded && segmentIntersectsRect(start, end, obstacle));
  }

  function updateSteal(dt) {
    const input = readMovement();
    const nearest = nearestItem();
    if (!steal && nearest && !input.action) {
      setMessage(`Mantené E para guardar ${nearest.name} · ${money(nearest.value)}`, 0.12);
      setProgress(0);
      return;
    }
    if (!steal && nearest && input.action) startSteal(nearest);
    if (!steal) {
      setProgress(0);
      return;
    }
    if (!input.action) {
      cancelSteal();
      setMessage('Soltaste la prenda. Esperá un momento seguro.', 1.1);
      return;
    }
    const item = itemStates.find((candidate) => candidate.id === steal.id);
    if (!item || item.stolen) {
      cancelSteal();
      return;
    }
    steal.time += dt;
    const progress = clamp(steal.time / STEAL_SECONDS, 0, 1);
    setProgress(progress, `GUARDANDO ${item.name.toUpperCase()}`);
    setMessage(visibleGuards.length ? 'No te muevas. Te están mirando.' : 'Guardando en la mochila...', 0.12);
    animateStolenItem(item, progress);
    if (progress >= 1) completeSteal(item);
  }

  function startSteal(item) {
    steal = { id: item.id, time: 0 };
    player.velocity = 0;
    player.yaw = Math.atan2(item.x - player.x, item.z - player.z);
    item.basePosition.copy(item.mesh.position);
    item.baseScale.copy(item.mesh.scale);
    item.baseRotation.copy(item.mesh.rotation);
    playerActor?.beginSteal();
  }

  function animateStolenItem(item, progress) {
    const lift = easeInOut(clamp((progress - 0.18) / 0.62, 0, 1));
    tempTarget.set(player.x - Math.sin(player.yaw) * 0.3, player.y + (player.crouch ? 0.92 : 1.25), player.z - Math.cos(player.yaw) * 0.3);
    item.mesh.position.lerpVectors(item.basePosition, tempTarget, lift);
    item.mesh.position.y += Math.sin(progress * Math.PI) * 0.3;
    item.mesh.scale.copy(item.baseScale).multiplyScalar(1 - easeInOut(clamp((progress - 0.62) / 0.38, 0, 1)) * 0.82);
    item.mesh.rotation.y += 0.045;
  }

  function cancelSteal() {
    if (!steal) return;
    const item = itemStates.find((candidate) => candidate.id === steal.id);
    if (item && !item.stolen) {
      item.mesh.position.copy(item.basePosition);
      item.mesh.scale.copy(item.baseScale);
      item.mesh.rotation.copy(item.baseRotation);
    }
    playerActor?.endSteal();
    steal = null;
    setProgress(0);
  }

  function completeSteal(item) {
    item.stolen = true;
    item.mesh.visible = false;
    loot += item.value;
    playerActor?.endSteal();
    steal = null;
    audio.stolen();
    setProgress(0);
    setMessage(`${item.name}: ${money(item.value)} guardados.`, 1.6);
    root.classList.add('loot-flash');
    window.setTimeout(() => root?.classList.remove('loot-flash'), 260);
    const nearestGuard = guards
      .filter((guard) => guard.level === player.level)
      .sort((a, b) => Math.hypot(a.x - item.x, a.z - item.z) - Math.hypot(b.x - item.x, b.z - item.z))[0];
    if (nearestGuard && loot >= 350000 && nearestGuard.state === 'patrol') {
      nearestGuard.state = 'investigate';
      nearestGuard.lastSeen.x = item.x;
      nearestGuard.lastSeen.z = item.z;
      nearestGuard.awareness = Math.max(nearestGuard.awareness, loot >= 700000 ? 0.45 : 0.25);
      nearestGuard.lostTime = 0;
    }
    if (loot >= GOAL && missionStage === 'steal') beginEscape();
  }

  function beginEscape() {
    missionStage = 'escape';
    exitMarker.visible = true;
    setMessage('Ya tenés el millón. Volvé a la entrada sin que te alcancen.', 4.5);
    root.classList.add('is-escape');
    for (const guard of guards) {
      guard.state = 'investigate';
      guard.awareness = Math.max(guard.awareness, 0.48);
      guard.lastSeen.x = player.x + (Math.random() - 0.5) * 3;
      guard.lastSeen.z = player.z + (Math.random() - 0.5) * 3;
      guard.lostTime = 0;
    }
  }

  function updateMissionStage(dt) {
    if (missionStage !== 'escape') return;
    exitMarker.rotation.y += dt * 0.8;
    const pulse = 1 + Math.sin(performance.now() * 0.005) * 0.08;
    exitMarker.scale.setScalar(pulse);
    if (player.level === 0 && Math.hypot(player.x, player.z - 12.15) < 1.05) finish('win');
  }

  function nearestItem() {
    let nearest = null;
    let distance = 1.18;
    for (const item of itemStates) {
      if (item.stolen || (item.level ?? 0) !== player.level) continue;
      const candidate = Math.hypot(item.x - player.x, item.z - player.z);
      if (candidate < distance) {
        nearest = item;
        distance = candidate;
      }
    }
    return nearest;
  }

  function updateSuspicion(dt, now) {
    // La barra representa evidencia del robo, no la cercania a seguridad.
    // Un guardia puede mirar a BOB como a cualquier cliente sin penalizarlo.
    visibleGuards = steal ? guards.filter(guardSeesPlayer) : [];
    const seen = visibleGuards.length > 0;
    if (seen) {
      suspicion += 31 * visibleGuards.length * dt;
      setMessage('Te vieron robando. Cortá visión o soltá la prenda.', 0.12);
    } else suspicion -= 22 * dt;
    suspicion = clamp(suspicion, 0, 100);
    if (suspicion >= 100) finish('lose');
    audio.update(now, suspicion, seen);
  }

  function updateCamera(dt) {
    if (!player || !camera) return;
    tempTarget.set(player.x, player.y, player.z);
    followCamera.update(dt, tempTarget, player.y, player.yaw, player.level ? 3.5 : 4.1);
    if (suspicion > 70) {
      const shake = (suspicion - 70) / 30;
      camera.position.x += Math.sin(performance.now() * 0.037) * 0.012 * shake;
      camera.position.y += Math.cos(performance.now() * 0.031) * 0.009 * shake;
    }
  }

  function updateHud(dt) {
    if (lootEl) lootEl.textContent = money(loot);
    if (objectiveEl) objectiveEl.textContent = missionStage === 'escape'
      ? 'ESCAPAR POR LA ENTRADA'
      : `ROBAR ${money(Math.max(0, GOAL - loot))}`;
    if (suspicionEl) suspicionEl.textContent = `${Math.round(suspicion)}%`;
    if (suspicionFillEl) suspicionFillEl.style.width = `${suspicion}%`;
    const status = suspicion >= 70 ? 'PERSECUCIÓN' : suspicion >= 35 ? 'SOSPECHA' : guards.some((guard) => guard.state !== 'patrol') ? 'BUSCANDO' : 'OCULTO';
    if (statusEl) statusEl.textContent = status;
    root?.classList.toggle('is-danger', suspicion >= 35);
    root?.classList.toggle('is-chased', suspicion >= 70);
    if (messageTime > 0) messageTime = Math.max(0, messageTime - dt);
    if (hintEl) hintEl.textContent = missionMessage;
    updateMinimap();
  }

  function updateMinimap() {
    if (!root || !player) return;
    const dots = root.querySelectorAll('.bob-heist-minimap i');
    guards.slice(0, 3).forEach((guard, index) => {
      const dot = dots[index];
      if (!dot) return;
      dot.style.left = `${50 + (guard.x / STORE_W) * 82}%`;
      dot.style.top = `${50 + (guard.z / STORE_D) * 82}%`;
      dot.style.opacity = guard.level === player.level ? '1' : '0.24';
      dot.classList.toggle('alert', guard.state === 'chase');
    });
    const arrow = root.querySelector('.bob-heist-minimap b');
    arrow.style.left = `${50 + (player.x / STORE_W) * 82}%`;
    arrow.style.top = `${50 + (player.z / STORE_D) * 82}%`;
    arrow.style.transform = `translate(-50%, -50%) rotate(${player.yaw}rad)`;
    root.querySelector('.bob-heist-floor').textContent = player.level ? 'P1' : 'PB';
  }

  function setMessage(text, seconds) {
    if (messageTime > seconds && missionMessage === text) return;
    missionMessage = text;
    messageTime = seconds;
  }

  function setProgress(value, label = 'GUARDANDO PRENDA') {
    if (!progressEl) return;
    progressEl.hidden = value <= 0 || value >= 1;
    progressEl.querySelector('i').style.width = `${clamp(value, 0, 1) * 100}%`;
    if (progressLabelEl) progressLabelEl.textContent = label;
  }

  function finish(result) {
    if (finished) return;
    finished = true;
    running = false;
    cancelAnimationFrame(frame);
    root?.classList.add(result === 'win' ? 'mission-passed' : 'mission-failed');
    window.setTimeout(() => {
      if (destroyed) return;
      onResult({ status: result, kicker: result === 'win' ? 'MISIÓN CUMPLIDA' : 'MISIÓN FALLIDA', title: result === 'win' ? `${money(loot)} recuperados` : 'Seguridad atrapó a BOB', discount: false });
    }, 900);
  }

  function onKeyDown(event) {
    if (!running || !KEYBOARD_CODES.has(event.code)) return;
    event.preventDefault();
    event.stopPropagation();
    keys.add(event.code);
    audio.ensure();
  }

  function onKeyUp(event) {
    if (!KEYBOARD_CODES.has(event.code)) return;
    event.preventDefault();
    event.stopPropagation();
    keys.delete(event.code);
  }

  function onActionDown(event) { event.preventDefault(); actionHeld = true; audio.ensure(); }
  function onActionUp(event) { event.preventDefault(); actionHeld = false; }
  function onCrouchDown(event) { event.preventDefault(); touchCrouch = true; }
  function onCrouchUp(event) { event.preventDefault(); touchCrouch = false; }
  function onRunDown(event) { event.preventDefault(); touchRun = true; }
  function onRunUp(event) { event.preventDefault(); touchRun = false; }

  function onStickMove(event) {
    event.preventDefault();
    const stick = event.currentTarget;
    stick.setPointerCapture?.(event.pointerId);
    const rect = stick.getBoundingClientRect();
    const dx = clamp((event.clientX - rect.left - rect.width / 2) / (rect.width * 0.32), -1, 1);
    const dz = clamp((rect.height / 2 - (event.clientY - rect.top)) / (rect.height * 0.32), -1, 1);
    pointerAxes = { x: dx, z: dz };
    stick.querySelector('i').style.transform = `translate(calc(-50% + ${dx * 28}px), calc(-50% + ${-dz * 28}px))`;
  }

  function onStickEnd(event) {
    event.preventDefault();
    pointerAxes = { x: 0, z: 0 };
    event.currentTarget.querySelector('i').style.transform = 'translate(-50%, -50%)';
  }

  function pause() {
    running = false;
    cancelAnimationFrame(frame);
  }

  function resize() {
    if (!renderer || !host || !camera) return;
    const width = host.clientWidth || window.innerWidth || 1280;
    const height = host.clientHeight || window.innerHeight || 720;
    const maxPixels = 1.65e6;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    renderer.setPixelRatio(Math.max(0.78, Math.min(dpr, Math.sqrt(maxPixels / Math.max(1, width * height)))));
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    followCamera.dist = camera.aspect < 0.7 ? 4.65 : 3.55;
    camera.updateProjectionMatrix();
  }

  function destroy() {
    destroyed = true;
    pause();
    window.removeEventListener('keydown', onKeyDown, { capture: true });
    window.removeEventListener('keyup', onKeyUp, { capture: true });
    const frameElement = root?.closest('.minigame-frame');
    frameElement?.classList.remove('minigame-frame-wide', 'minigame-frame-mission');
    disposeObject(scene);
    renderer?.dispose();
    renderer?.forceContextLoss?.();
    audio.destroy();
    root?.remove();
    root = null;
    keys.clear();
  }

  return { mount, start, pause, destroy, resize };
}
