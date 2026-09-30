import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { ladrilloTex, revoqueTex } from './texturasBurela.js';
import { adoquinesBurelaMaterial, ADOQUIN_METROS } from './adoquinesBurela.js';

// Estimated from the seven 18/09 references, anchored to the existing block.
// Nothing here changes the saved frontage or the +/-84 m movement bounds.
export const BURELA_ESQUINA = Object.freeze({
  patioLeft: 20.5, patioRight: 39.25, patioFront: -0.6, patioBack: -22.3,
  cornerRadius: 4.25, streetLeft: 39.25, streetRight: 51.25,
  streetStart: -4.6, streetEnd: -74,
});

export const BURELA_BACKDROP_EXCLUSIONS = [
  { minX: 19, maxX: 76, minZ: -74, maxZ: -4.5 },
  { minX: 39.25, maxX: 76, minZ: 19.8, maxZ: 74 },
  // Clear the generic rear houses out of the new garden between the towers.
  { minX: -22, maxX: -3.25, minZ: -32.85, maxZ: -11.15 },
];

// Only the old generic east-side placeholders, never the owner's real towers.
export function replacesBurelaBackdrop(item) {
  if (!/^furniture:kenney-city-east-[1-7]$/.test(item.id || '')) return false;
  const [x, , z] = item.position || [];
  return x >= 39 && x <= 76 && z >= -74 && z <= 74;
}

export function openBurelaStreetInSurface(material) {
  // Local clipping survives Material.clone(), including editor floor copies.
  // The approved front lies outside this cut. No second floor is laid over it.
  material.clippingPlanes = [
    new THREE.Plane(new THREE.Vector3(-1, 0, 0), BURELA_ESQUINA.streetLeft),
    new THREE.Plane(new THREE.Vector3(1, 0, 0), -BURELA_ESQUINA.streetRight),
    new THREE.Plane(new THREE.Vector3(0, 0, 1), -BURELA_ESQUINA.streetStart),
  ];
  material.clipIntersection = true;
  material.clipShadows = true;
}

function materials() {
  const common = { vertexColors: true, roughness: 0.94 };
  return {
    brick: new THREE.MeshStandardMaterial({ ...common, map: ladrilloTex() }),
    plaster: new THREE.MeshStandardMaterial({ ...common, map: revoqueTex() }),
    solid: new THREE.MeshStandardMaterial(common),
    metal: new THREE.MeshStandardMaterial({ ...common, roughness: 0.65, metalness: 0.22 }),
    glass: new THREE.MeshStandardMaterial({ ...common, roughness: 0.3, metalness: 0.15 }),
    cobble: adoquinesBurelaMaterial(1, 1, { vertexColors: true }),
  };
}

function seeded(seed) {
  let s = seed;
  return () => ((s = Math.imul(s, 1664525) + 1013904223 | 0) >>> 0) / 4294967296;
}

function tint(geometry, hex) {
  const color = new THREE.Color(hex);
  const colors = new Float32Array(geometry.attributes.position.count * 3);
  for (let i = 0; i < colors.length; i += 3) color.toArray(colors, i);
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  return geometry;
}

function batch(parent, name, mats, { collider = false } = {}) {
  const pieces = {};
  const group = new THREE.Group();
  group.name = `Burela esquina · ${name}`;
  group.userData.editorUnit = true;
  group.userData.editorCollider = collider;
  parent.add(group);

  function add(geo, key, color, x, y, z, rotation = 0) {
    geo.rotateY(rotation);
    geo.translate(x, y, z);
    const normalized = geo.index ? geo.toNonIndexed() : geo;
    if (normalized !== geo) geo.dispose();
    (pieces[key] ??= []).push(tint(normalized, color));
  }
  function box(w, h, d, x, y, z, color, key = 'solid', rotation = 0) {
    const geo = new THREE.BoxGeometry(w, h, d);
    const uv = geo.attributes.uv;
    const sizes = [[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]];
    const uvMeters = key === 'cobble' ? ADOQUIN_METROS : 1.2;
    for (let face = 0; face < 6; face++) {
      for (let n = 0; n < 4; n++) {
        const i = face * 4 + n;
        uv.setXY(i, uv.getX(i) * sizes[face][0] / uvMeters, uv.getY(i) * sizes[face][1] / uvMeters);
      }
    }
    add(geo, key, color, x, y, z, rotation);
  }
  function finish() {
    // Append the new road material after the existing meshes, preserving IDs.
    const ordered = Object.entries(pieces).sort(([a], [b]) => Number(a === 'cobble') - Number(b === 'cobble'));
    for (const [key, geometries] of ordered) {
      const geo = mergeGeometries(geometries, false);
      geometries.forEach(g => g.dispose());
      const mesh = new THREE.Mesh(geo, mats[key]);
      mesh.name = `${group.name} · ${key}`;
      mesh.receiveShadow = true;
      mesh.castShadow = false;
      group.add(mesh);
    }
    return group;
  }
  return { box, add, finish };
}

function segment(a, b) {
  return {
    length: Math.hypot(b[0] - a[0], b[1] - a[1]),
    x: (a[0] + b[0]) / 2, z: (a[1] + b[1]) / 2,
    angle: -Math.atan2(b[1] - a[1], b[0] - a[0]),
  };
}

function fence(parent, mats, name, a, b, { wall = true } = {}) {
  const p = batch(parent, name, mats, { collider: true });
  const s = segment(a, b);
  const base = wall ? 1.28 : 0.5;
  const top = 2.65;
  if (wall) {
    p.box(s.length + 0.035, 1.28, 0.35, s.x, 0.64, s.z, '#a67e6d', 'brick', s.angle);
    p.box(s.length + 0.055, 0.065, 0.4, s.x, 1.29, s.z, '#999383', 'plaster', s.angle);
  }
  for (const y of [base + 0.08, top - 0.09]) {
    p.box(s.length + 0.04, 0.048, 0.048, s.x, y, s.z, '#4e7163', 'metal', s.angle);
  }
  const n = Math.max(1, Math.ceil(s.length / 0.17));
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    p.box(0.024, top - base, 0.024,
      a[0] + (b[0] - a[0]) * t, (base + top) / 2, a[1] + (b[1] - a[1]) * t,
      '#537a65', 'metal');
  }
  for (const [x, z] of [a, b]) p.box(0.075, top - base + 0.07, 0.075, x, (base + top) / 2, z, '#496452', 'metal');
  p.finish();
}

function courtyard(parent, mats) {
  const c = BURELA_ESQUINA;
  const cx = c.patioRight - c.cornerRadius, cz = c.patioFront - c.cornerRadius;
  const outline = [[c.patioLeft, c.patioFront], [cx, c.patioFront]];
  for (let i = 1; i <= 12; i++) {
    const a = i / 12 * Math.PI / 2;
    outline.push([cx + Math.sin(a) * c.cornerRadius, cz + Math.cos(a) * c.cornerRadius]);
  }
  outline.push([c.patioRight, c.patioBack]);
  // Short independent spans give matching collision along the curved corner.
  for (let i = 1; i < outline.length; i++) fence(parent, mats, `muro y reja ${i}`, outline[i - 1], outline[i]);
  fence(parent, mats, 'reja fondo patio', [c.patioRight, c.patioBack], [c.patioLeft, c.patioBack]);
  fence(parent, mats, 'reja acceso cerrado', [c.patioLeft, c.patioBack], [c.patioLeft, c.patioFront], { wall: false });

  const garden = batch(parent, 'patio comunitario', mats);
  const shape = new THREE.Shape();
  outline.forEach(([x, z], i) => i ? shape.lineTo(x, -z) : shape.moveTo(x, -z));
  shape.lineTo(c.patioLeft, -c.patioBack); shape.closePath();
  const soil = new THREE.ShapeGeometry(shape);
  soil.rotateX(-Math.PI / 2);
  garden.add(soil, 'solid', '#647d4b', 0, 0.505, 0);
  // Paths and edging sit above the existing podium as landscaping, not a new slab.
  garden.box(15.7, 0.06, 1.35, 29.05, 0.54, -7.3, '#b7b9b1', 'plaster');
  garden.box(1.4, 0.06, 18.5, 26.8, 0.54, -12.4, '#b7b9b1', 'plaster');
  garden.box(12, 0.06, 1.2, 32.1, 0.54, -18.7, '#b7b9b1', 'plaster');
  garden.box(0.12, 0.1, 18.6, 25.99, 0.55, -12.4, '#b5afa0');
  garden.box(0.12, 0.1, 18.6, 27.61, 0.55, -12.4, '#b5afa0');
  for (const [x, z, turn] of [[29.6, -8.3, 0], [32.2, -17.65, Math.PI], [25.5, -13.5, Math.PI / 2]]) {
    const co = Math.cos(turn), si = Math.sin(turn);
    const at = (dx, dz) => [x + co * dx + si * dz, z - si * dx + co * dz];
    for (let slat = 0; slat < 4; slat++) {
      const [sx, sz] = at(0, (slat - 1.5) * 0.105);
      garden.box(1.9, 0.065, 0.085, sx, 1, sz, '#877459', 'solid', turn);
    }
    for (const yy of [1.26, 1.46]) {
      const [sx, sz] = at(0, -0.24);
      garden.box(1.9, 0.17, 0.065, sx, yy, sz, '#877459', 'solid', turn);
    }
    for (const xx of [-0.68, 0.68]) {
      const [sx, sz] = at(xx, 0);
      garden.box(0.075, 0.5, 0.42, sx, 0.78, sz, '#3b4640', 'metal', turn);
    }
  }
  garden.finish();

  const plants = batch(parent, 'arboles y arbustos patio', mats);
  const rand = seeded(257018);
  function leaves(x, y, z, radius, sx = 1, sy = 1, sz = 1) {
    const geo = new THREE.IcosahedronGeometry(radius, 1);
    geo.scale(sx, sy, sz);
    plants.add(geo, 'solid', new THREE.Color().setHSL(0.24 + rand() * 0.055, 0.25 + rand() * 0.12, 0.22 + rand() * 0.11), x, y, z);
  }
  for (const [x, z, h] of [[23.6, -4.4, 5.6], [34.8, -4.2, 6.1], [36.1, -13.5, 7.2], [23.5, -17.5, 5.7]]) {
    plants.add(new THREE.CylinderGeometry(0.12, 0.22, h - 1.2, 7), 'solid', '#777565', x, 0.5 + (h - 1.2) / 2, z);
    for (let j = 0; j < 8; j++) {
      const angle = j * 2.399;
      leaves(x + Math.cos(angle) * 0.85, h - 0.4 + rand() * 1.3, z + Math.sin(angle) * 0.85, 1.15 + rand() * 0.55, 1.1, 0.8, 1);
    }
  }
  for (let i = 0; i < 24; i++) {
    const x = 22.4 + (i % 8) * 1.8, z = [-2.4, -10.2, -20.3][Math.floor(i / 8)];
    if (Math.abs(x - 26.8) < 1) continue;
    leaves(x, 0.95, z, 0.6, 1.2, 0.75, 1);
  }
  plants.finish();
}

function gallery(parent, mats) {
  const canopy = batch(parent, 'continuacion galeria', mats);
  canopy.box(2.65, 0.28, 4.75, 19.2, 3.97, -2.55, '#869580', 'plaster');
  canopy.box(0.32, 0.28, 7.2, 20.3, 3.97, -5.95, '#869580', 'plaster');
  canopy.finish();
  for (const [x, z] of [[19.15, -1.25], [20.3, -8.9]]) {
    const p = batch(parent, `columna nueva ${x}`, mats, { collider: true });
    p.add(new THREE.CylinderGeometry(0.14, 0.14, 3.39, 12), 'plaster', '#869580', x, 2.145, z);
    p.finish();
  }
}

function sideStreet(parent, mats) {
  const c = BURELA_ESQUINA;
  const p = batch(parent, 'calle transversal y veredas de fondo', mats);
  for (const [z0, z1] of [[c.streetEnd, c.streetStart], [24.5, 74]]) {
    const length = z1 - z0, z = (z0 + z1) / 2;
    p.box(12, 0.16, length, 45.25, -0.11, z, '#ffffff', 'cobble');
    // A single new sidewalk on the far side, clear of the owner's corridor.
    p.box(3.4, 0.19, length, 52.95, 0.015, z, '#a6aaa5', 'plaster');
    p.box(0.18, 0.26, length, 51.3, 0, z, '#b8bcb2');
    p.box(0.16, 0.22, length, 39.15, -0.015, z, '#b8bcb2');
  }
  p.finish();
  // A low street railing marks the non-playable branch without closing Burela.
  fence(parent, mats, 'limite transversal', [39.4, -4.5], [51.1, -4.5], { wall: false });
}

function neighbourhood(parent, mats) {
  const houses = batch(parent, 'dos cuadras de ambientacion', mats);
  const rand = seeded(257026);
  const colors = ['#c1c5b9', '#b7b9b7', '#af9585', '#d4d5cb', '#9aa89f', '#acaaa5'];
  // Street-facing elevations, with shallow roofs and enough relief for side views.
  function house(x, z, frontage, depth, h, rotation, index) {
    const co = Math.cos(rotation), si = Math.sin(rotation);
    const part = (w, hh, d, dx, y, dz, color, material = 'plaster') => {
      houses.box(w, hh, d, x + co * dx + si * dz, y, z - si * dx + co * dz, color, material, rotation);
    };
    const baseColor = colors[index % colors.length];
    part(frontage, h, depth, 0, h / 2, -depth / 2, baseColor, index % 3 === 0 ? 'brick' : 'plaster');
    part(frontage + 0.16, 0.16, depth + 0.16, 0, h + 0.08, -depth / 2, '#797f7c');
    part(frontage, 0.7, 0.06, 0, 0.35, 0.035, '#737e79');
    for (let floor = 0; floor < Math.floor(h / 2.8); floor++) {
      for (const dx of [-frontage * 0.28, frontage * 0.24]) {
        part(1.6, 1.5, 0.1, dx, 1.8 + floor * 2.85, 0.07, '#dadecf');
        part(1.38, 1.26, 0.12, dx, 1.8 + floor * 2.85, 0.12, '#607b81', 'glass');
        part(1.46, 0.14, 0.22, dx, 1.07 + floor * 2.85, 0.13, '#8e9993');
      }
    }
    part(1.1, 2.2, 0.12, 0, 1.1, 0.1, '#586d61', 'metal');
    if (h > 5) {
      part(frontage * 0.65, 0.12, 0.75, 0, 3.05, 0.35, '#bec4b5');
      for (let j = -3; j <= 3; j++) part(0.035, 0.85, 0.035, j * frontage * 0.08, 3.5, 0.7, '#6c7a70', 'metal');
      part(frontage * 0.65, 0.04, 0.05, 0, 3.91, 0.7, '#6c7a70', 'metal');
    }
    part(0.7, 0.45, 0.3, frontage * 0.33, h - 0.65, 0.21, '#a6ada3');
    part(1.15, 1.1, 1.15, frontage * 0.2, h + 0.68, -depth * 0.7, '#7c827c');
  }
  for (let i = 0; i < 7; i++) {
    const z = -10.5 - i * 8.8;
    house(54.7, z, 8.5, 15, i === 0 ? 5.8 : 3.2 + Math.floor(rand() * 3) * 2.85, -Math.PI / 2, i);
  }
  for (let i = 0; i < 3; i++) house(55.8 + i * 8.5, 24.8, 8.3, 16, 6 + (i % 2) * 2.8, 0, i + 7);
  for (let i = 0; i < 4; i++) house(54.7, 37 + i * 9.3, 9, 15, 6 + (i % 2) * 3, -Math.PI / 2, i + 10);
  houses.finish();
}

function centralCourtyard(parent, mats) {
  const garden = new THREE.Group();
  garden.name = 'Jardin central entre las cuatro torres';
  garden.userData.editorUnit = true;
  // A single bounding-box collider would turn the entire garden into a wall.
  garden.userData.editorCollider = false;
  const pieces = new THREE.Group();
  courtyard(pieces, mats);
  const sourceX = (BURELA_ESQUINA.patioLeft + BURELA_ESQUINA.patioRight) / 2;
  const sourceZ = (BURELA_ESQUINA.patioFront + BURELA_ESQUINA.patioBack) / 2;
  const byMaterial = new Map();
  pieces.traverse((object) => {
    if (!object.geometry) return;
    object.geometry.translate(-sourceX, 0, -sourceZ);
    if (!byMaterial.has(object.material)) byMaterial.set(object.material, []);
    byMaterial.get(object.material).push(object.geometry);
  });
  // This copy moves as one garden. Batch its many fence spans as four draws
  // rather than duplicating all the side courtyard's editable draw calls.
  for (const [material, geometries] of byMaterial) {
    const mesh = new THREE.Mesh(mergeGeometries(geometries, false), material);
    geometries.forEach((geometry) => geometry.dispose());
    mesh.name = `${garden.name} · ${Object.keys(mats).find((key) => mats[key] === material)}`;
    mesh.receiveShadow = true;
    garden.add(mesh);
  }
  // The saved towers leave this 18.75 x 21.7 m opening. Keep the whole copy
  // centered on its own origin so moving/rotating it in the editor is natural.
  garden.position.set(-12.625, 0, -22);
  parent.add(garden);
}

export function buildBurelaEsquina(parent, scene) {
  const root = new THREE.Group();
  root.name = 'Burela esquina derecha y patio';
  // Child of the existing street root: no scene-level index changes, even
  // for objects that main.js adds after buildStreet().
  parent.add(root);
  const mats = materials();
  courtyard(root, mats);
  gallery(root, mats);
  sideStreet(root, mats);
  neighbourhood(root, mats);
  centralCourtyard(root, mats);
  scene.userData.burelaEsquina = true;
  const previousRender = scene.onBeforeRender;
  scene.onBeforeRender = function (...args) {
    args[0].localClippingEnabled = true;
    previousRender.apply(this, args);
  };
  return root;
}
