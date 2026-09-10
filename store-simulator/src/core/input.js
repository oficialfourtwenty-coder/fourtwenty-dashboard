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

// ---- MAPA DE BOTONES (elegido por Kusher) ----------------------------------
//   L3 (apretar stick izq)  correr
//   ○  Circulo              interactuar   (= tecla E)
//   △  Triangulo            editor        (= tecla T)
//   L2 mantenido            ver colisiones(= tecla K)
//   □  Cuadrado             abrir/cerrar el Banapod (= tecla C)
//   ✕  Cruz                 saltar
//   R1                      golpe  (= tecla F)
//   L1                      baile  (= tecla B)
//   R2                      picar la pelota (= tecla N)
//
// ⚠️ Las que ya existian como TECLA se mandan como tecla sintetica en vez de
// cablearlas de nuevo: el que escucha la T, la K o la C ya existe y anda. Un
// `KeyboardEvent` disparado sobre `window` SI lo reciben los listeners de la
// propia pagina (lo que no funciona es al reves: mandarselo a Playwright desde
// afuera para simular a un usuario).
import { BOTON } from './mando.js';

// Escribiendo en un campo, el espacio es un espacio y no un salto.
const isTypingTarget = (target) => !!target?.matches?.('input, textarea, select, [contenteditable="true"]');

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
    this._l2Antes = false;
    this._saltoPedido = false;
    this._gestoPedido = null;

    window.addEventListener('keydown', (e) => {
      if (e.repeat) return;
      this.keys.add(e.code);
      if (e.code === 'KeyE') this._interactQueued = true;
      // Espacio salta, igual que la ✕ del joystick. Se corta el scroll de la
      // pagina: sin esto, saltar corre la pantalla para abajo.
      if (e.code === 'Space' && !isTypingTarget(e.target)) {
        e.preventDefault();
        this._saltoPedido = true;
      }
      if (!isTypingTarget(e.target)) {
        if (e.code === 'KeyF') this._gestoPedido = 'golpe';
        if (e.code === 'KeyB') this._gestoPedido = 'baile';
        if (e.code === 'KeyN') this._gestoPedido = 'pelota';
      }
    });
    window.addEventListener('keyup', (e) => this.keys.delete(e.code));
    window.addEventListener('blur', () => {
      this.keys.clear();
      this.clearVirtualAxes();
      this._padAntes.clear();
      this._saltoPedido = false;
      this._gestoPedido = null;
    });

    window.addEventListener('gamepadconnected', (e) => {
      console.info(`FOURTWENTY: joystick conectado — ${e.gamepad.id}. Stick izq mover · L3 correr · ✕ saltar · R1 golpe · L1 baile · R2 pelota · ○ interactuar · ▢ Banapod · △ editor · L2 ver colisiones.`);
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

  // Shift apretado → correr (estilo GTA). En el joystick, L3: apretar el stick
  // izquierdo, como en los shooters. Deja los gatillos libres.
  sprinting() {
    if (this.keys.has('ShiftLeft') || this.keys.has('ShiftRight')) return true;
    const pad = this._pad();
    return !!pad && !!pad.buttons[BOTON.L3]?.pressed;
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

  // true una sola vez por pulsación de E o del CIRCULO (interactuar con lo mas
  // cercano). Se llama una vez por cuadro desde el bucle de `main.js`, y por eso
  // es tambien el lugar donde se leen los demas botones.
  consumeInteract() {
    const nuevos = this._reciénApretados();
    const editorAbierto = !!window.__worldEditor?.isEnabled?.();

    if (nuevos.has(BOTON.CUADRADO)) this._tecla('KeyC');    // Banapod
    if (nuevos.has(BOTON.TRIANGULO)) this._tecla('KeyT');   // editor
    if (nuevos.has(BOTON.CRUZ)) this._saltoPedido = true;   // saltar
    if (nuevos.has(BOTON.R1)) this._gestoPedido = 'golpe';
    if (nuevos.has(BOTON.L1)) this._gestoPedido = 'baile';
    if (nuevos.has(BOTON.R2)) this._gestoPedido = 'pelota';

    // ⚠️ Con el editor abierto BOB no se actualiza, asi que nadie consume el
    // salto: sin esta linea, la ✕ apretada dentro del editor (donde sirve para
    // otra cosa) quedaria guardada y BOB pegaria un salto solo al cerrarlo.
    if (editorAbierto) { this._saltoPedido = false; this._gestoPedido = null; }

    // ⚠️ L2 = ver colisiones SOLO con el editor CERRADO. Adentro del editor L2
    // baja el objeto seleccionado (ver worldEditor), y las dos cosas en el
    // mismo gatillo se pelean.
    if (!editorAbierto) {
      const l2 = !!this._pad()?.buttons[BOTON.L2]?.pressed;
      // El visor es un interruptor: se manda la K al apretar y otra al soltar,
      // asi "mantenido" se comporta como mantenido.
      if (l2 !== this._l2Antes) { this._tecla('KeyK'); this._l2Antes = l2; }
    }

    const q = this._interactQueued || nuevos.has(BOTON.CIRCULO);
    this._interactQueued = false;
    return q;
  }

  _tecla(code) {
    window.dispatchEvent(new KeyboardEvent('keydown', { code, bubbles: true }));
  }

  // true una sola vez por pulsacion de la cruz. Lo consume `bob3d.update`.
  consumeJump() {
    const q = this._saltoPedido;
    this._saltoPedido = false;
    return q;
  }

  /** 'golpe' | 'baile' | null, una sola vez por pulsacion. */
  consumeGesto() {
    const q = this._gestoPedido;
    this._gestoPedido = null;
    return q;
  }
}
