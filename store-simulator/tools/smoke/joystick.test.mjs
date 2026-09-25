// Prueba del joystick SIN joystick: se le miente a la Gamepad API.
// Corre con `node tools/smoke/joystick.test.mjs` — no hace falta navegador.
//
// ⚠️ Esto verifica la LOGICA, no el hardware. Que la zona muerta y los flancos
// esten bien no garantiza que un DualSense de verdad mapee los botones igual.
const oyentes = {};
globalThis.window = {
  addEventListener: (t, f) => { (oyentes[t] ??= []).push(f); },
  dispatchEvent: (e) => { (oyentes[e.type] ?? []).forEach((f) => f(e)); return true; },
};
globalThis.KeyboardEvent = class { constructor(t, i) { this.type = t; Object.assign(this, i); } };
let PAD = null;
Object.defineProperty(globalThis, 'navigator', {
  value: { getGamepads: () => [PAD] }, configurable: true,
});

const { Input } = await import('../../src/core/input.js');
const { BOTON } = await import('../../src/core/mando.js');
const input = new Input(null);
const pad = (axes, botones = []) => ({
  connected: true, axes,
  buttons: Array.from({ length: 18 }, (_, i) => ({
    pressed: botones.includes(i), value: botones.includes(i) ? 1 : 0,
  })),
});
const NEUTRO = [0, 0, 0, 0];
const r = (v) => +v.toFixed(3);
const ok = [];
const teclas = [];
window.addEventListener('keydown', (e) => teclas.push(e.code));

// ---- movimiento ----
PAD = null;
ok.push(['sin joystick no cambia nada', JSON.stringify(input.axes()) === '{"x":0,"z":0}']);

PAD = pad([0.10, -0.08, 0, 0]);
ok.push(['el temblor del stick no mueve', JSON.stringify(input.axes()) === '{"x":0,"z":0}']);

PAD = pad([0, -1, 0, 0]);
let a = input.axes();
ok.push(['arriba = adelante', r(a.z) === 1 && r(a.x) === 0]);

PAD = pad([1, 0, 0, 0]);
a = input.axes();
ok.push(['derecha', r(a.x) === 1 && r(a.z) === 0]);

// En diagonal a fondo cada eje vale 0,707: lo que da 1 es el LARGO del vector,
// no cada componente. (Una version anterior de esta prueba pedia 0,9 por eje y
// fallaba: estaba mal la prueba, no el codigo.)
PAD = pad([0.707, -0.707, 0, 0]);
a = input.axes();
ok.push(['diagonal pareja y largo 1',
  Math.abs(a.x - a.z) < 0.001 && Math.abs(Math.hypot(a.x, a.z) - 1) < 0.01]);

// ---- correr con L3 ----
PAD = pad(NEUTRO, [BOTON.L3]);
ok.push(['L3 = correr', input.sprinting() === true]);
PAD = pad(NEUTRO, [BOTON.R2]);
ok.push(['R2 ya NO corre', input.sprinting() === false]);

// ---- interactuar con circulo, una sola vez ----
PAD = pad(NEUTRO);
input.consumeInteract();
PAD = pad(NEUTRO, [BOTON.CIRCULO]);
const primera = input.consumeInteract();
const segunda = input.consumeInteract();
ok.push(['○ interactua una sola vez', primera === true && segunda === false]);

PAD = pad(NEUTRO, [BOTON.CRUZ]);
ok.push(['✕ ya NO interactua', input.consumeInteract() === false]);
ok.push(['✕ pide salto', input.consumeJump() === true]);
ok.push(['el salto se consume una vez', input.consumeJump() === false]);

// ---- teclas sinteticas ----
teclas.length = 0;
PAD = pad(NEUTRO);
input.consumeInteract();
PAD = pad(NEUTRO, [BOTON.TRIANGULO]);
input.consumeInteract();
ok.push(['△ manda la T (editor)', teclas.includes('KeyT')]);

teclas.length = 0;
PAD = pad(NEUTRO);
input.consumeInteract();
PAD = pad(NEUTRO, [BOTON.CUADRADO]);
input.consumeInteract();
ok.push(['▢ manda la C (Banapod)', teclas.includes('KeyC')]);

// L2 es un interruptor: una K al apretar y otra al soltar
teclas.length = 0;
PAD = pad(NEUTRO, [BOTON.L2]);
input.consumeInteract();
const alApretar = teclas.filter((t) => t === 'KeyK').length;
PAD = pad(NEUTRO);
input.consumeInteract();
const alSoltar = teclas.filter((t) => t === 'KeyK').length;
ok.push(['L2 manda K al apretar y al soltar', alApretar === 1 && alSoltar === 2]);

for (const [nombre, pasa] of ok) console.log(`${pasa ? '✔' : '✖'} ${nombre}`);
const todo = ok.every(([, p]) => p);
console.log(todo ? '\n✅ TODO BIEN' : '\n✖ HAY FALLAS');
process.exit(todo ? 0 : 1);
