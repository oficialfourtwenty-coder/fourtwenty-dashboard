// Mobiliario retail estilo GTA V (Ponsonbys/Suburban), low-poly estilizado.
// TODOS los pisos se visten acá (patrón piloto del piso 3 aprobado por el
// dueño y replicado con la identidad de cada colección).
//
// Performance: los props repetidos (prendas colgadas, cajas de zapatillas,
// pilas dobladas) usan InstancedMesh — un solo mesh por tipo para TODO el
// edificio, con matriz + color por instancia. Muebles grandes = mesh normal.
import * as THREE from 'three';
import { FLOOR_YS, INTERIOR } from './building.js';
import { garmentTexture } from './gallery.js';
import { registerSpinner } from './anim.js';
import { LAYOUT } from './layout.js';
import { COLLECTIONS } from './collections.js';
import { placeModel } from './customModels.js';
import { box, smoothTexture as smooth, hiCanvas, white, chrome, darkMetal } from './gfxUtils.js';

const woodTop = new THREE.MeshStandardMaterial({ color: 0x8a6a48, roughness: 0.6 });

// ---- Texturas de props ------------------------------------------------------
function shoeBoxTexture() {
  const [c, ctx] = hiCanvas(128, 128);
  ctx.fillStyle = '#f4f2ee';
  ctx.fillRect(0, 0, 128, 128);
  ctx.fillStyle = 'rgba(0,0,0,0.18)';
  ctx.fillRect(0, 34, 128, 4);            // filo de la tapa
  ctx.fillStyle = '#2a2a2e';
  ctx.beginPath(); ctx.arc(64, 80, 10, 0, 7); ctx.fill(); // logo
  return smooth(new THREE.CanvasTexture(c));
}

function foldedTexture() {
  const [c, ctx] = hiCanvas(128, 64);
  ctx.fillStyle = '#f0eee9';
  ctx.fillRect(0, 0, 128, 64);
  ctx.fillStyle = 'rgba(0,0,0,0.12)';
  for (const y of [16, 34, 50]) ctx.fillRect(0, y, 128, 3); // dobleces
  return smooth(new THREE.CanvasTexture(c));
}

function curtainTexture() {
  const [c, ctx] = hiCanvas(128, 128);
  for (let x = 0; x < 128; x += 16) {
    ctx.fillStyle = (x / 16) % 2 ? '#1f4d2e' : '#e8dfc9';
    ctx.fillRect(x, 0, 16, 128);
  }
  ctx.fillStyle = 'rgba(0,0,0,0.15)';
  for (let x = 12; x < 128; x += 16) ctx.fillRect(x, 0, 3, 128); // sombra de pliegue
  return smooth(new THREE.CanvasTexture(c));
}

function signTexture(text) {
  const [c, ctx] = hiCanvas(512, 128);
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

// ---- Instanciados (props repetidos en todo el edificio) ---------------------
class InstancePool {
  constructor(geo, mat) {
    this.geo = geo; this.mat = mat;
    this.items = [];
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

const garmentMat = (type, extra) => new THREE.MeshStandardMaterial({
  map: garmentTexture(0xffffff, type, extra),
  transparent: true, alphaTest: 0.4, roughness: 0.95, side: THREE.DoubleSide,
});
const garmentGeo = () => new THREE.PlaneGeometry(0.6, 0.72);

function makePools() {
  return {
    tee: new InstancePool(garmentGeo(), garmentMat('tee')),
    hoodie: new InstancePool(garmentGeo(), garmentMat('hoodie')),
    jersey: new InstancePool(garmentGeo(), garmentMat('jersey')),
    bobTee: new InstancePool(garmentGeo(), garmentMat('tee', { monkeyFace: true })),
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

function wallShelving(g, colliders, pools, Y, { side, at }, colors) {
  const WIDTH = 2.2, DEPTH = 0.4, HEIGHT = 2.0;
  const isFront = side === 'front';
  const wall = isFront ? -INTERIOR.z + DEPTH / 2 + 0.02 : INTERIOR.x - DEPTH / 2 - 0.02;
  const cx = isFront ? at : wall;
  const cz = isFront ? wall : at;
  const rot = isFront ? 0 : -Math.PI / 2;
  const unit = new THREE.Group();
  unit.add(box(0.05, HEIGHT, DEPTH, -WIDTH / 2, HEIGHT / 2, 0, white));
  unit.add(box(0.05, HEIGHT, DEPTH, WIDTH / 2, HEIGHT / 2, 0, white));
  unit.add(box(WIDTH, 0.05, DEPTH, 0, HEIGHT, 0, white));
  for (const sy of [0.35, 0.9, 1.45]) unit.add(box(WIDTH - 0.1, 0.04, DEPTH, 0, sy, 0, white));
  unit.position.set(cx, Y, cz);
  unit.rotation.y = rot;
  g.add(unit);
  const place = (dx, sy, item, color) => {
    const wx = isFront ? cx + dx : cx;
    const wz = isFront ? cz : cz + dx;
    pools[item].add(new THREE.Vector3(wx, Y + sy, wz), rot, color);
  };
  for (let i = 0; i < 5; i++) {
    const dx = -0.8 + i * 0.4;
    place(dx, 0.44, 'shoeBox', 0xf4f2ee);
    place(dx, 0.57, 'shoeBox', colors[i % colors.length]);
    place(dx, 0.95, 'folded', colors[(i + 1) % colors.length]);
    place(dx, 1.0, 'folded', colors[(i + 3) % colors.length]);
    place(dx, 1.5, 'folded', colors[(i + 2) % colors.length]);
  }
  const hw = isFront ? WIDTH / 2 : DEPTH / 2;
  const hd = isFront ? DEPTH / 2 : WIDTH / 2;
  colliders.push({ minX: cx - hw, maxX: cx + hw, minY: Y, maxY: Y + HEIGHT, minZ: cz - hd, maxZ: cz + hd });
}

function mannequin(g, colliders, Y, x, z, rotY, teeColor, shortColor) {
  const m = new THREE.Group();
  const body = new THREE.MeshStandardMaterial({ color: 0xe9e6df, roughness: 0.6 });
  const b = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.32, 0.05, 14), darkMetal);
  b.position.y = 0.025; m.add(b);
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.55, 8), chrome);
  pole.position.y = 0.3; m.add(pole);
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

function fittingRoom(g, colliders, Y, z0, z1) {
  const xIn = INTERIOR.x - 1.0;
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

function lightRail(g, Y, isFront, at, len) {
  const y = Y + 2.95;
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

function counterAt(g, colliders, Y, x, z) {
  g.add(box(2.2, 1.0, 0.75, x, Y + 0.5, z, white));
  g.add(box(2.3, 0.06, 0.85, x, Y + 1.03, z, woodTop));
  g.add(box(0.18, 0.12, 0.14, x - 0.6, Y + 1.12, z, darkMetal)); // posnet
  colliders.push({ minX: x - 1.15, maxX: x + 1.15, minY: Y, maxY: Y + 1.1, minZ: z - 0.45, maxZ: z + 0.45 });
  for (const dx of [-0.6, 0.6]) g.add(box(0.02, 0.8, 0.02, x + dx, Y + 3.0, z, darkMetal));
  sectionSign(g, 'CAJA', x, Y + 2.45, z, 0, 1.1, 0.32);
}

function tableAt(g, colliders, pools, Y, x, z, colors) {
  g.add(box(1.7, 0.08, 0.9, x, Y + 0.86, z, white));
  g.add(box(1.5, 0.82, 0.7, x, Y + 0.41, z, white));
  let k = 0;
  for (const [dx, dz] of [[-0.5, -0.18], [0, 0.15], [0.5, -0.12]]) {
    for (let p = 0; p < 3; p++) {
      pools.folded.add(new THREE.Vector3(x + dx, Y + 0.93 + p * 0.055, z + dz), 0, colors[(k + p) % colors.length]);
    }
    k++;
  }
  colliders.push({ minX: x - 0.85, maxX: x + 0.85, minY: Y, maxY: Y + 0.95, minZ: z - 0.45, maxZ: z + 0.45 });
}

function mirrorAt(g, colliders, Y, x, z, rotY) {
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
}

// Vendedor detrás de la caja (NPC estático low-poly con gorra FT).
function shopkeeper(g, Y, x, z, teeColor) {
  const m = new THREE.Group();
  const skin = new THREE.MeshStandardMaterial({ color: 0xc98d5f, roughness: 0.7 });
  const legs = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.17, 0.75, 10), new THREE.MeshStandardMaterial({ color: 0x26262a, roughness: 0.95 }));
  legs.position.y = 0.375; m.add(legs);
  const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.15, 0.55, 10), new THREE.MeshStandardMaterial({ color: teeColor, roughness: 0.95 }));
  torso.position.y = 1.02; m.add(torso);
  for (const s of [-1, 1]) {
    const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.5, 8), skin);
    arm.position.set(s * 0.24, 1.02, 0);
    arm.rotation.z = s * 0.1;
    m.add(arm);
  }
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.12, 12, 10), skin);
  head.position.y = 1.44; m.add(head);
  const capMat = new THREE.MeshStandardMaterial({ color: 0x1f4d2e, roughness: 0.9 });
  const cap = new THREE.Mesh(new THREE.SphereGeometry(0.125, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), capMat);
  cap.position.y = 1.48; m.add(cap);
  const brim = box(0.16, 0.02, 0.12, 0, 1.5, 0.14, capMat);
  m.add(brim); // visera hacia el local
  m.position.set(x, Y, z);
  g.add(m);
}

// Plataforma giratoria con prenda destacada (display de vidriera GTA V).
function spinDisplay(g, colliders, Y, x, z, tex) {
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.66, 0.14, 18), white);
  base.position.set(x, Y + 0.07, z);
  g.add(base);
  const garment = new THREE.Mesh(
    new THREE.PlaneGeometry(0.85, 1.0),
    new THREE.MeshStandardMaterial({ map: tex, transparent: true, alphaTest: 0.4, roughness: 0.95, side: THREE.DoubleSide }),
  );
  garment.position.set(x, Y + 0.75, z);
  g.add(garment);
  registerSpinner(garment);
  colliders.push({ minX: x - 0.65, maxX: x + 0.65, minY: Y, maxY: Y + 0.8, minZ: z - 0.65, maxZ: z + 0.65 });
}

const deg = (d) => (d * Math.PI) / 180;

// ---- Vestido por piso: lee el plano editable de layout.js -------------------
export function buildRetail(scene, { selectedFloor = null, floorY = null } = {}) {
  const g = new THREE.Group();
  const colliders = [];
  const pools = makePools();
  const LOBBY_COLORS = [0x1f4d2e, 0x6d1f2c, 0xe8dfc9, 0x1c1c1c, 0xd96b2f];

  for (const [pisoStr, items] of Object.entries(LAYOUT)) {
    const piso = Number(pisoStr);
    if (selectedFloor !== null && piso !== selectedFloor) continue;
    const Y = floorY ?? FLOOR_YS[piso - 1];
    const colors = COLLECTIONS.find((c) => c.piso === piso)?.colors ?? LOBBY_COLORS;

    for (const it of items) {
      const cs = it.colores ?? colors;
      switch (it.tipo) {
        case 'perchero':
          roundRack(g, colliders, pools, Y, it.x, it.z, cs, it.ropa ?? 'tee');
          break;
        case 'estanteria':
          wallShelving(g, colliders, pools, Y, { side: it.pared === 'este' ? 'east' : 'front', at: it.pos }, cs);
          break;
        case 'mesa':
          tableAt(g, colliders, pools, Y, it.x, it.z, cs);
          break;
        case 'maniqui':
          mannequin(g, colliders, Y, it.x, it.z, deg(it.rot ?? 0), it.remera ?? cs[0], it.pantalon ?? cs[1]);
          break;
        case 'espejo':
          mirrorAt(g, colliders, Y, it.x, it.z, deg(it.rot ?? 0));
          break;
        case 'probador':
          fittingRoom(g, colliders, Y, it.z0, it.z1);
          sectionSign(g, 'PROBADOR', INTERIOR.x - 0.08, Y + 2.4, (it.z0 + it.z1) / 2, -Math.PI / 2, 1.2, 0.32);
          break;
        case 'caja':
          counterAt(g, colliders, Y, it.x, it.z);
          break;
        case 'vendedor':
          shopkeeper(g, Y, it.x, it.z, it.remera ?? cs[0]);
          break;
        case 'cartel':
          if (it.pared === 'este') sectionSign(g, it.texto, INTERIOR.x - 0.08, Y + 2.4, it.pos, -Math.PI / 2, 1.4, 0.36);
          else sectionSign(g, it.texto, it.pos, Y + 2.4, -INTERIOR.z + 0.08, 0, 1.4, 0.36);
          break;
        case 'riel':
          lightRail(g, Y, it.pared !== 'este', it.pos, it.largo ?? 2.2);
          break;
        case 'display':
          spinDisplay(g, colliders, Y, it.x, it.z, garmentTexture(it.color ?? cs[0], it.ropa ?? 'hoodie'));
          break;
        case 'modelo':
          // el collider sale de la caja real del modelo una vez cargado
          // (placeModel la empuja a `colliders` sola — nada que adivinar acá)
          placeModel(scene, { archivo: it.archivo, x: it.x, y: Y, z: it.z, rot: deg(it.rot ?? 0), alto: it.alto }, colliders);
          break;
        default:
          console.warn(`layout.js: tipo de mueble desconocido "${it.tipo}" en piso ${piso}`);
      }
    }
  }

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
