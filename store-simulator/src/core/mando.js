// Leer el joystick. Lo usan el juego (`core/input.js`), el editor
// (`world/editor/worldEditor.js`) y el Banapod (`ui/phone.js`).
//
// Kusher lo pidio para "agilizar la productividad de acomodar cosa por cosa":
// con el mouse, poner una casa es agarrar una flecha del gizmo, arrastrar,
// soltar, agarrar otra flecha, arrastrar. Con los dos sticks se empuja y listo.
//
// Esto SOLO lee el mando y devuelve numeros limpios. Quien mueve los objetos es
// `worldEditor.js`: aca no se toca la escena.
//
// ⚠️ Con el editor abierto BOB no se mueve (`main.js` saltea `bob.update` por
// `editorActive`), asi que el stick no pelea con el personaje. Si algun dia eso
// cambia, el stick va a hacer las dos cosas a la vez.
const ZONA_MUERTA = 0.20;   // un poco mas que caminando: acomodar pide pulso firme

// Mapa del "standard gamepad", que es como el navegador presenta al DualSense.
export const BOTON = {
  CRUZ: 0, CIRCULO: 1, CUADRADO: 2, TRIANGULO: 3,
  L1: 4, R1: 5, L2: 6, R2: 7,
  SHARE: 8, OPTIONS: 9,
  L3: 10,         // apretar el stick izquierdo
  R3: 11,
  CRUCETA_ARRIBA: 12, CRUCETA_ABAJO: 13, CRUCETA_IZQ: 14, CRUCETA_DER: 15,
  PS: 16,
  // ⚠️ El CLICK del panel tactil aparece aca en Chrome, pero el TOQUE (donde
  // pusiste el dedo) NO existe en la Gamepad API: haria falta WebHID y un
  // permiso aparte del navegador. Sirve como boton, no como superficie tactil.
  TACTIL: 17,
};

// ⚠️ Zona muerta RADIAL, no por eje: recortando cada eje por separado, una
// diagonal apenas arriba del umbral sale recta. Y se reescala lo que sobra para
// que a fondo se llegue a 1 y no a 0,8.
function stick(pad, ejeX, ejeY) {
  const x = pad.axes[ejeX] ?? 0;
  const y = pad.axes[ejeY] ?? 0;
  const largo = Math.hypot(x, y);
  if (largo < ZONA_MUERTA) return { x: 0, y: 0 };
  const k = ((largo - ZONA_MUERTA) / (1 - ZONA_MUERTA)) / largo;
  return { x: x * k, y: y * k };
}

function gatillo(pad, indice) {
  const b = pad.buttons[indice];
  if (!b) return 0;
  // Los gatillos del DualSense son analogicos: `value` va de 0 a 1. Si el
  // navegador no lo reporta, se cae al si/no de `pressed`.
  const v = typeof b.value === 'number' ? b.value : (b.pressed ? 1 : 0);
  return v < 0.06 ? 0 : v;
}

/**
 * Estado del mando ya masticado. Devuelve null si no hay joystick.
 *
 * ⚠️ Se pregunta CADA cuadro. La Gamepad API no avisa cuando se mueve un
 * stick, y lo que devuelve `getGamepads()` es una foto: guardarse la referencia
 * deja los valores congelados en los del primer cuadro.
 */
export function leerMando() {
  const lista = navigator.getGamepads?.() ?? [];
  let pad = null;
  for (const p of lista) if (p?.connected) { pad = p; break; }
  if (!pad) return null;

  const izq = stick(pad, 0, 1);
  const der = stick(pad, 2, 3);
  const apretados = new Set();
  for (let i = 0; i < pad.buttons.length; i++) if (pad.buttons[i]?.pressed) apretados.add(i);

  return {
    // mover en el plano: el stick hacia ARRIBA da -1 y adelante es +1
    mover: { x: izq.x, z: -izq.y },
    girar: der.x,
    // arriba del stick derecho = agrandar
    escalar: -der.y,
    subir: gatillo(pad, BOTON.R2) - gatillo(pad, BOTON.L2),
    preciso: apretados.has(BOTON.L1),
    apretados,
    // Para saber si el jugador esta haciendo algo AHORA. Sirve para agrupar
    // todo un empujon en una sola vuelta atras de Ctrl+Z, en vez de una por
    // cuadro (serian sesenta por segundo).
    get activo() {
      return Math.abs(izq.x) > 0 || Math.abs(izq.y) > 0
        || Math.abs(der.x) > 0 || Math.abs(der.y) > 0
        || Math.abs(this.subir) > 0;
    },
  };
}
