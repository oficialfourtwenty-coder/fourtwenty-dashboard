// Banco de pruebas de la cancha — SOLO desarrollo, no entra al juego.
//
// Se abre en `/cancha.html` con `npm run dev`. Existe para mirar y corregir el
// look de la cancha sin tener que entrar al simulador, viajar al piso 2 y abrir
// el arcade en cada iteración. No lo importa nadie del juego, así que no suma
// un byte al bundle de producción.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { GTAOPass } from 'three/addons/postprocessing/GTAOPass.js';
import { construirCancha, MEDIDAS } from './cancha.js';

// Mismo grade que usa el simulador grande (saturación, altas luces cálidas y
// viñeta), para que la cancha no parezca de otro juego.
const GradeShader = {
  uniforms: { tDiffuse: { value: null } },
  vertexShader: /* glsl */`
    varying vec2 vUv;
    void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: /* glsl */`
    uniform sampler2D tDiffuse;
    varying vec2 vUv;
    void main() {
      vec3 c = texture2D(tDiffuse, vUv).rgb;
      float lum = dot(c, vec3(0.299, 0.587, 0.114));
      c = mix(vec3(lum), c, 1.14);
      c *= mix(vec3(1.0), vec3(1.06, 1.0, 0.90), smoothstep(0.35, 1.0, lum));
      float d = distance(vUv, vec2(0.5));
      c *= 1.0 - smoothstep(0.52, 0.95, d) * 0.34;
      gl_FragColor = vec4(c, 1.0);
    }`,
};

const canvas = document.getElementById('vista');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.02;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 260);

const cancha = construirCancha(scene, renderer);

// ── Muñecos de referencia ───────────────────────────────────────────────────
// Dos cápsulas de 1,90 m: sin una referencia humana al lado es imposible saber
// si el aro quedó a la altura correcta. Se ven feas a propósito — son una
// regla, no un personaje.
const refMat = new THREE.MeshStandardMaterial({ color: 0x2b2f36, roughness: 0.8 });
const refs = [];
for (const [x, z] of [[0.9, MEDIDAS.LIBRES_Z], [-0.6, 2.4]]) {
  const alto = MEDIDAS.JUGADOR_ALTO;
  const m = new THREE.Mesh(new THREE.CapsuleGeometry(0.28, alto - 0.56, 6, 12), refMat);
  m.position.set(x, alto / 2, z);
  m.castShadow = true;
  scene.add(m);
  refs.push(m);
}

// ── Post-processing ─────────────────────────────────────────────────────────
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));

// El AO es lo que apoya las cosas en el piso: sin él el poste, el banco y el
// alambrado parecen calcomanías pegadas encima del asfalto.
let gtao = null;
try {
  gtao = new GTAOPass(scene, camera, 1, 1);
  gtao.output = GTAOPass.OUTPUT.Default;
  composer.addPass(gtao);
} catch (e) {
  console.warn('GTAO no disponible, sigo sin AO:', e);
}

const bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.18, 0.5, 0.95);
composer.addPass(bloom);
composer.addPass(new ShaderPass(GradeShader));
composer.addPass(new OutputPass());

const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true;
controls.target.set(0, 1.6, 5);

// ── Cámaras de prueba ───────────────────────────────────────────────────────
// La 1 es la que va a usar el juego: detrás del atacante, tipo transmisión.
const VISTAS = {
  1: { nombre: 'JUEGO (detrás del atacante)', pos: [0.9, 3.2, 11.8], mira: [0, 1.5, 2.2] },
  2: { nombre: 'TIRO LIBRE', pos: [0.9, 1.65, MEDIDAS.LIBRES_Z], mira: [0, 3.05, 1.575] },
  3: { nombre: 'AÉREA', pos: [0, 22, 9], mira: [0, 0, 6] },
  4: { nombre: 'ESQUINA', pos: [10.5, 2.2, 12.5], mira: [0, 2.4, 2] },
  5: { nombre: 'ABAJO DEL ARO', pos: [0, 1.5, 4.4], mira: [0, 3.05, 1.575] },
};
function verVista(n) {
  const v = VISTAS[n];
  if (!v) return;
  camera.position.set(...v.pos);
  controls.target.set(...v.mira);
  document.getElementById('vista-nombre').textContent = v.nombre;
}
verVista(1);

// ── Interruptores para comparar ─────────────────────────────────────────────
const estado = { ao: !!gtao, bloom: true, sombras: true };
addEventListener('keydown', (e) => {
  if (VISTAS[e.key]) return verVista(e.key);
  if (e.key === 'o' && gtao) { estado.ao = !estado.ao; gtao.enabled = estado.ao; }
  if (e.key === 'b') { estado.bloom = !estado.bloom; bloom.enabled = estado.bloom; }
  if (e.key === 'v') { estado.sombras = !estado.sombras; renderer.shadowMap.enabled = estado.sombras; scene.traverse((x) => { if (x.isMesh) x.material.needsUpdate = true; }); }
  if (e.key === 'r') { refs.forEach((m) => { m.visible = !m.visible; }); }
  pintarEstado();
});
function pintarEstado() {
  document.getElementById('flags').textContent =
    `AO ${estado.ao ? 'ON' : 'off'} · BLOOM ${estado.bloom ? 'ON' : 'off'} · SOMBRAS ${estado.sombras ? 'ON' : 'off'}`;
}
pintarEstado();

// ── Medición ────────────────────────────────────────────────────────────────
// La regla del proyecto es medir, no opinar: acá salen los draw calls y los
// triángulos de verdad, que es lo que decide si esto entra en el presupuesto.
const medidor = document.getElementById('medidor');
let cuadros = 0, ultimo = performance.now(), fps = 0;

// ⚠️ `renderer.info` se resetea en CADA render, y el composer hace varios por
// cuadro: si se lo lee después de `composer.render()` devuelve lo del último
// pase, que es el cuadrilátero de pantalla completa del OutputPass. Por eso la
// primera medición marcaba "1 draw call · 0.0k triángulos" con la cancha entera
// en pantalla. Se apaga el reset automático y se acumula a mano.
renderer.info.autoReset = false;

function ajustar() {
  const w = window.innerWidth, h = window.innerHeight;
  renderer.setSize(w, h, false);
  composer.setSize(w, h);
  gtao?.setSize(w, h);
  bloom.setSize(w, h);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}
addEventListener('resize', ajustar);
ajustar();

renderer.setAnimationLoop(() => {
  renderer.info.reset();
  controls.update();
  composer.render();

  cuadros++;
  const ahora = performance.now();
  if (ahora - ultimo > 500) {
    fps = Math.round((cuadros * 1000) / (ahora - ultimo));
    cuadros = 0; ultimo = ahora;
    const i = renderer.info.render;
    medidor.textContent = `${fps} fps · ${i.calls} draw calls · ${(i.triangles / 1000).toFixed(1)}k tri · ${renderer.info.memory.textures} texturas`;
  }
});

console.info('Cancha lista. Medidas: aro a', MEDIDAS.ARO_ALTURA, 'm ·', MEDIDAS.ANCHO, '×', MEDIDAS.FONDO, 'm');
