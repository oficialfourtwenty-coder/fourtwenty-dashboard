// ARREGLAR LOS CLIPS DEL BOB DE MESHY.
//
//   node tools/rig/clips-bob.mjs <bob nuevo.glb> <bob viejo.glb> <salida.glb>
//
// HACE DOS COSAS, y las dos salieron de lo que reporto Kusher probando:
//
// 1. DEVUELVE LA CAMINATA Y LA CORRIDA VIEJAS. "cambiaste la forma de correr
//    que estaba antes, el de ahora corre con los brazos arriba". Es cierto y se
//    midio: al reexportar desde Meshy con el clip nuevo, los clips que ya
//    existian volvieron distintos. De los 72 canales de `Walking` y de
//    `Running` hay 2 que cambiaron, y el peor es `LeftArm.rotation` con 0,4343
//    de diferencia en cuaternion — o sea el brazo en otro lado, no un redondeo.
//    Se copian los valores del archivo VIEJO encima.
//
// 2. DEJA LOS GESTOS EN EL LUGAR. "al apretar r1 o l1 los movimientos no siguen
//    con el personaje, sino que se bugea, hace el movimiento, y vuelve a
//    aparecer". No era el codigo: los clips traen ROOT MOTION, es decir mueven
//    las caderas por el piso. Medido en `Boxing_Practice`: las caderas arrancan
//    en (53,1 · 77,6 · -39,9) cuando caminando estan en (1,3 · 70,2 · 1,7). O
//    sea que al empezar el golpe BOB salta medio metro al costado, boxea alla y
//    vuelve. Ademas se desplaza 113 unidades a lo largo del clip.
//    Se le saca ese viaje y se lo centra donde esta parado.
//
// ⚠️ POR QUE SE PUEDE EDITAR EL BINARIO EN EL LUGAR. Los dos arreglos escriben
// EXACTAMENTE la misma cantidad de numeros que habia. No se agregan ni se
// sacan cuadros, asi que ningun accessor, bufferView ni offset cambia de
// tamaño: no hay cirugia de indices, que es donde se rompen estos archivos.
// Si algun dia hiciera falta AGREGAR un clip, eso ya es otra cosa y hay que
// reconstruir el buffer entero.
import fs from 'node:fs';

const [NUEVO, VIEJO, SALIDA] = process.argv.slice(2);
if (!NUEVO || !VIEJO || !SALIDA) {
  console.error('\n  node tools/rig/clips-bob.mjs <bob nuevo.glb> <bob viejo.glb> <salida.glb>\n');
  process.exit(1);
}

const CLIPS_A_RESTAURAR = ['Walking', 'Running'];
const GESTOS = ['Boxing_Practice', 'Unsteady_Walk'];
const REFERENCIA = 'Walking';     // de aca sale donde tienen que estar las caderas
const RAIZ = 'Hips';

const TIPO = { 5126: Float32Array, 5123: Uint16Array, 5121: Uint8Array, 5125: Uint32Array };
const LARGO = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4 };

function abrir(ruta) {
  const buf = fs.readFileSync(ruta);
  if (buf.readUInt32LE(0) !== 0x46546c67) throw new Error(`${ruta} no es un GLB`);
  let off = 12, json = null, bin = null, binOff = 0;
  while (off < buf.length) {
    const len = buf.readUInt32LE(off);
    const tipo = buf.readUInt32LE(off + 4);
    if (tipo === 0x4e4f534a) json = JSON.parse(buf.slice(off + 8, off + 8 + len).toString('utf8'));
    if (tipo === 0x004e4942) { bin = buf.slice(off + 8, off + 8 + len); binOff = off + 8; }
    off += 8 + len + ((4 - (len % 4)) % 4);
  }
  return { buf, json, bin, binOff };
}

// Vista SOBRE el binario original: escribir aca escribe el archivo.
function vista(g, indiceAccessor) {
  const a = g.json.accessors[indiceAccessor];
  const bv = g.json.bufferViews[a.bufferView];
  const Arr = TIPO[a.componentType];
  const n = LARGO[a.type];
  const desde = (bv.byteOffset ?? 0) + (a.byteOffset ?? 0);
  return new Arr(g.bin.buffer, g.bin.byteOffset + desde, a.count * n);
}

const nodoDe = (g, i) => g.json.nodes[i]?.name;
const clipDe = (g, nombre) => g.json.animations.find((a) => a.name === nombre);

function canal(g, clip, nodo, ruta) {
  const c = clip?.channels.find((x) => nodoDe(g, x.target.node) === nodo && x.target.path === ruta);
  return c ? clip.samplers[c.sampler] : null;
}

const nuevo = abrir(NUEVO);
const viejo = abrir(VIEJO);

console.log('\n─────── ARREGLAR LOS CLIPS DE BOB ───────\n');

// ── 1. devolver los clips viejos ────────────────────────────────────────────
let canalesCopiados = 0;
for (const nombre of CLIPS_A_RESTAURAR) {
  const cn = clipDe(nuevo, nombre);
  const cv = clipDe(viejo, nombre);
  if (!cn || !cv) { console.log(`· ${nombre}: no esta en los dos archivos, se saltea`); continue; }
  let cambiados = 0, peor = 0, dondePeor = '';
  for (const ch of cn.channels) {
    const nodo = nodoDe(nuevo, ch.target.node);
    const sV = canal(viejo, cv, nodo, ch.target.path);
    if (!sV) continue;
    const destino = vista(nuevo, cn.samplers[ch.sampler].output);
    const origen = vista(viejo, sV.output);
    // ⚠️ Si no coinciden los cuadros no se toca: escribir de a pedazos dejaria
    // el clip a medio camino entre los dos, que es peor que cualquiera de los
    // dos enteros.
    if (destino.length !== origen.length) {
      console.log(`  ⚠️ ${nombre} ${nodo}.${ch.target.path}: ${destino.length} vs ${origen.length} valores — NO se toca`);
      continue;
    }
    let dif = 0;
    for (let i = 0; i < destino.length; i++) dif = Math.max(dif, Math.abs(destino[i] - origen[i]));
    if (dif > 1e-6) { cambiados++; if (dif > peor) { peor = dif; dondePeor = `${nodo}.${ch.target.path}`; } }
    destino.set(origen);
    canalesCopiados++;
  }
  console.log(`✔ ${nombre}: ${cambiados} canal(es) volvieron al original · el que mas cambiaba era ${dondePeor || '(ninguno)'} con ${peor.toFixed(4)}`);
}

// ── 2. dejar los gestos en el lugar ─────────────────────────────────────────
//
// COMO. A las caderas se les saca el viaje en dos pasos:
//   a) se les resta la RECTA que va del primer cuadro al ultimo (eso borra la
//      deriva pareja).
//   b) se ACHICA lo que sobra en horizontal hasta que quepa en lo que se mueve
//      la caminata. ⚠️ El paso (a) solo no alcanza y esta medido: despues de
//      restar la recta, el boxeo seguia moviendose 101,9 unidades en X. Es que
//      no es una deriva: el clip CAMINA por el ring, va y vuelve, y una recta
//      no describe eso. Achicando la desviacion se conserva el ritmo y el
//      balanceo del peso —que es lo que lo hace ver vivo— pero BOB se queda
//      donde esta.
//      El alto (Y) NO se toca: subir y bajar no lo saca del lugar, y aplastarlo
//      le sacaria el hundirse y esquivar, que en un boxeo es el movimiento.
//   c) se corre todo el clip para que su promedio caiga donde esta el promedio
//      de la caminata. Sin este paso el gesto queda centrado en su propio
//      punto, que en el boxeo esta a medio metro del cuerpo.
function promedio(V) {
  const n = V.length / 3;
  const s = [0, 0, 0];
  for (let i = 0; i < n; i++) for (let e = 0; e < 3; e++) s[e] += V[i * 3 + e];
  return s.map((x) => x / n);
}

const sRef = canal(nuevo, clipDe(nuevo, REFERENCIA), RAIZ, 'translation');
if (!sRef) {
  console.log(`\n⚠️ No hay canal de traslacion de ${RAIZ} en ${REFERENCIA}: los gestos se dejan como estan.`);
} else {
  const centro = promedio(vista(nuevo, sRef.output));
  const rangoDe = (W) => {
    const m = W.length / 3;
    const r = [0, 0, 0];
    for (let e = 0; e < 3; e++) {
      let min = Infinity, max = -Infinity;
      for (let i = 0; i < m; i++) { min = Math.min(min, W[i * 3 + e]); max = Math.max(max, W[i * 3 + e]); }
      r[e] = max - min;
    }
    return r;
  };
  // Cuanto se mueven las caderas caminando. Ese es el tope: si el gesto se
  // mueve mas que eso, deja de ser "estar parado ahi" y empieza a ser viajar.
  const rRef = rangoDe(vista(nuevo, sRef.output));
  console.log(`Las caderas caminando se mueven ${rRef.map((x) => x.toFixed(1)).join(' × ')} — ese es el tope horizontal.`);
  console.log(`\nCentro de referencia (caderas en ${REFERENCIA}): (${centro.map((x) => x.toFixed(1)).join(', ')})`);

  for (const nombre of GESTOS) {
    const clip = clipDe(nuevo, nombre);
    const s = canal(nuevo, clip, RAIZ, 'translation');
    if (!s) { console.log(`· ${nombre}: sin traslacion de ${RAIZ}, nada que hacer`); continue; }
    const V = vista(nuevo, s.output);
    const n = V.length / 3;
    const antes = promedio(V);
    const rAntes = rangoDe(V);

    // a) sacar la recta primero→ultimo
    const p0 = [V[0], V[1], V[2]];
    const pN = [V[(n - 1) * 3], V[(n - 1) * 3 + 1], V[(n - 1) * 3 + 2]];
    for (let i = 0; i < n; i++) {
      const t = n > 1 ? i / (n - 1) : 0;
      for (let e = 0; e < 3; e++) V[i * 3 + e] -= (pN[e] - p0[e]) * t;
    }
    // b) achicar el paseo horizontal hasta lo que se mueve la caminata
    const medioA = promedio(V);
    const rHoy = rangoDe(V);
    for (const e of [0, 2]) {          // X y Z; el alto (1) no se toca
      if (rHoy[e] <= rRef[e] || rHoy[e] === 0) continue;
      const k = rRef[e] / rHoy[e];
      for (let i = 0; i < n; i++) V[i * 3 + e] = medioA[e] + (V[i * 3 + e] - medioA[e]) * k;
    }
    // c) llevar el promedio al centro de referencia
    const medio = promedio(V);
    for (let i = 0; i < n; i++) for (let e = 0; e < 3; e++) V[i * 3 + e] += centro[e] - medio[e];

    const rDespues = rangoDe(V);
    console.log(`✔ ${nombre}`);
    console.log(`    antes:   promedio (${antes.map((x) => x.toFixed(1)).join(', ')})  ·  se movia ${rAntes.map((x) => x.toFixed(1)).join(' × ')}`);
    console.log(`    despues: promedio (${promedio(V).map((x) => x.toFixed(1)).join(', ')})  ·  se mueve  ${rDespues.map((x) => x.toFixed(1)).join(' × ')}`);
  }
}

// El binario se edito en el lugar y ningun tamaño cambio: el archivo se
// escribe tal cual, con el JSON original.
fs.writeFileSync(SALIDA, nuevo.buf);
console.log(`\n✅ ${SALIDA} — ${(nuevo.buf.length / 1024 / 1024).toFixed(2)} MB (${canalesCopiados} canales copiados)\n`);
