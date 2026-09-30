// Diagnóstico visual de skinning: pinta el SkinnedMesh REAL que carga el
// juego (no un análisis aparte) según la familia de hueso dominante de cada
// vértice — rojo = brazo (Upperarm/Forearm/Hand/Clavicle), azul = pierna
// (Thigh/Calf/Foot/ToeBase), verde = resto (torso/cabeza). Mucho más
// confiable que auditar JOINTS_0/WEIGHTS_0 a mano: muestra exactamente lo
// que ve el jugador, incluida cualquier mezcla de pesos que un análisis
// numérico por posición puede pasar por alto o marcar de más.
//
// Requiere exponer THREE temporalmente en window (no queda en el código):
// en src/main.js, al lado de `window.__bob = bob;` agregar por un momento
// `window.__THREE = THREE;`, correr este script, sacar la línea después.
//
// Uso: npm run preview -- --port 4173 --host 0.0.0.0   (en otra terminal)
//      node tools/debug_bone_weights.mjs
// Requiere "playwright" instalado (no es dependencia del proyecto — instalar
// suelto con `npm i -D playwright` o correrlo desde un entorno que ya lo tenga).
import { chromium } from 'playwright';

const OUT_DIR = process.env.OUT_DIR || '/tmp/bob-weightdebug';
await import('node:fs/promises').then((fs) => fs.mkdir(OUT_DIR, { recursive: true }));

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1000, height: 800 } });
page.on('pageerror', (e) => console.log('PAGE EXCEPTION:', e.message));
page.on('console', (m) => { if (m.text().includes('DEBUGWEIGHT')) console.log(m.text()); });
await page.goto('http://localhost:4173/?q=low');
await page.waitForFunction(() => window.__bob, null, { timeout: 30000 });
await page.waitForTimeout(1500);
await page.mouse.click(500, 400);
await page.waitForTimeout(300);

await page.evaluate(() => {
  let skinnedMesh = null;
  window.__bob.model.traverse((o) => { if (o.isSkinnedMesh) skinnedMesh = o; });
  if (!skinnedMesh) { console.log('DEBUGWEIGHT: no se encontro SkinnedMesh'); return; }

  const boneNames = skinnedMesh.skeleton.bones.map((b) => b.name);
  const ARM = new Set(['L_Clavicle', 'L_Upperarm', 'L_UpperarmTwist01', 'L_UpperarmTwist02', 'L_Forearm', 'L_ForearmTwist01', 'L_ForearmTwist02', 'L_Hand',
    'R_Clavicle', 'R_Upperarm', 'R_UpperarmTwist01', 'R_UpperarmTwist02', 'R_Forearm', 'R_ForearmTwist01', 'R_ForearmTwist02', 'R_Hand']);
  const LEG = new Set(['L_Thigh', 'L_ThighTwist01', 'L_ThighTwist02', 'L_Calf', 'L_CalfTwist01', 'L_CalfTwist02', 'L_Foot', 'L_ToeBase',
    'R_Thigh', 'R_ThighTwist01', 'R_ThighTwist02', 'R_Calf', 'R_CalfTwist01', 'R_CalfTwist02', 'R_Foot', 'R_ToeBase']);

  const geo = skinnedMesh.geometry;
  const skinIndex = geo.attributes.skinIndex;
  const skinWeight = geo.attributes.skinWeight;
  const count = skinIndex.count;
  const colors = new Float32Array(count * 3);

  let armVerts = 0, legVerts = 0, mixVerts = 0;
  for (let i = 0; i < count; i++) {
    let armW = 0, legW = 0, otherW = 0;
    for (let k = 0; k < 4; k++) {
      const bi = skinIndex.getComponent(i, k);
      const w = skinWeight.getComponent(i, k);
      if (w <= 0) continue;
      const bname = boneNames[bi];
      if (ARM.has(bname)) armW += w;
      else if (LEG.has(bname)) legW += w;
      else otherW += w;
    }
    colors[i * 3 + 0] = armW;
    colors[i * 3 + 1] = otherW;
    colors[i * 3 + 2] = legW;
    if (armW > 0.15 && legW > 0.15) mixVerts++;
    else if (armW > 0.5) armVerts++;
    else if (legW > 0.5) legVerts++;
  }
  console.log(`DEBUGWEIGHT: verts=${count} arm=${armVerts} leg=${legVerts} MEZCLADOS(arm+leg ambos >15%)=${mixVerts}`);

  const THREE = window.__THREE;
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  skinnedMesh.material = new THREE.MeshBasicMaterial({ vertexColors: true, skinning: true });
});

await page.waitForTimeout(500);
await page.screenshot({ path: `${OUT_DIR}/idle.png` });

await page.keyboard.down('w');
await page.waitForTimeout(1000);
for (let i = 0; i < 12; i++) {
  const t = (i / 12) * 0.96;
  await page.evaluate((t) => { window.__bob.mixer.setTime(0); window.__bob.mixer.update(0); window.__bob.mixer.update(t); }, t);
  await page.waitForTimeout(30);
  await page.screenshot({ path: `${OUT_DIR}/frame-${String(i).padStart(2, '0')}.png` });
}
await page.keyboard.up('w');
await browser.close();
console.log('OK — capturas en', OUT_DIR);
