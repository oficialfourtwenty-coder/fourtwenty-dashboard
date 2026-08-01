// FOURTWENTY Store Simulator — calle de Burela + destinos aislados por ascensor.
// Cada seccion se construye como una escena independiente y se descarta al
// viajar: nunca se renderizan ni se montan todos los pisos al mismo tiempo.
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
import { buildBuilding, buildLights, getColliders, sampleGround as shopSampleGround, floorIndexAt, FLOOR_YS, FLOOR_H, INTERIOR } from './world/building.js';
import { buildGallery } from './world/gallery.js';
import { buildRetail } from './world/retail.js';
import { addFurniture } from './world/furniture.js';
import { initWorldEditor } from './world/editor/worldEditor.js';
import { autoRegisterScene, applyLayout, getEditableObjects, isEditableEffectivelyVisible, registerEditableObject, restoreClones } from './world/editor/editableRegistry.js';
import { loadInitialLayout } from './world/editor/layoutStore.js';
import { buildSignage } from './world/signage.js';
import { COLLECTIONS } from './world/collections.js';
import { tickAmbient } from './world/anim.js';
import { ElevatorController } from './world/elevator.js';
import { buildDestinationScene, disposeDestinationScene, ELEVATOR_DESTINATIONS, getDestination, sceneStats } from './world/destinationScenes.js';
import { Player } from './player/bob3d.js';
import { ThirdPersonCamera } from './core/camera.js';
import { Input } from './core/input.js';
import { Hud } from './ui/hud.js';
import { initElevatorPanel } from './ui/elevatorPanel.js';
import { loadProductos } from './data/productosStore.js';
import { initProductClicks } from './interact/productClicks.js';
import { initAdminPanel } from './ui/adminPanel.js';
import { buildCars } from './world/cars.js';
import { createMusicPlayer } from './audio/musicPlayer.js';
import { initCarInteract } from './interact/carInteract.js';
import { initTwentyTimeInteract } from './interact/twentyTimeInteract.js';
import { createCartStore } from './data/cartStore.js';
import { createPhone } from './ui/phone.js';
import { initMobileControls } from './ui/mobileControls.js';
import { createDayNightCycle } from './world/dayNightCycle.js';
import { createMinigameManager } from './minigames/minigameManager.js';
import { createBobsMazeGame } from './minigames/bobsMaze.js';

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

let activeScene = scene;

const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 140);
const editableColliderBox = new THREE.Box3();
const editableColliderPartBox = new THREE.Box3();
const editableColliderSize = new THREE.Vector3();
const streetRuntimeColliders = [];
const streetRuntimeSteppables = [];
const destinationRuntimeColliders = [];

// ---- Step-offset genérico (consciente de rotación) -------------------------
// Un objeto "pared" bloquea con una caja alineada a los ejes del mundo — eso
// rompe apenas se lo inclina/rota: la caja se agranda con la inclinación y un
// escalón fino pasa a leerse como pared sólida (ver STEP_MAX_HEIGHT abajo).
// En vez de eso, los objetos lo bastante bajos EN SU PROPIO EJE (sin importar
// cómo estén rotados en el editor) no bloquean: se pisan, y su altura real se
// mide con un raycast vertical contra la malla — el raycast ya respeta la
// rotación/escala completas del objeto, así que un escalón/rampa rotado o
// inclinado se sube igual que uno derecho, sin necesidad de tagear cada caso.
const STEP_MAX_HEIGHT = 0.42;  // alto local máx. para contar como "escalón" (no pared)
const STEP_UP_ALLOWANCE = 0.5; // cuánto puede subir BOB de golpe sobre un escalón
const localHeightCache = new WeakMap();
const stepRaycaster = new THREE.Raycaster();
const stepOrigin = new THREE.Vector3();
const STEP_DOWN = new THREE.Vector3(0, -1, 0);

function localHeightOf(object) {
  if (localHeightCache.has(object)) return localHeightCache.get(object);
  // Mesh simple con geometría propia (el patrón de TODO el kit vía gfxUtils.box()):
  // geometry.boundingBox ya está en espacio LOCAL, sin la rotación/posición del
  // objeto — por eso da el alto real del objeto, no el de su sombra en el mundo.
  let height = Infinity; // grupos: no sabemos su forma local sin recorrer hijos;
  if (object.isMesh && object.geometry) {                    // se los deja como pared (comportamiento previo, sin cambios).
    if (!object.geometry.boundingBox) object.geometry.computeBoundingBox();
    const bb = object.geometry.boundingBox;
    height = (bb.max.y - bb.min.y) * object.scale.y;
  }
  localHeightCache.set(object, height);
  return height;
}

function isSteppable(object) {
  return object.userData?.walkStep === true || localHeightOf(object) <= STEP_MAX_HEIGHT;
}

// Altura de piso agregada de los "escalones" bajo (x,z): el más alto que esté
// a una subida razonable de donde está parado BOB ahora mismo.
function sampleStepHeight(x, z, footY, steppables) {
  let best = -Infinity;
  stepOrigin.set(x, footY + 3, z);
  stepRaycaster.set(stepOrigin, STEP_DOWN);
  stepRaycaster.far = 6;
  for (const object of steppables) {
    const hits = stepRaycaster.intersectObject(object, false);
    if (!hits.length) continue;
    const y = hits[0].point.y;
    if (y > best && y <= footY + STEP_UP_ALLOWANCE) best = y;
  }
  return best;
}

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
  const w = Math.max(1, Math.round(canvas.clientWidth || window.innerWidth));
  const h = Math.max(1, Math.round(canvas.clientHeight || window.innerHeight));
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
window.visualViewport?.addEventListener('resize', resize);
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

const {
  colliders: streetColliders,
  outdoorLighting: streetOutdoorLighting,
  whiteLightSwitch: streetWhiteLightSwitch,
} = buildStreet(scene);
let colliders = streetColliders;
let world = 'street'; // 'street' | 'destination'
let loading = false;
let carInteract = null; // se crea más abajo (autos + radio); acá para poder
                        // consultarlo desde los isBlocked de otras capas
let twentyTimeInteract = null;
let phone = null;
let adminPanel = null;
let currentDestinationId = 0;
let activeDestinationRecord = null;

window.addEventListener('fourtwenty:world-edited', () => {
  renderer.shadowMap.needsUpdate = true;
  if (activeDestinationRecord) activeDestinationRecord.collidersDirty = true;
});

function activeOutdoorLighting() {
  if (world === 'street') return streetOutdoorLighting;
  return activeDestinationRecord?.outdoorLighting ?? null;
}

const dayNight = createDayNightCycle({
  renderer,
  getLighting: activeOutdoorLighting,
  onShadowRefresh: () => { renderer.shadowMap.needsUpdate = true; },
});
dayNight.update(true);
window.__dayNight = dayNight;

const bob = new Player(scene, SPAWN);
bob.sampleGround = streetSampleGroundWithSteps; // rampa fija + escalones editables (rotados o no)
bob.modelYaw = Math.PI; // BOB arranca mirando hacia el local (-z)
const tpCam = new ThirdPersonCamera(camera, STREET_BOUNDS);
tpCam.yaw = 0;          // cámara detrás de él (del lado de la calle)
tpCam.targetYaw = 0;
const input = new Input(canvas);
const hud = new Hud();
const worldEditor = initWorldEditor({ scene, camera, renderer, input, player: bob });
const minigameManager = createMinigameManager({
  onOpenChange: () => {
    input.keys.clear();
    input.clearVirtualAxes();
    clearShirtHover();
  },
});
const streetElevator = new ElevatorController(scene, {
  id: 'elevator-street',
  name: 'Ascensor FOURTWENTY · Calle Burela',
  position: [0, 0, 3.0],
  rotationY: 0,
  onEnter: handleElevatorEntered,
});
let activeElevator = streetElevator;
const elevatorPanel = initElevatorPanel({
  destinations: ELEVATOR_DESTINATIONS,
  onSelect: travelToDestination,
});

// SIN pointer lock: el overlay de inicio solo se cierra con el primer click.
hud.onStart(() => hud.showOverlay(false));

// PRODUCTOS: catálogo (productos.json / panel admin) + click en prendas.
// Capa aislada: raycaster propio contra meshes tageados userData.productSlot.
const cart = createCartStore();
loadProductos();
const productClicks = initProductClicks({
  canvas,
  camera,
  getScene: () => activeScene,
  isBlocked: () => loading || elevatorPanel.isVisible() || worldEditor.isEnabled()
    || minigameManager.isOpen() || !!twentyTimeInteract?.isOpen() || !!carInteract?.isRadioOpen()
    || !!phone?.isOpen() || !!adminPanel?.isOpen(),
  onAddToCart: (product) => cart.add(product),
});
// ADMIN de prendas (tecla P; en build online requiere ?admin=1): carga manual
// de imagen/nombre/precio/descripcion/link por percha — ver src/ui/adminPanel.js
adminPanel = initAdminPanel({
  isBlocked: () => worldEditor.isEnabled() || minigameManager.isOpen()
    || !!twentyTimeInteract?.isOpen() || !!phone?.isOpen(), // el editor usa P para "grupo padre"
});
window.__adminPanel = adminPanel;

// AUTOS + MÚSICA: los dos autos estacionados en Burela (el up! de Luca y el
// Corolla de Fer) son el dial de la radio del simulador. Click al auto → se
// abre la puerta y BOB queda sentado; la radio del tablero elige el tema, y la
// música sigue sonando en todo el resto del juego (calle, local, pisos).
const streetCars = buildCars(scene);
const music = createMusicPlayer();
carInteract = initCarInteract({
  canvas,
  camera,
  getScene: () => activeScene,
  cars: streetCars,
  player: bob,
  tpCam,
  music,
  isBlocked: () => loading || elevatorPanel.isVisible() || worldEditor.isEnabled()
    || minigameManager.isOpen() || !!twentyTimeInteract?.isOpen() || !!phone?.isOpen()
    || !!adminPanel?.isOpen() || productClicks.panel.isOpen() || world !== 'street',
});

// TWENTY TIME: el lector se ancla a los nodos B54_M06/B54_M07 del puesto GLB.
// Como el ancla vive dentro del modelo, mover o escalar el puesto con T mueve
// tambien su zona de interaccion sin guardar coordenadas duplicadas.
twentyTimeInteract = initTwentyTimeInteract({
  getScene: () => activeScene,
  isBlocked: () => loading || elevatorPanel.isVisible() || worldEditor.isEnabled()
    || minigameManager.isOpen() || !!phone?.isOpen() || !!adminPanel?.isOpen()
    || productClicks.panel.isOpen() || !!carInteract?.isRadioOpen() || world !== 'street',
  onOpenChange: () => {
    input.keys.clear();
    input.clearVirtualAxes();
    clearShirtHover();
  },
});

// CELULAR: interfaz global, independiente de la escena activa. Comparte el
// reproductor de los autos y el carrito local de productos.
phone = createPhone({
  music,
  cart,
  clock: dayNight,
  isBlocked: () => loading || elevatorPanel.isVisible() || worldEditor.isEnabled()
    || minigameManager.isOpen() || !!twentyTimeInteract?.isOpen()
    || !!adminPanel?.isOpen() || productClicks.panel.isOpen(),
  onBeforeOpen: () => {
    carInteract?.closeRadio();
    input.keys.clear();
    input.clearVirtualAxes();
    clearShirtHover();
  },
});
const mobileControls = initMobileControls({
  canvas,
  input,
  onPhone: () => phone.toggle(),
  onInteract: () => interactNearest(),
});

window.__bob = bob; // hooks de debug/testeo
window.__cam = tpCam;
window.__worldEditor = worldEditor;
window.__productClicks = productClicks;
window.__cars = streetCars;
window.__music = music;
window.__carInteract = carInteract;
window.__twentyTime = twentyTimeInteract;
window.__cart = cart;
window.__phone = phone;
window.__mobileControls = mobileControls;
window.__whiteLightSwitch = streetWhiteLightSwitch;
window.__minigameManager = minigameManager;

registerEditableObject({
  id: 'elevator-street',
  name: 'Ascensor FOURTWENTY (mover completo)',
  type: 'elevator',
  object3D: streetElevator.root,
  manageShadows: false,
});

// Los autos se pueden mover/rotar con el editor (tecla T) como cualquier otra
// cosa de la calle. La colisión se recalcula de la caja real, así que moverlos
// no deja la colisión atrás.
for (const car of streetCars) {
  registerEditableObject({
    id: car.id,
    name: `${car.model} — ${car.owner} (mover completo)`,
    type: 'car',
    object3D: car.root,
    manageShadows: false,
  });
}

// EDITOR: todo lo que hay en la calle queda registrado como editable (tecla T).
// Si el dueño ya movió/ocultó/duplicó cosas (localStorage o layout base), se
// re-aplica acá. Los muebles GLB se registran solos en addFurniture.
autoRegisterScene(scene, { prefix: 'calle-kit', skip: [bob.rig, bob.shadow, streetElevator.root] });
// BOB es editable en vivo (teletransportar, rotar, escalar) pero transient:
// nunca se guarda en el layout para que el juego conserve su spawn normal.
// Duplicarlo crea una "estatua" que sí persiste.
registerEditableObject({
  id: 'bob',
  name: 'BOB (jugador)',
  type: 'player',
  object3D: bob.rig,
  manageShadows: false,
  transient: true,
});

function applySavedEditorLayout() {
  return loadInitialLayout().then((layout) => {
    applyLayout(layout);
    restoreClones(layout);
    return layout;
  });
}

function clearDestinationEditorSync(record) {
  for (const timer of record?.editorSyncTimers ?? []) window.clearTimeout(timer);
  if (record) record.editorSyncTimers = [];
}

function registerDestinationEditables(record) {
  if (!record || activeDestinationRecord !== record) return;
  const prefix = `destino-${record.destination.id}`;
  registerEditableObject({
    id: record.elevator.id,
    name: `Ascensor FOURTWENTY · ${record.destination.hudLabel} (mover completo)`,
    type: 'elevator',
    object3D: record.elevator.root,
    manageShadows: false,
  });
  if (record.minigameArcade) {
    registerEditableObject({
      id: record.destination.id === 1
        ? 'origin-minigame-arcade'
        : `destination-${record.destination.id}-minigame-arcade`,
      name: "Arcade BOB'S MAZE (mover completo)",
      type: 'minigame',
      object3D: record.minigameArcade.root,
      manageShadows: false,
    });
  }
  autoRegisterScene(record.scene, {
    prefix,
    skip: [bob.rig, bob.shadow, record.elevator.root, record.minigameArcade?.root].filter(Boolean),
  });

  loadInitialLayout().then((layout) => {
    if (activeDestinationRecord !== record) return;
    applyLayout(layout);
    restoreClones(layout);
    record.collidersDirty = true;
    renderer.shadowMap.needsUpdate = true;
  });
}

function setupDestinationEditor(record) {
  registerDestinationEditables(record);
  // Los GLB de mobiliario y la estatua BOB llegan asincronicamente.
  record.editorSyncTimers = [700, 2400, 6000].map((delay) => window.setTimeout(() => {
    registerDestinationEditables(record);
  }, delay));
}

applySavedEditorLayout();
addFurniture(scene).then(() => {
  renderer.shadowMap.needsUpdate = true;
  applySavedEditorLayout();
});

function appendEditableColliders(targetColliders, targetSteppables) {
  for (const entry of getEditableObjects()) {
    const object = entry.object3D;
    if (!object || entry.transient || !isEditableEffectivelyVisible(entry.id)) continue;
    // El ascensor calcula sus paredes y puertas en vivo. Usar la caja del grupo
    // completo taparia el hueco de entrada despues de moverlo con T.
    if (entry.type === 'elevator') continue;
    if (!entry.id.startsWith('calle-kit:') && entry.type !== 'furniture') continue;
    if (entry.type === 'furniture' && entry.collidable === false) continue;
    const wantsCollider = object.userData?.editorCollider === true || entry.type === 'furniture';
    if (!wantsCollider && object.userData?.walkStep !== true) continue;

    object.updateWorldMatrix(true, true);

    if (!object.isMesh && !entry.model) {
      appendVisibleMeshColliders(targetColliders, targetSteppables, object, entry);
      continue;
    }

    // Bajo (en SU propio eje) → escalón: se pisa, no bloquea. Se mide con
    // raycast (ver sampleStepHeight), así que rotarlo/inclinarlo en el editor
    // no lo convierte en pared — sigue siendo subible igual que derecho.
    if (isSteppable(object)) {
      targetSteppables.push(object);
      continue;
    }

    setVisibleColliderBox(editableColliderBox, object);
    if (editableColliderBox.isEmpty()) continue;
    editableColliderBox.getSize(editableColliderSize);
    if (editableColliderSize.y < 0.2) continue;

    targetColliders.push({
      id: entry.id,
      source: entry.name,
      minX: editableColliderBox.min.x,
      maxX: editableColliderBox.max.x,
      minY: editableColliderBox.min.y,
      maxY: editableColliderBox.max.y,
      minZ: editableColliderBox.min.z,
      maxZ: editableColliderBox.max.z,
    });
  }
}

function appendVisibleMeshColliders(targetColliders, targetSteppables, object, entry) {
  object.traverseVisible((child) => {
    if (!child.isMesh || !child.geometry) return;
    if (isSteppable(child)) {
      targetSteppables.push(child);
      return;
    }

    if (!child.geometry.boundingBox) child.geometry.computeBoundingBox();
    editableColliderPartBox.copy(child.geometry.boundingBox).applyMatrix4(child.matrixWorld);
    if (editableColliderPartBox.isEmpty()) return;
    editableColliderPartBox.getSize(editableColliderSize);
    if (editableColliderSize.y < 0.2) return;

    targetColliders.push({
      id: entry.id,
      source: child.name ? `${entry.name} · ${child.name}` : entry.name,
      minX: editableColliderPartBox.min.x,
      maxX: editableColliderPartBox.max.x,
      minY: editableColliderPartBox.min.y,
      maxY: editableColliderPartBox.max.y,
      minZ: editableColliderPartBox.min.z,
      maxZ: editableColliderPartBox.max.z,
    });
  });
}

function setVisibleColliderBox(target, object) {
  target.makeEmpty();
  object.updateWorldMatrix(true, true);
  object.traverseVisible((child) => {
    if (!child.isMesh || !child.geometry) return;
    if (!child.geometry.boundingBox) child.geometry.computeBoundingBox();
    editableColliderPartBox.copy(child.geometry.boundingBox).applyMatrix4(child.matrixWorld);
    target.union(editableColliderPartBox);
  });
}

function rebuildDestinationColliders(record) {
  if (!record) return;
  const prefix = `destino-${record.destination.id}:`;
  record.dynamicColliders.length = 0;

  for (const entry of getEditableObjects()) {
    const object = entry.object3D;
    if (!entry.id.startsWith(prefix)
      || object?.userData?.destinationCollider !== true
      || !isEditableEffectivelyVisible(entry.id)) continue;

    setVisibleColliderBox(editableColliderBox, object);
    if (editableColliderBox.isEmpty()) continue;
    editableColliderBox.getSize(editableColliderSize);
    if (editableColliderSize.y < 0.2) continue;
    record.dynamicColliders.push({
      id: entry.id,
      source: entry.name,
      minX: editableColliderBox.min.x,
      maxX: editableColliderBox.max.x,
      minY: editableColliderBox.min.y,
      maxY: editableColliderBox.max.y,
      minZ: editableColliderBox.min.z,
      maxZ: editableColliderBox.max.z,
    });
  }
  record.collidersDirty = false;
}

function currentPlayerColliders() {
  if (world !== 'street') {
    if (activeDestinationRecord?.collidersDirty) rebuildDestinationColliders(activeDestinationRecord);
    destinationRuntimeColliders.length = 0;
    destinationRuntimeColliders.push(
      ...colliders,
      ...(activeDestinationRecord?.dynamicColliders ?? []),
      ...activeElevator.getColliders(),
    );
    if (activeDestinationRecord?.minigameArcade) {
      destinationRuntimeColliders.push(...activeDestinationRecord.minigameArcade.getColliders());
    }
    return destinationRuntimeColliders;
  }
  streetRuntimeColliders.length = 0;
  streetRuntimeColliders.push(...streetColliders);
  streetRuntimeSteppables.length = 0;
  appendEditableColliders(streetRuntimeColliders, streetRuntimeSteppables);
  streetRuntimeColliders.push(...streetElevator.getColliders());
  // los autos frenan al jugador (menos el que esté ocupando)
  if (carInteract) streetRuntimeColliders.push(...carInteract.getColliders());
  return streetRuntimeColliders;
}

// Rampa fija de la entrada (streetSampleGround) + lo más alto que haya bajo
// los pies entre los escalones/rampas editables (rotados o no). Math.max no
// pisa nada de lo que ya funcionaba: solo suma altura cuando hay un escalón
// real debajo, nunca resta.
function streetSampleGroundWithSteps(x, z) {
  const base = streetSampleGround(x, z);
  if (world !== 'street' || !streetRuntimeSteppables.length) return base;
  const stepped = sampleStepHeight(x, z, bob.position.y, streetRuntimeSteppables);
  return Math.max(base, stepped);
}

// ---- Boton exterior del ascensor: hover + click + E -------------------------
const raycaster = new THREE.Raycaster();
const pointerNdc = new THREE.Vector2(-2, -2); // fuera de pantalla hasta que se mueva
let hovered = false;
const loadingEl = document.getElementById('loading-screen');
const loadingCount = document.getElementById('loading-count');
const loadingDest = document.getElementById('loading-dest');
const loadingTitleMain = document.getElementById('loading-title-main');
const loadingTitleSub = document.getElementById('loading-title-sub');
const loadingBarFill = document.getElementById('loading-bar-fill');
const bobLoadingVideo = document.getElementById('bob-loading-video');
const culturaIntroVideo = document.getElementById('cultura-intro-video');
const bobLoadingBarFill = document.getElementById('bob-loading-bar-fill');
const loadingMessage = document.getElementById('loading-message');
const shirtTip = document.getElementById('shirt-tip');

function finishLoadingUi() {
  loadingEl.classList.remove('show');
  requestAnimationFrame(() => {
    loadingEl.classList.remove('hoop-season', 'bob-collection', 'cultura-intro');
    bobLoadingVideo.pause();
    bobLoadingVideo.onended = null;
    bobLoadingVideo.onerror = null;
    bobLoadingVideo.onstalled = null;
    bobLoadingVideo.onabort = null;
    try { bobLoadingVideo.currentTime = 0; } catch {}
    if (culturaIntroVideo) {
      culturaIntroVideo.pause();
      culturaIntroVideo.onended = null;
      culturaIntroVideo.onerror = null;
      culturaIntroVideo.onstalled = null;
      culturaIntroVideo.onabort = null;
      try { culturaIntroVideo.currentTime = 0; } catch {}
    }
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
canvas.addEventListener('click', (event) => {
  if (loading || elevatorPanel.isVisible() || worldEditor.isEnabled() || phone?.isOpen()
    || minigameManager.isOpen() || twentyTimeInteract?.isOpen() || adminPanel?.isOpen()
    || productClicks.panel.isOpen() || carInteract?.isRadioOpen()) return;
  pointerNdc.set((event.clientX / window.innerWidth) * 2 - 1, -(event.clientY / window.innerHeight) * 2 + 1);
  raycaster.setFromCamera(pointerNdc, camera);
  if (world === 'street' && twentyTimeInteract?.interactFromRay(raycaster, bob.position)) return;
  if (activeDestinationRecord?.minigameArcade?.interactFromRay(raycaster, bob.position)) return;
  const hit = raycaster.intersectObject(activeElevator.callButton, false)[0];
  if (hit && activeElevator.isNearCallButton(bob.position)) {
    callActiveElevator();
    return;
  }
  if (world === 'street') streetWhiteLightSwitch.interactFromRay(raycaster, bob.position);
});

function updateHover() {
  if (loading || elevatorPanel.isVisible() || phone?.isOpen() || minigameManager.isOpen()
    || twentyTimeInteract?.isOpen() || adminPanel?.isOpen()
    || productClicks.panel.isOpen() || carInteract?.isRadioOpen()) {
    clearShirtHover();
    return;
  }
  const arcade = activeDestinationRecord?.minigameArcade;
  if (arcade?.canInteract(bob.position)) {
    raycaster.setFromCamera(pointerNdc, camera);
    const arcadeHovered = Boolean(raycaster.intersectObject(arcade.button, false)[0]);
    hovered = false;
    activeElevator?.setHighlighted(false);
    arcade.setHighlighted(arcadeHovered);
    canvas.style.cursor = arcadeHovered ? 'pointer' : 'default';
    shirtTip.style.display = 'block';
    shirtTip.textContent = "E · JUGAR BOB'S MAZE";
    return;
  }
  if (world === 'street' && twentyTimeInteract?.canInteract(bob.position)) {
    raycaster.setFromCamera(pointerNdc, camera);
    const magazineHovered = twentyTimeInteract.isRayHit(raycaster, bob.position);
    hovered = false;
    activeElevator?.setHighlighted(false);
    canvas.style.cursor = magazineHovered ? 'pointer' : 'default';
    shirtTip.style.display = 'block';
    shirtTip.textContent = 'E · LEER TWENTY TIME';
    return;
  }
  if (world === 'street' && streetWhiteLightSwitch.canInteract(bob.position)) {
    hovered = false;
    activeElevator?.setHighlighted(false);
    canvas.style.cursor = 'default';
    shirtTip.style.display = 'block';
    shirtTip.textContent = 'E · LUCES';
    return;
  }
  if (!activeElevator || !activeElevator.isNearCallButton(bob.position)) {
    clearShirtHover();
    return;
  }
  raycaster.setFromCamera(pointerNdc, camera);
  hovered = Boolean(raycaster.intersectObject(activeElevator.callButton, false)[0]);
  activeElevator.setHighlighted(hovered);
  canvas.style.cursor = hovered ? 'pointer' : 'default';
  shirtTip.style.display = hovered ? 'block' : 'none';
  if (!hovered) return;
  if (activeElevator.state === 'calling' || activeElevator.state === 'opening') shirtTip.textContent = 'ABRIENDO ASCENSOR';
  else if (activeElevator.state === 'open' || activeElevator.state === 'arrived-open') shirtTip.textContent = 'PUERTAS ABIERTAS';
  else shirtTip.textContent = 'LLAMAR ASCENSOR';
}

function clearShirtHover() {
  hovered = false;
  activeElevator?.setHighlighted(false);
  activeDestinationRecord?.minigameArcade?.setHighlighted(false);
  canvas.style.cursor = 'default';
  shirtTip.style.display = 'none';
}

function callActiveElevator() {
  if (loading || elevatorPanel.isVisible() || worldEditor.isEnabled() || phone?.isOpen()
    || minigameManager.isOpen() || twentyTimeInteract?.isOpen()) return;
  activeElevator.call();
}

// E = pulsar el boton cuando BOB esta cerca.
function interactNearest() {
  if (loading || elevatorPanel.isVisible() || worldEditor.isEnabled() || phone?.isOpen()
    || minigameManager.isOpen() || twentyTimeInteract?.isOpen() || adminPanel?.isOpen()
    || productClicks.panel.isOpen() || carInteract?.isRadioOpen()) return false;
  if (carInteract?.getCurrentCar() && carInteract.interact(bob.position)) return true;
  if (activeElevator?.isNearCallButton(bob.position)) {
    callActiveElevator();
    return true;
  }
  if (carInteract?.interact(bob.position)) return true;
  if (world === 'street' && twentyTimeInteract?.interact(bob.position)) return true;
  if (activeDestinationRecord?.minigameArcade?.interact(bob.position)) return true;
  if (world === 'street' && streetWhiteLightSwitch.interact(bob.position)) return true;
  return productClicks.interactNearby(bob.position);
}

function hasNearbyInteraction() {
  if (loading || elevatorPanel.isVisible() || worldEditor.isEnabled() || phone?.isOpen()
    || minigameManager.isOpen() || twentyTimeInteract?.isOpen() || adminPanel?.isOpen()
    || productClicks.panel.isOpen() || carInteract?.isRadioOpen()) return false;
  return !!carInteract?.getCurrentCar()
    || !!activeElevator?.isNearCallButton(bob.position)
    || !!carInteract?.canInteract(bob.position)
    || (world === 'street' && twentyTimeInteract?.canInteract(bob.position))
    || !!activeDestinationRecord?.minigameArcade?.canInteract(bob.position)
    || (world === 'street' && streetWhiteLightSwitch.canInteract(bob.position))
    || productClicks.canInteractNearby(bob.position);
}

// ---- Pantalla de carga BOBILONIA + montaje del shopping ---------------------
const SHOP_BOUNDS = {
  minX: -INTERIOR.x, maxX: INTERIOR.x,
  minZ: -INTERIOR.z, maxZ: INTERIOR.z,
};
const CULTURA_PISO = 5;
let culturaIntroPlayed = false;

function startLoading(piso, label) {
  phone?.hide();
  twentyTimeInteract?.hide();
  loading = true;
  input.keys.clear();
  shirtTip.style.display = 'none';
  canvas.style.cursor = 'default';

  const isHoopSeason = piso === 3;
  const isBobCollection = piso === 4;
  const shouldPlayCulturaIntro = piso === CULTURA_PISO && !culturaIntroPlayed;
  loadingEl.classList.toggle('hoop-season', isHoopSeason);
  loadingEl.classList.toggle('bob-collection', isBobCollection);
  loadingEl.classList.toggle('cultura-intro', shouldPlayCulturaIntro);
  bobLoadingVideo.pause();
  bobLoadingVideo.muted = false;
  bobLoadingVideo.volume = 1;
  bobLoadingBarFill.style.width = '0%';
  music?.duck(true); // la radio baja mientras habla el video, no se corta

  if (isBobCollection || shouldPlayCulturaIntro) {
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
  if (shouldPlayCulturaIntro) {
    playCulturaIntro(ready, piso);
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
    music?.duck(false); // vuelve el volumen normal de la radio
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

function playCulturaIntro(ready, piso) {
  if (!culturaIntroVideo) {
    culturaIntroPlayed = true;
    enterShopping(ready, piso);
    finishLoadingUi();
    return;
  }

  culturaIntroPlayed = true;
  let done = false;

  const cleanup = () => {
    window.removeEventListener('keydown', onKeyDown, true);
    loadingEl.removeEventListener('click', skipIntro, true);
    culturaIntroVideo.onended = null;
    culturaIntroVideo.onerror = null;
    culturaIntroVideo.onstalled = null;
    culturaIntroVideo.onabort = null;
    culturaIntroVideo.pause();
  };

  const finish = () => {
    if (done) return;
    done = true;
    cleanup();
    input.keys.clear();
    enterShopping(ready, piso);
    finishLoadingUi();
  };

  const skipIntro = (event) => {
    event.preventDefault();
    event.stopPropagation();
    finish();
  };

  const onKeyDown = (event) => {
    if (event.code !== 'Escape') return;
    skipIntro(event);
  };

  window.addEventListener('keydown', onKeyDown, true);
  loadingEl.addEventListener('click', skipIntro, true);
  culturaIntroVideo.controls = false;
  culturaIntroVideo.muted = false;
  culturaIntroVideo.volume = 1;
  culturaIntroVideo.onended = finish;
  culturaIntroVideo.onerror = finish;
  culturaIntroVideo.onstalled = finish;
  culturaIntroVideo.onabort = finish;
  try { culturaIntroVideo.currentTime = 0; } catch {}
  const playPromise = culturaIntroVideo.play();
  if (playPromise?.catch) playPromise.catch(finish);
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
  carInteract?.exitCar(); // por si quedó sentado en un auto: nunca viajar trabado
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

// ---- Viaje por ascensor -----------------------------------------------------
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
let travelling = false;

async function handleElevatorEntered(elevator) {
  if (loading || elevator !== activeElevator) return;
  phone?.hide();
  loading = true;
  input.keys.clear();
  clearShirtHover();

  // BOB ya esta adentro: dos segundos quieto antes del cierre pedido.
  await wait(2000);
  if (elevator !== activeElevator) return;

  // La puerta y el fundido avanzan juntos. El panel aparece solamente cuando
  // ambos terminaron, como la mirada en primera persona de BOB.
  await Promise.all([
    elevator.closeDoors(),
    elevatorPanel.fadeToBlack(1000),
  ]);
  bob.rig.visible = false;
  bob.shadow.visible = false;
  elevatorPanel.show(currentDestinationId);
  await elevatorPanel.fadeFromBlack(1);
}

function activateDestination(destinationId) {
  const destination = getDestination(destinationId);
  if (!destination) throw new Error(`Destino de ascensor invalido: ${destinationId}`);

  if (activeDestinationRecord) {
    clearDestinationEditorSync(activeDestinationRecord);
    disposeDestinationScene(activeDestinationRecord, bob);
    activeDestinationRecord = null;
  }

  if (destination.kind === 'street') {
    scene.add(bob.rig, bob.shadow);
    activeScene = scene;
    activeElevator = streetElevator;
    colliders = streetColliders;
    world = 'street';
    bob.sampleGround = streetSampleGroundWithSteps;
    tpCam.bounds = STREET_BOUNDS;
    worldEditor.setScene(scene);
  } else {
    activeDestinationRecord = buildDestinationScene(destination.id, {
      environment: envTex,
      shadows: QUALITY === 'high' && !downgraded,
      onElevatorEnter: handleElevatorEntered,
      onArcadeInteract: () => minigameManager.show(() => createBobsMazeGame()),
    });
    activeDestinationRecord.scene.add(bob.rig, bob.shadow);
    activeScene = activeDestinationRecord.scene;
    activeElevator = activeDestinationRecord.elevator;
    colliders = activeDestinationRecord.colliders;
    world = 'destination';
    bob.sampleGround = activeDestinationRecord.sampleGround;
    tpCam.bounds = activeDestinationRecord.bounds;
    worldEditor.setScene(activeScene);
    setupDestinationEditor(activeDestinationRecord);
  }

  currentDestinationId = destination.id;
  activeElevator.placePlayerAtExit(bob);
  activeElevator.openDoors({ arrival: true, immediate: true });
  bob.vy = 0;
  bob.rig.visible = true;
  bob.shadow.visible = true;
  tpCam.yaw = bob.modelYaw + Math.PI;
  tpCam.targetYaw = tpCam.yaw;
  tpCam.focus.set(bob.position.x, bob.position.y + 1.15, bob.position.z);
  tpCam._first = true;
  lastZone = null;
  if (renderPass) renderPass.scene = activeScene;
  dayNight.update(true);
  renderer.shadowMap.needsUpdate = true;
  shadowRefreshAt.push(elapsed + 1.2, elapsed + 3.5);
}

async function travelToDestination(destinationId) {
  const destination = getDestination(destinationId);
  if (!destination || travelling) return;
  travelling = true;
  phone?.hide();
  loading = true;
  input.keys.clear();

  try {
    await elevatorPanel.fadeToBlack(500);
    elevatorPanel.hide();
    activateDestination(destination.id);
    await elevatorPanel.fadeFromBlack(500);
  } catch (error) {
    console.error('No se pudo completar el viaje en ascensor.', error);
    bob.rig.visible = true;
    bob.shadow.visible = true;
    elevatorPanel.hide();
    await elevatorPanel.fadeFromBlack(250);
  } finally {
    loading = false;
    travelling = false;
  }
}

window.__elevatorTest = {
  call: () => activeElevator.call(),
  openAndBoard: async () => {
    await activeElevator.openDoors({ immediate: true });
    activeElevator.placePlayerInside(bob);
  },
  travelTo: (destinationId) => travelToDestination(destinationId),
  openFirstProduct: () => productClicks.openFirst(),
  openOriginMinigame: () => currentDestinationId > 0
    && minigameManager.show(() => createBobsMazeGame()),
  getState: () => ({
    destinationId: currentDestinationId,
    destination: getDestination(currentDestinationId)?.label,
    elevatorState: activeElevator.state,
    panelVisible: elevatorPanel.isVisible(),
    productPanelVisible: productClicks.panel.isOpen(),
    phoneOpen: phone?.isOpen() ?? false,
    minigameOpen: minigameManager.isOpen(),
    arcadePresent: Boolean(activeDestinationRecord?.minigameArcade?.root?.parent),
    destinationStructureColliders: activeDestinationRecord?.dynamicColliders?.length ?? 0,
    cartCount: cart.getState().count,
    activeScene: activeScene.name || (world === 'street' ? 'Calle Burela' : ''),
    elevator: {
      position: activeElevator.root.position.toArray().map((value) => Number(value.toFixed(3))),
      callButton: activeElevator.getCallButtonWorldPosition().toArray().map((value) => Number(value.toFixed(3))),
      colliders: activeElevator.getColliders().length,
      doorProgress: Number(activeElevator.doorProgress.toFixed(3)),
    },
    scene: sceneStats(activeScene),
    dayNight: dayNight.getState(),
  }),
};

function initElevatorTestControls() {
  const params = new URLSearchParams(location.search);
  if (params.get('elevatorTest') !== '1' || params.get('debugUi') !== '1') return null;
  const root = document.createElement('div');
  root.id = 'elevator-test-controls';
  root.innerHTML = `
    <button type="button" data-action="call" data-testid="elevator-test-call">CALL</button>
    <button type="button" data-action="board" data-testid="elevator-test-board">BOARD</button>
    ${ELEVATOR_DESTINATIONS.map((destination) => `<button type="button" data-destination="${destination.id}" data-testid="elevator-test-go-${destination.id}">${destination.id}</button>`).join('')}
    <button type="button" data-action="product" data-testid="elevator-test-product">PRODUCTO</button>
    <output id="elevator-test-state"></output>
  `;
  root.addEventListener('click', (event) => {
    const button = event.target.closest('button');
    if (!button) return;
    if (button.dataset.action === 'call') window.__elevatorTest.call();
    else if (button.dataset.action === 'board') window.__elevatorTest.openAndBoard();
    else if (button.dataset.action === 'product') window.__elevatorTest.openFirstProduct();
    else if (button.dataset.destination !== undefined) window.__elevatorTest.travelTo(Number(button.dataset.destination));
  });
  document.body.append(root);
  return root.querySelector('#elevator-test-state');
}

const elevatorTestState = initElevatorTestControls();
function updateElevatorTestState() {
  if (!elevatorTestState) return;
  elevatorTestState.value = JSON.stringify(window.__elevatorTest.getState());
}

// Sombras congeladas: todo lo que proyecta sombra es estático (BOB usa sombra
// blob), así que las shadow maps se calculan UNA vez en lugar de 60 por segundo.
// Se refrescan un par de veces al inicio para capturar el GLB que carga async.
renderer.shadowMap.autoUpdate = false;
renderer.shadowMap.needsUpdate = true;
const shadowRefreshAt = [1.5, 4, 8]; // segundos
let elapsed = 0;
let editorWasActive = false;
let nextMobileInteractionCheck = 0;
let mobileInteractionAvailable = false;

const timer = new THREE.Timer();
let lastZone = null;
renderer.setAnimationLoop(() => {
  timer.update();
  const rawDt = timer.getDelta();
  checkPerf(rawDt);
  const dt = Math.min(rawDt, 0.05);
  elapsed += dt;
  dayNight.update();
  if (shadowRefreshAt.length && elapsed > shadowRefreshAt[0]) {
    renderer.shadowMap.needsUpdate = true;
    shadowRefreshAt.shift();
  }

  const editorActive = worldEditor.isEnabled();
  if (renderer.shadowMap.enabled && (editorActive || editorWasActive)) {
    renderer.shadowMap.needsUpdate = true;
  }
  editorWasActive = editorActive;
  // sentado en un auto BOB no se mueve con WASD (lo clava carInteract.update)
  const seated = !!carInteract?.isPlayerLocked();
  const phoneOpen = !!phone?.isOpen();
  const minigameOpen = minigameManager.isOpen();
  const twentyTimeOpen = !!twentyTimeInteract?.isOpen();
  if (!loading && !editorActive && !seated && !phoneOpen && !minigameOpen && !twentyTimeOpen) {
    bob.update(dt, input, tpCam.yaw, currentPlayerColliders(), camera.position);
  }
  carInteract?.update(dt); // puertas de los autos + BOB pegado a la butaca
  activeElevator?.update(dt, bob.position);
  const mobileSuppressed = loading || elevatorPanel.isVisible() || editorActive
    || minigameOpen || twentyTimeOpen || !!adminPanel?.isOpen() || productClicks.panel.isOpen();
  if (elapsed >= nextMobileInteractionCheck) {
    mobileInteractionAvailable = hasNearbyInteraction();
    nextMobileInteractionCheck = elapsed + 0.15;
  }
  mobileControls.setState({
    suppressed: mobileSuppressed,
    phoneOpen,
    interactionAvailable: mobileInteractionAvailable,
    canMove: !seated,
  });
  // E: adentro del auto abre la radio (lo maneja carInteract), afuera es el
  // pulsador del ascensor. Se consume igual para que no quede trabado.
  if (editorActive || seated || phoneOpen || minigameOpen || twentyTimeOpen) input.consumeInteract();
  else if (input.consumeInteract()) interactNearest(); // E = boton exterior del ascensor
  if (editorActive || phoneOpen || minigameOpen || twentyTimeOpen) clearShirtHover();
  else updateHover();      // feedback del pulsador bajo el mouse
  tickAmbient(dt);         // displays giratorios

  let floorY, ceiling, zoneName;
  if (world === 'street') {
    const inside = isInsideLocal(bob.position);
    zoneName = inside ? 'FOURTWENTY' : 'CALLE BURELA';
    // adentro: cámara acotada al local, techo bajo; afuera: cielo abierto.
    tpCam.bounds = inside ? LOCAL_BOUNDS : STREET_BOUNDS;
    floorY = streetSampleGroundWithSteps(bob.position.x, bob.position.z);
    ceiling = inside ? CEILING_IN : CEILING_OUT;
    hud.setZone(zoneName);
  } else {
    const destination = getDestination(currentDestinationId);
    zoneName = destination?.hudLabel ?? 'FOURTWENTY';
    floorY = 0;
    ceiling = activeDestinationRecord?.ceiling ?? 3.4;
    hud.setFloor(destination?.id ?? 0, zoneName);
  }
  if (zoneName !== lastZone) {
    hud.showZoneTitle(zoneName); // cartel de zona estilo GTA V
    lastZone = zoneName;
  }
  if (!editorActive) tpCam.update(dt, bob.position, floorY, bob.modelYaw, ceiling);

  if (composer) composer.render();
  else renderer.render(activeScene, camera);
  updateElevatorTestState();
});
