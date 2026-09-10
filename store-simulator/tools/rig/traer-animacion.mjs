// TRAER UNA ANIMACION DE MIXAMO AL BOB DEL SIMULADOR.
//
//   node tools/rig/traer-animacion.mjs <bob.glb> <animacion.glb> <nombre> <salida.glb>
//
// El .fbx de Mixamo se pasa antes a .glb con FBX2glTF:
//   FBX2glTF -i Dribble.fbx -o dribble --binary
//
// ── POR QUE NO ALCANZA CON COPIAR LAS ROTACIONES ────────────────────────────
// Las dos armazones son humanoides y casi tienen los mismos nombres de huesos,
// asi que la tentacion es copiar cada curva a su hueso homonimo. Esta MAL y se
// midio: la pose de reposo no es la misma. Las caderas de BOB estan en reposo
// con la rotacion (-0,579 · 0,304 · 0,535 · 0,535) y las de Mixamo en
// (0 · 0 · 0 · 1). Una rotacion local solo significa algo RESPECTO de la pose
// de reposo del hueso: copiada tal cual, BOB queda hecho un nudo.
//
// Lo que se conserva es el movimiento EN EL MUNDO. Para cada hueso y cada
// cuadro:
//     delta   = mundoAnimado(origen) x mundoReposo(origen)⁻¹
//     mundo(destino) = delta x mundoReposo(destino)
//     local(destino) = mundo(padre destino)⁻¹ x mundo(destino)
// O sea: "cuanto se giro este hueso respecto de como estaba parado" se lleva
// tal cual al otro esqueleto, que estaba parado distinto.
//
// ⚠️ TRAMPA GRANDE: EL TORSO ESTA NUMERADO AL REVES. Mixamo va Hips → Spine →
// Spine1 → Spine2 de abajo hacia arriba. BOB va Hips → Spine02 → Spine01 →
// Spine: su `Spine` es el de ARRIBA, el del pecho. Emparejando por nombre, la
// rotacion de la pelvis termina en el pecho y la del pecho en la pelvis. Por
// eso el emparejamiento es una tabla escrita a mano y ademas se comprueba que
// los dos huesos esten a la misma distancia de las caderas; si no, se avisa.
//
// ⚠️ LA ESCALA NO ES LA MISMA. BOB mide en centimetros (caderas a 75,3) y el
// glb de Mixamo en metros. Solo importa para la traslacion de las caderas: se
// mide la proporcion entre los dos esqueletos con los huesos que comparten, en
// vez de escribir un numero a mano.
//
// ⚠️ SE DEJA EN EL LUGAR. Igual que los otros gestos: se le saca el viaje a las
// caderas y se lo centra donde BOB esta parado. Ver tools/rig/clips-bob.mjs.
import fs from 'node:fs';

const [BOB, ORIGEN, NOMBRE, SALIDA] = process.argv.slice(2);
if (!BOB || !ORIGEN || !NOMBRE || !SALIDA) {
  console.error('\n  node tools/rig/traer-animacion.mjs <bob.glb> <animacion.glb> <nombre> <salida.glb>\n');
  process.exit(1);
}

const FPS = 30;
const REFERENCIA = 'Walking';   // de aca sale donde van las caderas

// Mixamo → BOB. Los que no estan aca (dedos, HeadTop_End) se ignoran, y los que
// BOB tiene de mas (head_end, headfront) se quedan en su pose de reposo.
const MAPA = {
  Hips: 'Hips',
  Spine: 'Spine02',   // ⚠️ invertido a proposito, ver arriba
  Spine1: 'Spine01',
  Spine2: 'Spine',
  Neck: 'neck',
  Head: 'Head',
  LeftShoulder: 'LeftShoulder', LeftArm: 'LeftArm', LeftForeArm: 'LeftForeArm', LeftHand: 'LeftHand',
  RightShoulder: 'RightShoulder', RightArm: 'RightArm', RightForeArm: 'RightForeArm', RightHand: 'RightHand',
  LeftUpLeg: 'LeftUpLeg', LeftLeg: 'LeftLeg', LeftFoot: 'LeftFoot', LeftToeBase: 'LeftToeBase',
  RightUpLeg: 'RightUpLeg', RightLeg: 'RightLeg', RightFoot: 'RightFoot', RightToeBase: 'RightToeBase',
};

// ── GLB ─────────────────────────────────────────────────────────────────────
const TIPO = { 5126: Float32Array, 5123: Uint16Array, 5121: Uint8Array, 5125: Uint32Array };
const LARGO = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4 };

function abrir(ruta) {
  const buf = fs.readFileSync(ruta);
  if (buf.readUInt32LE(0) !== 0x46546c67) throw new Error(`${ruta} no es un GLB`);
  let off = 12, json = null, bin = Buffer.alloc(0);
  while (off < buf.length) {
    const len = buf.readUInt32LE(off);
    const tipo = buf.readUInt32LE(off + 4);
    if (tipo === 0x4e4f534a) json = JSON.parse(buf.slice(off + 8, off + 8 + len).toString('utf8'));
    if (tipo === 0x004e4942) bin = Buffer.from(buf.slice(off + 8, off + 8 + len));
    off += 8 + len + ((4 - (len % 4)) % 4);
  }
  return { json, bin };
}

function datos(g, i) {
  const a = g.json.accessors[i];
  const bv = g.json.bufferViews[a.bufferView];
  const Arr = TIPO[a.componentType];
  const desde = (bv.byteOffset ?? 0) + (a.byteOffset ?? 0);
  // Se COPIA (slice) y no se apunta: mas abajo el buffer del destino crece y una
  // vista sobre el viejo quedaria colgada.
  return Array.from(new Arr(g.bin.buffer, g.bin.byteOffset + desde, a.count * LARGO[a.type]));
}

function escribir(ruta, json, bin) {
  const txt = Buffer.from(JSON.stringify(json), 'utf8');
  const jsonPad = Buffer.concat([txt, Buffer.alloc((4 - (txt.length % 4)) % 4, 0x20)]);
  const binPad = Buffer.concat([bin, Buffer.alloc((4 - (bin.length % 4)) % 4, 0)]);
  const total = 12 + 8 + jsonPad.length + 8 + binPad.length;
  const out = Buffer.alloc(total);
  out.writeUInt32LE(0x46546c67, 0); out.writeUInt32LE(2, 4); out.writeUInt32LE(total, 8);
  out.writeUInt32LE(jsonPad.length, 12); out.writeUInt32LE(0x4e4f534a, 16);
  jsonPad.copy(out, 20);
  const p = 20 + jsonPad.length;
  out.writeUInt32LE(binPad.length, p); out.writeUInt32LE(0x004e4942, p + 4);
  binPad.copy(out, p + 8);
  fs.writeFileSync(ruta, out);
  return out.length;
}

// ── cuaterniones ────────────────────────────────────────────────────────────
const qMul = (a, b) => [
  a[3] * b[0] + a[0] * b[3] + a[1] * b[2] - a[2] * b[1],
  a[3] * b[1] - a[0] * b[2] + a[1] * b[3] + a[2] * b[0],
  a[3] * b[2] + a[0] * b[1] - a[1] * b[0] + a[2] * b[3],
  a[3] * b[3] - a[0] * b[0] - a[1] * b[1] - a[2] * b[2],
];
const qInv = (q) => [-q[0], -q[1], -q[2], q[3]];   // unitario: el inverso es el conjugado
function qNorm(q) {
  const n = Math.hypot(q[0], q[1], q[2], q[3]) || 1;
  return [q[0] / n, q[1] / n, q[2] / n, q[3] / n];
}
function qLerp(a, b, t) {
  // ⚠️ Con el signo corregido. q y -q son la MISMA rotacion, y sin corregirlo
  // la interpolacion se va por el camino largo: el brazo pega la vuelta entera.
  let d = a[0] * b[0] + a[1] * b[1] + a[2] * b[2] + a[3] * b[3];
  const s = d < 0 ? -1 : 1;
  return qNorm([
    a[0] + (b[0] * s - a[0]) * t, a[1] + (b[1] * s - a[1]) * t,
    a[2] + (b[2] * s - a[2]) * t, a[3] + (b[3] * s - a[3]) * t,
  ]);
}

// ── esqueletos ──────────────────────────────────────────────────────────────
const limpiar = (n) => String(n).replace(/^mixamorig\d*:/, '');

function esqueleto(g) {
  const porNombre = new Map();
  const padre = new Map();
  g.json.nodes.forEach((n, i) => (n.children ?? []).forEach((c) => padre.set(c, i)));
  g.json.nodes.forEach((n, i) => porNombre.set(limpiar(n.name), i));
  const reposo = (i) => qNorm(g.json.nodes[i].rotation ?? [0, 0, 0, 1]);
  // rotacion en el mundo con la pose de reposo
  const cache = new Map();
  function mundoReposo(i) {
    if (cache.has(i)) return cache.get(i);
    const p = padre.get(i);
    const q = p === undefined ? reposo(i) : qMul(mundoReposo(p), reposo(i));
    cache.set(i, q);
    return q;
  }
  const profundidad = (i) => {
    let d = 0, x = i;
    while (padre.has(x)) { x = padre.get(x); d++; }
    return d;
  };
  return { g, porNombre, padre, reposo, mundoReposo, profundidad };
}

const bob = abrir(BOB);
const src = abrir(ORIGEN);
const eBob = esqueleto(bob);
const eSrc = esqueleto(src);

const clip = src.json.animations?.find((a) => true);
if (!clip) { console.error('\n✖ El archivo de origen no trae ninguna animacion.\n'); process.exit(1); }

console.log('\n─────── TRAER ANIMACION AL BOB ───────\n');
console.log(`origen: "${clip.name}" · destino: "${NOMBRE}"`);

// ── curvas del origen, ya muestreadas ───────────────────────────────────────
// Cada canal de glTF tiene su propia linea de tiempo. Se las lleva a una sola,
// pareja, de 30 cuadros por segundo: asi el resto de la cuenta es una tabla y
// no hay que interpolar en cada paso.
const canalesSrc = new Map();   // nodo -> { rotacion: sampler, traslacion: sampler }
let duracion = 0;
for (const ch of clip.channels) {
  const s = clip.samplers[ch.sampler];
  const t = datos(src, s.input);
  duracion = Math.max(duracion, t[t.length - 1] ?? 0);
  const e = canalesSrc.get(ch.target.node) ?? {};
  e[ch.target.path] = { t, v: datos(src, s.output) };
  canalesSrc.set(ch.target.node, e);
}
const cuadros = Math.max(2, Math.round(duracion * FPS) + 1);
console.log(`duracion ${duracion.toFixed(2)} s → ${cuadros} cuadros a ${FPS} por segundo`);

function enTiempo(curva, tiempo, ancho) {
  const { t, v } = curva;
  let i = 0;
  while (i < t.length - 1 && t[i + 1] < tiempo) i++;
  const j = Math.min(i + 1, t.length - 1);
  const span = t[j] - t[i];
  const f = span > 1e-9 ? Math.min(1, Math.max(0, (tiempo - t[i]) / span)) : 0;
  const a = v.slice(i * ancho, i * ancho + ancho);
  const b = v.slice(j * ancho, j * ancho + ancho);
  if (ancho === 4) return qLerp(a, b, f);
  return a.map((x, k) => x + (b[k] - x) * f);
}

// ── emparejar ───────────────────────────────────────────────────────────────
const pares = [];
for (const [nomSrc, nomBob] of Object.entries(MAPA)) {
  const iS = eSrc.porNombre.get(nomSrc);
  const iB = eBob.porNombre.get(nomBob);
  if (iS === undefined || iB === undefined) {
    console.log(`  ⚠️ falta ${nomSrc} → ${nomBob} (origen ${iS !== undefined}, bob ${iB !== undefined})`);
    continue;
  }
  pares.push({ nomSrc, nomBob, iS, iB });
}
// El chequeo que atrapa el torso invertido: los dos tienen que estar a la misma
// distancia de la raiz de su propio esqueleto.
const dS0 = eSrc.profundidad(eSrc.porNombre.get('Hips'));
const dB0 = eBob.profundidad(eBob.porNombre.get('Hips'));
let sospechas = 0;
for (const p of pares) {
  const a = eSrc.profundidad(p.iS) - dS0;
  const b = eBob.profundidad(p.iB) - dB0;
  if (a !== b) { console.log(`  ⚠️ ${p.nomSrc}(${a}) → ${p.nomBob}(${b}): distinta altura en la cadena`); sospechas++; }
}
console.log(`emparejados ${pares.length} huesos${sospechas ? ` · ${sospechas} sospechoso(s)` : ' · todos a la misma altura ✔'}`);

// ── escala entre los dos esqueletos ─────────────────────────────────────────
// Se comparan los largos de los mismos huesos en los dos, y se toma la MEDIANA.
// El promedio lo arruina un solo hueso raro; la mediana no.
const proporciones = [];
for (const p of pares) {
  const a = src.json.nodes[p.iS].translation;
  const b = bob.json.nodes[p.iB].translation;
  if (!a || !b) continue;
  const la = Math.hypot(...a), lb = Math.hypot(...b);
  if (la > 1e-4 && lb > 1e-4) proporciones.push(lb / la);
}
proporciones.sort((x, y) => x - y);
const escala = proporciones.length ? proporciones[Math.floor(proporciones.length / 2)] : 1;
console.log(`escala origen→BOB: ${escala.toFixed(1)}x (mediana de ${proporciones.length} huesos)`);

// ── retargeting ─────────────────────────────────────────────────────────────
const orden = [...eBob.g.json.nodes.keys()]
  .sort((a, b) => eBob.profundidad(a) - eBob.profundidad(b));   // padres antes que hijos
const porBob = new Map(pares.map((p) => [p.iB, p]));

const tiempos = [];
const rotPorNodo = new Map();   // nodo bob -> array de quats
for (const p of pares) rotPorNodo.set(p.iB, []);
const traslacionHips = [];
const iHipsBob = eBob.porNombre.get('Hips');
const iHipsSrc = eSrc.porNombre.get('Hips');

for (let f = 0; f < cuadros; f++) {
  const tiempo = (f / (cuadros - 1)) * duracion;
  tiempos.push(tiempo);

  // 1) mundo animado del ORIGEN
  const mundoSrc = new Map();
  const ordenSrc = [...src.json.nodes.keys()].sort((a, b) => eSrc.profundidad(a) - eSrc.profundidad(b));
  for (const i of ordenSrc) {
    const c = canalesSrc.get(i)?.rotation;
    const local = c ? enTiempo(c, tiempo, 4) : eSrc.reposo(i);
    const pa = eSrc.padre.get(i);
    mundoSrc.set(i, pa === undefined ? local : qMul(mundoSrc.get(pa), local));
  }

  // 2) mundo del DESTINO, de arriba hacia abajo
  const mundoBob = new Map();
  for (const i of orden) {
    const pa = eBob.padre.get(i);
    const mundoPadre = pa === undefined ? [0, 0, 0, 1] : mundoBob.get(pa) ?? [0, 0, 0, 1];
    const par = porBob.get(i);
    let mundo;
    if (par) {
      const delta = qMul(mundoSrc.get(par.iS), qInv(eSrc.mundoReposo(par.iS)));
      mundo = qNorm(qMul(delta, eBob.mundoReposo(i)));
      rotPorNodo.get(i).push(qNorm(qMul(qInv(mundoPadre), mundo)));
    } else {
      // hueso que el origen no tiene: se queda como estaba parado
      mundo = qMul(mundoPadre, eBob.reposo(i));
    }
    mundoBob.set(i, mundo);
  }

  // 3) traslacion de las caderas, a la escala de BOB
  const c = canalesSrc.get(iHipsSrc)?.translation;
  const v = c ? enTiempo(c, tiempo, 3) : (src.json.nodes[iHipsSrc].translation ?? [0, 0, 0]);
  traslacionHips.push([v[0] * escala, v[1] * escala, v[2] * escala]);
}

// ── dejarlo en el lugar (mismo criterio que clips-bob.mjs) ──────────────────
const refClip = bob.json.animations.find((a) => a.name === REFERENCIA);
const refCh = refClip?.channels.find((ch) => ch.target.node === iHipsBob && ch.target.path === 'translation');
if (refCh) {
  const V = datos(bob, refClip.samplers[refCh.sampler].output);
  const n = V.length / 3;
  const centro = [0, 1, 2].map((e) => { let s = 0; for (let i = 0; i < n; i++) s += V[i * 3 + e]; return s / n; });
  const rangoRef = [0, 1, 2].map((e) => {
    let mn = Infinity, mx = -Infinity;
    for (let i = 0; i < n; i++) { mn = Math.min(mn, V[i * 3 + e]); mx = Math.max(mx, V[i * 3 + e]); }
    return mx - mn;
  });
  const rango = (arr, e) => {
    let mn = Infinity, mx = -Infinity;
    for (const p of arr) { mn = Math.min(mn, p[e]); mx = Math.max(mx, p[e]); }
    return mx - mn;
  };
  const antes = [0, 1, 2].map((e) => rango(traslacionHips, e));
  // recta primero→ultimo
  const p0 = traslacionHips[0], pN = traslacionHips[traslacionHips.length - 1];
  traslacionHips.forEach((p, i) => {
    const t = traslacionHips.length > 1 ? i / (traslacionHips.length - 1) : 0;
    for (let e = 0; e < 3; e++) p[e] -= (pN[e] - p0[e]) * t;
  });
  // achicar el paseo horizontal
  for (const e of [0, 2]) {
    const r = rango(traslacionHips, e);
    if (r <= rangoRef[e] || r === 0) continue;
    const m = traslacionHips.reduce((s, p) => s + p[e], 0) / traslacionHips.length;
    const k = rangoRef[e] / r;
    for (const p of traslacionHips) p[e] = m + (p[e] - m) * k;
  }
  // centrar
  const medio = [0, 1, 2].map((e) => traslacionHips.reduce((s, p) => s + p[e], 0) / traslacionHips.length);
  for (const p of traslacionHips) for (let e = 0; e < 3; e++) p[e] += centro[e] - medio[e];
  console.log(`caderas: se movian ${antes.map((x) => x.toFixed(1)).join(' × ')} → ahora ${[0, 1, 2].map((e) => rango(traslacionHips, e).toFixed(1)).join(' × ')} (caminando: ${rangoRef.map((x) => x.toFixed(1)).join(' × ')})`);
} else {
  console.log(`⚠️ No hay clip "${REFERENCIA}" para centrar: las caderas quedan donde caigan.`);
}

// ── escribir el clip nuevo ──────────────────────────────────────────────────
const piezas = [];
let fin = bob.bin.length;
function agregar(arr, tipoAcc, componente = 5126) {
  const Arr = TIPO[componente];
  const datosBin = Buffer.from(new Arr(arr).buffer);
  const relleno = (4 - (fin % 4)) % 4;
  if (relleno) { piezas.push(Buffer.alloc(relleno, 0)); fin += relleno; }
  const offset = fin;
  piezas.push(datosBin);
  fin += datosBin.length;
  bob.json.bufferViews.push({ buffer: 0, byteOffset: offset, byteLength: datosBin.length });
  const cuenta = arr.length / LARGO[tipoAcc];
  const acc = {
    bufferView: bob.json.bufferViews.length - 1,
    componentType: componente,
    count: cuenta,
    type: tipoAcc,
  };
  // El accessor del TIEMPO necesita min/max o algunos lectores lo rechazan.
  if (tipoAcc === 'SCALAR') { acc.min = [Math.min(...arr)]; acc.max = [Math.max(...arr)]; }
  bob.json.accessors.push(acc);
  return bob.json.accessors.length - 1;
}

const accTiempo = agregar(tiempos, 'SCALAR');
const samplers = [];
const channels = [];
for (const [nodo, quats] of rotPorNodo) {
  if (!quats.length) continue;
  const acc = agregar(quats.flat(), 'VEC4');
  samplers.push({ input: accTiempo, output: acc, interpolation: 'LINEAR' });
  channels.push({ sampler: samplers.length - 1, target: { node: nodo, path: 'rotation' } });
}
const accHips = agregar(traslacionHips.flat(), 'VEC3');
samplers.push({ input: accTiempo, output: accHips, interpolation: 'LINEAR' });
channels.push({ sampler: samplers.length - 1, target: { node: iHipsBob, path: 'translation' } });

bob.json.animations.push({ name: NOMBRE, samplers, channels });
const binNuevo = Buffer.concat([bob.bin, ...piezas]);
bob.json.buffers[0].byteLength = binNuevo.length;

const bytes = escribir(SALIDA, bob.json, binNuevo);
console.log(`\n✅ ${SALIDA} — ${(bytes / 1024 / 1024).toFixed(2)} MB`);
console.log(`   clips: ${bob.json.animations.map((a) => a.name).join(', ')}`);
console.log(`   el clip nuevo mueve ${channels.length - 1} huesos + la traslacion de las caderas\n`);
