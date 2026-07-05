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
import { towerFacade, veredaTile, hexPaver, greenShutter, whiteFloor, lightCeiling } from './textures.js';
import { box } from './gfxUtils.js';

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
const FRENTE = 14;          // medio-frente jugable (x -14..14)

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

// Límites para el clamp de la cámara (afuera: toda la escena; adentro: el local).
export const STREET_BOUNDS = { minX: -FRENTE - 0.5, maxX: FRENTE + 0.5, minZ: Z_LOCAL_BACK - GAP_STUB, maxZ: Z_CURB + 1 };
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

// ---- Construcción principal -------------------------------------------------
export function buildStreet(scene) {
  const colliders = [];
  const g = new THREE.Group();

  const hexMat = new THREE.MeshStandardMaterial({ map: hexPaver(6, 3), roughness: 0.95 });
  const veredaMat = new THREE.MeshStandardMaterial({ map: veredaTile(8, 4), roughness: 0.9 });
  const hormigonMat = mat(HORMIGON, 0.9);
  const salviaMat = mat(SALVIA, 0.8);
  const cremaMat = mat(CREMA, 0.85);
  const shutterMat = new THREE.MeshStandardMaterial({ map: greenShutter(2, 1), roughness: 0.6, metalness: 0.3 });
  const inglesMat = mat(INGLES, 0.5, 0.4);
  const glassMat = new THREE.MeshPhysicalMaterial({ color: 0x2a3a42, roughness: 0.08, metalness: 0.1, transparent: true, opacity: 0.4 });

  // ---- Suelos --------------------------------------------------------------
  // calzada (adoquín oscuro), cordón, vereda gris, plaza hexagonal
  const street = new THREE.Mesh(new THREE.PlaneGeometry(FRENTE * 2 + 20, 8), mat(0x3a3a3c, 0.95));
  street.rotation.x = -Math.PI / 2; street.position.set(0, -0.05, Z_STREET + 2); scene.add(street);
  g.add(box(FRENTE * 2 + 4, 0.15, 0.4, 0, 0.075, Z_CURB, mat(0x8a8880, 0.9))); // cordón granito
  const vereda = new THREE.Mesh(new THREE.PlaneGeometry(FRENTE * 2, Z_CURB - 3.5), veredaMat);
  vereda.rotation.x = -Math.PI / 2; vereda.position.set(0, 0, (Z_CURB + 3.5) / 2); vereda.receiveShadow = true; scene.add(vereda);
  const plaza = new THREE.Mesh(new THREE.PlaneGeometry(FRENTE * 2, 3.5 - Z_STEP_FOOT), hexMat);
  plaza.rotation.x = -Math.PI / 2; plaza.position.set(0, 0.001, 3.5 / 2); plaza.receiveShadow = true; scene.add(plaza);

  // ---- Escalones (spec 03, CRÍTICO): 3 pasos anchos y bajos ----------------
  // 2 boxes escalonados + la plataforma de la galería (= 3er nivel).
  const stepA = box(FRENTE * 2, STEP_RISE, STEP_RUN * 2, 0, STEP_RISE / 2, -STEP_RUN, hormigonMat);
  const stepB = box(FRENTE * 2, STEP_RISE * 2, STEP_RUN, 0, STEP_RISE, -STEP_RUN * 2, hormigonMat);
  for (const s of [stepA, stepB]) { s.castShadow = true; s.receiveShadow = true; g.add(s); }

  // ---- Plataforma/galería a y=PLAT -----------------------------------------
  const galZc = (Z_STEP_TOP + Z_FACADE) / 2;
  const plat = box(FRENTE * 2, PLAT, Z_STEP_TOP - Z_FACADE, 0, PLAT / 2, galZc, hormigonMat);
  plat.receiveShadow = true; g.add(plat);

  // Columnas verde salvia (sección cuadrada 0.40), ritmo eje 4.5m, en el borde
  // delantero de la galería. Alero volado arriba.
  for (let x = -FRENTE + 2; x <= FRENTE - 2 + 0.01; x += EJE_COL) {
    const col = box(COL, H_LIBRE, COL, x, PLAT + H_LIBRE / 2, Z_STEP_TOP - 0.3, salviaMat);
    col.castShadow = true; col.receiveShadow = true; g.add(col);
    colliders.push({ minX: x - COL / 2 - 0.05, maxX: x + COL / 2 + 0.05, minY: 0, maxY: PLAT + H_LIBRE, minZ: Z_STEP_TOP - 0.3 - COL / 2, maxZ: Z_STEP_TOP - 0.3 + COL / 2 });
  }
  // Alero/losa voladiza (canto verde salvia), vuela 1.5m sobre la vereda.
  const aleroZ0 = Z_STEP_TOP + ALERO_VUELO, aleroZ1 = Z_FACADE;
  const alero = box(FRENTE * 2 + 1, ALERO_T, aleroZ0 - aleroZ1, 0, PLAT + H_LIBRE + ALERO_T / 2, (aleroZ0 + aleroZ1) / 2, salviaMat);
  alero.castShadow = true; g.add(alero);

  // ---- Frente de locales (línea Z_FACADE) ----------------------------------
  // Todo el frente es persiana verde (locales cerrados) MENOS el vano central
  // (FOURTWENTY), que lleva vidriera con puerta.
  const facadeTop = PLAT + H_LIBRE;
  // zócalo ciego verde continuo (0.9m) a lo largo del frente
  g.add(box(FRENTE * 2, 0.9, 0.12, 0, PLAT + 0.45, Z_FACADE, inglesMat));
  // persianas a los costados del vano de FOURTWENTY
  for (const [x0, x1] of [[-FRENTE, -VID_W / 2], [VID_W / 2, FRENTE]]) {
    const w = x1 - x0, cx = (x0 + x1) / 2;
    const shutter = box(w, H_LIBRE - 0.9, 0.1, cx, PLAT + 0.9 + (H_LIBRE - 0.9) / 2, Z_FACADE, shutterMat);
    shutter.castShadow = true; shutter.receiveShadow = true; g.add(shutter);
    colliders.push({ minX: x0, maxX: x1, minY: 0, maxY: facadeTop, minZ: Z_FACADE - 0.1, maxZ: Z_FACADE + 0.1 });
  }
  // dintel sobre el vano central + cartel-toldo plano para branding
  g.add(box(VID_W + 0.4, 0.5, 0.14, 0, facadeTop - 0.25, Z_FACADE, cremaMat));
  const toldo = box(VID_W + 0.2, 0.06, 0.9, 0, facadeTop - 0.5, Z_FACADE + 0.5, mat(0x1a1a1e, 0.5));
  g.add(toldo);
  neonFT(scene, 0, facadeTop - 0.55, Z_FACADE + 0.9);

  // ---- Vidriera FOURTWENTY (verde inglés, cuadrícula) con puerta -----------
  buildStorefront(g, colliders, inglesMat, glassMat);

  // ---- Interior del local (elevado a PLAT, sin muebles) --------------------
  buildLocalInterior(scene, g, colliders);

  // ---- Torres de fondo: volúmenes SEPARADOS (no una tira repetida) ----------
  // Suben desde la línea del alero, set-back en Z, con cielo entre ellas.
  const baseY = facadeTop + ALERO_T;
  towerBlock(scene, 0, -11, 15, 12, 30, baseY);    // Torre 1 (la del local)
  towerBlock(scene, -20, -15, 13, 11, 26, baseY);  // vecina izquierda (más atrás)
  towerBlock(scene, 21, -14, 13, 11, 28, baseY);   // vecina derecha
  towerBlock(scene, 5, -26, 16, 10, 34, 0);        // torre lejana de fondo

  // reja verde mínima a un costado (el lado derecho completo va en Pass C)
  for (let x = FRENTE - 1; x <= FRENTE + 2; x += 0.4) {
    g.add(box(0.05, 1.2, 0.05, x, 0.6, Z_STEP_TOP - 1, mat(REJA, 0.5, 0.5)));
  }
  g.add(box(3.4, 0.08, 0.08, FRENTE + 0.5, 1.2, Z_STEP_TOP - 1, mat(REJA, 0.5, 0.5)));

  // ---- Límites invisibles (spec 02): cordón + 2 extremos + fondo -----------
  colliders.push({ minX: -FRENTE - 0.5, maxX: FRENTE + 0.5, minY: 0, maxY: 3, minZ: Z_CURB, maxZ: Z_CURB + 0.4 }); // cordón
  colliders.push({ minX: -FRENTE - 0.5, maxX: -FRENTE - 0.1, minY: 0, maxY: 4, minZ: Z_LOCAL_BACK, maxZ: Z_CURB }); // izq
  colliders.push({ minX: FRENTE + 0.1, maxX: FRENTE + 0.5, minY: 0, maxY: 4, minZ: Z_LOCAL_BACK, maxZ: Z_CURB });   // der

  // ---- Vegetación PUNTUAL (ref: plano del dueño) ---------------------------
  // Cantero principal centro-izquierda: árbol + plantas cannábicas (marca).
  planter(scene, colliders, -4, 2.6, 5.5, 1.4);
  tree(scene, -5.5, 2.6, true);
  for (const cx of [-5, -4, -3, -2.2]) cannabisPlant(scene, cx, 2.7, 0.5);
  // Cantero chico a la derecha.
  planter(scene, colliders, 5, 2.8, 3, 1.3);
  cannabisPlant(scene, 4.4, 2.9, 0.5); cannabisPlant(scene, 5.5, 2.7, 0.5);
  // Árboles lejanos SOLO de fondo (fuera de la zona caminable, enmarcan).
  tree(scene, -22, 4, false); tree(scene, 23, 4.5, true); tree(scene, 15, -10, false);

  // ---- Luz: sol de mediodía-invierno, cálido rasante, sombras largas -------
  scene.add(new THREE.HemisphereLight(0xbfd6ea, 0x9a9488, 0.9)); // cielo celeste / suelo
  const sun = new THREE.DirectionalLight(0xfff1d6, 2.2);
  sun.position.set(14, 16, 10); // bajo → sombras largas
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.left = -FRENTE - 4; sun.shadow.camera.right = FRENTE + 4;
  sun.shadow.camera.top = 24; sun.shadow.camera.bottom = -24;
  sun.shadow.camera.near = 1; sun.shadow.camera.far = 70;
  sun.shadow.bias = -0.0004;
  scene.add(sun);

  scene.add(g);
  return colliders;
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
  const floorMat = new THREE.MeshStandardMaterial({ map: whiteFloor(LOCAL_HALF, 3), roughness: 0.85 });
  const wallMat = mat(CREMA, 1);
  const ceilMat = new THREE.MeshStandardMaterial({ map: lightCeiling(LOCAL_HALF, 3), roughness: 1 });
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

  // luz cálida puntual adentro (sin ambiental propia: ya hay una global afuera)
  const lamp = new THREE.PointLight(0xffe9c4, 4, 7, 2);
  lamp.position.set(0, PLAT + H - 0.3, zc);
  scene.add(lamp);
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
