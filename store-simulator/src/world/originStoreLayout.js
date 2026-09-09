import * as THREE from 'three';
import displayUrl from '../assets/origen/origen-display-3-v1.glb?url';
import centralIslandUrl from '../assets/origen/origen-central-island-v1.glb?url';
import backRailUrl from '../assets/origen/origen-barral-pared-3-hoodies.glb?url';
import { registerEditableObject } from './editor/editableRegistry.js';
import { gltfLoader } from './gltfLoaders.js';

const ORIGEN_ID = 1;

function configureModel(model) {
  model.traverse((object) => {
    if (!object.isMesh) return;
    object.castShadow = true;
    object.receiveShadow = true;
  });
}

function editableUnit(root, {
  id,
  name,
  position,
  rotationY = 0,
  scale = 1,
  collider = false,
}) {
  const group = new THREE.Group();
  group.name = name;
  group.position.fromArray(position);
  group.rotation.y = rotationY;
  group.scale.setScalar(scale);
  group.userData.editorUnit = true;
  group.userData.editorSelectExisting = true;
  if (collider) group.userData.destinationCollider = true;
  root.add(group);

  registerEditableObject({
    id: `destino-${ORIGEN_ID}:origen-${id}`,
    name,
    type: 'destino-1',
    object3D: group,
    manageShadows: false,
    collidable: collider,
  }, { silent: true });
  return group;
}

function addWall(root, material, {
  id,
  name,
  size,
  position,
}) {
  const group = editableUnit(root, {
    id,
    name,
    position,
    collider: true,
  });
  const wall = new THREE.Mesh(new THREE.BoxGeometry(...size), material);
  wall.name = `${name} · superficie`;
  wall.castShadow = true;
  wall.receiveShadow = true;
  group.add(wall);
}

function loadModelInto(group, url) {
  gltfLoader().load(
    url,
    (gltf) => {
      if (!group.parent) return;
      configureModel(gltf.scene);
      group.add(gltf.scene);
    },
    undefined,
    (error) => console.warn(`No se pudo cargar ${group.name}.`, error),
  );
}

function addSideDisplays(root) {
  const placements = [
    { id: 'display-izquierdo-1', name: 'ORIGEN · exhibidor izquierdo 1', position: [-5.15, 0, -0.85], rotationY: Math.PI / 2, scale: 1.1 },
    { id: 'display-izquierdo-2', name: 'ORIGEN · exhibidor izquierdo 2', position: [-5.15, 0, 1.75], rotationY: Math.PI / 2, scale: 1.1 },
    { id: 'display-derecho-1', name: 'ORIGEN · exhibidor derecho 1', position: [5.15, 0, -0.85], rotationY: -Math.PI / 2, scale: 1.1 },
    { id: 'display-derecho-2', name: 'ORIGEN · exhibidor derecho 2', position: [5.15, 0, 1.75], rotationY: -Math.PI / 2, scale: 1.1 },
  ];

  gltfLoader().load(
    displayUrl,
    (gltf) => {
      if (!root.parent) return;
      for (const placement of placements) {
        const group = editableUnit(root, { ...placement, collider: true });
        const model = gltf.scene.clone(true);
        configureModel(model);
        group.add(model);
      }
    },
    undefined,
    (error) => console.warn('No se pudieron cargar los exhibidores de ORIGEN.', error),
  );
}

export function addOriginStoreLayout(root) {
  const plaster = new THREE.MeshStandardMaterial({
    color: 0xcbbdac,
    roughness: 0.92,
    metalness: 0,
  });

  addWall(root, plaster, {
    id: 'pared-izquierda',
    name: 'ORIGEN · pared izquierda',
    size: [0.18, 3.7, 12.8],
    position: [-5.72, 1.85, 2.45],
  });
  addWall(root, plaster, {
    id: 'pared-derecha',
    name: 'ORIGEN · pared derecha',
    size: [0.18, 3.7, 12.8],
    position: [5.72, 1.85, 2.45],
  });
  addWall(root, plaster, {
    id: 'pared-fondo',
    name: 'ORIGEN · pared del fondo',
    size: [11.44, 3.7, 0.18],
    position: [0, 1.85, -3.95],
  });

  addSideDisplays(root);

  const island = editableUnit(root, {
    id: 'isla-central',
    name: 'ORIGEN · isla central con cannabis',
    position: [0, 0, 3.35],
    scale: 1.28,
    collider: true,
  });
  loadModelInto(island, centralIslandUrl);

  const rail = editableUnit(root, {
    id: 'barral-fondo',
    name: 'ORIGEN · barral del fondo para 3 hoodies',
    position: [0, 2.18, -3.79],
    rotationY: 0,
    collider: false,
  });
  loadModelInto(rail, backRailUrl);
}
