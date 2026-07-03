// FOURTWENTY Store Simulator — local 5 pisos, BOB 3D, pase visual GTA V.
// Calidad: por defecto 'high' (sombras + post-processing). En celulares o
// máquinas flojas abrir con ?q=low (sin sombras ni post, misma jugabilidad).
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { buildBuilding, buildLights, getColliders, SPAWN, floorIndexAt, FLOOR_YS } from './world/building.js';
import { buildGallery } from './world/gallery.js';
import { buildRetail } from './world/retail.js';
import { buildSignage } from './world/signage.js';
import { COLLECTIONS } from './world/collections.js';
import { Player } from './player/bob3d.js';
import { ThirdPersonCamera } from './core/camera.js';
import { Input } from './core/input.js';
import { Hud } from './ui/hud.js';

const QUALITY = new URLSearchParams(location.search).get('q') === 'low' ? 'low' : 'high';

const canvas = document.getElementById('game');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: QUALITY === 'high' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, QUALITY === 'high' ? 2 : 1));
renderer.shadowMap.enabled = QUALITY === 'high';
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0xcfd2d6);
scene.fog = new THREE.Fog(0xcfd2d6, 25, 75);

// Reflejos de ambiente (RoomEnvironment): les da vida a los PBR sin HDR externo.
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
scene.environmentIntensity = 0.22;

const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 140);

// ---- Post-processing (bloom sutil + grade cálido + viñeta, estilo GTA V) ----
const GradeShader = {
  uniforms: { tDiffuse: { value: null } },
  vertexShader: /* glsl */`
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }`,
  fragmentShader: /* glsl */`
    uniform sampler2D tDiffuse;
    varying vec2 vUv;
    void main() {
      vec3 c = texture2D(tDiffuse, vUv).rgb;
      float lum = dot(c, vec3(0.299, 0.587, 0.114));
      c = mix(vec3(lum), c, 1.12);                    // +saturación
      c *= mix(vec3(1.0), vec3(1.05, 1.0, 0.92), smoothstep(0.35, 1.0, lum)); // altas luces cálidas
      float d = distance(vUv, vec2(0.5));
      c *= 1.0 - smoothstep(0.55, 0.95, d) * 0.32;    // viñeta leve
      gl_FragColor = vec4(c, 1.0);
    }`,
};

let composer = null;
if (QUALITY === 'high') {
  composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.22, 0.4, 0.92);
  composer.addPass(bloom);
  composer.addPass(new ShaderPass(GradeShader));
  composer.addPass(new OutputPass());
}

function resize() {
  const w = window.innerWidth, h = window.innerHeight;
  renderer.setSize(w, h, false);
  composer?.setSize(w, h);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}
window.addEventListener('resize', resize);
resize();

buildBuilding(scene);
buildLights(scene, { shadows: QUALITY === 'high' });
buildSignage(scene);
const colliders = [
  ...getColliders(),
  ...COLLECTIONS.flatMap((col) => buildGallery(scene, col)),
  ...buildRetail(scene), // mobiliario retail de los 5 pisos
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
  hud.setFloor(floorIdx, COLLECTIONS.find((c) => c.piso === floorIdx)?.name ?? 'FOURTWENTY');
  tpCam.update(dt, mouse, bob.position, FLOOR_YS[floorIdx - 1]);

  if (composer) composer.render();
  else renderer.render(scene, camera);
});
