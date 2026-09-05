import * as THREE from 'three';
import { clone as cloneSkeleton } from 'three/addons/utils/SkeletonUtils.js';
import { loadFurnitureModel } from '../world/furniture.js';
import './packageStationMission.css';

const DEFAULTS = Object.freeze({
  duration: 120,
  playerHealth: 5,
  policeCount: 5,
  policeHealth: 3,
  policeSpeed: 2.05,
  policeAggroDistance: 10,
  policeShootDistance: 15,
  policeFireInterval: 2.8,
});

const DEFAULT_STATION = new THREE.Vector3(-12.9, -6, 75.6);
const LOCAL_PLATFORM_Y = 0.45;
const LOCAL_FACADE_Z = -4.46;
const LOCAL_BACK_Z = -10.46;
const PACKAGE_PICKUP_DISTANCE = 1.75;
const tempDirection = new THREE.Vector3();
const tempShotStart = new THREE.Vector3();
const tempShotEnd = new THREE.Vector3();

function horizontalDistance(a, b) {
  return Math.hypot(a.x - b.x, a.z - b.z);
}

function formatTime(seconds) {
  const safe = Math.max(0, Math.ceil(seconds));
  return `${Math.floor(safe / 60)}:${String(safe % 60).padStart(2, '0')}`;
}

export function createPackageStationMission({
  scene,
  camera,
  canvas,
  player,
  uiContainer = document.body,
  stationPosition = DEFAULT_STATION,
  onExit = () => {},
  config = {},
} = {}) {
  const settings = { ...DEFAULTS, ...config };
  const station = stationPosition?.clone?.() ?? DEFAULT_STATION.clone();
  const rampStartZ = 44;
  const rampEndZ = Math.max(rampStartZ + 14, station.z - 12);
  const lowerY = Math.min(-1.5, station.y);
  const routeEndZ = Math.max(rampEndZ + 18, station.z + 10);
  const bounds = Object.freeze({ minX: -24, maxX: 24, minZ: LOCAL_BACK_Z - 0.6, maxZ: routeEndZ });
  const deliveryPosition = new THREE.Vector3(0, lowerY + 0.08, station.z - 14);
  const packagePosition = new THREE.Vector3(-0.6, 1.66, -8.78);

  const root = new THREE.Group();
  root.name = 'MISION · paquete a la estacion';
  const environment = new THREE.Group();
  // ⚠️ LA ESTACION AHORA VIVE ACA, no en Burela (10/08).
  // Estaba puesta en el mundo solo para que esta mision tuviera adonde entregar,
  // y le costaba a TODOS los jugadores 1,5 MB de descarga, 227.222 triangulos y
  // 42 llamadas de dibujo — incluso a los que nunca abren el juego. Ahora se
  // baja cuando se abre la mision y desaparece con ella.
  // Va sin await a proposito: el juego arranca igual y la estacion aparece
  // cuando termina de bajar, como el resto de los GLB del proyecto.
  let estacion = null;
  loadFurnitureModel('/assets/furniture/tram-station.glb')
    .then((gltf) => {
      if (!environment.parent) return;   // la mision se cerro mientras bajaba
      estacion = gltf.scene.clone(true);
      estacion.name = 'MISION · estacion de tranvia';
      estacion.position.copy(station);
      estacion.traverse((o) => { if (o.isMesh) { o.castShadow = false; o.receiveShadow = true; } });
      environment.add(estacion);
    })
    .catch((error) => console.warn('No se pudo cargar la estacion de la mision.', error));
  const actors = new THREE.Group();
  const effects = new THREE.Group();
  root.add(environment, actors, effects);

  const ownedGeometries = new Set();
  const ownedMaterials = new Set();
  const enemies = [];
  const shotEffects = [];
  const colliders = [];
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  let packageRoot = null;
  let carriedPackage = null;
  let deliveryRing = null;
  let ui = null;
  let objectiveEl = null;
  let timerEl = null;
  let healthEl = null;
  let toastEl = null;
  let resultEl = null;
  let resultTitle = null;
  let reticle = null;
  let bananaBlaster = null;
  let firePoseTimer = 0;
  let shotAudioContext = null;
  let blasterAnchor = null;
  let upperArmBone = null;
  let foreArmBone = null;
  let handBone = null;
  let upperArmBaseRotation = null;
  let foreArmBaseRotation = null;
  let handBaseRotation = null;
  let toastTimer = 0;
  let reticleTimer = 0;
  let active = false;
  let paused = false;
  let outcome = null;
  let hasPackage = false;
  let timeLeft = settings.duration;
  let health = settings.playerHealth;
  let playerDamageCooldown = 0;
  let elapsed = 0;

  function ownGeometry(geometry) {
    ownedGeometries.add(geometry);
    return geometry;
  }

  function ownMaterial(material) {
    ownedMaterials.add(material);
    return material;
  }

  function makeBox(width, height, depth, x, y, z, material, parent = environment) {
    const mesh = new THREE.Mesh(ownGeometry(new THREE.BoxGeometry(width, height, depth)), material);
    mesh.position.set(x, y, z);
    mesh.receiveShadow = false;
    mesh.castShadow = false;
    parent.add(mesh);
    return mesh;
  }

  function sampleGround(_x, z) {
    if (z <= LOCAL_FACADE_Z) return LOCAL_PLATFORM_Y;
    if (z <= rampStartZ) return 0;
    if (z >= rampEndZ) return lowerY;
    return THREE.MathUtils.lerp(0, lowerY, (z - rampStartZ) / (rampEndZ - rampStartZ));
  }

  function buildRoute() {
    const asphalt = ownMaterial(new THREE.MeshStandardMaterial({ color: 0x34373a, roughness: 0.96 }));
    const concrete = ownMaterial(new THREE.MeshStandardMaterial({ color: 0x7b7e7a, roughness: 0.9 }));
    const lineMaterial = ownMaterial(new THREE.MeshBasicMaterial({ color: 0xd2bd58 }));
    const fenceMaterial = ownMaterial(new THREE.MeshStandardMaterial({ color: 0x354a40, roughness: 0.7, metalness: 0.25 }));

    const upperStartZ = 14;
    makeBox(40, 0.12, rampStartZ - upperStartZ, 0, -0.08, (upperStartZ + rampStartZ) / 2, asphalt);

    const horizontalRamp = rampEndZ - rampStartZ;
    const rampLength = Math.hypot(horizontalRamp, lowerY);
    const ramp = makeBox(40, 0.13, rampLength, 0, lowerY / 2 - 0.06, (rampStartZ + rampEndZ) / 2, asphalt);
    ramp.rotation.x = Math.atan2(-lowerY, horizontalRamp);

    makeBox(40, 0.14, routeEndZ - rampEndZ, 0, lowerY - 0.08, (rampEndZ + routeEndZ) / 2, concrete);

    for (const x of [-5.5, 5.5]) {
      makeBox(0.1, 0.025, rampStartZ - upperStartZ - 1, x, 0.015, (upperStartZ + rampStartZ) / 2, lineMaterial);
      makeBox(0.1, 0.025, routeEndZ - rampEndZ - 1, x, lowerY + 0.015, (rampEndZ + routeEndZ) / 2, lineMaterial);
    }

    const railHeight = 0.72;
    const upperLength = rampStartZ - upperStartZ;
    const lowerLength = routeEndZ - rampEndZ;
    for (const x of [-20.2, 20.2]) {
      makeBox(0.12, railHeight, upperLength, x, railHeight / 2, (upperStartZ + rampStartZ) / 2, fenceMaterial);
      const rampRail = makeBox(
        0.12,
        railHeight,
        rampLength,
        x,
        lowerY / 2 + railHeight / 2,
        (rampStartZ + rampEndZ) / 2,
        fenceMaterial,
      );
      rampRail.rotation.x = Math.atan2(-lowerY, horizontalRamp);
      makeBox(0.12, railHeight, lowerLength, x, lowerY + railHeight / 2, (rampEndZ + routeEndZ) / 2, fenceMaterial);
    }

    colliders.push(
      { minX: -24.5, maxX: -23.6, minY: lowerY - 1, maxY: 4, minZ: -2, maxZ: routeEndZ },
      { minX: 23.6, maxX: 24.5, minY: lowerY - 1, maxY: 4, minZ: -2, maxZ: routeEndZ },
      { minX: -24.5, maxX: 24.5, minY: lowerY - 1, maxY: 4, minZ: routeEndZ, maxZ: routeEndZ + 0.8 },
    );

    // El paquete se apoya en el mostrador real del local construido a mano
    // en Calle Burela; no se agrega una mesa nueva dentro de la misión.
  }

  function buildPackageAndDelivery() {
    const parcelMaterial = ownMaterial(new THREE.MeshStandardMaterial({ color: 0x9b7244, roughness: 0.78 }));
    const bandMaterial = ownMaterial(new THREE.MeshStandardMaterial({ color: 0x32bd62, roughness: 0.55 }));
    packageRoot = new THREE.Group();
    packageRoot.name = 'MISION · paquete escondido';
    makeBox(0.58, 0.36, 0.42, 0, 0, 0, parcelMaterial, packageRoot);
    makeBox(0.16, 0.38, 0.44, 0, 0.01, 0, bandMaterial, packageRoot);
    packageRoot.position.copy(packagePosition);
    environment.add(packageRoot);

    carriedPackage = packageRoot.clone(true);
    carriedPackage.scale.setScalar(0.72);
    carriedPackage.position.set(0, 1.08, -0.28);
    carriedPackage.rotation.x = -0.18;
    carriedPackage.visible = false;
    player.rig.add(carriedPackage);

    deliveryRing = new THREE.Group();
    deliveryRing.name = 'MISION · zona amarilla de entrega';
    const deliveryFill = new THREE.Mesh(
      ownGeometry(new THREE.CircleGeometry(4.2, 40)),
      ownMaterial(new THREE.MeshBasicMaterial({
        color: 0xf0d34c,
        transparent: true,
        opacity: 0.22,
        depthWrite: false,
        side: THREE.DoubleSide,
      })),
    );
    deliveryFill.rotation.x = -Math.PI / 2;
    const deliveryOutline = new THREE.Mesh(
      ownGeometry(new THREE.TorusGeometry(4.2, 0.11, 8, 48)),
      ownMaterial(new THREE.MeshBasicMaterial({ color: 0xffdf38, transparent: true, opacity: 0.95 })),
    );
    deliveryOutline.rotation.x = Math.PI / 2;
    deliveryOutline.position.y = 0.025;
    deliveryRing.add(deliveryFill, deliveryOutline);
    const beaconMaterial = ownMaterial(new THREE.MeshBasicMaterial({
      color: 0xffd728,
      transparent: true,
      opacity: 0.48,
      depthWrite: false,
    }));
    for (const x of [-3.8, 3.8]) {
      const beacon = new THREE.Mesh(ownGeometry(new THREE.CylinderGeometry(0.07, 0.2, 3.4, 10)), beaconMaterial);
      beacon.position.set(x, 1.7, 0);
      deliveryRing.add(beacon);
    }
    deliveryRing.position.copy(deliveryPosition);
    deliveryRing.visible = false;
    environment.add(deliveryRing);
  }

  function findPlayerBone(name) {
    let found = null;
    player.model?.traverse?.((object) => {
      if (!found && object.isBone && object.name === name) found = object;
    });
    return found;
  }

  function buildBananaBlaster() {
    const yellow = ownMaterial(new THREE.MeshStandardMaterial({ color: 0xffcf25, roughness: 0.54 }));
    const yellowDark = ownMaterial(new THREE.MeshStandardMaterial({ color: 0xd99a16, roughness: 0.72 }));
    const black = ownMaterial(new THREE.MeshStandardMaterial({ color: 0x141414, roughness: 0.62, metalness: 0.18 }));
    const glow = ownMaterial(new THREE.MeshBasicMaterial({ color: 0x8fe9ff, transparent: true, opacity: 0.86 }));

    function blasterMesh(geometry, material) {
      const mesh = new THREE.Mesh(ownGeometry(geometry), material);
      mesh.castShadow = false;
      mesh.receiveShadow = false;
      mesh.frustumCulled = false;
      return mesh;
    }

    upperArmBone = findPlayerBone('R_Upperarm');
    foreArmBone = findPlayerBone('R_Forearm');
    handBone = findPlayerBone('R_Hand');
    if (upperArmBone) upperArmBaseRotation = upperArmBone.rotation.clone();
    if (foreArmBone) foreArmBaseRotation = foreArmBone.rotation.clone();
    if (handBone) handBaseRotation = handBone.rotation.clone();

    bananaBlaster = new THREE.Group();
    bananaBlaster.name = 'MISION · banana blaster';
    bananaBlaster.visible = false;

    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-0.09, -0.01, 0.11),
      new THREE.Vector3(-0.04, 0.035, -0.02),
      new THREE.Vector3(0.06, 0.018, -0.15),
      new THREE.Vector3(0.13, -0.035, -0.26),
    ]);
    const body = blasterMesh(new THREE.TubeGeometry(curve, 20, 0.024, 9, false), yellow);
    const stripe = blasterMesh(new THREE.TubeGeometry(curve, 20, 0.0075, 7, false), yellowDark);
    stripe.position.y = -0.02;
    const tip = blasterMesh(new THREE.SphereGeometry(0.03, 10, 8), yellowDark);
    tip.position.set(0.135, -0.035, -0.265);
    const back = blasterMesh(new THREE.SphereGeometry(0.025, 10, 8), yellow);
    back.position.set(-0.09, -0.01, 0.11);

    const muzzle = blasterMesh(new THREE.CylinderGeometry(0.014, 0.018, 0.07, 10), black);
    muzzle.rotation.x = Math.PI / 2;
    muzzle.position.set(0.145, -0.035, -0.305);
    const lens = blasterMesh(new THREE.SphereGeometry(0.014, 10, 8), glow);
    lens.position.set(0.145, -0.035, -0.348);

    const handle = blasterMesh(new THREE.BoxGeometry(0.04, 0.12, 0.05), black);
    handle.position.set(0.025, -0.09, -0.1);
    handle.rotation.x = -0.34;
    const triggerGuard = blasterMesh(new THREE.TorusGeometry(0.025, 0.0045, 6, 12), black);
    triggerGuard.position.set(0.045, -0.045, -0.13);
    triggerGuard.rotation.x = Math.PI / 2;
    const sight = blasterMesh(new THREE.BoxGeometry(0.055, 0.012, 0.02), black);
    sight.position.set(0.02, 0.055, -0.12);

    bananaBlaster.add(body, stripe, tip, back, muzzle, lens, handle, triggerGuard, sight);
    blasterAnchor = handBone ?? player.rig;
    blasterAnchor.add(bananaBlaster);
    if (handBone) {
      bananaBlaster.position.set(0.025, 0.02, 0.02);
      bananaBlaster.rotation.set(1.48, 0.2, -1.52);
    } else {
      bananaBlaster.position.set(0.34, 1.05, 0.22);
      bananaBlaster.rotation.set(-0.18, -0.18, -0.28);
    }
  }

  function updateBananaBlaster(dt) {
    if (!bananaBlaster) return;
    bananaBlaster.visible = active && !paused && !outcome;
    const pose = firePoseTimer > 0 ? Math.min(1, firePoseTimer / 0.16) : 0;
    firePoseTimer = Math.max(0, firePoseTimer - dt);
    if (!upperArmBone && !foreArmBone && !handBone) return;

    if (upperArmBone && upperArmBaseRotation) {
      upperArmBone.rotation.set(
        upperArmBaseRotation.x - 0.82 * pose,
        upperArmBaseRotation.y + 0.12 * pose,
        upperArmBaseRotation.z - 0.32 * pose,
      );
    }
    if (foreArmBone && foreArmBaseRotation) {
      foreArmBone.rotation.set(
        foreArmBaseRotation.x - 0.55 * pose,
        foreArmBaseRotation.y,
        foreArmBaseRotation.z - 0.12 * pose,
      );
    }
    if (handBone && handBaseRotation) {
      handBone.rotation.set(
        handBaseRotation.x,
        handBaseRotation.y + 0.18 * pose,
        handBaseRotation.z,
      );
    }
  }

  function tagEnemyMeshes(group, enemy) {
    group.traverse((object) => {
      if (!object.isMesh) return;
      object.castShadow = false;
      object.receiveShadow = false;
      object.userData.missionEnemy = enemy;
    });
  }

  function fallbackBobVisual() {
    const group = new THREE.Group();
    const skin = ownMaterial(new THREE.MeshStandardMaterial({ color: 0xb8794b, roughness: 0.8 }));
    const dark = ownMaterial(new THREE.MeshStandardMaterial({ color: 0x17253a, roughness: 0.72 }));
    const head = new THREE.Mesh(ownGeometry(new THREE.SphereGeometry(0.25, 10, 8)), skin);
    head.position.y = 1.48;
    const body = new THREE.Mesh(ownGeometry(new THREE.BoxGeometry(0.5, 0.72, 0.3)), dark);
    body.position.y = 0.94;
    const legs = new THREE.Mesh(ownGeometry(new THREE.BoxGeometry(0.42, 0.66, 0.24)), dark);
    legs.position.y = 0.28;
    group.add(head, body, legs);
    return group;
  }

  function createPolice(index, position) {
    const enemy = {
      index,
      health: settings.policeHealth,
      dead: false,
      attackCooldown: 0,
      shootCooldown: 0.9 + index * 0.38,
      hitFlash: 0,
      phase: index * 1.37,
      materials: [],
      spawnPosition: position.clone(),
      root: new THREE.Group(),
      visual: new THREE.Group(),
    };
    enemy.root.name = `MISION · BOB policia ${index + 1}`;
    enemy.root.position.copy(position);
    enemy.root.position.y = sampleGround(position.x, position.z);

    let bobVisual = null;
    if (player.model) {
      try {
        bobVisual = cloneSkeleton(player.model);
        bobVisual.position.y = 0;
      } catch {
        bobVisual = null;
      }
    }
    enemy.visual.add(bobVisual ?? fallbackBobVisual());

    const uniformMaterial = ownMaterial(new THREE.MeshStandardMaterial({ color: 0x142b4d, roughness: 0.64 }));
    const badgeMaterial = ownMaterial(new THREE.MeshBasicMaterial({ color: 0xe7ca55 }));
    enemy.materials.push(uniformMaterial, badgeMaterial);
    const vest = new THREE.Mesh(ownGeometry(new THREE.BoxGeometry(0.62, 0.64, 0.34)), uniformMaterial);
    vest.position.set(0, 0.96, 0.02);
    const cap = new THREE.Mesh(ownGeometry(new THREE.CylinderGeometry(0.27, 0.29, 0.16, 12)), uniformMaterial);
    cap.position.set(0, 1.66, 0);
    const visor = new THREE.Mesh(ownGeometry(new THREE.BoxGeometry(0.3, 0.05, 0.23)), uniformMaterial);
    visor.position.set(0, 1.61, 0.2);
    const badge = new THREE.Mesh(ownGeometry(new THREE.BoxGeometry(0.09, 0.12, 0.025)), badgeMaterial);
    badge.position.set(0.18, 1.08, 0.205);
    const weaponMaterial = ownMaterial(new THREE.MeshStandardMaterial({ color: 0x17191b, roughness: 0.46, metalness: 0.35 }));
    const weapon = new THREE.Mesh(ownGeometry(new THREE.BoxGeometry(0.11, 0.13, 0.42)), weaponMaterial);
    weapon.position.set(0.31, 0.88, 0.3);
    weapon.rotation.x = -0.16;
    enemy.visual.add(vest, cap, visor, badge, weapon);

    const shadow = new THREE.Mesh(
      ownGeometry(new THREE.CircleGeometry(0.47, 16)),
      ownMaterial(new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.27, depthWrite: false })),
    );
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = 0.015;
    enemy.root.add(shadow, enemy.visual);
    tagEnemyMeshes(enemy.root, enemy);
    enemies.push(enemy);
    actors.add(enemy.root);
  }

  function spawnPolice() {
    const midpoint = (rampStartZ + rampEndZ) / 2;
    const spawns = [
      new THREE.Vector3(-8.5, 0, 22),
      new THREE.Vector3(8, 0, 29),
      new THREE.Vector3(-10.5, 0, 39),
      new THREE.Vector3(7.5, 0, midpoint),
      new THREE.Vector3(deliveryPosition.x + 7, 0, deliveryPosition.z - 2),
    ];
    if (enemies.length) {
      for (const enemy of enemies) {
        enemy.health = settings.policeHealth;
        enemy.dead = false;
        enemy.attackCooldown = 0;
        enemy.shootCooldown = 0.9 + enemy.index * 0.38;
        enemy.hitFlash = 0;
        enemy.root.position.copy(enemy.spawnPosition);
        enemy.root.position.y = sampleGround(enemy.root.position.x, enemy.root.position.z);
        enemy.root.rotation.set(0, 0, 0);
        enemy.visual.position.y = 0;
      }
      return;
    }
    for (let index = 0; index < Math.min(settings.policeCount, spawns.length); index++) {
      createPolice(index, spawns[index]);
    }
  }

  function buildUi() {
    ui = document.createElement('section');
    ui.id = 'package-station-mission';
    ui.innerHTML = `
      <div class="mission-topbar">
        <div class="mission-objective" data-objective>ENCONTRA EL PAQUETE</div>
        <div class="mission-stat">TIEMPO<strong data-time>2:00</strong></div>
        <div class="mission-stat">VIDA<strong data-health>5</strong></div>
      </div>
      <div class="mission-reticle" aria-hidden="true"></div>
      <div class="mission-toast" role="status"></div>
      <div class="mission-result" hidden>
        <small data-result-kicker>MISION</small>
        <h2 data-result-title></h2>
        <div class="mission-result-actions">
          <button type="button" data-action="retry">REINTENTAR</button>
          <button type="button" data-action="exit">VOLVER</button>
        </div>
      </div>
    `;
    uiContainer.append(ui);
    objectiveEl = ui.querySelector('[data-objective]');
    timerEl = ui.querySelector('[data-time]');
    healthEl = ui.querySelector('[data-health]');
    toastEl = ui.querySelector('.mission-toast');
    resultEl = ui.querySelector('.mission-result');
    resultTitle = ui.querySelector('[data-result-title]');
    reticle = ui.querySelector('.mission-reticle');
    reticle.style.left = '50%';
    reticle.style.top = '50%';
    ui.addEventListener('click', onUiClick);
  }

  function showToast(message) {
    toastEl.textContent = message;
    toastEl.classList.add('show');
    toastTimer = 2.2;
  }

  function updateHud() {
    timerEl.textContent = formatTime(timeLeft);
    healthEl.textContent = String(Math.max(0, health));
    objectiveEl.textContent = hasPackage
      ? 'LLEVA EL PAQUETE A LA ZONA AMARILLA DE LA ESTACION'
      : 'ENCONTRA EL PAQUETE';
  }

  function reset() {
    outcome = null;
    hasPackage = false;
    timeLeft = settings.duration;
    health = settings.playerHealth;
    playerDamageCooldown = 1.25;
    elapsed = 0;
    toastTimer = 0;
    firePoseTimer = 0;
    resultEl.hidden = true;
    packageRoot.visible = true;
    carriedPackage.visible = false;
    deliveryRing.visible = false;
    player.velocity.set(0, 0, 0);
    player.position.set(0, sampleGround(0, 12), 12);
    player.modelYaw = 0;
    player.rig.rotation.y = 0;
    player.vy = 0;
    spawnPolice();
    updateHud();
    active = true;
    paused = false;
    showToast('MISION INICIADA');
  }

  function finish(result) {
    if (outcome) return;
    outcome = result;
    active = false;
    if (bananaBlaster) bananaBlaster.visible = false;
    resultTitle.textContent = result === 'win' ? 'PAQUETE ENTREGADO' : 'MISION FALLIDA';
    resultEl.querySelector('[data-result-kicker]').textContent = result === 'win' ? 'OBJETIVO CUMPLIDO' : 'INTENTALO DE NUEVO';
    resultEl.hidden = false;
  }

  function pickupPackage() {
    if (hasPackage) return;
    hasPackage = true;
    packageRoot.visible = false;
    carriedPackage.visible = true;
    deliveryRing.visible = true;
    showToast('PAQUETE ENCONTRADO');
    updateHud();
  }

  function addShotEffect(start, end, hit, color = null, duration = 0.09) {
    const geometry = ownGeometry(new THREE.BufferGeometry().setFromPoints([start, end]));
    const material = ownMaterial(new THREE.LineBasicMaterial({
      color: color ?? (hit ? 0xff493f : 0xf4df78),
      transparent: true,
      opacity: 0.9,
    }));
    const line = new THREE.Line(geometry, material);
    effects.add(line);
    shotEffects.push({ line, geometry, material, life: duration, duration });
  }

  function damagePlayer(message, cooldown) {
    if (playerDamageCooldown > 0 || outcome) return;
    health -= 1;
    playerDamageCooldown = cooldown;
    showToast(message);
    updateHud();
    if (health <= 0) finish('lose');
  }

  function firePoliceShot(enemy, distance) {
    enemy.shootCooldown = settings.policeFireInterval + ((enemy.index * 0.47 + elapsed) % 0.9);
    tempShotStart.copy(enemy.root.position).add(new THREE.Vector3(0.28, 1.05, 0));
    tempShotEnd.copy(player.position).add(new THREE.Vector3(0, 1.02, 0));
    const accuracy = THREE.MathUtils.clamp(0.22 + (1 - distance / settings.policeShootDistance) * 0.34, 0.22, 0.56);
    const hit = Math.random() < accuracy;
    if (!hit) {
      tempShotEnd.x += (Math.random() - 0.5) * 4.5;
      tempShotEnd.y += (Math.random() - 0.5) * 2.2;
      tempShotEnd.z += (Math.random() - 0.5) * 3.5;
    }
    addShotEffect(tempShotStart.clone(), tempShotEnd.clone(), hit, 0xff332d, 0.18);
    if (hit) damagePlayer('LA POLICIA LE DISPARO A BOB', 1.65);
  }

  function playPlayerShotSound() {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;
    if (!shotAudioContext) shotAudioContext = new AudioContextClass();
    const context = shotAudioContext;
    if (context.state === 'suspended') context.resume();

    const now = context.currentTime;
    const master = context.createGain();
    const filter = context.createBiquadFilter();
    const laser = context.createOscillator();
    const sparkle = context.createOscillator();

    master.gain.setValueAtTime(0.0001, now);
    master.gain.linearRampToValueAtTime(0.16, now + 0.008);
    master.gain.exponentialRampToValueAtTime(0.0001, now + 0.22);

    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1600, now);
    filter.frequency.exponentialRampToValueAtTime(360, now + 0.18);
    filter.Q.setValueAtTime(5.8, now);

    laser.type = 'sawtooth';
    laser.frequency.setValueAtTime(980, now);
    laser.frequency.exponentialRampToValueAtTime(130, now + 0.2);

    sparkle.type = 'square';
    sparkle.frequency.setValueAtTime(1840, now);
    sparkle.frequency.exponentialRampToValueAtTime(520, now + 0.11);

    laser.connect(filter);
    sparkle.connect(filter);
    filter.connect(master);
    master.connect(context.destination);
    laser.start(now);
    sparkle.start(now + 0.006);
    laser.stop(now + 0.24);
    sparkle.stop(now + 0.13);
  }

  function shoot(event) {
    if (!active || paused || outcome || event.button !== 0) return false;
    playPlayerShotSound();
    firePoseTimer = 0.28;
    const rect = canvas.getBoundingClientRect();
    pointer.set(
      ((event.clientX - rect.left) / rect.width) * 2 - 1,
      -((event.clientY - rect.top) / rect.height) * 2 + 1,
    );
    raycaster.setFromCamera(pointer, camera);
    const targets = [];
    for (const enemy of enemies) {
      if (!enemy.dead) targets.push(enemy.root);
    }
    const hit = raycaster.intersectObjects(targets, true)[0];
    const end = hit?.point?.clone() ?? raycaster.ray.origin.clone().addScaledVector(raycaster.ray.direction, 80);
    addShotEffect(raycaster.ray.origin.clone(), end, Boolean(hit));
    if (!hit) return true;

    const enemy = hit.object.userData.missionEnemy;
    if (!enemy || enemy.dead) return true;
    enemy.health -= 1;
    enemy.hitFlash = 0.12;
    reticle.classList.add('hit');
    reticleTimer = 0.12;
    if (enemy.health <= 0) {
      enemy.dead = true;
      enemy.attackCooldown = Infinity;
      showToast('POLICIA FUERA DE COMBATE');
    }
    return true;
  }

  function updatePolice(dt) {
    playerDamageCooldown = Math.max(0, playerDamageCooldown - dt);
    for (const enemy of enemies) {
      enemy.attackCooldown = Math.max(0, enemy.attackCooldown - dt);
      enemy.shootCooldown = Math.max(0, enemy.shootCooldown - dt);
      enemy.hitFlash = Math.max(0, enemy.hitFlash - dt);
      for (const material of enemy.materials) {
        if (material.color) material.emissive?.setHex(enemy.hitFlash > 0 ? 0x8f0909 : 0x000000);
      }

      if (enemy.dead) {
        enemy.root.rotation.z += (1.28 - enemy.root.rotation.z) * Math.min(1, dt * 6);
        continue;
      }

      const distance = horizontalDistance(enemy.root.position, player.position);
      const shouldChase = hasPackage || distance <= settings.policeAggroDistance;
      const approachDistance = hasPackage ? 4.2 : 2.4;
      if (shouldChase) {
        tempDirection.set(
          player.position.x - enemy.root.position.x,
          0,
          player.position.z - enemy.root.position.z,
        ).normalize();
        enemy.root.rotation.y = Math.atan2(tempDirection.x, tempDirection.z);
        if (distance > approachDistance) {
          const speed = settings.policeSpeed * (hasPackage ? 1.12 : 1);
          enemy.root.position.addScaledVector(tempDirection, speed * dt);
        }
        if (distance <= settings.policeShootDistance && enemy.shootCooldown <= 0) {
          firePoliceShot(enemy, distance);
        }
      }
      enemy.root.position.x = THREE.MathUtils.clamp(enemy.root.position.x, bounds.minX + 1, bounds.maxX - 1);
      enemy.root.position.z = THREE.MathUtils.clamp(enemy.root.position.z, bounds.minZ + 1, bounds.maxZ - 1);
      enemy.root.position.y = sampleGround(enemy.root.position.x, enemy.root.position.z);
      enemy.visual.position.y = Math.abs(Math.sin(elapsed * 7 + enemy.phase)) * (shouldChase ? 0.035 : 0.012);

      if (distance < 1.18 && enemy.attackCooldown <= 0 && playerDamageCooldown <= 0) {
        enemy.attackCooldown = 1.15;
        tempDirection.set(
          enemy.root.position.x - player.position.x,
          0,
          enemy.root.position.z - player.position.z,
        );
        if (tempDirection.lengthSq() > 0.001) {
          enemy.root.position.addScaledVector(tempDirection.normalize(), 0.8);
        }
        damagePlayer('BOB RECIBIO UN GOLPE', 1.05);
      }
    }
  }

  function updateEffects(dt) {
    for (let index = shotEffects.length - 1; index >= 0; index--) {
      const effect = shotEffects[index];
      effect.life -= dt;
      effect.material.opacity = Math.max(0, effect.life / effect.duration);
      if (effect.life > 0) continue;
      effects.remove(effect.line);
      effect.geometry.dispose();
      effect.material.dispose();
      ownedGeometries.delete(effect.geometry);
      ownedMaterials.delete(effect.material);
      shotEffects.splice(index, 1);
    }
  }

  function onPointerMove(event) {
    if (!reticle) return;
    reticle.style.left = `${event.clientX}px`;
    reticle.style.top = `${event.clientY}px`;
  }

  function onCanvasClick(event) {
    shoot(event);
  }

  function onKeyDown(event) {
    if (!document.body.classList.contains('package-station-mission-open')) return;
    if (event.code === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      onExit({ result: outcome ?? 'exit' });
    }
  }

  function onUiClick(event) {
    const action = event.target.closest('button')?.dataset.action;
    if (action === 'retry') reset();
    if (action === 'exit') onExit({ result: outcome ?? 'exit' });
  }

  function mount() {
    scene.add(root);
    buildRoute();
    buildPackageAndDelivery();
    buildBananaBlaster();
    buildUi();
    canvas.addEventListener('click', onCanvasClick);
    canvas.addEventListener('pointermove', onPointerMove);
    window.addEventListener('keydown', onKeyDown, true);
  }

  function start() {
    reset();
  }

  function update(dt) {
    updateBananaBlaster(dt);
    if (!active || paused) {
      updateEffects(dt);
      return;
    }
    elapsed += dt;
    timeLeft -= dt;
    if (timeLeft <= 0) {
      timeLeft = 0;
      updateHud();
      finish('lose');
      return;
    }

    packageRoot.rotation.y += dt * 1.05;
    packageRoot.position.y = packagePosition.y;
    const deliveryPulse = 1 + Math.sin(elapsed * 3.4) * 0.045;
    deliveryRing.scale.set(deliveryPulse, 1, deliveryPulse);
    if (!hasPackage && horizontalDistance(player.position, packageRoot.position) < PACKAGE_PICKUP_DISTANCE) pickupPackage();
    const reachedDelivery = horizontalDistance(player.position, deliveryPosition) < 5.6
      || (player.position.z >= deliveryPosition.z - 2.2 && Math.abs(player.position.x - deliveryPosition.x) < 19);
    if (hasPackage && reachedDelivery) finish('win');

    updatePolice(dt);
    updateEffects(dt);
    updateHud();
    if (toastTimer > 0) {
      toastTimer -= dt;
      if (toastTimer <= 0) toastEl.classList.remove('show');
    }
    if (reticleTimer > 0) {
      reticleTimer -= dt;
      if (reticleTimer <= 0) reticle.classList.remove('hit');
    }
  }

  function destroy() {
    active = false;
    canvas.removeEventListener('click', onCanvasClick);
    canvas.removeEventListener('pointermove', onPointerMove);
    window.removeEventListener('keydown', onKeyDown, true);
    ui?.removeEventListener('click', onUiClick);
    ui?.remove();
    if (upperArmBone && upperArmBaseRotation) upperArmBone.rotation.copy(upperArmBaseRotation);
    if (foreArmBone && foreArmBaseRotation) foreArmBone.rotation.copy(foreArmBaseRotation);
    if (handBone && handBaseRotation) handBone.rotation.copy(handBaseRotation);
    bananaBlaster?.removeFromParent();
    carriedPackage?.removeFromParent();
    root.removeFromParent();
    if (shotAudioContext?.state !== 'closed') shotAudioContext.close?.().catch?.(() => {});
    for (const geometry of ownedGeometries) geometry.dispose();
    for (const material of ownedMaterials) material.dispose();
    enemies.length = 0;
    shotEffects.length = 0;
  }

  function getState() {
    return {
      active,
      outcome,
      hasPackage,
      timeLeft: Number(timeLeft.toFixed(1)),
      health,
      policeAlive: enemies.filter((enemy) => !enemy.dead).length,
      package: packagePosition.toArray(),
      delivery: deliveryPosition.toArray(),
    };
  }

  return {
    mount,
    start,
    update,
    pause: () => { paused = true; },
    resume: () => { paused = false; },
    destroy,
    shoot,
    sampleGround,
    getColliders: () => colliders,
    getBounds: () => bounds,
    getState,
    isPlaying: () => active && !paused,
  };
}
