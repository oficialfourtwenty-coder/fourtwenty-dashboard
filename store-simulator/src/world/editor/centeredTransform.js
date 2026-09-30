import * as THREE from 'three';

// Muchos modelos de Burela tienen la geometría lejos de su origen. El mango
// vive en un ayudante separado: nunca se cambia la geometría, el padre ni los
// índices con los que se identifican las piezas en los layouts guardados.
export function createCenteredTransform() {
  const space = new THREE.Group();
  space.name = 'Editor · espacio del objeto seleccionado';
  space.userData.editorHelper = true;
  space.matrixAutoUpdate = false;
  const handle = new THREE.Object3D();
  handle.name = 'Editor · centro de la selección';
  handle.userData.editorHelper = true;
  space.add(handle);

  const bounds = new THREE.Box3();
  const center = new THREE.Vector3();
  const localCenter = new THREE.Vector3();
  const offset = new THREE.Vector3();
  const inverse = new THREE.Matrix4();
  let target = null;

  function sync() {
    if (!target?.parent || !space.parent) return;
    target.updateWorldMatrix(true, true);
    space.parent.updateWorldMatrix(true, false);
    // Reproduce el espacio del padre sin colgar ayudantes dentro del modelo.
    // Así las escalas no uniformes de los padres no se descomponen ni pierden.
    inverse.copy(space.parent.matrixWorld).invert();
    space.matrix.multiplyMatrices(inverse, target.parent.matrixWorld);
    bounds.setFromObject(target);
    if (bounds.isEmpty()) target.getWorldPosition(center);
    else bounds.getCenter(center);
    localCenter.copy(center);
    target.worldToLocal(localCenter);
    handle.position.copy(center);
    target.parent.worldToLocal(handle.position);
    handle.quaternion.copy(target.quaternion);
    handle.scale.copy(target.scale);
    space.updateMatrixWorld(true);
  }

  function apply() {
    if (!target) return;
    target.quaternion.copy(handle.quaternion);
    target.scale.copy(handle.scale);
    // T(pivote) R S T(-centro): rotar y escalar conserva el centro visual.
    offset.copy(localCenter).multiply(target.scale).applyQuaternion(target.quaternion);
    target.position.copy(handle.position).sub(offset);
    target.updateWorldMatrix(true, true);
  }

  return {
    space,
    handle,
    attach(object) { target = object; sync(); },
    detach() { target = null; },
    sync,
    apply,
  };
}
