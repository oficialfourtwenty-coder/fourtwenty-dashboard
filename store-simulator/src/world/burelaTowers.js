import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { applyLayout, registerEditableObject, restoreClones, unregisterEditableObject } from './editor/editableRegistry.js';
import { loadInitialLayout } from './editor/layoutStore.js';
import { normalizeGLTFHeight } from './gltfUtils.js';

const MODEL_URL = '/assets/models/burela/burela-torres.glb';
const loader = new GLTFLoader();

function applyShadows(object) {
  object.traverse((child) => {
    if (child.isMesh) {
      child.castShadow = true;
      child.receiveShadow = true;
    }
  });
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

export function addBurelaTowers(scene) {
  loader.load(
    MODEL_URL,
    (gltf) => {
      unregisterEditableObject('burela-towers');

      const object = gltf.scene;
      object.name = 'Torres Burela 3D';
      normalizeGLTFHeight(object, 34);
      object.position.set(0, 0, -18);
      object.rotation.set(0, 0, 0);
      object.scale.multiplyScalar(1);
      object.userData.editorCollider = false;
      applyShadows(object);
      scene.add(object);

      const stats = meshStats(object);
      if (stats.triangles > 200000) {
        console.warn(`Torres Burela 3D es pesado: ${stats.meshes} mesh(es), ~${stats.triangles} triangulos. Conviene optimizar si baja FPS.`);
      }

      registerEditableObject({
        id: 'burela-towers',
        name: 'Torres Burela 3D',
        type: 'city-model',
        model: MODEL_URL,
        object3D: object,
        manageShadows: false,
      });

      loadInitialLayout().then((layout) => {
        applyLayout(layout);
        restoreClones(layout);
      });
    },
    undefined,
    (error) => {
      console.warn(`No se pudo cargar ${MODEL_URL}. La escena sigue funcionando.`, error);
    },
  );
}
