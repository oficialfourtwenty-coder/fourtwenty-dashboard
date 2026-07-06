import * as THREE from 'three';
import { box } from './gfxUtils.js';
import { brickWall, burelaHexPaver, ribbedCeiling } from './textures.js';

const SALVIA = 0x8fa58c;
const VERDE_OSCURO = 0x2c4a3a;
const HORMIGON = 0xb4b2a9;
const CANTO_LOSA = 0xc4c2b8;
const REJA_NEGRA = 0x1c1c1c;

const PLAT = 0.45;
const H_LIBRE = 2.95;
const ROOF_T = 0.3;
const LEFT = -4.2;
const RIGHT = 4.2;
const BACK = -5.0;
// Chaflan ~22 grados: el centro cae cerca de z=-0.96, donde el runtime ya
// termina de subir a la galeria. Asi se ve diagonal sin cambiar movimiento.
const FRONT_LEFT = 0.74;
const FRONT_RIGHT = -2.66;
const EDGE_ANGLE = -Math.atan2(FRONT_RIGHT - FRONT_LEFT, RIGHT - LEFT);

function mat(hex, roughness = 0.85, metalness = 0) {
  return new THREE.MeshStandardMaterial({ color: hex, roughness, metalness });
}

function mark(mesh, name) {
  mesh.name = name;
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function horizontalShape(points, y, material, name) {
  const shape = new THREE.Shape();
  points.forEach(([x, z], i) => {
    const sx = x;
    const sy = -z;
    if (i === 0) shape.moveTo(sx, sy);
    else shape.lineTo(sx, sy);
  });
  shape.closePath();
  const mesh = new THREE.Mesh(new THREE.ShapeGeometry(shape), material);
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.y = y;
  mesh.name = name;
  mesh.receiveShadow = true;
  return mesh;
}

function addCollider(colliders, x, y, z, w, h, d) {
  colliders.push({
    minX: x - w / 2,
    maxX: x + w / 2,
    minY: y - h / 2,
    maxY: y + h / 2,
    minZ: z - d / 2,
    maxZ: z + d / 2,
  });
}

function addDiagonalStep(group, z, y, w, h, d, material, name) {
  const step = mark(box(w, h, d, 0, y, z, material), name);
  step.rotation.y = EDGE_ANGLE;
  group.add(step);
  return step;
}

function addColumn(group, colliders, x, z) {
  const column = new THREE.Mesh(
    new THREE.CylinderGeometry(0.13, 0.13, H_LIBRE, 18),
    mat(SALVIA, 0.72),
  );
  column.position.set(x, PLAT + H_LIBRE / 2, z);
  mark(column, 'Columna redonda salvia Burela');
  group.add(column);
  addCollider(colliders, x, PLAT + H_LIBRE / 2, z, 0.34, H_LIBRE, 0.34);
}

function addTopiary(group, x, z, scale = 1) {
  const trunk = mark(new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.08, 0.6, 8), mat(0x5a4230, 0.9)), 'Tronco topiario');
  trunk.position.set(x, PLAT + 0.3, z);
  group.add(trunk);
  const bush = mark(new THREE.Mesh(new THREE.IcosahedronGeometry(0.42 * scale, 1), mat(0x4e6b45, 1)), 'Topiario redondo');
  bush.position.set(x, PLAT + 0.83, z);
  group.add(bush);
}

function addStorefront(group, colliders) {
  const wallMat = mat(SALVIA, 0.78);
  const frameMat = mat(VERDE_OSCURO, 0.55, 0.08);
  const glassMat = new THREE.MeshPhysicalMaterial({
    color: 0xdfe8e6,
    roughness: 0.12,
    metalness: 0,
    transparent: true,
    opacity: 0.42,
  });

  const H = H_LIBRE;
  group.add(mark(box(8.6, H, 0.18, 0, PLAT + H / 2, BACK, wallMat), 'Frente verde salvia Burela'));
  addCollider(colliders, 0, PLAT + H / 2, BACK, 8.6, H, 0.26);

  // Porton vidriado con reja/cuadricula geometrica.
  const doorW = 2.45;
  const doorH = 2.35;
  const doorX = -1.0;
  const doorY = PLAT + doorH / 2;
  const z = BACK + 0.105;
  const glass = new THREE.Mesh(new THREE.PlaneGeometry(doorW, doorH), glassMat);
  glass.position.set(doorX, doorY, z + 0.01);
  glass.name = 'Vidrio porton Burela';
  group.add(glass);

  for (let i = 0; i <= 4; i++) {
    const x = doorX - doorW / 2 + (doorW / 4) * i;
    group.add(mark(box(0.055, doorH, 0.08, x, doorY, z, frameMat), 'Reja vertical porton Burela'));
  }
  for (let i = 0; i <= 3; i++) {
    const y = PLAT + (doorH / 3) * i;
    group.add(mark(box(doorW, 0.055, 0.08, doorX, y, z, frameMat), 'Reja horizontal porton Burela'));
  }
  group.add(mark(box(doorW, 0.48, 0.09, doorX, PLAT + 0.24, z + 0.01, frameMat), 'Zocalo ciego porton Burela'));

  // Banderola superior con vidrios repartidos.
  const transom = new THREE.Mesh(new THREE.PlaneGeometry(doorW, 0.42), glassMat);
  transom.position.set(doorX, PLAT + 2.65, z + 0.012);
  transom.name = 'Banderola vidriada Burela';
  group.add(transom);
  for (let i = 0; i <= 4; i++) {
    const x = doorX - doorW / 2 + (doorW / 4) * i;
    group.add(mark(box(0.04, 0.42, 0.07, x, PLAT + 2.65, z + 0.01, frameMat), 'Banderola vertical Burela'));
  }
  group.add(mark(box(doorW, 0.04, 0.07, doorX, PLAT + 2.65, z + 0.01, frameMat), 'Banderola horizontal Burela'));

  // Split sobre pilar verde.
  group.add(mark(box(0.72, 0.26, 0.18, 2.85, PLAT + 1.9, BACK + 0.18, mat(0xe4e2dc, 0.38, 0.05)), 'Split aire acondicionado'));
}

function addBrickAndFence(group, colliders) {
  const brickMat = new THREE.MeshStandardMaterial({ map: brickWall(3, 2), roughness: 0.86 });
  const wall = mark(box(0.26, 0.9, 3.2, RIGHT + 0.34, PLAT + 0.45, -3.1, brickMat), 'Muro bajo ladrillo Burela');
  group.add(wall);
  addCollider(colliders, RIGHT + 0.34, PLAT + 0.45, -3.1, 0.36, 0.9, 3.2);

  const fenceMat = mat(REJA_NEGRA, 0.5, 0.22);
  for (let z = -4.55; z <= -1.65; z += 0.34) {
    group.add(mark(box(0.035, 1.55, 0.035, RIGHT + 0.55, PLAT + 1.2, z, fenceMat), 'Barrote reja negra Burela'));
  }
  group.add(mark(box(0.05, 0.05, 3.15, RIGHT + 0.55, PLAT + 1.95, -3.1, fenceMat), 'Travesano reja negra Burela'));
  group.add(mark(box(0.05, 0.05, 3.15, RIGHT + 0.55, PLAT + 0.72, -3.1, fenceMat), 'Travesano bajo reja negra Burela'));

  addTopiary(group, RIGHT + 1.1, -2.05, 0.85);
  addTopiary(group, RIGHT + 1.25, -3.15, 1);
  addTopiary(group, RIGHT + 0.95, -4.2, 0.78);
}

function addZigZagJoint(group) {
  const jointMat = mat(0x3e3c38, 0.95);
  const points = [
    [-3.5, -1.45], [-3.0, -1.72], [-2.5, -1.46], [-2.0, -1.73],
    [-1.5, -1.48], [-1.0, -1.76], [-0.5, -1.52], [0.0, -1.8],
    [0.5, -1.56], [1.0, -1.84], [1.5, -1.62], [2.0, -1.9],
  ];
  for (let i = 0; i < points.length - 1; i++) {
    const [x1, z1] = points[i];
    const [x2, z2] = points[i + 1];
    const dx = x2 - x1;
    const dz = z2 - z1;
    const len = Math.hypot(dx, dz);
    const seg = mark(box(len, 0.018, 0.055, (x1 + x2) / 2, PLAT + 0.026, (z1 + z2) / 2, jointMat), 'Junta zigzag piso Burela');
    seg.rotation.y = -Math.atan2(dz, dx);
    group.add(seg);
  }
}

export function addBurelaAccess(scene, colliders) {
  const group = new THREE.Group();
  group.name = 'BURELA 2570 bloque inicial';

  const hexMat = new THREE.MeshStandardMaterial({ map: burelaHexPaver(6, 5), roughness: 0.96 });
  const ceilingMat = new THREE.MeshStandardMaterial({ map: ribbedCeiling(5, 3), roughness: 0.9, side: THREE.DoubleSide });
  const concreteMat = mat(HORMIGON, 0.95);

  // Calle y cordon, solo referencia visual; el jugador sigue dentro del area segura.
  group.add(mark(box(12.5, 0.07, 5.2, 0, -0.18, 8.3, mat(0x343436, 0.96)), 'Calle Burela asfalto'));
  group.add(mark(box(0.08, 0.08, 4.8, -0.35, -0.12, 8.3, mat(0xd9b631, 0.7)), 'Linea calle amarilla'));
  group.add(mark(box(0.08, 0.08, 4.8, 0.35, -0.12, 8.3, mat(0xd9b631, 0.7)), 'Linea calle amarilla'));
  addDiagonalStep(group, 3.05, 0.08, 8.8, 0.16, 0.34, concreteMat, 'Cordon diagonal Burela');

  const sidewalk = horizontalShape([[-5.2, 6.8], [5.2, 6.8], [RIGHT, FRONT_RIGHT], [LEFT, FRONT_LEFT]], 0.012, hexMat, 'Piso panal vereda Burela');
  group.add(sidewalk);

  // Acceso semicubierto con frente chaflanado.
  const galleryPoints = [[LEFT, FRONT_LEFT], [RIGHT, FRONT_RIGHT], [RIGHT, BACK], [LEFT, BACK]];
  group.add(horizontalShape(galleryPoints, PLAT + 0.012, hexMat, 'Piso panal bajo marquesina'));
  addZigZagJoint(group);

  for (let i = 0; i < 3; i++) {
    addDiagonalStep(group, -0.18 - i * 0.32, STEP_Y(i), 8.65, 0.15, 0.3, concreteMat, 'Escalon diagonal Burela');
  }

  const roofPoints = [[LEFT - 0.6, 0.2], [RIGHT + 0.65, -1.65], [RIGHT + 0.65, BACK - 0.55], [LEFT - 0.6, BACK - 0.55]];
  group.add(mark(box(9.7, ROOF_T, 0.18, 0, PLAT + H_LIBRE + ROOF_T / 2, BACK - 0.52, mat(CANTO_LOSA, 0.9)), 'Canto fondo losa Burela'));
  group.add(horizontalShape(roofPoints, PLAT + H_LIBRE + 0.01, ceilingMat, 'Intrados nervurado marquesina Burela'));
  const slabTop = horizontalShape(roofPoints, PLAT + H_LIBRE + ROOF_T, mat(CANTO_LOSA, 0.9), 'Tapa losa marquesina Burela');
  group.add(slabTop);

  const light = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.035, 24), new THREE.MeshBasicMaterial({ color: 0xfff7e6 }));
  light.rotation.x = Math.PI / 2;
  light.position.set(-3.35, PLAT + H_LIBRE - 0.025, -1.3);
  light.name = 'Plafon circular marquesina';
  group.add(light);
  const lamp = new THREE.PointLight(0xffedcc, 2.2, 4, 2);
  lamp.position.set(-3.35, PLAT + H_LIBRE - 0.18, -1.3);
  group.add(lamp);

  addColumn(group, colliders, RIGHT - 0.35, -2.15);
  addColumn(group, colliders, RIGHT - 0.35, -4.35);
  addStorefront(group, colliders);
  addBrickAndFence(group, colliders);

  scene.add(group);
  return group;
}

function STEP_Y(i) {
  return 0.075 + i * 0.15;
}
