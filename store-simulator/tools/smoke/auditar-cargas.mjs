// Mide respuestas realmente terminadas por etapa, sin atribuirle a la primera
// carga el tamaño entero de public/dist. No reemplaza una prueba en la Mac real.
import { chromium } from 'playwright';

const base = process.env.SMOKE_URL ?? 'http://127.0.0.1:5202';
const browser = await chromium.launch({
  ...(process.env.PLAYWRIGHT_CHROMIUM ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM } : {}),
  headless: true,
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--no-sandbox'],
});

try {
  const page = await browser.newPage({ viewport: { width: 1100, height: 760 } });
  const phases = new Map();
  const transfers = new Map();
  const cdpRequests = new Map();
  const errors = [];
  const requestPhase = new WeakMap();
  let phase = 'portada';
  const add = (name) => {
    phase = name;
    if (!phases.has(name)) phases.set(name, []);
    if (!transfers.has(name)) transfers.set(name, { bytes: 0, requests: 0, cached: 0 });
    console.error(`Medición: ${name}`);
  };
  add(phase);
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Network.enable');
  cdp.on('Network.requestWillBeSent', ({ requestId, request }) => {
    if (request.url.startsWith(base)) cdpRequests.set(requestId, phase);
  });
  cdp.on('Network.requestServedFromCache', ({ requestId }) => {
    const name = cdpRequests.get(requestId);
    if (name) transfers.get(name).cached += 1;
  });
  cdp.on('Network.loadingFinished', ({ requestId, encodedDataLength }) => {
    const name = cdpRequests.get(requestId);
    if (!name) return;
    transfers.get(name).bytes += encodedDataLength;
    transfers.get(name).requests += 1;
    cdpRequests.delete(requestId);
  });
  page.on('pageerror', (error) => errors.push(`${phase}: ${error.message}`));
  page.on('request', (request) => requestPhase.set(request, phase));
  page.on('requestfinished', async (request) => {
    try {
      const response = await request.response();
      if (!response || response.status() >= 400) return;
      const body = await response.body();
      phases.get(requestPhase.get(request))?.push({ path: new URL(request.url()).pathname, bytes: body.length });
    } catch { /* streams aborted when the intro is skipped */ }
  });

  const settle = async () => {
    await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {});
    await page.waitForTimeout(1000);
  };
  const skip = async () => {
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);
  };
  await page.goto(`${base}/?q=low&elevatorTest=1`, { waitUntil: 'domcontentloaded', timeout: 120000 });
  await page.waitForFunction(() => window.__elevatorTest, null, { timeout: 120000 });
  await settle();

  add('intro Bobilonia');
  await page.locator('#start-overlay').click();
  const select = page.locator('#bob-select.show .bs-go');
  await select.waitFor({ timeout: 30000 });
  await select.click();
  await page.waitForTimeout(2500);
  await skip();
  await settle();

  for (const [id, name] of [[1, 'ORIGEN'], [2, 'HOOP'], [3, 'CULTURA'], [4, 'BOB'], [5, 'TERRAZA']]) {
    add(`piso ${name}`);
    await page.evaluate((destination) => { window.__elevatorTest.travelTo(destination); }, id);
    for (let n = 0; n < 12; n++) {
      await page.waitForTimeout(650);
      await skip();
      const ready = await page.evaluate((destination) =>
        window.__elevatorTest.getState().destinationId === destination
        && !document.querySelector('#loading-screen.show'), id);
      if (ready) break;
    }
    await page.waitForFunction((destination) =>
      window.__elevatorTest.getState().destinationId === destination,
    id, { timeout: 45000 });
    await settle();
    if (process.env.SMOKE_SHOTS_DIR && (name === 'HOOP' || name === 'BOB')) {
      await page.screenshot({ path: `${process.env.SMOKE_SHOTS_DIR}/${name}-cielo-generado.png` });
    }
  }

  // La segunda visita distingue cache real de "archivo incluido en dist".
  for (const [id, name] of [[2, 'HOOP repetido'], [1, 'ORIGEN repetido']]) {
    add(`piso ${name}`);
    await page.evaluate((destination) => { window.__elevatorTest.travelTo(destination); }, id);
    for (let n = 0; n < 12; n++) {
      await page.waitForTimeout(650);
      await skip();
      const ready = await page.evaluate((destination) =>
        window.__elevatorTest.getState().destinationId === destination
        && !document.querySelector('#loading-screen.show'), id);
      if (ready) break;
    }
    await page.waitForFunction((destination) =>
      window.__elevatorTest.getState().destinationId === destination,
    id, { timeout: 45000 });
    await settle();
  }

  const result = Object.fromEntries([...phases].map(([name, resources]) => [name, {
    requests: resources.length,
    bytes: resources.reduce((n, resource) => n + resource.bytes, 0),
    largest: resources.sort((a, b) => b.bytes - a.bytes).slice(0, 8),
  }]));
  console.log(JSON.stringify({ base, note: 'phases.bytes suma cuerpos completos, incluso caché. transfers.bytes usa Network.loadingFinished.encodedDataLength de Chromium.', phases: result, transfers: Object.fromEntries(transfers), errors }, null, 2));
  if (errors.length) process.exitCode = 1;
} finally {
  await browser.close();
}
