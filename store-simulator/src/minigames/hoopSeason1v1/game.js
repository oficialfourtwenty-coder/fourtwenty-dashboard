import * as THREE from 'three';
import { clone as cloneSkeleton } from 'three/addons/utils/SkeletonUtils.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { GTAOPass } from 'three/addons/postprocessing/GTAOPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { gltfLoader } from '../../world/gltfLoaders.js';
import { normalizeGLTFHeight } from '../../world/gltfUtils.js';
import { construirCancha, MEDIDAS } from './cancha.js';
import './game.css';

const PLAYER_HEIGHT = 1.9;
const BALL_RADIUS = MEDIDAS.PELOTA_RADIO;
const GRAVITY = 9.81;
const WALK_SPEED = 3.15;
const DRIVE_SPEED = 4.5;
const SPRINT_SPEED = 6.5;
const DEFENDER_SPEED = 3.2;
const ACCELERATION = 6.5;
const FIRST_STEP_ACCELERATION = 9;
const BRAKING = 9;
const COURT_X = MEDIDAS.ANCHO / 2 - 0.55;
const COURT_MIN_Z = 2.05;
const COURT_MAX_Z = MEDIDAS.FONDO - 0.45;

const GradeShader = {
  uniforms: { tDiffuse: { value: null } },
  vertexShader: /* glsl */`
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: /* glsl */`
    uniform sampler2D tDiffuse;
    varying vec2 vUv;
    void main() {
      vec3 c = texture2D(tDiffuse, vUv).rgb;
      float lum = dot(c, vec3(0.299, 0.587, 0.114));
      c = mix(vec3(lum), c, 1.10);
      c *= mix(vec3(1.0), vec3(1.045, 1.0, 0.92), smoothstep(0.38, 1.0, lum));
      float d = distance(vUv, vec2(0.5));
      c *= 1.0 - smoothstep(0.54, 0.94, d) * 0.25;
      gl_FragColor = vec4(c, 1.0);
    }
  `,
};

const clamp = THREE.MathUtils.clamp;
const damp = (current, target, lambda, dt) => THREE.MathUtils.damp(current, target, lambda, dt);
const dampAngle = (current, target, lambda, dt) => {
  const delta = Math.atan2(Math.sin(target - current), Math.cos(target - current));
  return current + delta * (1 - Math.exp(-lambda * dt));
};
const moveToward = (current, target, amount) => {
  if (Math.abs(target - current) <= amount) return target;
  return current + Math.sign(target - current) * amount;
};

function basketballTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 256;
  const context = canvas.getContext('2d');
  context.fillStyle = '#c85320';
  context.fillRect(0, 0, canvas.width, canvas.height);
  let seed = 420;
  const random = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  for (let i = 0; i < 7500; i++) {
    const tone = random() > 0.5 ? 'rgba(255,174,103,.22)' : 'rgba(67,20,8,.22)';
    context.fillStyle = tone;
    context.fillRect(random() * 512, random() * 256, 1.2, 1.2);
  }
  context.strokeStyle = '#17120f';
  context.lineWidth = 7;
  context.beginPath();
  context.moveTo(0, 128);
  context.lineTo(512, 128);
  context.stroke();
  for (const x of [0, 128, 256, 384, 512]) {
    context.beginPath();
    context.moveTo(x, 0);
    context.lineTo(x, 256);
    context.stroke();
  }
  for (const x of [128, 384]) {
    context.beginPath();
    context.arc(x, 128, 82, -Math.PI / 2, Math.PI / 2);
    context.stroke();
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  return texture;
}

function makeBlobShadow(size = 0.85) {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const context = canvas.getContext('2d');
  const gradient = context.createRadialGradient(32, 32, 2, 32, 32, 31);
  gradient.addColorStop(0, 'rgba(0,0,0,.42)');
  gradient.addColorStop(1, 'rgba(0,0,0,0)');
  context.fillStyle = gradient;
  context.fillRect(0, 0, 64, 64);
  const texture = new THREE.CanvasTexture(canvas);
  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(size, size),
    new THREE.MeshBasicMaterial({ map: texture, transparent: true, depthWrite: false }),
  );
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.y = 0.012;
  return mesh;
}

function addRedShorts(root) {
  const material = new THREE.MeshStandardMaterial({
    color: 0xb51f2e,
    roughness: 0.82,
    metalness: 0.01,
  });
  const shorts = new THREE.Group();
  shorts.name = 'short-rojo-rival';
  const waist = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.22, 0.36), material);
  waist.position.y = 0.79;
  shorts.add(waist);
  for (const side of [-1, 1]) {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.155, 0.30, 12), material);
    leg.position.set(side * 0.14, 0.61, 0);
    shorts.add(leg);
  }
  shorts.traverse((object) => {
    if (!object.isMesh) return;
    object.castShadow = true;
    object.receiveShadow = true;
  });
  root.add(shorts);
  return shorts;
}

function upperBodyDribbleClip(clip) {
  if (!clip) return null;
  const upperBody = /Waist|Spine|Neck|Head|Clavicle|Upperarm|Forearm|Hand/i;
  const tracks = clip.tracks.filter((track) => upperBody.test(track.name));
  return tracks.length ? new THREE.AnimationClip('BOB_dribble_upper', clip.duration, tracks) : null;
}

class HoopBob {
  constructor(source, clips, { rival = false } = {}) {
    this.root = new THREE.Group();
    this.root.name = rival ? 'BOB rival' : 'BOB jugador';
    this.model = cloneSkeleton(source);
    this.root.add(this.model);
    this.rival = rival;
    this.velocity = new THREE.Vector3();
    this.targetVelocity = new THREE.Vector3();
    this.facing = new THREE.Vector3(0, 0, -1);
    this.handPosition = new THREE.Vector3();
    this.shadow = makeBlobShadow(rival ? 0.9 : 0.85);
    this.root.add(this.shadow);

    this.model.traverse((object) => {
      if (!object.isMesh && !object.isSkinnedMesh) return;
      object.castShadow = true;
      object.receiveShadow = true;
      object.frustumCulled = false;
      if (rival) object.material = object.material?.clone?.() ?? object.material;
    });
    if (rival) this.shorts = addRedShorts(this.root);

    this.rightHand = this.model.getObjectByName('R_Hand');
    this.mixer = new THREE.AnimationMixer(this.model);
    const find = (pattern) => clips.find((clip) => pattern.test(clip.name));
    this.actions = {
      idle: this.mixer.clipAction(find(/idle/i) ?? clips[0]),
      walk: this.mixer.clipAction(find(/walk/i) ?? clips[0]),
      run: this.mixer.clipAction(find(/run|sprint/i) ?? find(/walk/i) ?? clips[0]),
    };
    for (const action of new Set(Object.values(this.actions))) {
      action.enabled = true;
      action.play();
      action.weight = 0;
    }
    this.actions.idle.weight = 1;

    const dribbleClip = upperBodyDribbleClip(find(/dribbl|basket/i));
    this.dribbleAction = dribbleClip ? this.mixer.clipAction(dribbleClip) : null;
    if (this.dribbleAction) {
      this.dribbleAction.enabled = true;
      this.dribbleAction.play();
      this.dribbleAction.weight = 0;
    }
  }

  setAnimation(speed, dt, dribbling) {
    const walkWeight = clamp(speed / WALK_SPEED, 0, 1);
    const runWeight = clamp((speed - WALK_SPEED) / (SPRINT_SPEED - WALK_SPEED), 0, 1);
    this.actions.idle.weight = 1 - walkWeight;
    this.actions.walk.weight = walkWeight * (1 - runWeight);
    this.actions.run.weight = walkWeight * runWeight;
    this.actions.walk.timeScale = clamp(speed / WALK_SPEED, 0.72, 1.32);
    this.actions.run.timeScale = clamp(speed / SPRINT_SPEED, 0.78, 1.22);
    if (this.dribbleAction) {
      const targetWeight = dribbling ? 0.82 : 0;
      this.dribbleAction.weight = damp(this.dribbleAction.weight, targetWeight, 12, dt);
      this.dribbleAction.timeScale = 1.72 + clamp(speed / SPRINT_SPEED, 0, 1) * 0.32;
    }
    this.mixer.update(dt);
  }

  face(direction, dt, response = 10) {
    if (direction.lengthSq() < 0.0001) return;
    this.facing.lerp(direction, 1 - Math.exp(-response * dt)).normalize();
    const yaw = Math.atan2(this.facing.x, this.facing.z);
    this.root.rotation.y = dampAngle(this.root.rotation.y, yaw, response, dt);
  }

  getHandPosition(target) {
    if (this.rightHand) {
      this.rightHand.getWorldPosition(target);
      return target;
    }
    target.set(0.42, 0.93, 0.08);
    return this.root.localToWorld(target);
  }

  dispose() {
    this.mixer.stopAllAction();
    this.mixer.uncacheRoot(this.model);
    this.shorts?.traverse((object) => {
      object.geometry?.dispose?.();
      object.material?.dispose?.();
    });
    this.shadow.geometry.dispose();
    this.shadow.material.map?.dispose?.();
    this.shadow.material.dispose();
  }
}

class ControlledBasketball {
  constructor() {
    this.texture = basketballTexture();
    this.mesh = new THREE.Mesh(
      new THREE.SphereGeometry(BALL_RADIUS, 24, 16),
      new THREE.MeshStandardMaterial({ map: this.texture, roughness: 0.73, metalness: 0.02 }),
    );
    this.mesh.name = 'pelota fisica';
    this.mesh.castShadow = true;
    this.mesh.receiveShadow = true;
    this.velocityY = -3.2;
    this.positionY = 0.94;
    this.bounces = 0;
    this.lastBounceAt = performance.now();
    this.cadence = 0;
    this.hand = new THREE.Vector3();
    this.horizontal = new THREE.Vector3();
  }

  reset(player) {
    player.getHandPosition(this.hand);
    this.positionY = clamp(this.hand.y - 0.09, 0.76, 1.18);
    this.horizontal.set(this.hand.x, 0, this.hand.z);
    this.mesh.position.set(this.horizontal.x, this.positionY, this.horizontal.z);
    this.velocityY = -3.2;
  }

  update(dt, player, speed, onBounce) {
    player.getHandPosition(this.hand);
    const handY = clamp(this.hand.y - 0.08, 0.72, 1.02);
    const follow = 1 - Math.exp(-(16 + speed * 1.4) * dt);
    this.horizontal.x += (this.hand.x - this.horizontal.x) * follow;
    this.horizontal.z += (this.hand.z - this.horizontal.z) * follow;

    this.velocityY -= GRAVITY * dt;
    this.positionY += this.velocityY * dt;
    if (this.positionY <= BALL_RADIUS && this.velocityY < 0) {
      this.positionY = BALL_RADIUS;
      const height = Math.max(0.35, handY - BALL_RADIUS);
      const required = Math.sqrt(2 * GRAVITY * height);
      this.velocityY = Math.max(required * 1.015, Math.abs(this.velocityY) * 0.73);
      this.bounces += 1;
      const now = performance.now();
      const seconds = (now - this.lastBounceAt) / 1000;
      if (seconds > 0.2 && seconds < 1.4) {
        const measured = 60 / seconds;
        this.cadence = this.cadence > 0 ? THREE.MathUtils.lerp(this.cadence, measured, 0.32) : measured;
      }
      this.lastBounceAt = now;
      onBounce?.(clamp(Math.abs(this.velocityY) / 6, 0.35, 1));
      this.mesh.scale.set(1.08, 0.86, 1.08);
    }
    if (this.velocityY > 0 && this.positionY >= handY) {
      this.positionY = handY;
      this.velocityY = -(3.15 + speed * 0.24);
    }

    const scaleRecovery = 1 - Math.exp(-24 * dt);
    this.mesh.scale.x += (1 - this.mesh.scale.x) * scaleRecovery;
    this.mesh.scale.y += (1 - this.mesh.scale.y) * scaleRecovery;
    this.mesh.scale.z += (1 - this.mesh.scale.z) * scaleRecovery;
    this.mesh.position.set(this.horizontal.x, this.positionY, this.horizontal.z);
    this.mesh.rotation.x += this.velocityY * dt * 0.72;
    this.mesh.rotation.z += speed * dt * 0.38;
  }

  dispose() {
    this.mesh.geometry.dispose();
    this.mesh.material.dispose();
    this.texture.dispose();
  }
}

function makeInput(root) {
  const keys = new Set();
  const touchAxis = new THREE.Vector2();
  let sprintTouch = false;
  let joystickPointer = null;
  const joystick = root.querySelector('.hoop-touch-stick');
  const knob = root.querySelector('.hoop-touch-knob');
  const sprint = root.querySelector('.hoop-touch-sprint');
  const blocked = new Set(['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowLeft', 'ArrowDown', 'ArrowRight', 'ShiftLeft', 'ShiftRight']);

  const keyDown = (event) => {
    if (blocked.has(event.code)) event.preventDefault();
    keys.add(event.code);
  };
  const keyUp = (event) => keys.delete(event.code);
  window.addEventListener('keydown', keyDown, { passive: false });
  window.addEventListener('keyup', keyUp);

  const updateStick = (event) => {
    const rect = joystick.getBoundingClientRect();
    const x = event.clientX - (rect.left + rect.width / 2);
    const y = event.clientY - (rect.top + rect.height / 2);
    const radius = rect.width * 0.34;
    const length = Math.hypot(x, y) || 1;
    const scale = Math.min(1, radius / length);
    const px = x * scale;
    const py = y * scale;
    touchAxis.set(clamp(px / radius, -1, 1), clamp(py / radius, -1, 1));
    knob.style.transform = `translate(${px}px, ${py}px)`;
  };
  const resetStick = (event) => {
    if (event && joystickPointer !== event.pointerId) return;
    joystickPointer = null;
    touchAxis.set(0, 0);
    knob.style.transform = 'translate(0, 0)';
  };
  joystick.addEventListener('pointerdown', (event) => {
    joystickPointer = event.pointerId;
    joystick.setPointerCapture(event.pointerId);
    updateStick(event);
  });
  joystick.addEventListener('pointermove', (event) => {
    if (event.pointerId === joystickPointer) updateStick(event);
  });
  joystick.addEventListener('pointerup', resetStick);
  joystick.addEventListener('pointercancel', resetStick);
  sprint.addEventListener('pointerdown', () => { sprintTouch = true; });
  sprint.addEventListener('pointerup', () => { sprintTouch = false; });
  sprint.addEventListener('pointercancel', () => { sprintTouch = false; });

  return {
    axis(target) {
      const x = (keys.has('KeyD') || keys.has('ArrowRight') ? 1 : 0)
        - (keys.has('KeyA') || keys.has('ArrowLeft') ? 1 : 0) + touchAxis.x;
      const z = (keys.has('KeyS') || keys.has('ArrowDown') ? 1 : 0)
        - (keys.has('KeyW') || keys.has('ArrowUp') ? 1 : 0) + touchAxis.y;
      target.set(x, 0, z);
      if (target.lengthSq() > 1) target.normalize();
      return target;
    },
    sprinting: () => sprintTouch || keys.has('ShiftLeft') || keys.has('ShiftRight'),
    destroy() {
      window.removeEventListener('keydown', keyDown);
      window.removeEventListener('keyup', keyUp);
    },
  };
}

function makeBounceAudio() {
  let context = null;
  let buffer = null;
  const unlock = () => {
    if (!context) {
      context = new (window.AudioContext || window.webkitAudioContext)();
      const samples = Math.floor(context.sampleRate * 0.055);
      buffer = context.createBuffer(1, samples, context.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < samples; i++) {
        const t = i / context.sampleRate;
        data[i] = ((Math.random() * 2 - 1) * 0.22 + Math.sin(t * Math.PI * 145) * 0.78)
          * Math.exp(-t * 58);
      }
    }
    context.resume?.();
  };
  window.addEventListener('pointerdown', unlock, { once: true });
  window.addEventListener('keydown', unlock, { once: true });
  return {
    play(force) {
      if (!context || !buffer) return;
      const source = context.createBufferSource();
      const gain = context.createGain();
      source.buffer = buffer;
      gain.gain.value = 0.08 + force * 0.10;
      source.connect(gain).connect(context.destination);
      source.start();
    },
    destroy() {
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
      context?.close?.();
    },
  };
}

function createRenderer(container, canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  const coarse = matchMedia('(pointer: coarse)').matches;
  renderer.setPixelRatio(Math.min(devicePixelRatio, coarse ? 1.25 : 1.7));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.02;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(47, 1, 0.08, 180);
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  let gtao = null;
  if (!coarse) {
    gtao = new GTAOPass(scene, camera, 1, 1);
    gtao.output = GTAOPass.OUTPUT.Default;
    composer.addPass(gtao);
    composer.addPass(new UnrealBloomPass(new THREE.Vector2(1, 1), 0.10, 0.42, 0.96));
  }
  composer.addPass(new ShaderPass(GradeShader));
  composer.addPass(new OutputPass());

  const resize = () => {
    const width = Math.max(1, container.clientWidth);
    const height = Math.max(1, container.clientHeight);
    renderer.setSize(width, height, false);
    composer.setSize(width, height);
    gtao?.setSize(width, height);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  };
  return { renderer, scene, camera, composer, resize };
}

function disposeScene(root) {
  const geometries = new Set();
  const materials = new Set();
  const textures = new Set();
  root.traverse((object) => {
    if (object.geometry) geometries.add(object.geometry);
    const list = Array.isArray(object.material) ? object.material : [object.material];
    for (const material of list) {
      if (!material) continue;
      materials.add(material);
      for (const value of Object.values(material)) if (value?.isTexture) textures.add(value);
    }
  });
  for (const geometry of geometries) geometry.dispose?.();
  for (const material of materials) material.dispose?.();
  for (const texture of textures) texture.dispose?.();
}

export function createHoopSeasonGame() {
  let root = null;
  let canvas = null;
  let render = null;
  let court = null;
  let input = null;
  let audio = null;
  let player = null;
  let defender = null;
  let ball = null;
  let raf = 0;
  let running = false;
  let destroyed = false;
  let lastTime = performance.now();
  let defenderThink = 0;
  let hudElapsed = 0;
  let speedLabel = null;
  let rhythmLabel = null;
  const moveAxis = new THREE.Vector3();
  const desired = new THREE.Vector3();
  const defenderTarget = new THREE.Vector3();
  const defenderDirection = new THREE.Vector3();
  const playerDirection = new THREE.Vector3();
  const faceDirection = new THREE.Vector3();
  const separation = new THREE.Vector3();
  const toHoop = new THREE.Vector3();
  const cameraTarget = new THREE.Vector3();
  const cameraPosition = new THREE.Vector3();

  function updatePlayer(dt) {
    input.axis(moveAxis);
    const hasInput = moveAxis.lengthSq() > 0.001;
    const sprinting = input.sprinting() && hasInput;
    const forward = moveAxis.z < -0.05;
    const targetSpeed = sprinting ? SPRINT_SPEED : (forward ? DRIVE_SPEED : WALK_SPEED);
    desired.copy(moveAxis).multiplyScalar(targetSpeed);
    player.targetVelocity.copy(desired);

    const speedBefore = player.velocity.length();
    const firstStep = hasInput && speedBefore < 1.4;
    const acceleration = hasInput ? (firstStep ? FIRST_STEP_ACCELERATION : ACCELERATION) : BRAKING;
    player.velocity.x = moveToward(player.velocity.x, desired.x, acceleration * dt);
    player.velocity.z = moveToward(player.velocity.z, desired.z, acceleration * dt);
    if (!hasInput) {
      player.velocity.x = moveToward(player.velocity.x, 0, BRAKING * dt);
      player.velocity.z = moveToward(player.velocity.z, 0, BRAKING * dt);
    }

    player.root.position.addScaledVector(player.velocity, dt);
    player.root.position.x = clamp(player.root.position.x, -COURT_X, COURT_X);
    player.root.position.z = clamp(player.root.position.z, COURT_MIN_Z, COURT_MAX_Z);
    const speed = player.velocity.length();
    if (speed > 0.08) player.face(playerDirection.copy(player.velocity).normalize(), dt, 11);
    else player.face(faceDirection.copy(defender.root.position).sub(player.root.position).setY(0).normalize(), dt, 4.5);
    player.setAnimation(speed, dt, true);
    return speed;
  }

  function updateDefender(dt) {
    defenderThink -= dt;
    if (defenderThink <= 0) {
      defenderThink = 0.18 + Math.random() * 0.05;
      toHoop.copy(court.centroAro).setY(0).sub(player.root.position).setY(0).normalize();
      defenderTarget.copy(player.root.position).addScaledVector(toHoop, 1.05);
      defenderTarget.x = clamp(defenderTarget.x, -COURT_X, COURT_X);
      defenderTarget.z = clamp(defenderTarget.z, COURT_MIN_Z, COURT_MAX_Z);
    }
    defenderDirection.copy(defenderTarget).sub(defender.root.position).setY(0);
    const distance = defenderDirection.length();
    if (distance > 0.08) defenderDirection.normalize();
    else defenderDirection.set(0, 0, 0);
    desired.copy(defenderDirection).multiplyScalar(Math.min(DEFENDER_SPEED, distance * 4));
    defender.velocity.x = moveToward(defender.velocity.x, desired.x, 6.2 * dt);
    defender.velocity.z = moveToward(defender.velocity.z, desired.z, 6.2 * dt);
    defender.root.position.addScaledVector(defender.velocity, dt);
    defender.root.position.x = clamp(defender.root.position.x, -COURT_X, COURT_X);
    defender.root.position.z = clamp(defender.root.position.z, COURT_MIN_Z, COURT_MAX_Z);

    separation.copy(defender.root.position).sub(player.root.position).setY(0);
    const bodyDistance = separation.length();
    if (bodyDistance < 0.72 && bodyDistance > 0.001) {
      separation.normalize().multiplyScalar((0.72 - bodyDistance) * 0.58);
      defender.root.position.add(separation);
      player.root.position.addScaledVector(separation, -0.42);
      player.velocity.multiplyScalar(0.90);
    }
    defender.face(faceDirection.copy(player.root.position).sub(defender.root.position).setY(0).normalize(), dt, 8.5);
    defender.setAnimation(defender.velocity.length(), dt, false);
  }

  function updateCamera(dt) {
    const speed = player.velocity.length();
    cameraPosition.set(
      player.root.position.x * 0.36,
      3.15 + speed * 0.035,
      player.root.position.z + 5.4 + speed * 0.08,
    );
    render.camera.position.lerp(cameraPosition, 1 - Math.exp(-5.8 * dt));
    cameraTarget.set(
      player.root.position.x * 0.46,
      1.18,
      player.root.position.z - 3.15,
    );
    render.camera.lookAt(cameraTarget);
  }

  function updateHud(speed, dt) {
    hudElapsed += dt;
    if (hudElapsed < 0.1) return;
    hudElapsed = 0;
    speedLabel.textContent = `${speed.toFixed(1)} m/s`;
    rhythmLabel.textContent = ball.cadence > 0 ? `${Math.round(ball.cadence)} bpm` : '-- bpm';
  }

  function frame(time) {
    if (!running || destroyed) return;
    raf = requestAnimationFrame(frame);
    const dt = Math.min((time - lastTime) / 1000, 0.04);
    lastTime = time;
    if (!player || !defender || !ball) {
      render.composer.render();
      return;
    }
    const speed = updatePlayer(dt);
    updateDefender(dt);
    ball.update(dt, player, speed, (force) => audio.play(force));
    updateCamera(dt);
    updateHud(speed, dt);
    render.composer.render();
  }

  async function loadCharacters() {
    const gltf = await gltfLoader().loadAsync('/assets/bob/bob-hoop.glb');
    if (destroyed) return;
    const source = gltf.scene;
    source.rotation.y = -Math.PI / 2;
    normalizeGLTFHeight(source, PLAYER_HEIGHT);
    source.updateMatrixWorld(true);

    player = new HoopBob(source, gltf.animations);
    defender = new HoopBob(source, gltf.animations, { rival: true });
    player.root.position.set(0, 0, 10.2);
    player.root.rotation.y = Math.PI;
    player.facing.set(0, 0, -1);
    defender.root.position.set(0, 0, 7.7);
    defender.root.rotation.y = 0;
    defender.facing.set(0, 0, 1);
    render.scene.add(player.root, defender.root);

    ball = new ControlledBasketball();
    render.scene.add(ball.mesh);
    player.setAnimation(0, 0.016, true);
    defender.setAnimation(0, 0.016, false);
    render.scene.updateMatrixWorld(true);
    ball.reset(player);
    root.classList.add('ready');
    root.querySelector('.hoop-loading').remove();
  }

  return {
    mount({ container }) {
      destroyed = false;
      root = document.createElement('div');
      root.className = 'hoop-game';
      root.innerHTML = `
        <canvas class="hoop-canvas"></canvas>
        <header class="hoop-hud">
          <strong>HOOP SEASON</strong>
          <span data-speed>0.0 m/s</span>
          <span data-rhythm>-- bpm</span>
          <i>BOB</i><i class="rival">RIVAL</i>
        </header>
        <div class="hoop-loading"><span></span></div>
        <div class="hoop-touch">
          <div class="hoop-touch-stick"><span class="hoop-touch-knob"></span></div>
          <button class="hoop-touch-sprint" type="button" aria-label="Correr"></button>
        </div>
      `;
      container.appendChild(root);
      canvas = root.querySelector('.hoop-canvas');
      speedLabel = root.querySelector('[data-speed]');
      rhythmLabel = root.querySelector('[data-rhythm]');
      render = createRenderer(root, canvas);
      court = construirCancha(render.scene, render.renderer);
      input = makeInput(root);
      audio = makeBounceAudio();
      render.camera.position.set(0, 3.2, 15.6);
      render.camera.lookAt(0, 1.15, 6.2);
      render.resize();
      window.addEventListener('resize', render.resize);
      loadCharacters().catch((error) => {
        console.error('HOOP SEASON: no se pudo cargar BOB', error);
        const loading = root?.querySelector('.hoop-loading');
        if (loading) loading.textContent = 'NO SE PUDO CARGAR BOB';
      });
    },
    start() {
      if (running || destroyed) return;
      running = true;
      lastTime = performance.now();
      raf = requestAnimationFrame(frame);
    },
    pause() {
      running = false;
      cancelAnimationFrame(raf);
    },
    resize() {
      render?.resize?.();
    },
    destroy() {
      destroyed = true;
      running = false;
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', render?.resize);
      input?.destroy?.();
      audio?.destroy?.();
      player?.dispose?.();
      defender?.dispose?.();
      ball?.dispose?.();
      court?.dispose?.();
      if (render?.scene) disposeScene(render.scene);
      render?.composer?.dispose?.();
      render?.renderer?.dispose?.();
      render?.renderer?.forceContextLoss?.();
      root?.remove();
      root = null;
    },
  };
}
