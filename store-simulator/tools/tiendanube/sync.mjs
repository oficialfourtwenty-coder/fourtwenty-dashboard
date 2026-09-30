// Sync Tiendanube → productos.json. Llena el MISMO archivo que edita el panel
// de administración, con el MISMO formato: dos maneras de cargar el catálogo
// (a mano ahora, automático cuando haya credenciales), cero cambios en cómo
// se muestra. Se usa de dos formas:
//   - CLI:      npm run tn:sync
//   - dev:      botón "Sincronizar Tiendanube" del panel admin (el middleware
//               de Vite llama a runSync()).
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadEnv, credencialesCompletas, fetchAllProducts, fetchStoreCurrency } from './api.mjs';
import { aplicarSyncTN } from '../../src/integrations/tiendanube/mapper.js';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const PRODUCTOS_PATH = resolve(ROOT, 'public/assets/data/productos.json');

export async function runSync({ rootDir = ROOT } = {}) {
  const env = loadEnv(rootDir);
  if (!credencialesCompletas(env)) {
    return {
      ok: false,
      motivo: 'Sin credenciales: faltan TN_ACCESS_TOKEN y/o TN_STORE_ID en el .env. El catálogo manual sigue vigente.',
    };
  }

  const catalogo = JSON.parse(readFileSync(PRODUCTOS_PATH, 'utf8'));
  const sinCategorias = catalogo.colecciones.every((c) => !String(c.categoriaTN ?? '').trim());
  if (sinCategorias) {
    return {
      ok: false,
      motivo: 'Ninguna colección tiene categoriaTN configurada. Cargala en el panel admin (campo "Categoría Tiendanube" de cada piso: el nombre o el ID de la categoría en tu tienda) y volvé a sincronizar.',
    };
  }

  const [productosTN, moneda] = await Promise.all([
    fetchAllProducts(env),
    fetchStoreCurrency(env),
  ]);
  const { data, resumen } = aplicarSyncTN(catalogo, productosTN, { moneda });
  writeFileSync(PRODUCTOS_PATH, `${JSON.stringify(data, null, 2)}\n`);
  return { ok: true, totalTN: productosTN.length, moneda, resumen, archivo: PRODUCTOS_PATH };
}

// CLI
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  runSync()
    .then((r) => {
      if (!r.ok) {
        console.log(`⚠ ${r.motivo}`);
        process.exit(2);
      }
      console.log(`✔ ${r.totalTN} productos leídos de Tiendanube (moneda ${r.moneda}).`);
      for (const linea of r.resumen) console.log(`  · ${linea.coleccion}: ${linea.estado} (${linea.cantidad} prendas)`);
      console.log(`✔ Escrito ${r.archivo}`);
      console.log('  Recordá commitear el archivo para publicarlo.');
    })
    .catch((e) => {
      console.error(`✖ Sync falló: ${e.message}`);
      process.exit(1);
    });
}
