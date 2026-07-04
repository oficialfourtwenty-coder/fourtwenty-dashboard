// FOURTWENTY Store Simulator — INTRO: calle de Burela 2570 + local chico.
// El "shopping" de 5 pisos (world/building.js y compañía) queda construido
// pero DESCONECTADO por ahora: se reengancha cuando se implemente la carga
// de mapa hacia la escalera mecánica (ver nota al final de world/street.js).
// Calidad: por defecto 'high' (sombras + post-processing). En celulares o
// máquinas flojas abrir con ?q=low (sin sombras ni post, misma jugabilidad).
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { buildStreet, SPAWN, isInsideLocal, streetSampleGround, STREET_BOUNDS, LOCAL_BOUNDS, CEILING_OUT, CEILING_IN } from './world/street.js';
import { tickAmbient } from './world/anim.js';
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
scene.fog = new THREE.Fog(0xcfd2d6, 12, 40);

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
let bloomPass = null;
if (QUALITY === 'high') {
  composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  bloomPass = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.22, 0.4, 0.92);
  composer.addPass(bloomPass);
  composer.addPass(new ShaderPass(GradeShader));
  composer.addPass(new OutputPass());
}

// Tope de píxeles: en pantallas Retina/4K renderizar a DPR completo funde la
// GPU (sobre todo en pantalla completa). Piso más alto que antes (0.85, no
// 0.7) para que no se vea borroso/cuadriculado en pantallas grandes.
const MAX_PIXELS = QUALITY === 'high' ? 2.6e6 : 1.3e6;
const MIN_RATIO = 0.85;

function resize() {
  const w = window.innerWidth, h = window.innerHeight;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const ratio = Math.max(MIN_RATIO, Math.min(dpr, Math.sqrt(MAX_PIXELS / (w * h))));
  renderer.setPixelRatio(ratio);
  renderer.setSize(w, h, false);
  if (composer) {
    composer.setPixelRatio(ratio);
    composer.setSize(w, h);
    // el bloom trabaja a media resolución: mismo halo, mitad de costo
    bloomPass.setSize((w * ratio) / 2, (h * ratio) / 2);
  }
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}
window.addEventListener('resize', resize);
resize();

// Auto-downgrade: si la máquina no da abasto (notebooks flojas, integradas),
// el juego se da cuenta solo a los pocos segundos y apaga sombras + post-
// processing — sin recargar la página ni tocar ?q=low. Una sola vez.
let perfSamples = 0, perfSlow = 0, downgraded = false;
function checkPerf(dt) {
  if (downgraded || QUALITY !== 'high') return;
  perfSamples++;
  if (perfSamples < 90) return; // ~1.5s de gracia (carga inicial no cuenta)
  if (dt > 1 / 24) perfSlow++; else perfSlow = Math.max(0, perfSlow - 1);
  if (perfSlow > 40) { // ~40 cuadros lentos acumulados
    downgraded = true;
    renderer.shadowMap.enabled = false;
    composer = null; // vuelve a renderer.render directo, sin bloom/grade
    console.info('FOURTWENTY: rendimiento bajo detectado — sombras y post-processing apagados automáticamente.');
  }
}

const colliders = buildStreet(scene);

const bob = new Player(scene, SPAWN);
bob.sampleGround = streetSampleGround; // la calle tiene escalones (no pisos)
const tpCam = new ThirdPersonCamera(camera, STREET_BOUNDS);
// BOB arranca mirando hacia el local (yaw=0 → W camina en -z); el default de
// la clase (yaw=π) es para escenas donde el spawn mira hacia +z.
tpCam.yaw = 0;
tpCam.targetYaw = 0;
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

// Sombras congeladas: todo lo que proyecta sombra es estático (BOB usa sombra
// blob), así que las shadow maps se calculan UNA vez en lugar de 60 por segundo.
// Se refrescan un par de veces al inicio para capturar el GLB que carga async.
renderer.shadowMap.autoUpdate = false;
renderer.shadowMap.needsUpdate = true;
const shadowRefreshAt = [1.5, 4, 8]; // segundos
let elapsed = 0;

const timer = new THREE.Timer();
let lastZone = null;
renderer.setAnimationLoop(() => {
  timer.update();
  const rawDt = timer.getDelta();
  checkPerf(rawDt);
  const dt = Math.min(rawDt, 0.05);
  elapsed += dt;
  if (shadowRefreshAt.length && elapsed > shadowRefreshAt[0]) {
    renderer.shadowMap.needsUpdate = true;
    shadowRefreshAt.shift();
  }
  const mouse = input.consumeMouse();

  bob.update(dt, input, tpCam.yaw, colliders, camera.position);
  input.consumeInteract(); // E: reservado para Fase 2 (prendas)
  tickAmbient(dt);         // displays giratorios

  const inside = isInsideLocal(bob.position);
  const zoneName = inside ? 'FOURTWENTY' : 'CALLE BURELA';
  hud.setZone(zoneName);
  if (zoneName !== lastZone) {
    hud.showZoneTitle(zoneName); // cartel de zona estilo GTA V al cruzar la puerta
    lastZone = zoneName;
  }
  // adentro: cámara acotada al local, techo bajo; afuera: cielo abierto.
  tpCam.bounds = inside ? LOCAL_BOUNDS : STREET_BOUNDS;
  const floorY = streetSampleGround(bob.position.x, bob.position.z);
  tpCam.update(dt, mouse, bob.position, floorY, bob.modelYaw, inside ? CEILING_IN : CEILING_OUT);

  if (composer) composer.render();
  else renderer.render(scene, camera);
});
