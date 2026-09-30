import assert from 'node:assert/strict';
import test from 'node:test';
import * as THREE from 'three';
import { createCenteredTransform } from './centeredTransform.js';
import { applyLayout, registerEditableObject, serializeEditableObjects } from './editableRegistry.js';

const close = (a, b) => assert.ok(a.distanceTo(b) < 1e-8, `${a.toArray()} != ${b.toArray()}`);

function fixture() {
  const scene = new THREE.Scene();
  const parent = new THREE.Group();
  parent.position.set(40, 2, -20);
  parent.rotation.set(0.1, 0.7, -0.2);
  parent.scale.set(2, 0.75, 3);
  scene.add(parent);
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(4, 6, 2).translate(80, 3, -55));
  mesh.position.set(8, 1, -9);
  mesh.rotation.set(0.2, 0.4, 0.1);
  mesh.scale.set(1.2, 1.5, 0.8);
  parent.add(mesh);
  const pivot = createCenteredTransform();
  scene.add(pivot.space);
  pivot.attach(mesh);
  return { scene, parent, mesh, pivot };
}

test('el mango cae en el centro de la geometría desplazada sin alterar la jerarquía', () => {
  const { mesh, parent, pivot } = fixture();
  close(pivot.handle.getWorldPosition(new THREE.Vector3()), new THREE.Box3().setFromObject(mesh).getCenter(new THREE.Vector3()));
  assert.equal(mesh.parent, parent);
  assert.equal(parent.children.length, 1);
  const before = mesh.matrixWorld.clone();
  pivot.apply();
  mesh.matrixWorld.elements.forEach((value, i) => assert.ok(Math.abs(value - before.elements[i]) < 1e-8));
});

test('mover desplaza la pieza por la misma distancia que el mango en un padre transformado', () => {
  const { mesh, pivot } = fixture();
  const before = mesh.getWorldPosition(new THREE.Vector3());
  const centerBefore = pivot.handle.getWorldPosition(new THREE.Vector3());
  pivot.handle.position.add(new THREE.Vector3(3, -1, 5));
  const delta = pivot.handle.getWorldPosition(new THREE.Vector3()).sub(centerBefore);
  pivot.apply();
  close(mesh.getWorldPosition(new THREE.Vector3()), before.add(delta));
});

test('rotar y escalar conserva el pivote visual incluso con escala no uniforme del padre', () => {
  const { mesh, pivot } = fixture();
  const center = pivot.handle.getWorldPosition(new THREE.Vector3());
  const localCenter = mesh.worldToLocal(center.clone());
  pivot.handle.rotation.y += Math.PI / 2;
  pivot.handle.scale.multiply(new THREE.Vector3(0.5, 2, 1.3));
  pivot.apply();
  close(mesh.localToWorld(localCenter.clone()), center);
  close(mesh.scale, pivot.handle.scale);
  assert.ok(mesh.quaternion.angleTo(pivot.handle.quaternion) < 1e-8);
});

test('los cambios quedan en el objeto real y sobreviven al guardado y restauración del layout', () => {
  globalThis.window ??= { dispatchEvent() {} };
  const { mesh, pivot } = fixture();
  registerEditableObject({ id: 'test:pieza-burela', object3D: mesh }, { silent: true });
  pivot.handle.position.x += 4;
  pivot.handle.rotation.z -= 0.8;
  pivot.handle.scale.multiplyScalar(1.4);
  pivot.apply();
  const expected = mesh.matrixWorld.clone();
  const layout = JSON.parse(JSON.stringify(serializeEditableObjects()));
  assert.equal(layout.length, 1);
  assert.equal(layout[0].id, 'test:pieza-burela');
  mesh.position.set(0, 0, 0);
  mesh.rotation.set(0, 0, 0);
  mesh.scale.set(1, 1, 1);
  applyLayout(layout);
  mesh.updateWorldMatrix(true, true);
  mesh.matrixWorld.elements.forEach((value, i) => assert.ok(Math.abs(value - expected.elements[i]) < 1e-8));
  pivot.sync();
  close(pivot.handle.getWorldPosition(new THREE.Vector3()), new THREE.Box3().setFromObject(mesh).getCenter(new THREE.Vector3()));
});

test('un objeto sin geometría usa su posición y cambiar selección no modifica la pieza anterior', () => {
  const { scene, mesh, pivot } = fixture();
  const before = mesh.matrixWorld.clone();
  const empty = new THREE.Object3D();
  empty.position.set(3, 4, 5);
  scene.add(empty);
  pivot.attach(empty);
  close(pivot.handle.getWorldPosition(new THREE.Vector3()), new THREE.Vector3(3, 4, 5));
  pivot.handle.position.x += 2;
  pivot.apply();
  close(empty.position, new THREE.Vector3(5, 4, 5));
  assert.deepEqual(mesh.matrixWorld.elements, before.elements);
});
