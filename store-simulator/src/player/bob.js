// BOB: sprite 2D billboard (técnica Paper Mario) dentro del mundo 3D.
// Si existen PNGs reales en /assets/bob/ los usa; si no, dibuja un
// placeholder procedural hasta que llegue el arte definitivo.
import * as THREE from 'three';
import { sampleGround } from '../world/building.js';

const SPEED = 3.2;        // m/s
const RADIUS = 0.35;      // radio de colisión
const HEIGHT = 1.7;       // alto del sprite en metros
const FRAME_TIME = 0.14;  // segundos por frame de caminata
const GRAVITY = 14;

// ---- Frames placeholder (se reemplazan con assets reales) ------------------
function drawBobFrame(legPhase) {
  const c = document.createElement('canvas');
  c.width = 48;
  c.height = 72;
  const ctx = c.getContext('2d');
  const skin = '#c98d5f', tee = '#f2e8c9', shorts = '#6d1f2c', cap = '#1f4d2e', shoe = '#2a2118';
  // piernas (alternan con legPhase: -1, 0, 1)
  ctx.fillStyle = skin;
  ctx.fillRect(17 - legPhase * 3, 50, 6, 16 - Math.abs(legPhase) * 2);
  ctx.fillRect(25 + legPhase * 3, 50, 6, 16 - Math.abs(legPhase) * 2);
  ctx.fillStyle = shoe;
  ctx.fillRect(15 - legPhase * 3, 64 - Math.abs(legPhase) * 2, 9, 5);
  ctx.fillRect(24 + legPhase * 3, 64 - Math.abs(legPhase) * 2, 9, 5);
  // shorts
  ctx.fillStyle = shorts;
  ctx.fillRect(15, 42, 18, 10);
  // torso (remera)
  ctx.fillStyle = tee;
  ctx.fillRect(14, 24, 20, 20);
  // brazos
  ctx.fillStyle = skin;
  ctx.fillRect(10 + legPhase * 2, 26, 5, 16);
  ctx.fillRect(33 - legPhase * 2, 26, 5, 16);
  // cabeza
  ctx.fillStyle = skin;
  ctx.fillRect(17, 8, 14, 15);
  // gorra
  ctx.fillStyle = cap;
  ctx.fillRect(15, 4, 18, 7);
  ctx.fillRect(15, 9, 6, 3);
  // logo "FT" en la remera
  ctx.fillStyle = '#1f4d2e';
  ctx.font = 'bold 8px monospace';
  ctx.fillText('FT', 19, 36);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.magFilter = THREE.NearestFilter;
  tex.minFilter = THREE.NearestFilter;
  return tex;
}

function placeholderFrames() {
  const a = drawBobFrame(0), b = drawBobFrame(-1), d = drawBobFrame(1);
  return { idle: a, walk: [b, a, d, a] };
}

// Intenta cargar el arte real: assets/bob/bob_idle.png + bob_walk_0..3.png
async function loadRealFrames() {
  const loader = new THREE.TextureLoader();
  const load = (url) =>
    new Promise((res, rej) => loader.load(url, (t) => {
      t.colorSpace = THREE.SRGBColorSpace;
      t.magFilter = THREE.NearestFilter;
      t.minFilter = THREE.NearestFilter;
      res(t);
    }, undefined, rej));
  const idle = await load('assets/bob/bob_idle.png');
  const walk = await Promise.all([0, 1, 2, 3].map((i) => load(`assets/bob/bob_walk_${i}.png`)));
  return { idle, walk };
}

// ---- BOB -------------------------------------------------------------------
export class Bob {
  constructor(scene, spawn) {
    this.frames = placeholderFrames();
    loadRealFrames().then((f) => { this.frames = f; }).catch(() => { /* placeholder */ });

    const geo = new THREE.PlaneGeometry(HEIGHT * (48 / 72), HEIGHT);
    geo.translate(0, HEIGHT / 2, 0); // ancla en los pies
    this.material = new THREE.MeshBasicMaterial({
      map: this.frames.idle,
      transparent: true,
      alphaTest: 0.35,
    });
    this.mesh = new THREE.Mesh(geo, this.material);
    this.position = this.mesh.position;
    this.position.copy(spawn);
    scene.add(this.mesh);

    this.vy = 0;
    this.moving = false;
    this.frameTimer = 0;
    this.frameIndex = 0;
    this.flip = 1;
  }

  update(dt, input, camYaw, colliders, camPos) {
    // Movimiento relativo a la cámara
    const { x: ax, z: az } = input.axes();
    const fwd = new THREE.Vector3(-Math.sin(camYaw), 0, -Math.cos(camYaw));
    const right = new THREE.Vector3().crossVectors(fwd, new THREE.Vector3(0, 1, 0));
    const move = new THREE.Vector3()
      .addScaledVector(fwd, az)
      .addScaledVector(right, ax);
    this.moving = move.lengthSq() > 0;
    if (this.moving) move.normalize().multiplyScalar(SPEED * dt);

    // Colisión por eje (círculo vs AABB, con banda de altura)
    const y = this.position.y;
    const tryAxis = (nx, nz) => !colliders.some((c) =>
      nx > c.minX - RADIUS && nx < c.maxX + RADIUS &&
      nz > c.minZ - RADIUS && nz < c.maxZ + RADIUS &&
      y + 1.4 > c.minY && y + 0.2 < c.maxY,
    );
    if (tryAxis(this.position.x + move.x, this.position.z)) this.position.x += move.x;
    if (tryAxis(this.position.x, this.position.z + move.z)) this.position.z += move.z;

    // Piso: subir escalones/rampas suave, caer con gravedad
    const ground = sampleGround(this.position.x, this.position.z, this.position.y);
    const diff = ground - this.position.y;
    if (diff > -0.05) {
      this.vy = 0;
      this.position.y += diff * Math.min(1, 18 * dt);
    } else {
      this.vy = Math.min(this.vy + GRAVITY * dt, 10);
      this.position.y = Math.max(ground, this.position.y - this.vy * dt);
    }

    // Animación de caminata
    if (this.moving) {
      this.frameTimer += dt;
      if (this.frameTimer >= FRAME_TIME) {
        this.frameTimer = 0;
        this.frameIndex = (this.frameIndex + 1) % this.frames.walk.length;
      }
      this.material.map = this.frames.walk[this.frameIndex];
      // flip según dirección lateral respecto de la cámara
      const lateral = move.dot(right);
      if (Math.abs(lateral) > 0.001) this.flip = lateral > 0 ? -1 : 1;
    } else {
      this.material.map = this.frames.idle;
      this.frameIndex = 0;
      this.frameTimer = 0;
    }
    this.material.needsUpdate = true;

    // Billboard: solo yaw hacia la cámara (Paper Mario)
    this.mesh.rotation.y = Math.atan2(camPos.x - this.position.x, camPos.z - this.position.z);
    this.mesh.scale.x = this.flip;
  }
}
