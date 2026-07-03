// Cámara tercera persona estilo GTA San Andreas / PS2:
// - más baja y más cerca del personaje
// - el mouse mueve un "objetivo" y la cámara lo persigue con inercia (nada de 1:1)
// - si BOB camina y no tocás el mouse, la cámara se acomoda sola detrás de él
// - rango de pitch acotado: pegada al personaje, no free-cam tipo Minecraft
// (la versión anterior quedó en camera.backup.js)
import * as THREE from 'three';
import { INTERIOR, FLOOR_H } from '../world/building.js';

const DIST = 3.4;          // distancia al personaje
const FOCUS_HEIGHT = 1.15; // mira al pecho, no a la cabeza → cámara más baja
const PITCH_MIN = -0.32;   // no se puede mirar tan al piso…
const PITCH_MAX = 0.72;    // …ni tan al cielo (antes 1.15)
const CAM_LAG = 8;         // qué tan pesada es la inercia del mouse (menos = más pesada)
const FOLLOW_LAG = 7;      // qué tan pesado es el seguimiento de posición
const AUTO_ALIGN = 1.3;    // fuerza con la que se acomoda detrás al caminar

const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));

export class ThirdPersonCamera {
  constructor(camera) {
    this.camera = camera;
    this.yaw = Math.PI;        // arranca mirando al fondo del local
    this.pitch = 0.18;
    this.targetYaw = this.yaw;
    this.targetPitch = this.pitch;
    this.sensitivity = 0.0022;
    this.focus = new THREE.Vector3();
    this._prev = new THREE.Vector3();
    this._first = true;
  }

  update(dt, mouse, targetPos, floorY) {
    // 1) El mouse mueve el objetivo de la cámara…
    this.targetYaw -= mouse.x * this.sensitivity;
    this.targetPitch = THREE.MathUtils.clamp(
      this.targetPitch + mouse.y * this.sensitivity, PITCH_MIN, PITCH_MAX,
    );

    // 2) …y si BOB camina con el mouse quieto, el objetivo se acomoda detrás de él.
    if (!this._first && Math.abs(mouse.x) < 2) {
      const vx = targetPos.x - this._prev.x;
      const vz = targetPos.z - this._prev.z;
      if (vx * vx + vz * vz > 1e-6) {
        const behind = Math.atan2(vx, vz) + Math.PI; // yaw que deja la cámara a la espalda
        this.targetYaw += wrap(behind - this.targetYaw) * Math.min(1, AUTO_ALIGN * dt);
      }
    }
    this._prev.copy(targetPos);

    // 3) La cámara real persigue al objetivo con inercia (peso GTA).
    const s = 1 - Math.exp(-CAM_LAG * dt); // suavizado correcto a cualquier FPS
    this.yaw += wrap(this.targetYaw - this.yaw) * s;
    this.pitch += (this.targetPitch - this.pitch) * s;

    // 4) Punto que mira: el pecho de BOB, seguido con retardo.
    const chest = new THREE.Vector3(targetPos.x, targetPos.y + FOCUS_HEIGHT, targetPos.z);
    if (this._first) {
      this.focus.copy(chest);
      this._first = false;
    } else {
      this.focus.lerp(chest, 1 - Math.exp(-FOLLOW_LAG * dt));
    }

    // 5) Posición orbital detrás del foco.
    const cp = new THREE.Vector3(
      this.focus.x + Math.sin(this.yaw) * Math.cos(this.pitch) * DIST,
      this.focus.y + Math.sin(this.pitch) * DIST,
      this.focus.z + Math.cos(this.yaw) * Math.cos(this.pitch) * DIST,
    );

    // 6) Clamp al interior del local (paredes) y al piso/techo del nivel actual.
    cp.x = THREE.MathUtils.clamp(cp.x, -(INTERIOR.x - 0.35), INTERIOR.x - 0.35);
    cp.z = THREE.MathUtils.clamp(cp.z, -(INTERIOR.z - 0.35), INTERIOR.z - 0.35);
    cp.y = THREE.MathUtils.clamp(cp.y, floorY + 0.3, floorY + FLOOR_H - 0.5);

    this.camera.position.copy(cp);
    this.camera.lookAt(this.focus);
  }
}
