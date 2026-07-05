// BOB 3D: jugador con física estilo GTA San Andreas.
// - Carga public/assets/bob/bob.glb (se normaliza escala/pies automáticamente).
//   · Si el GLB trae animation clips (idle/walk/run) usa AnimationMixer con crossfade.
//   · Si no trae, animación procedural: bounce al caminar, lean en giros.
// - Si el GLB no existe, muestra un muñeco placeholder (el sistema sprite viejo
//   sigue intacto en bob.js como backup).
// - Movimiento con peso: aceleración/frenada en rampa (~0.2s), rotación con
//   velocidad angular limitada (sin snap), sprint con Shift.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { sampleGround } from '../world/building.js';
import { normalizeGLTFHeight } from '../world/gltfUtils.js';

// Cada escena provee su propia función de altura de piso (la calle tiene
// escalones; el shopping tiene pisos). Se asigna a `bob.sampleGround` desde
// main.js; por defecto usa la del shopping (building.js).

const HEIGHT = 1.7;       // alto objetivo del modelo en metros
const RADIUS = 0.35;      // radio de colisión
const WALK = 3.4;         // m/s caminando
const RUN = 5.8;          // m/s corriendo (Shift) — ritmo real, no "corre solo"
const ACCEL = 9;          // rampa de aceleración (~0.2s hasta velocidad)
const DECEL = 11;         // frenada un poco más rápida
const TURN_SPIN = 2.6;    // velocidad de giro con A/D (rad/s)
const GRAVITY = 14;

const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));
const UP = new THREE.Vector3(0, 1, 0);

// Sombra blob (así se hacía en PS2: un círculo oscuro, nada de shadow maps).
function makeBlobShadow() {
  const c = document.createElement('canvas');
  c.width = 64; c.height = 64;
  const ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(32, 32, 4, 32, 32, 30);
  g.addColorStop(0, 'rgba(0,0,0,0.42)');
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 64, 64);
  const tex = new THREE.CanvasTexture(c);
  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(1.1, 1.1),
    new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false }),
  );
  mesh.rotation.x = -Math.PI / 2;
  return mesh;
}

// Placeholder mínimo por si falta el GLB (solo para no quedar sin personaje).
function makeFallbackSprite() {
  const c = document.createElement('canvas');
  c.width = 48; c.height = 72;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#c98d5f'; ctx.fillRect(17, 8, 14, 15);   // cabeza
  ctx.fillStyle = '#1f4d2e'; ctx.fillRect(15, 4, 18, 7);    // gorra
  ctx.fillStyle = '#f2e8c9'; ctx.fillRect(14, 23, 20, 21);  // remera
  ctx.fillStyle = '#6d1f2c'; ctx.fillRect(15, 42, 18, 10);  // shorts
  ctx.fillStyle = '#c98d5f'; ctx.fillRect(17, 50, 6, 16); ctx.fillRect(25, 50, 6, 16);
  ctx.fillStyle = '#2a2118'; ctx.fillRect(15, 64, 9, 5); ctx.fillRect(24, 64, 9, 5);
  const tex = new THREE.CanvasTexture(c);
  tex.magFilter = THREE.NearestFilter; tex.minFilter = THREE.NearestFilter;
  tex.colorSpace = THREE.SRGBColorSpace;
  const geo = new THREE.PlaneGeometry(HEIGHT * (48 / 72), HEIGHT);
  geo.translate(0, HEIGHT / 2, 0);
  return new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ map: tex, transparent: true, alphaTest: 0.35 }));
}

export class Player {
  constructor(scene, spawn) {
    // rig = contenedor que se mueve y rota; adentro va el modelo (o el fallback)
    this.rig = new THREE.Group();
    this.rig.position.copy(spawn);
    this.position = this.rig.position;
    scene.add(this.rig);

    this.shadow = makeBlobShadow();
    this.shadow.position.copy(spawn).y += 0.02;
    scene.add(this.shadow);

    this.velocity = new THREE.Vector3();
    // vectores de trabajo reusados cada cuadro (no crear basura en el loop)
    this._fwd = new THREE.Vector3();
    this._right = new THREE.Vector3();
    this._wish = new THREE.Vector3();
    this.modelYaw = 0;          // hacia dónde mira el cuerpo
    this._prevYawRate = 0;
    this.vy = 0;
    this.walkPhase = 0;

    this.mixer = null;
    this.actions = {};          // { idle, move } acciones del GLB si existen
    this.model = null;
    this.bones = null;          // huesos animables si el GLB viene riggeado sin clips
    this._isBillboard = false;
    this.sampleGround = sampleGround; // la escena activa puede reemplazarla

    new GLTFLoader().load(
      'assets/bob/bob.glb',
      (gltf) => this._setupModel(gltf),
      undefined,
      () => {
        // sin GLB: muñeco plano de respaldo (billboard)
        this.model = makeFallbackSprite();
        this._isBillboard = true;
        this.rig.add(this.model);
        console.warn('bob.glb no encontrado — usando placeholder. Subí el modelo a public/assets/bob/bob.glb');
      },
    );
  }

  _setupModel(gltf) {
    const model = gltf.scene;
    // el GLB de Tripo viene con el frente hacia +x → lo giramos para que
    // mire hacia +z (la convención del rig; esto arregla el "se ve de costado")
    model.rotation.y = -Math.PI / 2;
    // normalizar: que mida HEIGHT metros y apoye los pies en y=0
    normalizeGLTFHeight(model, HEIGHT);

    this.model = model;
    this.rig.add(model);

    // ¿Trae clips de animación?
    const clips = gltf.animations || [];
    if (clips.length) {
      this.mixer = new THREE.AnimationMixer(model);
      const find = (re) => clips.find((c) => re.test(c.name));
      const idle = find(/idle|stand|breath/i) || clips[0];
      const move = find(/run|walk|jog|move/i) || (clips.length > 1 ? clips[1] : clips[0]);
      this.actions.idle = this.mixer.clipAction(idle);
      this.actions.move = this.mixer.clipAction(move);
      this.actions.idle.play();
      this.actions.move.play();
      this.actions.move.weight = 0;
      console.info(`bob.glb: ${clips.length} clips (idle="${idle.name}", move="${move.name}")`);
    } else if (this._setupBones(model)) {
      // GLB riggeado pero SIN clips: animación programática sobre los huesos
      // (respiración parado, brazos/piernas al caminar). Sutil y estable.
      console.info('bob.glb riggeado sin clips — animación por huesos activada');
    } else {
      console.info('bob.glb sin clips ni huesos reconocibles — animación procedural');
    }
  }

  // Busca huesos con nombres reconocibles (spine/arm/leg, left/right) y guarda
  // su pose de descanso. Si el rig no tiene nombres útiles → false y el juego
  // sigue con la animación procedural de siempre (no se rompe nada).
  _setupBones(model) {
    const bones = [];
    model.traverse((o) => { if (o.isBone) bones.push(o); });
    if (!bones.length) return false;

    const isLeft = (n) => /left|(^|[^a-z])l([^a-z]|$)|_l\b|\.l\b|l_/i.test(n);
    const isRight = (n) => /right|(^|[^a-z])r([^a-z]|$)|_r\b|\.r\b|r_/i.test(n);
    const pick = (re, side = null) => bones.find((b) => {
      if (!re.test(b.name)) return false;
      if (side === 'L') return isLeft(b.name) && !isRight(b.name);
      if (side === 'R') return isRight(b.name) && !isLeft(b.name);
      return true;
    }) ?? null;

    const found = {
      spine: pick(/spine|chest|torso|body/i),
      head: pick(/head|neck/i),
      armL: pick(/shoulder|upper.?arm|arm/i, 'L'),
      armR: pick(/shoulder|upper.?arm|arm/i, 'R'),
      legL: pick(/thigh|up.?leg|upper.?leg|leg|hip(?!s)/i, 'L'),
      legR: pick(/thigh|up.?leg|upper.?leg|leg|hip(?!s)/i, 'R'),
    };
    const parts = Object.values(found).filter(Boolean).length;
    // alcanza con torso o un par de extremidades; si no, mejor no tocar nada
    if (!(found.spine || (found.armL && found.armR) || (found.legL && found.legR))) {
      console.info(`bob.glb: ${bones.length} huesos pero sin nombres reconocibles (${bones.slice(0, 6).map((b) => b.name).join(', ')}…)`);
      return false;
    }
    for (const b of Object.values(found)) {
      if (b) b.userData.restQ = b.quaternion.clone();
    }
    this.bones = found;
    this._animTime = 0;
    this._boneEuler = new THREE.Euler();
    this._boneQ = new THREE.Quaternion();
    console.info(`bob.glb: huesos animables ${parts}/6 →`, Object.entries(found).filter(([, v]) => v).map(([k, v]) => `${k}=${v.name}`).join(' · '));
    return true;
  }

  // Rota un hueso sumando una rotación chica sobre su pose de descanso.
  _poseBone(bone, rx, rz = 0) {
    if (!bone) return;
    this._boneEuler.set(rx, 0, rz);
    this._boneQ.setFromEuler(this._boneEuler);
    bone.quaternion.copy(bone.userData.restQ).multiply(this._boneQ);
  }

  // Círculo (radio RADIUS) vs AABB, con banda de altura — sin closures nuevas
  // por cuadro; colliders y la posición de prueba se pasan como parámetros.
  _isFree(nx, nz, y, colliders) {
    return !colliders.some((c) =>
      nx > c.minX - RADIUS && nx < c.maxX + RADIUS &&
      nz > c.minZ - RADIUS && nz < c.maxZ + RADIUS &&
      y + 1.4 > c.minY && y + 0.2 < c.maxY,
    );
  }

  update(dt, input, camYaw, colliders, camPos) {
    // 1) Control tipo GTA clásico (mouse libre para interactuar):
    //    A/D GIRAN a BOB sobre su eje, W avanza, S retrocede (más lento).
    //    La cámara se acomoda sola detrás de él, así girando "mirás" el lugar.
    const { x: turnInput, z: fwdInput } = input.axes();
    if (!this._isBillboard) this.modelYaw -= turnInput * TURN_SPIN * dt;
    const topSpeed = input.sprinting() ? RUN : WALK;
    const speedMul = fwdInput < 0 ? 0.6 : 1; // marcha atrás más lenta
    const wish = this._wish.set(Math.sin(this.modelYaw), 0, Math.cos(this.modelYaw))
      .multiplyScalar(fwdInput * topSpeed * speedMul);
    const moving = fwdInput !== 0;

    // 2) Rampa de aceleración/frenada (peso GTA: nada arranca ni frena de golpe)
    const rate = moving ? ACCEL : DECEL;
    const k = 1 - Math.exp(-rate * dt);
    this.velocity.x += (wish.x - this.velocity.x) * k;
    this.velocity.z += (wish.z - this.velocity.z) * k;
    const speed = Math.hypot(this.velocity.x, this.velocity.z);

    // 3) Colisión por eje (círculo vs AABB, con banda de altura)
    const y = this.position.y;
    const stepX = this.velocity.x * dt;
    const stepZ = this.velocity.z * dt;
    if (this._isFree(this.position.x + stepX, this.position.z, y, colliders)) this.position.x += stepX;
    else this.velocity.x = 0;
    if (this._isFree(this.position.x, this.position.z + stepZ, y, colliders)) this.position.z += stepZ;
    else this.velocity.z = 0;

    // 4) Piso: subir escalones/rampas suave, caer con gravedad
    const ground = this.sampleGround(this.position.x, this.position.z, this.position.y);
    const diff = ground - this.position.y;
    if (diff > -0.05) {
      this.vy = 0;
      this.position.y += diff * Math.min(1, 18 * dt);
    } else {
      this.vy = Math.min(this.vy + GRAVITY * dt, 10);
      this.position.y = Math.max(ground, this.position.y - this.vy * dt);
    }

    // 5) Rotación del cuerpo: la controla A/D directamente (giro en el lugar
    //    o caminando). El lean procedural usa la velocidad de giro real.
    let yawRate = 0;
    if (this._isBillboard) {
      // el sprite de respaldo siempre mira a cámara
      this.rig.rotation.y = Math.atan2(camPos.x - this.position.x, camPos.z - this.position.z);
    } else {
      yawRate = -turnInput * TURN_SPIN;
      this.rig.rotation.y = this.modelYaw;
    }

    // 6) Animación
    if (this.mixer) {
      // crossfade idle ↔ move según velocidad, y el clip acompaña el paso
      const w = THREE.MathUtils.clamp(speed / WALK, 0, 1);
      this.actions.move.weight = w;
      this.actions.idle.weight = 1 - w;
      this.actions.move.timeScale = THREE.MathUtils.clamp(speed / WALK, 0.6, 1.8);
      this.mixer.update(dt);
    } else if (this.model && !this._isBillboard) {
      // procedural: bounce al ritmo del paso + lean hacia el giro + tilt al acelerar
      this.walkPhase += speed * 4.2 * dt;
      const bounce = Math.abs(Math.sin(this.walkPhase)) * 0.05 * Math.min(1, speed / WALK);
      this.model.position.y += (bounce - (this._lastBounce || 0));
      this._lastBounce = bounce;

      // capa de HUESOS (si el rig lo permite): respiración parado + brazos y
      // piernas al caminar. Amplitudes chicas a propósito: sutil y estable.
      if (this.bones) {
        this._animTime += dt;
        const walkAmt = Math.min(1, speed / WALK);
        const idleAmt = 1 - Math.min(1, speed / 1.2);
        const swing = Math.sin(this.walkPhase) * walkAmt;
        const breath = Math.sin(this._animTime * 2.2) * idleAmt;
        this._poseBone(this.bones.legL, swing * 0.45);
        this._poseBone(this.bones.legR, -swing * 0.45);
        this._poseBone(this.bones.armL, -swing * 0.3 + breath * 0.03);
        this._poseBone(this.bones.armR, swing * 0.3 + breath * 0.03);
        this._poseBone(this.bones.spine, breath * 0.035 + walkAmt * 0.05);
        this._poseBone(this.bones.head, -breath * 0.02 - walkAmt * 0.03);
      }
      const lean = THREE.MathUtils.clamp(-yawRate * 0.025, -0.13, 0.13);
      const tilt = THREE.MathUtils.clamp(speed / RUN, 0, 1) * 0.06;
      this.model.rotation.z += (lean - this.model.rotation.z) * Math.min(1, 8 * dt);
      this.model.rotation.x += (tilt - this.model.rotation.x) * Math.min(1, 8 * dt);
    }

    // 7) Sombra blob pegada al piso
    this.shadow.position.set(this.position.x, ground + 0.02, this.position.z);
    const squash = 1 - Math.min(0.35, Math.max(0, this.position.y - ground) * 0.5);
    this.shadow.scale.setScalar(squash);
  }
}
