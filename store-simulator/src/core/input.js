// Input por acciones (teclado, controles virtuales y joystick). SIN pointer
// lock: el mouse queda visible y libre para clickear productos.
//
// ---- JOYSTICK (DualSense de PS5 y cualquier otro) --------------------------
// Kusher lo pidio para probar el simulador con el joystick de la PS5 enchufado
// por cable a la Mac. No hace falta instalar NADA: la Mac lo reconoce sola y el
// navegador lo lee con la Gamepad API, que ya viene en Chrome y Safari.
//
// ⚠️ HAY QUE APRETAR UN BOTON DEL JOYSTICK PARA QUE APAREZCA. El navegador no
// lista un joystick hasta que le llega la primera pulsacion — es a proposito,
// para que una pagina no pueda saber que tenes enchufado sin que vos lo uses.
// O sea: si lo enchufas y no anda, apreta cualquier boton y ahi arranca.
//
// ⚠️ NO SE LEE POR EVENTOS, SE PREGUNTA CADA CUADRO. La Gamepad API no avisa
// cuando se mueve un stick: hay que pedirle el estado. Por eso `axes()` llama a
// `navigator.getGamepads()` cada vez en vez de guardarse una referencia — el
// objeto que devuelve es una FOTO del momento y una referencia vieja se queda
// congelada con los valores del primer cuadro.
const ZONA_MUERTA = 0.18;   // los sticks del DualSense siempre tiemblan un poco

// Mapa de botones del "standard gamepad", que es como el navegador presenta al
// DualSense. Los nombres de PlayStation al lado para poder leerlo.
const BOTON = {
  CRUZ: 0,        // X  — interactuar (lo mismo que la tecla E)
  CIRCULO: 1,     // O
  CUADRADO: 2,    // □  — celular (lo mismo que la tecla C)
  TRIANGULO: 3,   // △
  L1: 4,
  R1: 5,          // correr
  L2: 6,
  R2: 7,          // correr
};

export class Input {
  constructor(domElement) {
    this.dom = domElement;
    this.keys = new Set();
    this.virtualAxes = { x: 0, z: 0 };
    this._interactQueued = false;
    // Botones que estaban apretados el cuadro anterior, para detectar el
    // FLANCO: sin esto, dejar la cruz apretada dispararia interactuar sesenta
    // veces por segundo.
    this._padAntes = new Set();

    window.addEventListener('keydown', (e) => {
      if (e.repeat) return;
      this.keys.add(e.code);
      if (e.code === 'KeyE') this._interactQueued = true;
    });
    window.addEventListener('keyup', (e) => this.keys.delete(e.code));
    window.addEventListener('blur', () => {
      this.keys.clear();
      this.clearVirtualAxes();
      this._padAntes.clear();
    });

    window.addEventListener('gamepadconnected', (e) => {
      console.info(`FOURTWENTY: joystick conectado — ${e.gamepad.id}. Stick izquierdo mover · R2/R1 correr · X interactuar · ▢ celular.`);
    });
    window.addEventListener('gamepaddisconnected', () => {
      this._padAntes.clear();
      console.info('FOURTWENTY: joystick desconectado.');
    });
  }

  // El primer joystick que este realmente conectado. Devuelve null si no hay.
  _pad() {
    const lista = navigator.getGamepads?.() ?? [];
    for (const pad of lista) if (pad?.connected) return pad;
    return null;
  }

  // ⚠️ Zona muerta RADIAL, no por eje. Si se recorta cada eje por separado, al
  // empujar el stick en diagonal justo arriba del umbral el personaje sale
  // recto en vez de en diagonal. Ademas se reescala lo que queda, para que
  // empujando a fondo se siga llegando a 1 y no a 0,82.
  _stick(pad, ejeX, ejeZ) {
    const x = pad.axes[ejeX] ?? 0;
    const y = pad.axes[ejeZ] ?? 0;
    const largo = Math.hypot(x, y);
    if (largo < ZONA_MUERTA) return { x: 0, z: 0 };
    const escala = ((largo - ZONA_MUERTA) / (1 - ZONA_MUERTA)) / largo;
    // El stick hacia ARRIBA da -1 en la Gamepad API, y adelante en el juego es
    // +1: por eso el menos.
    return { x: x * escala, z: -y * escala };
  }

  // Ejes de movimiento (-1..1): x = strafe, z = adelante/atrás
  axes() {
    const k = this.keys;
    const keyboardX = (k.has('KeyD') || k.has('ArrowRight') ? 1 : 0) - (k.has('KeyA') || k.has('ArrowLeft') ? 1 : 0);
    const keyboardZ = (k.has('KeyW') || k.has('ArrowUp') ? 1 : 0) - (k.has('KeyS') || k.has('ArrowDown') ? 1 : 0);
    const pad = this._pad();
    const stick = pad ? this._stick(pad, 0, 1) : { x: 0, z: 0 };
    const x = Math.max(-1, Math.min(1, keyboardX + this.virtualAxes.x + stick.x));
    const z = Math.max(-1, Math.min(1, keyboardZ + this.virtualAxes.z + stick.z));
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

  // Shift apretado → correr (estilo GTA). En el joystick, R2 o R1.
  sprinting() {
    if (this.keys.has('ShiftLeft') || this.keys.has('ShiftRight')) return true;
    const pad = this._pad();
    return !!pad && (pad.buttons[BOTON.R2]?.pressed || pad.buttons[BOTON.R1]?.pressed);
  }

  // Lee los botones del joystick y devuelve los que se acaban de apretar
  // (flanco). Se llama UNA vez por cuadro desde `consumeInteract`.
  _reciénApretados() {
    const pad = this._pad();
    const nuevos = new Set();
    if (!pad) { this._padAntes.clear(); return nuevos; }
    const ahora = new Set();
    for (let i = 0; i < pad.buttons.length; i++) {
      if (!pad.buttons[i]?.pressed) continue;
      ahora.add(i);
      if (!this._padAntes.has(i)) nuevos.add(i);
    }
    this._padAntes = ahora;
    return nuevos;
  }

  // true una sola vez por pulsación de E o de la cruz (interactuar con lo más
  // cercano). Tambien abre el celular con el cuadrado, porque el celular se
  // abre con una tecla y con el joystick no hay teclado.
  consumeInteract() {
    const nuevos = this._reciénApretados();
    if (nuevos.has(BOTON.CUADRADO)) {
      // Se manda la tecla C de verdad para no tener que cablear el celular
      // aparte: quien escucha la C ya existe y funciona.
      window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyC', bubbles: true }));
    }
    const q = this._interactQueued || nuevos.has(BOTON.CRUZ);
    this._interactQueued = false;
    return q;
  }
}
