// Mobiliario de tienda de ropa (pedido del dueño: "crea espacio de tienda"):
// percheros con ropa colgada, mesas de exhibición con pilas dobladas,
// espejos de probador y mostrador de caja en el lobby.
// Placeholders: en Fase 5 la ropa de los percheros sale de TiendaNube.
import * as THREE from 'three';
import { FLOOR_YS, INTERIOR } from './building.js';
import { COLLECTIONS } from './collections.js';
import { garmentTexture } from './gallery.js';

const white = new THREE.MeshStandardMaterial({ color: 0xf6f5f2, roughness: 0.9 });
const chrome = new THREE.MeshStandardMaterial({ color: 0xb9bcc2, roughness: 0.25, metalness: 0.9 });
const wood = new THREE.MeshStandardMaterial({ color: 0x8a6a48, roughness: 0.6 });
const darkMetal = new THREE.MeshStandardMaterial({ color: 0x2e2e33, roughness: 0.4, metalness: 0.7 });

function box(w, h, d, x, y, z, mat) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y, z);
  return m;
}

// Perchero: barra cromada sobre patas, con prendas colgadas de perchas.
function clothingRack(g, colliders, Y, x, z, rotY, colors, types) {
  const rack = new THREE.Group();
  const LEN = 1.8, H = 1.55;
  rack.add(box(0.06, H, 0.5, -LEN / 2, H / 2, 0, chrome));  // pata izq
  rack.add(box(0.06, H, 0.5, LEN / 2, H / 2, 0, chrome));   // pata der
  const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, LEN, 10), chrome);
  bar.rotation.z = Math.PI / 2;
  bar.position.y = H;
  rack.add(bar);
  const n = 6;
  for (let i = 0; i < n; i++) {
    const gx = -LEN / 2 + 0.25 + (i * (LEN - 0.5)) / (n - 1);
    rack.add(box(0.02, 0.1, 0.02, gx, H - 0.05, 0, chrome)); // gancho
    const garment = new THREE.Mesh(
      new THREE.PlaneGeometry(0.62, 0.75),
      new THREE.MeshStandardMaterial({
        map: garmentTexture(colors[i % colors.length], types[i % types.length]),
        transparent: true, alphaTest: 0.4, roughness: 0.95, side: THREE.DoubleSide,
      }),
    );
    garment.rotation.y = Math.PI / 2; // cuelgan a lo largo de la barra
    garment.position.set(gx, H - 0.48, 0);
    rack.add(garment);
  }
  rack.position.set(x, Y, z);
  rack.rotation.y = rotY;
  g.add(rack);
  // collider generoso alrededor (rotado 90° si hace falta)
  const along = Math.abs(Math.sin(rotY)) > 0.5;
  const hw = along ? 0.35 : 1.0, hd = along ? 1.0 : 0.35;
  colliders.push({ minX: x - hw, maxX: x + hw, minY: Y, maxY: Y + H, minZ: z - hd, maxZ: z + hd });
}

// Mesa de exhibición con pilas de ropa doblada.
function displayTable(g, colliders, Y, x, z, colors) {
  g.add(box(1.7, 0.08, 0.9, x, Y + 0.86, z, white));           // tapa
  g.add(box(1.5, 0.82, 0.7, x, Y + 0.41, z, white));           // base
  let k = 0;
  for (const [dx, dz] of [[-0.5, -0.18], [0, 0.15], [0.5, -0.12]]) {
    for (let p = 0; p < 3; p++) {
      g.add(box(0.36, 0.055, 0.3, x + dx, Y + 0.93 + p * 0.055, z + dz,
        new THREE.MeshStandardMaterial({ color: colors[(k + p) % colors.length], roughness: 0.95 })));
    }
    k++;
  }
  colliders.push({ minX: x - 0.85, maxX: x + 0.85, minY: Y, maxY: Y + 0.95, minZ: z - 0.45, maxZ: z + 0.45 });
}

// Espejo de pie con marco.
function mirror(g, colliders, Y, x, z, rotY) {
  const m = new THREE.Group();
  m.add(box(0.95, 2.0, 0.06, 0, 1.05, 0, darkMetal)); // marco
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

// Mostrador de caja (lobby): L de mostrador + posnet + cartelito.
function counter(g, colliders, Y, x, z) {
  g.add(box(2.6, 1.0, 0.8, x, Y + 0.5, z, white));
  g.add(box(2.7, 0.06, 0.9, x, Y + 1.03, z, wood));
  g.add(box(0.8, 1.0, 1.6, x + 1.55, Y + 0.5, z + 0.6, white)); // ala de la L
  g.add(box(0.18, 0.12, 0.14, x - 0.7, Y + 1.12, z, darkMetal)); // posnet
  colliders.push({ minX: x - 1.35, maxX: x + 1.95, minY: Y, maxY: Y + 1.1, minZ: z - 0.45, maxZ: z + 1.45 });
}

// Distribuye mobiliario: lobby con caja, y cada piso de colección con
// percheros/mesas/espejo en la mitad este (la galería vive en la oeste).
export function buildFixtures(scene) {
  const g = new THREE.Group();
  const colliders = [];

  // Lobby (planta baja)
  const lobbyColors = [0x1f4d2e, 0x6d1f2c, 0xe8dfc9, 0x1c1c1c, 0xd96b2f];
  counter(g, colliders, 0, 11, -6);
  displayTable(g, colliders, 0, 0, -2, lobbyColors);
  clothingRack(g, colliders, 0, -6, -4, 0, lobbyColors, ['tee', 'hoodie']);
  clothingRack(g, colliders, 0, -6, 2, 0, lobbyColors, ['hoodie', 'tee']);
  mirror(g, colliders, 0, -11, 6, Math.PI / 4);

  // Pisos de colección
  for (const col of COLLECTIONS) {
    const Y = FLOOR_YS[col.piso - 1];
    const types = col.theme === 'basket' ? ['jersey'] : ['tee', 'hoodie'];
    clothingRack(g, colliders, Y, 2, -6, 0, col.colors, types);
    clothingRack(g, colliders, Y, 5.5, 0, Math.PI / 2, col.colors, types);
    clothingRack(g, colliders, Y, 2, 5, 0, col.colors, types);
    displayTable(g, colliders, Y, 10, -4, col.colors);
    displayTable(g, colliders, Y, 10, 3, col.colors);
    mirror(g, colliders, Y, INTERIOR.x - 0.25, -2, -Math.PI / 2);
  }

  g.traverse((m) => {
    if (m.isMesh && !m.material.isMeshBasicMaterial) {
      m.castShadow = true;
      m.receiveShadow = true;
    }
  });
  scene.add(g);
  return colliders;
}
