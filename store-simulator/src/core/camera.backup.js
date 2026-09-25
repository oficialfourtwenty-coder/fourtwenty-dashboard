// Cámara tercera persona: órbita yaw/pitch con mouse, follow con
// suavizado exponencial (independiente del framerate) y clamp al interior
// del local para no atravesar paredes ni losas.
import * as THREE from 'three';

export class ThirdPersonCamera {
  constructor(camera) {
    this.camera = camera;
    this.yaw = Math.PI;        // arranca mirando al fondo del local
    this.pitch = 0.25;
    this.dist = 4.0;
    this.sensitivity = 0.0028;
    this.focus = new THREE.Vector3();
    this._first = true;
  }

  update(dt, mouse, targetPos, floorY) {
    this.yaw -= mouse.x * this.sensitivity;
    this.pitch = THREE.MathUtils.clamp(this.pitch + mouse.y * this.sensitivity, -0.55, 1.15);

    // Punto que mira la cámara: la cabeza de BOB.
    const head = new THREE.Vector3(targetPos.x, targetPos.y + 1.45, targetPos.z);
    if (this._first) {
      this.focus.copy(head);
      this._first = false;
    } else {
      const t = 1.0 - Math.exp(-10 * dt); // suavizado correcto a cualquier FPS
      this.focus.lerp(head, t);
    }

    // Posición orbital detrás del foco.
    const cp = new THREE.Vector3(
      this.focus.x + Math.sin(this.yaw) * Math.cos(this.pitch) * this.dist,
      this.focus.y + Math.sin(this.pitch) * this.dist,
      this.focus.z + Math.cos(this.yaw) * Math.cos(this.pitch) * this.dist,
    );

    // Clamp al interior del local (paredes) y al piso/techo del nivel actual.
    cp.x = THREE.MathUtils.clamp(cp.x, -6.6, 6.6);
    cp.z = THREE.MathUtils.clamp(cp.z, -4.6, 4.6);
    cp.y = THREE.MathUtils.clamp(cp.y, floorY + 0.35, floorY + 3.15);

    this.camera.position.copy(cp);
    this.camera.lookAt(this.focus);
  }
}
