// Corta los triangulos que COSEN la mano a la pierna o a la panza, y tapa los
// agujeros que quedan.
//
//   node tools/rig/descoser-manos.mjs entra.glb sale.glb
//
// ⚠️ ESTO ES OTRO PROBLEMA, DISTINTO DE LOS PESOS. Un modelo generado por IA se
// crea en pose de reposo con las manos apoyadas en los muslos, y la superficie
// sale FUSIONADA ahi: la mano y la pierna son una sola piel. Arreglar los pesos
// (tools/rig/despegar-cadenas.mjs) hace que cada parte obedezca a su hueso, pero
// la piel sigue cosida, asi que al separarse se estira una membrana entre las
// dos. Se ve igual de mal. Hay que hacer las DOS cosas: primero los pesos,
// despues este corte.
//
// Como se detecta: se clasifica cada vertice por la zona del cuerpo que mas lo
// pesa, y se buscan triangulos que toquen dos zonas que no pueden tocarse. Que
// el brazo comparta triangulos con el torso, o el hombro con el cuello, es
// normal — son vecinos. Que la MANO comparta triangulos con la PIERNA no.
//
// Tapado: al sacar la banda cosida quedan bordes abiertos. Se arman los bucles
// de borde nuevos y se rellena cada uno en abanico desde su primer vertice, con
// el sentido invertido para que la tapa mire hacia afuera. No se agregan
// vertices: solo indices, asi que las posiciones, las UV y los pesos quedan
// exactamente como estaban.
import fs from 'node:fs';
const [ENTRA, SALE] = process.argv.slice(2);
const buf = fs.readFileSync(ENTRA);

let off = 12, json = null, binOff = 0, binLen = 0, jsonOff = 0, jsonLen = 0;
while (off < buf.length) {
  const len = buf.readUInt32LE(off), tipo = buf.readUInt32LE(off + 4);
  if (tipo === 0x4E4F534A) { json = JSON.parse(buf.slice(off + 8, off + 8 + len).toString('utf8')); jsonOff = off + 8; jsonLen = len; }
  if (tipo === 0x004E4942) { binOff = off + 8; binLen = len; }
  off += 8 + len + ((4 - (len % 4)) % 4);
}
const bin = buf.slice(binOff, binOff + binLen);
const TIPO = { 5120:[Int8Array,1], 5121:[Uint8Array,1], 5122:[Int16Array,2],
               5123:[Uint16Array,2], 5125:[Uint32Array,4], 5126:[Float32Array,4] };
const NUM = { SCALAR:1, VEC2:2, VEC3:3, VEC4:4, MAT4:16 };
const vista = (i) => {
  const a = json.accessors[i], bv = json.bufferViews[a.bufferView];
  const [A, by] = TIPO[a.componentType], n = NUM[a.type];
  const paso = bv.byteStride ? bv.byteStride / by : n;
  const base = (bv.byteOffset ?? 0) + (a.byteOffset ?? 0);
  return { arr: new A(bin.buffer, bin.byteOffset + base, (a.count - 1) * paso + n),
           paso, n, count: a.count, ct: a.componentType };
};

const huesos = json.skins[0].joints.map(i => json.nodes[i].name ?? '?');
const ZONAS = [
  ['manoIzq', /LeftHand/i], ['manoDer', /RightHand/i],
  ['brazoIzq', /LeftShoulder|LeftArm|LeftForeArm/i], ['brazoDer', /RightShoulder|RightArm|RightForeArm/i],
  ['piernaIzq', /LeftUpLeg|LeftLeg|LeftFoot|LeftToe/i], ['piernaDer', /RightUpLeg|RightLeg|RightFoot|RightToe/i],
  ['torso', /Hips|Spine/i], ['cabeza', /neck|Head/i],
];
const zonaDe = h => { for (const [n, re] of ZONAS) if (re.test(h)) return n; return 'otro'; };
// Lo que NO puede compartir piel. Todo lo demas se deja como esta.
const PROHIBIDO = (a, b) => {
  const par = [a, b].sort().join('|');
  return /^manoDer\|piernaDer$|^manoIzq\|piernaIzq$|^manoDer\|torso$|^manoIzq\|torso$|^manoDer\|piernaIzq$|^manoIzq\|piernaDer$/.test(par);
};

const nuevosBufferViews = [];
let finBin = bin.length;
const trozos = [bin];
let cortados = 0, tapados = 0, buclesRaros = 0, buclesMezclados = 0;

for (const malla of json.meshes) for (const pr of malla.primitives) {
  if (pr.indices === undefined || pr.attributes.JOINTS_0 === undefined) continue;
  if (pr.targets) { console.error('⚠️ esta primitiva tiene morph targets; no se toca'); continue; }
  const J = vista(pr.attributes.JOINTS_0), W = vista(pr.attributes.WEIGHTS_0), I = vista(pr.indices);
  const maxW = W.ct === 5126 ? 1 : (W.ct === 5121 ? 255 : 65535);

  const zona = new Array(W.count);
  for (let v = 0; v < W.count; v++) {
    const acc = {};
    for (let k = 0; k < 4; k++) { const w = W.arr[v*W.paso+k] / maxW; if (w <= 0) continue;
      const z = zonaDe(huesos[J.arr[v*J.paso+k]] ?? ''); acc[z] = (acc[z] ?? 0) + w; }
    let mejor = 'otro', mv = -1;
    for (const z in acc) if (acc[z] > mv) { mv = acc[z]; mejor = z; }
    zona[v] = mejor;
  }

  // 1) separar triangulos que se quedan de los que se cortan
  const quedan = [];
  const bordeAntes = new Set(), bordeDespues = new Map();
  const clave = (a, b) => `${a}_${b}`;
  for (let t = 0; t < I.count; t += 3) {
    const tri = [I.arr[t], I.arr[t+1], I.arr[t+2]];
    for (let i = 0; i < 3; i++) bordeAntes.add(clave(tri[i], tri[(i+1)%3]));
    const z = tri.map(v => zona[v]);
    const malo = PROHIBIDO(z[0],z[1]) || PROHIBIDO(z[1],z[2]) || PROHIBIDO(z[0],z[2]);
    if (malo) { cortados++; continue; }
    quedan.push(tri);
    for (let i = 0; i < 3; i++) bordeDespues.set(clave(tri[i], tri[(i+1)%3]), [tri[i], tri[(i+1)%3]]);
  }

  // 2) bordes NUEVOS: dirigidos que quedaron sin su opuesto y antes lo tenian
  // ⚠️ Un vertice puede tener MAS de una arista abierta saliendo (donde el corte
  // toca un borde que el modelo ya traia). Con un Map simple a→b se pierde una y
  // el bucle nunca cierra: asi quedaban 25 astillas sin tapar. Va lista por
  // vertice y las aristas se van consumiendo.
  const salen = new Map();   // a -> [b, b, ...]
  let cuantas = 0;
  for (const [, [a, b]] of bordeDespues) {
    if (bordeDespues.has(clave(b, a))) continue;          // sigue cerrado
    if (!bordeAntes.has(clave(b, a))) continue;           // ya era borde del modelo
    if (!salen.has(a)) salen.set(a, []);
    salen.get(a).push(b); cuantas++;
  }

  // 3) armar los bucles
  const tomar = (a) => { const l = salen.get(a); if (!l || !l.length) return null;
    const b = l.pop(); if (!l.length) salen.delete(a); cuantas--; return b; };
  const bucles = [];
  while (cuantas > 0) {
    const inicio = salen.keys().next().value;
    const bucle = [inicio];
    let v = inicio, seguro = 0;
    for (;;) {
      const b = tomar(v);
      if (b === null || b === inicio || seguro++ > 100000) break;
      bucle.push(b); v = b;
    }
    if (bucle.length < 3) continue;
    if (v !== inicio) buclesRaros++;   // se cierra igual con una cuerda recta
    if (process.env.VER_BUCLES) {
      const c = {}; for (const x of bucle) c[zona[x]] = (c[zona[x]] ?? 0) + 1;
      console.log('   bucle de', bucle.length, 'vertices →', JSON.stringify(c));
    }
    // ⚠️ Un bucle que mezcla mano con pierna/panza NO se tapa: la tapa volveria a
    // coser justo lo que se acaba de cortar. Se prefiere dejar ese agujerito.
    // Pasa en uno solo, de 8 vertices, donde el corte llega hasta la muñeca.
    const zs = [...new Set(bucle.map(x => zona[x]))];
    let mezclado = false;
    for (const a of zs) for (const b of zs) if (PROHIBIDO(a, b)) mezclado = true;
    if (mezclado) { buclesMezclados++; continue; }
    bucles.push(bucle);
  }

  // 4) tapar cada bucle con un abanico desde un vertice NUEVO en su centro.
  // ⚠️ El abanico desde una ESQUINA del bucle no sirve: estos bordes no son
  // planos ni convexos, y el abanico se pliega — la tapa queda dada vuelta y en
  // pantalla se ve el reves. Medido: cerraba mas aristas y aun asi empeoraba, de
  // 1,1% a 2,0% de pixeles de agujero. Desde el centro no se pliega.
  // El vertice nuevo hereda huesos y pesos del primer vertice del bucle: esta
  // adentro de la mano o del muslo, asi que ya pertenece entero a esa parte.
  const extra = { otros: new Map() };
  const attrs = Object.entries(pr.attributes);
  const lecturas = attrs.map(([nombre, iAcc]) => [nombre, iAcc, vista(iAcc)]);
  const POS = lecturas.find(([n]) => n === 'POSITION')[2];
  let nuevoIndice = W.count;
  for (const bucle of bucles) {
    const centro = nuevoIndice++;
    for (const [nombre, , V] of lecturas) {
      if (!extra.otros.has(nombre)) extra.otros.set(nombre, []);
      const dst = extra.otros.get(nombre);
      if (nombre === 'JOINTS_0' || nombre === 'WEIGHTS_0') {
        // copiados tal cual del primer vertice del bucle (misma parte del cuerpo)
        for (let k = 0; k < V.n; k++) dst.push(V.arr[bucle[0]*V.paso + k]);
      } else {
        // promedio del bucle (posicion, normal, UV)
        for (let k = 0; k < V.n; k++) {
          let s = 0; for (const v of bucle) s += V.arr[v*V.paso + k];
          dst.push(s / bucle.length);
        }
      }
    }
    for (let i = 0; i < bucle.length; i++) {
      const a = bucle[i], b = bucle[(i+1) % bucle.length];
      quedan.push([centro, b, a]);      // invertido respecto del borde = mira afuera
      tapados++;
    }
  }
  const agregados = nuevoIndice - W.count;

  // 5) volcar todo a bufferViews agregados al final del BIN.
  // Cada atributo se reescribe entero y compacto (sin byteStride) con los
  // vertices de centro pegados atras; los indices tambien.
  const anexar = (bytes, target) => {
    const relleno = (4 - (finBin % 4)) % 4;
    if (relleno) { trozos.push(Buffer.alloc(relleno)); finBin += relleno; }
    const desde = finBin;
    trozos.push(bytes); finBin += bytes.length;
    json.bufferViews.push({ buffer: 0, byteOffset: desde, byteLength: bytes.length,
                            ...(target ? { target } : {}) });
    return json.bufferViews.length - 1;
  };

  const totalVert = W.count + agregados;
  for (const [nombre, iAcc, V] of lecturas) {
    const a = json.accessors[iAcc];
    const [A] = TIPO[a.componentType];
    const salida = new A(totalVert * V.n);
    for (let v = 0; v < V.count; v++)
      for (let k = 0; k < V.n; k++) salida[v*V.n + k] = V.arr[v*V.paso + k];
    const cola = extra.otros.get(nombre) ?? [];
    for (let i = 0; i < cola.length; i++) salida[V.count*V.n + i] = cola[i];
    a.bufferView = anexar(Buffer.from(salida.buffer, 0, salida.byteLength), 34962);
    a.byteOffset = 0;
    a.count = totalVert;
    if (a.min && a.max) {   // POSITION lleva min/max obligatorio
      const mn = new Array(V.n).fill(Infinity), mx = new Array(V.n).fill(-Infinity);
      for (let v = 0; v < totalVert; v++) for (let k = 0; k < V.n; k++) {
        const x = salida[v*V.n + k]; if (x < mn[k]) mn[k] = x; if (x > mx[k]) mx[k] = x; }
      a.min = mn; a.max = mx;
    }
  }

  const total = quedan.length * 3;
  const usa32 = totalVert > 65535;
  const Arr = usa32 ? Uint32Array : Uint16Array;
  const salida = new Arr(total);
  let p = 0; for (const tri of quedan) { salida[p++]=tri[0]; salida[p++]=tri[1]; salida[p++]=tri[2]; }
  const acc = json.accessors[pr.indices];
  acc.bufferView = anexar(Buffer.from(salida.buffer, 0, salida.byteLength), 34963);
  acc.byteOffset = 0;
  acc.componentType = usa32 ? 5125 : 5123;
  acc.count = total;
  acc.max = [totalVert - 1]; acc.min = [0];
  console.log(`vertices de centro agregados: ${agregados}`);
}

// 6) rearmar el GLB, dejando SOLO los bufferViews que se siguen usando.
// Sin esto el archivo casi se duplica: los datos viejos siguen adentro aunque
// ya no los apunte nadie (medido: 10,6 MB -> 21,0 MB).
const binSucio = Buffer.concat(trozos);
const usados = new Set();
for (const a of json.accessors) if (a.bufferView !== undefined) usados.add(a.bufferView);
for (const im of json.images ?? []) if (im.bufferView !== undefined) usados.add(im.bufferView);
const mapa = new Map(); const limpios = []; const pedazos = []; let cursor = 0;
for (const [i, bv] of json.bufferViews.entries()) {
  if (!usados.has(i)) continue;
  const relleno = (4 - (cursor % 4)) % 4;
  if (relleno) { pedazos.push(Buffer.alloc(relleno)); cursor += relleno; }
  const desde = (bv.byteOffset ?? 0);
  pedazos.push(binSucio.slice(desde, desde + bv.byteLength));
  mapa.set(i, limpios.length);
  limpios.push({ ...bv, byteOffset: cursor });
  cursor += bv.byteLength;
}
for (const a of json.accessors) if (a.bufferView !== undefined) a.bufferView = mapa.get(a.bufferView);
for (const im of json.images ?? []) if (im.bufferView !== undefined) im.bufferView = mapa.get(im.bufferView);
json.bufferViews = limpios;
const binNuevo = Buffer.concat(pedazos);
const pad4 = (b, con) => { const r = (4 - (b.length % 4)) % 4; return r ? Buffer.concat([b, Buffer.alloc(r, con)]) : b; };
json.buffers[0].byteLength = binNuevo.length;
const jsonBuf = pad4(Buffer.from(JSON.stringify(json), 'utf8'), 0x20);
const binBuf = pad4(binNuevo, 0);
const cab = Buffer.alloc(12);
cab.writeUInt32LE(0x46546C67, 0); cab.writeUInt32LE(2, 4);
cab.writeUInt32LE(12 + 8 + jsonBuf.length + 8 + binBuf.length, 8);
const jc = Buffer.alloc(8); jc.writeUInt32LE(jsonBuf.length, 0); jc.writeUInt32LE(0x4E4F534A, 4);
const bc = Buffer.alloc(8); bc.writeUInt32LE(binBuf.length, 0); bc.writeUInt32LE(0x004E4942, 4);
fs.writeFileSync(SALE, Buffer.concat([cab, jc, jsonBuf, bc, binBuf]));
console.log(`triangulos cortados (mano cosida a pierna/panza): ${cortados}`);
console.log(`triangulos de tapa agregados: ${tapados}`);
console.log(`bucles de borde que no cerraron solos: ${buclesRaros}`);
console.log(`bucles dejados sin tapar por mezclar mano con pierna/panza: ${buclesMezclados}`);
