// Prueba de la logica del joystick sin joystick: se le miente a la Gamepad API.
const oyentes = {};
globalThis.window = {
  addEventListener: (t, f) => { (oyentes[t] ??= []).push(f); },
  dispatchEvent: (e) => { (oyentes[e.type] ?? []).forEach((f) => f(e)); return true; },
};
globalThis.KeyboardEvent = class { constructor(t, i) { this.type = t; Object.assign(this, i); } };
let PAD = null;
Object.defineProperty(globalThis, "navigator", { value: { getGamepads: () => [PAD] }, configurable: true });

const { Input } = await import('../../src/core/input.js');
const input = new Input(null);
const pad = (axes, botones = []) => ({
  connected: true, axes,
  buttons: Array.from({ length: 8 }, (_, i) => ({ pressed: botones.includes(i) })),
});
const r = (v) => +v.toFixed(3);
const ok = [];

// 1) sin joystick no cambia nada
PAD = null;
ok.push(['sin joystick', JSON.stringify(input.axes()) === '{"x":0,"z":0}']);

// 2) stick quieto pero temblando: no se mueve
PAD = pad([0.10, -0.08, 0, 0]);
ok.push(['zona muerta (tiembla)', JSON.stringify(input.axes()) === '{"x":0,"z":0}']);

// 3) stick a fondo hacia ARRIBA = adelante = z positivo
PAD = pad([0, -1, 0, 0]);
let a = input.axes();
ok.push(['arriba = adelante', r(a.z) === 1 && r(a.x) === 0]);

// 4) a fondo a la derecha
PAD = pad([1, 0, 0, 0]);
a = input.axes();
ok.push(['derecha', r(a.x) === 1 && r(a.z) === 0]);

// 5) diagonal a fondo: no se pasa de 1 y sale en diagonal de verdad
PAD = pad([0.707, -0.707, 0, 0]);
a = input.axes();
// En diagonal a fondo cada eje vale 0,707: lo que tiene que dar 1 es el LARGO
// del vector, no cada componente. (Mi primera prueba pedia 0,9 por eje y
// fallaba: estaba mal la prueba, no el codigo.)
ok.push(['diagonal pareja', Math.abs(a.x - a.z) < 0.001 && Math.abs(Math.hypot(a.x, a.z) - 1) < 0.01]);

// 6) correr con R2
PAD = pad([0, 0, 0, 0], [7]);
ok.push(['R2 = correr', input.sprinting() === true]);
PAD = pad([0, 0, 0, 0]);
ok.push(['sin R2 = no corre', input.sprinting() === false]);

// 7) la cruz interactua UNA sola vez aunque se deje apretada
PAD = pad([0, 0, 0, 0], [0]);
const primera = input.consumeInteract();
const segunda = input.consumeInteract();
const tercera = input.consumeInteract();
ok.push(['cruz dispara una vez', primera === true && segunda === false && tercera === false]);

// 8) al soltar y volver a apretar, dispara de nuevo
PAD = pad([0, 0, 0, 0]);
input.consumeInteract();
PAD = pad([0, 0, 0, 0], [0]);
ok.push(['soltar y apretar vuelve a disparar', input.consumeInteract() === true]);

// 9) el cuadrado manda la tecla C (celular)
let cLlego = false;
window.addEventListener('keydown', (e) => { if (e.code === 'KeyC') cLlego = true; });
PAD = pad([0, 0, 0, 0]);
input.consumeInteract();
PAD = pad([0, 0, 0, 0], [2]);
input.consumeInteract();
ok.push(['cuadrado abre el celular', cLlego === true]);

for (const [nombre, pasa] of ok) console.log(`${pasa ? '✔' : '✖'} ${nombre}`);
console.log(ok.every(([, p]) => p) ? '\n✅ TODO BIEN' : '\n✖ HAY FALLAS');
process.exit(ok.every(([, p]) => p) ? 0 : 1);
