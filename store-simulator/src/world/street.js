// INTRO del simulador: la vereda/galería real de Burela 2570 (referencia del
// dueño: fotos de Street View + fotos de su local real). Es una galería
// comercial en la planta baja de una torre — columnas sosteniendo el piso de
// arriba, locales cerrados con persiana verde a los costados, y el local de
// FOURTWENTY (el único que se puede abrir) en el medio.
//
// Todo esto vive en SU PROPIO sistema de coordenadas, independiente del
// "shopping" de 5 pisos (world/building.js y compañía) — ese queda desconectado
// por ahora; se reengancha cuando hagamos la carga de mapa a la escalera
// mecánica (ver comentario grande al final del archivo).
import * as THREE from 'three';
import { towerFacade, plasterWall, pavement, greenShutter, whiteFloor, lightCeiling } from './textures.js';
import { box, smoothTexture } from './gfxUtils.js';

// ---- Medidas (metros) -------------------------------------------------------
const ROW_HALF = 12;        // fachada de locales: x -12..12 (24m, 5 locales de 4.8m)
const UNIT_W = 24 / 5;
const FACADE_Z = 0;         // línea de vidrieras/persianas
const PLAZA_DEPTH = 10;     // vereda/plaza hacia el frente (z: 0..10)
const CANOPY_Z = 3.2;       // hasta dónde vuela el techo de la galería
const CANOPY_Y = 3.4;       // altura del techo de la galería
const DOOR_H = 2.6;         // alto de los locales (persiana/vidriera)
const TOWER_Y0 = CANOPY_Y;  // la torre arranca arriba del techo de la galería

// Local del medio (índice 2 de 5) = FOURTWENTY.
const FT_INDEX = 2;
const FT_X0 = -ROW_HALF + FT_INDEX * UNIT_W;
const FT_X1 = FT_X0 + UNIT_W;
export const FT_CENTER_X = (FT_X0 + FT_X1) / 2;

// Local chico de FOURTWENTY, detrás de la fachada (z negativo = adentro).
const ROOM_W = 5, ROOM_D = 6, ROOM_H = 3;
const ROOM_X0 = FT_CENTER_X - ROOM_W / 2, ROOM_X1 = FT_CENTER_X + ROOM_W / 2;
const ROOM_Z0 = -ROOM_D, ROOM_Z1 = 0;
// Hueco atrás-derecha: acá va a entrar la carga de mapa al shopping (Fase
// futura). Por ahora queda abierto y vacío, con un tope más atrás para no
// caminar al vacío.
const GAP_X0 = FT_CENTER_X + 0.3, GAP_X1 = ROOM_X1;
const GAP_STUB = 2; // cuánto piso "de más" hay antes del tope invisible

export const SPAWN = new THREE.Vector3(0, 0, 6); // aparece en la plaza, mirando al local

// Límites de toda la escena (plaza + local chico) para el clamp de la cámara.
export const STREET_BOUNDS = {
  minX: -ROW_HALF - 2.8, maxX: ROW_HALF + 2.8,
  minZ: ROOM_Z0 - GAP_STUB - 0.3, maxZ: PLAZA_DEPTH + 1.6,
};
export const CEILING_H = CANOPY_Y; // 3.4 — sirve tanto afuera (bajo el techo) como adentro

// ---- Ayudantes --------------------------------------------------------------
function neonFT(scene, x, y, z, rotY) {
  const c = document.createElement('canvas');
  c.width = 1024; c.height = 160;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#141416';
  ctx.fillRect(0, 0, 1024, 160);
  ctx.strokeStyle = '#2c2c30';
  ctx.lineWidth = 6;
  ctx.strokeRect(3, 3, 1018, 154);
  ctx.font = 'bold 92px monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.shadowColor = '#39ff6a';
  for (const blur of [30, 16, 7]) {
    ctx.shadowBlur = blur;
    ctx.fillStyle = '#39ff6a';
    ctx.fillText('FOURTWENTY', 512, 84);
  }
  ctx.shadowBlur = 0;
  ctx.fillStyle = '#eafff0';
  ctx.fillText('FOURTWENTY', 512, 84);
  const tex = smoothTexture(new THREE.CanvasTexture(c));

  const group = new THREE.Group();
  const frame = box(5.2, 0.85, 0.15, 0, 0, -0.08, new THREE.MeshStandardMaterial({ color: 0x1a1a1e, roughness: 0.4, metalness: 0.6 }));
  group.add(frame);
  const face = new THREE.Mesh(new THREE.PlaneGeometry(5, 0.7), new THREE.MeshBasicMaterial({ map: tex }));
  group.add(face);
  group.position.set(x, y, z);
  group.rotation.y = rotY;
  scene.add(group);
  const glow = new THREE.PointLight(0x39ff6a, 5, 5, 2);
  glow.position.set(x, y, z + (rotY === 0 ? -0.6 : 0.6));
  scene.add(glow);
}

function tree(scene, x, z) {
  const trunk = new THREE.Mesh(
    new THREE.CylinderGeometry(0.12, 0.16, 2.2, 8),
    new THREE.MeshStandardMaterial({ color: 0x5a4230, roughness: 0.9 }),
  );
  trunk.position.set(x, 1.1, z);
  trunk.castShadow = true;
  scene.add(trunk);
  const leafMat = new THREE.MeshStandardMaterial({ color: 0x4c7a3a, roughness: 0.85 });
  for (const [dy, s] of [[0, 1.3], [0.5, 1.0], [-0.4, 1.05]]) {
    const leaf = new THREE.Mesh(new THREE.IcosahedronGeometry(s, 0), leafMat);
    leaf.position.set(x + (Math.random() - 0.5) * 0.4, 2.3 + dy, z + (Math.random() - 0.5) * 0.4);
    leaf.castShadow = true;
    scene.add(leaf);
  }
}

function planter(scene, colliders, x, z, w, d) {
  const brick = new THREE.MeshStandardMaterial({ color: 0x8a4a3a, roughness: 0.9 });
  const dirt = new THREE.MeshStandardMaterial({ color: 0x3a2e22, roughness: 1 });
  scene.add(box(w, 0.4, d, x, 0.2, z, brick));
  scene.add(box(w - 0.15, 0.08, d - 0.15, x, 0.44, z, dirt));
  colliders.push({ minX: x - w / 2, maxX: x + w / 2, minY: 0, maxY: 0.4, minZ: z - d / 2, maxZ: z + d / 2 });
}

// ---- Construcción ------------------------------------------------------------
export function buildStreet(scene) {
  const colliders = [];

  const paveMat = new THREE.MeshStandardMaterial({ map: pavement(12, 6), roughness: 0.95 });
  const towerMat = new THREE.MeshStandardMaterial({ map: towerFacade(10, 4), roughness: 0.9 });
  const fasciaMat = new THREE.MeshStandardMaterial({ color: 0xd8d2c4, roughness: 0.85 });
  const colMat = new THREE.MeshStandardMaterial({ color: 0xe7e2d6, roughness: 0.7 });
  const shutterMat = new THREE.MeshStandardMaterial({ map: greenShutter(2, 1), roughness: 0.6, metalness: 0.3 });
  const glassMat = new THREE.MeshPhysicalMaterial({ color: 0x203040, roughness: 0.1, metalness: 0.2, transparent: true, opacity: 0.55 });

  // Vereda/plaza: piso pavimentado hasta el cordón, calle más allá.
  const plaza = new THREE.Mesh(new THREE.PlaneGeometry(ROW_HALF * 2 + 6, PLAZA_DEPTH + 2), paveMat);
  plaza.rotation.x = -Math.PI / 2;
  plaza.position.set(0, 0, PLAZA_DEPTH / 2);
  plaza.receiveShadow = true;
  scene.add(plaza);
  const street = new THREE.Mesh(
    new THREE.PlaneGeometry(ROW_HALF * 2 + 20, 6),
    new THREE.MeshStandardMaterial({ color: 0x3a3a3c, roughness: 0.95 }),
  );
  street.rotation.x = -Math.PI / 2;
  street.position.set(0, -0.01, PLAZA_DEPTH + 3);
  scene.add(street);

  // Torre de fondo (arriba del techo de la galería) — solo decorado, sin colisión.
  scene.add(box(ROW_HALF * 2 + 6, 26, 0.4, 0, TOWER_Y0 + 13, -0.6, towerMat));

  // Techo de la galería (vuela sobre la vereda) + columnas.
  const canopy = box(ROW_HALF * 2 + 1, 0.3, CANOPY_Z + 0.4, 0, CANOPY_Y + 0.15, CANOPY_Z / 2 - 0.2, fasciaMat);
  canopy.castShadow = true;
  scene.add(canopy);
  for (let x = -ROW_HALF + 1; x <= ROW_HALF - 1 + 0.01; x += (ROW_HALF * 2 - 2) / 5) {
    const col = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.22, CANOPY_Y, 12), colMat);
    col.position.set(x, CANOPY_Y / 2, CANOPY_Z - 0.15);
    col.castShadow = true;
    scene.add(col);
    colliders.push({ minX: x - 0.24, maxX: x + 0.24, minY: 0, maxY: CANOPY_Y, minZ: CANOPY_Z - 0.4, maxZ: CANOPY_Z + 0.1 });
  }

  // Locales: 5 unidades, pilastras entre ellas, el del medio (FOURTWENTY) abierto.
  const pilasterMat = new THREE.MeshStandardMaterial({ color: 0xcfc9ba, roughness: 0.8 });
  for (let i = 0; i <= 5; i++) {
    const x = -ROW_HALF + i * UNIT_W;
    const pilaster = box(0.22, DOOR_H, 0.3, x, DOOR_H / 2, FACADE_Z + 0.1, pilasterMat);
    pilaster.castShadow = true;
    scene.add(pilaster);
  }
  const signBand = box(ROW_HALF * 2, 0.7, 0.25, 0, DOOR_H + 0.35, FACADE_Z + 0.1, fasciaMat); // fascia arriba de las puertas
  signBand.castShadow = true;
  scene.add(signBand);

  for (let i = 0; i < 5; i++) {
    const x0 = -ROW_HALF + i * UNIT_W, x1 = x0 + UNIT_W;
    const cx = (x0 + x1) / 2, w = UNIT_W - 0.3;
    if (i === FT_INDEX) {
      // FOURTWENTY: puerta de vidrio abierta (sin persiana, sin collider) + neón
      const glassX = cx - w * 0.27;
      const glass = new THREE.Mesh(new THREE.PlaneGeometry(w * 0.5, DOOR_H - 0.3), glassMat);
      glass.position.set(glassX, (DOOR_H - 0.3) / 2, FACADE_Z + 0.08);
      scene.add(glass);
      // la hoja fija de vidrio bloquea; la otra mitad queda libre para entrar
      colliders.push({ minX: glassX - w * 0.25, maxX: glassX + w * 0.25, minY: 0, maxY: DOOR_H - 0.3, minZ: FACADE_Z, maxZ: FACADE_Z + 0.2 });
      neonFT(scene, cx, DOOR_H + 0.35, FACADE_Z + 0.09, 0);
      continue;
    }
    const shutter = box(w, DOOR_H, 0.12, cx, DOOR_H / 2, FACADE_Z + 0.08, shutterMat);
    shutter.castShadow = true;
    shutter.receiveShadow = true;
    scene.add(shutter);
    colliders.push({ minX: x0 + 0.1, maxX: x1 - 0.1, minY: 0, maxY: DOOR_H, minZ: FACADE_Z, maxZ: FACADE_Z + 0.2 });
  }

  // Límites de la plaza: paredes laterales y el cordón/calle al frente.
  colliders.push({ minX: -ROW_HALF - 3.2, maxX: -ROW_HALF - 2.8, minY: 0, maxY: 3, minZ: -1, maxZ: PLAZA_DEPTH });
  colliders.push({ minX: ROW_HALF + 2.8, maxX: ROW_HALF + 3.2, minY: 0, maxY: 3, minZ: -1, maxZ: PLAZA_DEPTH });
  colliders.push({ minX: -ROW_HALF - 3, maxX: ROW_HALF + 3, minY: 0, maxY: 3, minZ: PLAZA_DEPTH + 1.6, maxZ: PLAZA_DEPTH + 2 });

  // Verde: un par de árboles y canteros de ladrillo, como en las fotos.
  tree(scene, -6, 6.5);
  tree(scene, 7.5, 7.5);
  planter(scene, colliders, -6, 6.5, 2.2, 1.6);
  planter(scene, colliders, 7.5, 7.5, 2.0, 1.5);

  // Luz general de calle (de día, pareja) + una cálida sobre la entrada.
  scene.add(new THREE.HemisphereLight(0xdfe6ea, 0x9a9488, 1.1));
  const sun = new THREE.DirectionalLight(0xfff4e0, 1.4);
  sun.position.set(10, 20, 8);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  sun.shadow.camera.left = -20; sun.shadow.camera.right = 20;
  sun.shadow.camera.top = 20; sun.shadow.camera.bottom = -20;
  sun.shadow.camera.far = 40;
  scene.add(sun);

  buildLocalInterior(scene, colliders);

  return colliders;
}

// ---- Local de FOURTWENTY (adentro) ------------------------------------------
// Solo la ESTRUCTURA (paredes/piso/techo) — sin muebles todavía, el dueño
// manda esos assets después. El hueco atrás-derecha queda abierto: ahí va a
// entrar la carga de mapa al "shopping" de 5 pisos (escalera mecánica) más
// adelante; por ahora no hay nada cargado detrás, solo un poco de piso de
// más y un tope invisible para no caminar al vacío.
function buildLocalInterior(scene, colliders) {
  const floorMat = new THREE.MeshStandardMaterial({ map: whiteFloor(ROOM_W / 2, ROOM_D / 2), roughness: 0.85 });
  const wallMat = new THREE.MeshStandardMaterial({ map: plasterWall(ROOM_W / 2, 2), roughness: 1 });
  const ceilMat = new THREE.MeshStandardMaterial({ map: lightCeiling(ROOM_W / 2, ROOM_D / 2), roughness: 1 });
  const WALL_T = 0.2;

  const roomFloor = box(ROOM_W, 0.1, ROOM_D + GAP_STUB, FT_CENTER_X, -0.05, (ROOM_Z0 + ROOM_Z1) / 2 - GAP_STUB / 2, floorMat);
  const roomCeil = box(ROOM_W, WALL_T, ROOM_D, FT_CENTER_X, ROOM_H, (ROOM_Z0 + ROOM_Z1) / 2, ceilMat);
  const wallLeft = box(WALL_T, ROOM_H, ROOM_D, ROOM_X0, ROOM_H / 2, (ROOM_Z0 + ROOM_Z1) / 2, wallMat);
  const wallRight = box(WALL_T, ROOM_H, ROOM_D, ROOM_X1, ROOM_H / 2, (ROOM_Z0 + ROOM_Z1) / 2, wallMat);
  colliders.push({ minX: ROOM_X0 - WALL_T, maxX: ROOM_X0, minY: 0, maxY: ROOM_H, minZ: ROOM_Z0, maxZ: ROOM_Z1 });
  colliders.push({ minX: ROOM_X1, maxX: ROOM_X1 + WALL_T, minY: 0, maxY: ROOM_H, minZ: ROOM_Z0, maxZ: ROOM_Z1 });

  // pared del fondo: SOLO la parte izquierda — la derecha queda como hueco
  // (futuro acceso al shopping). GAP_X0..GAP_X1 no lleva pared.
  const leftW = GAP_X0 - ROOM_X0;
  const wallBack = box(leftW, ROOM_H, WALL_T, ROOM_X0 + leftW / 2, ROOM_H / 2, ROOM_Z0, wallMat);
  colliders.push({ minX: ROOM_X0, maxX: GAP_X0, minY: 0, maxY: ROOM_H, minZ: ROOM_Z0 - WALL_T, maxZ: ROOM_Z0 });

  // tope invisible más atrás del hueco (para no caminar al vacío sin cargar nada)
  colliders.push({ minX: GAP_X0, maxX: GAP_X1, minY: 0, maxY: ROOM_H, minZ: ROOM_Z0 - GAP_STUB - 0.3, maxZ: ROOM_Z0 - GAP_STUB });

  // sombra: que el sol de afuera NO entre a bañar el local — paredes/techo la
  // proyectan y el piso la recibe, así se siente un interior de verdad.
  for (const m of [roomFloor, roomCeil, wallLeft, wallRight, wallBack]) {
    m.castShadow = true;
    m.receiveShadow = true;
    scene.add(m);
  }

  // sin luz ambiental propia (ya hay una global afuera — sumar otra lava la
  // escena a blanco): solo un foco cálido puntual, suave.
  const lamp = new THREE.PointLight(0xffe9c4, 3.5, 6, 2);
  lamp.position.set(FT_CENTER_X, ROOM_H - 0.3, (ROOM_Z0 + ROOM_Z1) / 2);
  scene.add(lamp);
}

// ---- Zona para el HUD --------------------------------------------------------
// true si la posición está adentro del local (para mostrar "FOURTWENTY" en
// vez de "CALLE BURELA" en el cartel de zona).
export function isInsideLocal(pos) {
  return pos.z < FACADE_Z - 0.3;
}

// ═══════════════════════════════════════════════════════════════════════════
// NOTA PARA MÁS ADELANTE (no implementado todavía, a propósito):
// El hueco atrás-derecha del local (GAP_X0..GAP_X1, detrás de ROOM_Z0) es
// donde va a ir la carga de mapa hacia el "shopping" de 5 pisos que ya está
// construido en world/building.js + retail.js + gallery.js + signage.js +
// collections.js + layout.js (con escalera mecánica en vez de escaleras,
// pendiente de convertir). Ese mundo no se toca ni se borra: main.js
// simplemente no lo llama todavía. Cuando se implemente el trigger, lo
// natural es: al pisar el hueco, hacer fade a negro, destruir/ocultar esta
// escena y llamar a buildBuilding/buildRetail/etc. como la escena activa.
// ═══════════════════════════════════════════════════════════════════════════
