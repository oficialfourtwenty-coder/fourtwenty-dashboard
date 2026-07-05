import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const loader = new GLTFLoader();

const TEST_FURNITURE = {
  file: '/assets/models/furniture/IA7Pbl7bauApRPBmpMDWo.glb',
  position: { x: 2, y: 0, z: -2 },
  rotation: { x: 0, y: Math.PI / 2, z: 0 },
  scale: { x: 1, y: 1, z: 1 },
};

function mergeTransform(overrides = {}) {
  return {
    ...TEST_FURNITURE,
    ...overrides,
    position: { ...TEST_FURNITURE.position, ...overrides.position },
    rotation: { ...TEST_FURNITURE.rotation, ...overrides.rotation },
    scale: { ...TEST_FURNITURE.scale, ...overrides.scale },
  };
}

export function addFurniture(scene, overrides = {}) {
  const config = mergeTransform(overrides);

  loader.load(
    config.file,
    (gltf) => {
      // Test FurniMesh furniture asset — removable/provisional.
      const model = gltf.scene;
      model.position.set(config.position.x, config.position.y, config.position.z);
      model.rotation.set(config.rotation.x, config.rotation.y, config.rotation.z);
      model.scale.set(config.scale.x, config.scale.y, config.scale.z);
      model.traverse((node) => {
        if (node.isMesh) {
          node.castShadow = true;
          node.receiveShadow = true;
        }
      });
      scene.add(model);
    },
    undefined,
    (error) => {
      console.warn(`No se pudo cargar el mueble FurniMesh "${config.file}". La escena sigue funcionando.`, error);
    },
  );
}
