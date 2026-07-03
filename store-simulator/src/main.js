// FOURTWENTY Store Simulator — local 3 pisos (x5), BOB 3D con feel GTA.
import * as THREE from 'three';
import { buildBuilding, buildLights, getColliders, SPAWN, floorIndexAt, FLOOR_YS } from './world/building.js';
import { buildGallery } from './world/gallery.js';
import { COLLECTIONS } from './world/collections.js';
import { Player } from './player/bob3d.js';
import { ThirdPersonCamera } from './core/camera.js';
import { Input } from './core/input.js';
import { Hud } from './ui/hud.js';

const PIXEL_SCALE = 2; // render interno a 1/2 de resolución → nítido pero retro (GTA SA)

const canvas = document.getElementById('game');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: false });
renderer.setPixelRatio(1);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0xd8dade);
scene.fog = new THREE.Fog(0xd8dade, 28, 85);

const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 140);

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
const colliders = [
  ...getColliders(),
  ...COLLECTIONS.flatMap((col) => buildGallery(scene, col)),
];

const bob = new Player(scene, SPAWN);
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

window.__bob = bob; // hooks de debug/testeo
window.__cam = tpCam;

const timer = new THREE.Timer();
renderer.setAnimationLoop(() => {
  timer.update();
  const dt = Math.min(timer.getDelta(), 0.05);
  const mouse = input.consumeMouse();

  bob.update(dt, input, tpCam.yaw, colliders, camera.position);
  input.consumeInteract(); // E: reservado para Fase 2 (prendas)

  const floorIdx = floorIndexAt(bob.position.y);
  hud.setFloor(floorIdx, COLLECTIONS[floorIdx - 1].name);
  tpCam.update(dt, mouse, bob.position, FLOOR_YS[floorIdx - 1]);

  renderer.render(scene, camera);
});
