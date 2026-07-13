import * as THREE from 'three';
import { buildGallery } from './gallery.js';
import { buildRetail } from './retail.js';
import { COLLECTIONS } from './collections.js';
import { box } from './gfxUtils.js';
import { whiteFloor, whitePlaster, lightCeiling, windowDaylight } from './textures.js';
import { ElevatorController } from './elevator.js';

const ROOM_W = 12;
const BASE_ROOM_D = 9;
const ROOM_D = BASE_ROOM_D * 2;
const ROOM_H = 3.4;
const WALL_T = 0.3;
const ROOM_HALF_W = ROOM_W / 2;
const ROOM_MIN_Z = -BASE_ROOM_D / 2;
const ROOM_MAX_Z = ROOM_MIN_Z + ROOM_D;
const ROOM_CENTER_Z = (ROOM_MIN_Z + ROOM_MAX_Z) / 2;

export const ELEVATOR_DESTINATIONS = Object.freeze([
  { id: 0, label: 'Calle Burela', hudLabel: 'CALLE BURELA', kind: 'street' },
  { id: 1, label: 'Seccion ORIGEN', hudLabel: 'ORIGEN', kind: 'section', sourceFloor: 2 },
  { id: 2, label: 'Seccion HOOP SEASSON', hudLabel: 'HOOP SEASON', kind: 'section', sourceFloor: 3 },
  { id: 3, label: 'Seccion CULTURA', hudLabel: 'CULTURA', kind: 'section', sourceFloor: 5 },
  { id: 4, label: 'Seccion BOB', hudLabel: 'BOB', kind: 'section', sourceFloor: 4 },
  { id: 5, label: 'Terraza', hudLabel: 'TERRAZA', kind: 'terrace' },
]);

export function getDestination(id) {
  return ELEVATOR_DESTINATIONS.find((destination) => destination.id === Number(id)) ?? null;
}

function addRoomShell(scene) {
  const group = new THREE.Group();
  group.name = 'Escena aislada · arquitectura de una seccion';
  const floorMaterial = new THREE.MeshPhysicalMaterial({
    map: whiteFloor(ROOM_W / 2, ROOM_D / 2),
    color: 0xf2f1ed,
    roughness: 0.42,
    metalness: 0.04,
  });
  const wallMaterial = new THREE.MeshStandardMaterial({ map: whitePlaster(18, 6), roughness: 0.96 });
  const sideMaterial = new THREE.MeshStandardMaterial({ map: whitePlaster(24, 6), roughness: 0.96 });
  const ceilingMaterial = new THREE.MeshStandardMaterial({ map: lightCeiling(3, 4), roughness: 1 });
  const windowMaterial = new THREE.MeshBasicMaterial({ map: windowDaylight() });

  group.add(box(ROOM_W, 0.3, ROOM_D, 0, -0.15, ROOM_CENTER_Z, floorMaterial));
  group.add(box(ROOM_W, 0.18, ROOM_D, 0, ROOM_H + 0.09, ROOM_CENTER_Z, ceilingMaterial));
  group.add(box(ROOM_W + WALL_T * 2, ROOM_H, WALL_T, 0, ROOM_H / 2, ROOM_MAX_Z + WALL_T / 2, wallMaterial));
  group.add(box(ROOM_W + WALL_T * 2, ROOM_H, WALL_T, 0, ROOM_H / 2, ROOM_MIN_Z - WALL_T / 2, wallMaterial));
  group.add(box(WALL_T, ROOM_H, ROOM_D, -ROOM_HALF_W - WALL_T / 2, ROOM_H / 2, ROOM_CENTER_Z, sideMaterial));
  group.add(box(WALL_T, ROOM_H, ROOM_D, ROOM_HALF_W + WALL_T / 2, ROOM_H / 2, ROOM_CENTER_Z, sideMaterial));

  for (const x of [-3.5, 0, 3.5]) {
    const window = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 1.25), windowMaterial);
    window.name = 'Seccion · ventana de luz';
    window.position.set(x, 1.9, ROOM_MIN_Z + 0.02);
    group.add(window);
  }

  group.traverse((object) => {
    if (!object.isMesh || object.material.isMeshBasicMaterial) return;
    object.castShadow = true;
    object.receiveShadow = true;
  });
  scene.add(group);

  return [
    { minX: -ROOM_HALF_W - WALL_T, maxX: ROOM_HALF_W + WALL_T, minY: 0, maxY: ROOM_H, minZ: ROOM_MAX_Z - 0.15, maxZ: ROOM_MAX_Z + WALL_T },
    { minX: -ROOM_HALF_W - WALL_T, maxX: ROOM_HALF_W + WALL_T, minY: 0, maxY: ROOM_H, minZ: ROOM_MIN_Z - WALL_T, maxZ: ROOM_MIN_Z + 0.15 },
    { minX: -ROOM_HALF_W - WALL_T, maxX: -ROOM_HALF_W + 0.15, minY: 0, maxY: ROOM_H, minZ: ROOM_MIN_Z, maxZ: ROOM_MAX_Z },
    { minX: ROOM_HALF_W - 0.15, maxX: ROOM_HALF_W + WALL_T, minY: 0, maxY: ROOM_H, minZ: ROOM_MIN_Z, maxZ: ROOM_MAX_Z },
  ];
}

function addSectionLights(scene, shadows) {
  scene.add(new THREE.HemisphereLight(0xfff6e8, 0x585854, 0.62));
  const daylight = new THREE.DirectionalLight(0xeaf4ff, 0.75);
  daylight.position.set(-6, 9, -7);
  scene.add(daylight);
  const lightPositions = [[-3, 0.4], [3, 0.4], [-3, 8.4], [3, 8.4]];
  for (const [index, [x, z]] of lightPositions.entries()) {
    const spot = new THREE.SpotLight(0xffc58f, 13, 13, 1.0, 0.65, 1.6);
    spot.position.set(x, ROOM_H - 0.22, z);
    spot.target.position.set(x * 0.5, 0, z - 0.9);
    if (shadows && index === 0) {
      spot.castShadow = true;
      spot.shadow.mapSize.set(1024, 1024);
      spot.shadow.camera.near = 0.4;
      spot.shadow.camera.far = 11;
      spot.shadow.bias = -0.0004;
    }
    scene.add(spot, spot.target);
  }
}

function buildSectionScene(destination, { environment, shadows, onElevatorEnter }) {
  const scene = new THREE.Scene();
  scene.name = `Escena unica · ${destination.hudLabel}`;
  scene.userData.destinationId = destination.id;
  scene.userData.loadedSourceFloor = destination.sourceFloor;
  scene.userData.floorSize = { width: ROOM_W, depth: ROOM_D, areaScale: 2 };
  scene.background = new THREE.Color(0xcfd2d6);
  scene.fog = new THREE.Fog(0xcfd2d6, 18, 54);
  scene.environment = environment;
  scene.environmentIntensity = 0.22;

  const colliders = addRoomShell(scene);
  addSectionLights(scene, shadows);
  const collection = COLLECTIONS.find((item) => item.piso === destination.sourceFloor);
  if (collection) colliders.push(...buildGallery(scene, collection, { floorY: 0 }));
  colliders.push(...buildRetail(scene, { selectedFloor: destination.sourceFloor, floorY: 0 }));

  const elevator = new ElevatorController(scene, {
    id: `elevator-destination-${destination.id}`,
    name: `Ascensor · ${destination.hudLabel}`,
    position: [0, 0, ROOM_MAX_Z - 1.45],
    rotationY: Math.PI,
    onEnter: onElevatorEnter,
  });

  return {
    destination,
    scene,
    elevator,
    colliders,
    bounds: { minX: -5.85, maxX: 5.85, minZ: ROOM_MIN_Z + 0.15, maxZ: ROOM_MAX_Z - 0.15 },
    ceiling: ROOM_H,
    sampleGround: () => 0,
  };
}

function buildTerraceScene(destination, { environment, shadows, onElevatorEnter }) {
  const scene = new THREE.Scene();
  scene.name = 'Escena unica · Terraza';
  scene.userData.destinationId = destination.id;
  scene.background = new THREE.Color(0x8db8de);
  scene.fog = new THREE.Fog(0xaac9e3, 28, 85);
  scene.environment = environment;
  scene.environmentIntensity = 0.3;

  const roofW = 18;
  const baseRoofD = 14;
  const roofD = baseRoofD * 2;
  const halfW = roofW / 2;
  const roofMinZ = -baseRoofD / 2;
  const roofMaxZ = roofMinZ + roofD;
  const roofCenterZ = (roofMinZ + roofMaxZ) / 2;
  scene.userData.floorSize = { width: roofW, depth: roofD, areaScale: 2 };
  const roofMaterial = new THREE.MeshStandardMaterial({ color: 0xb9bbb8, roughness: 0.92 });
  const parapetMaterial = new THREE.MeshStandardMaterial({ color: 0xd5d5d0, roughness: 0.88 });
  const roof = box(roofW, 0.35, roofD, 0, -0.175, roofCenterZ, roofMaterial);
  roof.name = 'Terraza · losa vacia';
  roof.receiveShadow = true;
  scene.add(roof);

  const colliders = [];
  const parapets = [
    box(roofW, 1.05, 0.28, 0, 0.525, roofMaxZ, parapetMaterial),
    box(roofW, 1.05, 0.28, 0, 0.525, roofMinZ, parapetMaterial),
    box(0.28, 1.05, roofD, -halfW, 0.525, roofCenterZ, parapetMaterial),
    box(0.28, 1.05, roofD, halfW, 0.525, roofCenterZ, parapetMaterial),
  ];
  for (const parapet of parapets) {
    parapet.name = 'Terraza · parapeto';
    parapet.castShadow = true;
    parapet.receiveShadow = true;
    scene.add(parapet);
  }
  colliders.push(
    { minX: -halfW, maxX: halfW, minY: 0, maxY: 1.1, minZ: roofMaxZ - 0.2, maxZ: roofMaxZ + 0.2 },
    { minX: -halfW, maxX: halfW, minY: 0, maxY: 1.1, minZ: roofMinZ - 0.2, maxZ: roofMinZ + 0.2 },
    { minX: -halfW - 0.2, maxX: -halfW + 0.2, minY: 0, maxY: 1.1, minZ: roofMinZ, maxZ: roofMaxZ },
    { minX: halfW - 0.2, maxX: halfW + 0.2, minY: 0, maxY: 1.1, minZ: roofMinZ, maxZ: roofMaxZ },
  );

  scene.add(new THREE.HemisphereLight(0xdff1ff, 0x6f706a, 1.25));
  const sun = new THREE.DirectionalLight(0xfff3dc, 2.2);
  sun.position.set(-12, 22, -9);
  sun.castShadow = shadows;
  if (shadows) sun.shadow.mapSize.set(1024, 1024);
  scene.add(sun);

  const elevator = new ElevatorController(scene, {
    id: 'elevator-destination-5',
    name: 'Ascensor · Terraza',
    position: [0, 0, roofMaxZ - 1.65],
    rotationY: Math.PI,
    onEnter: onElevatorEnter,
  });

  return {
    destination,
    scene,
    elevator,
    colliders,
    bounds: { minX: -8.7, maxX: 8.7, minZ: roofMinZ + 0.3, maxZ: roofMaxZ - 0.3 },
    ceiling: 30,
    sampleGround: () => 0,
  };
}

export function buildDestinationScene(destinationId, options) {
  const destination = getDestination(destinationId);
  if (!destination || destination.kind === 'street') return null;
  if (destination.kind === 'terrace') return buildTerraceScene(destination, options);
  return buildSectionScene(destination, options);
}

export function disposeDestinationScene(record, player) {
  if (!record?.scene) return;
  record.elevator?.cancel();
  record.scene.remove(player.rig, player.shadow);
  record.scene.traverse((object) => {
    if (!object.isMesh) return;
    object.geometry?.dispose?.();
    const materials = Array.isArray(object.material) ? object.material : [object.material];
    for (const material of materials) material?.dispose?.();
  });
  record.scene.clear();
}

export function sceneStats(scene) {
  const productFloors = new Set();
  let objects = 0;
  let meshes = 0;
  scene?.traverse((object) => {
    objects++;
    if (object.isMesh || object.isInstancedMesh) meshes++;
    const piso = object.userData?.productSlot?.piso;
    if (piso !== undefined) productFloors.add(piso);
  });
  return { objects, meshes, productFloors: [...productFloors], floorSize: scene?.userData?.floorSize ?? null };
}
