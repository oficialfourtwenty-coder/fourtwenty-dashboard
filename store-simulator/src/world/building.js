// Obra gruesa del local FOURTWENTY: 3 pisos VACÍOS.
// Losas, paredes, 2 escaleras y barandas en los huecos. Nada más:
// el diseño interior lo hace el dueño desde cero (ver CLAUDE.md).
import * as THREE from 'three';
import { concreteFloor, plasterWall, concreteCeiling, stairConcrete, windowGlow } from './textures.js';

// Dimensiones (metros)
export const W = 14;            // ancho (x: -7..7)
export const D = 10;            // profundidad (z: -5..5)
export const FLOOR_H = 3.5;     // altura entre pisos
export const FLOOR_YS = [0, 3.5, 7.0];
const SLAB = 0.25;              // espesor de losa
const WALL_T = 0.3;             // espesor de pared
const TOP = FLOOR_YS[2] + FLOOR_H; // 10.5: cara superior interior

// Banda de escaleras contra la pared del fondo (z+)
const ST_Z0 = 3.3, ST_Z1 = 4.85;
// Tramo A: piso 1 → 2, sube hacia +x. Tramo B: piso 2 → 3, sube hacia -x.
const RAMP_A = { x0: -6.3, x1: -0.9, y0: 0, y1: 3.5 };
const RAMP_B = { x0: 6.3, x1: 0.9, y0: 3.5, y1: 7.0 };

const STEP_TOL = 0.55; // desnivel máximo que BOB "sube" sin escalera

// ---- Superficies caminables ----------------------------------------------
// rect plano: {minX,maxX,minZ,maxZ,y} · rampa: {…, ramp:true, x0,x1,y0,y1}
const surfaces = [
  // Piso 1: todo el interior
  { minX: -7, maxX: 7, minZ: -5, maxZ: 5, y: 0 },
  // Piso 2: losa completa menos el hueco de la escalera A (x -6.85..-0.9 en la banda)
  { minX: -7, maxX: 7, minZ: -5, maxZ: ST_Z0, y: 3.5 },
  { minX: -0.9, maxX: 7, minZ: ST_Z0, maxZ: 5, y: 3.5 },
  // Piso 3: losa completa menos el hueco de la escalera B (x 0.9..6.85 en la banda)
  { minX: -7, maxX: 7, minZ: -5, maxZ: ST_Z0, y: 7.0 },
  { minX: -7, maxX: 0.9, minZ: ST_Z0, maxZ: 5, y: 7.0 },
  // Rampas (la superficie de las escaleras)
  { minX: -6.3, maxX: -0.9, minZ: ST_Z0, maxZ: ST_Z1, ramp: true, ...RAMP_A },
  { minX: 0.9, maxX: 6.3, minZ: ST_Z0, maxZ: ST_Z1, ramp: true, ...RAMP_B },
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
  { minX: -7.15, maxX: 7.15, minY: 0, maxY: TOP, minZ: 4.85, maxZ: 5.15 },   // fondo
  { minX: -7.15, maxX: 7.15, minY: 0, maxY: TOP, minZ: -5.15, maxZ: -4.85 }, // frente
  { minX: -7.15, maxX: -6.85, minY: 0, maxY: TOP, minZ: -5, maxZ: 5 },       // oeste
  { minX: 6.85, maxX: 7.15, minY: 0, maxY: TOP, minZ: -5, maxZ: 5 },         // este
  // Barandas en los bordes de los huecos de escalera
  { minX: -6.85, maxX: -0.9, minY: 3.5, maxY: 4.6, minZ: 3.25, maxZ: 3.35 }, // piso 2
  { minX: 0.9, maxX: 6.85, minY: 7.0, maxY: 8.1, minZ: 3.25, maxZ: 3.35 },   // piso 3
];
export function getColliders() { return colliders; }

export const SPAWN = new THREE.Vector3(0, 0, -2.5);

// ---- Construcción visual ---------------------------------------------------
function box(w, h, d, x, y, z, mat) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y, z);
  return m;
}

function buildStair(group, ramp, stepMat) {
  const rise = ramp.y1 - ramp.y0;
  const steps = 14;
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
  const mat = new THREE.MeshStandardMaterial({ color: 0x4a4038, roughness: 0.6, metalness: 0.4 });
  const len = maxX - minX;
  const bar = box(len, 0.07, 0.07, (minX + maxX) / 2, y + 1.05, z, mat);
  group.add(bar);
  const posts = Math.max(2, Math.round(len / 1.2));
  for (let i = 0; i <= posts; i++) {
    group.add(box(0.06, 1.05, 0.06, minX + (len * i) / posts, y + 0.525, z, mat));
  }
}

export function buildBuilding(scene) {
  const group = new THREE.Group();

  const floorMat = new THREE.MeshStandardMaterial({ map: concreteFloor(7, 5), roughness: 0.95 });
  const wallMat = new THREE.MeshStandardMaterial({ map: plasterWall(6, 2), roughness: 1.0 });
  const wallMatSide = new THREE.MeshStandardMaterial({ map: plasterWall(4, 2), roughness: 1.0 });
  const ceilMat = new THREE.MeshStandardMaterial({ map: concreteCeiling(7, 5), roughness: 1.0 });
  const stepMat = new THREE.MeshStandardMaterial({ map: stairConcrete(1, 1), roughness: 0.95 });
  const glowMat = new THREE.MeshBasicMaterial({ map: windowGlow() });

  // Losa piso 1 (contrapiso)
  group.add(box(W, SLAB, D, 0, -SLAB / 2, 0, floorMat));

  // Losas pisos 2 y 3 (con hueco de escalera) + cara inferior = cielorraso
  // Piso 2: hueco x -6.85..-0.9 en banda z 3.3..5
  for (const [y, holeMinX, holeMaxX] of [
    [3.5, -6.85, -0.9],
    [7.0, 0.9, 6.85],
  ]) {
    // pieza principal (z -5..3.3)
    group.add(box(W, SLAB, ST_Z0 + 5, 0, y - SLAB / 2, (ST_Z0 - 5) / 2, floorMat));
    // banda del fondo, partes a los costados del hueco
    if (holeMinX > -7) {
      const w = holeMinX + 7;
      group.add(box(w, SLAB, 5 - ST_Z0, -7 + w / 2, y - SLAB / 2, (ST_Z0 + 5) / 2, floorMat));
    }
    if (holeMaxX < 7) {
      const w = 7 - holeMaxX;
      group.add(box(w, SLAB, 5 - ST_Z0, 7 - w / 2, y - SLAB / 2, (ST_Z0 + 5) / 2, floorMat));
    }
  }
  // Losa de techo
  group.add(box(W, SLAB, D, 0, TOP + SLAB / 2, 0, ceilMat));

  // Paredes exteriores
  group.add(box(W + WALL_T * 2, TOP, WALL_T, 0, TOP / 2, 5 + WALL_T / 2, wallMat));   // fondo
  group.add(box(W + WALL_T * 2, TOP, WALL_T, 0, TOP / 2, -5 - WALL_T / 2, wallMat));  // frente
  group.add(box(WALL_T, TOP, D, -7 - WALL_T / 2, TOP / 2, 0, wallMatSide));           // oeste
  group.add(box(WALL_T, TOP, D, 7 + WALL_T / 2, TOP / 2, 0, wallMatSide));            // este

  // Aberturas del frente (planos "vidriera" con luz falsa PS2, cara interior)
  const front = -4.83;
  const vidriera = new THREE.Mesh(new THREE.PlaneGeometry(6, 2.6), glowMat);
  vidriera.position.set(0, 1.45, front);
  group.add(vidriera); // vidriera del local, piso 1
  for (const fy of [3.5, 7.0]) {
    for (const wx of [-3.5, 3.5]) {
      const win = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 1.5), glowMat);
      win.position.set(wx, fy + 1.7, front);
      group.add(win);
    }
  }

  // Escaleras
  buildStair(group, RAMP_A, stepMat);
  buildStair(group, RAMP_B, stepMat);

  // Barandas de los huecos
  buildRail(group, -6.85, -0.9, 3.5, 3.3);
  buildRail(group, 0.9, 6.85, 7.0, 3.3);

  scene.add(group);
  return group;
}

// Luces cálidas por piso + relleno general.
export function buildLights(scene) {
  scene.add(new THREE.HemisphereLight(0xf5e3c0, 0x4a3826, 0.75));
  for (const fy of FLOOR_YS) {
    for (const lx of [-3.5, 3.5]) {
      const p = new THREE.PointLight(0xffd9a0, 26, 14, 2);
      p.position.set(lx, fy + 2.9, 0);
      scene.add(p);
    }
  }
}
