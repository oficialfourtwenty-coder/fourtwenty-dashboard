// Mobiliario retail estilo GTA V (Ponsonbys/Suburban), low-poly estilizado.
// PILOTO: Piso 3 · HOOP SEASON (dressFloor3). Cuando el dueño apruebe, el
// mismo patrón se replica a los demás pisos.
//
// Performance: los props repetidos (prendas colgadas, cajas de zapatillas,
// pilas dobladas) usan InstancedMesh — una sola geometría compartida en GPU
// con matriz + color por instancia. Los muebles grandes van como mesh normal.
import * as THREE from 'three';
import { FLOOR_YS, INTERIOR } from './building.js';
import { garmentTexture } from './gallery.js';

const white = new THREE.MeshStandardMaterial({ color: 0xf6f5f2, roughness: 0.9 });
const chrome = new THREE.MeshStandardMaterial({ color: 0xb9bcc2, roughness: 0.25, metalness: 0.9 });
const darkMetal = new THREE.MeshStandardMaterial({ color: 0x2e2e33, roughness: 0.4, metalness: 0.7 });

function box(w, h, d, x, y, z, mat) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y, z);
  return m;
}

const smooth = (t) => {
  t.colorSpace = THREE.SRGBColorSpace;
  t.magFilter = THREE.LinearFilter;
  t.minFilter = THREE.LinearMipmapLinearFilter;
  t.anisotropy = 8;
  return t;
};

// ---- Texturas de props ------------------------------------------------------
function shoeBoxTexture() {
  const c = document.createElement('canvas');
  c.width = 128; c.height = 128;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#f4f2ee';
  ctx.fillRect(0, 0, 128, 128);
  ctx.fillStyle = 'rgba(0,0,0,0.18)';
  ctx.fillRect(0, 34, 128, 4);            // filo de la tapa
  ctx.fillStyle = '#2a2a2e';
  ctx.beginPath(); ctx.arc(64, 80, 10, 0, 7); ctx.fill(); // logo
  return smooth(new THREE.CanvasTexture(c));
}

function foldedTexture() {
  const c = document.createElement('canvas');
  c.width = 128; c.height = 64;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#f0eee9';
  ctx.fillRect(0, 0, 128, 64);
  ctx.fillStyle = 'rgba(0,0,0,0.12)';
  for (const y of [16, 34, 50]) ctx.fillRect(0, y, 128, 3); // dobleces
  return smooth(new THREE.CanvasTexture(c));
}

function curtainTexture() {
  const c = document.createElement('canvas');
  c.width = 128; c.height = 128;
  const ctx = c.getContext('2d');
  for (let x = 0; x < 128; x += 16) {
    ctx.fillStyle = (x / 16) % 2 ? '#1f4d2e' : '#e8dfc9';
    ctx.fillRect(x, 0, 16, 128);
  }
  ctx.fillStyle = 'rgba(0,0,0,0.15)';
  for (let x = 12; x < 128; x += 16) ctx.fillRect(x, 0, 3, 128); // sombra de pliegue
  return smooth(new THREE.CanvasTexture(c));
}

function signTexture(text) {
  const c = document.createElement('canvas');
  c.width = 512; c.height = 128;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#f6f5f2';
  ctx.fillRect(0, 0, 512, 128);
  ctx.strokeStyle = '#c9c7c0';
  ctx.lineWidth = 6;
  ctx.strokeRect(3, 3, 506, 122);
  ctx.fillStyle = '#17171a';
  ctx.font = 'bold 64px monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 256, 68);
  return smooth(new THREE.CanvasTexture(c));
}

// ---- Instanciados (props repetidos) ----------------------------------------
// Colector: acumula matrices/colores y al final crea UN InstancedMesh por tipo.
class InstancePool {
  constructor(geo, mat) {
    this.geo = geo; this.mat = mat;
    this.items = []; // { matrix, color }
  }

  add(pos, rotY, color, scale = 1) {
    const m = new THREE.Matrix4().compose(
      pos,
      new THREE.Quaternion().setFromEuler(new THREE.Euler(0, rotY, 0)),
      new THREE.Vector3(scale, scale, scale),
    );
    this.items.push({ m, color: new THREE.Color(color) });
  }

  build(scene) {
    if (!this.items.length) return;
    const im = new THREE.InstancedMesh(this.geo, this.mat, this.items.length);
    this.items.forEach(({ m, color }, i) => {
      im.setMatrixAt(i, m);
      im.setColorAt(i, color);
    });
    im.castShadow = true;
    im.receiveShadow = true;
    scene.add(im);
  }
}

function makePools() {
  return {
    // prendas colgadas (textura blanca, el color va por instancia)
    tee: new InstancePool(
      new THREE.PlaneGeometry(0.6, 0.72),
      new THREE.MeshStandardMaterial({ map: garmentTexture(0xffffff, 'tee'), transparent: true, alphaTest: 0.4, roughness: 0.95, side: THREE.DoubleSide }),
    ),
    jersey: new InstancePool(
      new THREE.PlaneGeometry(0.6, 0.72),
      new THREE.MeshStandardMaterial({ map: garmentTexture(0xffffff, 'jersey'), transparent: true, alphaTest: 0.4, roughness: 0.95, side: THREE.DoubleSide }),
    ),
    shoeBox: new InstancePool(
      new THREE.BoxGeometry(0.32, 0.13, 0.22),
      new THREE.MeshStandardMaterial({ map: shoeBoxTexture(), roughness: 0.85 }),
    ),
    folded: new InstancePool(
      new THREE.BoxGeometry(0.34, 0.05, 0.28),
      new THREE.MeshStandardMaterial({ map: foldedTexture(), roughness: 0.95 }),
    ),
  };
}

// ---- Muebles ----------------------------------------------------------------
// Perchero circular: base + caño + aro cromado, prendas instanciadas alrededor.
function roundRack(g, colliders, pools, Y, x, z, colors, type) {
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.34, 0.06, 14), darkMetal);
  base.position.set(x, Y + 0.03, z);
  g.add(base);
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 1.42, 8), chrome);
  pole.position.set(x, Y + 0.74, z);
  g.add(pole);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.55, 0.02, 8, 24), chrome);
  ring.rotation.x = Math.PI / 2;
  ring.position.set(x, Y + 1.42, z);
  g.add(ring);
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2;
    pools[type].add(
      new THREE.Vector3(x + Math.cos(a) * 0.52, Y + 1.04, z + Math.sin(a) * 0.52),
      Math.atan2(Math.cos(a), Math.sin(a)),
      colors[i % colors.length],
    );
  }
  colliders.push({ minX: x - 0.65, maxX: x + 0.65, minY: Y, maxY: Y + 1.45, minZ: z - 0.65, maxZ: z + 0.65 });
}

// Estantería de pared: paneles + estantes, con pilas dobladas y cajas de
// zapatillas instanciadas. side: 'front' (pared z-) | 'east' (pared x+).
function wallShelving(g, colliders, pools, Y, along, colors) {
  const { side, at } = along; // at = coordenada del centro sobre la pared
  const WIDTH = 3, DEPTH = 0.4, HEIGHT = 2.2;
  const isFront = side === 'front';
  const wall = isFront ? -INTERIOR.z + DEPTH / 2 + 0.02 : INTERIOR.x - DEPTH / 2 - 0.02;
  const cx = isFront ? at : wall;
  const cz = isFront ? wall : at;
  const rot = isFront ? 0 : -Math.PI / 2;
  const unit = new THREE.Group();
  unit.add(box(0.05, HEIGHT, DEPTH, -WIDTH / 2, HEIGHT / 2, 0, white));
  unit.add(box(0.05, HEIGHT, DEPTH, WIDTH / 2, HEIGHT / 2, 0, white));
  unit.add(box(WIDTH, 0.05, DEPTH, 0, HEIGHT, 0, white));
  for (const sy of [0.35, 0.95, 1.55]) unit.add(box(WIDTH - 0.1, 0.04, DEPTH, 0, sy, 0, white));
  unit.position.set(cx, Y, cz);
  unit.rotation.y = rot;
  g.add(unit);
  // contenido instanciado (coordenadas en mundo)
  const place = (dx, sy, item, color, ry = 0) => {
    const wx = isFront ? cx + dx : cx;
    const wz = isFront ? cz : cz + dx;
    pools[item].add(new THREE.Vector3(wx, Y + sy, wz), rot + ry, color);
  };
  for (let i = 0; i < 6; i++) {
    const dx = -1.25 + i * 0.5;
    place(dx, 0.35 + 0.09, 'shoeBox', 0xf4f2ee);                     // fila de cajas abajo
    place(dx, 0.35 + 0.09 + 0.13, 'shoeBox', colors[i % colors.length]); // segunda caja de color
    place(dx, 0.95 + 0.05, 'folded', colors[(i + 1) % colors.length]);
    place(dx, 0.95 + 0.10, 'folded', colors[(i + 3) % colors.length]);
    place(dx, 1.55 + 0.05, 'folded', colors[(i + 2) % colors.length]);
  }
  const hw = isFront ? WIDTH / 2 : DEPTH / 2;
  const hd = isFront ? DEPTH / 2 : WIDTH / 2;
  colliders.push({ minX: cx - hw, maxX: cx + hw, minY: Y, maxY: Y + HEIGHT, minZ: cz - hd, maxZ: cz + hd });
}

// Maniquí low-poly sin brazos (estilo retail) con outfit de la colección.
function mannequin(g, colliders, Y, x, z, rotY, teeColor, shortColor) {
  const m = new THREE.Group();
  const body = new THREE.MeshStandardMaterial({ color: 0xe9e6df, roughness: 0.6 });
  const b = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.32, 0.05, 14), darkMetal);
  b.position.y = 0.025; m.add(b);
  const poleM = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.55, 8), chrome);
  poleM.position.y = 0.3; m.add(poleM);
  const shorts = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.19, 0.3, 12), new THREE.MeshStandardMaterial({ color: shortColor, roughness: 0.95 }));
  shorts.position.y = 0.72; m.add(shorts);
  const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.19, 0.16, 0.55, 12), new THREE.MeshStandardMaterial({ color: teeColor, roughness: 0.95 }));
  torso.position.y = 1.14; m.add(torso);
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.08, 8), body);
  neck.position.y = 1.45; m.add(neck);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.11, 12, 10), body);
  head.position.y = 1.58; m.add(head);
  m.position.set(x, Y, z);
  m.rotation.y = rotY;
  g.add(m);
  colliders.push({ minX: x - 0.3, maxX: x + 0.3, minY: Y, maxY: Y + 1.7, minZ: z - 0.3, maxZ: z + 0.3 });
}

// Probador contra la pared este: dos paneles + barral + cortina + cartel.
function fittingRoom(g, colliders, Y, z0, z1) {
  const xIn = INTERIOR.x - 1.3;   // frente de la cabina
  const cx = (INTERIOR.x + xIn) / 2;
  for (const z of [z0, z1]) {
    g.add(box(INTERIOR.x - xIn, 2.3, 0.06, cx, Y + 1.15, z, white));
    colliders.push({ minX: xIn, maxX: INTERIOR.x, minY: Y, maxY: Y + 2.3, minZ: z - 0.03, maxZ: z + 0.03 });
  }
  const barral = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, z1 - z0, 8), chrome);
  barral.rotation.x = Math.PI / 2;
  barral.position.set(xIn, Y + 2.1, (z0 + z1) / 2);
  g.add(barral);
  const curtain = new THREE.Mesh(
    new THREE.PlaneGeometry(z1 - z0 - 0.15, 1.95),
    new THREE.MeshStandardMaterial({ map: curtainTexture(), roughness: 1, side: THREE.DoubleSide }),
  );
  curtain.rotation.y = -Math.PI / 2;
  curtain.position.set(xIn, Y + 1.12, (z0 + z1) / 2);
  g.add(curtain); // sin collider: en Fase 2 se entra a probarse
}

// Cartel de sección: panel físico con marco (nada de sprites flotando).
function sectionSign(g, text, x, y, z, rotY, w = 1.7, h = 0.45) {
  const s = new THREE.Group();
  const frame = new THREE.Mesh(new THREE.BoxGeometry(w + 0.08, h + 0.08, 0.06), darkMetal);
  frame.position.z = -0.035;
  s.add(frame);
  const face = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: signTexture(text) }));
  s.add(face);
  s.position.set(x, y, z);
  s.rotation.y = rotY;
  g.add(s);
}

// Riel de luces cosmético: barra + tachos apuntando a la pared. No agrega
// luces reales (el sistema de spots cálidos ya existe; esto lo "explica").
function lightRail(g, Y, isFront, at, len) {
  const y = Y + 3.6;
  const rail = isFront
    ? box(len, 0.06, 0.06, at, y, -INTERIOR.z + 0.6, darkMetal)
    : box(0.06, 0.06, len, INTERIOR.x - 0.6, y, at, darkMetal);
  g.add(rail);
  for (let i = 0; i < 3; i++) {
    const t = -len / 2 + 0.4 + (i * (len - 0.8)) / 2;
    const can = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 0.18, 10), darkMetal);
    if (isFront) {
      can.position.set(at + t, y - 0.12, -INTERIOR.z + 0.6);
      can.rotation.x = -0.7;
    } else {
      can.position.set(INTERIOR.x - 0.6, y - 0.12, at + t);
      can.rotation.z = 0.7;
    }
    g.add(can);
  }
}

// ---- PILOTO: Piso 3 · HOOP SEASON -------------------------------------------
export function dressFloor3(scene) {
  const Y = FLOOR_YS[2];
  const g = new THREE.Group();
  const colliders = [];
  const pools = makePools();
  // paleta hoop + neutros para densidad visual
  const colors = [0xd96b2f, 0x1c1c1c, 0xf5f2ea, 0x4b2e83, 0xd4af37, 0x9aa0a3];

  // percheros circulares al centro (la cancha vive al oeste)
  roundRack(g, colliders, pools, Y, -1, -5, colors, 'jersey');
  roundRack(g, colliders, pools, Y, 3.5, -0.5, colors, 'jersey');
  roundRack(g, colliders, pools, Y, -1, 4.5, colors, 'tee');
  roundRack(g, colliders, pools, Y, 7.5, -5.5, colors, 'tee');

  // estanterías: dos en la pared del frente (zapatillas) + una en la este
  wallShelving(g, colliders, pools, Y, { side: 'front', at: 3 }, colors);
  wallShelving(g, colliders, pools, Y, { side: 'front', at: 6.6 }, colors);
  wallShelving(g, colliders, pools, Y, { side: 'east', at: -7 }, colors);
  sectionSign(g, 'SNEAKERS', 4.8, Y + 2.75, -INTERIOR.z + 0.08, 0);

  // maniquíes en puntos focales: llegada de escalera, borde de cancha, esquina
  mannequin(g, colliders, Y, 1.5, 8, Math.PI, 0xd96b2f, 0x1c1c1c);       // recibe al subir
  mannequin(g, colliders, Y, -5.8, 2.6, Math.PI / 3, 0x4b2e83, 0xf5f2ea); // borde cancha
  mannequin(g, colliders, Y, 12.5, -10, -Math.PI / 4, 0x1c1c1c, 0xd96b2f); // esquina sneakers

  // probador señalizado (pared este) + espejos
  fittingRoom(g, colliders, Y, 2.5, 5.5);
  sectionSign(g, 'PROBADOR', INTERIOR.x - 0.08, Y + 2.75, 4, -Math.PI / 2, 1.5, 0.4);
  const mirrorAt = (x, z, rotY) => {
    const m = new THREE.Group();
    m.add(box(0.95, 2.0, 0.06, 0, 1.05, 0, darkMetal));
    const glass = new THREE.Mesh(
      new THREE.PlaneGeometry(0.82, 1.86),
      new THREE.MeshStandardMaterial({ color: 0xdfe6ea, roughness: 0.06, metalness: 1.0 }),
    );
    glass.position.set(0, 1.05, 0.035);
    m.add(glass);
    m.position.set(x, Y, z);
    m.rotation.y = rotY;
    g.add(m);
    colliders.push({ minX: x - 0.5, maxX: x + 0.5, minY: Y, maxY: Y + 2.1, minZ: z - 0.15, maxZ: z + 0.15 });
  };
  mirrorAt(INTERIOR.x - 0.15, 0.8, -Math.PI / 2);  // junto al probador
  mirrorAt(-8, -INTERIOR.z + 0.15, 0);             // pared frente, lado cancha

  // mostrador/caja cerca de la llegada + cartel colgante
  g.add(box(2.2, 1.0, 0.75, 9, Y + 0.5, 6.5, white));
  g.add(box(2.3, 0.06, 0.85, 9, Y + 1.03, 6.5, new THREE.MeshStandardMaterial({ color: 0x8a6a48, roughness: 0.6 })));
  g.add(box(0.18, 0.12, 0.14, 8.4, Y + 1.12, 6.5, darkMetal));
  colliders.push({ minX: 7.85, maxX: 10.15, minY: Y, maxY: Y + 1.1, minZ: 6.05, maxZ: 6.95 });
  for (const dx of [-0.8, 0.8]) g.add(box(0.02, 1.0, 0.02, 9 + dx, Y + 3.1, 6.5, darkMetal)); // cables
  sectionSign(g, 'CAJA', 9, Y + 2.6, 6.5, 0, 1.3, 0.4);

  // rieles de luz sobre displays clave (cosméticos, sin luces nuevas)
  lightRail(g, Y, true, 4.8, 6.5);   // sobre las estanterías de sneakers
  lightRail(g, Y, false, -7, 3.5);   // sobre la estantería este

  g.traverse((m) => {
    if (m.isMesh && !m.material.isMeshBasicMaterial) {
      m.castShadow = true;
      m.receiveShadow = true;
    }
  });
  scene.add(g);
  for (const p of Object.values(pools)) p.build(scene);
  return colliders;
}
