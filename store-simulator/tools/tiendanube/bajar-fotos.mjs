// BAJAR LAS FOTOS DE LOS PRODUCTOS PARA PODER TRABAJAR SIN INTERNET.
//
//   npm run tn:fotos              # baja lo que falte
//   npm run tn:fotos -- --todas   # vuelve a bajar todo, aunque ya este
//
// POR QUE EXISTE. `npm run tn:sync` guarda la foto de cada prenda como un LINK
// a la nube de Tiendanube (`https://dcdn-us.mitiendanube.com/...`). Con
// internet no se nota. Sin internet —un avion, un campo, un corte— el catalogo
// queda entero pero TODAS las prendas salen sin foto, y el panel de producto se
// ve roto sin que nada de error.
//
// Esto se baja las fotos una vez y reescribe el catalogo para que apunten al
// archivo local. El link original NO se tira: queda en `imagenRemota`, asi que
// se puede volver atras o comparar cuando haga falta.
//
// ⚠️ ESTO NECESITA INTERNET. Correlo ANTES de quedarte sin conexion, no despues.
import { readFileSync, writeFileSync, existsSync, mkdirSync, statSync } from 'node:fs';
import { resolve, dirname, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const CATALOGO = resolve(ROOT, 'public/assets/data/productos.json');
const CARPETA = 'assets/productos';          // dentro de public/
const DESTINO = resolve(ROOT, 'public', CARPETA);

const TODAS = process.argv.includes('--todas');
// ⚠️ Tope por archivo. Una foto de producto pesa 50-300 KB; si algo devuelve
// 20 MB es que salio mal, y conviene enterarse ahora y no cuando la primera
// carga del juego se vaya al techo.
const TOPE = 4 * 1024 * 1024;

// El nombre del archivo sale del ID del producto, NO del nombre visual.
// El nombre lo puede cambiar Kusher en Tiendanube cuando quiera; el id no.
function nombreArchivo(producto, url) {
  const ext = (extname(new URL(url).pathname) || '.webp').split('?')[0].toLowerCase();
  const seguro = ['.webp', '.jpg', '.jpeg', '.png', '.gif'].includes(ext) ? ext : '.webp';
  return `${String(producto.id).replace(/[^a-z0-9-]/gi, '-')}${seguro}`;
}

async function bajar(url, ruta) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length > TOPE) throw new Error(`pesa ${(buf.length / 1024 / 1024).toFixed(1)} MB, mas del tope`);
  if (buf.length < 100) throw new Error('vino vacia');
  writeFileSync(ruta, buf);
  return buf.length;
}

const catalogo = JSON.parse(readFileSync(CATALOGO, 'utf8'));
mkdirSync(DESTINO, { recursive: true });

console.log('\n─────── BAJAR FOTOS PARA TRABAJAR SIN INTERNET ───────\n');

let bajadas = 0; let yaEstaban = 0; let fallaron = 0; let bytes = 0;

for (const col of catalogo.colecciones) {
  const conFoto = col.productos.filter((p) => String(p.imagen ?? '').startsWith('http'));
  const yaLocales = col.productos.filter((p) => p.imagen && !String(p.imagen).startsWith('http'));
  if (!col.productos.length) continue;
  console.log(`${col.nombre} — ${col.productos.length} prenda(s): ${conFoto.length} por bajar, ${yaLocales.length} ya local(es)`);

  for (const producto of col.productos) {
    // Si ya se bajo antes, el link vive en `imagenRemota`.
    const url = String(producto.imagen ?? '').startsWith('http')
      ? producto.imagen
      : (TODAS ? producto.imagenRemota : null);
    if (!url) { if (producto.imagen) yaEstaban++; continue; }

    const archivo = nombreArchivo(producto, url);
    const ruta = resolve(DESTINO, archivo);
    if (!TODAS && existsSync(ruta) && statSync(ruta).size > 100) {
      producto.imagenRemota = producto.imagenRemota ?? url;
      producto.imagen = `${CARPETA}/${archivo}`;
      yaEstaban++;
      continue;
    }
    try {
      const n = await bajar(url, ruta);
      producto.imagenRemota = producto.imagenRemota ?? url;
      producto.imagen = `${CARPETA}/${archivo}`;
      bajadas++; bytes += n;
      console.log(`  ✔ ${producto.nombre} → ${archivo} (${Math.round(n / 1024)} KB)`);
    } catch (e) {
      // ⚠️ Una foto que falla NO rompe el resto ni deja el catalogo a medias:
      // esa prenda conserva su link remoto y se avisa cual fue.
      fallaron++;
      console.log(`  ✖ ${producto.nombre}: ${e.message} — queda con el link de internet`);
    }
  }
}

writeFileSync(CATALOGO, `${JSON.stringify(catalogo, null, 2)}\n`);

console.log(`\n✅ ${bajadas} foto(s) bajada(s) · ${yaEstaban} ya estaban · ${fallaron} fallaron`);
console.log(`   ${(bytes / 1024 / 1024).toFixed(2)} MB en public/${CARPETA}/`);
if (fallaron) console.log('   ⚠️ Las que fallaron siguen necesitando internet para verse.');
console.log('\n   Ahora el catalogo anda sin conexion. Acordate de commitear:');
console.log('   git add public/assets/data/productos.json public/assets/productos');
console.log('');
