import * as THREE from 'three';
import { getEditableObjects, isEditableEffectivelyVisible } from '../world/editor/editableRegistry.js';
import { createTwentyTimeReader } from '../ui/twentyTimeReader.js';

const TWENTY_TIME_MODEL = 'assets/furniture/b54-ftt-lowpoly-simulator.glb';
const ANCHOR_NAMES = [
  'B54_M07_CentralMag_1_2',
  'B54_M06_FOURTWENTY_TIME',
];
const READABLE_NODE = /^B54_M0[67]_/;
const INTERACTION_DISTANCE = 4.75;

function isInScene(object, scene) {
  let current = object;
  while (current) {
    if (current === scene) return true;
    current = current.parent;
  }
  return false;
}

function isEffectivelyVisible(object) {
  let current = object;
  while (current) {
    if (!current.visible) return false;
    current = current.parent;
  }
  return true;
}

function findAnchor(root) {
  for (const name of ANCHOR_NAMES) {
    const anchor = root.getObjectByName(name);
    if (anchor) return anchor;
  }
  return root;
}

export function initTwentyTimeInteract({
  getScene,
  isBlocked = () => false,
  onOpenChange = () => {},
} = {}) {
  const reader = createTwentyTimeReader({ onOpenChange });
  const anchorPosition = new THREE.Vector3();
  let targets = [];
  let registryDirty = true;
  let cachedScene = null;

  function markDirty() {
    registryDirty = true;
  }
  window.addEventListener('fourtwenty:editable-registry-change', markDirty);

  function refreshTargets() {
    const scene = getScene?.();
    if (scene !== cachedScene) {
      cachedScene = scene;
      registryDirty = true;
    }
    if (!registryDirty) return targets;
    registryDirty = false;
    targets = getEditableObjects()
      .filter((entry) => entry.model === TWENTY_TIME_MODEL && entry.object3D && isInScene(entry.object3D, scene))
      .map((entry) => {
        const readableMeshes = [];
        entry.object3D.traverse((object) => {
          if (object.isMesh && READABLE_NODE.test(object.name)) readableMeshes.push(object);
        });
        return {
          entry,
          anchor: findAnchor(entry.object3D),
          readableMeshes,
        };
      });
    return targets;
  }

  function nearestTarget(playerPosition) {
    let nearest = null;
    for (const target of refreshTargets()) {
      const { entry, anchor } = target;
      if (!isEditableEffectivelyVisible(entry.id) || !isEffectivelyVisible(anchor)) continue;
      entry.object3D.updateWorldMatrix(true, true);
      anchor.getWorldPosition(anchorPosition);
      const distance = Math.hypot(
        anchorPosition.x - playerPosition.x,
        anchorPosition.z - playerPosition.z,
      );
      if (distance > INTERACTION_DISTANCE || (nearest && distance >= nearest.distance)) continue;
      nearest = { ...target, distance };
    }
    return nearest;
  }

  function canInteract(playerPosition) {
    if (reader.isOpen() || isBlocked()) return false;
    return Boolean(nearestTarget(playerPosition));
  }

  function interact(playerPosition) {
    if (!canInteract(playerPosition)) return false;
    return reader.show();
  }

  function hitTarget(raycaster, playerPosition) {
    if (reader.isOpen() || isBlocked()) return null;
    const target = nearestTarget(playerPosition);
    if (!target) return null;
    const meshes = target.readableMeshes.filter(isEffectivelyVisible);
    return meshes.length && raycaster.intersectObjects(meshes, false)[0] ? target : null;
  }

  function interactFromRay(raycaster, playerPosition) {
    if (!hitTarget(raycaster, playerPosition)) return false;
    return reader.show();
  }

  function destroy() {
    window.removeEventListener('fourtwenty:editable-registry-change', markDirty);
    reader.hide();
  }

  return {
    canInteract,
    interact,
    interactFromRay,
    isRayHit: (raycaster, playerPosition) => Boolean(hitTarget(raycaster, playerPosition)),
    isOpen: reader.isOpen,
    hide: reader.hide,
    next: reader.next,
    previous: reader.previous,
    getPage: reader.getPage,
    getNearestTarget: nearestTarget,
    destroy,
  };
}
