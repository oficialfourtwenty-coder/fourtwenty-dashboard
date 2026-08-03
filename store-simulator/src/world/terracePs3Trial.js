import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { addEditableHdriSphere } from './bincoShopTrial.js';

const MATERIAL_ROOT = 'assets/materials/terrace-ps3';
const textureLoader = new THREE.TextureLoader();

export const TERRACE_PS3_PROFILE = Object.freeze({
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

function seededRandom(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };
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

function facadeTexture(seed, color = '#111718') {
  return canvasTexture(256, 512, (ctx, width, height) => {
    const random = seededRandom(seed);
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, width, height);
    const cols = 5;
    const rows = 13;
    const marginX = 16;
    const marginY = 18;
    const cellW = (width - marginX * 2) / cols;
    const cellH = (height - marginY * 2) / rows;
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const lit = random() > 0.56;
        ctx.fillStyle = lit
          ? (random() > 0.35 ? '#d8b676' : '#89a8aa')
          : (random() > 0.5 ? '#273133' : '#1a2325');
        ctx.fillRect(
          marginX + col * cellW + 5,
          marginY + row * cellH + 7,
          cellW - 10,
          cellH - 13,
        );
      }
    }
    ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
    for (let y = 0; y < height; y += cellH) ctx.fillRect(0, y, width, 3);
  });
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

function saleTexture() {
  return canvasTexture(512, 640, (ctx, width, height) => {
    ctx.fillStyle = '#ded4bd';
    ctx.fillRect(0, 0, width, height);
    ctx.fillStyle = '#df5f2c';
    ctx.fillRect(0, 0, width, 86);
    ctx.fillStyle = '#181c1c';
    ctx.font = '900 92px Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('TERRAZA', width / 2, 200);
    ctx.font = '900 148px Arial, sans-serif';
    ctx.fillStyle = '#264c38';
    ctx.fillText('420', width / 2, 380);
    ctx.fillStyle = '#181c1c';
    ctx.font = '700 34px Courier New, monospace';
    ctx.fillText('ROOFTOP DROP', width / 2, 490);
    ctx.fillStyle = '#df5f2c';
    ctx.fillRect(58, 535, width - 116, 18);
  });
}

function buildMaterials() {
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
    green: new THREE.MeshStandardMaterial({ color: 0x244f38, roughness: 0.87 }),
    yellow: new THREE.MeshStandardMaterial({ color: 0xd4aa42, roughness: 0.78 }),
    orange: new THREE.MeshStandardMaterial({ color: 0xc95a2f, roughness: 0.8 }),
    fabric: new THREE.MeshStandardMaterial({ color: 0x233d33, roughness: 0.97, side: THREE.DoubleSide }),
    garment: new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.97,
      side: THREE.DoubleSide,
      vertexColors: true,
    }),
    skin: new THREE.MeshStandardMaterial({ color: 0x9e765c, roughness: 0.84 }),
    glass: new THREE.MeshPhysicalMaterial({
      color: 0xc6d6d7,
      transparent: true,
      opacity: 0.18,
      roughness: 0.08,
      metalness: 0.08,
      transmission: 0.3,
      thickness: 0.035,
      clearcoat: 0.7,
      clearcoatRoughness: 0.13,
      depthWrite: false,
    }),
    light: new THREE.MeshStandardMaterial({
      color: 0xf4eee0,
      emissive: 0xffdfad,
      emissiveIntensity: 2.2,
      roughness: 0.26,
    }),
  };
}

function addDistantSkyline(root) {
  const skyline = new THREE.Group();
  skyline.name = 'TERRAZA · ciudad lejana optimizada';
  skyline.userData.editorHelper = true;
  const random = seededRandom(4202026);
  const batches = [
    { specs: [], texture: facadeTexture(420, '#12191a') },
    { specs: [], texture: facadeTexture(2026, '#181a1f') },
  ];

  for (let index = 0; index < 34; index++) {
    const angle = (index / 34) * Math.PI * 2 + (random() - 0.5) * 0.08;
    const radius = 23 + random() * 12;
    const width = 2.5 + random() * 5.2;
    const depth = 2.5 + random() * 4.5;
    const height = 7 + random() * 18;
    batches[index % 2].specs.push({
      x: Math.sin(angle) * radius,
      y: -2.1 + height / 2,
      z: TERRACE_PS3_PROFILE.centerZ + Math.cos(angle) * radius,
      width,
      depth,
      height,
      rotation: angle * 0.17,
      tint: new THREE.Color().setHSL(0.5 + random() * 0.08, 0.08, 0.23 + random() * 0.13),
    });
  }

  const matrix = new THREE.Matrix4();
  const quaternion = new THREE.Quaternion();
  const position = new THREE.Vector3();
  const scale = new THREE.Vector3();
  const rotation = new THREE.Euler();
  for (const [batchIndex, batch] of batches.entries()) {
    const geometry = withUv1(new THREE.BoxGeometry(1, 1, 1));
    const material = new THREE.MeshStandardMaterial({
      map: batch.texture,
      emissiveMap: batch.texture,
      emissive: batchIndex ? 0x5f5547 : 0x495c5d,
      emissiveIntensity: 0.36,
      color: 0xffffff,
      roughness: 0.92,
      metalness: 0.02,
      vertexColors: true,
    });
    const buildings = new THREE.InstancedMesh(geometry, material, batch.specs.length);
    buildings.name = `TERRAZA · edificios lejanos ${batchIndex + 1}`;
    batch.specs.forEach((spec, index) => {
      position.set(spec.x, spec.y, spec.z);
      rotation.set(0, spec.rotation, 0);
      quaternion.setFromEuler(rotation);
      scale.set(spec.width, spec.height, spec.depth);
      matrix.compose(position, quaternion, scale);
      buildings.setMatrixAt(index, matrix);
      buildings.setColorAt(index, spec.tint);
    });
    buildings.instanceMatrix.needsUpdate = true;
    if (buildings.instanceColor) buildings.instanceColor.needsUpdate = true;
    buildings.castShadow = false;
    buildings.receiveShadow = false;
    skyline.add(buildings);
  }

  const horizon = box(76, 0.4, 76, new THREE.MeshStandardMaterial({
    color: 0x161b1c,
    roughness: 1,
  }));
  horizon.position.set(0, -2.35, TERRACE_PS3_PROFILE.centerZ);
  skyline.add(horizon);
  root.add(skyline);
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

function addPerimeter(root, mats) {
  addParapetSection(root, {
    width: 13.55, depth: 0.26, x: 0, z: TERRACE_PS3_PROFILE.minZ + 0.14, mats,
    name: 'TERRAZA · baranda panoramica frontal',
  });
  for (const side of [-1, 1]) {
    addParapetSection(root, {
      width: 0.26, depth: 19.45, x: side * 6.86, z: TERRACE_PS3_PROFILE.centerZ, mats,
      name: side < 0 ? 'TERRAZA · baranda izquierda' : 'TERRAZA · baranda derecha',
    });
  }

  for (const [x, z] of [
    [-6.72, -5.18], [6.72, -5.18],
    [-6.72, 4.5], [6.72, 4.5],
    [-6.72, 14.15], [6.72, 14.15],
  ]) {
    const column = cylinder(0.19, 0.22, TERRACE_PS3_PROFILE.height, mats.concreteDark, 14);
    column.position.set(x, TERRACE_PS3_PROFILE.height / 2, z);
    column.name = 'TERRAZA · columna facetada';
    column.userData.destinationCollider = true;
    root.add(column);
  }
}

function addBackCore(root, mats) {
  for (const side of [-1, 1]) {
    const wall = unit(new THREE.Group(), side < 0
      ? 'TERRAZA · muro de ladrillo izquierdo'
      : 'TERRAZA · muro de ladrillo derecho', { collider: true });
    const panel = roundedBox(5.28, 4.25, 0.38, mats.brick, 0.1, 3);
    panel.position.set(side * 4.2, 2.12, 0);
    wall.add(panel);
    wall.position.z = 14.28;
    root.add(wall);
  }

  const lintel = roundedBox(3.25, 0.48, 0.48, mats.concreteDark, 0.12, 3);
  lintel.position.set(0, 4.02, 14.2);
  lintel.name = 'TERRAZA · dintel del ascensor';
  root.add(lintel);

  const arch = new THREE.Mesh(new THREE.TorusGeometry(2.28, 0.17, 10, 36, Math.PI), mats.brass);
  arch.position.set(0, 1.36, 12.2);
  arch.name = 'TERRAZA · arco metalico central';
  root.add(arch);
  for (const side of [-1, 1]) {
    const post = cylinder(0.17, 0.19, 1.36, mats.brass, 14);
    post.position.set(side * 2.28, 0.68, 12.2);
    root.add(post);
  }
}

function addCanopy(root, mats) {
  const canopy = unit(new THREE.Group(), 'TERRAZA · cubierta industrial');
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
    glass.name = 'TERRAZA · vidrio de cubierta';
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
  slats.name = 'TERRAZA · listones de madera del techo';
  canopy.add(slats);
  root.add(canopy);
}

function addCeilingServices(root, mats) {
  const services = unit(new THREE.Group(), 'TERRAZA · instalaciones de techo');
  const duct = cylinder(0.27, 0.27, 12.8, mats.wornSteel, 16);
  duct.rotation.x = Math.PI / 2;
  duct.position.set(5.2, 3.78, 4.4);
  duct.name = 'TERRAZA · conducto de ventilacion';
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

function createHangerLines(count, spacing, material) {
  const positions = [];
  for (let index = 0; index < count; index++) {
    const x = (index - (count - 1) / 2) * spacing;
    positions.push(
      x - 0.22, -0.14, 0, x, 0.02, 0,
      x, 0.02, 0, x + 0.22, -0.14, 0,
      x + 0.22, -0.14, 0, x - 0.22, -0.14, 0,
      x, 0.02, 0, x, 0.12, 0,
    );
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  return new THREE.LineSegments(geometry, material);
}

function createGarmentGeometry() {
  const shape = new THREE.Shape();
  shape.moveTo(-0.15, 0.3);
  shape.lineTo(-0.34, 0.2);
  shape.lineTo(-0.28, 0.04);
  shape.lineTo(-0.2, 0.08);
  shape.lineTo(-0.17, -0.42);
  shape.quadraticCurveTo(0, -0.47, 0.17, -0.42);
  shape.lineTo(0.2, 0.08);
  shape.lineTo(0.28, 0.04);
  shape.lineTo(0.34, 0.2);
  shape.lineTo(0.15, 0.3);
  shape.quadraticCurveTo(0, 0.19, -0.15, 0.3);
  return withUv1(new THREE.ShapeGeometry(shape, 2));
}

function createRetailRail(root, { x, z, rotation = 0, mats, name }) {
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
  const hangerMaterial = new THREE.LineBasicMaterial({ color: 0xaaaead });
  const hangers = createHangerLines(9, 0.27, hangerMaterial);
  hangers.position.y = 1.48;
  rail.add(hangers);

  const garments = new THREE.InstancedMesh(createGarmentGeometry(), mats.garment, 9);
  const garmentDummy = new THREE.Object3D();
  const garmentColors = [
    0x263d32, 0xd5cfbd, 0x9b4b35,
    0x1c2425, 0xc6a64e, 0x405e62,
    0xe2ddd0, 0x6f352e, 0x273d2f,
  ];
  for (let index = 0; index < 9; index++) {
    garmentDummy.position.set((index - 4) * 0.27, 1.12, 0.015 + (index % 3) * 0.012);
    garmentDummy.rotation.set(0, (index - 4) * 0.018, (index % 2 ? 1 : -1) * 0.018);
    garmentDummy.scale.setScalar(0.88 + (index % 3) * 0.035);
    garmentDummy.updateMatrix();
    garments.setMatrixAt(index, garmentDummy.matrix);
    garments.setColorAt(index, new THREE.Color(garmentColors[index]));
  }
  garments.instanceMatrix.needsUpdate = true;
  if (garments.instanceColor) garments.instanceColor.needsUpdate = true;
  garments.name = `${name} · prendas de muestra`;
  rail.add(garments);
  rail.position.set(x, 0, z);
  rail.rotation.y = rotation;
  root.add(rail);
}

function createCentralPlinth(root, mats) {
  const plinth = unit(new THREE.Group(), 'TERRAZA · isla oval central', { collider: true });
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

function createMannequin(root, { x, z, rotation, mats, outfit }) {
  const mannequin = unit(new THREE.Group(), 'TERRAZA · maniqui de escala', { collider: true });
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

function createWallDisplay(root, mats) {
  const display = unit(new THREE.Group(), 'TERRAZA · pared modular de producto', { collider: true });
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

function createFittingPod(root, mats) {
  const fitting = unit(new THREE.Group(), 'TERRAZA · probador curvo', { collider: true });
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

function createCounter(root, mats) {
  const counter = unit(new THREE.Group(), 'TERRAZA · caja curva detallada', { collider: true });
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
    new THREE.MeshBasicMaterial({ map: signTexture('FT', 'CHECKOUT', '#6cb780') }),
  );
  screenFace.position.set(-0.72, 1.31, 0.075);
  screenFace.rotation.x = -0.16;
  counter.add(screenFace);
  counter.position.set(3.95, 0, 10.6);
  counter.rotation.y = -0.08;
  root.add(counter);
}

function createPlanter(root, { x, z, scale = 1, mats }) {
  const planter = unit(new THREE.Group(), 'TERRAZA · macetero urbano', { collider: true });
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

function addBranding(root, mats) {
  const mainSign = unit(new THREE.Group(), 'TERRAZA · cartel FOURTWENTY');
  const frame = roundedBox(4.7, 1.28, 0.13, mats.steel, 0.09, 3);
  mainSign.add(frame);
  const face = new THREE.Mesh(
    new THREE.PlaneGeometry(4.46, 1.06),
    new THREE.MeshBasicMaterial({ map: signTexture('FOURTWENTY', 'BURELA ROOFTOP / 2026') }),
  );
  face.position.z = 0.071;
  mainSign.add(face);
  mainSign.position.set(4.12, 3.03, 14.055);
  root.add(mainSign);

  const poster = unit(new THREE.Group(), 'TERRAZA · poster de campaña');
  const posterFrame = roundedBox(1.82, 2.35, 0.11, mats.steel, 0.06, 2);
  poster.add(posterFrame);
  const posterFace = new THREE.Mesh(
    new THREE.PlaneGeometry(1.66, 2.18),
    new THREE.MeshBasicMaterial({ map: saleTexture() }),
  );
  posterFace.position.z = 0.061;
  poster.add(posterFace);
  poster.position.set(-5.82, 1.6, 2.1);
  poster.rotation.y = Math.PI / 2;
  root.add(poster);
}

function addLights(scene, shadows, mats) {
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

  const signGlow = new THREE.PointLight(0xe6ae4d, 1.8, 5.5, 2);
  signGlow.position.set(0, 2.8, 12.2);
  scene.add(signGlow);

  scene.userData.terraceLightMaterial = mats.light;
}

export function buildTerracePs3Trial(scene, {
  environmentConfig,
  shadows = true,
} = {}) {
  const root = new THREE.Group();
  root.name = 'TERRAZA PS3 · FOURTWENTY ROOFTOP';
  const mats = buildMaterials();

  addEditableHdriSphere(root, scene, environmentConfig);
  addDistantSkyline(root);

  const floor = roundedBox(
    TERRACE_PS3_PROFILE.width,
    0.32,
    TERRACE_PS3_PROFILE.depth,
    mats.concrete,
    0.34,
    4,
  );
  floor.position.set(0, -0.16, TERRACE_PS3_PROFILE.centerZ);
  floor.name = 'TERRAZA · piso PBR de hormigon';
  floor.receiveShadow = true;
  root.add(floor);

  const floorInset = roundedBox(11.7, 0.04, 13.9, mats.concreteDark, 0.3, 3);
  floorInset.position.set(0, 0.012, 4.15);
  floorInset.name = 'TERRAZA · alfombra mineral central';
  floorInset.receiveShadow = true;
  root.add(floorInset);

  addPerimeter(root, mats);
  addBackCore(root, mats);
  addCanopy(root, mats);
  addCeilingServices(root, mats);
  addBranding(root, mats);
  createCentralPlinth(root, mats);
  createRetailRail(root, { x: -2.65, z: 0.25, rotation: 0.08, mats, name: 'TERRAZA · perchero izquierdo' });
  createRetailRail(root, { x: 2.85, z: 6.65, rotation: -0.12, mats, name: 'TERRAZA · perchero derecho' });
  createWallDisplay(root, mats);
  createFittingPod(root, mats);
  createCounter(root, mats);
  createMannequin(root, { x: -1.1, z: 3.25, rotation: -0.2, mats, outfit: 'green' });
  createMannequin(root, { x: 1.05, z: 3.25, rotation: 0.2, mats, outfit: 'cream' });
  createPlanter(root, { x: -5.72, z: -3.85, scale: 0.9, mats });
  createPlanter(root, { x: 5.72, z: -3.85, scale: 0.9, mats });

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
  addLights(scene, shadows, mats);
  return { root, colliders: [] };
}
