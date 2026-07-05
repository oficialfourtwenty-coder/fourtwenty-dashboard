// Cámara tercera persona FIJA (pedido del dueño): el mouse NO mueve la
// cámara — queda libre para clickear productos. La cámara sigue sola a BOB:
// caminando se alinea detrás de la dirección de marcha, parado se acomoda a
// su espalda. Más cerca que antes (zoom retina) y con inercia suave.
// Los límites (paredes/techo) son parámetro: cada escena pasa los suyos,
// así no se mete en muros al entrar al local o ir al fondo.
// (la versión con mouse-orbit quedó en camera.backup.js)
import * as THREE from 'three';

const FOCUS_HEIGHT = 1.15; // mira al pecho, no a la cabeza → cámara más baja
const CAM_LAG = 7;         // inercia del giro (menos = más pesada)
const FOLLOW_LAG = 7;      // inercia del seguimiento de posición
const FACE_ALIGN = 3.2;    // qué tan rápido sigue el giro de BOB (A/D)
const WALK_ALIGN = 2.6;    // respaldo: alinear detrás de la marcha (billboard)
const PITCH = 0.24;        // ángulo fijo, leve picado (estilo GTA)

const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));

export class ThirdPersonCamera {
  // bounds: { minX, maxX, minZ, maxZ } — hasta dónde puede llegar la cámara
  // en el plano horizontal. Cada escena (calle, local, shopping) pasa lo suyo.
  constructor(camera, bounds = { minX: -1000, maxX: 1000, minZ: -1000, maxZ: 1000 }) {
    this.camera = camera;
    this.bounds = bounds;
    this.yaw = Math.PI;
    this.targetYaw = this.yaw;
    this.dist = 2.6;           // más zoom que antes (era 3.0)
    this.focus = new THREE.Vector3();
    this._prev = new THREE.Vector3();
    // vectores de trabajo reusados cada cuadro (no crear basura en el loop)
    this._chest = new THREE.Vector3();
    this._cp = new THREE.Vector3();
    this._first = true;
  }

  update(dt, targetPos, floorY, facingYaw = null, ceilingHeight = 3.4) {
    // 1) La cámara sigue el GIRO de BOB (A/D lo rotan; el mouse queda libre):
    //    siempre busca quedar detrás de su espalda, girando con él.
    if (!this._first) {
      if (facingYaw !== null) {
        const behind = facingYaw + Math.PI;
        this.targetYaw += wrap(behind - this.targetYaw) * Math.min(1, FACE_ALIGN * dt);
      } else {
        // respaldo (sprite billboard): alinear detrás de la dirección de marcha
        const vx = targetPos.x - this._prev.x;
        const vz = targetPos.z - this._prev.z;
        if (vx * vx + vz * vz > 1e-6) {
          const behind = Math.atan2(vx, vz) + Math.PI;
          this.targetYaw += wrap(behind - this.targetYaw) * Math.min(1, WALK_ALIGN * dt);
        }
      }
    }
    this._prev.copy(targetPos);

    // 2) Giro con inercia (peso GTA).
    const s = 1 - Math.exp(-CAM_LAG * dt);
    this.yaw += wrap(this.targetYaw - this.yaw) * s;

    // 3) Punto que mira: el pecho de BOB, seguido con retardo.
    const chest = this._chest.set(targetPos.x, targetPos.y + FOCUS_HEIGHT, targetPos.z);
    if (this._first) {
      this.focus.copy(chest);
      this._first = false;
    } else {
      this.focus.lerp(chest, 1 - Math.exp(-FOLLOW_LAG * dt));
    }

    // 4) Posición orbital detrás del foco, pitch fijo.
    const cp = this._cp.set(
      this.focus.x + Math.sin(this.yaw) * Math.cos(PITCH) * this.dist,
      this.focus.y + Math.sin(PITCH) * this.dist,
      this.focus.z + Math.cos(this.yaw) * Math.cos(PITCH) * this.dist,
    );

    // 5) Clamp a los límites de la escena actual (paredes) y al piso/techo.
    cp.x = THREE.MathUtils.clamp(cp.x, this.bounds.minX + 0.35, this.bounds.maxX - 0.35);
    cp.z = THREE.MathUtils.clamp(cp.z, this.bounds.minZ + 0.35, this.bounds.maxZ - 0.35);
    cp.y = THREE.MathUtils.clamp(cp.y, floorY + 0.3, floorY + ceilingHeight - 0.4);

    this.camera.position.copy(cp);
    this.camera.lookAt(this.focus);
  }
}
