// Baja los brazos de un modelo que viene con los brazos abiertos.
//
//   node tools/rig/bajar-brazos.mjs entra.glb sale.glb [gradosDeApertura]
//
// POR QUE HACE FALTA. Los modelos de IA se generan en pose de T o de A (brazos
// abiertos) y, cuando les pegan una animacion, esa apertura queda METIDA EN LOS
// CLIPS. O sea que el personaje camina con los brazos en cruz.
//
// ⚠️ NO es que la animacion este rota. Medido en el clip Walking del modelo de
// Meshy: el brazo se balancea bien (la mano viaja 600 mm adelante-atras), pero
// todo el balanceo ocurre alrededor de los 75 grados de la vertical. Es un
// DESVIO CONSTANTE. Por eso el arreglo es una rotacion fija: se le aplica la
// misma correccion a TODOS los cuadros, asi el balanceo queda intacto y solo se
// mueve el eje sobre el que ocurre. Si se corrigiera cuadro por cuadro se
// perderia el movimiento.
//
// Se corrige el hueso del brazo (no el hombro) porque es la articulacion que de
// verdad sube y baja el brazo, y se toca tambien la pose de reposo para que el
// modelo quede bien aunque no se reproduzca ningun clip.
import fs from 'node:fs';
const [ENTRA, SALE, GRADOS] = process.argv.slice(2);
const APERTURA = (GRADOS !== undefined ? Number(GRADOS) : 10) * Math.PI / 180;

const buf = fs.readFileSync(ENTRA);
let off = 12, json = null, binOff = 0, binLen = 0;
while (off < buf.length) {
  const len = buf.readUInt32LE(off), tipo = buf.readUInt32LE(off + 4);
  if (tipo === 0x4E4F534A) json = JSON.parse(buf.slice(off + 8, off + 8 + len).toString('utf8'));
  if (tipo === 0x004E4942) { binOff = off + 8; binLen = len; }
  off += 8 + len + ((4 - (len % 4)) % 4);
}
const bin = buf.slice(binOff, binOff + binLen);

// ── cuentas de cuaterniones y matrices, lo minimo ────────────────────────────
const qMul = (a, b) => [
  a[3]*b[0] + a[0]*b[3] + a[1]*b[2] - a[2]*b[1],
  a[3]*b[1] - a[0]*b[2] + a[1]*b[3] + a[2]*b[0],
  a[3]*b[2] + a[0]*b[1] - a[1]*b[0] + a[2]*b[3],
  a[3]*b[3] - a[0]*b[0] - a[1]*b[1] - a[2]*b[2],
];
const qInv = (q) => [-q[0], -q[1], -q[2], q[3]];
const qAplicar = (q, v) => {                    // rotar un vector
  const [x,y,z,w] = q, [vx,vy,vz] = v;
  const ix =  w*vx + y*vz - z*vy, iy =  w*vy + z*vx - x*vz;
  const iz =  w*vz + x*vy - y*vx, iw = -x*vx - y*vy - z*vz;
  return [ix*w + iw*-x + iy*-z - iz*-y,
          iy*w + iw*-y + iz*-x - ix*-z,
          iz*w + iw*-z + ix*-y - iy*-x];
};
const norm = (v) => { const l = Math.hypot(...v) || 1; return v.map(x => x / l); };
const qEntre = (a, b) => {                      // rotacion que lleva a hasta b
  const d = a[0]*b[0] + a[1]*b[1] + a[2]*b[2];
  if (d < -0.999999) {                          // opuestos: cualquier eje perpendicular
    let eje = Math.abs(a[0]) < 0.9 ? [1,0,0] : [0,1,0];
    eje = norm([a[1]*eje[2]-a[2]*eje[1], a[2]*eje[0]-a[0]*eje[2], a[0]*eje[1]-a[1]*eje[0]]);
    return [...eje, 0];
  }
  const c = [a[1]*b[2]-a[2]*b[1], a[2]*b[0]-a[0]*b[2], a[0]*b[1]-a[1]*b[0]];
  const q = [c[0], c[1], c[2], 1 + d];
  const l = Math.hypot(...q); return q.map(x => x / l);
};

// ── pose de reposo: rotacion y posicion en el mundo de cada nodo ─────────────
const padre = new Map();
json.nodes.forEach((n, i) => (n.children ?? []).forEach(h => padre.set(h, i)));
const mundo = new Map();   // nodo -> { q, p }
const enMundo = (i) => {
  if (mundo.has(i)) return mundo.get(i);
  const n = json.nodes[i];
  const q = n.rotation ?? [0,0,0,1];
  const t = n.translation ?? [0,0,0];
  const p = padre.get(i);
  let r;
  if (p === undefined) r = { q, p: t };
  else { const P = enMundo(p);
         r = { q: qMul(P.q, q), p: P.p.map((x, k) => x + qAplicar(P.q, t)[k]) }; }
  mundo.set(i, r); return r;
};

const porNombre = new Map(json.nodes.map((n, i) => [n.name, i]));
const correcciones = new Map();   // nodo del brazo -> cuaternion de correccion

for (const [brazo, antebrazo, signo] of [['LeftArm','LeftForeArm',+1], ['RightArm','RightForeArm',-1]]) {
  const iB = porNombre.get(brazo), iA = porNombre.get(antebrazo);
  if (iB === undefined || iA === undefined) { console.error(`no encontre ${brazo}`); continue; }
  const B = enMundo(iB), A = enMundo(iA);
  const actual = norm([A.p[0]-B.p[0], A.p[1]-B.p[1], A.p[2]-B.p[2]]);
  // colgando, apenas separado del cuerpo hacia su lado
  const objetivo = norm([signo * Math.sin(APERTURA), -Math.cos(APERTURA), 0]);
  const qMundo = qEntre(actual, objetivo);
  const Qp = enMundo(padre.get(iB)).q;
  correcciones.set(iB, qMul(qInv(Qp), qMul(qMundo, Qp)));   // llevada al espacio del padre
  const grados = Math.acos(Math.max(-1, Math.min(1, -actual[1]))) * 180 / Math.PI;
  console.log(`${brazo}: estaba a ${grados.toFixed(1)}° de la vertical → ${(APERTURA*180/Math.PI).toFixed(0)}°`);
}

// ── aplicar a la pose de reposo ──────────────────────────────────────────────
for (const [iB, corr] of correcciones) {
  const n = json.nodes[iB];
  n.rotation = qMul(corr, n.rotation ?? [0,0,0,1]);
}

// ── aplicar a TODOS los cuadros de TODOS los clips ───────────────────────────
const TIPO = { 5120:Int8Array, 5121:Uint8Array, 5122:Int16Array, 5123:Uint16Array, 5126:Float32Array };
const yaHechos = new Set();
let cuadros = 0;
for (const anim of json.animations ?? []) {
  for (const canal of anim.channels) {
    if (canal.target.path !== 'rotation') continue;
    const corr = correcciones.get(canal.target.node);
    if (!corr) continue;
    const s = anim.samplers[canal.sampler];
    if (s.interpolation === 'CUBICSPLINE') {
      console.error('⚠️ este clip usa CUBICSPLINE; no se toca'); continue;
    }
    if (yaHechos.has(s.output)) continue;      // el mismo sampler compartido
    yaHechos.add(s.output);
    const a = json.accessors[s.output];
    if (a.componentType !== 5126) { console.error('⚠️ rotaciones no float; no se toca'); continue; }
    const bv = json.bufferViews[a.bufferView];
    const base = (bv.byteOffset ?? 0) + (a.byteOffset ?? 0);
    const arr = new Float32Array(bin.buffer, bin.byteOffset + base, a.count * 4);
    for (let k = 0; k < a.count; k++) {
      const q = qMul(corr, [arr[k*4], arr[k*4+1], arr[k*4+2], arr[k*4+3]]);
      arr[k*4] = q[0]; arr[k*4+1] = q[1]; arr[k*4+2] = q[2]; arr[k*4+3] = q[3];
      cuadros++;
    }
  }
}

// ── rearmar (el BIN se edita en su lugar, no cambia de tamaño) ───────────────
const pad4 = (b, con) => { const r = (4 - (b.length % 4)) % 4; return r ? Buffer.concat([b, Buffer.alloc(r, con)]) : b; };
const jsonBuf = pad4(Buffer.from(JSON.stringify(json), 'utf8'), 0x20);
const binBuf = pad4(bin, 0);
const cab = Buffer.alloc(12);
cab.writeUInt32LE(0x46546C67, 0); cab.writeUInt32LE(2, 4);
cab.writeUInt32LE(12 + 8 + jsonBuf.length + 8 + binBuf.length, 8);
const jc = Buffer.alloc(8); jc.writeUInt32LE(jsonBuf.length, 0); jc.writeUInt32LE(0x4E4F534A, 4);
const bc = Buffer.alloc(8); bc.writeUInt32LE(binBuf.length, 0); bc.writeUInt32LE(0x004E4942, 4);
fs.writeFileSync(SALE, Buffer.concat([cab, jc, jsonBuf, bc, binBuf]));
console.log(`cuadros de animacion corregidos: ${cuadros}`);
