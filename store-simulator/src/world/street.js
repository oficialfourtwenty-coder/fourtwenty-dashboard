// INTRO del simulador: exterior real del complejo de Burela 2570 (Villa
// Urquiza), reconstruido según el spec de art-direction del dueño
// (design/SPEC_MAPA_BURELA.md). El jugador spawnea en la vereda, camina hasta
// los límites (paredes invisibles), sube los ESCALONES a la galería porticada
// y entra al local FOURTWENTY (Torre 1, el del medio).
//
// Ejes (spec): 1 unidad = 1 m · Y arriba · +Z hacia la calle · origen = pie de
// los escalones, frente al local. O sea: la galería/local están en -Z, la
// vereda y la calle en +Z.
//
// Este mundo es independiente del "shopping" de 5 pisos (world/building.js y
// compañía), que queda construido pero desconectado hasta la carga de mapa
// (ver nota al final del archivo).
import * as THREE from 'three';
import { towerFacade, veredaTile, hexPaver, greenShutter, whiteFloor, lightWood } from './textures.js';
import { box } from './gfxUtils.js';
import { garmentTexture } from './gallery.js';
import { addBurelaTowers } from './burelaTowers.js';

// ---- Paleta del spec (albedo base) ------------------------------------------
const SALVIA = 0x8C9A78;   // columnas / alero
const INGLES = 0x2F5A3A;   // carpintería de vidriera
const CREMA = 0xE1DDC6;    // revoque
const HORMIGON = 0xB4AEA2; // escalones / vereda
const MURETE = 0x96583F;   // jardineras
const REJA = 0x3E6B60;     // barandas / reja patio

const mat = (hex, rough = 0.85, metal = 0) =>
  new THREE.MeshStandardMaterial({ color: hex, roughness: rough, metalness: metal });

// ---- Medidas (spec 09) ------------------------------------------------------
const PLAT = 0.45;          // altura de la plataforma/galería sobre la vereda
const STEP_RISE = 0.15, STEP_RUN = 0.32; // contrahuella / huella
const GAL_DEPTH = 3.5;      // profundidad de la galería
const H_LIBRE = 3.2;        // altura libre bajo el alero
const EJE_COL = 4.5;        // eje a eje de columnas
const COL = 0.4;            // sección de columna
const ALERO_T = 0.35, ALERO_VUELO = 1.5;
const FRENTE = 14;          // medio-frente base usado para proporciones del kit

// Z clave (de la calle -de +Z- hacia el fondo -de -Z-)
const Z_STREET = 8;         // arranca la calzada
const Z_CURB = 7.4;         // cordón (límite: no se baja a la calle)
const Z_STEP_FOOT = 0;      // pie de los escalones = ORIGEN
const Z_STEP_TOP = -3 * STEP_RUN;      // -0.96: arriba del 3er escalón
const Z_FACADE = -0.96 - GAL_DEPTH;    // -4.46: línea de vidrieras del fondo de la galería
const Z_LOCAL_BACK = Z_FACADE - 6;     // -10.46: fondo del local

// Área caminable de la mesa de trabajo: x2 respecto del mapa inicial.
const MAP_SCALE = 2;
const MAP_HALF_X = FRENTE * MAP_SCALE;
const MAP_MIN_Z = Z_LOCAL_BACK * MAP_SCALE;
const MAP_MAX_Z = Z_CURB * MAP_SCALE;

// Local FOURTWENTY: centrado en x=0, vidriera de 5.5m.
const VID_W = 5.5;
const LOCAL_HALF = 3.0;     // medio-ancho del interior (x -3..3)
export const SPAWN = new THREE.Vector3(0, 0, 6); // vereda, mirando a la galería (-Z)

// Hueco atrás-derecha del local: futuro acceso al shopping (ver nota final).
const GAP_X0 = 0.4, GAP_X1 = LOCAL_HALF, GAP_STUB = 2;

// Límites para el clamp de la cámara (afuera: toda la escena; adentro: el local).
export const STREET_BOUNDS = { minX: -MAP_HALF_X - 0.5, maxX: MAP_HALF_X + 0.5, minZ: MAP_MIN_Z, maxZ: MAP_MAX_Z };
export const LOCAL_BOUNDS = { minX: -LOCAL_HALF, maxX: LOCAL_HALF, minZ: Z_LOCAL_BACK, maxZ: Z_FACADE };
export const CEILING_OUT = 6.0;   // afuera la cámara puede subir (cielo abierto)
export const CEILING_IN = H_LIBRE; // adentro, bajo techo

// ---- Altura del piso: la escena provee su propia sampleGround ---------------
// Vereda/plaza a y=0; rampa invisible a ~26° sobre los 3 escalones (spec 02);
// galería/local a y=PLAT.
export function streetSampleGround(x, z) {
  if (z >= Z_STEP_FOOT) return 0;              // vereda y plaza
  if (z <= Z_STEP_TOP) return PLAT;            // galería y local
  const t = (Z_STEP_FOOT - z) / (Z_STEP_FOOT - Z_STEP_TOP); // 0..1 sobre la rampa
  return PLAT * t;
}

export function isInsideLocal(pos) {
  return pos.z < Z_FACADE;
}

// ---- Ayudantes decorativos --------------------------------------------------
function neonFT(scene, x, y, z) {
  const c = document.createElement('canvas');
  c.width = 1024; c.height = 160;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#141416'; ctx.fillRect(0, 0, 1024, 160);
  ctx.strokeStyle = '#2c2c30'; ctx.lineWidth = 6; ctx.strokeRect(3, 3, 1018, 154);
  ctx.font = 'bold 92px monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.shadowColor = '#39ff6a';
  for (const blur of [30, 16, 7]) { ctx.shadowBlur = blur; ctx.fillStyle = '#39ff6a'; ctx.fillText('FOURTWENTY', 512, 84); }
  ctx.shadowBlur = 0; ctx.fillStyle = '#eafff0'; ctx.fillText('FOURTWENTY', 512, 84);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
  const group = new THREE.Group();
  group.add(box(5.2, 0.85, 0.15, 0, 0, -0.08, mat(0x1a1a1e, 0.4, 0.6)));
  group.add(new THREE.Mesh(new THREE.PlaneGeometry(5, 0.7), new THREE.MeshBasicMaterial({ map: tex })));
  group.position.set(x, y, z + 0.09);
  scene.add(group);
  const glow = new THREE.PointLight(0x39ff6a, 5, 5, 2);
  glow.position.set(x, y, z + 0.5);
  scene.add(glow);
}

function tree(scene, x, z, pink = false) {
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.2, 4.5, 8), mat(0x5a4230, 0.9));
  trunk.position.set(x, 2.25, z); trunk.castShadow = true; scene.add(trunk);
  const leafMat = mat(pink ? 0xe8b8cf : 0x4c7a3a, 0.85);
  for (const [dx, dy, dz, s] of [[0, 4.6, 0, 1.6], [0.6, 4.2, 0.3, 1.2], [-0.5, 4.3, -0.4, 1.3], [0.2, 5.2, -0.2, 1.1]]) {
    const leaf = new THREE.Mesh(new THREE.IcosahedronGeometry(s, 0), leafMat);
    leaf.position.set(x + dx, dy, z + dz); leaf.castShadow = true; scene.add(leaf);
  }
  // alcorque cuadrado (spec 07)
  scene.add(box(1.2, 0.05, 1.2, x, 0.025, z, mat(0x6b5a44, 1)));
}

// Cantero de ladrillo con vegetación (spec 07): murete #96583F, alto 0.50.
function planter(scene, colliders, x, z, w, d) {
  const g = new THREE.Group();
  g.add(box(w, 0.5, d, x, 0.25, z, mat(MURETE, 0.9)));
  g.add(box(w - 0.15, 0.06, d - 0.15, x, 0.5, z, mat(0x3a2e22, 1))); // tierra
  // matas: agapantos (tufts verdes acintados) + arbusto redondo
  for (let i = 0; i < Math.floor(w * d); i++) {
    const bx = x + (Math.random() - 0.5) * (w - 0.4);
    const bz = z + (Math.random() - 0.5) * (d - 0.4);
    const bush = new THREE.Mesh(new THREE.IcosahedronGeometry(0.28 + Math.random() * 0.15, 0), mat(0x5c8a45, 0.9));
    bush.position.set(bx, 0.7, bz); bush.castShadow = true; g.add(bush);
  }
  scene.add(g);
  colliders.push({ minX: x - w / 2, maxX: x + w / 2, minY: 0, maxY: 0.5, minZ: z - d / 2, maxZ: z + d / 2 });
}

// Planta cannábica estilizada (ref: plano del dueño, marca FOURTWENTY): hoja
// de abanico dibujada en canvas sobre planos cruzados (truco de follaje, barato
// y reconocible). Textura compartida entre todas las plantas.
let _cannaTex = null;
function cannabisLeafTexture() {
  const c = document.createElement('canvas'); c.width = 128; c.height = 128;
  const ctx = c.getContext('2d');
  ctx.translate(64, 122);
  ctx.fillStyle = '#3f7a2c';
  const angs = [-1.1, -0.72, -0.36, 0, 0.36, 0.72, 1.1];
  const lens = [52, 78, 100, 114, 100, 78, 52];
  angs.forEach((a, i) => {
    ctx.save(); ctx.rotate(a);
    ctx.beginPath(); ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(11, -lens[i] * 0.5, 0, -lens[i]);
    ctx.quadraticCurveTo(-11, -lens[i] * 0.5, 0, 0);
    ctx.fill(); ctx.restore();
  });
  ctx.fillStyle = '#2f5a22'; ctx.fillRect(-2, 0, 4, 6);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  return t;
}
function cannabisPlant(scene, x, z, y = 0) {
  if (!_cannaTex) _cannaTex = cannabisLeafTexture();
  const g = new THREE.Group();
  g.add(box(0.03, 0.35, 0.03, 0, 0.17, 0, mat(0x2f5a22, 0.9))); // tallo
  const geo = new THREE.PlaneGeometry(0.55, 0.6); geo.translate(0, 0.32, 0);
  const m = new THREE.MeshStandardMaterial({ map: _cannaTex, transparent: true, alphaTest: 0.4, side: THREE.DoubleSide, roughness: 0.9 });
  for (const r of [0, Math.PI / 3, -Math.PI / 3]) { const p = new THREE.Mesh(geo, m); p.rotation.y = r; p.castShadow = true; g.add(p); }
  g.position.set(x, y, z); scene.add(g);
}

// Torre de fondo: volumen ÚNICO con su propia textura de fachada a escala
// (bandas ladrillo/crema sin estirar). Separadas entre sí dejan cielo en medio,
// así el fondo NO se ve como una tira repetida. Solo decoración (sin colisión).
function towerBlock(scene, x, z, w, d, h, baseY) {
  const rx = Math.max(2, Math.round(w / 2.4));
  const ry = Math.max(4, Math.round(h / 2.4));
  const m = new THREE.MeshStandardMaterial({ map: towerFacade(rx, ry), roughness: 0.9 });
  const t = box(w, h, d, x, baseY + h / 2, z, m);
  t.castShadow = true;
  scene.add(t);
}

function markKitTemplate(object, name, { collider = true } = {}) {
  object.name = `KIT · ${name}`;
  object.visible = false;
  object.userData.cityKit = true;
  object.userData.editorCollider = collider;
  object.traverse?.((child) => {
    if (child !== object) child.userData.editorHelper = true;
  });
  return object;
}

function kitGroup(name, children, options) {
  const group = new THREE.Group();
  for (const child of children) group.add(child);
  return markKitTemplate(group, name, options);
}

function kitMesh(name, mesh, options) {
  mesh.name = `KIT · ${name}`;
  mesh.visible = false;
  mesh.userData.cityKit = true;
  mesh.userData.editorCollider = options?.collider !== false;
  return mesh;
}

function kitNeonSign() {
  const c = document.createElement('canvas');
  c.width = 1024;
  c.height = 220;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#151518';
  ctx.fillRect(0, 0, c.width, c.height);
  ctx.strokeStyle = '#ff6d18';
  ctx.lineWidth = 8;
  ctx.strokeRect(10, 10, c.width - 20, c.height - 20);
  ctx.font = '900 108px monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.shadowColor = '#39ff6a';
  for (const blur of [34, 18, 8]) {
    ctx.shadowBlur = blur;
    ctx.fillStyle = '#39ff6a';
    ctx.fillText('FOURTWENTY', 512, 112);
  }
  ctx.shadowBlur = 0;
  ctx.fillStyle = '#f4fff2';
  ctx.fillText('FOURTWENTY', 512, 112);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;

  return kitGroup('Cartel neon FOURTWENTY', [
    box(5.4, 1.1, 0.12, 0, 0.55, -0.05, mat(0x151518, 0.45, 0.3)),
    new THREE.Mesh(new THREE.PlaneGeometry(5.2, 1.02), new THREE.MeshBasicMaterial({ map: tex })),
  ]);
}

function kitTree(name = 'Arbol') {
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.22, 3.7, 8), mat(0x5a4230, 0.9));
  trunk.position.set(0, 1.85, 0);
  const leafMat = mat(0x4f7c3d, 0.88);
  const leaves = [[0, 3.9, 0, 1.35], [0.55, 3.55, 0.2, 1.05], [-0.5, 3.6, -0.25, 1.1], [0.1, 4.35, -0.15, 0.95]]
    .map(([x, y, z, s]) => {
      const leaf = new THREE.Mesh(new THREE.IcosahedronGeometry(s, 0), leafMat);
      leaf.position.set(x, y, z);
      return leaf;
    });
  return kitGroup(name, [trunk, ...leaves]);
}

function kitCannabisPlant() {
  if (!_cannaTex) _cannaTex = cannabisLeafTexture();
  const stem = box(0.04, 0.45, 0.04, 0, 0.225, 0, mat(0x2f5a22, 0.9));
  const geo = new THREE.PlaneGeometry(0.65, 0.72);
  geo.translate(0, 0.36, 0);
  const leafMat = new THREE.MeshStandardMaterial({
    map: _cannaTex,
    transparent: true,
    alphaTest: 0.4,
    side: THREE.DoubleSide,
    roughness: 0.9,
  });
  const leaves = [0, Math.PI / 3, -Math.PI / 3].map((rot) => {
    const leaf = new THREE.Mesh(geo, leafMat);
    leaf.rotation.y = rot;
    return leaf;
  });
  return kitGroup('Planta FOURTWENTY', [stem, ...leaves]);
}

function kitCornerWall() {
  const wall = mat(CREMA, 0.85);
  return kitGroup('Esquina pared L', [
    box(4, 3, 0.18, 0, 1.5, 0, wall),
    box(0.18, 3, 4, -1.91, 1.5, -1.91, wall),
  ]);
}

function kitDoorWall() {
  const wall = mat(CREMA, 0.85);
  const frame = mat(INGLES, 0.5, 0.4);
  return kitGroup('Pared con puerta', [
    box(1.25, 3, 0.18, -1.375, 1.5, 0, wall),
    box(1.25, 3, 0.18, 1.375, 1.5, 0, wall),
    box(1.25, 0.65, 0.18, 0, 2.675, 0, wall),
    box(0.08, 2.35, 0.24, -0.65, 1.175, 0.02, frame),
    box(0.08, 2.35, 0.24, 0.65, 1.175, 0.02, frame),
    box(1.38, 0.08, 0.24, 0, 2.35, 0.02, frame),
  ]);
}

function kitCrosswalk() {
  const white = mat(0xf0eee8, 0.75);
  const stripes = [];
  for (let x = -2.5; x <= 2.5; x += 1) {
    stripes.push(box(0.55, 0.035, 3.8, x, 0.0175, 0, white));
  }
  return kitGroup('Senda peatonal', stripes, { collider: false });
}

function kitRoadSegment() {
  const asphalt = mat(0x343436, 0.96);
  const yellow = mat(0xe5b82e, 0.65);
  return kitGroup('Calle asfalto', [
    box(8, 0.05, 5, 0, 0.025, 0, asphalt),
    box(0.08, 0.06, 4.6, -0.35, 0.06, 0, yellow),
    box(0.08, 0.06, 4.6, 0.35, 0.06, 0, yellow),
  ], { collider: false });
}

function addCityKit(scene) {
  const wood = new THREE.MeshStandardMaterial({ map: lightWood(2, 2), roughness: 0.65 });
  const shutterMat = new THREE.MeshStandardMaterial({ map: greenShutter(2, 1), roughness: 0.6, metalness: 0.3 });
  const glassMat = new THREE.MeshPhysicalMaterial({ color: 0x2a3a42, roughness: 0.08, metalness: 0.1, transparent: true, opacity: 0.42 });
  const towerMat = new THREE.MeshStandardMaterial({ map: towerFacade(5, 12), roughness: 0.9 });
  const shirtMat = new THREE.MeshStandardMaterial({ map: garmentTexture(0x1c1c1c, 'tee'), transparent: true, alphaTest: 0.4, roughness: 0.9, side: THREE.DoubleSide });

  const templates = [
    kitMesh('Piso piedra extra', new THREE.Mesh(new THREE.PlaneGeometry(8, 8), new THREE.MeshStandardMaterial({ map: hexPaver(4, 4), roughness: 0.95 })), { collider: false }),
    kitMesh('Piso vereda gris', new THREE.Mesh(new THREE.PlaneGeometry(8, 4), new THREE.MeshStandardMaterial({ map: veredaTile(5, 3), roughness: 0.9 })), { collider: false }),
    kitRoadSegment(),
    kitMesh('Cordón calle', box(8, 0.16, 0.34, 0, 0.08, 0, mat(0x8a8880, 0.9)), { collider: false }),
    kitCrosswalk(),
    kitMesh('Linea calle amarilla', box(0.1, 0.035, 5, 0, 0.0175, 0, mat(0xe5b82e, 0.65)), { collider: false }),
    kitMesh('Muro crema', box(4, 3, 0.18, 0, 1.5, 0, mat(CREMA, 0.85))),
    kitMesh('Pared larga crema', box(8, 3, 0.18, 0, 1.5, 0, mat(CREMA, 0.85))),
    kitMesh('Pared corta crema', box(2, 3, 0.18, 0, 1.5, 0, mat(CREMA, 0.85))),
    kitMesh('Pared baja ladrillo', box(4, 1.05, 0.22, 0, 0.525, 0, mat(MURETE, 0.9))),
    kitMesh('Medianera alta', box(7, 5.2, 0.22, 0, 2.6, 0, mat(0xb8ad9a, 0.92))),
    kitMesh('Divisor blanco interior', box(0.18, 2.8, 3.2, 0, 1.4, 0, mat(0xf2f0ec, 0.95))),
    kitMesh('Techo losa blanca', box(5, 0.18, 4, 0, 0.09, 0, mat(0xf2f0ec, 0.95))),
    kitCornerWall(),
    kitDoorWall(),
    kitMesh('Persiana verde local', box(3.2, 2.4, 0.12, 0, 1.2, 0, shutterMat)),
    kitGroup('Vidriera verde', [
      box(3.2, 2.2, 0.08, 0, 1.1, -0.02, glassMat),
      box(3.35, 0.08, 0.12, 0, 2.2, 0, mat(INGLES, 0.5, 0.4)),
      box(3.35, 0.08, 0.12, 0, 0, 0, mat(INGLES, 0.5, 0.4)),
      box(0.08, 2.25, 0.12, -1.65, 1.1, 0, mat(INGLES, 0.5, 0.4)),
      box(0.08, 2.25, 0.12, 1.65, 1.1, 0, mat(INGLES, 0.5, 0.4)),
      box(0.05, 2.25, 0.12, 0, 1.1, 0, mat(INGLES, 0.5, 0.4)),
    ]),
    kitMesh('Columna salvia', box(COL, H_LIBRE, COL, 0, H_LIBRE / 2, 0, mat(SALVIA, 0.8))),
    kitMesh('Alero techo salvia', box(5, ALERO_T, 2.2, 0, ALERO_T / 2, 0, mat(SALVIA, 0.8))),
    kitMesh('Escalon piedra', box(4, STEP_RISE, STEP_RUN * 2, 0, STEP_RISE / 2, 0, mat(HORMIGON, 0.9))),
    kitMesh('Cantero ladrillo', box(3.2, 0.5, 1.1, 0, 0.25, 0, mat(MURETE, 0.9))),
    kitTree('Arbol verde'),
    kitCannabisPlant(),
    kitMesh('Reja verde', box(0.08, 1.25, 2.6, 0, 0.625, 0, mat(REJA, 0.5, 0.5))),
    kitNeonSign(),
    kitMesh('Torre edificio', box(5, 18, 5, 0, 9, 0, towerMat)),
    kitMesh('Mostrador madera', box(1.8, 0.95, 0.7, 0, 0.475, 0, wood)),
    kitMesh('Panel madera', box(3.4, 2.8, 0.12, 0, 1.4, 0, wood)),
    kitMesh('Remera colgada', new THREE.Mesh(new THREE.PlaneGeometry(0.58, 0.68), shirtMat)),
  ];

  for (const template of templates) {
    if (template.geometry?.type === 'PlaneGeometry') template.rotation.x = -Math.PI / 2;
    scene.add(template);
  }
}

// ---- Construcción principal -------------------------------------------------
export function buildStreet(scene) {
  const colliders = [];
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(MAP_HALF_X * 2 + 2, MAP_MAX_Z - MAP_MIN_Z + 1),
    new THREE.MeshStandardMaterial({ map: hexPaver(8, 5), roughness: 0.95 }),
  );
  floor.name = 'Piso piedra base';
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(0, 0, (MAP_MAX_Z + MAP_MIN_Z) / 2);
  floor.receiveShadow = true;
  scene.add(floor);

  addBurelaTowers(scene);
  addCityKit(scene);

  // Limites invisibles de la mesa de trabajo. Los objetos del kit son visuales:
  // se duplican y acomodan con T, sin agregar colisiones para no trabar a BOB.
  colliders.push({ minX: -MAP_HALF_X - 0.5, maxX: MAP_HALF_X + 0.5, minY: 0, maxY: 3, minZ: MAP_MAX_Z, maxZ: MAP_MAX_Z + 0.4 });
  colliders.push({ minX: -MAP_HALF_X - 0.5, maxX: -MAP_HALF_X - 0.1, minY: 0, maxY: 4, minZ: MAP_MIN_Z, maxZ: MAP_MAX_Z });
  colliders.push({ minX: MAP_HALF_X + 0.1, maxX: MAP_HALF_X + 0.5, minY: 0, maxY: 4, minZ: MAP_MIN_Z, maxZ: MAP_MAX_Z });
  colliders.push({ minX: -MAP_HALF_X - 0.5, maxX: MAP_HALF_X + 0.5, minY: 0, maxY: 4, minZ: MAP_MIN_Z - 0.4, maxZ: MAP_MIN_Z });

  scene.add(new THREE.HemisphereLight(0xbfd6ea, 0x9a9488, 0.9));
  const sun = new THREE.DirectionalLight(0xfff1d6, 2.2);
  sun.position.set(14, 16, 10);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.left = -MAP_HALF_X - 4; sun.shadow.camera.right = MAP_HALF_X + 4;
  sun.shadow.camera.top = 36; sun.shadow.camera.bottom = -36;
  sun.shadow.camera.near = 1; sun.shadow.camera.far = 120;
  sun.shadow.bias = -0.0004;
  scene.add(sun);

  return { colliders, selectors: [] };
}

// Vidriera del local: marco de cuadrícula verde inglés + vidrio + puerta.
function buildStorefront(g, colliders, frameMat, glassMat) {
  const y0 = PLAT + 0.9;                 // arriba del zócalo ciego
  const top = PLAT + H_LIBRE - 0.5;      // bajo el dintel
  const cristalH = top - y0;
  const x0 = -VID_W / 2, x1 = VID_W / 2;
  // vidrio detrás de la cuadrícula
  const glass = new THREE.Mesh(new THREE.PlaneGeometry(VID_W, cristalH), glassMat);
  glass.position.set(0, (y0 + top) / 2, Z_FACADE + 0.02); g.add(glass);
  // cuadrícula: montantes verticales + travesaños horizontales
  for (let x = x0; x <= x1 + 0.01; x += VID_W / 4) g.add(box(0.06, cristalH, 0.08, x, (y0 + top) / 2, Z_FACADE, frameMat));
  for (let y = y0; y <= top + 0.01; y += cristalH / 3) g.add(box(VID_W, 0.06, 0.08, 0, y, Z_FACADE, frameMat));
  // rejas verticales sobre parte del vidrio (spec 04)
  for (let x = x0 + 0.3; x < -0.9; x += 0.35) g.add(box(0.03, cristalH, 0.03, x, (y0 + top) / 2, Z_FACADE + 0.06, frameMat));
  // PUERTA: vano libre a la derecha del vano central (sin vidrio, caminable).
  // La mitad izquierda de la vidriera es fija (collider); la derecha se cruza.
  colliders.push({ minX: x0, maxX: -0.4, minY: 0, maxY: top, minZ: Z_FACADE - 0.1, maxZ: Z_FACADE + 0.1 });
  // marco de la puerta
  g.add(box(0.08, cristalH + 0.4, 0.1, 1.5, PLAT + (cristalH + 0.4) / 2, Z_FACADE, frameMat));
}

// Local FOURTWENTY (adentro), elevado a PLAT. SOLO estructura — sin muebles
// todavía (los assets del interior real los manda el dueño después). El hueco
// atrás-derecha queda abierto: futuro acceso al shopping (ver nota final).
function buildLocalInterior(scene, g, colliders) {
  // Piso del local real: porcelanato beige de placa grande (foto del dueño).
  const floorMat = new THREE.MeshStandardMaterial({ map: whiteFloor(LOCAL_HALF, 3), color: 0xd6ccbb, roughness: 0.55 });
  const wallMat = mat(0xf2f0ec, 0.95); // paredes blancas
  const ceilMat = mat(0xf2f0ec, 0.95); // techo blanco liso
  const WT = 0.2, H = H_LIBRE;
  const zc = (Z_FACADE + Z_LOCAL_BACK) / 2, depth = Z_FACADE - Z_LOCAL_BACK;

  const floor = box(LOCAL_HALF * 2, 0.1, depth + GAP_STUB, 0, PLAT - 0.05, zc - GAP_STUB / 2, floorMat);
  const ceil = box(LOCAL_HALF * 2, WT, depth, 0, PLAT + H, zc, ceilMat);
  const wallL = box(WT, H, depth, -LOCAL_HALF, PLAT + H / 2, zc, wallMat);
  const wallR = box(WT, H, depth, LOCAL_HALF, PLAT + H / 2, zc, wallMat);
  colliders.push({ minX: -LOCAL_HALF - WT, maxX: -LOCAL_HALF, minY: 0, maxY: PLAT + H, minZ: Z_LOCAL_BACK, maxZ: Z_FACADE });
  colliders.push({ minX: LOCAL_HALF, maxX: LOCAL_HALF + WT, minY: 0, maxY: PLAT + H, minZ: Z_LOCAL_BACK, maxZ: Z_FACADE });

  // Fondo del local: muro visible a la izquierda; a la derecha queda el HUECO
  // del stock VISIBLE (se ve el pocket atrás) pero BLOQUEADO físicamente con una
  // pared invisible a lo ancho de TODO el fondo, para que BOB no se meta y se
  // trabe/gire en el pasillo angosto. Se reabre más adelante con cámara fija.
  const leftW = GAP_X0 - (-LOCAL_HALF);
  const wallBack = box(leftW, H, WT, -LOCAL_HALF + leftW / 2, PLAT + H / 2, Z_LOCAL_BACK, wallMat);
  colliders.push({ minX: -LOCAL_HALF, maxX: LOCAL_HALF, minY: 0, maxY: PLAT + H, minZ: Z_LOCAL_BACK - WT, maxZ: Z_LOCAL_BACK });

  for (const m of [floor, ceil, wallL, wallR, wallBack]) { m.castShadow = true; m.receiveShadow = true; g.add(m); }

  buildRealInterior(scene, g, colliders, H);
  return buildStockSelector(scene, g);
}

// ---- Interior REAL del local (réplica de la foto del dueño) -----------------
// Piso beige, vigas blancas con rieles de spots, panel de madera con neón
// (hoja verde + WE ROLL DIFFERENT), escritorio de madera con banquetas negras,
// barral izquierdo con remeras + estante, jean blanco en exhibidor, divisor de
// madera a la derecha con banqueta roja y corcho, extintor y aire acondicionado.
function buildRealInterior(scene, g, colliders, H) {
  const wood = new THREE.MeshStandardMaterial({ map: lightWood(2, 2), roughness: 0.65 });
  const black = mat(0x1c1c1e, 0.6);
  const chrome = mat(0xb9bcc2, 0.3, 0.9);
  const white = mat(0xf2f0ec, 0.9);

  // — Vigas blancas transversales + rieles con spots circulares —
  for (const bz of [-6.4, -8.4]) {
    g.add(box(LOCAL_HALF * 2, 0.2, 0.18, 0, PLAT + H - 0.1, bz, white));
  }
  for (const tx of [-1.1, 1.1]) {
    g.add(box(0.05, 0.05, 4.6, tx, PLAT + H - 0.22, -7.4, black));
    for (let i = 0; i < 4; i++) {
      const sz = -5.6 - i * 1.2;
      const can = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.075, 0.09, 10),
        new THREE.MeshBasicMaterial({ color: 0xfff6e6 }));
      can.position.set(tx, PLAT + H - 0.3, sz);
      g.add(can);
    }
    const spot = new THREE.SpotLight(0xfff2e0, 9, 8, 0.95, 0.55, 1.6);
    spot.position.set(tx, PLAT + H - 0.3, -7.4);
    spot.target.position.set(tx, PLAT, -7.4);
    scene.add(spot, spot.target);
  }

  // — Panel de madera del fondo + NEÓN (hoja verde + WE ROLL DIFFERENT) —
  g.add(box(3.4, H, 0.08, -1.3, PLAT + H / 2, Z_LOCAL_BACK + 0.06, wood));
  const neon = new THREE.Mesh(new THREE.PlaneGeometry(2.3, 1.5), new THREE.MeshBasicMaterial({ map: rollDifferentNeon(), transparent: true }));
  neon.position.set(-1.3, PLAT + 1.9, Z_LOCAL_BACK + 0.12);
  g.add(neon);
  const glowG = new THREE.PointLight(0x39ff6a, 2.5, 3.5, 2);
  glowG.position.set(-1.3, PLAT + 2.1, Z_LOCAL_BACK + 0.6);
  scene.add(glowG);

  // — Escritorio/mostrador central de madera + 2 banquetas negras —
  g.add(box(1.7, 0.95, 0.62, -0.6, PLAT + 0.475, -9.15, wood));
  g.add(box(1.78, 0.05, 0.7, -0.6, PLAT + 0.975, -9.15, wood)); // tapa
  for (const dx of [-1.05, -0.6, -0.15]) g.add(box(0.28, 0.02, 0.02, dx, PLAT + 0.78, -8.82, black)); // tiradores
  colliders.push({ minX: -1.5, maxX: 0.3, minY: 0, maxY: PLAT + 1, minZ: -9.5, maxZ: -8.8 });
  for (const sx of [-1.0, -0.2]) {
    const seat = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.17, 0.05, 12), black);
    seat.position.set(sx, PLAT + 0.72, -9.75); g.add(seat);
    g.add(box(0.04, 0.68, 0.04, sx, PLAT + 0.36, -9.75, black));
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.015, 6, 16), black);
    ring.rotation.x = Math.PI / 2; ring.position.set(sx, PLAT + 0.22, -9.75); g.add(ring);
  }

  // — Pared izquierda: estante flotante + barral con remeras —
  g.add(box(1.3, 0.05, 0.28, -2.8, PLAT + 2.15, -6.2, wood));
  g.add(box(0.24, 0.14, 0.2, -3.05 + 0.4, PLAT + 2.25, -6.5, black)); // deco
  const rail2 = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 1.6, 8), chrome);
  rail2.rotation.x = Math.PI / 2; rail2.position.set(-2.78, PLAT + 1.95, -6.2); g.add(rail2);
  const shirtDefs = [
    { color: 0x141414, tipo: 'tee' }, { color: 0xf5f2ea, tipo: 'tee' },
    { color: 0xf5f2ea, tipo: 'tee' }, { color: 0x2a3550, tipo: 'hoodie' },
  ];
  shirtDefs.forEach((d, i) => {
    const s = new THREE.Mesh(new THREE.PlaneGeometry(0.52, 0.62),
      new THREE.MeshStandardMaterial({ map: garmentTexture(d.color, d.tipo), transparent: true, alphaTest: 0.4, roughness: 0.9, side: THREE.DoubleSide }));
    s.position.set(-2.72 + i * 0.02, PLAT + 1.58, -6.85 + i * 0.42);
    s.rotation.y = Math.PI / 2;
    g.add(s);
  });

  // — Exhibidor del jean blanco (adelante-izquierda, como la foto) —
  const px = -2.2, pz = -5.3;
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.22, 0.03, 14), black);
  base.position.set(px, PLAT + 0.015, pz); g.add(base);
  g.add(box(0.13, 0.85, 0.15, px - 0.07, PLAT + 0.45, pz, white));
  g.add(box(0.13, 0.85, 0.15, px + 0.07, PLAT + 0.45, pz, white));
  g.add(box(0.3, 0.16, 0.17, px, PLAT + 0.95, pz, white));
  const top = new THREE.Mesh(new THREE.CylinderGeometry(0.19, 0.19, 0.04, 14), black);
  top.position.set(px, PLAT + 1.12, pz); g.add(top);
  colliders.push({ minX: px - 0.25, maxX: px + 0.25, minY: 0, maxY: PLAT + 1.2, minZ: pz - 0.25, maxZ: pz + 0.25 });

  // — Derecha: divisor de madera + banqueta roja + corcho —
  g.add(box(0.45, 1.05, 2.2, 2.72, PLAT + 0.525, -5.8, wood));
  colliders.push({ minX: 2.5, maxX: 2.95, minY: 0, maxY: PLAT + 1.1, minZ: -6.9, maxZ: -4.7 });
  const rSeat = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.05, 12), mat(0xc22a1f, 0.6));
  rSeat.position.set(2.35, PLAT + 0.85, -7.5); g.add(rSeat);
  for (const [lx, lz] of [[-0.1, -0.1], [0.1, -0.1], [0, 0.12]]) {
    const leg = box(0.03, 0.85, 0.03, 2.35 + lx, PLAT + 0.42, -7.5 + lz, mat(0xc22a1f, 0.6));
    g.add(leg);
  }
  colliders.push({ minX: 2.15, maxX: 2.55, minY: 0, maxY: PLAT + 0.9, minZ: -7.7, maxZ: -7.3 });
  const cork = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 0.75), corkTexturePlane());
  cork.position.set(LOCAL_HALF - 0.11, PLAT + 1.5, -6.8);
  cork.rotation.y = -Math.PI / 2;
  g.add(cork);

  // — Detalles: extintor + aire acondicionado —
  const ext = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.34, 10), mat(0xc22a1f, 0.5));
  ext.position.set(0.28, PLAT + 1.15, Z_LOCAL_BACK + 0.14); g.add(ext);
  g.add(box(0.85, 0.28, 0.22, 0.8, PLAT + 2.72, Z_FACADE - 0.16, white)); // split AC

  // luz de relleno cálida general
  const fill = new THREE.PointLight(0xfff0dd, 3, 8, 2);
  fill.position.set(0, PLAT + H - 0.4, -7.2);
  scene.add(fill);
}

// Neón de la foto: hoja de cannabis verde + "WE ROLL DIFFERENT" cálido.
function rollDifferentNeon() {
  const c = document.createElement('canvas'); c.width = 512; c.height = 336;
  const ctx = c.getContext('2d');
  // hoja (glow verde)
  ctx.save();
  ctx.translate(256, 128);
  ctx.strokeStyle = '#39ff6a'; ctx.lineWidth = 5;
  ctx.shadowColor = '#39ff6a'; ctx.shadowBlur = 18;
  const angs = [-1.1, -0.72, -0.36, 0, 0.36, 0.72, 1.1];
  const lens = [46, 68, 88, 100, 88, 68, 46];
  angs.forEach((a, i) => {
    ctx.save(); ctx.rotate(a);
    ctx.beginPath(); ctx.moveTo(0, 10);
    ctx.quadraticCurveTo(10, -lens[i] * 0.5 + 10, 0, -lens[i] + 10);
    ctx.quadraticCurveTo(-10, -lens[i] * 0.5 + 10, 0, 10);
    ctx.stroke(); ctx.restore();
  });
  ctx.restore();
  // texto cálido
  ctx.font = 'bold 44px monospace';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.shadowColor = '#ffd27a'; ctx.strokeStyle = '#ffd27a'; ctx.lineWidth = 2;
  for (const blur of [22, 10]) { ctx.shadowBlur = blur; ctx.strokeText('WE ROLL DIFFERENT', 256, 268); }
  ctx.shadowBlur = 0; ctx.fillStyle = '#fff3d6'; ctx.fillText('WE ROLL DIFFERENT', 256, 268);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  return t;
}

// Corcho con papelitos (pared derecha de la foto).
function corkTexturePlane() {
  const c = document.createElement('canvas'); c.width = 256; c.height = 176;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#b98d5e'; ctx.fillRect(0, 0, 256, 176);
  ctx.strokeStyle = '#8a6a44'; ctx.lineWidth = 8; ctx.strokeRect(4, 4, 248, 168);
  for (let i = 0; i < 8; i++) {
    ctx.fillStyle = ['#ffffff', '#fdf6c9', '#d9ecf5'][i % 3];
    ctx.fillRect(18 + (i % 4) * 58, 22 + Math.floor(i / 4) * 72, 42, 54);
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return new THREE.MeshStandardMaterial({ map: t, roughness: 0.95 });
}

// ---- Sector stock = SELECTOR DE COLECCIONES ---------------------------------
// En el hueco del fondo (visible pero bloqueado físicamente) cuelgan 5 remeras,
// una por colección/piso de BOBILONIA. Se seleccionan con click o E — al elegir
// una, main.js muestra la pantalla de carga y monta el shopping en ese piso.
function buildStockSelector(scene, g) {
  const zBack = Z_LOCAL_BACK - GAP_STUB + 0.15; // panel al fondo del pocket
  const zShirt = Z_LOCAL_BACK - 0.9;            // remeras a la vista desde el local
  const cx = (GAP_X0 + GAP_X1) / 2;
  const W = GAP_X1 - GAP_X0;

  // vestir el pocket: panel oscuro de fondo + laterales + barral cromado
  const dark = mat(0x24241f, 0.95);
  g.add(box(W, H_LIBRE, 0.1, cx, PLAT + H_LIBRE / 2, zBack, dark));
  g.add(box(0.08, H_LIBRE, GAP_STUB, GAP_X0, PLAT + H_LIBRE / 2, Z_LOCAL_BACK - GAP_STUB / 2, dark));
  g.add(box(0.08, H_LIBRE, GAP_STUB, GAP_X1, PLAT + H_LIBRE / 2, Z_LOCAL_BACK - GAP_STUB / 2, dark));
  const rail = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, W - 0.3, 8), mat(0xb9bcc2, 0.25, 0.9));
  rail.rotation.z = Math.PI / 2;
  rail.position.set(cx, PLAT + 2.05, zShirt);
  g.add(rail);
  // foco puntual para que las remeras se lean bien
  const spot = new THREE.PointLight(0xfff3dd, 5, 4.5, 2);
  spot.position.set(cx, PLAT + 2.6, Z_LOCAL_BACK - 0.5);
  scene.add(spot);

  // las 5 remeras (color + tipo + destino). Textura placeholder de silueta;
  // cuando estén las fotos reales se cambian acá mismo.
  const defs = [
    { piso: 1, label: 'PISO 1 · ARCHIVE', color: 0x1c1c1c, tipo: 'tee' },
    { piso: 2, label: 'PISO 2 · ORIGEN', color: 0xe8dfc9, tipo: 'tee' },
    { piso: 3, label: 'PISO 3 · HOOP SEASON', color: 0xd96b2f, tipo: 'jersey' },
    { piso: 4, label: 'PISO 4 · BOB', color: 0x1f4d2e, tipo: 'tee', cara: true },
    { piso: 5, label: 'PISO 5 · CULTURA', color: 0x6d1f2c, tipo: 'hoodie' },
  ];
  const selectors = [];
  defs.forEach((d, i) => {
    const x = GAP_X0 + 0.32 + i * ((W - 0.64) / (defs.length - 1));
    const tex = garmentTexture(d.color, d.tipo, d.cara ? { monkeyFace: true } : {});
    const shirt = new THREE.Mesh(
      new THREE.PlaneGeometry(0.46, 0.55),
      new THREE.MeshStandardMaterial({ map: tex, transparent: true, alphaTest: 0.4, roughness: 0.9, side: THREE.DoubleSide, emissive: 0x111111 }),
    );
    shirt.position.set(x, PLAT + 1.72, zShirt);
    shirt.userData = { piso: d.piso, label: d.label, baseScale: 1 };
    g.add(shirt);
    selectors.push(shirt);
    // etiqueta chica bajo cada remera
    const c = document.createElement('canvas'); c.width = 256; c.height = 48;
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#f6f5f2'; ctx.fillRect(0, 0, 256, 48);
    ctx.fillStyle = '#17171a'; ctx.font = 'bold 22px monospace';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(d.label, 128, 26);
    const lt = new THREE.CanvasTexture(c); lt.colorSpace = THREE.SRGBColorSpace; lt.anisotropy = 4;
    const tag = new THREE.Mesh(new THREE.PlaneGeometry(0.44, 0.082), new THREE.MeshBasicMaterial({ map: lt }));
    tag.position.set(x, PLAT + 1.32, zShirt);
    g.add(tag);
  });
  return selectors;
}

// ═══════════════════════════════════════════════════════════════════════════
// NOTA PARA MÁS ADELANTE (no implementado todavía, a propósito):
// El hueco atrás-derecha del local (GAP_X0..GAP_X1, detrás de Z_LOCAL_BACK) es
// donde va a ir la carga de mapa hacia el "shopping" de 5 pisos ya construido
// en world/building.js + retail.js + gallery.js + signage.js + collections.js +
// layout.js (con escalera mecánica en vez de escaleras, pendiente de convertir).
// Ese mundo no se toca ni se borra: main.js simplemente no lo llama todavía.
// Cuando se implemente el trigger: al pisar el hueco, fade a negro, ocultar
// esta escena y montar buildBuilding/buildRetail/etc. como escena activa.
// ═══════════════════════════════════════════════════════════════════════════
