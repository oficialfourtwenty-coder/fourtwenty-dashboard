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
// ⚠️ EL AGUJERO QUE APARECIO EL 10/09, Y POR QUE.
//
// Los objetos que se CREAN adentro de un piso no llevan el numero de piso en el
// id. Un perchero que Fer pone en ORIGEN se llama
// `furniture:mueble-perchero-mtthq0ju`, una prenda `prenda:remera-oversize:n5wxkn`
// y una pieza armada a mano `pieza:plano-mtuvhleg-1`. Ninguno dice ORIGEN.
//
// O sea que `escenaDe` los daba por Burela, y como Burela sale del archivo de
// Kusher, TODO lo que Fer hubiera creado adentro de un piso desaparecia en
// silencio. Justo lo que esta herramienta existe para evitar.
//
// No se puede arreglar mirando el id: el layout no guarda a que escena
// pertenece cada objeto (sus campos son id, name, type, model, position,
// rotation, scale, sombras, locked y visible — no hay escena).
//
// LA REGLA. A estos objetos se los trata por UNION en vez de "gana uno":
//   · los que estan en el archivo de Kusher salen de ahi (su posicion manda)
//   · los que SOLO estan en el de Fer se agregan
// Como el id lleva un sufijo al azar, dos personas no pueden crear el mismo, y
// asi sobreviven los dos trabajos sin decidir nada.
//
// ⚠️ Esto vale SOLO para los prefijos de abajo, que son los que generan el
// constructor de piezas, el catalogo de muebles y las prendas. A un id de
// POSICION (`calle-kit:49.62`) no se le aplica: esos son la escena construida y
// son de Kusher. Si se agregaran por union, volverian objetos que Kusher borro.
const CREADOS_A_MANO = ['prenda:', 'pieza:', 'furniture:', 'estampa:'];
const esCreadoAMano = (item) => CREADOS_A_MANO.some((p) => String(item?.id ?? '').startsWith(p));

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

const idsDeBurela = new Set(burela.map((item) => item.id));
// Lo que Fer creo a mano y Kusher no tiene: se suma en vez de perderse.
const creadosDeFer = pisos.filter(
  (item) => escenaDe(item) === null && esCreadoAMano(item) && !idsDeBurela.has(item.id),
);

const resultado = [
  ...burela.filter((item) => !escenasDeFer.includes(escenaDe(item))),
  ...pisos.filter((item) => escenasDeFer.includes(escenaDe(item))),
  ...creadosDeFer,
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

if (creadosDeFer.length) {
  console.log(`\nAdemas se suman ${creadosDeFer.length} objeto(s) que Fer creo a mano y no llevan piso en el id:`);
  const porTipo = new Map();
  for (const item of creadosDeFer) {
    const t = String(item.id).split(':')[0];
    porTipo.set(t, (porTipo.get(t) ?? 0) + 1);
  }
  for (const [t, n] of porTipo) console.log(`  + ${String(n).padStart(4)}  ${t}`);
  console.log('  (prendas, muebles y piezas armadas a mano no dicen en que piso estan)');
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
