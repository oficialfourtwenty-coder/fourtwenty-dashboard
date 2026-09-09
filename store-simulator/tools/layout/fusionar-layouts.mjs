// FUSIONAR EL LAYOUT DE KUSHER CON EL DE FER.
//
// EL PROBLEMA QUE RESUELVE. `furniture-layout.json` es UN SOLO archivo que
// guarda donde esta cada objeto de TODO el simulador: Burela y los cinco pisos
// juntos. Y el editor exporta el archivo ENTERO, no un pedazo. Asi que si
// Kusher exporta el suyo y Fer exporta el suyo, el que se sube segundo borra el
// trabajo del primero, en silencio y sin conflicto de git que avise.
//
// Los dos trabajan al mismo tiempo: Kusher acomoda Burela y Fer arma el piso
// ORIGEN. Sin esta herramienta hay que elegir a uno.
//
// LO QUE LO HACE POSIBLE. Cada objeto de un piso lleva el numero de piso en el
// id (`destino-1:...`, `elevator-destination-1`, `origin-minigame-arcade...`).
// Los de Burela no llevan prefijo. O sea que el archivo se puede partir por
// escena sin ambiguedad, y volver a armar tomando cada escena de quien la
// trabajo.
//
// COMO SE USA
//
//   node tools/layout/fusionar-layouts.mjs \
//     --burela  ~/Downloads/layout-kusher.json \
//     --pisos   ~/Downloads/layout-fer.json \
//     [--salida public/assets/layouts/furniture-layout.json]
//
// De `--pisos` se toman SOLO los pisos que ese archivo trae de verdad; todo lo
// demas (Burela y cualquier piso que Fer no toco) sale de `--burela`.
//
// ⚠️ SIEMPRE IMPRIME QUE HIZO. Una fusion que se come una escena y no avisa es
// peor que no fusionar: el trabajo desaparece y nadie se entera hasta semanas
// despues. Si un archivo no aporta nada, lo dice.
import { readFileSync, writeFileSync } from 'node:fs';

const NOMBRE_BURELA = 'BURELA (calle, local, vereda)';

// Misma cuenta que hace el juego en `layoutStore.js`. Si alla cambia, aca
// tambien: son la misma regla escrita dos veces y tienen que coincidir.
function escenaDe(item) {
  const id = String(item?.id ?? '');
  let m = id.match(/^destino-(\d+):/);
  if (m) return Number(m[1]);
  m = id.match(/^elevator-destination-(\d+)$/);
  if (m) return Number(m[1]);
  m = id.match(/^destination-(\d+)-minigame-arcade/);
  if (m) return Number(m[1]);
  if (id.startsWith('origin-minigame-arcade')) return 1;
  return null;   // null = Burela
}

const NOMBRES = {
  1: 'ORIGEN', 2: 'HOOP SEASON', 3: 'CULTURA', 4: 'BOB', 5: 'TERRAZA',
};
const nombreDe = (escena) => (escena === null ? NOMBRE_BURELA : `piso ${escena} · ${NOMBRES[escena] ?? '?'}`);

function leer(ruta) {
  let datos;
  try {
    datos = JSON.parse(readFileSync(ruta, 'utf8'));
  } catch (error) {
    console.error(`\n✖ No se pudo leer ${ruta}\n  ${error.message}\n`);
    process.exit(1);
  }
  // El editor exporta un array; se acepta tambien { layout: [...] } por las
  // dudas de que alguien pegue el objeto entero.
  const lista = Array.isArray(datos) ? datos : datos?.layout;
  if (!Array.isArray(lista)) {
    console.error(`\n✖ ${ruta} no tiene la forma de un layout (esperaba una lista de objetos).\n`);
    process.exit(1);
  }
  return lista;
}

function contarPorEscena(lista) {
  const cuenta = new Map();
  for (const item of lista) {
    const escena = escenaDe(item);
    cuenta.set(escena, (cuenta.get(escena) ?? 0) + 1);
  }
  return cuenta;
}

function argumento(nombre) {
  const i = process.argv.indexOf(`--${nombre}`);
  return i >= 0 ? process.argv[i + 1] : null;
}

const rutaBurela = argumento('burela');
const rutaPisos = argumento('pisos');
const salida = argumento('salida') ?? 'public/assets/layouts/furniture-layout.json';

if (!rutaBurela || !rutaPisos) {
  console.error(`
Faltan archivos.

  node tools/layout/fusionar-layouts.mjs --burela <json de Kusher> --pisos <json de Fer>

  --burela   el EXPORTAR JSON de Kusher (manda en Burela)
  --pisos    el EXPORTAR JSON de Fer    (manda en los pisos que haya tocado)
  --salida   opcional, por defecto public/assets/layouts/furniture-layout.json
`);
  process.exit(1);
}

const burela = leer(rutaBurela);
const pisos = leer(rutaPisos);

const cuentaBurela = contarPorEscena(burela);
const cuentaPisos = contarPorEscena(pisos);

// Que escenas aporta de verdad el archivo de Fer. Burela NUNCA se toma de ahi,
// aunque su archivo la traiga: Burela es de Kusher.
const escenasDeFer = [...cuentaPisos.keys()].filter((e) => e !== null);

if (!escenasDeFer.length) {
  console.error('\n✖ El archivo de --pisos no trae ningun piso. ¿Seguro que es el de Fer?\n');
  process.exit(1);
}

const resultado = [
  ...burela.filter((item) => !escenasDeFer.includes(escenaDe(item))),
  ...pisos.filter((item) => escenasDeFer.includes(escenaDe(item))),
];

console.log('\n─────────── FUSION DE LAYOUTS ───────────');
console.log(`\nDe KUSHER (${rutaBurela}) — ${burela.length} objetos:`);
for (const [escena, n] of [...cuentaBurela].sort((a, b) => (a[0] ?? -1) - (b[0] ?? -1))) {
  const usado = !escenasDeFer.includes(escena);
  console.log(`  ${usado ? '✔ se usa   ' : '· lo pisa Fer'}  ${String(n).padStart(4)}  ${nombreDe(escena)}`);
}
console.log(`\nDe FER (${rutaPisos}) — ${pisos.length} objetos:`);
for (const [escena, n] of [...cuentaPisos].sort((a, b) => (a[0] ?? -1) - (b[0] ?? -1))) {
  const usado = escenasDeFer.includes(escena);
  console.log(`  ${usado ? '✔ se usa   ' : '· se ignora '}  ${String(n).padStart(4)}  ${nombreDe(escena)}`);
}

// ⚠️ Aviso fuerte si una escena que Kusher tenia llena queda vacia. Es la unica
// forma de perder trabajo con esta herramienta y tiene que gritar.
for (const [escena, n] of cuentaBurela) {
  if (!escenasDeFer.includes(escena)) continue;
  const nuevos = cuentaPisos.get(escena) ?? 0;
  if (nuevos < n) {
    console.log(`\n⚠️  ${nombreDe(escena)}: Kusher tenia ${n} objetos y el de Fer trae ${nuevos}.`);
    console.log('   Gana el de Fer. Si eso no es lo que queres, no uses este archivo.');
  }
}

writeFileSync(salida, `${JSON.stringify(resultado, null, 2)}\n`);
console.log(`\n✅ ${resultado.length} objetos escritos en ${salida}`);
console.log('   Revisalo en el juego ANTES de commitear.\n');
