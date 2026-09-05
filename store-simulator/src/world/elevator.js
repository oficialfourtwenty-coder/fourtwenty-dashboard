import * as THREE from 'three';

const CABIN_W = 2.65;
const CABIN_D = 2.35;
const CABIN_H = 2.9;
const DOOR_H = 2.34;
const DOOR_W = 0.9;
const DOOR_CLOSED_X = DOOR_W / 2;
const DOOR_OPEN_SHIFT = 0.92;
let sharedBrushedMetalTexture = null;
const sharedSignTextures = new Map();

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function brushedMetalTexture() {
  if (sharedBrushedMetalTexture) return sharedBrushedMetalTexture;
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  const gradient = ctx.createLinearGradient(0, 0, 256, 0);
  gradient.addColorStop(0, '#777b7e');
  gradient.addColorStop(0.18, '#c2c5c5');
  gradient.addColorStop(0.5, '#85898b');
  gradient.addColorStop(0.78, '#d1d2d0');
  gradient.addColorStop(1, '#6d7173');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 256, 256);
  for (let y = 0; y < 256; y += 3) {
    ctx.fillStyle = y % 9 === 0 ? 'rgba(255,255,255,0.055)' : 'rgba(0,0,0,0.025)';
    ctx.fillRect(0, y, 256, 1);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(2, 2);
  texture.anisotropy = 8;
  sharedBrushedMetalTexture = texture;
  return sharedBrushedMetalTexture;
}

function signTexture(text) {
  if (sharedSignTextures.has(text)) return sharedSignTextures.get(text);
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 112;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#17191a';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.strokeStyle = '#aaadae';
  ctx.lineWidth = 5;
  ctx.strokeRect(4, 4, canvas.width - 8, canvas.height - 8);
  ctx.fillStyle = '#e8e5dc';
  ctx.font = '700 54px "Arial Narrow", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, canvas.width / 2, canvas.height / 2 + 3);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  sharedSignTextures.set(text, texture);
  return texture;
}

function mesh(geometry, material, name) {
  const object = new THREE.Mesh(geometry, material);
  object.name = name;
  object.castShadow = true;
  object.receiveShadow = true;
  return object;
}

export class ElevatorController {
  constructor(scene, {
    id,
    name = 'Ascensor FOURTWENTY',
    position = [0, 0, 0],
    rotationY = 0,
    onEnter = null,
  }) {
    this.id = id;
    this.state = 'closed';
    this.root = new THREE.Group();
    this.root.name = name;
    this.root.position.fromArray(position);
    this.root.rotation.y = rotationY;
    this.root.userData.elevator = true;
    this.onEnter = onEnter;
    this.callEndsAt = 0;
    this.doorProgress = 0;
    this._doorAnimation = null;
    this._entryArmed = true;
    this._arrivalCloseQueued = false;
    this._callToken = 0;
    this._localPlayer = new THREE.Vector3();
    this._buttonWorld = new THREE.Vector3();
    this._box = new THREE.Box3();
    this._colliders = [];
    this._colliderMeshes = [];

    this._build();
    scene.add(this.root);
  }

  _build() {
    const brushed = brushedMetalTexture();
    const steel = new THREE.MeshPhysicalMaterial({
      map: brushed,
      color: 0xb7b9b8,
      metalness: 0.92,
      roughness: 0.28,
      clearcoat: 0.28,
      clearcoatRoughness: 0.35,
    });
    const darkSteel = new THREE.MeshStandardMaterial({
      color: 0x252829,
      metalness: 0.82,
      roughness: 0.3,
    });
    const doorMaterial = steel.clone();
    doorMaterial.color.setHex(0x9da0a1);
    doorMaterial.roughness = 0.22;

    const floor = mesh(new THREE.BoxGeometry(CABIN_W, 0.12, CABIN_D), darkSteel, 'Ascensor · piso');
    floor.position.y = 0.02;
    this.root.add(floor);

    const roof = mesh(new THREE.BoxGeometry(CABIN_W, 0.16, CABIN_D), steel, 'Ascensor · techo');
    roof.position.y = CABIN_H;
    this.root.add(roof);

    const back = mesh(new THREE.BoxGeometry(CABIN_W, CABIN_H, 0.16), steel, 'Ascensor · pared trasera');
    back.position.set(0, CABIN_H / 2, -CABIN_D / 2);
    this.root.add(back);
    this._colliderMeshes.push(back);

    for (const side of [-1, 1]) {
      const wall = mesh(new THREE.BoxGeometry(0.2, CABIN_H, CABIN_D), steel, `Ascensor · lateral ${side < 0 ? 'izquierdo' : 'derecho'}`);
      wall.position.set(side * CABIN_W / 2, CABIN_H / 2, 0);
      this.root.add(wall);
      this._colliderMeshes.push(wall);

      const jamb = mesh(new THREE.BoxGeometry(0.28, DOOR_H, 0.2), darkSteel, `Ascensor · marco ${side < 0 ? 'izquierdo' : 'derecho'}`);
      jamb.position.set(side * (CABIN_W / 2 - 0.14), DOOR_H / 2, CABIN_D / 2 + 0.01);
      this.root.add(jamb);
      this._colliderMeshes.push(jamb);
    }

    const header = mesh(new THREE.BoxGeometry(CABIN_W, CABIN_H - DOOR_H, 0.2), darkSteel, 'Ascensor · dintel');
    header.position.set(0, DOOR_H + (CABIN_H - DOOR_H) / 2, CABIN_D / 2 + 0.01);
    this.root.add(header);

    this.leftDoor = mesh(new THREE.BoxGeometry(DOOR_W, DOOR_H, 0.1), doorMaterial, 'Ascensor · puerta izquierda');
    this.rightDoor = mesh(new THREE.BoxGeometry(DOOR_W, DOOR_H, 0.1), doorMaterial.clone(), 'Ascensor · puerta derecha');
    this.leftDoor.position.set(-DOOR_CLOSED_X, DOOR_H / 2, CABIN_D / 2 + 0.025);
    this.rightDoor.position.set(DOOR_CLOSED_X, DOOR_H / 2, CABIN_D / 2 + 0.025);
    this.root.add(this.leftDoor, this.rightDoor);
    this._colliderMeshes.push(this.leftDoor, this.rightDoor);

    const seam = mesh(new THREE.BoxGeometry(0.018, DOOR_H - 0.08, 0.012), darkSteel, 'Ascensor · junta central');
    seam.position.set(0, DOOR_H / 2, CABIN_D / 2 + 0.085);
    this.root.add(seam);
    this.seam = seam;

    const plaque = new THREE.Mesh(
      new THREE.PlaneGeometry(1.52, 0.33),
      new THREE.MeshBasicMaterial({ map: signTexture('FOURTWENTY') }),
    );
    plaque.name = 'Ascensor · placa FOURTWENTY';
    plaque.position.set(0, CABIN_H - 0.27, CABIN_D / 2 + 0.12);
    this.root.add(plaque);

    const buttonHousing = mesh(new THREE.BoxGeometry(0.28, 0.42, 0.11), darkSteel, 'Ascensor · boton exterior');
    buttonHousing.position.set(1.08, 1.22, CABIN_D / 2 + 0.12);
    this.root.add(buttonHousing);

    const ringMaterial = new THREE.MeshStandardMaterial({
      color: 0xc9cbca,
      emissive: 0x000000,
      emissiveIntensity: 0,
      metalness: 0.9,
      roughness: 0.2,
    });
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.075, 0.018, 10, 28), ringMaterial);
    ring.name = 'Ascensor · aro boton';
    ring.position.set(1.08, 1.22, CABIN_D / 2 + 0.19);
    this.root.add(ring);

    const buttonMaterial = new THREE.MeshStandardMaterial({ color: 0x151718, metalness: 0.65, roughness: 0.28 });
    this.callButton = new THREE.Mesh(new THREE.CircleGeometry(0.058, 24), buttonMaterial);
    this.callButton.name = 'Ascensor · pulsador';
    this.callButton.position.set(1.08, 1.22, CABIN_D / 2 + 0.205);
    this.callButton.userData.elevatorCall = true;
    this.root.add(this.callButton);
    this.callRingMaterial = ringMaterial;

    const cabinLight = new THREE.RectAreaLight(0xeef4f7, 4.5, 1.5, 0.65);
    cabinLight.position.set(0, CABIN_H - 0.16, -0.15);
    cabinLight.rotation.x = -Math.PI / 2;
    this.root.add(cabinLight);
  }

  setHighlighted(highlighted) {
    const calling = this.state === 'calling';
    this.callRingMaterial.emissive.setHex(highlighted || calling ? 0xffb52e : 0x000000);
    this.callRingMaterial.emissiveIntensity = highlighted ? 2.4 : calling ? 2.8 : 0;
  }

  getCallButtonWorldPosition(target = this._buttonWorld) {
    return this.callButton.getWorldPosition(target);
  }

  isNearCallButton(playerPosition, maxDistance = 2.35) {
    return this.getCallButtonWorldPosition().distanceTo(playerPosition) <= maxDistance;
  }

  secondsUntilOpen() {
    if (this.state !== 'calling') return 0;
    return Math.max(0, Math.ceil((this.callEndsAt - performance.now()) / 1000));
  }

  async call() {
    if (this.state !== 'closed') return false;
    const token = ++this._callToken;
    this.state = 'calling';
    this.callEndsAt = performance.now();
    this.callRingMaterial.emissive.setHex(0xffa51f);
    this.callRingMaterial.emissiveIntensity = 2.8;
    if (token !== this._callToken || this.state !== 'calling') return false;
    await this.openDoors();
    return token === this._callToken;
  }

  openDoors({ arrival = false, immediate = false } = {}) {
    this._entryArmed = !arrival;
    this._arrivalCloseQueued = false;
    if (immediate) {
      this._setDoorProgress(1);
      this.state = arrival ? 'arrived-open' : 'open';
      return Promise.resolve();
    }
    this.state = arrival ? 'arriving' : 'opening';
    return this._animateDoors(1, 850).then(() => {
      this.state = arrival ? 'arrived-open' : 'open';
      this.callRingMaterial.emissive.setHex(0x000000);
      this.callRingMaterial.emissiveIntensity = 0;
    });
  }

  closeDoors({ immediate = false } = {}) {
    this._entryArmed = false;
    if (immediate) {
      this._setDoorProgress(0);
      this.state = 'closed';
      return Promise.resolve();
    }
    this.state = 'closing';
    return this._animateDoors(0, 900).then(() => {
      this.state = 'closed';
      this.callRingMaterial.emissive.setHex(0x000000);
      this.callRingMaterial.emissiveIntensity = 0;
    });
  }

  markOccupied() {
    this.state = 'occupied';
    this._entryArmed = false;
  }

  placePlayerInside(player) {
    const worldPosition = this.root.localToWorld(new THREE.Vector3(0, 0.04, 0.05));
    player.position.copy(worldPosition);
    player.velocity.set(0, 0, 0);
    player.modelYaw = this.root.rotation.y;
  }

  placePlayerAtExit(player, distance = 4) {
    const worldPosition = this.root.localToWorld(new THREE.Vector3(0, 0.04, distance));
    player.position.copy(worldPosition);
    player.velocity.set(0, 0, 0);
    player.modelYaw = this.root.rotation.y;
  }

  _animateDoors(target, durationMs) {
    if (this._doorAnimation?.resolve) this._doorAnimation.resolve();
    return new Promise((resolve) => {
      this._doorAnimation = {
        from: this.doorProgress,
        target,
        elapsedMs: 0,
        durationMs,
        resolve,
      };
    });
  }

  _setDoorProgress(progress) {
    this.doorProgress = THREE.MathUtils.clamp(progress, 0, 1);
    const eased = this.doorProgress * this.doorProgress * (3 - 2 * this.doorProgress);
    this.leftDoor.position.x = -DOOR_CLOSED_X - DOOR_OPEN_SHIFT * eased;
    this.rightDoor.position.x = DOOR_CLOSED_X + DOOR_OPEN_SHIFT * eased;
    this.seam.visible = this.doorProgress < 0.04;
  }

  _isPlayerInside(playerPosition) {
    this.root.updateWorldMatrix(true, false);
    this._localPlayer.copy(playerPosition);
    this.root.worldToLocal(this._localPlayer);
    return Math.abs(this._localPlayer.x) < 0.72
      && this._localPlayer.z > -0.86
      && this._localPlayer.z < 0.64
      && this._localPlayer.y > -0.2
      && this._localPlayer.y < 2.2;
  }

  update(dt, playerPosition) {
    if (this._doorAnimation) {
      const animation = this._doorAnimation;
      animation.elapsedMs += dt * 1000;
      const t = Math.min(1, animation.elapsedMs / animation.durationMs);
      this._setDoorProgress(THREE.MathUtils.lerp(animation.from, animation.target, t));
      if (t >= 1) {
        this._doorAnimation = null;
        animation.resolve();
      }
    }

    const inside = this._isPlayerInside(playerPosition);
    if (this.state === 'open' && this._entryArmed && inside) {
      this.markOccupied();
      this.onEnter?.(this);
    }

    if (this.state === 'arrived-open' && !inside && !this._arrivalCloseQueued) {
      this._arrivalCloseQueued = true;
      this.state = 'arrival-exit';
      wait(900).then(() => {
        if (this.state === 'arrival-exit') this.closeDoors();
      });
    }
  }

  getColliders() {
    this.root.updateWorldMatrix(true, true);
    this._colliders.length = 0;
    for (const object of this._colliderMeshes) {
      this._box.setFromObject(object);
      if (this._box.isEmpty()) continue;
      this._colliders.push({
        minX: this._box.min.x,
        maxX: this._box.max.x,
        minY: this._box.min.y,
        maxY: this._box.max.y,
        minZ: this._box.min.z,
        maxZ: this._box.max.z,
        source: object.name,
      });
    }
    return this._colliders;
  }

  cancel() {
    this._callToken++;
    if (this._doorAnimation?.resolve) this._doorAnimation.resolve();
    this._doorAnimation = null;
  }
}

export const ELEVATOR_SIZE = Object.freeze({ width: CABIN_W, depth: CABIN_D, height: CABIN_H });
