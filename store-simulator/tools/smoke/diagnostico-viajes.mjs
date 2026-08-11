// Diagnostico: DONDE se va el tiempo en cada viaje de ascensor.
//
// No arregla nada. Solo mide, porque el recorrido decia "primer intento
// fallido" sin decir en que etapa. Instrumenta cuatro cosas desde afuera, sin
// tocar el codigo del juego:
//
//   1. Cuanto tarda en resolver la promesa de `travelTo`. Si resuelve en pocos
//      milisegundos Y el piso no cambio, es que la guarda `travelling` lo
//      rechazo: el viaje NUNCA arranco.
//   2. Cuanto bloquea el hilo principal (huecos entre frames). Ahi se ve el
//      costo real de construir la escena, que es sincronico.
//   3. Cuando aparece y desaparece la pantalla de intro (clases de #loading-screen).
//   4. Todos los eventos de los <video> de intro.
//
// Uso: node tools/smoke/diagnostico-viajes.mjs
import { chromium } from 'playwright';

const URL_BASE = process.env.SMOKE_URL ?? 'http://127.0.0.1:5173';
const VUELTAS = Number(process.env.DIAG_VUELTAS ?? 1);

const DESTINOS = [
  [1, 'ORIGEN'],
  [2, 'HOOP SEASON'],
  [3, 'CULTURA'],
  [4, 'BOB'],
  [5, 'TERRAZA'],
  [0, 'CALLE BURELA'],
];

const linea = (s) => console.log(s);
const ms = (n) => `${Math.round(n)}ms`.padStart(7);

const browser = await chromium.launch({
  executablePath: process.env.PLAYWRIGHT_CHROMIUM ?? '/opt/pw-browsers/chromium',
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--no-sandbox'],
});
const page = await browser.newPage({ viewport: { width: 1100, height: 760 } });

async function instrumentar() {
  await page.evaluate(() => {
    if (window.__diag) return;
    const diag = { huecos: [], clases: [], video: [], t0: performance.now() };
    window.__diag = diag;

    // 1. Huecos entre frames = hilo principal bloqueado.
    let anterior = performance.now();
    const tick = () => {
      const ahora = performance.now();
      const hueco = ahora - anterior;
      if (hueco > 80) diag.huecos.push({ t: ahora, hueco });
      anterior = ahora;
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);

    // 2. Pantalla de intro: cuando se muestra y cuando se va.
    const pantalla = document.getElementById('loading-screen');
    if (pantalla) {
      new MutationObserver(() => {
        diag.clases.push({ t: performance.now(), clases: pantalla.className });
      }).observe(pantalla, { attributes: true, attributeFilter: ['class'] });
    }

    // 3. Eventos de los videos de intro. Esto es lo que dice si el video
    //    termino, fallo, o se quedo esperando para siempre.
    const EVENTOS = ['loadstart', 'loadeddata', 'canplay', 'playing', 'ended', 'error', 'stalled', 'abort', 'suspend', 'waiting'];
    for (const v of document.querySelectorAll('video')) {
      for (const nombre of EVENTOS) {
        v.addEventListener(nombre, () => {
          diag.video.push({ t: performance.now(), id: v.id, evento: nombre, error: v.error?.code ?? null });
        });
      }
    }
  });
}

async function entrarAlJuego() {
  await page.goto(`${URL_BASE}/?q=low&elevatorTest=1`, { waitUntil: 'domcontentloaded', timeout: 120000 });
  await page.waitForFunction(() => window.__elevatorTest, null, { timeout: 120000 });
  await instrumentar();
  await page.waitForTimeout(2500);
  await page.mouse.click(550, 380);     // ENTRAR A BOBILONIA
  await page.waitForTimeout(1000);
  await page.keyboard.press('Escape');  // saltear el video de portada
  await page.waitForTimeout(6000);
}

// Mide UN viaje. Espera la promesa de verdad (con tope), que es justo lo que el
// recorrido no hacia: si la promesa vuelve al instante, el viaje no arranco.
async function medirViaje(id) {
  await page.evaluate(() => {
    window.__diag.huecos.length = 0;
    window.__diag.clases.length = 0;
    window.__diag.video.length = 0;
  });

  const antes = await page.evaluate(() => window.__elevatorTest.getState().destinationId);

  const medida = await page.evaluate(async (destino) => {
    const t0 = performance.now();
    let error = null;
    try {
      await Promise.race([
        window.__elevatorTest.travelTo(destino),
        new Promise((r) => setTimeout(() => r('TOPE'), 60000)),
      ]);
    } catch (e) {
      error = String(e?.message ?? e);
    }
    return { promesaMs: performance.now() - t0, error, t0 };
  }, id);

  // Un rato mas para que caigan los eventos tardios del video.
  await page.waitForTimeout(1500);

  const diag = await page.evaluate(() => ({
    huecos: window.__diag.huecos,
    clases: window.__diag.clases,
    video: window.__diag.video,
  }));
  const despues = await page.evaluate(() => window.__elevatorTest.getState().destinationId);

  return { antes, despues, ...medida, ...diag };
}

function informar(nombre, r) {
  const llego = r.despues === r.esperado;
  const bloqueado = !llego && r.promesaMs < 200;
  linea(`\n── ${nombre} ${llego ? '✅' : '❌'}`);
  linea(`   promesa de travelTo   ${ms(r.promesaMs)}`);
  linea(`   piso ${r.antes} -> ${r.despues} (esperado ${r.esperado})`);

  if (bloqueado) {
    linea(`   ⚠️ RECHAZADO POR LA GUARDA: volvio en ${Math.round(r.promesaMs)}ms sin moverse.`);
    linea(`      El viaje anterior nunca solto \`travelling\`.`);
  }

  const bloqueo = r.huecos.reduce((a, h) => a + h.hueco, 0);
  const mayor = r.huecos.reduce((a, h) => Math.max(a, h.hueco), 0);
  linea(`   hilo bloqueado        ${ms(bloqueo)} en ${r.huecos.length} tirones (el mayor ${Math.round(mayor)}ms)`);

  if (r.clases.length) {
    const primera = r.clases[0].t;
    linea(`   pantalla de intro:`);
    for (const c of r.clases.slice(0, 6)) {
      const etiqueta = c.clases.replace(/\s+/g, ' ').trim() || '(sin clases)';
      linea(`      +${String(Math.round(c.t - primera)).padStart(6)}ms  ${etiqueta}`);
    }
  }

  if (r.video.length) {
    const primero = r.video[0].t;
    linea(`   eventos de video:`);
    for (const v of r.video.slice(0, 12)) {
      const err = v.error ? ` (error ${v.error})` : '';
      linea(`      +${String(Math.round(v.t - primero)).padStart(6)}ms  ${v.id} · ${v.evento}${err}`);
    }
  } else {
    linea(`   eventos de video:     ninguno (este piso no tiene intro)`);
  }
}

try {
  linea(`\nDIAGNOSTICO DE VIAJES — ${URL_BASE}`);
  linea('='.repeat(60));

  for (let vuelta = 1; vuelta <= VUELTAS; vuelta++) {
    if (VUELTAS > 1) linea(`\n\n########## VUELTA ${vuelta} ##########`);
    await entrarAlJuego();
    for (const [id, nombre] of DESTINOS) {
      const r = await medirViaje(id);
      r.esperado = id;
      informar(nombre, r);
    }
  }

  linea(`\n${'='.repeat(60)}\n`);
} catch (error) {
  linea(`\n❌ El diagnostico se corto: ${error.message}\n`);
  process.exitCode = 1;
} finally {
  await browser.close();
}
