// BOB 3D: jugador con física estilo GTA San Andreas.
// - Carga public/assets/bob/bob.glb (se normaliza escala/pies automáticamente).
//   · Si el GLB trae animation clips (idle/walk/run) usa AnimationMixer con crossfade.
//   · Si no trae, animación procedural: bounce al caminar, lean en giros.
// - Si el GLB no existe, muestra un muñeco placeholder (el sistema sprite viejo
//   sigue intacto en bob.js como backup).
// - Movimiento con peso: aceleración/frenada en rampa (~0.2s), rotación con
//   velocidad angular limitada (sin snap), sprint con Shift.
import * as THREE from 'three';
import { sampleGround } from '../world/building.js';
import { normalizeGLTFHeight } from '../world/gltfUtils.js';
import { gltfLoader } from '../world/gltfLoaders.js';
import { BOB_SKINS, aplicarSkin, bobElegido } from './bobSkins.js';

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

// ── Modelos de BOB para probar ───────────────────────────────────────────────
// ⚠️ EN ESTA RAMA DE PRUEBA el que sale por defecto es el de Meshy, para que
// Kusher no tenga que acordarse de agregar nada a la direccion. El de siempre
// se sigue viendo con `?bob=viejo`.
// ⚠️ Antes de pasar esto a la rama oficial hay que volver a poner `bob.glb`
// como POR_DEFECTO: el de Meshy pesa 2,34 MB contra 0,72 MB y todavia no tiene
// textura, o sea que sale blanco.
// El giro es porque cada modelo viene mirando para otro lado: el de Tripo trae
// el frente en +x, el de Meshy ya viene en +z.
// `alto` es cuanto mide en metros. 1,7 es el de siempre; el de Meshy va un 20%
// mas grande por pedido de Kusher (03/09), y por eso lo trae cada modelo por
// separado: un HEIGHT global agrandaria tambien al BOB aprobado.
const MODELOS_BOB = {
  viejo: { archivo: 'assets/bob/bob.glb', giroY: -Math.PI / 2, pelaje: true, alto: HEIGHT },
  meshy: { archivo: 'assets/bob/bob-meshy.glb', giroY: 0, pelaje: false, alto: HEIGHT * 1.2 },
};
const POR_DEFECTO = 'meshy';
function modeloElegido() {
  let cual = '';
  try { cual = new URLSearchParams(location.search).get('bob') ?? ''; } catch { /* sin location */ }
  return MODELOS_BOB[cual] ?? MODELOS_BOB[POR_DEFECTO];
}

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
    this.actions = {};          // { idle, walk, run } acciones del GLB si existen
    this.model = null;
    this._isBillboard = false;
    this.sampleGround = sampleGround; // la escena activa puede reemplazarla
    // Pelaje elegido en la pantalla de carga. Si nunca eligio, el original.
    this._skin = bobElegido() ?? BOB_SKINS[0];

    this._modelo = modeloElegido();
    gltfLoader().load(
      this._modelo.archivo,
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
    // Cada GLB viene mirando para otro lado; se lo gira para que mire a +z
    // (la convención del rig; esto arregla el "se ve de costado").
    model.rotation.y = this._modelo.giroY;
    // normalizar: que mida lo que pide su ficha y apoye los pies en y=0
    normalizeGLTFHeight(model, this._modelo.alto);

    this.model = model;
    this.rig.add(model);

    // El pelaje elegido en la pantalla de carga. Va antes que la animación
    // porque `aplicarSkin` clona el material, y clonarlo después dejaría al
    // BOB del jugador y a la estatua del piso 4 compartiendo el mismo.
    // El modelo de Meshy viene SIN textura, y las recetas de pelaje repintan el
    // atlas del BOB original: sin atlas no hay nada que repintar.
    if (this._modelo.pelaje) aplicarSkin(model, this._skin);

    // ¿Trae clips de animación?
    // ⚠️ BOB tiene TRES: `BOB_idle`, `BOB_walk` y `BOB_run`. Hasta el 03/09 el
    // código buscaba uno solo con /run|walk|jog|move/ y `Array.find` devuelve
    // el PRIMERO que coincide, que en el orden del archivo es `BOB_run`. O sea
    // que BOB caminaba con la animación de correr, ralentizada — por eso movía
    // los brazos de más al ir despacio. El clip de caminata estaba ahí, sin
    // usar. Ahora se mezclan los tres según la velocidad real.
    const clips = gltf.animations || [];
    if (clips.length) {
      this.mixer = new THREE.AnimationMixer(model);
      const find = (re) => clips.find((c) => re.test(c.name));
      const idleClip = find(/idle|stand|breath/i);
      const walkClip = find(/walk|caminar/i);
      const runClip = find(/run|sprint|jog/i);

      const usar = (clip) => {
        const a = this.mixer.clipAction(clip);
        a.play();
        a.weight = 0;
        return a;
      };
      // El de andar: caminata si existe; si no, la corrida; si no, el primero.
      this.actions.walk = usar(walkClip || runClip || clips[0]);
      // El de correr solo cuenta como separado si de verdad es otro clip.
      this.actions.run = runClip && walkClip ? usar(runClip) : null;
      this.actions.idle = idleClip ? usar(idleClip) : this.actions.walk;
      // Sin clip de quieto, la pose neutra sale de pausar la caminata en su
      // primer cuadro. Ojo: `actions.idle` es la MISMA accion que `walk`, asi
      // que en ese caso no se le puede dar un peso propio.
      this._sinIdle = !idleClip;
      this.actions.walk.weight = 1;

      console.info(`${this._modelo.archivo}: ${clips.length} clips → idle="${idleClip?.name ?? '(pose neutra)'}" walk="${(walkClip || runClip || clips[0]).name}" run="${this.actions.run ? runClip.name : '(usa el de caminar)'}"`);
    } else {
      console.info('bob.glb sin animation clips — animación procedural activada');
    }
  }

  // Cambiar de BOB en vivo (lo usa la pantalla de elección para la vista
  // previa, y sirve si algún día se puede cambiar de pelaje dentro del juego).
  setSkin(skin) {
    this._skin = skin;
    if (this.model && !this._isBillboard && this._modelo.pelaje) aplicarSkin(this.model, skin);
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
    //    A/D giran a BOB sobre su eje; W avanza; S retrocede más lento.
    //    Girar quieto no debe empujar ni desplazar al avatar.
    const { x: turnInput, z: fwdInput } = input.axes();
    const topSpeed = input.sprinting() ? RUN : WALK;
    let yawRate = 0;
    if (!this._isBillboard) {
      this.modelYaw -= turnInput * TURN_SPIN * dt;
      yawRate = -turnInput * TURN_SPIN;
    }

    const speedMul = fwdInput < 0 ? 0.6 : 1;
    const wishSpeed = fwdInput * topSpeed * speedMul;
    const wish = this._wish.set(Math.sin(this.modelYaw), 0, Math.cos(this.modelYaw))
      .multiplyScalar(wishSpeed);
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

    // 5) Rotación del cuerpo: sigue al rumbo (calculado arriba). El lean
    //    procedural usa la velocidad de giro real (yawRate).
    if (this._isBillboard) {
      // el sprite de respaldo siempre mira a cámara
      this.rig.rotation.y = Math.atan2(camPos.x - this.position.x, camPos.z - this.position.z);
    } else {
      this.rig.rotation.y = this.modelYaw;
    }

    // 6) Animación
    if (this.mixer) {
      if (this._sinIdle) {
        // Sin clip de quieto: la pose neutra es la caminata pausada en su
        // primer cuadro. Si además trae corrida, igual se mezclan las dos —
        // antes este caso usaba SOLO la caminata acelerada y el clip de correr
        // quedaba sin usar, que es el mismo error que tenía BOB al revés.
        const quieto = speed < 0.05;
        const aCorrer = this.actions.run
          ? THREE.MathUtils.clamp((speed - WALK) / (RUN - WALK), 0, 1) : 0;
        this.actions.walk.weight = 1 - aCorrer;
        this.actions.walk.paused = quieto;
        this.actions.walk.timeScale = THREE.MathUtils.clamp(speed / WALK, 0.6, 1.4);
        if (this.actions.run) {
          this.actions.run.weight = aCorrer;
          this.actions.run.paused = quieto;
          this.actions.run.timeScale = THREE.MathUtils.clamp(speed / RUN, 0.7, 1.3);
        }
      } else if (this.actions.run) {
        // Tres clips: quieto → caminando → corriendo, mezclados por velocidad.
        // Dos tramos, no uno: de 0 a WALK se cruza idle con caminata, y de WALK
        // a RUN se cruza caminata con corrida. Así la corrida entra recién
        // cuando de verdad está corriendo, en vez de acelerar la caminata.
        const aCaminar = THREE.MathUtils.clamp(speed / WALK, 0, 1);
        const aCorrer = THREE.MathUtils.clamp((speed - WALK) / (RUN - WALK), 0, 1);
        this.actions.idle.weight = 1 - aCaminar;
        this.actions.walk.weight = aCaminar * (1 - aCorrer);
        this.actions.run.weight = aCaminar * aCorrer;
        // Cada clip acompaña el paso, pero cada uno contra SU propia velocidad
        // de referencia: si no, la corrida se reproduce al doble.
        this.actions.walk.timeScale = THREE.MathUtils.clamp(speed / WALK, 0.6, 1.4);
        this.actions.run.timeScale = THREE.MathUtils.clamp(speed / RUN, 0.7, 1.3);
      } else {
        // crossfade idle ↔ caminata según velocidad, y el clip acompaña el paso
        const w = THREE.MathUtils.clamp(speed / WALK, 0, 1);
        this.actions.walk.weight = w;
        this.actions.idle.weight = 1 - w;
        this.actions.walk.timeScale = THREE.MathUtils.clamp(speed / WALK, 0.6, 1.8);
      }
      this.mixer.update(dt);
    } else if (this.model && !this._isBillboard) {
      // procedural: bounce al ritmo del paso + lean hacia el giro + tilt al acelerar
      this.walkPhase += speed * 4.2 * dt;
      const bounce = Math.abs(Math.sin(this.walkPhase)) * 0.05 * Math.min(1, speed / WALK);
      this.model.position.y += (bounce - (this._lastBounce || 0));
      this._lastBounce = bounce;
      const lean = THREE.MathUtils.clamp(-yawRate * 0.025, -0.13, 0.13);
      const tilt = THREE.MathUtils.clamp(speed / RUN, 0, 1) * 0.06;
      this.model.rotation.z += (lean - this.model.rotation.z) * Math.min(1, 8 * dt);
      this.model.rotation.x += (tilt - this.model.rotation.x) * Math.min(1, 8 * dt);
    }

    // 7) Sombra blob pegada al piso
    this.shadow.position.set(this.position.x, ground + 0.02, this.position.z);
    // La sombra acompaña el tamaño del modelo: si BOB va un 20% mas grande, su
    // sombra tambien, o queda flotando sobre una mancha chica.
    const squash = 1 - Math.min(0.35, Math.max(0, this.position.y - ground) * 0.5);
    this.shadow.scale.setScalar(squash * (this._modelo.alto / HEIGHT));
  }
}
