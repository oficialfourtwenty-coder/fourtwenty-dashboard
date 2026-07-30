// Input por acciones (teclado y controles virtuales). SIN pointer lock: el
// mouse queda visible y libre para clickear productos.
export class Input {
  constructor(domElement) {
    this.dom = domElement;
    this.keys = new Set();
    this.virtualAxes = { x: 0, z: 0 };
    this._interactQueued = false;

    window.addEventListener('keydown', (e) => {
      if (e.repeat) return;
      this.keys.add(e.code);
      if (e.code === 'KeyE') this._interactQueued = true;
    });
    window.addEventListener('keyup', (e) => this.keys.delete(e.code));
    window.addEventListener('blur', () => {
      this.keys.clear();
      this.clearVirtualAxes();
    });
  }

  // Ejes de movimiento (-1..1): x = strafe, z = adelante/atrás
  axes() {
    const k = this.keys;
    const keyboardX = (k.has('KeyD') || k.has('ArrowRight') ? 1 : 0) - (k.has('KeyA') || k.has('ArrowLeft') ? 1 : 0);
    const keyboardZ = (k.has('KeyW') || k.has('ArrowUp') ? 1 : 0) - (k.has('KeyS') || k.has('ArrowDown') ? 1 : 0);
    const x = Math.max(-1, Math.min(1, keyboardX + this.virtualAxes.x));
    const z = Math.max(-1, Math.min(1, keyboardZ + this.virtualAxes.z));
    return { x, z };
  }

  setVirtualAxes(x, z) {
    this.virtualAxes.x = Math.max(-1, Math.min(1, Number(x) || 0));
    this.virtualAxes.z = Math.max(-1, Math.min(1, Number(z) || 0));
  }

  clearVirtualAxes() {
    this.virtualAxes.x = 0;
    this.virtualAxes.z = 0;
  }

  // Shift apretado → correr (estilo GTA).
  sprinting() {
    return this.keys.has('ShiftLeft') || this.keys.has('ShiftRight');
  }

  // true una sola vez por pulsación de E (interactuar con lo más cercano).
  consumeInteract() {
    const q = this._interactQueued;
    this._interactQueued = false;
    return q;
  }
}
