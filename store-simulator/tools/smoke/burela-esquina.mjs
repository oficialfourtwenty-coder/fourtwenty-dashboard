import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const base = process.env.SMOKE_URL || 'http://127.0.0.1:5202';
const out = resolve(process.env.BURELA_OUT || '/tmp/burela-esquina-after');
mkdirSync(out, { recursive: true });
const browser = await chromium.launch({
  ...(process.env.PLAYWRIGHT_CHROMIUM ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM } : {}),
  headless: true,
});
try {
  const page = await browser.newPage({ viewport: { width: 1365, height: 850 } });
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto(`${base}/?q=${process.env.BURELA_QUALITY || 'low'}&perfAudit=1`, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.__bob && window.__editables?.().some(x => x.id.includes('copia')), null, { timeout: 90000 });
  await page.locator('#start-overlay').click();
  const select = page.locator('#bob-select.show .bs-go');
  await select.waitFor({ timeout: 30000 });
  await select.click();
  await page.keyboard.press('Escape');
  await page.waitForFunction(() => !document.querySelector('#loading-screen.show'), null, { timeout: 30000 });
  await page.waitForTimeout(5000);
  const metrics = await page.evaluate(async () => {
    window.__dayNight.setHour(13);
    const THREE = await import('/node_modules/three/build/three.module.js');
    const records = window.__editables().map(e => ({
      id: e.id, name: e.name, p: e.object3D.position.toArray(),
      r: e.object3D.rotation.toArray().slice(0, 3), s: e.object3D.scale.toArray(), v: e.object3D.visible,
    }));
    const towers = window.__editables().filter(e => /Edificio GLB/.test(e.name) && e.object3D.visible).map(e => {
      const b = new THREE.Box3().setFromObject(e.object3D);
      return { id: e.id, min: b.min.toArray(), max: b.max.toArray() };
    });
    return { records, towers, perf: window.__elevatorTest?.getState()?.performance };
  });
  writeFileSync(`${out}/state.json`, JSON.stringify({ ...metrics, errors }, null, 2));
  const views = [
    ['frente', [0, 3.3, 12], [0, 2.5, -6]],
    ['derecha', [17, 2.7, 7], [29, 3.6, -9]],
    ['esquina', [44, 3.2, 9], [28, 6, -15]],
    ['cenital', [25, 93, 17], [25, 0, -14]],
  ];
  for (const [name, pos, target] of views) {
    await page.evaluate(({ pos, target }) => {
      window.__cam.update = () => {};
      window.__cam.camera.position.fromArray(pos);
      window.__cam.camera.lookAt(...target);
    }, { pos, target });
    await page.waitForTimeout(500);
    await page.screenshot({ path: `${out}/${name}.png` });
  }
  console.log(JSON.stringify({ out, towers: metrics.towers, errors, perf: metrics.perf }, null, 2));
  if (errors.length) process.exitCode = 1;
} finally { await browser.close(); }
