import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { addEditableHdriSphere } from './bincoShopTrial.js';
import { createHangingGarment } from './garments.js';
import { applySavedFrameDesigns } from '../ui/frameEditor.js';
import { applySavedGarmentDesigns } from '../ui/garmentEditor.js';
import { bindProductVisual } from './productVisuals.js';
import { bindGarmentToProduct } from './garmentPrints.js';
import { bindStackToProduct, createDisplayTable, createFoldedStack } from './displayTable.js';

const MATERIAL_ROOT = 'assets/materials/terrace-ps3';
const textureLoader = new THREE.TextureLoader();
const originArtworkAssets = import.meta.glob(
  '../assets/artworks/pisos/1-origen/*.{jpg,jpeg,png,webp}',
  { eager: true, query: '?url', import: 'default' },
);
const ORIGIN_ARTWORK_URLS = Object.entries(originArtworkAssets)
  .sort(([left], [right]) => left.localeCompare(right))
  .map(([, url]) => url);

export const PS3_FLOOR_PROFILE = Object.freeze({
  width: 14,
  depth: 20,
  height: 4.35,
  minZ: -5.5,
  maxZ: 14.5,
  centerZ: 4.5,
  bounds: Object.freeze({ minX: -6.72, maxX: 6.72, minZ: -5.28, maxZ: 14.28 }),
  elevatorPosition: Object.freeze([0, 0, 13.05]),
  arcadeConfig: Object.freeze({
    modelUrl: null,
    position: Object.freeze([-5.72, 0, 7.55]),
    rotationY: Math.PI / 2,
    interactionDistance: 2.5,
  }),
});
export const TERRACE_PS3_PROFILE = PS3_FLOOR_PROFILE;

const FLOOR_THEMES = Object.freeze({
  1: Object.freeze({
    id: 1,
    key: 'origen',
    editorLabel: 'ORIGEN PS3',
    title: 'ORIGEN',
    subtitle: 'ROOTS / BURELA / 1992',
    posterTitle: 'DESDE ABAJO',
    posterSubtitle: 'RAICES FOURTWENTY',
    accentCss: '#5f9665',
    accentHex: 0x5f9665,
    secondaryHex: 0x742f3c,
    darkHex: 0x18251d,
    outfitA: 'green',
    outfitB: 'cream',
  }),
  2: Object.freeze({
    id: 2,
    key: 'hoop',
    editorLabel: 'HOOP SEASON PS3',
    title: 'HOOP SEASON',
    subtitle: 'FOURTWENTY BASKETBALL DEPT.',
    posterTitle: 'GAME DAY',
    posterSubtitle: 'BURELA LEAGUE 420',
    accentCss: '#df6d2d',
    accentHex: 0xdf6d2d,
    secondaryHex: 0x5d438d,
    darkHex: 0x17181b,
    outfitA: 'cream',
    outfitB: 'green',
  }),
  3: Object.freeze({
    id: 3,
    key: 'cultura',
    editorLabel: 'CULTURA PS3',
    title: 'CULTURA',
    subtitle: 'MUSICA / ARTE / TWENTY TIME',
    posterTitle: 'SONIDO LOCAL',
    posterSubtitle: 'BURELA CULTURE CLUB',
    accentCss: '#d0ad4b',
    accentHex: 0xd0ad4b,
    secondaryHex: 0x355a66,
    darkHex: 0x171719,
    outfitA: 'green',
    outfitB: 'cream',
  }),
  4: Object.freeze({
    id: 4,
    key: 'bob',
    editorLabel: 'BOBILONIA PS3',
    title: 'BOBILONIA',
    subtitle: 'BOB MERCH / TOYS / OBJECTS',
    posterTitle: 'BOB WORLD',
    posterSubtitle: 'WE ROLL DIFFERENT',
    accentCss: '#d46a31',
    accentHex: 0xd46a31,
    secondaryHex: 0x315b42,
    darkHex: 0x2b1d17,
    outfitA: 'cream',
    outfitB: 'green',
  }),
  5: Object.freeze({
    id: 5,
    key: 'terraza',
    editorLabel: 'TERRAZA PS3',
    title: 'FOURTWENTY',
    subtitle: 'BURELA ROOFTOP / 2026',
    posterTitle: 'TERRAZA',
    posterSubtitle: 'ROOFTOP DROP',
    accentCss: '#e7b94c',
    accentHex: 0xe7b94c,
    secondaryHex: 0x315b42,
    darkHex: 0x171d1c,
    outfitA: 'green',
    outfitB: 'cream',
  }),
});

export function ps3ThemeForDestination(destinationId) {
  return FLOOR_THEMES[Number(destinationId)] ?? FLOOR_THEMES[5];
}

function themedName(theme, label) {
  return `${theme.editorLabel} · ${label}`;
}

function destinationTexture(texture) {
  texture.userData.destinationOwned = true;
  return texture;
}

function loadMap(file, { color = false, repeat = [1, 1] } = {}) {
  const texture = destinationTexture(textureLoader.load(`${MATERIAL_ROOT}/${file}`));
  texture.colorSpace = color ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.fromArray(repeat);
  texture.anisotropy = 4;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  return texture;
}

function withUv1(geometry) {
  if (geometry.attributes.uv && !geometry.attributes.uv1) {
    geometry.setAttribute('uv1', geometry.attributes.uv);
  }
  return geometry;
}

function roundedBox(width, height, depth, material, radius = 0.08, segments = 2) {
  return new THREE.Mesh(withUv1(new RoundedBoxGeometry(width, height, depth, segments, radius)), material);
}

function box(width, height, depth, material) {
  return new THREE.Mesh(withUv1(new THREE.BoxGeometry(width, height, depth)), material);
}

function cylinder(radiusTop, radiusBottom, height, material, segments = 18) {
  return new THREE.Mesh(
    withUv1(new THREE.CylinderGeometry(radiusTop, radiusBottom, height, segments)),
    material,
  );
}

function place(object, x, y, z, name) {
  object.position.set(x, y, z);
  if (name) object.name = name;
  return object;
}

function unit(group, name, { collider = false } = {}) {
  group.name = name;
  group.userData.editorUnit = true;
  group.userData.editorSelectExisting = true;
  if (collider) group.userData.destinationCollider = true;
  return group;
}

function rodBetween(start, end, radius, material, segments = 10) {
  const direction = new THREE.Vector3().subVectors(end, start);
  const rod = cylinder(radius, radius, direction.length(), material, segments);
  rod.position.copy(start).add(end).multiplyScalar(0.5);
  rod.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize());
  return rod;
}

function canvasTexture(width, height, draw) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  draw(context, width, height);
  const texture = destinationTexture(new THREE.CanvasTexture(canvas));
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

function signTexture(title, subtitle, accent = '#e7b94c') {
  return canvasTexture(1024, 420, (ctx, width, height) => {
    const gradient = ctx.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, '#111718');
    gradient.addColorStop(1, '#222a29');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
    ctx.strokeStyle = '#4b5350';
    ctx.lineWidth = 14;
    ctx.strokeRect(18, 18, width - 36, height - 36);
    ctx.fillStyle = accent;
    ctx.fillRect(46, 54, 18, height - 108);
    ctx.fillStyle = '#f0eee7';
    ctx.font = '900 100px Arial, sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(title, 100, 170, width - 150);
    ctx.fillStyle = '#c6ccc7';
    ctx.font = '700 34px Courier New, monospace';
    ctx.fillText(subtitle, 104, 284, width - 160);
    ctx.fillStyle = accent;
    ctx.font = '900 34px Arial, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText('420', width - 68, 345);
  });
}

function campaignTexture(theme) {
  return canvasTexture(512, 640, (ctx, width, height) => {
    ctx.fillStyle = '#ded4bd';
    ctx.fillRect(0, 0, width, height);
    ctx.fillStyle = theme.accentCss;
    ctx.fillRect(0, 0, width, 86);
    ctx.fillStyle = '#181c1c';
    ctx.font = '900 72px Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(theme.posterTitle, width / 2, 190, width - 50);
    ctx.font = '900 148px Arial, sans-serif';
    ctx.fillStyle = `#${theme.secondaryHex.toString(16).padStart(6, '0')}`;
    ctx.fillText('420', width / 2, 380);
    ctx.fillStyle = '#181c1c';
    ctx.font = '700 30px Courier New, monospace';
    ctx.fillText(theme.posterSubtitle, width / 2, 490, width - 58);
    ctx.fillStyle = theme.accentCss;
    ctx.fillRect(58, 535, width - 116, 18);
  });
}

function buildMaterials(theme) {
  const brickColor = loadMap('brick-diff.webp', { color: true, repeat: [5, 2] });
  const brickNormal = loadMap('brick-normal.webp', { repeat: [5, 2] });
  const brickArm = loadMap('brick-arm.webp', { repeat: [5, 2] });
  const concreteColor = loadMap('concrete-diff.webp', { color: true, repeat: [5, 7] });
  const concreteNormal = loadMap('concrete-normal.webp', { repeat: [5, 7] });
  const concreteArm = loadMap('concrete-arm.webp', { repeat: [5, 7] });
  const woodColor = loadMap('wood-diff.webp', { color: true, repeat: [3, 2] });
  const woodNormal = loadMap('wood-normal.webp', { repeat: [3, 2] });
  const woodArm = loadMap('wood-arm.webp', { repeat: [3, 2] });

  return {
    concrete: new THREE.MeshStandardMaterial({
      map: concreteColor,
      normalMap: concreteNormal,
      normalScale: new THREE.Vector2(0.42, 0.42),
      aoMap: concreteArm,
      aoMapIntensity: 0.65,
      roughnessMap: concreteArm,
      metalnessMap: concreteArm,
      color: 0xbfc0b8,
      roughness: 0.86,
      metalness: 0.02,
    }),
    concreteDark: new THREE.MeshStandardMaterial({
      map: concreteColor,
      normalMap: concreteNormal,
      normalScale: new THREE.Vector2(0.35, 0.35),
      roughnessMap: concreteArm,
      color: 0x5d615f,
      roughness: 0.92,
    }),
    brick: new THREE.MeshStandardMaterial({
      map: brickColor,
      normalMap: brickNormal,
      normalScale: new THREE.Vector2(0.5, 0.5),
      aoMap: brickArm,
      aoMapIntensity: 0.75,
      roughnessMap: brickArm,
      color: 0xb8967b,
      roughness: 0.96,
    }),
    wood: new THREE.MeshStandardMaterial({
      map: woodColor,
      normalMap: woodNormal,
      normalScale: new THREE.Vector2(0.36, 0.36),
      aoMap: woodArm,
      aoMapIntensity: 0.58,
      roughnessMap: woodArm,
      color: 0xb18b62,
      roughness: 0.78,
    }),
    steel: new THREE.MeshStandardMaterial({ color: 0x252b2b, roughness: 0.4, metalness: 0.76 }),
    wornSteel: new THREE.MeshStandardMaterial({ color: 0x707675, roughness: 0.58, metalness: 0.61 }),
    brass: new THREE.MeshStandardMaterial({ color: 0xb78b3b, roughness: 0.38, metalness: 0.72 }),
    black: new THREE.MeshStandardMaterial({ color: 0x111514, roughness: 0.84, metalness: 0.12 }),
    cream: new THREE.MeshStandardMaterial({ color: 0xe7e2d7, roughness: 0.91 }),
    green: new THREE.MeshStandardMaterial({ color: theme.secondaryHex, roughness: 0.87 }),
    yellow: new THREE.MeshStandardMaterial({ color: theme.accentHex, roughness: 0.78 }),
    orange: new THREE.MeshStandardMaterial({ color: theme.accentHex, roughness: 0.8 }),
    fabric: new THREE.MeshStandardMaterial({ color: theme.darkHex, roughness: 0.97, side: THREE.DoubleSide }),
    garment: new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.97,
      side: THREE.DoubleSide,
      vertexColors: true,
    }),
    skin: new THREE.MeshStandardMaterial({ color: 0x9e765c, roughness: 0.84 }),
    bobBrown: new THREE.MeshStandardMaterial({ color: 0x6f3d25, roughness: 0.94 }),
    bobFace: new THREE.MeshStandardMaterial({ color: 0xc47a3b, roughness: 0.9 }),
    glass: new THREE.MeshBasicMaterial({
      color: 0xc9dddd,
      transparent: true,
      opacity: 0.1,
      side: THREE.DoubleSide,
      depthWrite: false,
      toneMapped: false,
    }),
    light: new THREE.MeshStandardMaterial({
      color: 0xf4eee0,
      emissive: 0xffdfad,
      emissiveIntensity: 2.2,
      roughness: 0.26,
    }),
  };
}

function addParapetSection(root, { width, depth, x, z, mats, name }) {
  const section = unit(new THREE.Group(), name, { collider: true });
  const base = roundedBox(width, 0.48, depth, mats.concreteDark, 0.08, 2);
  base.position.y = 0.24;
  section.add(base);
  const glass = box(width - (depth > width ? 0 : 0.18), 0.72, depth > width ? depth - 0.18 : depth, mats.glass);
  glass.position.y = 0.86;
  glass.userData.skipShadow = true;
  section.add(glass);
  const rail = depth > width
    ? roundedBox(0.11, 0.1, depth, mats.steel, 0.04, 2)
    : roundedBox(width, 0.1, 0.11, mats.steel, 0.04, 2);
  rail.position.y = 1.25;
  section.add(rail);
  section.position.set(x, 0, z);
  root.add(section);
}

function addPerimeter(root, mats, theme) {
  addParapetSection(root, {
    width: 13.55, depth: 0.26, x: 0, z: TERRACE_PS3_PROFILE.minZ + 0.14, mats,
    name: themedName(theme, 'vidriera panoramica frontal'),
  });
  for (const side of [-1, 1]) {
    addParapetSection(root, {
      width: 0.26, depth: 19.45, x: side * 6.86, z: TERRACE_PS3_PROFILE.centerZ, mats,
      name: themedName(theme, side < 0 ? 'vidriera izquierda' : 'vidriera derecha'),
    });
  }

  for (const [x, z] of [
    [-6.72, -5.18], [6.72, -5.18],
    [-6.72, 4.5], [6.72, 4.5],
    [-6.72, 14.15], [6.72, 14.15],
  ]) {
    const column = cylinder(0.19, 0.22, TERRACE_PS3_PROFILE.height, mats.concreteDark, 14);
    column.position.set(x, TERRACE_PS3_PROFILE.height / 2, z);
    column.name = themedName(theme, 'columna facetada');
    column.userData.destinationCollider = true;
    root.add(column);
  }
}

function addBackCore(root, mats, theme) {
  for (const side of [-1, 1]) {
    const wall = unit(new THREE.Group(), side < 0
      ? themedName(theme, 'muro de ladrillo izquierdo')
      : themedName(theme, 'muro de ladrillo derecho'), { collider: true });
    const panel = roundedBox(5.28, 4.25, 0.38, mats.brick, 0.1, 3);
    panel.position.set(side * 4.2, 2.12, 0);
    wall.add(panel);
    wall.position.z = 14.28;
    root.add(wall);
  }

  const lintel = roundedBox(3.25, 0.48, 0.48, mats.concreteDark, 0.12, 3);
  lintel.position.set(0, 4.02, 14.2);
  lintel.name = themedName(theme, 'dintel del ascensor');
  root.add(lintel);

  const arch = new THREE.Mesh(new THREE.TorusGeometry(2.28, 0.17, 10, 36, Math.PI), mats.brass);
  arch.position.set(0, 1.36, 12.2);
  arch.name = themedName(theme, 'arco metalico central');
  root.add(arch);
  for (const side of [-1, 1]) {
    const post = cylinder(0.17, 0.19, 1.36, mats.brass, 14);
    post.position.set(side * 2.28, 0.68, 12.2);
    root.add(post);
  }
}

function addCanopy(root, mats, theme) {
  const canopy = unit(new THREE.Group(), themedName(theme, 'cubierta industrial'));
  const y = TERRACE_PS3_PROFILE.height - 0.12;
  for (const x of [-5.8, 0, 5.8]) {
    const beam = roundedBox(0.18, 0.22, 15.5, mats.steel, 0.07, 2);
    beam.position.set(x, y, 4.2);
    canopy.add(beam);
  }
  for (const z of [-3.4, 0.4, 4.2, 8, 11.8]) {
    const beam = roundedBox(11.75, 0.22, 0.18, mats.steel, 0.07, 2);
    beam.position.set(0, y, z);
    canopy.add(beam);
  }

  for (const x of [-3.02, 3.02]) {
    const glass = box(5.5, 0.045, 14.8, mats.glass);
    glass.position.set(x, y + 0.08, 4.2);
    glass.name = themedName(theme, 'vidrio de cubierta');
    glass.userData.skipShadow = true;
    canopy.add(glass);
  }

  const slatGeometry = withUv1(new RoundedBoxGeometry(0.1, 0.12, 14.5, 1, 0.035));
  const slats = new THREE.InstancedMesh(slatGeometry, mats.wood, 14);
  const dummy = new THREE.Object3D();
  for (let index = 0; index < 14; index++) {
    dummy.position.set(-5.1 + index * 0.78, y - 0.06, 4.2);
    dummy.updateMatrix();
    slats.setMatrixAt(index, dummy.matrix);
  }
  slats.instanceMatrix.needsUpdate = true;
  slats.name = themedName(theme, 'listones de madera del techo');
  canopy.add(slats);
  root.add(canopy);
}

function addCeilingServices(root, mats, theme) {
  const services = unit(new THREE.Group(), themedName(theme, 'instalaciones de techo'));
  const duct = cylinder(0.27, 0.27, 12.8, mats.wornSteel, 16);
  duct.rotation.x = Math.PI / 2;
  duct.position.set(5.2, 3.78, 4.4);
  duct.name = themedName(theme, 'conducto de ventilacion');
  services.add(duct);
  for (const z of [-0.8, 3.5, 7.8, 10.6]) {
    const joint = new THREE.Mesh(new THREE.TorusGeometry(0.275, 0.027, 8, 18), mats.steel);
    joint.rotation.x = Math.PI / 2;
    joint.position.set(5.2, 3.78, z);
    services.add(joint);
  }

  const sprinklerPipe = rodBetween(
    new THREE.Vector3(-5.1, 3.84, -1.9),
    new THREE.Vector3(-5.1, 3.84, 11.2),
    0.035,
    mats.steel,
    8,
  );
  services.add(sprinklerPipe);
  for (const z of [-0.7, 3.2, 7.1, 10.5]) {
    const drop = cylinder(0.027, 0.027, 0.24, mats.wornSteel, 8);
    drop.position.set(-5.1, 3.7, z);
    services.add(drop);
    const cap = cylinder(0.09, 0.045, 0.04, mats.orange, 12);
    cap.position.set(-5.1, 3.56, z);
    services.add(cap);
  }

  for (const [x, z] of [
    [-3.2, -1.2], [0, -1.2], [3.2, -1.2],
    [-3.2, 4.2], [0, 4.2], [3.2, 4.2],
    [-3.2, 9.4], [0, 9.4], [3.2, 9.4],
  ]) {
    const fixture = new THREE.Group();
    const body = cylinder(0.105, 0.13, 0.28, mats.steel, 12);
    body.rotation.x = Math.PI / 2;
    fixture.add(body);
    const lens = cylinder(0.095, 0.095, 0.018, mats.light, 16);
    lens.rotation.x = Math.PI / 2;
    lens.position.z = 0.15;
    fixture.add(lens);
    fixture.position.set(x, 3.72, z);
    fixture.rotation.x = -0.35;
    services.add(fixture);
  }
  root.add(services);
}

function createRetailRail(root, {
  x,
  z,
  rotation = 0,
  mats,
  name,
  theme,
  productFloor = null,
  slotOffset = 0,
}) {
  const rail = unit(new THREE.Group(), name, { collider: true });
  rail.add(rodBetween(new THREE.Vector3(-1.35, 1.62, 0), new THREE.Vector3(1.35, 1.62, 0), 0.038, mats.steel));
  for (const side of [-1, 1]) {
    rail.add(rodBetween(new THREE.Vector3(side * 1.24, 0.18, 0), new THREE.Vector3(side * 1.24, 1.62, 0), 0.038, mats.steel));
    const foot = roundedBox(0.18, 0.12, 0.78, mats.steel, 0.05, 2);
    foot.position.set(side * 1.24, 0.08, 0);
    rail.add(foot);
    for (const wheelZ of [-0.3, 0.3]) {
      const wheel = cylinder(0.09, 0.09, 0.055, mats.black, 12);
      wheel.rotation.z = Math.PI / 2;
      wheel.position.set(side * 1.24, 0.06, wheelZ);
      rail.add(wheel);
    }
  }
  const garmentColors = [
    theme.darkHex, 0xd5cfbd, theme.secondaryHex,
    0x1c2425, theme.accentHex, 0x405e62,
    0xe2ddd0, theme.secondaryHex, theme.darkHex,
  ];
  for (let index = 0; index < 9; index++) {
    const color = garmentColors[index];
    const type = theme.key === 'hoop' ? 'jersey' : (index % 3 === 0 ? 'hoodie' : 'tee');
    // Prenda con volumen real (ver world/garments.js). La percha viene adentro:
    // antes era una linea de 1px aparte, por eso ya no se dibujan con
    // createHangerLines.
    const { group: garment, mesh } = createHangingGarment({
      color,
      type,
      number: theme.key === 'hoop' ? [4, 2, 0, 20, 24, 7, 13, 91, 5][index] : null,
      monkeyFace: theme.key === 'bob',
      hangerMaterial: mats.wornSteel,
      variacion: index,
    });
    garment.position.set((index - 4) * 0.27, 1.54, 0);
    garment.name = `${name} · producto ${index + 1}`;
    mesh.name = `${garment.name} · tela`;
    if (Number.isFinite(productFloor)) {
      const slot = { piso: productFloor, index: (slotOffset + index) % 4 };
      // La foto real del producto entra por la malla de tela, no por el grupo.
      bindProductVisual(mesh, slot, mesh.material.map);
      // Y la ESTAMPA del producto se apoya sobre la prenda. Si ese producto
      // tiene diseño cargado desde el panel de admin, gana sobre la foto.
      bindGarmentToProduct(garment, slot);
    }
    rail.add(garment);
  }
  rail.position.set(x, 0, z);
  rail.rotation.y = rotation;
  root.add(rail);
}

function createCentralPlinth(root, mats, theme) {
  const plinth = unit(new THREE.Group(), themedName(theme, 'isla oval central'), { collider: true });
  const base = cylinder(2.05, 2.18, 0.22, mats.concreteDark, 48);
  base.scale.x = 1.42;
  base.position.y = 0.11;
  plinth.add(base);
  const top = cylinder(1.94, 2.03, 0.11, mats.wood, 48);
  top.scale.x = 1.42;
  top.position.y = 0.27;
  plinth.add(top);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(2.05, 0.045, 10, 48), mats.brass);
  ring.scale.x = 1.42;
  ring.rotation.x = Math.PI / 2;
  ring.position.y = 0.32;
  plinth.add(ring);

  const pedestal = cylinder(0.74, 0.9, 0.76, mats.concreteDark, 32);
  pedestal.position.y = 0.69;
  plinth.add(pedestal);
  const display = cylinder(0.78, 0.78, 0.09, mats.brass, 32);
  display.position.y = 1.12;
  plinth.add(display);
  plinth.position.set(0, 0, 3.25);
  root.add(plinth);
}

function createMannequin(root, { x, z, rotation, mats, outfit, theme }) {
  const mannequin = unit(new THREE.Group(), themedName(theme, 'maniqui de escala'), { collider: true });
  const outfitMaterial = outfit === 'green' ? mats.green : mats.cream;
  const pantsMaterial = outfit === 'green' ? mats.black : mats.green;
  const base = cylinder(0.28, 0.34, 0.08, mats.steel, 24);
  base.position.y = 0.04;
  mannequin.add(base);

  for (const side of [-1, 1]) {
    const leg = new THREE.Mesh(new THREE.CapsuleGeometry(0.105, 0.5, 5, 10), pantsMaterial);
    leg.position.set(side * 0.13, 0.54, 0);
    leg.rotation.z = side * 0.035;
    mannequin.add(leg);
    const shoe = roundedBox(0.2, 0.11, 0.38, mats.black, 0.07, 3);
    shoe.position.set(side * 0.14, 0.1, 0.1);
    mannequin.add(shoe);
  }

  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.24, 0.4, 6, 12), outfitMaterial);
  torso.scale.set(1.08, 1, 0.78);
  torso.position.y = 1.28;
  mannequin.add(torso);
  for (const side of [-1, 1]) {
    mannequin.add(rodBetween(
      new THREE.Vector3(side * 0.29, 1.46, 0),
      new THREE.Vector3(side * 0.38, 0.92, 0.06),
      0.065,
      mats.skin,
      10,
    ));
  }
  const neck = cylinder(0.07, 0.075, 0.13, mats.skin, 12);
  neck.position.y = 1.69;
  mannequin.add(neck);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.15, 18, 12), mats.skin);
  head.scale.set(0.86, 1.14, 0.92);
  head.position.y = 1.88;
  mannequin.add(head);
  mannequin.position.set(x, 0, z);
  mannequin.rotation.y = rotation;
  root.add(mannequin);
}

function createWallDisplay(root, mats, theme) {
  const display = unit(new THREE.Group(), themedName(theme, 'pared modular de producto'), { collider: true });
  const backing = roundedBox(0.22, 2.75, 5.6, mats.wood, 0.08, 3);
  backing.position.set(0, 1.55, 0);
  display.add(backing);
  for (const y of [0.58, 1.17, 1.76, 2.35]) {
    const shelf = roundedBox(0.58, 0.08, 5.08, mats.steel, 0.035, 2);
    shelf.position.set(-0.28, y, 0);
    display.add(shelf);
  }

  const foldedGeometry = withUv1(new RoundedBoxGeometry(0.42, 0.07, 0.32, 2, 0.035));
  const folded = new THREE.InstancedMesh(foldedGeometry, mats.cream, 20);
  const dummy = new THREE.Object3D();
  let index = 0;
  for (const y of [0.68, 1.27, 1.86, 2.45]) {
    for (const z of [-2, -1, 0, 1, 2]) {
      dummy.position.set(-0.58, y, z);
      dummy.rotation.set(0, 0, (index % 2 ? 1 : -1) * 0.025);
      dummy.updateMatrix();
      folded.setMatrixAt(index++, dummy.matrix);
    }
  }
  folded.instanceMatrix.needsUpdate = true;
  display.add(folded);
  display.position.set(6.28, 0, 4.8);
  root.add(display);
}

function createFittingPod(root, mats, theme) {
  const fitting = unit(new THREE.Group(), themedName(theme, 'probador curvo'), { collider: true });
  const shell = new THREE.Mesh(
    withUv1(new THREE.CylinderGeometry(1.62, 1.62, 2.75, 32, 1, true, 0.2, Math.PI * 1.72)),
    mats.brick,
  );
  shell.position.y = 1.38;
  fitting.add(shell);
  const topRing = new THREE.Mesh(new THREE.TorusGeometry(1.62, 0.08, 10, 36, Math.PI * 1.72), mats.brass);
  topRing.rotation.x = Math.PI / 2;
  topRing.rotation.z = 0.2;
  topRing.position.y = 2.77;
  fitting.add(topRing);
  const curtain = new THREE.Mesh(new THREE.PlaneGeometry(1.65, 2.35, 12, 1), mats.fabric);
  curtain.position.set(0.76, 1.33, -1.15);
  curtain.rotation.y = -0.56;
  fitting.add(curtain);
  fitting.position.set(-4.62, 0, 10.4);
  root.add(fitting);
}

function createCounter(root, mats, theme) {
  const counter = unit(new THREE.Group(), themedName(theme, 'caja curva detallada'), { collider: true });
  const body = roundedBox(3.6, 0.9, 1.08, mats.wood, 0.22, 4);
  body.position.y = 0.47;
  counter.add(body);
  const kick = roundedBox(3.3, 0.2, 0.92, mats.black, 0.08, 2);
  kick.position.set(0, 0.12, 0.05);
  counter.add(kick);
  const top = roundedBox(3.82, 0.11, 1.24, mats.brass, 0.12, 3);
  top.position.y = 0.98;
  counter.add(top);

  const slatGeometry = withUv1(new RoundedBoxGeometry(0.105, 0.67, 0.08, 1, 0.025));
  const slats = new THREE.InstancedMesh(slatGeometry, mats.concreteDark, 22);
  const dummy = new THREE.Object3D();
  for (let index = 0; index < 22; index++) {
    dummy.position.set(-1.62 + index * 0.155, 0.55, -0.55);
    dummy.updateMatrix();
    slats.setMatrixAt(index, dummy.matrix);
  }
  slats.instanceMatrix.needsUpdate = true;
  counter.add(slats);

  const screen = roundedBox(0.68, 0.46, 0.08, mats.black, 0.06, 3);
  screen.position.set(-0.72, 1.31, 0.03);
  screen.rotation.x = -0.16;
  counter.add(screen);
  const screenFace = new THREE.Mesh(
    new THREE.PlaneGeometry(0.58, 0.36),
    new THREE.MeshBasicMaterial({ map: signTexture('FT', 'CHECKOUT', theme.accentCss) }),
  );
  screenFace.position.set(-0.72, 1.31, 0.075);
  screenFace.rotation.x = -0.16;
  counter.add(screenFace);
  counter.position.set(3.95, 0, 10.6);
  counter.rotation.y = -0.08;
  root.add(counter);
}

function createPlanter(root, { x, z, scale = 1, mats, theme }) {
  const planter = unit(new THREE.Group(), themedName(theme, 'macetero urbano'), { collider: true });
  const pot = cylinder(0.42, 0.5, 0.62, mats.concreteDark, 18);
  pot.position.y = 0.31;
  planter.add(pot);
  const soil = cylinder(0.4, 0.4, 0.04, mats.black, 18);
  soil.position.y = 0.62;
  planter.add(soil);
  for (const [dx, dz, height] of [[0, 0, 1.05], [-0.18, 0.08, 0.82], [0.17, -0.1, 0.9]]) {
    const stem = cylinder(0.025, 0.035, height, mats.green, 8);
    stem.position.set(dx, 0.63 + height / 2, dz);
    stem.rotation.z = dx * 0.5;
    planter.add(stem);
    const leaf = new THREE.Mesh(new THREE.SphereGeometry(0.28, 10, 7), mats.green);
    leaf.scale.set(0.55, 1.4, 0.35);
    leaf.position.set(dx * 1.8, 0.72 + height, dz * 1.8);
    leaf.rotation.z = dx * 1.4;
    planter.add(leaf);
  }
  planter.position.set(x, 0, z);
  planter.scale.setScalar(scale);
  root.add(planter);
}

function addBranding(root, mats, theme) {
  const mainSign = unit(new THREE.Group(), themedName(theme, `cartel ${theme.title}`));
  const frame = roundedBox(4.7, 1.28, 0.13, mats.steel, 0.09, 3);
  mainSign.add(frame);
  const face = new THREE.Mesh(
    new THREE.PlaneGeometry(4.46, 1.06),
    new THREE.MeshBasicMaterial({ map: signTexture(theme.title, theme.subtitle, theme.accentCss) }),
  );
  face.position.z = 0.071;
  mainSign.add(face);
  mainSign.position.set(4.12, 3.03, 14.055);
  root.add(mainSign);

  const poster = unit(new THREE.Group(), themedName(theme, 'poster de campana'));
  const posterFrame = roundedBox(1.82, 2.35, 0.11, mats.steel, 0.06, 2);
  poster.add(posterFrame);
  const posterFace = new THREE.Mesh(
    new THREE.PlaneGeometry(1.66, 2.18),
    new THREE.MeshBasicMaterial({ map: campaignTexture(theme) }),
  );
  posterFace.position.z = 0.061;
  poster.add(posterFace);
  poster.position.set(-5.82, 1.6, 2.1);
  poster.rotation.y = Math.PI / 2;
  root.add(poster);
}

function cssHex(value) {
  return `#${value.toString(16).padStart(6, '0')}`;
}

function graffitiTexture(theme, variant = 0) {
  return canvasTexture(1536, 768, (ctx, width, height) => {
    ctx.fillStyle = variant ? '#242827' : '#d0c5b1';
    ctx.fillRect(0, 0, width, height);
    for (let x = 0; x < width; x += 96) {
      ctx.fillStyle = variant ? 'rgba(255,255,255,0.025)' : 'rgba(40,30,24,0.055)';
      ctx.fillRect(x, 0, 5, height);
    }
    const colors = [theme.accentCss, cssHex(theme.secondaryHex), '#171b1a', '#f0e4c9'];
    ctx.lineCap = 'round';
    for (let index = 0; index < 18; index++) {
      const color = colors[index % colors.length];
      ctx.strokeStyle = color;
      ctx.globalAlpha = 0.32 + (index % 4) * 0.12;
      ctx.lineWidth = 12 + (index % 5) * 6;
      ctx.beginPath();
      const y = 90 + ((index * 137 + variant * 71) % 590);
      ctx.moveTo(-80 + index * 74, y);
      ctx.bezierCurveTo(
        width * 0.28, y - 180 + (index % 3) * 70,
        width * 0.64, y + 170 - (index % 4) * 55,
        width + 100, 120 + ((index * 83) % 520),
      );
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    ctx.save();
    ctx.translate(width * 0.5, height * 0.5);
    ctx.rotate(variant ? 0.035 : -0.045);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineJoin = 'round';
    ctx.font = '900 250px Impact, Arial Black, sans-serif';
    ctx.lineWidth = 32;
    ctx.strokeStyle = variant ? '#efe4cc' : '#111716';
    ctx.strokeText(variant ? 'BURELA' : 'ORIGEN', 0, -20, width - 120);
    ctx.fillStyle = variant ? theme.accentCss : cssHex(theme.secondaryHex);
    ctx.fillText(variant ? 'BURELA' : 'ORIGEN', 0, -20, width - 120);
    ctx.font = '900 72px Arial Black, sans-serif';
    ctx.fillStyle = variant ? '#ece2cd' : '#171b1a';
    ctx.fillText(variant ? 'FOURTWENTY  /  GALICIA' : 'ROOTS  /  1992  /  420', 0, 188);
    ctx.restore();
  });
}

function artworkPlaceholder(index, theme) {
  return canvasTexture(800, 1000, (ctx, width, height) => {
    ctx.fillStyle = index % 2 ? '#161a19' : '#d9cfb8';
    ctx.fillRect(0, 0, width, height);
    ctx.fillStyle = index % 2 ? theme.accentCss : cssHex(theme.secondaryHex);
    ctx.fillRect(52, 52, width - 104, 18);
    ctx.fillRect(52, height - 70, width - 104, 18);
    ctx.strokeStyle = index % 2 ? '#e8dec8' : '#171b1a';
    ctx.lineWidth = 24;
    ctx.beginPath();
    ctx.arc(width / 2, 390, 210, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(width / 2 - 72, 370, 16, 0, Math.PI * 2);
    ctx.arc(width / 2 + 72, 370, 16, 0, Math.PI * 2);
    ctx.fillStyle = index % 2 ? '#e8dec8' : '#171b1a';
    ctx.fill();
    ctx.font = '900 112px Arial Black, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(['ORIGEN', 'BURELA', 'FOUR20'][index % 3], width / 2, 760);
    ctx.font = '700 34px Courier New, monospace';
    ctx.fillText('REEMPLAZA ESTA FOTO EN LA CARPETA', width / 2, 840, width - 100);
  });
}

function loadArtworkTexture(url) {
  if (!url) return null;
  const texture = destinationTexture(textureLoader.load(url));
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

function createArtworkFrame(root, {
  texture,
  x,
  y,
  z,
  rotationY,
  index,
  mats,
  theme,
}) {
  const frame = unit(new THREE.Group(), themedName(theme, `cuadro reemplazable ${index + 1}`), { collider: true });
  const backing = roundedBox(1.18, 1.52, 0.1, mats.black, 0.05, 2);
  frame.add(backing);
  const face = new THREE.Mesh(
    new THREE.PlaneGeometry(1.02, 1.36),
    new THREE.MeshBasicMaterial({ map: texture, color: 0xffffff, toneMapped: false }),
  );
  face.position.z = 0.056;
  frame.add(face);
  for (const side of [-1, 1]) {
    const bar = roundedBox(0.055, 1.48, 0.13, mats.brass, 0.025, 2);
    bar.position.x = side * 0.56;
    frame.add(bar);
  }
  for (const side of [-1, 1]) {
    const bar = roundedBox(1.16, 0.055, 0.13, mats.brass, 0.025, 2);
    bar.position.y = side * 0.73;
    frame.add(bar);
  }
  frame.position.set(x, y, z);
  frame.rotation.y = rotationY;
  root.add(frame);
}

// Los 4 diseños de la coleccion ORIGEN, tal como los definio Kusher.
// 12 remeras en total: 3 de cada una, 6 blancas y 6 negras.
// El `index` es el slot del catalogo de productos: cargando esos 4 productos
// desde el panel de admin (tecla P) las pilas se visten solas con su estampa.
const REMERAS_ORIGEN = Object.freeze([
  { nombre: 'WHITE CHOCOLATE', color: 0xf4f2ec, index: 0 }, // full blanca
  { nombre: 'YIN', color: 0xf4f2ec, index: 1 },             // blanca, bordado negro
  { nombre: 'BLACK MAMBA', color: 0x141416, index: 2 },     // full negra
  { nombre: 'YANG', color: 0x141416, index: 3 },            // negra, bordado blanco y verde
]);

// Mesa cuadrada de exhibicion con las 12 remeras dobladas, 3 por diseño.
// Es el mueble central del piso: en las capturas de Binco son justamente estas
// mesas con prendas apiladas las que hacen que se lea como tienda.
function addOriginDisplayTable(root, mats, theme) {
  const mesa = createDisplayTable({
    lado: 1.5,
    maderaMaterial: mats.wood,
    metalMaterial: mats.metal ?? mats.steel,
    nombre: themedName(theme, 'mesa de exhibicion'),
  });
  mesa.group.position.set(0, 0, 2.2);
  root.add(mesa.group);

  // Las 4 pilas en cuadrado sobre la tapa, con aire entre ellas.
  const sep = 0.36;
  REMERAS_ORIGEN.forEach((remera, i) => {
    const pila = createFoldedStack({
      color: remera.color,
      cantidad: 3,
      material: mats.fabric ?? mats.wood,
      nombre: themedName(theme, `pila ${remera.nombre}`),
      // El plano de estampa se crea siempre: `bindStackToProduct` lo esconde
      // mientras el producto no tenga diseño cargado, y lo enciende cuando si.
      estampa: null,
    });
    pila.position.set(
      ((i % 2) - 0.5) * sep * 2,
      mesa.alturaTapa,
      (Math.floor(i / 2) - 0.5) * sep * 2,
    );
    pila.rotation.y = (i - 1.5) * 0.06;
    mesa.group.add(pila);
    bindStackToProduct(pila, { piso: 2, index: remera.index });
  });

  return mesa;
}

function addOriginDetails(root, mats, theme) {
  addOriginDisplayTable(root, mats, theme);

  for (const [side, variant] of [[-1, 0], [1, 1]]) {
    const wall = unit(new THREE.Group(), themedName(theme, variant ? 'mural Burela' : 'mural Origen'), { collider: true });
    const backing = roundedBox(0.18, 2.82, 5.55, mats.concreteDark, 0.07, 2);
    backing.position.y = 1.55;
    wall.add(backing);
    const face = new THREE.Mesh(
      new THREE.PlaneGeometry(5.3, 2.58),
      new THREE.MeshBasicMaterial({ map: graffitiTexture(theme, variant), toneMapped: false }),
    );
    face.position.set(side < 0 ? 0.096 : -0.096, 1.55, 0);
    face.rotation.y = side < 0 ? Math.PI / 2 : -Math.PI / 2;
    wall.add(face);
    wall.position.set(side * 6.48, 0, variant ? 7.35 : 7.15);
    root.add(wall);
  }

  const crates = unit(new THREE.Group(), themedName(theme, 'cajones y latas de pintura'));
  for (let index = 0; index < 5; index++) {
    const crate = roundedBox(0.72, 0.42, 0.55, mats.wood, 0.06, 2);
    crate.position.set((index % 2) * 0.58, 0.21 + Math.floor(index / 2) * 0.42, (index % 3) * 0.08);
    crate.rotation.y = (index - 2) * 0.08;
    crates.add(crate);
  }
  for (let index = 0; index < 4; index++) {
    const can = cylinder(0.11, 0.11, 0.25, index % 2 ? mats.orange : mats.green, 14);
    can.position.set(-0.48 + index * 0.28, 0.13, 0.55);
    crates.add(can);
  }
  crates.position.set(-5.55, 0, 10.9);
  root.add(crates);
}

function courtTexture(theme) {
  return canvasTexture(1024, 1024, (ctx, width, height) => {
    ctx.fillStyle = '#9b6a3d';
    ctx.fillRect(0, 0, width, height);
    for (let x = 0; x < width; x += 42) {
      ctx.fillStyle = x % 84 ? 'rgba(255,224,167,0.10)' : 'rgba(55,24,11,0.09)';
      ctx.fillRect(x, 0, 38, height);
    }
    ctx.strokeStyle = '#f4ead7';
    ctx.lineWidth = 14;
    ctx.strokeRect(52, 52, width - 104, height - 104);
    ctx.beginPath();
    ctx.arc(width / 2, height / 2, 145, 0, Math.PI * 2);
    ctx.stroke();
    for (const y of [52, height - 320]) ctx.strokeRect(width / 2 - 155, y, 310, 268);
    ctx.fillStyle = theme.accentCss;
    ctx.beginPath();
    ctx.arc(width / 2, height / 2, 102, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#111515';
    ctx.font = '900 92px Arial Black, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('420', width / 2, height / 2 + 8);
  });
}

function scoreboardTexture(theme) {
  return canvasTexture(1024, 420, (ctx, width, height) => {
    ctx.fillStyle = '#070909';
    ctx.fillRect(0, 0, width, height);
    ctx.strokeStyle = theme.accentCss;
    ctx.lineWidth = 14;
    ctx.strokeRect(16, 16, width - 32, height - 32);
    ctx.fillStyle = '#f5eee2';
    ctx.font = '900 72px Arial Black, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('BURELA LEAGUE', width / 2, 92);
    ctx.fillStyle = theme.accentCss;
    ctx.font = '900 156px Courier New, monospace';
    ctx.fillText('42  -  0', width / 2, 270);
    ctx.fillStyle = '#d6c7a8';
    ctx.font = '700 34px Courier New, monospace';
    ctx.fillText('HOOP SEASON  /  FOURTWENTY', width / 2, 356);
  });
}

function createBasketball(mats) {
  const ball = new THREE.Group();
  const sphere = new THREE.Mesh(
    new THREE.SphereGeometry(0.18, 20, 14),
    new THREE.MeshStandardMaterial({ color: 0xc65d24, roughness: 0.9 }),
  );
  ball.add(sphere);
  for (const rotation of [[0, 0, 0], [Math.PI / 2, 0, 0], [0, Math.PI / 2, 0]]) {
    const seam = new THREE.Mesh(new THREE.TorusGeometry(0.181, 0.008, 6, 24), mats.black);
    seam.rotation.set(...rotation);
    ball.add(seam);
  }
  return ball;
}

function addHoopDetails(root, mats, theme) {
  const court = new THREE.Mesh(
    new THREE.PlaneGeometry(8.4, 11.8),
    new THREE.MeshStandardMaterial({ map: courtTexture(theme), roughness: 0.5, metalness: 0.02 }),
  );
  court.rotation.x = -Math.PI / 2;
  court.position.set(0, 0.04, 4.0);
  court.name = themedName(theme, 'media cancha de exhibicion');
  court.receiveShadow = true;
  root.add(court);

  const hoop = unit(new THREE.Group(), themedName(theme, 'aro de basket completo'), { collider: true });
  const base = roundedBox(1.5, 0.22, 1.05, mats.black, 0.14, 3);
  base.position.y = 0.11;
  hoop.add(base);
  const pole = roundedBox(0.22, 2.75, 0.24, mats.steel, 0.08, 3);
  pole.position.set(0, 1.52, 0.32);
  hoop.add(pole);
  const boardFrame = roundedBox(2.05, 1.24, 0.12, mats.steel, 0.1, 3);
  boardFrame.position.set(0, 2.72, 0.18);
  hoop.add(boardFrame);
  const backboardGlass = new THREE.Mesh(new THREE.PlaneGeometry(1.84, 1.03), mats.glass);
  backboardGlass.position.set(0, 2.72, 0.115);
  hoop.add(backboardGlass);
  const square = new THREE.LineSegments(
    new THREE.EdgesGeometry(new THREE.PlaneGeometry(0.7, 0.48)),
    new THREE.LineBasicMaterial({ color: 0xf1eee7 }),
  );
  square.position.set(0, 2.57, 0.052);
  hoop.add(square);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.35, 0.035, 10, 28), mats.orange);
  rim.rotation.x = Math.PI / 2;
  rim.position.set(0, 2.25, -0.2);
  hoop.add(rim);
  const netPoints = [];
  for (let index = 0; index < 12; index++) {
    const angle = (index / 12) * Math.PI * 2;
    netPoints.push(
      Math.cos(angle) * 0.34, 2.23, -0.2 + Math.sin(angle) * 0.34,
      Math.cos(angle) * 0.22, 1.78, -0.2 + Math.sin(angle) * 0.22,
    );
  }
  const netGeometry = new THREE.BufferGeometry();
  netGeometry.setAttribute('position', new THREE.Float32BufferAttribute(netPoints, 3));
  hoop.add(new THREE.LineSegments(netGeometry, new THREE.LineBasicMaterial({ color: 0xdad7cb })));
  hoop.position.set(0, 0, -4.35);
  root.add(hoop);

  const rack = unit(new THREE.Group(), themedName(theme, 'carro de pelotas'), { collider: true });
  for (const y of [0.35, 0.78]) {
    rack.add(rodBetween(new THREE.Vector3(-0.85, y, -0.22), new THREE.Vector3(0.85, y, -0.22), 0.025, mats.steel));
    rack.add(rodBetween(new THREE.Vector3(-0.85, y, 0.22), new THREE.Vector3(0.85, y, 0.22), 0.025, mats.steel));
  }
  for (const x of [-0.82, 0.82]) rack.add(rodBetween(new THREE.Vector3(x, 0.12, 0), new THREE.Vector3(x, 1.02, 0), 0.03, mats.steel));
  for (let index = 0; index < 6; index++) {
    const ball = createBasketball(mats);
    ball.position.set(-0.62 + (index % 3) * 0.62, 0.4 + Math.floor(index / 3) * 0.43, 0);
    rack.add(ball);
  }
  rack.position.set(-4.9, 0, 8.8);
  root.add(rack);

  const scoreboard = unit(new THREE.Group(), themedName(theme, 'marcador Burela League'));
  scoreboard.add(roundedBox(4.28, 1.5, 0.14, mats.steel, 0.08, 3));
  const face = new THREE.Mesh(
    new THREE.PlaneGeometry(4.05, 1.27),
    new THREE.MeshBasicMaterial({ map: scoreboardTexture(theme), toneMapped: false }),
  );
  face.position.z = 0.076;
  scoreboard.add(face);
  scoreboard.position.set(-3.85, 3.0, 14.04);
  root.add(scoreboard);
}

function culturePosterTexture(theme) {
  return canvasTexture(900, 900, (ctx, width, height) => {
    ctx.fillStyle = '#0f1112';
    ctx.fillRect(0, 0, width, height);
    for (let index = 0; index < 18; index++) {
      const barHeight = 80 + ((index * 73) % 600);
      ctx.fillStyle = index % 3 === 0 ? theme.accentCss : (index % 2 ? '#375d66' : '#e6dfcf');
      ctx.fillRect(46 + index * 45, height - 95 - barHeight, 25, barHeight);
    }
    ctx.fillStyle = '#f2eadc';
    ctx.font = '900 112px Arial Black, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('CULTURA', width / 2, 150);
    ctx.font = '700 38px Courier New, monospace';
    ctx.fillText('BURELA SOUNDS / ISSUE 420', width / 2, 215);
  });
}

function addSpeaker(group, x, z, rotationY, mats, theme, name) {
  const speaker = unit(new THREE.Group(), themedName(theme, name), { collider: true });
  speaker.add(roundedBox(0.82, 1.62, 0.68, mats.black, 0.1, 3));
  for (const [y, radius] of [[0.48, 0.24], [-0.28, 0.31]]) {
    const cone = cylinder(radius, radius * 0.72, 0.08, mats.wornSteel, 24);
    cone.rotation.x = Math.PI / 2;
    cone.position.set(0, y, -0.37);
    speaker.add(cone);
    const center = cylinder(radius * 0.32, radius * 0.32, 0.09, mats.orange, 18);
    center.rotation.x = Math.PI / 2;
    center.position.set(0, y, -0.42);
    speaker.add(center);
  }
  speaker.position.set(x, 0.82, z);
  speaker.rotation.y = rotationY;
  group.add(speaker);
}

function addCultureDetails(root, mats, theme) {
  const recordWall = unit(new THREE.Group(), themedName(theme, 'archivo de vinilos'), { collider: true });
  const backing = roundedBox(0.2, 2.75, 5.4, mats.wood, 0.08, 3);
  backing.position.y = 1.52;
  recordWall.add(backing);
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 5; col++) {
      const vinyl = cylinder(0.3, 0.3, 0.025, mats.black, 28);
      vinyl.rotation.z = Math.PI / 2;
      vinyl.position.set(-0.13, 0.72 + row * 0.78, -1.9 + col * 0.94);
      recordWall.add(vinyl);
      const label = cylinder(0.09, 0.09, 0.03, (row + col) % 2 ? mats.orange : mats.yellow, 20);
      label.rotation.z = Math.PI / 2;
      label.position.set(-0.15, 0.72 + row * 0.78, -1.9 + col * 0.94);
      recordWall.add(label);
    }
  }
  recordWall.position.set(-6.38, 0, 6.8);
  root.add(recordWall);

  const booth = unit(new THREE.Group(), themedName(theme, 'cabina DJ y turntables'), { collider: true });
  booth.add(roundedBox(3.25, 0.88, 1.22, mats.wood, 0.16, 4));
  const deck = roundedBox(3.42, 0.11, 1.34, mats.steel, 0.08, 3);
  deck.position.y = 0.48;
  booth.add(deck);
  for (const x of [-0.95, 0.95]) {
    const platter = cylinder(0.38, 0.38, 0.035, mats.black, 32);
    platter.position.set(x, 0.56, 0);
    booth.add(platter);
    const label = cylinder(0.1, 0.1, 0.04, x < 0 ? mats.orange : mats.yellow, 20);
    label.position.set(x, 0.58, 0);
    booth.add(label);
  }
  for (let index = 0; index < 6; index++) {
    const fader = roundedBox(0.035, 0.025, 0.32, mats.cream, 0.01, 1);
    fader.position.set(-0.35 + index * 0.14, 0.59, 0);
    booth.add(fader);
  }
  booth.position.set(0, 0.45, 8.65);
  root.add(booth);
  addSpeaker(root, -2.25, 8.75, 0, mats, theme, 'monitor izquierdo');
  addSpeaker(root, 2.25, 8.75, 0, mats, theme, 'monitor derecho');

  const poster = unit(new THREE.Group(), themedName(theme, 'poster ecualizador'));
  poster.add(roundedBox(2.42, 2.42, 0.12, mats.steel, 0.07, 2));
  const face = new THREE.Mesh(
    new THREE.PlaneGeometry(2.23, 2.23),
    new THREE.MeshBasicMaterial({ map: culturePosterTexture(theme), toneMapped: false }),
  );
  face.position.z = 0.066;
  poster.add(face);
  poster.position.set(5.8, 1.65, 1.15);
  poster.rotation.y = -Math.PI / 2;
  root.add(poster);
}

function createBobToy(mats, scale = 1) {
  const toy = new THREE.Group();
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.13, 0.2, 5, 10), mats.bobBrown);
  body.position.y = 0.28;
  toy.add(body);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.2, 18, 12), mats.bobBrown);
  head.position.y = 0.57;
  toy.add(head);
  for (const side of [-1, 1]) {
    const ear = new THREE.Mesh(new THREE.SphereGeometry(0.085, 14, 10), mats.bobFace);
    ear.position.set(side * 0.2, 0.58, 0);
    toy.add(ear);
  }
  const muzzle = new THREE.Mesh(new THREE.SphereGeometry(0.12, 16, 10), mats.bobFace);
  muzzle.scale.set(1.05, 0.72, 0.62);
  muzzle.position.set(0, 0.52, -0.15);
  toy.add(muzzle);
  for (const side of [-1, 1]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.025, 10, 7), mats.black);
    eye.position.set(side * 0.07, 0.63, -0.17);
    toy.add(eye);
    const shoe = roundedBox(0.12, 0.07, 0.17, mats.orange, 0.04, 2);
    shoe.position.set(side * 0.09, 0.04, -0.035);
    toy.add(shoe);
  }
  toy.scale.setScalar(scale);
  toy.userData.editorSelectExisting = true;
  return toy;
}

function bobLogoTexture(theme) {
  return canvasTexture(900, 900, (ctx, width, height) => {
    ctx.fillStyle = '#151817';
    ctx.fillRect(0, 0, width, height);
    ctx.fillStyle = '#6f3d25';
    ctx.beginPath();
    ctx.arc(width / 2, 390, 245, 0, Math.PI * 2);
    ctx.fill();
    for (const x of [230, 670]) {
      ctx.beginPath();
      ctx.arc(x, 380, 115, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = '#c47a3b';
    ctx.beginPath();
    ctx.ellipse(width / 2, 460, 180, 130, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#111514';
    ctx.beginPath();
    ctx.arc(385, 350, 22, 0, Math.PI * 2);
    ctx.arc(515, 350, 22, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = theme.accentCss;
    ctx.font = '900 112px Arial Black, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('BOBILONIA', width / 2, 785, width - 80);
  });
}

function addBobDetails(root, mats, theme) {
  const toyTable = unit(new THREE.Group(), themedName(theme, 'mesa de juguetes BOB'), { collider: true });
  toyTable.add(roundedBox(3.7, 0.18, 1.45, mats.wood, 0.14, 3));
  for (const x of [-1.55, 1.55]) {
    const leg = roundedBox(0.16, 0.84, 1.1, mats.steel, 0.05, 2);
    leg.position.set(x, -0.48, 0);
    toyTable.add(leg);
  }
  for (let index = 0; index < 8; index++) {
    const toy = createBobToy(mats, 0.82 + (index % 3) * 0.08);
    toy.position.set(-1.42 + (index % 4) * 0.95, 0.18, -0.36 + Math.floor(index / 4) * 0.72);
    toy.rotation.y = Math.PI + (index - 3.5) * 0.12;
    toyTable.add(toy);
  }
  toyTable.position.set(0, 0.98, 8.2);
  root.add(toyTable);

  const display = unit(new THREE.Group(), themedName(theme, 'vitrina de Bob Toys'), { collider: true });
  display.add(roundedBox(0.22, 2.85, 5.5, mats.wood, 0.08, 3));
  for (const y of [0.58, 1.35, 2.12]) {
    const shelf = roundedBox(0.62, 0.08, 5.05, mats.brass, 0.035, 2);
    shelf.position.set(-0.27, y - 1.42, 0);
    display.add(shelf);
  }
  for (let index = 0; index < 9; index++) {
    const toy = createBobToy(mats, 0.62);
    toy.position.set(-0.58, -1.15 + Math.floor(index / 3) * 0.78, -1.55 + (index % 3) * 1.55);
    toy.rotation.y = Math.PI / 2;
    display.add(toy);
  }
  display.position.set(6.3, 1.45, 4.8);
  root.add(display);

  const logo = unit(new THREE.Group(), themedName(theme, 'retrato BOBILONIA'));
  logo.add(roundedBox(2.65, 2.65, 0.13, mats.steel, 0.1, 3));
  const face = new THREE.Mesh(
    new THREE.PlaneGeometry(2.45, 2.45),
    new THREE.MeshBasicMaterial({ map: bobLogoTexture(theme), toneMapped: false }),
  );
  face.position.z = 0.071;
  logo.add(face);
  logo.position.set(-5.8, 1.7, 6.25);
  logo.rotation.y = Math.PI / 2;
  root.add(logo);

  const heroToy = createBobToy(mats, 2.15);
  heroToy.name = themedName(theme, 'figura BOB central');
  heroToy.position.set(0, 1.15, 3.25);
  heroToy.rotation.y = Math.PI;
  root.add(heroToy);
}

// Los tres cuadros editables existen en TODOS los pisos, no solo en ORIGEN.
// La pared derecha es la misma en los cinco (el cuarto es compartido), pero
// cada piso ya tiene cosas colgadas ahi, asi que la posicion en Z se elige por
// tema para no encimar nada: CULTURA tiene un poster en z=1.15 y BOB una
// vitrina de juguetes en z=4.8.
const CUADROS_POR_PISO = {
  origen: { z0: -2.5, paso: 1.65 },
  hoop: { z0: -2.5, paso: 1.65 },
  cultura: { z0: -3.6, paso: 1.4 },   // el poster de la cabina esta en z=1.15
  bob: { z0: -2.5, paso: 1.65 },      // la vitrina de juguetes esta en z=4.8
  terraza: { z0: -2.5, paso: 1.65 },
};

function addArtworkFrames(root, mats, theme) {
  const config = CUADROS_POR_PISO[theme.key] ?? CUADROS_POR_PISO.origen;
  for (let index = 0; index < 3; index++) {
    // ORIGEN ademas puede tomar fotos de su carpeta; los otros pisos arrancan
    // con el afiche provisional y se personalizan con el editor (tecla T).
    const texture = (theme.key === 'origen'
      ? loadArtworkTexture(ORIGIN_ARTWORK_URLS[index])
      : null) ?? artworkPlaceholder(index, theme);
    createArtworkFrame(root, {
      texture,
      x: 6.32,
      y: 1.82,
      z: config.z0 + index * config.paso,
      rotationY: -Math.PI / 2,
      index,
      mats,
      theme,
    });
  }
}

function addThemeDetails(root, mats, theme) {
  if (theme.key === 'origen') addOriginDetails(root, mats, theme);
  else if (theme.key === 'hoop') addHoopDetails(root, mats, theme);
  else if (theme.key === 'cultura') addCultureDetails(root, mats, theme);
  else if (theme.key === 'bob') addBobDetails(root, mats, theme);
}

function addLights(scene, shadows, mats, theme) {
  scene.add(new THREE.HemisphereLight(0xcde1e2, 0x3f352d, 1.08));
  scene.add(new THREE.AmbientLight(0xfff7ea, 0.22));

  const daylight = new THREE.DirectionalLight(0xffe2b8, 1.72);
  daylight.position.set(-7, 10, -8);
  daylight.target.position.set(0, 0.7, 4.5);
  daylight.castShadow = shadows;
  if (shadows) {
    daylight.shadow.mapSize.set(512, 512);
    daylight.shadow.camera.left = -9;
    daylight.shadow.camera.right = 9;
    daylight.shadow.camera.top = 11;
    daylight.shadow.camera.bottom = -6;
    daylight.shadow.camera.near = 1;
    daylight.shadow.camera.far = 32;
    daylight.shadow.bias = -0.0003;
    daylight.shadow.radius = 3;
  }
  scene.add(daylight, daylight.target);

  const frontFill = new THREE.DirectionalLight(0xbfd8e2, 0.72);
  frontFill.position.set(6, 7, -8);
  frontFill.target.position.set(0, 1.1, 4.2);
  scene.add(frontFill, frontFill.target);

  for (const [x, z, color, intensity] of [
    [-3.2, 1.1, 0xffe1b5, 6.4],
    [3.1, 4.8, 0xd9ecdf, 5.8],
    [0, 10.2, 0xffcca0, 6.2],
  ]) {
    const spot = new THREE.SpotLight(color, intensity, 8.2, 0.8, 0.72, 1.4);
    spot.position.set(x, 3.72, z);
    spot.target.position.set(x * 0.82, 0, z + 0.35);
    scene.add(spot, spot.target);
  }

  const signGlow = new THREE.PointLight(theme.accentHex, 1.8, 5.5, 2);
  signGlow.position.set(0, 2.8, 12.2);
  scene.add(signGlow);

  scene.userData.ps3FloorLightMaterial = mats.light;
}

export function buildPs3FloorScene(scene, {
  destinationId = 5,
  environmentConfig,
  shadows = true,
  productFloor = null,
} = {}) {
  const theme = ps3ThemeForDestination(destinationId);
  const root = new THREE.Group();
  root.name = `${theme.editorLabel} · FOURTWENTY`;
  const mats = buildMaterials(theme);
  scene.userData.ps3Theme = theme.key;

  const environmentRoot = addEditableHdriSphere(root, scene, environmentConfig);
  environmentRoot.scale.setScalar(1.5);
  environmentRoot.rotation.y = -0.18;

  const floor = roundedBox(
    TERRACE_PS3_PROFILE.width,
    0.32,
    TERRACE_PS3_PROFILE.depth,
    mats.concrete,
    0.34,
    4,
  );
  floor.position.set(0, -0.16, TERRACE_PS3_PROFILE.centerZ);
  floor.name = themedName(theme, 'piso PBR de hormigon');
  floor.receiveShadow = true;
  root.add(floor);

  const floorInset = roundedBox(11.7, 0.04, 13.9, mats.concreteDark, 0.3, 3);
  floorInset.position.set(0, 0.012, 4.15);
  floorInset.name = themedName(theme, 'superficie central');
  floorInset.receiveShadow = true;
  root.add(floorInset);

  addPerimeter(root, mats, theme);
  addBackCore(root, mats, theme);
  addCanopy(root, mats, theme);
  addCeilingServices(root, mats, theme);
  addBranding(root, mats, theme);
  createCentralPlinth(root, mats, theme);
  createRetailRail(root, {
    x: -2.65,
    z: 0.25,
    rotation: 0.08,
    mats,
    theme,
    productFloor,
    slotOffset: 0,
    name: themedName(theme, 'perchero izquierdo'),
  });
  createRetailRail(root, {
    x: 2.85,
    z: 6.65,
    rotation: -0.12,
    mats,
    theme,
    productFloor,
    slotOffset: 2,
    name: themedName(theme, 'perchero derecho'),
  });
  if (!['origen', 'bob'].includes(theme.key)) createWallDisplay(root, mats, theme);
  createFittingPod(root, mats, theme);
  createCounter(root, mats, theme);
  if (theme.key !== 'bob') {
    createMannequin(root, {
      x: -1.1, z: 3.25, rotation: -0.2, mats, outfit: theme.outfitA, theme,
    });
    createMannequin(root, {
      x: 1.05, z: 3.25, rotation: 0.2, mats, outfit: theme.outfitB, theme,
    });
  }
  createPlanter(root, { x: -5.72, z: -3.85, scale: 0.9, mats, theme });
  createPlanter(root, { x: 5.72, z: -3.85, scale: 0.9, mats, theme });
  addThemeDetails(root, mats, theme);
  addArtworkFrames(root, mats, theme);

  root.traverse((object) => {
    if (!object.isMesh && !object.isInstancedMesh) return;
    if (object.userData.skipShadow || object.material?.transparent || object.isInstancedMesh) {
      object.castShadow = false;
      object.receiveShadow = false;
      return;
    }
    object.castShadow = true;
    object.receiveShadow = true;
  });

  scene.add(root);
  addLights(scene, shadows, mats, theme);
  // Diseños de cuadros hechos con el editor (tecla T). Es asincrono porque una
  // foto guardada tarda en decodificar; mientras tanto el cuadro muestra el
  // afiche provisional, que es exactamente lo que corresponde.
  applySavedFrameDesigns(scene);
  // Sin esto las prendas vuelven a su color de fabrica y sin estampa cada vez
  // que se entra de nuevo al piso, igual que pasaba con los cuadros.
  applySavedGarmentDesigns(scene);
  return { root, colliders: [] };
}

export function buildTerracePs3Trial(scene, options = {}) {
  return buildPs3FloorScene(scene, { ...options, destinationId: 5 });
}
