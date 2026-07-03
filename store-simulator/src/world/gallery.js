// Galería/showroom reutilizable — una por piso, una colección por piso.
// Referencia del dueño (foto estilo Urban Monkey): pared blanca con prendas
// colgadas, placas de acrílico, atriles inclinados con info, pedestales
// blancos con accesorios y LEDs lineales en el techo.
// Todo GREYBOX con placeholders: los productos reales llegan de TiendaNube
// en la Fase 5 (cada colección = una categoría de TN).
import * as THREE from 'three';
import { FLOOR_YS, FLOOR_H, INTERIOR } from './building.js';

const WALL_X = -INTERIOR.x + 0.03; // cara interna de la pared oeste

function textTexture(lines, w, h, { title = false } = {}) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#fafafa';
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = '#d0d0cc';
  ctx.strokeRect(1, 1, w - 2, h - 2);
  ctx.fillStyle = '#1a1a1a';
  if (title) {
    ctx.font = `bold ${Math.floor(h * 0.55)}px monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(lines, w / 2, h / 2 + 2);
  } else {
    ctx.font = 'bold 11px monospace';
    ctx.fillText(lines, 8, 18);
    ctx.fillStyle = '#9a9a96';
    for (let i = 0; i < 4; i++) ctx.fillRect(8, 28 + i * 8, w - 28 - i * 12, 3);
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.magFilter = THREE.NearestFilter;
  t.minFilter = THREE.NearestFilter;
  return t;
}

function box(w, h, d, x, y, z, mat) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y, z);
  return m;
}

// Construye la galería de una colección en su piso. Devuelve colliders.
export function buildGallery(scene, collection) {
  const Y = FLOOR_YS[collection.piso - 1];
  const { colors, titles, name } = collection;
  const g = new THREE.Group();
  const colliders = [];

  const white = new THREE.MeshStandardMaterial({ color: 0xf6f5f2, roughness: 0.9 });
  const led = new THREE.MeshBasicMaterial({ color: 0xffffff });

  // ---- Cartel de colección, bien grande sobre la pared de la zona ----
  const sign = new THREE.Mesh(
    new THREE.PlaneGeometry(6.5, 0.85),
    new THREE.MeshBasicMaterial({ map: textTexture(name, 512, 64, { title: true }) }),
  );
  sign.position.set(WALL_X + 0.04, Y + 3.45, -4);
  sign.rotation.y = Math.PI / 2;
  g.add(sign);

  // ---- Pared oeste: prendas colgadas + placas + atriles (z -14 .. +6) ----
  const spots = [-13, -8.5, -4, 0.5, 5];
  spots.forEach((z, i) => {
    // prenda: plano colgado (placeholder de la foto real del producto)
    const garment = new THREE.Mesh(
      new THREE.PlaneGeometry(0.95, 1.15),
      new THREE.MeshStandardMaterial({ color: colors[i], roughness: 0.95 }),
    );
    garment.position.set(WALL_X + 0.06, Y + 1.95, z);
    garment.rotation.y = Math.PI / 2;
    g.add(garment);
    // percha/gancho
    g.add(box(0.03, 0.22, 0.03, WALL_X + 0.05, Y + 2.62, z, white));
    // gorra placeholder arriba de la prenda (como en la foto)
    if (i % 2 === 0) {
      g.add(box(0.24, 0.12, 0.26, WALL_X + 0.16, Y + 2.85, z, new THREE.MeshStandardMaterial({ color: colors[(i + 2) % 5], roughness: 0.95 })));
    }
    // placa de acrílico con título
    const plaque = new THREE.Mesh(
      new THREE.PlaneGeometry(0.85, 0.42),
      new THREE.MeshBasicMaterial({ map: textTexture(titles[i], 128, 64) }),
    );
    plaque.position.set(WALL_X + 0.04, Y + 3.02, z);
    plaque.rotation.y = Math.PI / 2;
    g.add(plaque);
    // atril inclinado con hoja de info
    const stand = box(0.55, 0.03, 0.75, WALL_X + 0.45, Y + 1.05, z, white);
    stand.rotation.z = -0.5;
    g.add(stand);
  });

  // ---- Campo de pedestales blancos (delante de la pared, alturas variadas) ----
  const heights = [0.6, 0.85, 1.1, 0.7, 0.95, 0.6, 1.05, 0.8, 0.65, 0.9, 1.15, 0.75];
  let i = 0;
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 4; col++) {
      const h = heights[i];
      const px = WALL_X + 2.2 + row * 1.6;
      const pz = -12 + col * 3.2 + row * 0.9; // leve desfase, como la foto
      g.add(box(0.5, h, 0.5, px, Y + h / 2, pz, white));
      // accesorio placeholder sobre algunos pedestales
      if (i % 3 !== 2) {
        g.add(box(0.2, 0.09, 0.24, px, Y + h + 0.045, pz, new THREE.MeshStandardMaterial({ color: colors[i % 5], roughness: 0.9 })));
      }
      colliders.push({
        minX: px - 0.25, maxX: px + 0.25,
        minY: Y, maxY: Y + h,
        minZ: pz - 0.25, maxZ: pz + 0.25,
      });
      i++;
    }
  }

  // ---- Luces lineales de techo sobre la zona (LED falsos, como la foto) ----
  for (let row = 0; row < 3; row++) {
    for (let k = 0; k < 4; k++) {
      g.add(box(0.12, 0.04, 2.4, WALL_X + 1.2 + row * 2.0, Y + FLOOR_H - 0.12, -12.5 + k * 4.6, led));
    }
  }
  // luz real puntual sobre la galería para que resalte
  const spot = new THREE.PointLight(0xffffff, 30, 20, 2);
  spot.position.set(WALL_X + 2.5, Y + FLOOR_H - 0.6, -4);
  scene.add(spot);

  scene.add(g);
  return colliders;
}
