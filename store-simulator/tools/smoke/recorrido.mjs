// PRUEBA DE RECORRIDO — Burela + los cinco pisos.
//
// POR QUE EXISTE
// El 06/08 se rompio HOOP SEASON: se borraron tres funciones que ese piso usaba
// y nadie lo noto hasta entrar al piso a mano. `npm run build` NO lo detecta —
// JavaScript no valida una funcion inexistente hasta que se ejecuta, asi que un
// piso puede compilar perfecto y explotar al abrirlo.
//
// QUE COMPRUEBA
//   1. que cada uno de los seis destinos abra sin errores de consola
//   2. que se pueda volver a Burela
//   3. que al volver a Burela NO queden objetos de piso registrados
//
// COMO SE USA
//   npm run dev            (en otra terminal)
//   npm run smoke
//   npm run smoke -- --url http://127.0.0.1:5201
//
// Devuelve codigo 0 si todo pasa y 1 si algo fallo, asi puede correr en CI.
// Requiere el navegador: `npx playwright install chromium` una sola vez.

import { chromium } from 'playwright';

const args = process.argv.slice(2);
const URL_BASE = args.includes('--url') ? args[args.indexOf('--url') + 1] : 'http://127.0.0.1:5173';

// 0 = Calle Burela. 1..5 = los pisos, en el orden del ascensor.
const DESTINOS = [
  { id: 1, nombre: 'ORIGEN' },
  { id: 2, nombre: 'HOOP SEASON' },
  { id: 3, nombre: 'CULTURA' },
  { id: 4, nombre: 'BOB' },
  { id: 5, nombre: 'TERRAZA' },
];

// Ruido conocido del navegador SIN INTERFAZ, que no significa que algo este
// roto en el juego. La lista es corta a proposito: filtrar todos los 404 —como
// hacia la primera version— esconde archivos que faltan de verdad, que es justo
// una de las cosas que esta prueba tiene que encontrar.
const IGNORAR = [
  /DEMUXER_ERROR_NO_SUPPORTED_STREAMS/i,  // el Chromium sin interfaz no trae H.264
  /Unable to decode audio data/i,
  /The element has no supported sources/i,
  /play\(\) request was interrupted/i,
];

// Los 404 se anotan aparte. Se listan siempre al final, porque un archivo que
// falta es informacion util aunque no tumbe la corrida.
const ES_404 = /404|Failed to load resource/i;
const faltantes = new Set();

const fallos = [];
const linea = (s) => console.log(s);

const browser = await chromium.launch({
  executablePath: process.env.PLAYWRIGHT_CHROMIUM ?? undefined,
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--no-sandbox'],
});
const page = await browser.newPage({ viewport: { width: 1100, height: 760 } });

// Los errores se acumulan por etapa, para saber CUAL piso los tiro.
let etapa = 'arranque';
const errores = [];
const anotar = (texto) => {
  if (IGNORAR.some((r) => r.test(texto))) return;
  if (ES_404.test(texto)) { faltantes.add(texto.slice(0, 160)); return; }
  errores.push({ etapa, texto: texto.slice(0, 200) });
};
page.on('pageerror', (e) => anotar(e.message));
page.on('console', (m) => { if (m.type() === 'error') anotar(m.text()); });

const erroresDe = (nombre) => errores.filter((e) => e.etapa === nombre);

async function entrarAlJuego() {
  await page.goto(`${URL_BASE}/?q=low&elevatorTest=1`);
  await page.waitForFunction(() => window.__elevatorTest, null, { timeout: 120000 });
  await page.waitForTimeout(2500);
  await page.mouse.click(550, 380);     // ENTRAR A BOBILONIA
  await page.waitForTimeout(1000);
  await page.keyboard.press('Escape');  // saltear el video de portada
  await page.waitForTimeout(6000);
}

// ⚠️ CON TOPE DE TIEMPO. Un viaje puede quedar colgado —le paso a esta misma
// prueba, quince minutos esperando HOOP— y una prueba que no termina no sirve
// para nada, menos en CI. Si un destino no llega a tiempo se marca como fallo y
// se sigue con el siguiente, en vez de trabar toda la corrida.
// Se pone en true si algun viaje vencio su tiempo y hubo que recargar. La
// invariante de limpieza deja de ser medible en esa corrida: recargar reinicia
// el registro, asi que un cero al final no probaria nada.
let huboRecarga = false;

async function viajarA(id, nombre) {
  const LIMITE = 60000;
  try {
    await Promise.race([
      (async () => {
        // ⚠️ NO devolver la promesa de travelTo.
        // `page.evaluate` espera a que la promesa que devuelve el codigo
        // resuelva, y `travelToDestination` espera adentro a que termine el
        // video de intro. Devolviendola, el `await` no volvia hasta que el
        // intro terminaba — y como el navegador sin interfaz no trae H.264, el
        // video nunca arranca. Todos los Escape llegaban DESPUES: por eso
        // CULTURA, TERRAZA y HOOP daban falso negativo. Se dispara y se sigue.
        await page.evaluate((d) => { window.__elevatorTest.travelTo(d); }, id);

        // Escape insistente mientras el intro pueda estar en pantalla.
        for (const espera of [600, 900, 1200, 1500, 2000, 2500, 3000]) {
          await page.waitForTimeout(espera);
          await page.keyboard.press('Escape');
          const llego = await page
            .evaluate((d) => window.__elevatorTest.getState().destinationId === d, id)
            .catch(() => false);
          if (llego) break;
        }
        await page.waitForFunction(
          (d) => window.__elevatorTest.getState().destinationId === d,
          id, { timeout: 25000 },
        );
        await page.waitForTimeout(4000);       // que terminen de llegar los GLB
      })(),
      new Promise((_, rechazar) => {
        setTimeout(() => rechazar(new Error(`no llego en ${LIMITE / 1000}s`)), LIMITE);
      }),
    ]);
    return true;
  } catch (e) {
    errores.push({ etapa: nombre, texto: `viaje colgado o fallido: ${e.message}` });
    // ⚠️ `Promise.race` NO cancela el viaje original: sigue corriendo y deja la
    // pagina en un estado indefinido. Sin recargar, el destino siguiente
    // arrancaba desde ahi — por eso CULTURA aparecia parada en HOOP. Se
    // recarga para que cada piso se pruebe desde un estado limpio.
    huboRecarga = true;
    try { await entrarAlJuego(); } catch { /* si tampoco recarga, lo dira el siguiente */ }
    return false;
  }
}

const estado = () => page.evaluate(() => {
  const s = window.__elevatorTest.getState();
  return {
    escena: s.activeScene,
    destino: s.destinationId,
    objetos: s.scene.objects,
    mallas: s.scene.meshes,
  };
});

// ⚠️ CONTAR EL REGISTRO ENTERO NO PRUEBA NADA (lo marco Codex, y tiene razon).
// Los objetos de un piso usan ids deterministas (`destino-1:*`), asi que volver
// a entrar al mismo piso REEMPLAZA la entrada en vez de agregar una: el total
// queda igual aunque el registro siga reteniendo la escena cerrada.
//
// La afirmacion correcta es una invariante: **parado en Burela no puede quedar
// NINGUNA entrada de piso**. Eso hoy falla, y tiene que pasar cuando Codex
// implemente el borrado por prefijo.
const PATRON_DESTINO = '^(destino-\\d+:|elevator-destination-\\d+|destination-\\d+-minigame-arcade|origin-minigame-arcade)';

const entradasDePiso = () => page.evaluate((patron) => {
  const re = new RegExp(patron);
  try {
    return (window.__editables?.() ?? []).map((e) => e.id).filter((id) => re.test(id));
  } catch { return []; }
}, PATRON_DESTINO);

try {
  linea(`\nRECORRIDO — ${URL_BASE}\n${'='.repeat(52)}`);

  // ---- Burela ----
  etapa = 'burela';
  await entrarAlJuego();
  const burela = await estado();
  const errBurela = erroresDe('burela');
  linea(`\n[0] CALLE BURELA  ${errBurela.length ? '❌' : '✅'}`);
  linea(`    escena: ${burela.escena} · ${burela.mallas} mallas`);
  if (errBurela.length) {
    fallos.push('Calle Burela');
    for (const e of errBurela) linea(`    ERROR: ${e.texto}`);
  }

  // ---- los cinco pisos ----
  for (const destino of DESTINOS) {
    etapa = destino.nombre;
    const llego = await viajarA(destino.id, destino.nombre);
    const info = await estado();
    const errs = erroresDe(destino.nombre);
    const ok = llego && info.destino === destino.id && errs.length === 0;
    if (!ok) fallos.push(destino.nombre);

    linea(`\n[${destino.id}] ${destino.nombre.padEnd(13)} ${ok ? '✅' : '❌'}`);
    linea(`    escena: ${info.escena}`);
    linea(`    ${info.objetos} objetos · ${info.mallas} mallas`);
    for (const e of errs) linea(`    ERROR: ${e.texto}`);
  }

  // ---- volver a Burela ----
  etapa = 'vuelta';
  const volvio = await viajarA(0, 'vuelta');
  const vuelta = await estado();
  const errVuelta = erroresDe('vuelta');
  const vueltaOk = volvio && vuelta.destino === 0 && errVuelta.length === 0;
  if (!vueltaOk) fallos.push('vuelta a Burela');
  linea(`\n[0] VUELTA A BURELA ${vueltaOk ? '✅' : '❌'}`);
  linea(`    escena: ${vuelta.escena}`);
  for (const e of errVuelta) linea(`    ERROR: ${e.texto}`);

  // ---- la invariante: en Burela no queda nada de los pisos ----
  linea(`\nLIMPIEZA AL SALIR DE LOS PISOS`);
  const quedaron = await entradasDePiso();
  if (huboRecarga) {
    // Recargar reinicia el registro: un cero aca no probaria que se libera al
    // salir de un piso, solo que la pagina arranco de nuevo. Se dice, no se
    // afirma nada.
    linea(`    ⚠️ no medible: hubo que recargar por un viaje vencido`);
    linea(`       (${quedaron.length} entradas al final, pero el numero no vale)`);
  } else if (quedaron.length === 0) {
    linea(`    ✅ parado en Burela no queda ninguna entrada de piso registrada`);
  } else {
    fallos.push(`limpieza: ${quedaron.length} entradas de piso siguen registradas en Burela`);
    linea(`    ❌ quedan ${quedaron.length} entradas de piso registradas estando en Burela`);
    const muestra = quedaron.slice(0, 8);
    for (const id of muestra) linea(`       ${id}`);
    if (quedaron.length > muestra.length) linea(`       … y ${quedaron.length - muestra.length} mas`);
    linea(`    (una escena cerrada sigue retenida — es la fuga que corrige Codex)`);
  }

  // ---- archivos que faltan ----
  if (faltantes.size) {
    linea(`\nARCHIVOS QUE NO CARGARON (${faltantes.size})`);
    for (const f of faltantes) linea(`    ${f}`);
  }

  linea(`\n${'='.repeat(52)}`);
  if (fallos.length) {
    linea(`❌ FALLARON: ${fallos.join(', ')}\n`);
    process.exitCode = 1;
  } else {
    linea(`✅ TODO BIEN — los 6 destinos abren, se vuelve a Burela y no queda nada retenido\n`);
  }
} catch (error) {
  linea(`\n❌ La prueba se corto: ${error.message}\n`);
  process.exitCode = 1;
} finally {
  await browser.close();
}
