// Despues de comprimir bob.glb con Draco y de cambiar TODOS los cargadores por
// uno compartido, esto comprueba que los modelos siguen apareciendo. Un GLB que
// no se puede leer NO da error: simplemente no esta.
import { chromium } from 'playwright';
const URL = process.env.SMOKE_URL ?? 'http://127.0.0.1:5399';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium',
  args: ['--use-gl=angle','--use-angle=swiftshader','--no-sandbox'] });
const p = await b.newPage({ viewport: { width: 1100, height: 800 } });
await p.addInitScript(() => { try { localStorage.clear(); } catch {} });
await p.goto(`${URL}/?q=low&elevatorTest=1`, { waitUntil: 'domcontentloaded', timeout: 120000 });
await p.waitForFunction(() => window.__elevatorTest, null, { timeout: 120000 });
await p.click('#start-overlay');
const boton = await p.waitForSelector('#bob-select.show .bs-go', { timeout: 30000 });
await p.click('#bob-select .bs-card:nth-child(8)');   // BOB ORO
await boton.click();
await p.waitForTimeout(1500);
for (let i=0;i<20;i++){ const v=await p.evaluate(()=>document.getElementById('loading-screen')?.classList.contains('show')??false);
  if(!v) break; await p.keyboard.press('Escape'); await p.waitForTimeout(500); }
await p.waitForTimeout(8000);

const r = await p.evaluate(() => {
  const bob = window.__bob;
  let skinned = null;
  bob?.model?.traverse?.(o => { if (o.isSkinnedMesh) skinned = o; });
  const g = skinned?.geometry;
  return {
    hayModelo: !!bob?.model,
    esBillboard: bob?._isBillboard === true,
    huesos: skinned?.skeleton?.bones?.length ?? 0,
    triangulos: g ? (g.index ? g.index.count/3 : g.attributes.position.count/3) : 0,
    esPelajeRepintado: skinned?.material?.map?.isCanvasTexture === true,
    clips: Object.entries(bob?.actions ?? {}).filter(([,a]) => a).map(([k]) => k),
    mallasBurela: window.__elevatorTest.getState().scene.meshes,
    autos: (window.__cars?.length ?? window.__cars?.cars?.length ?? 0),
  };
});
console.log('BOB del jugador (bob.glb con Draco, 2,33 → 0,83 MB):');
console.log('   modelo GLB cargado  :', r.hayModelo && !r.esBillboard ? '✅ si' : '❌ NO (cayo al muñeco de respaldo)');
console.log('   huesos              :', r.huesos === 41 ? '✅ 41' : `❌ ${r.huesos} (tienen que ser 41)`);
console.log('   triangulos          :', r.triangulos === 40000 ? '✅ 40.000 (intactos)' : `⚠️ ${r.triangulos}`);
console.log('   pelaje ORO aplicado :', r.esPelajeRepintado ? '✅ si (textura repintada en vivo)' : '❌ quedo la original');
console.log('   acciones de animacion:', r.clips.join(', ') || '(ninguna)');
console.log('   mallas de Burela    :', r.mallasBurela);

await p.evaluate(() => window.__elevatorTest.travelTo(4));
await p.waitForTimeout(2500);
for (let i=0;i<24;i++){ const v=await p.evaluate(()=>document.getElementById('loading-screen')?.classList.contains('show')??false);
  if(!v) break; await p.keyboard.press('Escape'); await p.waitForTimeout(500); }
await p.waitForTimeout(7000);
const piso = await p.evaluate(() => {
  // La estatua vive en la escena del piso; se la busca desde el editor, que
  // registra todo lo que hay.
  let skinned = 0, nombres = [];
  const escena = window.__bob?.rig?.parent;
  escena?.traverse?.(o => { if (o.isSkinnedMesh) { skinned++; nombres.push(o.name || '(sin nombre)'); } });
  return { destino: window.__elevatorTest.getState().destinationId, skinned, nombres,
           mallas: window.__elevatorTest.getState().scene.meshes };
});
// ⚠️ La estatua gigante de BOB vive en `world/gallery.js`, que arma la escena
// VIEJA del shopping de 5 pisos. Esa escena no se abre desde el ascensor (los
// pisos salen de `terracePs3Trial.js` y ademas estan vacios por pedido de
// Kusher), asi que aca corresponde ver UNA sola malla con esqueleto: el
// jugador. Que no aparezca la estatua NO es un error.
console.log('\nPiso BOB (destino ' + piso.destino + '):');
console.log('   mallas con esqueleto:', piso.skinned === 1 ? '✅ 1 (el jugador; la estatua vive en la escena vieja, que no se abre desde el ascensor)'
  : piso.skinned === 0 ? '❌ 0 — BOB no llego al piso' : `✅ ${piso.skinned}`);
console.log('   cuales               :', piso.nombres.join(' · '));
console.log('   mallas del piso      :', piso.mallas);
await p.screenshot({ path: '/tmp/claude-0/-home-user/7528b9e6-6fcb-551f-939f-52141c814fef/scratchpad/piso-bob-estatua.png' });
await b.close();
