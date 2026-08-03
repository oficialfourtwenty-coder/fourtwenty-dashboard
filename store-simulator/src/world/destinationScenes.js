import * as THREE from 'three';
import { COLLECTIONS } from './collections.js';
import { ElevatorController } from './elevator.js';
import { createOriginArcade } from './originArcade.js';
import { addBincoShopLights, buildBincoShopSet, buildBincoShopShell } from './bincoShopTrial.js';
import { environmentForDestination } from './floorEnvironmentCatalog.js';
import { buildHoopArena } from './hoopArena.js';
import { unbindProductVisuals } from './productVisuals.js';
import { buildTerracePs3Trial, TERRACE_PS3_PROFILE } from './terracePs3Trial.js';

const ROOM_W = 12;
const BASE_ROOM_D = 9;
const ROOM_D = BASE_ROOM_D * 2;
const ROOM_H = 3.4;
const ROOM_MIN_Z = -BASE_ROOM_D / 2;
const ROOM_MAX_Z = ROOM_MIN_Z + ROOM_D;

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
  const isTerracePs3Trial = destination.id === 5;
  const scene = new THREE.Scene();
  scene.name = `Escena unica · ${destination.hudLabel}`;
  scene.userData.destinationId = destination.id;
  scene.userData.loadedSourceFloor = destination.sourceFloor;
  scene.userData.floorSize = isTerracePs3Trial
    ? { width: TERRACE_PS3_PROFILE.width, depth: TERRACE_PS3_PROFILE.depth, areaScale: 2.6 }
    : { width: ROOM_W, depth: ROOM_D, areaScale: 2 };
  scene.userData.visualProfile = isTerracePs3Trial ? 'terrace-ps3-trial' : 'binco-shop-base';
  scene.userData.disposed = false;
  scene.background = new THREE.Color(isTerracePs3Trial ? 0x586a72 : 0x777d7b);
  scene.fog = new THREE.Fog(isTerracePs3Trial ? 0x586a72 : 0x777d7b, isTerracePs3Trial ? 34 : 20, isTerracePs3Trial ? 84 : 46);
  scene.environment = environment;
  scene.environmentIntensity = isTerracePs3Trial ? 0.5 : 0.38;

  const environmentConfig = environmentForDestination(destination.id);
  scene.userData.environmentFile = environmentConfig.filename;
  let colliders;
  if (isTerracePs3Trial) {
    colliders = buildTerracePs3Trial(scene, { environmentConfig, shadows }).colliders;
  } else {
    colliders = buildBincoShopShell(scene, { environmentConfig });
    addBincoShopLights(scene, shadows);
  }

  const collection = COLLECTIONS.find((item) => item.piso === destination.sourceFloor);
  if (!isTerracePs3Trial) {
    colliders.push(...buildBincoShopSet(scene, collection, {
      productFloor: destination.sourceFloor ?? 3,
      sectionLabel: destination.hudLabel,
    }));
  }

  const elevator = new ElevatorController(scene, {
    id: `elevator-destination-${destination.id}`,
    name: `Ascensor · ${destination.hudLabel}`,
    position: isTerracePs3Trial
      ? TERRACE_PS3_PROFILE.elevatorPosition
      : [0, 0, ROOM_MAX_Z - 1.45],
    rotationY: Math.PI,
    onEnter: onElevatorEnter,
  });
  const minigameArcade = createOriginArcade({
    onInteract: onArcadeInteract,
    config: isTerracePs3Trial ? TERRACE_PS3_PROFILE.arcadeConfig : undefined,
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
    bounds: isTerracePs3Trial
      ? TERRACE_PS3_PROFILE.bounds
      : { minX: -5.85, maxX: 5.85, minZ: ROOM_MIN_Z + 0.15, maxZ: ROOM_MAX_Z - 0.15 },
    ceiling: isTerracePs3Trial ? TERRACE_PS3_PROFILE.height : ROOM_H,
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
