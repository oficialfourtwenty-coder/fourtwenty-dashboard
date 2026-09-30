// Prueba del mapper con productos falsos que copian la forma real de la API.
import assert from 'node:assert/strict';
import { mapProductoTN, productoEnCategoria, aplicarSyncTN } from '../../src/integrations/tiendanube/mapper.js';

const remera = {
  id: 111, name: { es: 'Remera Yang' }, description: { es: '<p>Algodón</p>' },
  published: true, canonical_url: 'https://x/y', images: [{ src: 'a.webp' }, { src: 'b.webp' }],
  categories: [{ id: 37555117, name: { es: 'Remeras "Origen"' } }],
  variants: [
    { id: 9001, values: [{ es: 'S' }], price: '42000', stock: 3 },
    { id: 9002, values: [{ es: 'M' }], price: '42000', promotional_price: '38000', stock: 0 },
    { id: 9003, values: [{ es: 'L' }], price: '42000', stock: null },
  ],
};
const hoodie = { ...remera, id: 222, name: { es: 'Hoodie Origen' },
  categories: [{ id: 37555129, name: { es: 'Hoodies "Origen"' } }] };
const ajeno = { ...remera, id: 333, categories: [{ id: 38091520, name: { es: 'BOB' } }] };

const m = mapProductoTN(remera);
assert.equal(m.variantes.length, 3, 'trae los 3 talles');
assert.deepEqual(m.variantes.map(v => v.talle), ['S','M','L']);
assert.equal(m.variantes[1].precio, '38000', 'usa el precio promocional');
assert.equal(m.variantes[1].stock, 0, 'stock 0 se conserva como 0');
assert.equal(m.variantes[2].stock, null, 'stock null NO se convierte en 0');
assert.equal(m.variantes[0].variantId, 9001, 'guarda el id de variante (es lo que se cobra)');
assert.equal(m.imagenes.length, 2);
console.log('  ✔ trae los 3 talles, con precio, stock e id de variante');
console.log('  ✔ stock null se conserva (en TN es "sin limite", no cero)');

assert.equal(productoEnCategoria(remera, ['37555117','37555129']), true);
assert.equal(productoEnCategoria(hoodie, ['37555117','37555129']), true);
assert.equal(productoEnCategoria(ajeno,  ['37555117','37555129']), false);
assert.equal(productoEnCategoria(remera, '37555117, 37555129'), true, 'tambien separadas por coma');
assert.equal(productoEnCategoria(hoodie, 'origen'), true, 'tambien por nombre parcial');
console.log('  ✔ dos categorias en un piso: entran remeras y hoodies, no entra BOB');

const cat = { colecciones: [
  { id:'origen', categoriaTN:['37555117','37555129'], productos:[] },
  { id:'hoop', categoriaTN:'', productos:[{id:'viejo'}] },
]};
const { data, resumen } = aplicarSyncTN(cat, [remera, hoodie, ajeno]);
assert.equal(data.colecciones[0].productos.length, 2);
assert.equal(data.colecciones[1].productos.length, 1, 'un piso sin categoria NO se pisa');
console.log('  ✔ el piso sin categoria conserva lo cargado a mano');
console.log('\n✅ TODO BIEN');
