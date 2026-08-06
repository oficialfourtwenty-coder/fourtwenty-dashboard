import * as THREE from 'three';
import { ElevatorController } from './elevator.js';
import { createOriginArcade } from './originArcade.js';
import { environmentForDestination } from './floorEnvironmentCatalog.js';
import { buildHoopArena } from './hoopArena.js';
import { unbindProductVisuals } from './productVisuals.js';
import { unbindGarmentsFromProducts } from './garmentPrints.js';
import {
  buildPs3FloorScene,
  PS3_FLOOR_PROFILE,
  ps3ThemeForDestination,
} from './terracePs3Trial.js';

export const ELEVATOR_DESTINATIONS = Object.freeze([
  { id: 0, label: 'Calle Burela', hudLabel: 'CALLE BURELA', kind: 'street' },
  { id: 1, label: 'Seccion ORIGEN', hudLabel: 'ORIGEN', kind: 'section', sourceFloor: 2 },
  { id: 2, label: 'Seccion HOOP SEASSON', hudLabel: 'HOOP SEASON', kind: 'section', sourceFloor: 3 },
  { id: 3, label: 'Seccion CULTURA', hudLabel: 'CULTURA', kind: 'section', sourceFloor: 5 },
  { id: 4, label: 'Seccion BOB', hudLabel: 'BOB', kind: 'section', sourceFloor: 4 },
  { id: 5, label: 'Terraza', hudLabel: 'TERRAZA', kind: 'section', sourceFloor: null },
]);

export function getDestination(id) {
  return ELEVATOR_DESTINATIONS.find((destination) => destination.id === Number(id)) ?? null;
}

function buildSectionScene(destination, { environment, shadows, onElevatorEnter, onArcadeInteract }) {
  const theme = ps3ThemeForDestination(destination.id);
  const scene = new THREE.Scene();
  scene.name = `Escena unica · ${destination.hudLabel}`;
  scene.userData.destinationId = destination.id;
  scene.userData.loadedSourceFloor = destination.sourceFloor;
  scene.userData.floorSize = {
    width: PS3_FLOOR_PROFILE.width,
    depth: PS3_FLOOR_PROFILE.depth,
    areaScale: 2.6,
  };
  scene.userData.visualProfile = `ps3-${theme.key}`;
  scene.userData.disposed = false;
  scene.background = new THREE.Color(0x586a72);
  scene.fog = new THREE.Fog(0x586a72, 34, 84);
  scene.environment = environment;
  scene.environmentIntensity = 0.5;

  const environmentConfig = environmentForDestination(destination.id);
  scene.userData.environmentFile = environmentConfig.filename;
  const colliders = buildPs3FloorScene(scene, {
    destinationId: destination.id,
    environmentConfig,
    shadows,
    productFloor: destination.sourceFloor,
  }).colliders;

  const elevator = new ElevatorController(scene, {
    id: `elevator-destination-${destination.id}`,
    name: `Ascensor · ${destination.hudLabel}`,
    position: PS3_FLOOR_PROFILE.elevatorPosition,
    rotationY: Math.PI,
    onEnter: onElevatorEnter,
  });
  const minigameArcade = createOriginArcade({
    onInteract: onArcadeInteract,
    config: PS3_FLOOR_PROFILE.arcadeConfig,
  });
  scene.add(minigameArcade.root);

  // HOOP SEASON queda en el medio de un estadio NBA: se ve por el vidrio del
  // frente. Es decorado procedural, sin colisión — ver hoopArena.js.
  const arena = destination.id === 2 ? buildHoopArena(scene) : null;

  return {
    destination,
    scene,
    elevator,
    minigameArcade,
    arena,
    colliders,
    dynamicColliders: [],
    collidersDirty: true,
    bounds: PS3_FLOOR_PROFILE.bounds,
    ceiling: PS3_FLOOR_PROFILE.height,
    sampleGround: () => 0,
  };
}

export function buildDestinationScene(destinationId, options) {
  const destination = getDestination(destinationId);
  if (!destination || destination.kind === 'street') return null;
  return buildSectionScene(destination, options);
}

export function disposeDestinationScene(record, player) {
  if (!record?.scene) return;
  record.scene.userData.disposed = true;
  record.elevator?.cancel();
  record.arena?.dispose();
  record.scene.remove(player.rig, player.shadow);
  unbindProductVisuals(record.scene);
  // Y soltar las prendas del catalogo: sin esto el Set de garmentPrints las
  // retiene y la escena del piso nunca se libera de memoria.
  unbindGarmentsFromProducts(record.scene);
  const disposedGeometries = new Set();
  const disposedMaterials = new Set();
  const disposedTextures = new Set();
  record.scene.traverse((object) => {
    if (!object.userData?.sharedDestinationLight) object.shadow?.dispose?.();
    if (object.geometry?.dispose && !disposedGeometries.has(object.geometry)) {
      disposedGeometries.add(object.geometry);
      object.geometry.dispose();
    }
    const materials = Array.isArray(object.material) ? object.material : [object.material];
    for (const material of materials) {
      if (!material?.dispose || disposedMaterials.has(material)) continue;
      disposedMaterials.add(material);
      for (const value of Object.values(material)) {
        if (!value?.isTexture || !value.userData?.destinationOwned || disposedTextures.has(value)) continue;
        disposedTextures.add(value);
        value.dispose();
      }
      material.dispose();
    }
  });
  for (const texture of record.scene.userData.disposableEnvironmentTextures ?? []) texture.dispose();
  record.scene.userData.disposableEnvironmentTextures?.clear();
  record.scene.background = null;
  record.scene.environment = null;
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
  return {
    objects,
    meshes,
    productFloors: [...productFloors],
    floorSize: scene?.userData?.floorSize ?? null,
    visualProfile: scene?.userData?.visualProfile ?? null,
    environmentFile: scene?.userData?.environmentFile ?? null,
  };
}
