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
import { Reflector } from 'three/addons/objects/Reflector.js';
import { towerFacade, veredaTile, hexPaver, greenShutter, whiteFloor, lightWood } from './textures.js';
import { box } from './gfxUtils.js';
import { garmentTexture } from './gallery.js';
import { bindProductVisual } from './productVisuals.js';
import { createMoonDisc, createSunDisc } from './dayNightCycle.js';

// ---- Paleta del spec (albedo base) ------------------------------------------
const SALVIA = 0x8C9A78;   // columnas / alero
const INGLES = 0x2F5A3A;   // carpintería de vidriera
const CREMA = 0xE1DDC6;    // revoque
const HORMIGON = 0xB4AEA2; // escalones / vereda
const MURETE = 0x96583F;   // jardineras
const REJA = 0x3E6B60;     // barandas / reja patio

const mat = (hex, rough = 0.85, metal = 0) =>
  new THREE.MeshStandardMaterial({ color: hex, roughness: rough, metalness: metal });

function named(object, name, { collider = null } = {}) {
  object.name = name;
  if (collider !== null) object.userData.editorCollider = collider;
  return object;
}

// ---- Medidas (spec 09) ------------------------------------------------------
const PLAT = 0.45;          // altura de la plataforma/galería sobre la vereda
const STEP_RISE = 0.15, STEP_RUN = 0.32; // contrahuella / huella
const GAL_DEPTH = 3.5;      // profundidad de la galería
const H_LIBRE = 3.2;        // altura libre bajo el alero
const EJE_COL = 4.5;        // eje a eje de columnas
const COL = 0.4;            // sección de columna
const ALERO_T = 0.35, ALERO_VUELO = 1.5;
const FRENTE = 14;          // medio-frente jugable (x -14..14)
const MAP_SCALE = 2;        // rango de edición/movimiento x2

// Z clave (de la calle -de +Z- hacia el fondo -de -Z-)
const Z_STREET = 8;         // arranca la calzada
const Z_CURB = 7.4;         // cordón (límite: no se baja a la calle)
const Z_STEP_FOOT = 0;      // pie de los escalones = ORIGEN
const Z_STEP_TOP = -3 * STEP_RUN;      // -0.96: arriba del 3er escalón
const Z_FACADE = -0.96 - GAL_DEPTH;    // -4.46: línea de vidrieras del fondo de la galería
const Z_LOCAL_BACK = Z_FACADE - 6;     // -10.46: fondo del local

// Local FOURTWENTY: centrado en x=0, vidriera de 5.5m.
const VID_W = 5.5;
const LOCAL_HALF = 3.0;     // medio-ancho del interior (x -3..3)
export const SPAWN = new THREE.Vector3(0, 0, 6); // vereda, mirando a la galería (-Z)

// Hueco atrás-derecha del local: futuro acceso al shopping (ver nota final).
const GAP_X0 = 0.4, GAP_X1 = LOCAL_HALF, GAP_STUB = 2;
const MAP_HALF_X = FRENTE * MAP_SCALE;
const MAP_MIN_Z = (Z_LOCAL_BACK - GAP_STUB) * MAP_SCALE;
const MAP_MAX_Z = (Z_CURB + 1) * MAP_SCALE;

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
  group.name = 'Cartel neon FOURTWENTY';
  group.add(named(box(5.2, 0.85, 0.15, 0, 0, -0.08, mat(0x1a1a1e, 0.4, 0.6)), 'Cartel neon FOURTWENTY · base'));
  group.add(named(new THREE.Mesh(new THREE.PlaneGeometry(5, 0.7), new THREE.MeshBasicMaterial({ map: tex })), 'Cartel neon FOURTWENTY · texto'));
  group.position.set(x, y, z + 0.09);
  scene.add(group);
  const glow = new THREE.PointLight(0x39ff6a, 5, 5, 2);
  glow.position.set(x, y, z + 0.5);
  scene.add(glow);
}

function tree(scene, x, z, pink = false, name = 'Arbol') {
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.2, 4.5, 8), mat(0x5a4230, 0.9));
  trunk.name = `${name} · tronco`;
  trunk.userData.editorCollider = true;
  trunk.position.set(x, 2.25, z); trunk.castShadow = true; scene.add(trunk);
  const leafMat = mat(pink ? 0xe8b8cf : 0x4c7a3a, 0.85);
  [[0, 4.6, 0, 1.6], [0.6, 4.2, 0.3, 1.2], [-0.5, 4.3, -0.4, 1.3], [0.2, 5.2, -0.2, 1.1]].forEach(([dx, dy, dz, s], i) => {
    const leaf = new THREE.Mesh(new THREE.IcosahedronGeometry(s, 0), leafMat);
    leaf.name = `${name} · copa ${i + 1}`;
    leaf.position.set(x + dx, dy, z + dz); leaf.castShadow = true; scene.add(leaf);
  });
  // alcorque cuadrado (spec 07)
  scene.add(named(box(1.2, 0.05, 1.2, x, 0.025, z, mat(0x6b5a44, 1)), `${name} · alcorque`, { collider: false }));
}

// Cantero de ladrillo con vegetación (spec 07): murete #96583F, alto 0.50.
function planter(scene, colliders, x, z, w, d, name = 'Cantero') {
  const g = new THREE.Group();
  g.name = name;
  g.userData.editorCollider = true;
  g.add(named(box(w, 0.5, d, x, 0.25, z, mat(MURETE, 0.9)), `${name} · ladrillo`));
  g.add(named(box(w - 0.15, 0.06, d - 0.15, x, 0.5, z, mat(0x3a2e22, 1)), `${name} · tierra`, { collider: false }));
  // matas: agapantos (tufts verdes acintados) + arbusto redondo
  for (let i = 0; i < Math.floor(w * d); i++) {
    const bx = x + (Math.random() - 0.5) * (w - 0.4);
    const bz = z + (Math.random() - 0.5) * (d - 0.4);
    const bush = new THREE.Mesh(new THREE.IcosahedronGeometry(0.28 + Math.random() * 0.15, 0), mat(0x5c8a45, 0.9));
    bush.name = `${name} · arbusto ${i + 1}`;
    bush.position.set(bx, 0.7, bz); bush.castShadow = true; g.add(bush);
  }
  scene.add(g);
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
function cannabisPlant(scene, x, z, y = 0, name = 'Planta FOURTWENTY') {
  if (!_cannaTex) _cannaTex = cannabisLeafTexture();
  const g = new THREE.Group();
  g.name = name;
  g.add(named(box(0.03, 0.35, 0.03, 0, 0.17, 0, mat(0x2f5a22, 0.9)), `${name} · tallo`));
  const geo = new THREE.PlaneGeometry(0.55, 0.6); geo.translate(0, 0.32, 0);
  const m = new THREE.MeshStandardMaterial({ map: _cannaTex, transparent: true, alphaTest: 0.4, side: THREE.DoubleSide, roughness: 0.9 });
  [0, Math.PI / 3, -Math.PI / 3].forEach((r, i) => {
    const p = new THREE.Mesh(geo, m);
    p.name = `${name} · hoja ${i + 1}`;
    p.rotation.y = r; p.castShadow = true; g.add(p);
  });
  g.position.set(x, y, z); scene.add(g);
}

// ---- Construcción principal -------------------------------------------------
export function buildStreet(scene) {
  const colliders = [];
  const g = new THREE.Group();
  g.name = 'Burela 2570 · local y galeria';
  g.userData.editorWorldRoot = true;

  const hexMat = new THREE.MeshStandardMaterial({ map: hexPaver(6, 3), roughness: 0.95 });
  const veredaMat = new THREE.MeshStandardMaterial({ map: veredaTile(8, 4), roughness: 0.9 });
  const hormigonMat = mat(HORMIGON, 0.9);
  const salviaMat = mat(SALVIA, 0.8);
  const cremaMat = mat(CREMA, 0.85);
  const shutterMat = new THREE.MeshStandardMaterial({ map: greenShutter(2, 1), roughness: 0.6, metalness: 0.3 });
  const inglesMat = mat(INGLES, 0.5, 0.4);
  const towerMat = new THREE.MeshStandardMaterial({ map: towerFacade(8, 6), roughness: 0.9 });

  // ---- Suelos --------------------------------------------------------------
  // calzada (adoquín oscuro), cordón, vereda gris, plaza hexagonal
  const street = new THREE.Mesh(new THREE.PlaneGeometry(MAP_HALF_X * 2 + 20, 8), mat(0x3a3a3c, 0.95));
  street.name = 'Calle Burela · asfalto';
  street.rotation.x = -Math.PI / 2; street.position.set(0, -0.05, Z_STREET + 2); scene.add(street);
  g.add(named(box(MAP_HALF_X * 2 + 4, 0.15, 0.4, 0, 0.075, Z_CURB, mat(0x8a8880, 0.9)), 'Cordon calle Burela'));
  const vereda = new THREE.Mesh(new THREE.PlaneGeometry(MAP_HALF_X * 2, Z_CURB - 3.5), veredaMat);
  vereda.name = 'Vereda gris frente al local';
  vereda.rotation.x = -Math.PI / 2; vereda.position.set(0, 0, (Z_CURB + 3.5) / 2); vereda.receiveShadow = true; scene.add(vereda);
  const plaza = new THREE.Mesh(new THREE.PlaneGeometry(MAP_HALF_X * 2, 3.5 - Z_STEP_FOOT), hexMat);
  plaza.name = 'Piso piedra hexagonal zona Burela';
  plaza.rotation.x = -Math.PI / 2; plaza.position.set(0, 0.001, 3.5 / 2); plaza.receiveShadow = true; scene.add(plaza);

  // ---- Escalones (spec 03, CRÍTICO): 3 pasos anchos y bajos ----------------
  // 2 boxes escalonados + la plataforma de la galería (= 3er nivel).
  const stepA = box(MAP_HALF_X * 2, STEP_RISE, STEP_RUN * 2, 0, STEP_RISE / 2, -STEP_RUN, hormigonMat);
  const stepB = box(MAP_HALF_X * 2, STEP_RISE * 2, STEP_RUN, 0, STEP_RISE, -STEP_RUN * 2, hormigonMat);
  stepA.name = 'Escalon Burela bajo';
  stepB.name = 'Escalon Burela alto';
  // editorCollider=true: son bajos (0.15m/0.30m) así que el step-offset
  // genérico de main.js los toma como escalón (raycast), no como pared — si
  // el dueño los duplica/rota con el editor, siguen siendo subibles.
  for (const s of [stepA, stepB]) { s.castShadow = true; s.receiveShadow = true; s.userData.editorCollider = true; g.add(s); }

  // ---- Plataforma/galería a y=PLAT -----------------------------------------
  const galZc = (Z_STEP_TOP + Z_FACADE) / 2;
  const plat = box(MAP_HALF_X * 2, PLAT, Z_STEP_TOP - Z_FACADE, 0, PLAT / 2, galZc, hormigonMat);
  plat.name = 'Plataforma galeria nivel local';
  plat.receiveShadow = true; g.add(plat);
  const heightGuide = box(MAP_HALF_X * 2, 0.025, 0.035, 0, PLAT + 0.02, Z_STEP_TOP - 0.03, new THREE.MeshBasicMaterial({ color: 0xff1b1b }));
  heightGuide.name = 'Linea roja referencia altura subida BOB';
  heightGuide.userData.editorCollider = false;
  g.add(heightGuide);

  // Columnas verde salvia (sección cuadrada 0.40), ritmo eje 4.5m, en el borde
  // delantero de la galería. Alero volado arriba.
  for (let x = -FRENTE + 2; x <= FRENTE - 2 + 0.01; x += EJE_COL) {
    const col = box(COL, H_LIBRE, COL, x, PLAT + H_LIBRE / 2, Z_STEP_TOP - 0.3, salviaMat);
    col.name = `Columna salvia galeria ${Math.round((x + FRENTE) / EJE_COL) + 1}`;
    col.userData.editorCollider = true;
    col.castShadow = true; col.receiveShadow = true; g.add(col);
  }
  // Alero/losa voladiza (canto verde salvia), vuela 1.5m sobre la vereda.
  const aleroZ0 = Z_STEP_TOP + ALERO_VUELO, aleroZ1 = Z_FACADE;
  const alero = box(FRENTE * 2 + 1, ALERO_T, aleroZ0 - aleroZ1, 0, PLAT + H_LIBRE + ALERO_T / 2, (aleroZ0 + aleroZ1) / 2, salviaMat);
  alero.name = 'Alero techo galeria salvia';
  alero.castShadow = true; g.add(alero);

  // ---- Frente de locales (línea Z_FACADE) ----------------------------------
  // Todo el frente es persiana verde (locales cerrados) MENOS el vano central
  // (FOURTWENTY), que lleva vidriera con puerta.
  const facadeTop = PLAT + H_LIBRE;
  // zócalo ciego verde continuo (0.9m) a lo largo del frente
  g.add(named(box(FRENTE * 2, 0.9, 0.12, 0, PLAT + 0.45, Z_FACADE, inglesMat), 'Zocalo verde frente locales'));
  // persianas a los costados del vano de FOURTWENTY
  for (const [index, [x0, x1]] of [[-FRENTE, -VID_W / 2], [VID_W / 2, FRENTE]].entries()) {
    const w = x1 - x0, cx = (x0 + x1) / 2;
    const shutter = box(w, H_LIBRE - 0.9, 0.1, cx, PLAT + 0.9 + (H_LIBRE - 0.9) / 2, Z_FACADE, shutterMat);
    shutter.name = index === 0 ? 'Persianas verdes locales izquierda' : 'Persianas verdes locales derecha';
    shutter.userData.editorCollider = true;
    shutter.castShadow = true; shutter.receiveShadow = true; g.add(shutter);
  }
  // dintel sobre el vano central + cartel-toldo plano para branding
  g.add(named(box(VID_W + 0.4, 0.5, 0.14, 0, facadeTop - 0.25, Z_FACADE, cremaMat), 'Dintel crema local FOURTWENTY'));
  const toldo = box(VID_W + 0.2, 0.06, 0.9, 0, facadeTop - 0.5, Z_FACADE + 0.5, mat(0x1a1a1e, 0.5));
  toldo.name = 'Toldo negro local FOURTWENTY';
  g.add(toldo);
  neonFT(scene, 0, facadeTop - 0.55, Z_FACADE + 0.9);

  // ---- Vidriera FOURTWENTY (verde inglés, cuadrícula) con puerta -----------
  buildStorefront(g, colliders, inglesMat);

  // ---- Interior del local (elevado a PLAT, sin muebles) --------------------
  const selectors = buildLocalInterior(scene, g, colliders);

  // ---- Fondo visual viejo: edificios paralelos a la calle ------------------
  // Recupera la version donde el fondo se leia como una tira de edificios de
  // enfrente, paralela al local/calle. Es decorativo, sin colision.
  const baseY = facadeTop + ALERO_T;
  const rearStrip = box(FRENTE * 2 + 2, 24, 0.5, 0, baseY + 12, Z_FACADE - 0.5, towerMat);
  const rearLeft = box(10, 20, 0.5, -FRENTE - 3, facadeTop + 10, Z_FACADE + 2, towerMat);
  const rearRight = box(10, 20, 0.5, FRENTE + 3, facadeTop + 10, Z_FACADE + 2, towerMat);
  rearStrip.name = 'Edificios fondo paralelos centro';
  rearLeft.name = 'Edificio fondo paralelo izquierda';
  rearRight.name = 'Edificio fondo paralelo derecha';
  for (const b of [rearStrip, rearLeft, rearRight]) {
    b.castShadow = true;
    b.receiveShadow = true;
    scene.add(b);
  }

  // reja verde mínima a un costado (el lado derecho completo va en Pass C)
  const railGroup = new THREE.Group();
  railGroup.name = 'Reja verde lateral completa';
  railGroup.userData.editorCollider = true;
  let railIndex = 1;
  for (let x = FRENTE - 1; x <= FRENTE + 2; x += 0.4) {
    railGroup.add(named(box(0.05, 1.2, 0.05, x, 0.6, Z_STEP_TOP - 1, mat(REJA, 0.5, 0.5)), `Reja verde lateral barrote ${railIndex++}`));
  }
  railGroup.add(named(box(3.4, 0.08, 0.08, FRENTE + 0.5, 1.2, Z_STEP_TOP - 1, mat(REJA, 0.5, 0.5)), 'Reja verde lateral travesano'));
  g.add(railGroup);

  // ---- Límites invisibles (spec 02): cordón + 2 extremos + fondo -----------
  colliders.push({ minX: -MAP_HALF_X - 0.5, maxX: MAP_HALF_X + 0.5, minY: 0, maxY: 3, minZ: MAP_MAX_Z, maxZ: MAP_MAX_Z + 0.4, missionDisabled: true }); // fondo calle
  colliders.push({ minX: -MAP_HALF_X - 0.5, maxX: -MAP_HALF_X - 0.1, minY: 0, maxY: 4, minZ: MAP_MIN_Z, maxZ: MAP_MAX_Z }); // izq
  colliders.push({ minX: MAP_HALF_X + 0.1, maxX: MAP_HALF_X + 0.5, minY: 0, maxY: 4, minZ: MAP_MIN_Z, maxZ: MAP_MAX_Z });   // der
  colliders.push({ minX: -MAP_HALF_X - 0.5, maxX: MAP_HALF_X + 0.5, minY: 0, maxY: 4, minZ: MAP_MIN_Z - 0.4, maxZ: MAP_MIN_Z }); // fondo

  // ---- Vegetación PUNTUAL (ref: plano del dueño) ---------------------------
  // Cantero principal centro-izquierda: árbol + plantas cannábicas (marca).
  planter(scene, colliders, -4, 2.6, 5.5, 1.4, 'Cantero principal izquierdo');
  tree(scene, -5.5, 2.6, true, 'Arbol cantero principal');
  [-5, -4, -3, -2.2].forEach((cx, i) => cannabisPlant(scene, cx, 2.7, 0.5, `Planta FOURTWENTY cantero principal ${i + 1}`));
  // Cantero chico a la derecha.
  planter(scene, colliders, 5, 2.8, 3, 1.3, 'Cantero chico derecho');
  cannabisPlant(scene, 4.4, 2.9, 0.5, 'Planta FOURTWENTY derecha 1'); cannabisPlant(scene, 5.5, 2.7, 0.5, 'Planta FOURTWENTY derecha 2');
  // Árboles lejanos SOLO de fondo (fuera de la zona caminable, enmarcan).
  tree(scene, -22, 4, false, 'Arbol fondo izquierdo'); tree(scene, 23, 4.5, true, 'Arbol fondo derecho'); tree(scene, 15, -10, false, 'Arbol fondo atras');

  // ---- Luz: sol de mediodía-invierno, cálido rasante, sombras largas -------
  const hemisphere = new THREE.HemisphereLight(0xbfd6ea, 0x9a9488, 0.9);
  scene.add(hemisphere); // cielo celeste / suelo
  const sun = new THREE.DirectionalLight(0xfff1d6, 2.2);
  sun.position.set(14, 16, 10); // bajo → sombras largas
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.left = -MAP_HALF_X - 4; sun.shadow.camera.right = MAP_HALF_X + 4;
  sun.shadow.camera.top = 36; sun.shadow.camera.bottom = -36;
  sun.shadow.camera.near = 1; sun.shadow.camera.far = 70;
  sun.shadow.bias = -0.0004;
  scene.add(sun);
  const sunDisc = createSunDisc(1.7);
  const moonDisc = createMoonDisc(1.35);
  // Se agrega al final del grupo para conservar los IDs de todos los objetos
  // que el dueño ya posicionó con el editor.
  const whiteLightSwitch = createWhiteLightSwitch(scene, g);
  // El local debe conservar el indice historico 49: todo el layout editable
  // usa ese prefijo. El sol se agrega despues para no desplazar esos IDs.
  scene.add(g);
  scene.add(sunDisc);
  scene.add(moonDisc);
  return {
    colliders,
    selectors,
    whiteLightSwitch,
    outdoorLighting: { scene, sun, hemisphere, sunDisc, moonDisc },
  };
}

function createWhiteLightSwitch(scene, g) {
  const root = new THREE.Group();
  root.name = 'Interior local · interruptor rosa luces blancas';
  root.position.set(2.86, PLAT + 1.25, -5.2);
  root.userData.editorUnit = true;
  root.userData.editorCollider = false;
  root.userData.whiteLightSwitch = true;

  const plate = box(0.06, 0.24, 0.18, 0, 0, 0, mat(0x28262a, 0.45, 0.65));
  plate.name = 'Interruptor rosa · placa metalica';
  const buttonMaterial = new THREE.MeshStandardMaterial({
    color: 0xff4f9a,
    emissive: 0xff176f,
    emissiveIntensity: 1.15,
    roughness: 0.35,
    metalness: 0.25,
  });
  const button = new THREE.Mesh(new THREE.CylinderGeometry(0.052, 0.052, 0.035, 20), buttonMaterial);
  button.name = 'Interruptor rosa · boton';
  button.rotation.z = Math.PI / 2;
  button.position.x = -0.052;
  button.userData.whiteLightSwitchButton = true;
  root.add(plate, button);
  g.add(root);

  const worldPosition = new THREE.Vector3();
  let lightsEnabled = true;

  function isEffectivelyVisible(object) {
    for (let current = object; current; current = current.parent) {
      if (current.visible === false) return false;
    }
    return true;
  }

  function isWhiteLightSwitch(object) {
    return object?.userData?.whiteLightSwitch === true
      || object?.name?.toLowerCase().includes('interruptor rosa luces blancas');
  }

  function switchDistanceSq(object, playerPosition) {
    object.getWorldPosition(worldPosition);
    const dx = worldPosition.x - playerPosition.x;
    const dz = worldPosition.z - playerPosition.z;
    return dx * dx + dz * dz;
  }

  function nearestSwitch(playerPosition, maxDistance = 3.5) {
    if (!playerPosition) return null;
    let nearest = null;
    let nearestDistanceSq = maxDistance * maxDistance;
    scene.traverse((object) => {
      if (!isWhiteLightSwitch(object) || !isEffectivelyVisible(object)) return;
      const distanceSq = switchDistanceSq(object, playerPosition);
      if (distanceSq > nearestDistanceSq) return;
      nearest = object;
      nearestDistanceSq = distanceSq;
    });
    return nearest;
  }

  function switchFromRay(raycaster, playerPosition, maxDistance = 3.5) {
    if (!raycaster || !playerPosition) return null;
    const roots = [];
    scene.traverse((object) => {
      if (isWhiteLightSwitch(object) && isEffectivelyVisible(object)) roots.push(object);
    });
    const hit = roots.length ? raycaster.intersectObjects(roots, true)[0]?.object : null;
    let candidate = hit;
    while (candidate && !isWhiteLightSwitch(candidate)) candidate = candidate.parent;
    if (!candidate || switchDistanceSq(candidate, playerPosition) > maxDistance * maxDistance) return null;
    return candidate;
  }

  function setEnabled(enabled) {
    lightsEnabled = !!enabled;
    scene.traverse((object) => {
      if (object.userData.whiteInteriorLight) object.visible = lightsEnabled;
      if (object.userData.whiteInteriorLightLens) {
        const materials = Array.isArray(object.material) ? object.material : [object.material];
        for (const material of materials) {
          if (material && 'emissiveIntensity' in material) material.emissiveIntensity = lightsEnabled ? 2.7 : 0.04;
        }
      }
      if (object.userData.whiteLightSwitchButton) {
        object.position.x = lightsEnabled ? -0.052 : -0.044;
        const materials = Array.isArray(object.material) ? object.material : [object.material];
        for (const material of materials) {
          if (material && 'emissiveIntensity' in material) material.emissiveIntensity = lightsEnabled ? 1.15 : 0.45;
        }
      }
    });
  }

  function canInteract(playerPosition, maxDistance = 3.5) {
    return nearestSwitch(playerPosition, maxDistance) !== null;
  }

  return {
    root,
    canInteract,
    interact(playerPosition) {
      if (!nearestSwitch(playerPosition)) return false;
      setEnabled(!lightsEnabled);
      return true;
    },
    interactFromRay(raycaster, playerPosition) {
      if (!switchFromRay(raycaster, playerPosition)) return false;
      setEnabled(!lightsEnabled);
      return true;
    },
    isEnabled: () => lightsEnabled,
    setEnabled,
  };
}

// Vidriera del local: marco de cuadrícula verde inglés + vidrio + puerta.
function buildStorefront(g, colliders, frameMat) {
  const y0 = PLAT + 0.9;                 // arriba del zócalo ciego
  const top = PLAT + H_LIBRE - 0.5;      // bajo el dintel
  const cristalH = top - y0;
  const x0 = -VID_W / 2, x1 = VID_W / 2;
  // vidrio fijo a la derecha; el paso real queda libre a la izquierda.
  const fixedX0 = 1.05;
  const fixedW = x1 - fixedX0;
  const glass = new THREE.Group();
  glass.name = 'Vidriera FOURTWENTY vidrio principal';
  glass.position.set(0, (y0 + top) / 2, Z_FACADE + 0.02);
  glass.userData.editorCollider = true;
  const mirror = new Reflector(new THREE.PlaneGeometry(fixedW, cristalH), {
    clipBias: 0.003,
    textureWidth: 1024,
    textureHeight: 1024,
    color: 0x8899a0,
  });
  mirror.name = 'Vidriera FOURTWENTY espejo reflejo';
  mirror.position.x = (fixedX0 + x1) / 2;
  const collider = new THREE.Mesh(
    new THREE.BoxGeometry(fixedW, cristalH, 0.06),
    new THREE.MeshBasicMaterial({ colorWrite: false, depthWrite: false, transparent: true, opacity: 0 }),
  );
  collider.name = 'Vidriera FOURTWENTY espejo collider';
  collider.position.x = (fixedX0 + x1) / 2;
  glass.add(mirror, collider);
  g.add(glass);
  // cuadrícula: montantes verticales + travesaños horizontales
  let mullion = 1;
  for (let x = x0; x <= x1 + 0.01; x += VID_W / 4) g.add(named(box(0.06, cristalH, 0.08, x, (y0 + top) / 2, Z_FACADE, frameMat), `Vidriera FOURTWENTY montante ${mullion++}`));
  let crossbar = 1;
  for (let y = y0; y <= top + 0.01; y += cristalH / 3) g.add(named(box(VID_W, 0.06, 0.08, 0, y, Z_FACADE, frameMat), `Vidriera FOURTWENTY travesano ${crossbar++}`));
  // rejas verticales sobre parte del vidrio (spec 04)
  let bar = 1;
  for (let x = x0 + 0.3; x < -0.9; x += 0.35) g.add(named(box(0.03, cristalH, 0.03, x, (y0 + top) / 2, Z_FACADE + 0.06, frameMat), `Reja vidriera FOURTWENTY ${bar++}`));
  // PUERTA: vano libre a la izquierda del vano central (sin collider).
  // marco de la puerta
  const doorFrameGeo = new THREE.BoxGeometry(0.08, cristalH + 0.4, 0.1);
  doorFrameGeo.translate(-3.0, 0, 0);
  const doorFrame = new THREE.Mesh(doorFrameGeo, frameMat);
  doorFrame.position.set(1.5, PLAT + (cristalH + 0.4) / 2, Z_FACADE);
  g.add(named(doorFrame, 'Marco puerta entrada FOURTWENTY'));
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
  floor.name = 'Interior local · piso beige';
  ceil.name = 'Interior local · techo blanco';
  wallL.name = 'Interior local · pared izquierda';
  wallR.name = 'Interior local · pared derecha';
  wallL.userData.editorCollider = true;
  wallR.userData.editorCollider = true;

  // Fondo del local: solo bloquea el muro visible; el hueco derecho queda libre.
  const leftW = GAP_X0 - (-LOCAL_HALF);
  const wallBack = box(leftW, H, WT, -LOCAL_HALF + leftW / 2, PLAT + H / 2, Z_LOCAL_BACK, wallMat);
  wallBack.name = 'Interior local · pared fondo izquierda';
  wallBack.userData.editorCollider = true;

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
  [-6.4, -8.4].forEach((bz, i) => {
    g.add(named(box(LOCAL_HALF * 2, 0.2, 0.18, 0, PLAT + H - 0.1, bz, white), `Interior local · viga blanca ${i + 1}`));
  });
  [-1.1, 1.1].forEach((tx, trackIndex) => {
    g.add(named(box(0.05, 0.05, 4.6, tx, PLAT + H - 0.22, -7.4, black), `Interior local · riel luces ${trackIndex + 1}`));
    for (let i = 0; i < 4; i++) {
      const sz = -5.6 - i * 1.2;
      const fixture = new THREE.Group();
      fixture.name = `Interior local · spot ${trackIndex + 1}.${i + 1}`;
      fixture.position.set(tx, PLAT + H - 0.3, sz);
      fixture.userData.editorUnit = true;
      fixture.userData.editorLightRangeSelectable = true;
      fixture.userData.editorLightRange = 2;
      fixture.userData.editorLightRangePresets = {
        1: { distance: 3, intensity: 2 },
        2: { distance: 5.5, intensity: 3.5 },
        3: { distance: 8, intensity: 5.5 },
      };

      const lens = new THREE.Mesh(
        new THREE.CylinderGeometry(0.07, 0.075, 0.09, 16),
        new THREE.MeshStandardMaterial({
          color: 0xfff6e6,
          emissive: 0xffdfaa,
          emissiveIntensity: 2.7,
          roughness: 0.28,
        }),
      );
      lens.name = `${fixture.name} · lente luminosa`;
      lens.userData.whiteInteriorLightLens = true;

      const light = new THREE.PointLight(0xfff0d6, 3.5, 5.5, 2);
      light.name = `${fixture.name} · luz`;
      light.position.set(0, -0.08, 0);
      light.userData.editorLight = true;
      light.userData.whiteInteriorLight = true;

      fixture.add(lens, light);
      g.add(fixture);
    }

    // Conserva dos nodos por riel para que no cambien los IDs determinísticos
    // del editor. La iluminación ahora pertenece a cada círculo individual.
    const legacySpot = new THREE.SpotLight(0xfff2e0, 0, 0, 0.95, 0.55, 1.6);
    legacySpot.visible = false;
    legacySpot.target.visible = false;
    scene.add(legacySpot, legacySpot.target);
  });

  // — Panel de madera del fondo + NEÓN (hoja verde + WE ROLL DIFFERENT) —
  g.add(named(box(3.4, H, 0.08, -1.3, PLAT + H / 2, Z_LOCAL_BACK + 0.06, wood), 'Interior local · panel madera fondo'));
  const neon = new THREE.Mesh(new THREE.PlaneGeometry(2.3, 1.5), new THREE.MeshBasicMaterial({ map: rollDifferentNeon(), transparent: true }));
  neon.name = 'Interior local · neon WE ROLL DIFFERENT';
  neon.position.set(-1.3, PLAT + 1.9, Z_LOCAL_BACK + 0.12);
  g.add(neon);
  const glowG = new THREE.PointLight(0x39ff6a, 2.5, 3.5, 2);
  glowG.position.set(-1.3, PLAT + 2.1, Z_LOCAL_BACK + 0.6);
  scene.add(glowG);

  // — Escritorio/mostrador central de madera + 2 banquetas negras —
  g.add(named(box(1.7, 0.95, 0.62, -0.6, PLAT + 0.475, -9.15, wood), 'Interior local · mostrador madera cuerpo', { collider: true }));
  g.add(named(box(1.78, 0.05, 0.7, -0.6, PLAT + 0.975, -9.15, wood), 'Interior local · mostrador madera tapa'));
  [-1.05, -0.6, -0.15].forEach((dx, i) => g.add(named(box(0.28, 0.02, 0.02, dx, PLAT + 0.78, -8.82, black), `Interior local · tirador mostrador ${i + 1}`)));
  for (const sx of [-1.0, -0.2]) {
    const stool = new THREE.Group();
    stool.name = `Interior local · banqueta negra ${sx < -0.5 ? 1 : 2} completa`;
    stool.userData.editorCollider = true;
    const seat = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.17, 0.05, 12), black);
    seat.name = `Interior local · banqueta negra ${sx < -0.5 ? 1 : 2} asiento`;
    seat.position.set(sx, PLAT + 0.72, -9.75); stool.add(seat);
    stool.add(named(box(0.04, 0.68, 0.04, sx, PLAT + 0.36, -9.75, black), `Interior local · banqueta negra ${sx < -0.5 ? 1 : 2} pata`));
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.015, 6, 16), black);
    ring.name = `Interior local · banqueta negra ${sx < -0.5 ? 1 : 2} aro`;
    ring.rotation.x = Math.PI / 2; ring.position.set(sx, PLAT + 0.22, -9.75); stool.add(ring);
    g.add(stool);
  }

  // — Pared izquierda: estante flotante + barral con remeras —
  g.add(named(box(1.3, 0.05, 0.28, -2.8, PLAT + 2.15, -6.2, wood), 'Interior local · estante pared izquierda'));
  g.add(named(box(0.24, 0.14, 0.2, -3.05 + 0.4, PLAT + 2.25, -6.5, black), 'Interior local · deco estante'));
  const rail2 = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 1.6, 8), chrome);
  rail2.name = 'Interior local · barral prendas izquierdo';
  rail2.rotation.x = Math.PI / 2; rail2.position.set(-2.78, PLAT + 1.95, -6.2); g.add(rail2);
  const shirtDefs = [
    { color: 0x141414, tipo: 'tee' }, { color: 0xf5f2ea, tipo: 'tee' },
    { color: 0xf5f2ea, tipo: 'tee' }, { color: 0x2a3550, tipo: 'hoodie' },
  ];
  shirtDefs.forEach((d, i) => {
    const tex = garmentTexture(d.color, d.tipo);
    const s = new THREE.Mesh(new THREE.PlaneGeometry(0.52, 0.62),
      new THREE.MeshStandardMaterial({ map: tex, transparent: true, alphaTest: 0.4, roughness: 0.9, side: THREE.DoubleSide }));
    s.name = `Interior local · prenda colgada izquierda ${i + 1}`;
    bindProductVisual(s, { piso: 'local', index: i }, tex); // clickeable como producto
    s.position.set(-2.72 + i * 0.02, PLAT + 1.58, -6.85 + i * 0.42);
    s.rotation.y = Math.PI / 2;
    g.add(s);
  });

  // — Exhibidor del jean blanco (adelante-izquierda, como la foto) —
  const px = -2.2, pz = -5.3;
  const jean = new THREE.Group();
  jean.name = 'Interior local · exhibidor jean completo';
  jean.userData.editorCollider = true;
  jean.userData.productSlot = { piso: 'local', index: 4 }; // clickeable como producto
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.22, 0.03, 14), black);
  base.name = 'Interior local · exhibidor jean base';
  base.position.set(px, PLAT + 0.015, pz); jean.add(base);
  jean.add(named(box(0.13, 0.85, 0.15, px - 0.07, PLAT + 0.45, pz, white), 'Interior local · jean blanco pierna izquierda'));
  jean.add(named(box(0.13, 0.85, 0.15, px + 0.07, PLAT + 0.45, pz, white), 'Interior local · jean blanco pierna derecha'));
  jean.add(named(box(0.3, 0.16, 0.17, px, PLAT + 0.95, pz, white), 'Interior local · jean blanco cintura'));
  const top = new THREE.Mesh(new THREE.CylinderGeometry(0.19, 0.19, 0.04, 14), black);
  top.name = 'Interior local · exhibidor jean tapa';
  top.position.set(px, PLAT + 1.12, pz); jean.add(top);
  g.add(jean);

  // — Derecha: divisor de madera + banqueta roja + corcho —
  g.add(named(box(0.45, 1.05, 2.2, 2.72, PLAT + 0.525, -5.8, wood), 'Interior local · divisor madera derecho', { collider: true }));
  const redStool = new THREE.Group();
  redStool.name = 'Interior local · banqueta roja completa';
  redStool.userData.editorCollider = true;
  const rSeat = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.05, 12), mat(0xc22a1f, 0.6));
  rSeat.name = 'Interior local · banqueta roja asiento';
  rSeat.position.set(2.35, PLAT + 0.85, -7.5); redStool.add(rSeat);
  for (const [lx, lz] of [[-0.1, -0.1], [0.1, -0.1], [0, 0.12]]) {
    const leg = named(box(0.03, 0.85, 0.03, 2.35 + lx, PLAT + 0.42, -7.5 + lz, mat(0xc22a1f, 0.6)), 'Interior local · banqueta roja pata');
    redStool.add(leg);
  }
  g.add(redStool);
  const cork = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 0.75), corkTexturePlane());
  cork.name = 'Interior local · corcho pared derecha';
  cork.position.set(LOCAL_HALF - 0.11, PLAT + 1.5, -6.8);
  cork.rotation.y = -Math.PI / 2;
  g.add(cork);

  // — Detalles: extintor + aire acondicionado —
  const ext = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.34, 10), mat(0xc22a1f, 0.5));
  ext.name = 'Interior local · extintor';
  ext.position.set(0.28, PLAT + 1.15, Z_LOCAL_BACK + 0.14); g.add(ext);
  g.add(named(box(0.85, 0.28, 0.22, 0.8, PLAT + 2.72, Z_FACADE - 0.16, white), 'Interior local · aire acondicionado split'));

  // luz de relleno cálida general
  const fill = new THREE.PointLight(0xfff0dd, 3, 8, 2);
  fill.position.set(0, PLAT + H - 0.4, -7.2);
  fill.userData.whiteInteriorLight = true;
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
  g.add(named(box(W, H_LIBRE, 0.1, cx, PLAT + H_LIBRE / 2, zBack, dark), 'Stock selector · panel fondo oscuro'));
  g.add(named(box(0.08, H_LIBRE, GAP_STUB, GAP_X0, PLAT + H_LIBRE / 2, Z_LOCAL_BACK - GAP_STUB / 2, dark), 'Stock selector · lateral izquierdo'));
  g.add(named(box(0.08, H_LIBRE, GAP_STUB, GAP_X1, PLAT + H_LIBRE / 2, Z_LOCAL_BACK - GAP_STUB / 2, dark), 'Stock selector · lateral derecho'));
  const rail = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, W - 0.3, 8), mat(0xb9bcc2, 0.25, 0.9));
  rail.name = 'Stock selector · barral cromado';
  rail.rotation.z = Math.PI / 2;
  rail.position.set(cx, PLAT + 2.05, zShirt);
  g.add(rail);
  // foco puntual para que las remeras se lean bien
  const spot = new THREE.PointLight(0xfff3dd, 5, 4.5, 2);
  spot.position.set(cx, PLAT + 2.6, Z_LOCAL_BACK - 0.5);
  spot.userData.whiteInteriorLight = true;
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
    shirt.name = `Stock selector · remera ${d.label}`;
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
    tag.name = `Stock selector · etiqueta ${d.label}`;
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
