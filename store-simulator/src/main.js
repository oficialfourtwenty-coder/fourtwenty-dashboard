// FOURTWENTY Store Simulator — Fase 1: local de 3 pisos vacío + BOB.
import * as THREE from 'three';
import { buildBuilding, buildLights, getColliders, SPAWN, floorIndexAt, FLOOR_YS } from './world/building.js';
import { Bob } from './player/bob.js';
import { ThirdPersonCamera } from './core/camera.js';
import { Input } from './core/input.js';
import { Hud } from './ui/hud.js';

const PIXEL_SCALE = 3; // render interno a 1/3 de resolución → look PS2

const canvas = document.getElementById('game');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: false });
renderer.setPixelRatio(1);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x2a2018);
scene.fog = new THREE.Fog(0x2a2018, 9, 26);

const camera = new THREE.PerspectiveCamera(62, 1, 0.1, 60);

function resize() {
  const w = Math.max(320, Math.floor(window.innerWidth / PIXEL_SCALE));
  const h = Math.max(180, Math.floor(window.innerHeight / PIXEL_SCALE));
  renderer.setSize(w, h, false); // el CSS lo estira pixelado a pantalla completa
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}
window.addEventListener('resize', resize);
resize();

buildBuilding(scene);
buildLights(scene);
const colliders = getColliders();

const bob = new Bob(scene, SPAWN);
const tpCam = new ThirdPersonCamera(camera);
const input = new Input(canvas);
const hud = new Hud();

hud.onStart(() => {
  input.lockPointer();
  hud.showOverlay(false);
});
document.addEventListener('pointerlockchange', () => {
  hud.showOverlay(!input.locked);
});

window.__bob = bob; // hook de debug/testeo

const timer = new THREE.Timer();
renderer.setAnimationLoop(() => {
  timer.update();
  const dt = Math.min(timer.getDelta(), 0.05);
  const mouse = input.consumeMouse();

  bob.update(dt, input, tpCam.yaw, colliders, camera.position);
  input.consumeInteract(); // E: reservado para Fase 2 (prendas)

  const floorIdx = floorIndexAt(bob.position.y);
  hud.setFloor(floorIdx);
  tpCam.update(dt, mouse, bob.position, FLOOR_YS[floorIdx - 1]);

  renderer.render(scene, camera);
});
