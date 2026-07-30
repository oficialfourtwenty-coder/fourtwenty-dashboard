// Click en un auto → se abre la puerta y BOB aparece sentado adentro. Una vez
// adentro, apretar la RADIO del tablero (click o tecla E) abre el selector de
// temas. Se baja con Esc o con el botón del panel.
//
// Capa NUEVA y AISLADA, igual que productClicks: raycaster y listeners propios,
// no toca cámara, controles ni los listeners que ya existen. Mientras BOB está
// adentro del auto, main.js congela su movimiento vía isPlayerLocked().
import * as THREE from 'three';
import { createCarRadio } from '../ui/carRadio.js';

const TIP_ID = 'ft-car-tip';
const MAX_ENTER_DISTANCE = 10;   // más lejos que esto, primero hay que acercarse
const MAX_CONTEXT_DISTANCE = 3.5;
const CAM_DIST_INSIDE = 4.4;     // se abre un poco para ver el auto entero

function ensureTip() {
  let tip = document.getElementById(TIP_ID);
  if (tip) return tip;
  tip = document.createElement('div');
  tip.id = TIP_ID;
  tip.style.cssText = [
    'position:fixed', 'left:50%', 'bottom:96px', 'transform:translateX(-50%)',
    'z-index:60', 'display:none', 'padding:6px 14px',
    'font-family:"Courier New",monospace', 'font-size:12px', 'letter-spacing:2px',
    'color:#111', 'background:#ff6d18', 'font-weight:900',
    'box-shadow:0 6px 18px rgba(0,0,0,0.35)', 'pointer-events:none',
  ].join(';');
  document.body.appendChild(tip);
  return tip;
}

export function initCarInteract({
  canvas, camera, getScene, cars, player, tpCam, music, isBlocked = () => false,
}) {
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2(-2, -2);
  const tip = ensureTip();
  const seatWorld = new THREE.Vector3();
  const exitWorld = new THREE.Vector3();

  let insideCar = null;
  let camDistBefore = null;
  let pointerDirty = false;
  let hoveredCar = null;

  const radio = createCarRadio({ music, onExit: () => exitCar() });

  // meshes clickeables por auto (se rearman si cambia la escena)
  let cachedScene = null;
  let carMeshes = [];

  function rescan() {
    cachedScene = getScene();
    carMeshes = [];
    for (const car of cars) {
      if (!cachedScene || !isInScene(car.root, cachedScene)) continue;
      car.root.traverse((obj) => { if (obj.isMesh) carMeshes.push(obj); });
    }
  }

  function isInScene(object, scene) {
    let current = object;
    while (current) {
      if (current === scene) return true;
      current = current.parent;
    }
    return false;
  }

  function carOf(object) {
    let current = object;
    while (current) {
      if (current.userData?.car) {
        return cars.find((c) => c.id === current.userData.car) ?? null;
      }
      current = current.parent;
    }
    return null;
  }

  function raycastCar() {
    if (getScene() !== cachedScene) rescan();
    if (!carMeshes.length) return null;
    raycaster.setFromCamera(pointer, camera);
    const hit = raycaster.intersectObjects(carMeshes, false)[0];
    if (!hit) return null;
    return { car: carOf(hit.object), isRadio: !!hit.object.userData?.carRadio };
  }

  function showTip(text) {
    tip.textContent = text;
    tip.style.display = 'block';
  }

  function clearTip() {
    hoveredCar = null;
    tip.style.display = 'none';
    if (canvas.style.cursor === 'pointer' && canvas.dataset.carHover === '1') {
      canvas.style.cursor = 'default';
    }
    delete canvas.dataset.carHover;
  }

  function enterCar(car) {
    if (insideCar) return;
    insideCar = car;
    car.openDoor();
    car.setRadioActive(true);

    car.getSeatWorldPosition(seatWorld);
    player.position.copy(seatWorld);
    player.velocity.set(0, 0, 0);
    player.vy = 0;
    player.modelYaw = car.root.rotation.y + Math.PI / 2; // mirando al frente del auto

    if (camDistBefore === null) camDistBefore = tpCam.dist;
    tpCam.dist = CAM_DIST_INSIDE;

    clearTip();
    showTip('APRETÁ LA RADIO (E)');
  }

  function exitCar() {
    if (!insideCar) return;
    const car = insideCar;
    radio.hide();
    car.setRadioActive(false);
    car.closeDoor();

    car.getExitWorldPosition(exitWorld);
    player.position.copy(exitWorld);
    player.velocity.set(0, 0, 0);
    player.vy = 0;

    if (camDistBefore !== null) { tpCam.dist = camDistBefore; camDistBefore = null; }
    insideCar = null;
    clearTip();
  }

  function openRadio() {
    if (!insideCar || radio.isOpen()) return;
    radio.show(insideCar);
    clearTip();
  }

  function closeRadio() {
    if (!radio.isOpen()) return false;
    radio.hide();
    clearTip();
    return true;
  }

  function nearestCar(position, maxDistance = MAX_CONTEXT_DISTANCE) {
    const scene = getScene();
    if (!cachedScene || scene !== cachedScene) rescan();
    let nearest = null;
    for (const car of cars) {
      if (!isInScene(car.root, scene)) continue;
      const distance = car.distanceTo(position);
      if (distance <= maxDistance && (!nearest || distance < nearest.distance)) nearest = { car, distance };
    }
    return nearest;
  }

  function canInteract(position = player.position) {
    if (isBlocked() || radio.isOpen()) return false;
    return !!insideCar || !!nearestCar(position);
  }

  function interact(position = player.position) {
    if (isBlocked() || radio.isOpen()) return false;
    if (insideCar) {
      openRadio();
      return true;
    }
    const nearest = nearestCar(position);
    if (!nearest) return false;
    enterCar(nearest.car);
    return true;
  }

  canvas.addEventListener('pointermove', (e) => {
    pointer.set((e.clientX / window.innerWidth) * 2 - 1, -(e.clientY / window.innerHeight) * 2 + 1);
    pointerDirty = true;
  });

  function tickHover() {
    requestAnimationFrame(tickHover);
    if (!pointerDirty) return;
    pointerDirty = false;
    if (isBlocked() || radio.isOpen()) { clearTip(); return; }

    const res = raycastCar();
    if (!res?.car) {
      // adentro del auto mantenemos el aviso de la radio
      if (insideCar) showTip('APRETÁ LA RADIO (E)');
      else if (hoveredCar) clearTip();
      return;
    }

    if (insideCar) {
      showTip(res.isRadio ? 'RADIO — CLICK PARA ELEGIR TEMA' : 'APRETÁ LA RADIO (E)');
      canvas.style.cursor = res.isRadio ? 'pointer' : 'default';
      canvas.dataset.carHover = '1';
      return;
    }

    if (res.car !== hoveredCar) hoveredCar = res.car;
    const far = res.car.distanceTo(player.position) > MAX_ENTER_DISTANCE;
    showTip(far
      ? `${res.car.model.toUpperCase()} — ACERCATE`
      : `${res.car.model.toUpperCase()} — CLICK PARA SUBIR`);
    canvas.style.cursor = far ? 'default' : 'pointer';
    canvas.dataset.carHover = '1';
  }
  requestAnimationFrame(tickHover);

  canvas.addEventListener('click', () => {
    if (isBlocked() || radio.isOpen()) return;
    const res = raycastCar();
    if (!res?.car) return;

    if (insideCar) {
      if (res.isRadio) openRadio();
      return;
    }
    if (res.car.distanceTo(player.position) > MAX_ENTER_DISTANCE) return;
    enterCar(res.car);
  });

  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && insideCar) {
      if (isBlocked()) return;
      exitCar();
      return;
    }
    if ((e.key === 'e' || e.key === 'E') && !radio.isOpen()) {
      if (isBlocked()) return;
      interact(player.position);
    }
  });

  function update(dt) {
    for (const car of cars) car.update(dt);
    // sentado: lo mantenemos clavado en la butaca (no lo mueve la física)
    if (insideCar) {
      insideCar.getSeatWorldPosition(seatWorld);
      player.position.copy(seatWorld);
    }
  }

  function getColliders() {
    const out = [];
    for (const car of cars) {
      // el auto en el que estás sentado no te tiene que empujar
      if (car === insideCar) continue;
      out.push(...car.getColliders());
    }
    return out;
  }

  return {
    update,
    rescan,
    getColliders,
    isPlayerLocked: () => insideCar !== null,
    isRadioOpen: () => radio.isOpen(),
    canInteract,
    interact,
    closeRadio,
    exitCar,
    getCurrentCar: () => insideCar,
  };
}
