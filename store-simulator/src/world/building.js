// Obra gruesa del local FOURTWENTY: 5 pisos (planta baja + 4 colecciones).
// Losas, paredes, escaleras alternadas y barandas en los huecos.
// Ambientación pedida por el dueño: piso blanco, luz blanca, look GTA SA.
import * as THREE from 'three';
import { whiteFloor, whitePlaster, lightCeiling, stairConcrete, windowDaylight } from './textures.js';
import { box } from './gfxUtils.js';

// Dimensiones (metros)
export const W = 12;             // ancho (x: -6..6) — ÷3 pedido por el dueño: escala tienda real
export const D = 9;              // profundidad (z: -4.5..4.5)
export const NUM_FLOORS = 5;
export const FLOOR_H = 3.4;      // altura entre pisos (retail real)
export const FLOOR_YS = Array.from({ length: NUM_FLOORS }, (_, i) => i * FLOOR_H);
const HX = W / 2, HZ = D / 2;
const SLAB = 0.3;                // espesor de losa
const WALL_T = 0.3;              // espesor de pared
const TOP = NUM_FLOORS * FLOOR_H; // 20: cara superior interior
export const INTERIOR = { x: HX - WALL_T / 2, z: HZ - WALL_T / 2 }; // caras internas

// Banda de escaleras contra la pared del fondo (z+)
export const ST_Z0 = HZ - 2.2;   // 2.3: arranque de la banda de escaleras
const ST_Z1 = HZ - WALL_T / 2;   // 24.85
const RUN = 7;                   // largo de cada tramo

// Tramos alternados: impar sube por el oeste (hacia +x), par por el este (hacia -x)
const flights = [];
for (let i = 0; i < NUM_FLOORS - 1; i++) {
  const west = i % 2 === 0;
  const y0 = FLOOR_YS[i], y1 = FLOOR_YS[i + 1];
  if (west) {
    flights.push({ x0: -HX + 0.8, x1: -HX + 0.8 + RUN, y0, y1, hole: { minX: -INTERIOR.x, maxX: -HX + 0.8 + RUN } });
  } else {
    flights.push({ x0: HX - 0.8, x1: HX - 0.8 - RUN, y0, y1, hole: { minX: HX - 0.8 - RUN, maxX: INTERIOR.x } });
  }
}

const STEP_TOL = 0.55; // desnivel máximo que BOB "sube" sin escalera

// ---- Superficies caminables ----------------------------------------------
// rect plano: {minX,maxX,minZ,maxZ,y} · rampa: {…, ramp:true, x0,x1,y0,y1}
const surfaces = [
  { minX: -HX, maxX: HX, minZ: -HZ, maxZ: HZ, y: 0 }, // planta baja completa
];
for (let j = 1; j < NUM_FLOORS; j++) {
  const hole = flights[j - 1].hole;
  surfaces.push({ minX: -HX, maxX: HX, minZ: -HZ, maxZ: ST_Z0, y: FLOOR_YS[j] });
  if (hole.minX > -HX) surfaces.push({ minX: -HX, maxX: hole.minX, minZ: ST_Z0, maxZ: HZ, y: FLOOR_YS[j] });
  if (hole.maxX < HX) surfaces.push({ minX: hole.maxX, maxX: HX, minZ: ST_Z0, maxZ: HZ, y: FLOOR_YS[j] });
}
for (const f of flights) {
  surfaces.push({
    minX: Math.min(f.x0, f.x1), maxX: Math.max(f.x0, f.x1),
    minZ: ST_Z0, maxZ: ST_Z1, ramp: true, x0: f.x0, x1: f.x1, y0: f.y0, y1: f.y1,
  });
}

// Altura de piso bajo (x,z) alcanzable desde la altura actual.
export function sampleGround(x, z, currentY) {
  let best = -Infinity;
  for (const s of surfaces) {
    if (x < s.minX || x > s.maxX || z < s.minZ || z > s.maxZ) continue;
    let h;
    if (s.ramp) {
      const t = THREE.MathUtils.clamp((x - s.x0) / (s.x1 - s.x0), 0, 1);
      h = s.y0 + (s.y1 - s.y0) * t;
    } else {
      h = s.y;
    }
    if (h <= currentY + STEP_TOL && h > best) best = h;
  }
  return best === -Infinity ? 0 : best;
}

// Piso (1..NUM_FLOORS) en el que está una altura dada, para el HUD.
export function floorIndexAt(y) {
  for (let i = NUM_FLOORS - 1; i >= 1; i--) {
    if (y >= FLOOR_YS[i] - 0.6) return i + 1;
  }
  return 1;
}

// ---- Colliders AABB {minX,maxX,minY,maxY,minZ,maxZ} -----------------------
const colliders = [
  { minX: -HX - WALL_T, maxX: HX + WALL_T, minY: 0, maxY: TOP, minZ: INTERIOR.z, maxZ: HZ + WALL_T },   // fondo
  { minX: -HX - WALL_T, maxX: HX + WALL_T, minY: 0, maxY: TOP, minZ: -HZ - WALL_T, maxZ: -INTERIOR.z }, // frente
  { minX: -HX - WALL_T, maxX: -INTERIOR.x, minY: 0, maxY: TOP, minZ: -HZ, maxZ: HZ },                   // oeste
  { minX: INTERIOR.x, maxX: HX + WALL_T, minY: 0, maxY: TOP, minZ: -HZ, maxZ: HZ },                     // este
];
for (let j = 1; j < NUM_FLOORS; j++) {
  const hole = flights[j - 1].hole;
  colliders.push({ // baranda del hueco de escalera
    minX: hole.minX, maxX: hole.maxX,
    minY: FLOOR_YS[j], maxY: FLOOR_YS[j] + 1.1,
    minZ: ST_Z0 - 0.05, maxZ: ST_Z0 + 0.05,
  });
}
export function getColliders() { return colliders; }

export const SPAWN = new THREE.Vector3(0, 0, -2.2);

// ---- Construcción visual ---------------------------------------------------

function buildStair(group, f, stepMat) {
  const steps = 14;
  const stepRise = (f.y1 - f.y0) / steps;
  const run = (f.x1 - f.x0) / steps; // con signo
  const width = ST_Z1 - ST_Z0;
  const zc = (ST_Z0 + ST_Z1) / 2;
  for (let i = 0; i < steps; i++) {
    const x = f.x0 + run * (i + 0.5);
    const yTop = f.y0 + stepRise * (i + 1);
    group.add(box(Math.abs(run) + 0.02, 0.25, width, x, yTop - 0.125, zc, stepMat));
  }
}

function buildRail(group, minX, maxX, y, z) {
  const mat = new THREE.MeshStandardMaterial({ color: 0x8a8a86, roughness: 0.5, metalness: 0.5 });
  const len = maxX - minX;
  group.add(box(len, 0.07, 0.07, (minX + maxX) / 2, y + 1.05, z, mat));
  const posts = Math.max(2, Math.round(len / 1.5));
  for (let i = 0; i <= posts; i++) {
    group.add(box(0.06, 1.05, 0.06, minX + (len * i) / posts, y + 0.525, z, mat));
  }
}

export function buildBuilding(scene) {
  const group = new THREE.Group();

  // Piso pulido con brillo real (roughness bajo + envMap del main); paredes mate.
  const floorMat = new THREE.MeshPhysicalMaterial({ map: whiteFloor(W / 2, D / 2), roughness: 0.45, metalness: 0.03 });
  const wallMat = new THREE.MeshStandardMaterial({ map: whitePlaster(18, 6), roughness: 0.95 });
  const wallMatSide = new THREE.MeshStandardMaterial({ map: whitePlaster(13, 6), roughness: 0.95 });
  const ceilMat = new THREE.MeshStandardMaterial({ map: lightCeiling(W / 4, D / 4), roughness: 1.0 });
  const stepMat = new THREE.MeshStandardMaterial({ map: stairConcrete(1, 1), color: 0xd6d6d2, roughness: 0.8 });
  const glowMat = new THREE.MeshBasicMaterial({ map: windowDaylight() });

  // Losa planta baja (contrapiso)
  group.add(box(W, SLAB, D, 0, -SLAB / 2, 0, floorMat));

  // Losas superiores (con hueco de escalera)
  for (let j = 1; j < NUM_FLOORS; j++) {
    const y = FLOOR_YS[j];
    const hole = flights[j - 1].hole;
    group.add(box(W, SLAB, ST_Z0 + HZ, 0, y - SLAB / 2, (ST_Z0 - HZ) / 2, floorMat));
    if (hole.minX > -HX) {
      const w = hole.minX + HX;
      group.add(box(w, SLAB, HZ - ST_Z0, -HX + w / 2, y - SLAB / 2, (ST_Z0 + HZ) / 2, floorMat));
    }
    if (hole.maxX < HX) {
      const w = HX - hole.maxX;
      group.add(box(w, SLAB, HZ - ST_Z0, HX - w / 2, y - SLAB / 2, (ST_Z0 + HZ) / 2, floorMat));
    }
  }
  // Losa de techo
  group.add(box(W, SLAB, D, 0, TOP + SLAB / 2, 0, ceilMat));

  // Paredes exteriores
  group.add(box(W + WALL_T * 2, TOP, WALL_T, 0, TOP / 2, HZ + WALL_T / 2, wallMat));   // fondo
  group.add(box(W + WALL_T * 2, TOP, WALL_T, 0, TOP / 2, -HZ - WALL_T / 2, wallMat));  // frente
  group.add(box(WALL_T, TOP, D, -HX - WALL_T / 2, TOP / 2, 0, wallMatSide));           // oeste
  group.add(box(WALL_T, TOP, D, HX + WALL_T / 2, TOP / 2, 0, wallMatSide));            // este

  // Aberturas del frente (planos "vidriera" con luz de día, cara interior)
  const front = -INTERIOR.z + 0.02;
  const vidriera = new THREE.Mesh(new THREE.PlaneGeometry(7, 2.2), glowMat);
  vidriera.position.set(0, 1.25, front);
  group.add(vidriera); // vidriera del local, planta baja
  for (let j = 1; j < NUM_FLOORS; j++) {
    for (const wx of [-3.5, 0, 3.5]) {
      const win = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 1.3), glowMat);
      win.position.set(wx, FLOOR_YS[j] + 1.9, front);
      group.add(win);
    }
  }

  // Escaleras y barandas
  for (const f of flights) buildStair(group, f, stepMat);
  for (let j = 1; j < NUM_FLOORS; j++) {
    const hole = flights[j - 1].hole;
    buildRail(group, hole.minX, hole.maxX, FLOOR_YS[j], ST_Z0);
  }

  // Sombras: todo lo sólido las proyecta y las recibe (los planos de
  // ventana/vidriera son MeshBasic y quedan afuera).
  group.traverse((m) => {
    if (m.isMesh && !m.material.isMeshBasicMaterial) {
      m.castShadow = true;
      m.receiveShadow = true;
    }
  });

  scene.add(group);
  return group;
}

// Iluminación con contraste (pase visual GTA V): ambiente bajo + spots
// cálidos (~3200K) que bañan zonas y dejan otras en penumbra.
export function buildLights(scene, { shadows = true } = {}) {
  scene.add(new THREE.HemisphereLight(0xfff4e0, 0x6b675e, 0.35)); // relleno tenue
  const key = new THREE.DirectionalLight(0xfff0d8, 0.4);
  key.position.set(30, 40, -20);
  scene.add(key);
  const WARM = 0xffc58f; // ~3200K
  for (const fy of FLOOR_YS) {
    for (const [i, lx] of [-3, 3].entries()) {
      const s = new THREE.SpotLight(WARM, 12, 11, 1.0, 0.65, 1.6);
      s.position.set(lx, fy + FLOOR_H - 0.25, 0);
      s.target.position.set(lx * 0.5, fy, 0);
      scene.add(s, s.target);
      if (shadows && i === 0) { // una sombra real por piso (perf)
        s.castShadow = true;
        s.shadow.mapSize.set(1024, 1024);
        s.shadow.camera.near = 0.4;
        s.shadow.camera.far = 10;
        s.shadow.bias = -0.0004;
      }
    }
  }
}
