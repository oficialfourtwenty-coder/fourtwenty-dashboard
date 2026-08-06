import * as THREE from 'three';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { registerEditableObject, unregisterEditableObject } from './editor/editableRegistry.js';
import { loadInitialLayout, saveLocalLayout } from './editor/layoutStore.js';
import { BUNDLED_FURNITURE, MODEL_CATALOG_MIGRATION_KEY } from './editor/modelCatalog.js';
import { normalizeGLTFHeight } from './gltfUtils.js';
import { bindRackProducts } from './rackProducts.js';

const dracoLoader = new DRACOLoader();
dracoLoader.setDecoderPath('/assets/draco/');

const loader = new GLTFLoader();
loader.setDRACOLoader(dracoLoader);
const modelCache = new Map();
const BACKDROP_MODELS_WITHOUT_SHADOWS = [
  'apartment-building.glb',
  'tram-station.glb',
  'city-map-free.glb',
];

function shouldCastShadows(item) {
  return item.castShadow !== false
    && !BACKDROP_MODELS_WITHOUT_SHADOWS.some((filename) => item.model?.endsWith(filename));
}

function cloneLayoutItem(item) {
  return {
    ...item,
    position: [...item.position],
    rotation: [...item.rotation],
    scale: [...item.scale],
  };
}

function migrateBundledFurniture(layout) {
  try {
    if (localStorage.getItem(MODEL_CATALOG_MIGRATION_KEY) === '1') return layout;
  } catch {
    // La carga sigue con el layout disponible aunque no haya persistencia.
  }

  let changed = false;
  const bundledByModel = new Map(BUNDLED_FURNITURE.map((item) => [item.model, item]));
  const next = layout.map((item) => {
    const bundled = bundledByModel.get(item.model);
    if (!bundled || item.collidable === false) return item;
    changed = true;
    return { ...item, collidable: false };
  });

  for (const bundled of BUNDLED_FURNITURE) {
    if (next.some((item) => item.model === bundled.model)) continue;
    next.push(cloneLayoutItem(bundled));
    changed = true;
  }

  if (changed) saveLocalLayout(next);
  try { localStorage.setItem(MODEL_CATALOG_MIGRATION_KEY, '1'); } catch { /* sin persistencia */ }
  return next;
}

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
  const castShadow = shouldCastShadows(item);
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
    // Si el mueble es un perchero, sus remeras quedan clickeables como
    // producto. Para cualquier otro modelo no hace nada.
    bindRackProducts(object, item.model);
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
      castShadow: shouldCastShadows(item),
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
  const layout = migrateBundledFurniture(await loadInitialLayout());
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
