import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

export const ORIGIN_ARCADE_CONFIG = Object.freeze({
  modelUrl: null,
  position: [-4.75, 0, 4.2],
  rotationY: Math.PI / 2,
  interactionDistance: 2.5,
});

function fallbackCabinet() {
  const root = new THREE.Group();
  const black = new THREE.MeshStandardMaterial({ color: 0x070809, roughness: 0.42, metalness: 0.58 });
  const trim = new THREE.MeshStandardMaterial({ color: 0x24272a, roughness: 0.28, metalness: 0.82 });
  const screenMaterial = new THREE.MeshStandardMaterial({
    color: 0x060b10,
    emissive: 0x101a2c,
    emissiveIntensity: 0.8,
    roughness: 0.18,
  });

  const body = new THREE.Mesh(new THREE.BoxGeometry(0.95, 1.82, 0.76), black);
  body.position.y = 0.91;
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(0.68, 0.58), screenMaterial);
  screen.position.set(0, 1.25, 0.386);
  const deck = new THREE.Mesh(new THREE.BoxGeometry(0.82, 0.18, 0.38), trim);
  deck.position.set(0, 0.86, 0.47);
  deck.rotation.x = -0.2;

  const marquee = new THREE.Mesh(new THREE.BoxGeometry(0.82, 0.22, 0.08), trim);
  marquee.position.set(0, 1.72, 0.42);
  root.add(body, screen, deck, marquee);

  root.traverse((object) => {
    if (!object.isMesh) return;
    object.castShadow = true;
    object.receiveShadow = true;
  });
  return root;
}

export function createOriginArcade({ onInteract, config = ORIGIN_ARCADE_CONFIG } = {}) {
  const root = new THREE.Group();
  let visual = fallbackCabinet();
  root.add(visual);
  root.name = "Arcade · BOB'S MAZE";
  root.position.fromArray(config.position);
  root.rotation.y = config.rotationY;
  root.userData.editorCollider = true;

  const buttonMaterial = new THREE.MeshStandardMaterial({
    color: 0xa20b16,
    emissive: 0x250000,
    emissiveIntensity: 0.45,
    roughness: 0.26,
    metalness: 0.28,
  });
  const button = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.07, 24), buttonMaterial);
  button.name = 'Arcade · boton rojo';
  button.rotation.x = Math.PI / 2;
  button.position.set(0.2, 0.99, 0.69);
  button.userData.originArcadeButton = true;
  button.castShadow = true;
  root.add(button);

  if (config.modelUrl) {
    new GLTFLoader().load(config.modelUrl, (gltf) => {
      root.remove(visual);
      visual = gltf.scene;
      visual.name = 'Arcade · modelo GLB';
      visual.traverse((object) => {
        if (!object.isMesh) return;
        object.castShadow = true;
        object.receiveShadow = true;
      });
      root.add(visual);
    }, undefined, (error) => console.warn('No se pudo cargar el GLB del arcade; se conserva el prototipo.', error));
  }

  const buttonWorld = new THREE.Vector3();
  const colliderBox = new THREE.Box3();
  const maxDistance = config.interactionDistance;

  function canInteract(playerPosition) {
    return button.getWorldPosition(buttonWorld).distanceTo(playerPosition) <= maxDistance;
  }

  function interact(playerPosition) {
    if (!canInteract(playerPosition)) return false;
    onInteract?.();
    return true;
  }

  function interactFromRay(raycaster, playerPosition) {
    if (!canInteract(playerPosition) || !raycaster.intersectObject(button, false)[0]) return false;
    onInteract?.();
    return true;
  }

  function setHighlighted(active) {
    buttonMaterial.emissive.setHex(active ? 0xff1628 : 0x250000);
    buttonMaterial.emissiveIntensity = active ? 2.2 : 0.45;
  }

  function getColliders() {
    root.updateWorldMatrix(true, true);
    colliderBox.setFromObject(visual);
    return [{
      minX: colliderBox.min.x,
      maxX: colliderBox.max.x,
      minY: colliderBox.min.y,
      maxY: colliderBox.max.y,
      minZ: colliderBox.min.z,
      maxZ: colliderBox.max.z,
    }];
  }

  return { root, button, canInteract, interact, interactFromRay, setHighlighted, getColliders };
}
