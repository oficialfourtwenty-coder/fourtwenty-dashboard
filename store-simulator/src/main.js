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
// BOBILONIA: el shopping de 5 pisos ya construido, se monta al elegir remera
import { buildBuilding, buildLights, getColliders, sampleGround as shopSampleGround, floorIndexAt, FLOOR_YS, FLOOR_H, INTERIOR } from './world/building.js';
import { buildGallery } from './world/gallery.js';
import { buildRetail } from './world/retail.js';
import { addFurniture } from './world/furniture.js';
import { initWorldEditor } from './world/editor/worldEditor.js';
import { autoRegisterScene, applyLayout, registerEditableObject, restoreClones } from './world/editor/editableRegistry.js';
import { loadInitialLayout } from './world/editor/layoutStore.js';
import { buildSignage } from './world/signage.js';
import { COLLECTIONS } from './world/collections.js';
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
// cielo celeste de día despejado (spec); niebla lejana para ampliar el campo
// visual sin que se recorte el mapa (las torres de fondo se ven).
scene.background = new THREE.Color(0x9fc4e8);
scene.fog = new THREE.Fog(0xb9d3ec, 30, 110);

// Reflejos de ambiente (RoomEnvironment): les da vida a los PBR sin HDR externo.
const pmrem = new THREE.PMREMGenerator(renderer);
const envTex = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
scene.environment = envTex;
scene.environmentIntensity = 0.22;

let activeScene = scene; // se cambia al montar BOBILONIA

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
let renderPass = null;
if (QUALITY === 'high') {
  composer = new EffectComposer(renderer);
  renderPass = new RenderPass(scene, camera);
  composer.addPass(renderPass);
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

const { colliders: streetColliders, selectors } = buildStreet(scene);
let colliders = streetColliders;
let world = 'street'; // 'street' | 'shopping'

const bob = new Player(scene, SPAWN);
bob.sampleGround = streetSampleGround; // la calle tiene escalones (no pisos)
bob.modelYaw = Math.PI; // BOB arranca mirando hacia el local (-z)
const tpCam = new ThirdPersonCamera(camera, STREET_BOUNDS);
tpCam.yaw = 0;          // cámara detrás de él (del lado de la calle)
tpCam.targetYaw = 0;
const input = new Input(canvas);
const hud = new Hud();
const worldEditor = initWorldEditor({ scene, camera, renderer, input, player: bob });

// SIN pointer lock: el overlay de inicio solo se cierra con el primer click.
hud.onStart(() => hud.showOverlay(false));

window.__bob = bob; // hooks de debug/testeo
window.__cam = tpCam;
window.__worldEditor = worldEditor;
window.__startLoading = (piso, label) => startLoading(piso, label ?? `PISO ${piso}`);

// EDITOR: todo lo que hay en la calle queda registrado como editable (tecla T).
// Si el dueño ya movió/ocultó/duplicó cosas (localStorage o layout base), se
// re-aplica acá. Los muebles GLB se registran solos en addFurniture.
autoRegisterScene(scene, { prefix: 'calle', skip: [bob.rig, bob.shadow] });
// BOB es editable en vivo (teletransportar, rotar, escalar) pero transient:
// nunca se guarda en el layout para que el juego conserve su spawn normal.
registerEditableObject({
  id: 'bob',
  name: 'BOB (jugador)',
  type: 'player',
  object3D: bob.rig,
  manageShadows: false,
  transient: true,
});
loadInitialLayout().then((layout) => {
  applyLayout(layout);
  restoreClones(layout);
});

// ---- Selector de colecciones (remeras del stock): hover + click + E --------
const raycaster = new THREE.Raycaster();
const pointerNdc = new THREE.Vector2(-2, -2); // fuera de pantalla hasta que se mueva
let hovered = null;
let loading = false;
const loadingEl = document.getElementById('loading-screen');
const loadingCount = document.getElementById('loading-count');
const loadingDest = document.getElementById('loading-dest');
const loadingTitleMain = document.getElementById('loading-title-main');
const loadingTitleSub = document.getElementById('loading-title-sub');
const loadingBarFill = document.getElementById('loading-bar-fill');
const bobLoadingVideo = document.getElementById('bob-loading-video');
const bobLoadingBarFill = document.getElementById('bob-loading-bar-fill');
const loadingMessage = document.getElementById('loading-message');
const shirtTip = document.getElementById('shirt-tip');

function finishLoadingUi() {
  loadingEl.classList.remove('show');
  requestAnimationFrame(() => {
    loadingEl.classList.remove('hoop-season', 'bob-collection');
    bobLoadingVideo.pause();
    bobLoadingVideo.onended = null;
    bobLoadingVideo.onerror = null;
    bobLoadingVideo.onstalled = null;
    bobLoadingVideo.onabort = null;
    try { bobLoadingVideo.currentTime = 0; } catch {}
    bobLoadingBarFill.style.width = '0%';
  });
  loading = false;
}

// si el dueño sube public/assets/ui/bobilonia.jpg, se usa como fondo de carga
const bgProbe = new Image();
bgProbe.onload = () => {
  if (!loadingEl.classList.contains('hoop-season') && !loadingEl.classList.contains('bob-collection')) {
    loadingEl.style.backgroundImage = `url(${bgProbe.src})`;
  }
};
bgProbe.src = 'assets/ui/bobilonia.jpg';

canvas.addEventListener('pointermove', (e) => {
  pointerNdc.set((e.clientX / window.innerWidth) * 2 - 1, -(e.clientY / window.innerHeight) * 2 + 1);
});
canvas.addEventListener('click', () => {
  if (loading || world !== 'street' || !hovered) return;
  if (!isInsideLocal(bob.position)) return; // hay que estar adentro del local
  startLoading(hovered.userData.piso, hovered.userData.label);
});

function updateHover() {
  if (loading || world !== 'street' || !isInsideLocal(bob.position)) {
    clearShirtHover();
    return;
  }
  raycaster.setFromCamera(pointerNdc, camera);
  const hit = raycaster.intersectObjects(selectors, false)[0]?.object ?? null;
  if (hit !== hovered) {
    if (hovered) hovered.scale.setScalar(1);
    hovered = hit;
    if (hovered) {
      hovered.scale.setScalar(1.18); // feedback: se agranda al pasar el mouse
      shirtTip.textContent = `${hovered.userData.label} — CLICK PARA VIAJAR`;
    }
    canvas.style.cursor = hovered ? 'pointer' : 'default';
    shirtTip.style.display = hovered ? 'block' : 'none';
  }
}

function clearShirtHover() {
  if (hovered) {
    hovered.scale.setScalar(1);
    hovered = null;
  }
  canvas.style.cursor = 'default';
  shirtTip.style.display = 'none';
}

// E = interactuar con la remera más cercana (a menos de 3m)
function interactNearest() {
  if (loading || world !== 'street' || !isInsideLocal(bob.position)) return;
  let best = null, bestD = 3;
  for (const s of selectors) {
    const d = Math.hypot(s.position.x - bob.position.x, s.position.z - bob.position.z);
    if (d < bestD) { bestD = d; best = s; }
  }
  if (best) startLoading(best.userData.piso, best.userData.label);
}

// ---- Pantalla de carga BOBILONIA + montaje del shopping ---------------------
const SHOP_BOUNDS = {
  minX: -INTERIOR.x, maxX: INTERIOR.x,
  minZ: -INTERIOR.z, maxZ: INTERIOR.z,
};

function startLoading(piso, label) {
  loading = true;
  shirtTip.style.display = 'none';
  canvas.style.cursor = 'default';

  const isHoopSeason = piso === 3;
  const isBobCollection = piso === 4;
  loadingEl.classList.toggle('hoop-season', isHoopSeason);
  loadingEl.classList.toggle('bob-collection', isBobCollection);
  bobLoadingVideo.pause();
  bobLoadingVideo.muted = false;
  bobLoadingVideo.volume = 1;
  bobLoadingBarFill.style.width = '0%';

  if (isBobCollection) {
    loadingEl.style.backgroundImage = '';
  } else if (isHoopSeason) {
    loadingEl.style.backgroundImage = '';
    loadingDest.textContent = 'HOOP SEASON';
    loadingTitleMain.textContent = 'HOOP';
    loadingTitleSub.textContent = 'SEASON';
    loadingMessage.innerHTML = 'SUBIENDO AL PISO DE <strong>"HOOP SEASON"</strong> PARA DISFRUTAR LA LINEA DEPORTIVA DE BASKET DE <strong>FOURTWENTY</strong>';
  } else {
    if (bgProbe.complete && bgProbe.naturalWidth > 0) {
      loadingEl.style.backgroundImage = `url(${bgProbe.src})`;
    }
    loadingDest.textContent = label;
    loadingTitleMain.textContent = 'BOBILONIA';
    loadingTitleSub.textContent = '';
    loadingMessage.textContent = `CARGANDO ${label}`;
  }

  loadingCount.textContent = '0%';
  loadingBarFill.style.width = '0%';
  loadingEl.classList.add('show');

  // el mundo se construye ya (la cuenta regresiva tapa el trabajo)
  const ready = buildShopping();
  if (isBobCollection) {
    playBobLoading(ready, piso);
    return;
  }

  const startedAt = performance.now();
  const durationMs = 3000;

  const tick = (now) => {
    const t = Math.min(1, (now - startedAt) / durationMs);
    const pct = Math.round(t * 100);
    loadingCount.textContent = `${pct}%`;
    loadingBarFill.style.width = `${pct}%`;
    if (t < 1) {
      requestAnimationFrame(tick);
      return;
    }
    enterShopping(ready, piso);
    finishLoadingUi();
  };
  requestAnimationFrame(tick);
}

function playBobLoading(ready, piso) {
  let done = false;
  let raf = 0;
  let fallback = false;

  const finish = () => {
    if (done) return;
    done = true;
    cancelAnimationFrame(raf);
    bobLoadingVideo.onended = null;
    bobLoadingVideo.onerror = null;
    bobLoadingVideo.onstalled = null;
    bobLoadingVideo.onabort = null;
    bobLoadingBarFill.style.width = '100%';
    bobLoadingVideo.pause();
    enterShopping(ready, piso);
    finishLoadingUi();
  };

  const trackVideo = () => {
    if (done || fallback) return;
    const duration = Number.isFinite(bobLoadingVideo.duration) && bobLoadingVideo.duration > 0
      ? bobLoadingVideo.duration
      : 0;
    const pct = duration ? Math.min(100, (bobLoadingVideo.currentTime / duration) * 100) : 0;
    bobLoadingBarFill.style.width = `${pct}%`;
    raf = requestAnimationFrame(trackVideo);
  };

  const fallbackTimed = () => {
    if (done || fallback) return;
    fallback = true;
    const startedAt = performance.now();
    const durationMs = 3000;
    const tick = (now) => {
      if (done) return;
      const t = Math.min(1, (now - startedAt) / durationMs);
      bobLoadingBarFill.style.width = `${Math.round(t * 100)}%`;
      if (t < 1) {
        raf = requestAnimationFrame(tick);
        return;
      }
      finish();
    };
    raf = requestAnimationFrame(tick);
  };

  bobLoadingVideo.onended = finish;
  bobLoadingVideo.onerror = fallbackTimed;
  bobLoadingVideo.onstalled = fallbackTimed;
  bobLoadingVideo.onabort = fallbackTimed;
  try { bobLoadingVideo.currentTime = 0; } catch {}
  const playPromise = bobLoadingVideo.play();
  raf = requestAnimationFrame(trackVideo);
  if (playPromise?.catch) playPromise.catch(fallbackTimed);
}

function buildShopping() {
  const s = new THREE.Scene();
  s.background = new THREE.Color(0xcfd2d6);
  s.fog = new THREE.Fog(0xcfd2d6, 12, 40);
  s.environment = envTex;
  s.environmentIntensity = 0.22;
  buildBuilding(s);
  buildLights(s, { shadows: QUALITY === 'high' && !downgraded });
  buildSignage(s);
  addFurniture(s).then(() => {
    renderer.shadowMap.needsUpdate = true;
  });
  const cols = [
    ...getColliders(),
    ...COLLECTIONS.flatMap((c) => buildGallery(s, c)),
    ...buildRetail(s),
  ];
  // EDITOR: BOBILONIA entera también es editable; se re-aplica lo guardado.
  // OJO: los colliders son cajas fijas, mover una pared no mueve su colisión.
  autoRegisterScene(s, { prefix: 'bobilonia' });
  loadInitialLayout().then((layout) => {
    applyLayout(layout);
    restoreClones(layout);
  });
  return { scene: s, colliders: cols };
}

function enterShopping({ scene: s, colliders: cols }, piso) {
  // mover a BOB (rig + sombra) a la escena nueva y ubicarlo en su piso
  s.add(bob.rig);
  s.add(bob.shadow);
  bob.sampleGround = shopSampleGround;
  bob.velocity.set(0, 0, 0);
  bob.position.set(0, FLOOR_YS[piso - 1] + 0.02, -2);
  bob.modelYaw = Math.PI; // mirando al frente del piso
  tpCam.bounds = SHOP_BOUNDS;
  tpCam.yaw = Math.PI; tpCam.targetYaw = Math.PI;
  tpCam.focus.set(0, FLOOR_YS[piso - 1] + 1.15, -2);
  activeScene = s;
  if (renderPass) renderPass.scene = s;
  worldEditor.setScene(s);
  colliders = cols;
  world = 'shopping';
  lastZone = null; // dispara el cartel de zona del piso al entrar
  // recalcular las sombras congeladas para el mundo nuevo
  renderer.shadowMap.needsUpdate = true;
  shadowRefreshAt.push(elapsed + 1.5, elapsed + 4);
}

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

  const editorActive = worldEditor.isEnabled();
  if (!loading && !editorActive) bob.update(dt, input, tpCam.yaw, colliders, camera.position);
  if (editorActive) input.consumeInteract();
  else if (input.consumeInteract()) interactNearest(); // E = remera más cercana
  if (editorActive) clearShirtHover();
  else updateHover();      // resaltado de remeras bajo el mouse
  tickAmbient(dt);         // displays giratorios

  let floorY, ceiling, zoneName;
  if (world === 'street') {
    const inside = isInsideLocal(bob.position);
    zoneName = inside ? 'FOURTWENTY' : 'CALLE BURELA';
    // adentro: cámara acotada al local, techo bajo; afuera: cielo abierto.
    tpCam.bounds = inside ? LOCAL_BOUNDS : STREET_BOUNDS;
    floorY = streetSampleGround(bob.position.x, bob.position.z);
    ceiling = inside ? CEILING_IN : CEILING_OUT;
    hud.setZone(zoneName);
  } else {
    const idx = floorIndexAt(bob.position.y);
    zoneName = COLLECTIONS.find((c) => c.piso === idx)?.name ?? 'FOURTWENTY';
    floorY = FLOOR_YS[idx - 1];
    ceiling = FLOOR_H;
    hud.setFloor(idx, zoneName);
  }
  if (zoneName !== lastZone) {
    hud.showZoneTitle(zoneName); // cartel de zona estilo GTA V
    lastZone = zoneName;
  }
  if (!editorActive) tpCam.update(dt, bob.position, floorY, bob.modelYaw, ceiling);

  if (composer) composer.render();
  else renderer.render(activeScene, camera);
});
