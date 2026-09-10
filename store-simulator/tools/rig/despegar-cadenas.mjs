// Despega la mano de la pierna: cada vertice se queda con la cadena que MAS peso
// tiene y la otra se pone en cero, sin ningun umbral. Se opera sobre los bytes
// del GLB (no se reexporta) para no tocar nada mas del archivo.
//
//   node tools/rig/despegar-cadenas.mjs entra.glb sale.glb
//
// PARA QUE SIRVE. Es el bug del "dedo pegado al muslo". Un rig puede estar
// perfecto por fuera —la mano cuelga del hombro, no de la pierna— y aun asi la
// mano viajar con la pierna al caminar, porque hay vertices PINTADOS con las dos
// cadenas a la vez. Ya paso con el BOB del simulador y con el modelo de Meshy.
//
// ⚠️ NO USAR UMBRAL. El primer intento ignoraba pesos menores a 0,01 y quedaban
// vertices con "mano 0,99 + muslo 0,01". Ese 1% por una zancada de casi 8 metros
// da 160 mm de arrastre, que se ve. Cualquier peso de la cadena perdedora, por
// chico que sea, va a cero.
//
// ⚠️ COMO SE COMPRUEBA. No alcanza con mirar el archivo. Hay que cargarlo,
// rotar SOLO los huesos de las piernas y medir cuanto se mueven los vertices de
// la mano (y despues al reves). Antes de creerle a esa medicion, pasarle una
// pose de rotacion CERO: tiene que dar 0,0000 mm exacto. Si no da cero, la
// herramienta miente y el numero no vale nada — mismo error que las diferencias
// falsas de 994 mm al comparar vertices de un GLB con Draco.
// Medido en el modelo de Meshy: peor vertice de la mano 7.888 mm -> 0,0 mm.
import fs from 'node:fs';
const ENTRA = process.argv[2], SALE = process.argv[3];
const buf = fs.readFileSync(ENTRA);

// --- leer el GLB: cabecera + trozo JSON + trozo BIN ---
let off = 12, json = null, binOff = 0, binLen = 0;
while (off < buf.length) {
  const len = buf.readUInt32LE(off), tipo = buf.readUInt32LE(off + 4);
  if (tipo === 0x4E4F534A) json = JSON.parse(buf.slice(off + 8, off + 8 + len).toString('utf8'));
  if (tipo === 0x004E4942) { binOff = off + 8; binLen = len; }
  off += 8 + len + ((4 - (len % 4)) % 4);
}
const bin = buf.slice(binOff, binOff + binLen);

const TIPO = { 5120:[Int8Array,1], 5121:[Uint8Array,1], 5122:[Int16Array,2],
               5123:[Uint16Array,2], 5125:[Uint32Array,4], 5126:[Float32Array,4] };
const NUM = { SCALAR:1, VEC2:2, VEC3:3, VEC4:4, MAT4:16 };
const MAX = { 5121:255, 5123:65535, 5120:127, 5122:32767 };

function vista(iAcc) {
  const acc = json.accessors[iAcc];
  const bv = json.bufferViews[acc.bufferView];
  const [Arr, bytes] = TIPO[acc.componentType];
  const n = NUM[acc.type];
  const paso = bv.byteStride ? bv.byteStride / bytes : n;      // en elementos
  const base = ((bv.byteOffset ?? 0) + (acc.byteOffset ?? 0));
  if (base % bytes !== 0) throw new Error('accesor desalineado');
  const arr = new Arr(bin.buffer, bin.byteOffset + base,
                      (acc.count - 1) * paso + n);
  return { arr, paso, n, count: acc.count, componentType: acc.componentType,
           normalized: !!acc.normalized };
}

// --- huesos ---
const nombre = i => json.nodes[i].name ?? `nodo${i}`;
const BRAZO  = /Shoulder|Arm|Hand/i;
const PIERNA = /UpLeg|Leg|Foot|Toe/i;

let tocados = 0, vistos = 0;
const primitivas = [];
for (const malla of json.meshes) for (const pr of malla.primitives)
  if (pr.attributes.JOINTS_0 !== undefined && pr.attributes.WEIGHTS_0 !== undefined)
    primitivas.push(pr);

// el skin que usa cada malla (asumimos uno solo, se verifica)
const skins = json.skins ?? [];
if (skins.length !== 1) console.log('⚠️  el archivo tiene', skins.length, 'skins');
const huesos = skins[0].joints.map(nombre);

for (const pr of primitivas) {
  const J = vista(pr.attributes.JOINTS_0);
  const W = vista(pr.attributes.WEIGHTS_0);
  const maxW = MAX[W.componentType] ?? 1;
  const esFloat = W.componentType === 5126;
  const leerW = (v,k) => esFloat ? W.arr[v*W.paso+k] : W.arr[v*W.paso+k] / maxW;
  const ponerW = (v,k,x) => { W.arr[v*W.paso+k] = esFloat ? x : Math.round(x*maxW); };

  for (let v = 0; v < W.count; v++) {
    vistos++;
    const h = [], w = [];
    for (let k = 0; k < 4; k++) { h.push(huesos[J.arr[v*J.paso+k]] ?? ''); w.push(leerW(v,k)); }
    let wb = 0, wp = 0;
    for (let k = 0; k < 4; k++) { if (w[k] <= 0) continue;
      if (BRAZO.test(h[k])) wb += w[k]; else if (PIERNA.test(h[k])) wp += w[k]; }
    if (wb <= 0 || wp <= 0) continue;              // no esta mezclado
    const pierde = wb >= wp ? PIERNA : BRAZO;      // gana la cadena mas pesada
    let s = 0;
    for (let k = 0; k < 4; k++) { if (w[k] > 0 && pierde.test(h[k])) w[k] = 0; s += w[k]; }
    if (s <= 0) continue;                          // nunca dejar un vertice sin peso
    for (let k = 0; k < 4; k++) ponerW(v, k, w[k] / s);
    // con enteros el redondeo puede no sumar exacto: se corrige en el mayor
    if (!esFloat) {
      let suma = 0, may = 0;
      for (let k = 0; k < 4; k++) { suma += W.arr[v*W.paso+k];
        if (W.arr[v*W.paso+k] > W.arr[v*W.paso+may]) may = k; }
      W.arr[v*W.paso+may] += maxW - suma;
    }
    tocados++;
  }
}
fs.writeFileSync(SALE, buf);
console.log(`huesos: ${huesos.length} · vertices: ${vistos} · corregidos: ${tocados} (${(tocados/vistos*100).toFixed(2)}%)`);
console.log('pesos guardados como', TIPO[vista(primitivas[0].attributes.WEIGHTS_0).componentType][0].name);
