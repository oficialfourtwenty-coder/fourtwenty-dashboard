// PRUEBA DE RECORRIDO — Burela + los cinco pisos.
//
// POR QUE EXISTE
// El 06/08 se rompio HOOP SEASON: se borraron tres funciones que ese piso usaba
// y nadie lo noto hasta entrar al piso a mano. `npm run build` NO lo detecta —
// JavaScript no valida una funcion inexistente hasta que se ejecuta, asi que un
// piso puede compilar perfecto y explotar al abrirlo.
//
// Esta prueba abre los seis destinos de verdad, con el motor corriendo, y falla
// si alguno tira un error. Es la unica forma de agarrar esa clase de rotura.
//
// COMO SE USA
//   npm run dev            (en otra terminal)
//   node tools/smoke/recorrido.mjs
//   node tools/smoke/recorrido.mjs --url http://127.0.0.1:5201
//
// Devuelve codigo 0 si todo pasa y 1 si algo fallo, asi puede correr en CI.

// Playwright NO es dependencia del proyecto a proposito: pesa mucho con los
// navegadores y ni Fer ni Chelo la necesitan para trabajar. Se busca donde
// este, y si no esta se explica como instalarla en vez de tirar un stack.
async function cargarChromium() {
  const candidatos = [
    'playwright',
    process.env.PLAYWRIGHT_MODULE,
    '/opt/node22/lib/node_modules/playwright/index.mjs',
  ].filter(Boolean);
  for (const ruta of candidatos) {
    try { return (await import(ruta)).chromium; } catch { /* probar el siguiente */ }
  }
  console.error(`
No se encontro Playwright, que es lo que abre el navegador para esta prueba.

  npm i -D playwright && npx playwright install chromium

Si ya la tenes instalada en otro lado:
  PLAYWRIGHT_MODULE=/ruta/a/playwright/index.mjs npm run smoke
`);
  process.exit(1);
}
const chromium = await cargarChromium();

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

// Ruido conocido que no significa que algo este roto.
const IGNORAR = [
  /404|Failed to load resource/i,
  /DEMUXER_ERROR_NO_SUPPORTED_STREAMS/i, // el Chromium sin interfaz no trae H.264
  /Unable to decode audio data/i,
  /WebGL.*deprecated/i,
];

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
  errores.push({ etapa, texto: texto.slice(0, 200) });
};
page.on('pageerror', (e) => anotar(e.message));
page.on('console', (m) => { if (m.type() === 'error') anotar(m.text()); });

function erroresDe(nombreEtapa) {
  return errores.filter((e) => e.etapa === nombreEtapa);
}

async function entrarAlJuego() {
  await page.goto(`${URL_BASE}/?q=low&elevatorTest=1`);
  await page.waitForFunction(() => window.__elevatorTest, null, { timeout: 120000 });
  await page.waitForTimeout(2500);
  await page.mouse.click(550, 380);   // ENTRAR A BOBILONIA
  await page.waitForTimeout(1000);
  await page.keyboard.press('Escape'); // saltear el video de portada
  await page.waitForTimeout(6000);
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

// Cuenta cuantos objetos quedan registrados en el editor. Si sube vuelta a
// vuelta sin volver a bajar, hay una fuga: un piso cerrado sigue retenido.
const registrados = () => page.evaluate(() => {
  try { return window.__editables?.().length ?? null; } catch { return null; }
});

try {
  linea(`\nRECORRIDO — ${URL_BASE}\n${'='.repeat(52)}`);

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

  const registroInicial = await registrados();
  const historial = [];

  for (const destino of DESTINOS) {
    etapa = destino.nombre;
    await page.evaluate((id) => window.__elevatorTest.travelTo(id), destino.id);
    await page.waitForTimeout(2000);
    await page.keyboard.press('Escape');  // saltear el video del piso si lo tiene
    await page.waitForTimeout(7000);

    const info = await estado();
    const errs = erroresDe(destino.nombre);
    const llego = info.destino === destino.id;
    const ok = llego && errs.length === 0;
    if (!ok) fallos.push(destino.nombre);

    linea(`\n[${destino.id}] ${destino.nombre.padEnd(13)} ${ok ? '✅' : '❌'}`);
    linea(`    escena: ${info.escena}`);
    linea(`    ${info.objetos} objetos · ${info.mallas} mallas`);
    if (!llego) linea(`    ERROR: quedo en el destino ${info.destino}, no llego`);
    for (const e of errs) linea(`    ERROR: ${e.texto}`);

    historial.push({ piso: destino.nombre, registrados: await registrados() });
  }

  // ---- volver a Burela ----
  etapa = 'vuelta';
  await page.evaluate(() => window.__elevatorTest.travelTo(0));
  await page.waitForTimeout(2000);
  await page.keyboard.press('Escape');
  await page.waitForTimeout(6000);
  const vuelta = await estado();
  const errVuelta = erroresDe('vuelta');
  const volvio = vuelta.destino === 0;
  if (!volvio || errVuelta.length) fallos.push('vuelta a Burela');
  linea(`\n[0] VUELTA A BURELA ${volvio && !errVuelta.length ? '✅' : '❌'}`);
  linea(`    escena: ${vuelta.escena}`);
  for (const e of errVuelta) linea(`    ERROR: ${e.texto}`);

  // ---- segunda vuelta: ¿se acumulan objetos? ----
  etapa = 'acumulacion';
  linea(`\nACUMULACION (segunda vuelta por los 5 pisos)`);
  const registroTrasPrimera = await registrados();
  for (const destino of DESTINOS) {
    await page.evaluate((id) => window.__elevatorTest.travelTo(id), destino.id);
    await page.waitForTimeout(1500);
    await page.keyboard.press('Escape');
    await page.waitForTimeout(5000);
  }
  await page.evaluate(() => window.__elevatorTest.travelTo(0));
  await page.waitForTimeout(1500);
  await page.keyboard.press('Escape');
  await page.waitForTimeout(5000);
  const registroFinal = await registrados();

  if (registroInicial == null) {
    linea(`    (no se pudo medir: falta window.__editables)`);
  } else {
    const crecio = registroFinal - registroTrasPrimera;
    linea(`    al empezar: ${registroInicial}`);
    linea(`    tras 1 vuelta: ${registroTrasPrimera}`);
    linea(`    tras 2 vueltas: ${registroFinal}   (${crecio >= 0 ? '+' : ''}${crecio})`);
    // Un margen chico es normal: hay objetos que llegan asincronicamente. Un
    // salto grande significa que un piso cerrado sigue retenido.
    if (crecio > 20) {
      fallos.push(`acumulacion: +${crecio} objetos registrados en la segunda vuelta`);
      linea(`    ❌ se acumulan objetos al repetir el recorrido`);
    } else {
      linea(`    ✅ no se acumula`);
    }
  }

  linea(`\n${'='.repeat(52)}`);
  if (fallos.length) {
    linea(`❌ FALLARON: ${fallos.join(', ')}\n`);
    process.exitCode = 1;
  } else {
    linea(`✅ TODO BIEN — los 6 destinos abren, se vuelve a Burela y no se acumula\n`);
  }
} catch (error) {
  linea(`\n❌ La prueba se corto: ${error.message}\n`);
  process.exitCode = 1;
} finally {
  await browser.close();
}
