import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { registerEditableObject, unregisterEditableObject } from './editor/editableRegistry.js';
import { loadInitialLayout } from './editor/layoutStore.js';
import { normalizeGLTFHeight } from './gltfUtils.js';

const loader = new GLTFLoader();
const modelCache = new Map();

function vec3(value, fallback) {
  return Array.isArray(value) && value.length >= 3 ? value.slice(0, 3).map(Number) : fallback.slice();
}

function loadModel(path) {
  if (!modelCache.has(path)) {
    modelCache.set(path, new Promise((resolve, reject) => {
      loader.load(path, resolve, undefined, reject);
    }));
  }
  return modelCache.get(path);
}

function meshStats(root) {
  let meshes = 0;
  let triangles = 0;
  root.traverse((child) => {
    if (!child.isMesh) return;
    meshes++;
    const geometry = child.geometry;
    if (geometry?.index) triangles += geometry.index.count / 3;
    else if (geometry?.attributes?.position) triangles += geometry.attributes.position.count / 3;
  });
  return { meshes, triangles: Math.round(triangles) };
}

function applyLayoutToObject(object, item) {
  const position = vec3(item.position, [0, 0, 0]);
  const rotation = vec3(item.rotation, [0, 0, 0]);
  const scale = vec3(item.scale, [1, 1, 1]);
  object.position.fromArray(position);
  object.rotation.set(rotation[0], rotation[1], rotation[2]);
  object.scale.fromArray(scale);
  object.visible = item.visible !== false;
}

function applyShadows(object, item) {
  const castShadow = item.castShadow !== false;
  const receiveShadow = item.receiveShadow !== false;
  object.traverse((child) => {
    if (child.isMesh) {
      child.castShadow = castShadow;
      child.receiveShadow = receiveShadow;
    }
  });
}

function buildFurnitureRoot(gltf, item) {
  const model = gltf.scene.clone(true);
  if (!Number.isFinite(item.height)) return model;

  const root = new THREE.Group();
  normalizeGLTFHeight(model, item.height);
  root.add(model);
  return root;
}

export async function addFurnitureItem(scene, item) {
  if (!item?.id || !item.model) {
    console.warn('addFurniture: item invalido, faltan id/model.', item);
    return null;
  }

  unregisterEditableObject(item.id);

  try {
    const gltf = await loadModel(item.model);
    // Test FurniMesh furniture asset — removable/provisional.
    const object = buildFurnitureRoot(gltf, item);
    object.name = item.name ?? item.id;
    applyLayoutToObject(object, item);
    applyShadows(object, item);
    object.updateMatrixWorld(true);
    scene.add(object);

    const stats = meshStats(object);
    if (stats.triangles > 200000) {
      console.warn(`Mueble GLB pesado "${item.id}": ${stats.meshes} mesh(es), ~${stats.triangles} triangulos. Conviene optimizar antes de sumar muchos.`);
    }

    registerEditableObject({
      ...item,
      object3D: object,
      position: vec3(item.position, [0, 0, 0]),
      rotation: vec3(item.rotation, [0, 0, 0]),
      scale: vec3(item.scale, [1, 1, 1]),
      height: Number.isFinite(item.height) ? item.height : null,
      castShadow: item.castShadow !== false,
      receiveShadow: item.receiveShadow !== false,
      locked: item.locked === true,
      visible: item.visible !== false,
    });
    return object;
  } catch (error) {
    console.warn(`No se pudo cargar el mueble "${item.model}" (${item.id}). La escena sigue funcionando.`, error);
    return null;
  }
}

export async function addFurniture(scene) {
  const layout = await loadInitialLayout();
  const furniture = layout.filter((item) => item.type === 'furniture');
  if (!furniture.length) {
    console.warn('addFurniture: layout sin muebles editables.');
    return [];
  }

  const results = await Promise.allSettled(furniture.map((item) => addFurnitureItem(scene, item)));
  return results
    .filter((result) => result.status === 'fulfilled' && result.value)
    .map((result) => result.value);
}
