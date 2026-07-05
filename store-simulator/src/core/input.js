// Input por acciones (teclado). SIN pointer lock: el mouse queda visible y
// libre para clickear productos — la cámara ya no se mueve con el mouse.
// Fase 6 agrega acá el joystick táctil sin tocar el resto del juego.
export class Input {
  constructor(domElement) {
    this.dom = domElement;
    this.keys = new Set();
    this._interactQueued = false;

    window.addEventListener('keydown', (e) => {
      if (e.repeat) return;
      this.keys.add(e.code);
      if (e.code === 'KeyE') this._interactQueued = true;
    });
    window.addEventListener('keyup', (e) => this.keys.delete(e.code));
    window.addEventListener('blur', () => this.keys.clear());
  }

  // Ejes de movimiento (-1..1): x = strafe, z = adelante/atrás
  axes() {
    const k = this.keys;
    const x = (k.has('KeyD') || k.has('ArrowRight') ? 1 : 0) - (k.has('KeyA') || k.has('ArrowLeft') ? 1 : 0);
    const z = (k.has('KeyW') || k.has('ArrowUp') ? 1 : 0) - (k.has('KeyS') || k.has('ArrowDown') ? 1 : 0);
    return { x, z };
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
