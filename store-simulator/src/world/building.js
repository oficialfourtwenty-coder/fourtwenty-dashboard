// Obra gruesa del local FOURTWENTY: 3 pisos VACÍOS, escala x5.
// Losas, paredes, 2 escaleras y barandas en los huecos. Nada más:
// el diseño interior lo hace el dueño desde cero (ver CLAUDE.md).
// Ambientación pedida por el dueño: piso blanco, luz blanca, look GTA SA.
import * as THREE from 'three';
import { whiteFloor, whitePlaster, lightCeiling, stairConcrete, windowDaylight } from './textures.js';

// Dimensiones (metros)
export const W = 70;             // ancho (x: -35..35) — antes 14
export const D = 50;             // profundidad (z: -25..25) — antes 10
export const FLOOR_H = 4.0;      // altura entre pisos
export const FLOOR_YS = [0, 4.0, 8.0];
const HX = W / 2, HZ = D / 2;
const SLAB = 0.3;                // espesor de losa
const WALL_T = 0.3;              // espesor de pared
const TOP = FLOOR_YS[2] + FLOOR_H; // 12: cara superior interior
export const INTERIOR = { x: HX - WALL_T / 2, z: HZ - WALL_T / 2 }; // caras internas

// Banda de escaleras contra la pared del fondo (z+)
const ST_Z0 = HZ - 3.0;          // 22.0
const ST_Z1 = HZ - WALL_T / 2;   // 24.85
const RUN = 11;                  // largo de cada tramo
// Tramo A: piso 1 → 2, sube hacia +x. Tramo B: piso 2 → 3, sube hacia -x.
const RAMP_A = { x0: -HX + 1, x1: -HX + 1 + RUN, y0: 0, y1: FLOOR_YS[1] };
const RAMP_B = { x0: HX - 1, x1: HX - 1 - RUN, y0: FLOOR_YS[1], y1: FLOOR_YS[2] };
const HOLE_A = { minX: -INTERIOR.x, maxX: RAMP_A.x1 };
const HOLE_B = { minX: RAMP_B.x1, maxX: INTERIOR.x };

const STEP_TOL = 0.55; // desnivel máximo que BOB "sube" sin escalera

// ---- Superficies caminables ----------------------------------------------
// rect plano: {minX,maxX,minZ,maxZ,y} · rampa: {…, ramp:true, x0,x1,y0,y1}
const surfaces = [
  // Piso 1: todo el interior
  { minX: -HX, maxX: HX, minZ: -HZ, maxZ: HZ, y: 0 },
  // Piso 2: losa completa menos el hueco de la escalera A
  { minX: -HX, maxX: HX, minZ: -HZ, maxZ: ST_Z0, y: FLOOR_YS[1] },
  { minX: HOLE_A.maxX, maxX: HX, minZ: ST_Z0, maxZ: HZ, y: FLOOR_YS[1] },
  // Piso 3: losa completa menos el hueco de la escalera B
  { minX: -HX, maxX: HX, minZ: -HZ, maxZ: ST_Z0, y: FLOOR_YS[2] },
  { minX: -HX, maxX: HOLE_B.minX, minZ: ST_Z0, maxZ: HZ, y: FLOOR_YS[2] },
  // Rampas (la superficie de las escaleras)
  { minX: RAMP_A.x0, maxX: RAMP_A.x1, minZ: ST_Z0, maxZ: ST_Z1, ramp: true, ...RAMP_A },
  { minX: RAMP_B.x1, maxX: RAMP_B.x0, minZ: ST_Z0, maxZ: ST_Z1, ramp: true, ...RAMP_B },
];

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

// Piso (1..3) en el que está una altura dada, para el HUD.
export function floorIndexAt(y) {
  if (y >= FLOOR_YS[2] - 0.6) return 3;
  if (y >= FLOOR_YS[1] - 0.6) return 2;
  return 1;
}

// ---- Colliders AABB {minX,maxX,minY,maxY,minZ,maxZ} -----------------------
const colliders = [
  // Paredes exteriores (altura completa)
  { minX: -HX - WALL_T, maxX: HX + WALL_T, minY: 0, maxY: TOP, minZ: INTERIOR.z, maxZ: HZ + WALL_T },   // fondo
  { minX: -HX - WALL_T, maxX: HX + WALL_T, minY: 0, maxY: TOP, minZ: -HZ - WALL_T, maxZ: -INTERIOR.z }, // frente
  { minX: -HX - WALL_T, maxX: -INTERIOR.x, minY: 0, maxY: TOP, minZ: -HZ, maxZ: HZ },                   // oeste
  { minX: INTERIOR.x, maxX: HX + WALL_T, minY: 0, maxY: TOP, minZ: -HZ, maxZ: HZ },                     // este
  // Barandas en los bordes de los huecos de escalera
  { minX: HOLE_A.minX, maxX: HOLE_A.maxX, minY: FLOOR_YS[1], maxY: FLOOR_YS[1] + 1.1, minZ: ST_Z0 - 0.05, maxZ: ST_Z0 + 0.05 }, // piso 2
  { minX: HOLE_B.minX, maxX: HOLE_B.maxX, minY: FLOOR_YS[2], maxY: FLOOR_YS[2] + 1.1, minZ: ST_Z0 - 0.05, maxZ: ST_Z0 + 0.05 }, // piso 3
];
export function getColliders() { return colliders; }

export const SPAWN = new THREE.Vector3(0, 0, -18);

// ---- Construcción visual ---------------------------------------------------
function box(w, h, d, x, y, z, mat) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y, z);
  return m;
}

function buildStair(group, ramp, stepMat) {
  const rise = ramp.y1 - ramp.y0;
  const steps = 16;
  const stepRise = rise / steps;
  const run = (ramp.x1 - ramp.x0) / steps; // con signo (B baja en x)
  const width = ST_Z1 - ST_Z0;
  const zc = (ST_Z0 + ST_Z1) / 2;
  for (let i = 0; i < steps; i++) {
    const x = ramp.x0 + run * (i + 0.5);
    const yTop = ramp.y0 + stepRise * (i + 1);
    group.add(box(Math.abs(run) + 0.02, 0.25, width, x, yTop - 0.125, zc, stepMat));
  }
}

function buildRail(group, minX, maxX, y, z) {
  const mat = new THREE.MeshStandardMaterial({ color: 0x8a8a86, roughness: 0.5, metalness: 0.5 });
  const len = maxX - minX;
  const bar = box(len, 0.07, 0.07, (minX + maxX) / 2, y + 1.05, z, mat);
  group.add(bar);
  const posts = Math.max(2, Math.round(len / 1.5));
  for (let i = 0; i <= posts; i++) {
    group.add(box(0.06, 1.05, 0.06, minX + (len * i) / posts, y + 0.525, z, mat));
  }
}

export function buildBuilding(scene) {
  const group = new THREE.Group();

  const floorMat = new THREE.MeshStandardMaterial({ map: whiteFloor(W / 2, D / 2), roughness: 0.85 });
  const wallMat = new THREE.MeshStandardMaterial({ map: whitePlaster(18, 3), roughness: 1.0 });
  const wallMatSide = new THREE.MeshStandardMaterial({ map: whitePlaster(13, 3), roughness: 1.0 });
  const ceilMat = new THREE.MeshStandardMaterial({ map: lightCeiling(W / 4, D / 4), roughness: 1.0 });
  const stepMat = new THREE.MeshStandardMaterial({ map: stairConcrete(1, 1), color: 0xd6d6d2, roughness: 0.9 });
  const glowMat = new THREE.MeshBasicMaterial({ map: windowDaylight() });

  // Losa piso 1 (contrapiso)
  group.add(box(W, SLAB, D, 0, -SLAB / 2, 0, floorMat));

  // Losas pisos 2 y 3 (con hueco de escalera) + cara inferior = cielorraso
  for (const [y, hole] of [
    [FLOOR_YS[1], HOLE_A],
    [FLOOR_YS[2], HOLE_B],
  ]) {
    // pieza principal (z -HZ..ST_Z0)
    group.add(box(W, SLAB, ST_Z0 + HZ, 0, y - SLAB / 2, (ST_Z0 - HZ) / 2, floorMat));
    // banda del fondo, partes a los costados del hueco
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
  const vidriera = new THREE.Mesh(new THREE.PlaneGeometry(30, 3.2), glowMat);
  vidriera.position.set(0, 1.7, front);
  group.add(vidriera); // vidriera del local, piso 1
  for (const fy of [FLOOR_YS[1], FLOOR_YS[2]]) {
    for (const wx of [-14, -7, 0, 7, 14]) {
      const win = new THREE.Mesh(new THREE.PlaneGeometry(4, 1.9), glowMat);
      win.position.set(wx, fy + 2.0, front);
      group.add(win);
    }
  }

  // Escaleras
  buildStair(group, RAMP_A, stepMat);
  buildStair(group, RAMP_B, stepMat);

  // Barandas de los huecos
  buildRail(group, HOLE_A.minX, HOLE_A.maxX, FLOOR_YS[1], ST_Z0);
  buildRail(group, HOLE_B.minX, HOLE_B.maxX, FLOOR_YS[2], ST_Z0);

  scene.add(group);
  return group;
}

// Luz blanca pareja (look GTA SA interior) + puntuales para dar profundidad.
export function buildLights(scene) {
  scene.add(new THREE.HemisphereLight(0xffffff, 0xa8a8a0, 0.9));
  const key = new THREE.DirectionalLight(0xffffff, 1.1);
  key.position.set(30, 40, -20);
  scene.add(key);
  for (const fy of FLOOR_YS) {
    for (const [lx, lz] of [[-17, 0], [17, 0], [0, -12], [0, 12]]) {
      const p = new THREE.PointLight(0xffffff, 34, 30, 2);
      p.position.set(lx, fy + FLOOR_H - 0.5, lz);
      scene.add(p);
    }
  }
}
