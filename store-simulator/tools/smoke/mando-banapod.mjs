// PRUEBA REAL DEL JOYSTICK EN EL JUEGO: Banapod con el pad + salto de BOB.
//
// POR QUE EN EL NAVEGADOR Y NO EN NODE. Las dos cosas que hay que comprobar
// dependen de la pantalla: cual boton del Banapod queda seleccionado depende de
// DONDE esta dibujado cada boton, y si BOB salta depende del bucle del juego.
// Un test de Node no puede ver ninguna de las dos.
//
// COMO SE ENGAÑA AL NAVEGADOR. No hay joystick enchufado, asi que se reemplaza
// `navigator.getGamepads` por uno falso que devuelve el estado que le pongamos
// desde el test. Al juego le llega exactamente lo mismo que le llegaria de un
// DualSense de verdad: no hay atajos ni funciones internas llamadas a mano.
//
// COMO SE USA
//   npm run dev            (en otra terminal)
//   SMOKE_URL=http://127.0.0.1:5201 node tools/smoke/mando-banapod.mjs
import { chromium } from 'playwright';

const args = process.argv.slice(2);
const URL_BASE = args.includes('--url')
  ? args[args.indexOf('--url') + 1]
  : (process.env.SMOKE_URL ?? 'http://127.0.0.1:5173');

const BOTON = { CRUZ: 0, CIRCULO: 1, CUADRADO: 2, L1: 4, R1: 5, ARRIBA: 12, ABAJO: 13, IZQ: 14, DER: 15 };

const fallos = [];
const ok = (cond, texto) => {
  console.log(`  ${cond ? '✔' : '✖'} ${texto}`);
  if (!cond) fallos.push(texto);
};

const browser = await chromium.launch({
  executablePath: process.env.PLAYWRIGHT_CHROMIUM ?? '/opt/pw-browsers/chromium',
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--no-sandbox'],
});
const page = await browser.newPage({ viewport: { width: 1100, height: 760 } });

// El joystick falso se instala ANTES de que corra el juego: `input.js` lee
// `navigator.getGamepads` en cada cuadro, asi que basta con que exista.
await page.addInitScript(() => {
  window.__pad = { botones: new Set(), ejes: [0, 0, 0, 0] };
  // ⚠️ CONTADOR DE CUADROS. Este navegador dibuja POR SOFTWARE y va a ~2
  // cuadros por segundo: apretar un boton 90 ms no cae dentro de ningun cuadro
  // y el juego no se entera nunca. Como el juego pregunta por el joystick una
  // vez por cuadro, contar esas preguntas es contar cuadros — y asi el test
  // espera cuadros de verdad en vez de milisegundos inventados.
  window.__cuadros = 0;
  navigator.getGamepads = () => (window.__cuadros++, [{
    id: 'DualSense falso',
    index: 0,
    connected: true,
    mapping: 'standard',
    axes: window.__pad.ejes,
    buttons: Array.from({ length: 18 }, (_, i) => ({
      pressed: window.__pad.botones.has(i),
      touched: window.__pad.botones.has(i),
      value: window.__pad.botones.has(i) ? 1 : 0,
    })),
  }]);
});

/** Espera a que pasen `n` cuadros de juego de verdad. */
async function cuadros(n = 2) {
  const desde = await page.evaluate(() => window.__cuadros);
  await page.waitForFunction((d) => window.__cuadros >= d, desde + n, { timeout: 30000 });
}

// Apretar y soltar de verdad: el juego detecta el FLANCO, asi que un boton que
// se queda apretado no vuelve a disparar.
async function apretar(indice) {
  await page.evaluate((i) => window.__pad.botones.add(i), indice);
  await cuadros(1);                       // que al menos un cuadro lo vea apretado
  await page.evaluate((i) => window.__pad.botones.delete(i), indice);
  await cuadros(2);                       // y otro lo vea soltado, para el flanco
}

const seleccionado = () => page.evaluate(() => {
  const el = document.querySelector('.ft-mando-foco');
  if (!el) return null;
  return el.dataset.app ?? el.dataset.action ?? el.dataset.playlist ?? el.dataset.field ?? el.tagName;
});

try {
  console.log(`\n─── MANDO: Banapod y salto ─── ${URL_BASE}\n`);
  await page.goto(`${URL_BASE}/?q=low&elevatorTest=1`, { waitUntil: 'domcontentloaded', timeout: 120000 });
  await page.waitForFunction(() => window.__elevatorTest, null, { timeout: 120000 });
  await page.waitForTimeout(2500);
  await page.mouse.click(550, 380);
  const boton = await page.waitForSelector('#bob-select.show .bs-go', { timeout: 30000 }).catch(() => null);
  await boton?.click();
  await page.waitForTimeout(1200);
  await page.keyboard.press('Escape');
  await page.waitForTimeout(6000);

  // ── 1. El cuadrado abre el Banapod ──────────────────────────────────────
  console.log('BANAPOD');
  await apretar(BOTON.CUADRADO);
  ok(await page.evaluate(() => !!window.__phone?.isOpen()), '▢ abre el Banapod');

  // ── 2. El pad mueve el selector entre las cuatro opciones ───────────────
  //
  // ⚠️ COMO ESTAN PUESTAS DE VERDAD (medido en pantalla, no supuesto):
  //        MUSICA   TIENDA
  //        RELOJ    CLUB(apagado)
  // El reloj esta ABAJO a la izquierda, no arriba. La primera version de esta
  // prueba daba por hecho lo contrario y marcaba error donde el codigo estaba
  // bien: el selector no bajaba porque debajo del reloj no hay nada.
  await cuadros(2);
  const primero = await seleccionado();
  ok(primero === 'clock', `arranca en el reloj, que es el primero del HTML (${primero})`);

  await apretar(BOTON.ABAJO);
  ok(await seleccionado() === 'clock', 'ABAJO desde el reloj no se va del telefono (no hay nada abajo)');

  await apretar(BOTON.ARRIBA);
  ok(await seleccionado() === 'music', 'ARRIBA desde el reloj sube a MUSICA');

  await apretar(BOTON.DER);
  ok(await seleccionado() === 'cart', 'DERECHA desde MUSICA va a TIENDA');

  await apretar(BOTON.IZQ);
  ok(await seleccionado() === 'music', 'IZQUIERDA vuelve a MUSICA');

  // CLUB esta deshabilitado a proposito: el selector nunca tiene que caer ahi.
  const vistos = new Set();
  for (const dir of [BOTON.ABAJO, BOTON.DER, BOTON.ARRIBA, BOTON.DER, BOTON.ABAJO]) {
    await apretar(dir);
    const s = await seleccionado();
    if (s) vistos.add(s);
  }
  ok(!vistos.has('club'), `NO cae nunca en el boton apagado (paso por: ${[...vistos].join(', ')})`);

  // ── 3. Apretar entra, circulo vuelve ────────────────────────────────────
  for (let i = 0; i < 8 && await seleccionado() !== 'music'; i++) await apretar(BOTON.ARRIBA);
  ok(await seleccionado() === 'music', 'se puede llegar a MUSICA con el pad');

  await apretar(BOTON.CRUZ);
  ok(await page.evaluate(() => window.__phone.getView()) === 'music', '✕ entra a la vista MUSICA');

  await apretar(BOTON.CIRCULO);
  ok(await page.evaluate(() => window.__phone.getView()) === 'home', '○ vuelve a la pantalla principal');

  await apretar(BOTON.CIRCULO);
  ok(await page.evaluate(() => !window.__phone.isOpen()), '○ en la principal cierra el Banapod');

  ok(await page.evaluate(() => !document.querySelector('.ft-mando-foco')),
    'el aro verde desaparece al cerrar');

  // ── 4. El salto ─────────────────────────────────────────────────────────
  console.log('\nSALTO');
  // ⚠️ HAY QUE ESPERAR A QUE BOB SE APOYE. Recien cargado todavia esta cayendo
  // a su altura de piso, y un salto pedido en el aire se ignora a proposito.
  // La primera version media desde 0,35 m mientras caia y daba error donde el
  // salto estaba bien.
  let y0 = await page.evaluate(() => window.__bob.position.y);
  for (let i = 0; i < 40; i++) {
    await cuadros(1);
    const y = await page.evaluate(() => window.__bob.position.y);
    if (Math.abs(y - y0) < 0.001) break;
    y0 = y;
  }
  ok(await page.evaluate(() => window.__bob._enElAire) !== true, 'antes de saltar, BOB esta apoyado');
  await page.evaluate(() => { window.__pad.botones.add(0); });
  await cuadros(2);
  await page.evaluate(() => { window.__pad.botones.delete(0); });
  // Se mide el punto MAS ALTO, no la altura al final: el salto dura menos de un
  // segundo de juego y para cuando se termina de medir ya volvio al piso.
  // Se muestrea POR CUADRO: a 2 cuadros por segundo, muestrear por reloj mide
  // siempre el mismo cuadro veinte veces.
  let maxima = y0;
  for (let i = 0; i < 30; i++) {
    await cuadros(1);
    const y = await page.evaluate(() => window.__bob.position.y);
    if (y > maxima) maxima = y;
  }
  const alto = maxima - y0;
  ok(alto > 0.35, `✕ levanta a BOB del piso (subio ${alto.toFixed(2)} m)`);
  ok(alto < 1.6, `el salto no es lunar (${alto.toFixed(2)} m)`);

  const yFinal = await page.evaluate(() => window.__bob.position.y);
  ok(Math.abs(yFinal - y0) < 0.06, `vuelve al piso (quedo en ${yFinal.toFixed(2)}, salio de ${y0.toFixed(2)})`);

  // Que las animaciones se despausen al aterrizar: si quedan congeladas, BOB
  // camina como estatua por el resto de la partida.
  const congelado = await page.evaluate(() => window.__bob._enElAire);
  ok(congelado === false, 'al aterrizar deja de estar en el aire');
  // ── 5. Los gestos (golpe y baile) ───────────────────────────────────────
  //
  // ⚠️ NO SE MIRA UNA FOTO: se mide la POSE. Se guarda la posicion de todos los
  // huesos, se dispara el gesto, y se vuelve a medir. Si BOB no se movio, la
  // suma da cero y no hay forma de confundirse — mirar una captura y decir "se
  // ve bien" ya hizo dar por buenos arreglos que estaban rotos.
  console.log('\nGESTOS');
  const pose = () => page.evaluate(() => {
    const bob = window.__bob;
    let suma = 0;
    bob.model?.updateMatrixWorld(true);
    bob.model?.traverse((o) => {
      if (o.isBone) suma += Math.abs(o.position.x) + Math.abs(o.position.y) + Math.abs(o.position.z)
        + Math.abs(o.quaternion.x) + Math.abs(o.quaternion.y) + Math.abs(o.quaternion.z) + Math.abs(o.quaternion.w);
    });
    return suma;
  });

  const disponibles = await page.evaluate(() => Object.entries(window.__bob.gestos ?? {})
    .filter(([, a]) => a).map(([k]) => k));
  ok(disponibles.includes('golpe'), `el modelo trae el GOLPE (${disponibles.join(', ') || 'ninguno'})`);
  ok(disponibles.includes('baile'), `el modelo trae el BAILE (${disponibles.join(', ') || 'ninguno'})`);

  for (const [boton, nombre] of [[BOTON.R1, 'golpe'], [BOTON.L1, 'baile']]) {
    const antes = await pose();
    const caderasAntes = await page.evaluate(() => {
      const bob = window.__bob;
      bob.model?.updateMatrixWorld(true);
      let h = null;
      bob.model?.traverse((o) => { if (o.isBone && /hips|pelvis/i.test(o.name) && !h) h = o; });
      if (!h) return null;
      const v = new h.position.constructor();
      h.getWorldPosition(v);
      return { x: v.x, y: v.y, z: v.z };
    });
    await apretar(boton);
    ok(await page.evaluate((n) => window.__bob._gesto?.userData?.nombre?.toLowerCase() === n, nombre) === true,
      `arranca el ${nombre}`);
    let maxDif = 0;
    for (let i = 0; i < 10; i++) {
      await cuadros(1);
      maxDif = Math.max(maxDif, Math.abs(await pose() - antes));
    }
    ok(maxDif > 0.5, `el ${nombre} mueve los huesos de verdad (${maxDif.toFixed(2)})`);

    // ⚠️ QUE NO SE TELETRANSPORTE. Kusher lo reporto asi: "se bugea, hace el
    // movimiento, y vuelve a aparecer". Los clips venian con root motion: las
    // caderas arrancaban a medio metro del cuerpo. Se mide la posicion de las
    // caderas EN EL MUNDO durante el gesto contra donde estaban parado.
    const caderas = () => page.evaluate(() => {
      const bob = window.__bob;
      bob.model?.updateMatrixWorld(true);
      let h = null;
      bob.model?.traverse((o) => { if (o.isBone && /hips|pelvis/i.test(o.name) && !h) h = o; });
      if (!h) return null;
      const v = new h.position.constructor();
      h.getWorldPosition?.(v);
      return { x: v.x, y: v.y, z: v.z };
    });
    // Que termine solo y devuelva el control: un gesto que se queda pegado deja
    // a BOB en esa pose para el resto de la partida.
    // Cuanto se corrio de donde estaba parado, en horizontal.
    let corrimiento = 0;
    for (let i = 0; i < 12; i++) {
      await cuadros(1);
      const c = await caderas();
      if (c && caderasAntes) corrimiento = Math.max(corrimiento, Math.hypot(c.x - caderasAntes.x, c.z - caderasAntes.z));
    }
    ok(corrimiento < 0.25, `el ${nombre} NO teletransporta a BOB (se corrio ${corrimiento.toFixed(2)} m)`);

    // ⚠️ La espera se calcula con el LARGO DEL CLIP, no con un numero redondo.
    // El golpe dura 6,87 s y el juego avanza como mucho 0,05 s por cuadro: son
    // ~140 cuadros. Con 60 fijos daba "no termina solo" un gesto que terminaba
    // perfecto, y encima arrastraba al siguiente, que no podia arrancar.
    const largo = await page.evaluate(() => window.__bob._gesto?.getClip?.().duration ?? 1);
    const tope = Math.ceil(largo / 0.05) + 40;
    for (let i = 0; i < tope && await page.evaluate(() => !!window.__bob._gesto); i++) await cuadros(1);
    ok(await page.evaluate(() => !window.__bob._gesto), `el ${nombre} termina solo`);
  }

  // Caminando no se dispara: seria patinar por el piso.
  await page.evaluate(() => { window.__pad.ejes[1] = -1; });
  await cuadros(3);
  await apretar(BOTON.R1);
  ok(await page.evaluate(() => !window.__bob._gesto), 'caminando NO arranca el gesto');
  await page.evaluate(() => { window.__pad.ejes[1] = 0; });
} catch (error) {
  fallos.push(`explotó: ${error.message}`);
  console.error(error);
} finally {
  await browser.close();
}

if (fallos.length) {
  console.log(`\n✖ ${fallos.length} fallo(s):`);
  for (const f of fallos) console.log(`   · ${f}`);
  process.exit(1);
}
console.log('\n✅ TODO BIEN\n');
