// PROBAR EL CAMINO DE COMPRA CONTRA UNA TIENDA DEMO.
//
//   npm run tn:probar
//
// POR QUE EXISTE. El soporte de Tiendanube contesto el 04/09 que el camino
// oficial es `POST /draft_orders`, pero quedaron tres cosas sin confirmar y las
// tres se contestan haciendo la llamada de verdad, no preguntando de nuevo:
//
//   1. COMO SE LLAMA EL CAMPO DE LA URL DE PAGO. El soporte dice
//      `checkout_url`; la documentacion publica del recurso habla de
//      `abandoned_checkout_url`. Esta prueba imprime TODAS las claves que
//      vuelven, asi no hay que adivinar.
//   2. QUE SCOPE HACE FALTA DE VERDAD. Dicen `write_draft_orders` o
//      `write_orders`. Si falta el permiso, la API contesta 401/403 y se ve.
//   3. ⚠️ SI SE LE PUEDE APLICAR UN CUPON A UN DRAFT ORDER. Esto NO lo dijo
//      nadie: es una suposicion nuestra, y de ella depende que los FT$ se
//      puedan gastar. El soporte hablo de aplicar cupones a un CARRITO ACTIVO,
//      que es otro objeto. Aca se intenta y se ve que pasa.
//
// ⚠️ CORRERLO SOLO CONTRA UNA TIENDA DEMO. Crea un pedido de verdad en la
// tienda a la que apunte el .env. Por eso pide confirmacion explicita.
//
//   npm run tn:probar -- --si-es-demo
//
// No toca el simulador ni el catalogo: solo habla con la API e imprime.
import { loadEnv, credencialesCompletas, fetchAllProducts } from './api.mjs';

const CONFIRMADO = process.argv.includes('--si-es-demo');
const env = loadEnv();

if (!credencialesCompletas(env)) {
  console.error('\n✖ Faltan credenciales en el .env. Corre npm run tn:setup y npm run tn:token.\n');
  process.exit(1);
}

console.log('\n─────── PRUEBA DEL CAMINO DE COMPRA ───────\n');
console.log(`tienda #${env.TN_STORE_ID}`);

if (!CONFIRMADO) {
  console.log(`
⚠️  ESTO CREA UN PEDIDO DE VERDAD en la tienda #${env.TN_STORE_ID}.

    Si ese numero es tu tienda REAL, no sigas: crea una tienda demo en
    partners.tiendanube.com, autorizale la app ahi, y corre esto de nuevo.

    Si ya es la demo:
        npm run tn:probar -- --si-es-demo
`);
  process.exit(0);
}

const BASE = env.TN_API_BASE || 'https://api.tiendanube.com/v1';
const cab = {
  Authentication: `bearer ${env.TN_ACCESS_TOKEN}`,
  'User-Agent': env.TN_USER_AGENT || 'Simulador Bobilonia',
  'Content-Type': 'application/json',
};

async function llamar(metodo, ruta, cuerpo) {
  const res = await fetch(`${BASE}/${env.TN_STORE_ID}${ruta}`, {
    method: metodo,
    headers: cab,
    body: cuerpo ? JSON.stringify(cuerpo) : undefined,
  });
  const texto = await res.text();
  let datos = null;
  try { datos = JSON.parse(texto); } catch { /* la API devolvio algo que no es JSON */ }
  return { estado: res.status, datos, texto };
}

// ── 1. una variante real con la que armar el pedido ─────────────────────────
console.log('\n1. Buscando una variante real para la prueba...');
const productos = await fetchAllProducts(env);
const conVariante = productos.find((p) => Array.isArray(p.variants) && p.variants.length);
if (!conVariante) {
  console.error('   ✖ La tienda no tiene productos con variantes. Carga uno en la demo.');
  process.exit(1);
}
const variante = conVariante.variants[0];
console.log(`   producto "${conVariante.name?.es ?? conVariante.name}" · variante ${variante.id} · precio ${variante.price}`);

// ── 2. crear el borrador de pedido ──────────────────────────────────────────
console.log('\n2. POST /draft_orders');
const borrador = await llamar('POST', '/draft_orders', {
  // Se manda SOLO el id de la variante y la cantidad. El precio lo pone
  // Tiendanube: es justo la regla de "nunca confiar en el navegador", y aca
  // se cumple sola porque nosotros no calculamos nada.
  products: [{ variant_id: variante.id, quantity: 1 }],
  customer: { name: 'Prueba Bobilonia', email: 'prueba@example.com' },
});
console.log(`   HTTP ${borrador.estado}`);

if (borrador.estado === 401 || borrador.estado === 403) {
  console.log(`
   ✖ PERMISO INSUFICIENTE. Es la respuesta esperable si al token le falta el
     scope. Agregalo en partners (Datos basicos), volve a autorizar la app y
     canjea un code nuevo con npm run tn:token.
     Respuesta cruda: ${borrador.texto.slice(0, 200)}`);
  process.exit(2);
}
if (borrador.estado >= 400) {
  console.log(`   ✖ Fallo: ${borrador.texto.slice(0, 400)}`);
  process.exit(2);
}

// ⚠️ SE IMPRIMEN TODAS LAS CLAVES, no la que suponemos. Ese es el punto de
// esta prueba: el soporte dice `checkout_url` y la documentacion
// `abandoned_checkout_url`. Que lo diga el servidor.
const claves = Object.keys(borrador.datos ?? {});
console.log(`   ✔ creado. id ${borrador.datos?.id}`);
console.log(`   claves que devuelve: ${claves.join(', ')}`);

const urls = claves.filter((k) => /url/i.test(k));
console.log(`\n   ⇒ CAMPOS QUE PARECEN UNA URL: ${urls.length ? urls.join(', ') : 'NINGUNO ⚠️'}`);
for (const k of urls) console.log(`      ${k} = ${borrador.datos[k]}`);
if (!urls.length) {
  console.log(`      ⚠️ Sin URL de pago no se puede mandar al comprador a pagar.
      Esto seria un problema de fondo y hay que volver a preguntarle al soporte.`);
}

// ── 3. la pregunta que NADIE contesto: ¿se le puede aplicar un cupon? ───────
console.log('\n3. ¿Se le puede aplicar un CUPON a un draft order?');
console.log('   (de esto depende que los FT$ se puedan gastar — nadie lo confirmo)');
const codigo = `BOBILONIA-PRUEBA-${Date.now().toString(36).toUpperCase()}`;
const cupon = await llamar('POST', '/coupons', {
  code: codigo, type: 'absolute', value: '1.00', valid: true,
});
console.log(`   POST /coupons → HTTP ${cupon.estado}${cupon.estado >= 400 ? ` · ${cupon.texto.slice(0, 150)}` : ` · cupon ${codigo}`}`);

if (cupon.estado < 400) {
  const pegar = await llamar('POST', `/checkouts/${borrador.datos.id}/coupon`, { code: codigo });
  console.log(`   POST /checkouts/${borrador.datos.id}/coupon → HTTP ${pegar.estado}`);
  if (pegar.estado < 400) {
    console.log('   ✔ SE PUEDE: los FT$ pueden gastarse como cupon sobre el pedido.');
  } else {
    console.log(`   ✖ NO SE PUEDE por esta via: ${pegar.texto.slice(0, 250)}`);
    console.log(`      Entonces el descuento de FT$ hay que meterlo de otra forma
      (como linea del propio draft order, o preguntando al soporte).`);
  }
}

console.log(`
─────── QUE HACER CON ESTO ───────
Pegale esta salida a Claude Code. Con el nombre real del campo y el resultado
del cupon ya se puede escribir el backend sin suponer nada.

⚠️ El pedido ${borrador.datos?.id} quedo creado en la tienda #${env.TN_STORE_ID}.
   Si es la demo, no importa. Borralo del admin si molesta.
`);
