// Input por acciones (teclado + mouse con pointer lock).
// Fase 6 agrega acá el joystick táctil sin tocar el resto del juego.
export class Input {
  constructor(domElement) {
    this.dom = domElement;
    this.keys = new Set();
    this.mouseDX = 0;
    this.mouseDY = 0;
    this._interactQueued = false;

    window.addEventListener('keydown', (e) => {
      if (e.repeat) return;
      this.keys.add(e.code);
      if (e.code === 'KeyE') this._interactQueued = true;
    });
    window.addEventListener('keyup', (e) => this.keys.delete(e.code));
    window.addEventListener('blur', () => this.keys.clear());

    document.addEventListener('mousemove', (e) => {
      if (document.pointerLockElement === this.dom) {
        this.mouseDX += e.movementX;
        this.mouseDY += e.movementY;
      }
    });
  }

  lockPointer() {
    this.dom.requestPointerLock();
  }

  get locked() {
    return document.pointerLockElement === this.dom;
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

  // Delta de mouse acumulado desde el último frame (lo consume la cámara).
  consumeMouse() {
    const d = { x: this.mouseDX, y: this.mouseDY };
    this.mouseDX = 0;
    this.mouseDY = 0;
    return d;
  }

  // true una sola vez por pulsación de E (para Fase 2: interactuar).
  consumeInteract() {
    const q = this._interactQueued;
    this._interactQueued = false;
    return q;
  }
}
