// FOTOS DE BURELA DESDE PUNTOS FIJOS — para comparar antes y despues.
//
//   npm run dev                                  (en otra terminal)
//   node tools/smoke/fotos-burela.mjs --sufijo despues
//   node tools/smoke/fotos-burela.mjs --sufijo antes --extra graficos=antes
//
// POR QUE EXISTE. Un cambio grafico no se puede juzgar de memoria ni con dos
// capturas sacadas a mano desde lugares distintos: la luz cambia con la hora,
// la camara con donde quedo BOB, y cualquier diferencia de encuadre se come la
// diferencia que se quiere ver. Esto saca siempre las MISMAS fotos: misma hora,
// mismas camaras, mismo tamaño. Ademas imprime cuanto cuesta dibujar cada vista
// (llamadas de dibujo y triangulos), que es lo que decide si un cambio entra.
//
// ⚠️ Este navegador dibuja por SOFTWARE. Los milisegundos que imprime sirven
// para comparar una version contra la otra en esta misma maquina, NUNCA para
// adivinar los cuadros por segundo de la Mac de Kusher.
//
// Opciones:
//   --url    http://127.0.0.1:5173   (o SMOKE_URL)
//   --sufijo nombre                   prefijo de los archivos de salida
//   --hora   15                       hora del dia (default 15, sol de tarde)
//   --extra  a=1&b=2                  parametros extra para la URL del juego
//   --salida carpeta                  donde dejar las fotos (default /tmp/fotos-burela)
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const args = process.argv.slice(2);
const opcion = (nombre, porDefecto) => (args.includes(nombre) ? args[args.indexOf(nombre) + 1] : porDefecto);
const URL_BASE = opcion('--url', process.env.SMOKE_URL ?? 'http://127.0.0.1:5173');
const SUFIJO = opcion('--sufijo', 'foto');
const HORA = opcion('--hora', '15');
const EXTRA = opcion('--extra', '');
const SALIDA = opcion('--salida', '/tmp/fotos-burela');
const ANCHO = Number(opcion('--ancho', 1280));
const ALTO = Number(opcion('--alto', 800));
mkdirSync(SALIDA, { recursive: true });

// Camaras fijas: [posicion x,y,z] mirando a [x,y,z]. Coordenadas del mundo de
// Burela: la vereda va de z≈0 a z≈7,4 (cordon), la calzada arranca en z=8, la
// fachada del local esta en z≈-4,5 y BOB aparece en (0, 0, 6) mirando al local.
const VISTAS = [
  { nombre: 'vereda',   desde: [-16, 1.8, 5.2], hacia: [6, 1.2, 1] },
  { nombre: 'calle',    desde: [10, 2.2, 12],   hacia: [-20, 2.0, 4] },
  { nombre: 'enfrente', desde: [0, 1.8, 2],     hacia: [0, 3.0, 25] },
  { nombre: 'aerea',    desde: [14, 26, 30],    hacia: [0, 0, 0] },
  // ⚠️ El interior del local esta APROBADO por Kusher: esta foto esta para
  // comprobar que un cambio de luz de la calle no lo arruine. BOB se mete
  // adentro porque la luz del interior depende de donde esta EL, no la camara,
  // y se esperan mas cuadros para que termine la transicion de ~0,6 s.
  // BOB va DETRAS de la camara (z=-4,6, apenas adentro de la vidriera en -4,46)
  // para que cuente como "adentro" sin salir en la foto.
  { nombre: 'local',    desde: [0, 1.7, -4.9],  hacia: [0, 1.2, -10.2], bob: [0, 1, -4.6], cuadros: 18 },
];
const SOLO = opcion('--vistas', '');   // ej: --vistas vereda,local
const VISTAS_ELEGIDAS = SOLO ? VISTAS.filter((v) => SOLO.split(',').includes(v.nombre)) : VISTAS;

const browser = await chromium.launch({
  executablePath: process.env.PLAYWRIGHT_CHROMIUM ?? '/opt/pw-browsers/chromium',
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--no-sandbox'],
});
const page = await browser.newPage({ viewport: { width: ANCHO, height: ALTO } });
const errores = [];
page.on('pageerror', (e) => errores.push(e.message.slice(0, 200)));
page.on('console', (m) => {
  if (m.type() !== 'error') return;
  const t = m.text();
  // Ruido conocido del navegador sin interfaz (ver recorrido.mjs).
  if (/DEMUXER_ERROR|decode audio|no supported sources|play\(\) request|Failed to load resource/i.test(t)) return;
  errores.push(t.slice(0, 200));
});

// ⚠️ SIN `q=low`: justo lo que se compara son las sombras y el postproceso.
// `autoCalidad=0` evita que el juego los apague solo al ver que este navegador
// va lento. `perfAudit=1` expone las llamadas de dibujo en __elevatorTest.
const params = `elevatorTest=1&perfAudit=1&autoCalidad=0&sunHour=${HORA}${EXTRA ? `&${EXTRA}` : ''}`;
console.log(`\n── FOTOS DE BURELA · ${SUFIJO} · ${params}\n`);
await page.goto(`${URL_BASE}/?${params}`, { waitUntil: 'domcontentloaded', timeout: 180000 });
await page.waitForFunction(() => window.__elevatorTest, null, { timeout: 180000 });
await page.waitForTimeout(2500);
await page.mouse.click(ANCHO / 2, ALTO / 2);   // ENTRAR A BOBILONIA
// La pantalla de elegir BOB no se saltea con Escape: hay que apretar el boton.
const boton = await page.waitForSelector('#bob-select.show .bs-go', { timeout: 60000 }).catch(() => null);
if (boton) {
  await boton.click();
  await page.waitForFunction(() => !document.querySelector('#bob-select.show'), null, { timeout: 20000 }).catch(() => {});
}
await page.waitForTimeout(1000);
await page.keyboard.press('Escape');           // saltear el video

// ⚠️ Se esperan CUADROS dibujados, no milisegundos: a ~2 cuadros por segundo,
// esperar "un segundo" puede ser un solo cuadro y la foto sale a medio cargar.
const esperarCuadros = (n) => page.evaluate((k) => new Promise((listo) => {
  let i = 0;
  const paso = () => (++i >= k ? listo(i) : requestAnimationFrame(paso));
  requestAnimationFrame(paso);
}), n);

// Tiempo para que terminen de llegar los GLB (autos, edificios Kenney).
await page.waitForTimeout(15000);
await esperarCuadros(20);

// Las sombras estan CONGELADAS y el juego las rehace a los 1,5 / 4 / 8 s de
// tiempo de JUEGO — que a 2 cuadros por segundo (con el dt topeado a 0,05) son
// minutos reales. Se fuerza una actualizacion con el mismo aviso que usa el
// editor al mover algo.
await page.evaluate(() => window.dispatchEvent(new Event('fourtwenty:world-edited')));
await esperarCuadros(6);

// Diagnostico de la sombra del sol: cuanto terreno cubre y con cuantos pixeles.
const sombra = await page.evaluate(() => {
  let escena = window.__bob?.rig;
  while (escena && escena.type !== 'Scene') escena = escena.parent;
  let sol = null;
  escena?.traverse((o) => { if (!sol && o.isDirectionalLight && o.castShadow) sol = o; });
  if (!sol) return null;
  const c = sol.shadow.camera;
  c.updateMatrixWorld();
  const e = c.matrixWorld.elements;
  const derecha = [e[0], e[1], e[2]].map((v) => +v.toFixed(2));
  const arriba = [e[4], e[5], e[6]].map((v) => +v.toFixed(2));
  const ancho = c.right - c.left;
  const alto = c.top - c.bottom;
  return {
    mapa: `${sol.shadow.mapSize.x}x${sol.shadow.mapSize.y}`,
    ancho_m: +ancho.toFixed(1),
    alto_m: +alto.toFixed(1),
    px_por_metro_ancho: +(sol.shadow.mapSize.x / ancho).toFixed(1),
    px_por_metro_alto: +(sol.shadow.mapSize.y / alto).toFixed(1),
    eje_ancho_en_mundo: derecha,
    eje_alto_en_mundo: arriba,
  };
});
console.log('sombra del sol:', JSON.stringify(sombra));

// Se toma el control de la camara: el juego la devuelve detras de BOB en cada
// cuadro, asi que se anula su `update` mientras se sacan las fotos.
await page.evaluate(() => {
  window.__camUpdateOriginal = window.__cam.update;
  window.__cam.update = () => {};
});

async function medir(cuadros = 12) {
  return page.evaluate((k) => new Promise((listo) => {
    const tiempos = [];
    let antes = performance.now();
    let i = 0;
    const paso = () => {
      const ahora = performance.now();
      tiempos.push(ahora - antes);
      antes = ahora;
      if (++i >= k) {
        tiempos.shift();     // el primero arrastra lo que habia antes de medir
        tiempos.sort((a, b) => a - b);
        const perf = window.__elevatorTest?.getState?.()?.performance ?? {};
        listo({
          ms_mediana: +tiempos[Math.floor(tiempos.length / 2)].toFixed(0),
          llamadas: perf.drawCalls,
          triangulos: perf.triangles,
          texturas: perf.textures,
        });
      } else requestAnimationFrame(paso);
    };
    requestAnimationFrame(paso);
  }), cuadros);
}

for (const vista of VISTAS_ELEGIDAS) {
  await page.evaluate(({ desde, hacia, bob }) => {
    // Teletransporta (saltea la colision): para una foto es justo lo que hace
    // falta. No usarlo para probar colisiones — ver CLAUDE.md.
    if (bob) window.__bob.position.set(...bob);
    const c = window.__cam.camera;
    c.position.set(...desde);
    c.lookAt(...hacia);
    c.updateProjectionMatrix();
  }, vista);
  await esperarCuadros(vista.cuadros ?? 6);
  const costo = await medir(10);
  const archivo = `${SALIDA}/${SUFIJO}-${vista.nombre}.png`;
  await page.screenshot({ path: archivo, timeout: 180000 });
  console.log(`  ✔ ${vista.nombre.padEnd(9)} ${JSON.stringify(costo)}  →  ${archivo}`);
}

if (errores.length) {
  console.log(`\n⚠️ ${errores.length} error(es) de consola:`);
  for (const e of [...new Set(errores)].slice(0, 10)) console.log('   ', e);
} else {
  console.log('\n✔ sin errores de consola');
}
await browser.close();
