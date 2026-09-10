// Le pinta a un modelo nuevo los colores del BOB de la marca.
//
//   node tools/rig/pintar-bob.mjs origen.glb destino.glb salida.webp
//
// COMO FUNCIONA. Se divide el cuerpo en ZONAS (pelaje, manos, pies, hocico,
// orejas, pelo) usando los HUESOS que pesan cada vertice, mas un par de reglas
// de geometria para separar el hocico y las orejas dentro de la cabeza. Despues
// se mira de que color es cada zona en el BOB viejo —promediando su textura de
// verdad, no inventando— y se pinta la misma zona del modelo nuevo con ese
// color. Encima va un grano de pelo.
//
// ⚠️ POR QUE NO SE HACE POR POSICION. El primer intento buscaba, para cada punto
// del modelo nuevo, el punto mas cercano del viejo y le copiaba el color. Suena
// bien y esta MAL: los dos modelos tienen distinta pose y distintas
// proporciones. Medido: la mediana daba 45 mm, pero el 90% de los vertices
// quedaba a 411 mm de su supuesto par, y el peor a 559 mm. En un cuerpo de
// 1,70 m eso es OTRA PARTE DEL CUERPO. El resultado salia manchado al azar y
// sin el contraste entre el cuerpo oscuro y la cara naranja. Los huesos, en
// cambio, dicen que es cada cosa sin importar como este parado.
//
// ⚠️ EL COLOR NO VA EN UNA TEXTURA, VA POR VERTICE. Las UV del modelo de Meshy
// estan SOLAPADAS: distintas partes del cuerpo comparten los mismos pixeles del
// mapa. Medido: de 489.180 texeles usados hay 896.552 usos, y 373.393 de esos
// choques son entre zonas del cuerpo distintas. O sea que la mano y el torso
// leen el MISMO pixel, y por textura es imposible darles colores distintos —
// salian vetas del color de los pies cruzando la panza y las piernas. El color
// por vertice no usa UV, asi que el problema desaparece.
//
// ⚠️ EL GRANO DE PELO VA EN 3D. Un ruido evaluado en la posicion del vertice
// sale parejo por todo el cuerpo; dibujado sobre el mapa se estira y salen
// chorreones, porque las islas de UV son largas y angostas.
import fs from 'node:fs';
import sharp from 'sharp';

const [ORIGEN, DESTINO, SALIDA] = process.argv.slice(2);
const LADO = 1024;

// ── leer un GLB ──────────────────────────────────────────────────────────────
function abrir(f) {
  const buf = fs.readFileSync(f);
  let off = 12, json = null, bo = 0, bl = 0;
  while (off < buf.length) {
    const l = buf.readUInt32LE(off), t = buf.readUInt32LE(off + 4);
    if (t === 0x4E4F534A) json = JSON.parse(buf.slice(off + 8, off + 8 + l).toString('utf8'));
    if (t === 0x004E4942) { bo = off + 8; bl = l; }
    off += 8 + l + ((4 - (l % 4)) % 4);
  }
  return { json, bin: buf.slice(bo, bo + bl) };
}
const TIPO = { 5120:Int8Array, 5121:Uint8Array, 5122:Int16Array, 5123:Uint16Array, 5125:Uint32Array, 5126:Float32Array };
const NUM = { SCALAR:1, VEC2:2, VEC3:3, VEC4:4, MAT4:16 };
function leer({ json, bin }, iAcc) {
  const a = json.accessors[iAcc], bv = json.bufferViews[a.bufferView];
  const A = TIPO[a.componentType], n = NUM[a.type];
  const paso = bv.byteStride ? bv.byteStride / A.BYTES_PER_ELEMENT : n;
  const base = (bv.byteOffset ?? 0) + (a.byteOffset ?? 0);
  const cruda = new A(bin.buffer, bin.byteOffset + base, (a.count - 1) * paso + n);
  if (paso === n) return { arr: cruda, n, count: a.count, ct: a.componentType };
  const packed = new A(a.count * n);
  for (let i = 0; i < a.count; i++) for (let k = 0; k < n; k++) packed[i*n+k] = cruda[i*paso+k];
  return { arr: packed, n, count: a.count, ct: a.componentType };
}
function malla(g) {
  const P=[], U=[], I=[], J=[], W=[];
  for (const m of g.json.meshes) for (const pr of m.primitives) {
    const base = P.length/3;
    const p = leer(g, pr.attributes.POSITION), u = leer(g, pr.attributes.TEXCOORD_0);
    const j = leer(g, pr.attributes.JOINTS_0), w = leer(g, pr.attributes.WEIGHTS_0);
    const maxW = w.ct === 5126 ? 1 : (w.ct === 5121 ? 255 : 65535);
    for (let i=0;i<p.count*3;i++) P.push(p.arr[i]);
    for (let i=0;i<u.count*2;i++) U.push(u.arr[i]);
    for (let i=0;i<j.count*4;i++) { J.push(j.arr[i]); W.push(w.arr[i]/maxW); }
    const idx = leer(g, pr.indices);
    for (let i=0;i<idx.count;i++) I.push(base + idx.arr[i]);
  }
  return { P:Float32Array.from(P), U:Float32Array.from(U), I:Uint32Array.from(I),
           J:Uint16Array.from(J), W:Float32Array.from(W),
           huesos: g.json.skins[0].joints.map(i => g.json.nodes[i].name ?? '?') };
}
// misma altura, pies en cero, centrado: para que las reglas de geometria
// (que tan adelante esta el hocico, que tan al costado las orejas) valgan igual
// en los dos modelos
function normalizar(P) {
  const mn=[1/0,1/0,1/0], mx=[-1/0,-1/0,-1/0];
  for (let i=0;i<P.length;i+=3) for (let k=0;k<3;k++) {
    if(P[i+k]<mn[k])mn[k]=P[i+k]; if(P[i+k]>mx[k])mx[k]=P[i+k]; }
  const s = 1/(mx[1]-mn[1]);
  for (let i=0;i<P.length;i+=3) {
    P[i]=(P[i]-(mn[0]+mx[0])/2)*s;
    P[i+1]=(P[i+1]-mn[1])*s;
    P[i+2]=(P[i+2]-(mn[2]+mx[2])/2)*s;
  }
}

// ── zonas del cuerpo ─────────────────────────────────────────────────────────
const ZONAS = ['pelaje','mano','pie','hocico','oreja','pelo'];

// ⚠️ NO SE PUEDE SUPONER HACIA DONDE MIRA UN MODELO. El BOB viejo mira a +X en
// su archivo (el juego lo gira 90 grados al cargarlo) y el de Meshy mira a +z.
// Con "adelante = +z" fijo, en el viejo se tomaba como hocico la OREJA, y el
// color del hocico salia marron oscuro en vez del naranja que le corresponde.
// Se deduce del propio modelo: los brazos dan el eje de los costados, y de los
// dos perpendiculares gana el lado hacia el que la cabeza sobresale mas — el
// hocico es lo que mas sobresale, y las orejas no molestan porque caen justo
// sobre el eje de los costados.
function ejeAdelante(M, cabeza) {
  const centro = (re) => {
    let x=0,y=0,z=0,n=0;
    for (let v=0; v<M.P.length/3; v++) {
      let w=0;
      for (let k=0;k<4;k++) { const q=M.W[v*4+k];
        if (q>0 && re.test(M.huesos[M.J[v*4+k]] ?? '')) w+=q; }
      if (w<=0.5) continue;
      x+=M.P[v*3]; y+=M.P[v*3+1]; z+=M.P[v*3+2]; n++;
    }
    return n ? [x/n,y/n,z/n] : null;
  };
  // sirve para los dos juegos de nombres: L_Upperarm / LeftArm
  const izq = centro(/^(L_|Left)(Upperarm|Arm|Forearm|ForeArm|Hand)/i);
  const der = centro(/^(R_|Right)(Upperarm|Arm|Forearm|ForeArm|Hand)/i);
  if (!izq || !der) return [0,0,1];
  let lat = [izq[0]-der[0], 0, izq[2]-der[2]];
  const L = Math.hypot(lat[0], lat[2]) || 1;
  lat = [lat[0]/L, 0, lat[2]/L];
  const f = [-lat[2], 0, lat[0]];            // perpendicular horizontal
  // ⚠️ El signo sale de los DEDOS DE LOS PIES, que apuntan adelante siempre.
  // Antes se sacaba de "hacia donde sobresale mas la cabeza" y fallaba: en el
  // modelo de Meshy los huesos del cuello pesan sobre la espalda alta, que
  // sobresale mas hacia atras que el hocico hacia adelante, y la zona del hocico
  // terminaba pintada en la NUCA. Se vio pintando cada zona de un color chillon;
  // mirando el resultado normal, marron sobre marron, no se notaba.
  const dedos = centro(/Toe/i);
  const tobillos = centro(/Foot|Ankle/i);
  if (dedos && tobillos) {
    const d = (dedos[0]-tobillos[0])*f[0] + (dedos[2]-tobillos[2])*f[2];
    if (d !== 0) return d > 0 ? f : [-f[0],0,-f[2]];
  }
  // Sin dedos en el esqueleto: se cae al criterio viejo, que es menos confiable.
  let cx=0, cz=0;
  for (const v of cabeza) { cx+=M.P[v*3]; cz+=M.P[v*3+2]; }
  cx/=cabeza.length; cz/=cabeza.length;
  let mas=0, menos=0;
  for (const v of cabeza) {
    const d = (M.P[v*3]-cx)*f[0] + (M.P[v*3+2]-cz)*f[2];
    if (d>mas) mas=d; if (-d>menos) menos=-d;
  }
  return mas >= menos ? f : [-f[0],0,-f[2]];
}

function zonasDe(M, etiqueta) {
  const N = M.P.length/3;
  const z = new Array(N).fill('pelaje');
  const cabeza = [];
  for (let v=0; v<N; v++) {
    let mano=0, pie=0, cab=0;
    for (let k=0;k<4;k++) {
      const w = M.W[v*4+k]; if (w<=0) continue;
      const h = M.huesos[M.J[v*4+k]] ?? '';
      if (/Hand/i.test(h)) mano += w;
      else if (/Foot|Toe/i.test(h)) pie += w;
      else if (/Head|neck/i.test(h)) cab += w;
    }
    if (mano > 0.5) z[v] = 'mano';
    else if (pie > 0.5) z[v] = 'pie';
    else if (cab > 0.5) cabeza.push(v);
  }
  // Dentro de la cabeza hay que separar por geometria: los huesos no distinguen
  // el hocico de la nuca. Los umbrales salen de la propia cabeza de cada modelo
  // (percentiles), no de numeros fijos, asi sirve para las dos cabezas aunque
  // sean de distinto tamaño.
  if (cabeza.length) {
    const f = ejeAdelante(M, cabeza);
    const lado = [-f[2], 0, f[0]];
    const adelante = v => M.P[v*3]*f[0] + M.P[v*3+2]*f[2];
    const costado  = v => Math.abs(M.P[v*3]*lado[0] + M.P[v*3+2]*lado[2]);
    const fs = cabeza.map(adelante).sort((a,b)=>a-b);
    const cs = cabeza.map(costado).sort((a,b)=>a-b);
    const ys = cabeza.map(v=>M.P[v*3+1]).sort((a,b)=>a-b);
    const corteHocico = fs[Math.floor(fs.length*0.80)];   // el 20% mas adelantado
    const corteOreja  = cs[Math.floor(cs.length*0.86)];   // el 14% mas lateral
    const cortePelo   = ys[Math.floor(ys.length*0.88)];   // el 12% mas alto
    for (const v of cabeza) {
      if (costado(v) > corteOreja)     z[v] = 'oreja';
      else if (M.P[v*3+1] > cortePelo) z[v] = 'pelo';
      else if (adelante(v) > corteHocico) z[v] = 'hocico';
    }
    console.log(`${etiqueta}: mira hacia (${f.map(x=>x.toFixed(2)).join(', ')})`);
  }
  return z;
}

const gA = abrir(ORIGEN), gB = abrir(DESTINO);
const A = malla(gA), B = malla(gB);
normalizar(A.P); normalizar(B.P);
const zA = zonasDe(A, 'origen'), zB = zonasDe(B, 'destino');

// ── textura del origen ───────────────────────────────────────────────────────
const iTex = gA.json.materials[0].pbrMetallicRoughness.baseColorTexture.index;
const img = gA.json.images[gA.json.textures[iTex].source ?? iTex];
const bvT = gA.json.bufferViews[img.bufferView];
const { data: TEX, info } = await sharp(
  gA.bin.slice(bvT.byteOffset ?? 0, (bvT.byteOffset ?? 0) + bvT.byteLength)
).raw().toBuffer({ resolveWithObject: true });
const TW = info.width, TH = info.height, TC = info.channels;

// color real de cada zona en el BOB de la marca
const PALETA = {};
for (const zona of ZONAS) {
  let r=0,g=0,b=0,n=0, cuantos=0;
  for (let v=0; v<A.P.length/3; v++) {
    if (zA[v] !== zona) continue;
    cuantos++;
    // ⚠️ La V se cuenta desde ARRIBA: en glTF el origen de la textura es la
    // esquina superior izquierda. Con (1-v) se lee la mitad espejada y BOB sale
    // casi negro; el error no se ve mirando la textura sola, solo al pegarla.
    const px = Math.min(TW-1, Math.max(0, Math.round(A.U[v*2]*(TW-1))));
    const py = Math.min(TH-1, Math.max(0, Math.round(A.U[v*2+1]*(TH-1))));
    for (let j=-2;j<=2;j++) for (let k=-2;k<=2;k++) {
      const o = (Math.min(TH-1,Math.max(0,py+j))*TW + Math.min(TW-1,Math.max(0,px+k)))*TC;
      if (TEX[o]+TEX[o+1]+TEX[o+2] < 30) continue;   // hueco entre islas de UV
      r+=TEX[o]; g+=TEX[o+1]; b+=TEX[o+2]; n++;
    }
  }
  PALETA[zona] = n ? [r/n, g/n, b/n] : [120, 60, 25];
  // Para comprobar que cada zona cae donde debe: pinta cada una de un color
  // chillon distinto. Un hocico verde en la nuca se ve al instante; mirando el
  // resultado normal, marron sobre marron, no se nota.
  if (process.env.DEBUG_ZONAS) PALETA[zona] =
    ({pelaje:[60,60,60], mano:[255,0,0], pie:[0,0,255], hocico:[0,255,0],
      oreja:[255,255,0], pelo:[255,0,255]})[zona];
  console.log(`${zona.padEnd(7)} origen ${String(cuantos).padStart(6)} vert → rgb(${PALETA[zona].map(x=>Math.round(x)).join(',')})   destino ${zB.filter(x=>x===zona).length} vert`);
}

// ── grano de pelo: ruido de valor evaluado en 3D ─────────────────────────────
const perm = new Uint8Array(512);
{ let s=98765; for (let i=0;i<256;i++){ s=(s*1664525+1013904223)>>>0; perm[i]=s&255; }
  for (let i=0;i<256;i++) perm[256+i]=perm[i]; }
const suave = t => t*t*(3-2*t);
const lerp = (a,b,t) => a+(b-a)*t;
function ruido(x,y,z) {
  const X=Math.floor(x)&255, Y=Math.floor(y)&255, Z=Math.floor(z)&255;
  x-=Math.floor(x); y-=Math.floor(y); z-=Math.floor(z);
  const u=suave(x), v=suave(y), w=suave(z);
  const g=(a,b,c)=>perm[(perm[(perm[a&255]+b)&255]+c)&255]/255;
  return lerp(
    lerp(lerp(g(X,Y,Z),g(X+1,Y,Z),u),     lerp(g(X,Y+1,Z),g(X+1,Y+1,Z),u), v),
    lerp(lerp(g(X,Y,Z+1),g(X+1,Y,Z+1),u), lerp(g(X,Y+1,Z+1),g(X+1,Y+1,Z+1),u), v), w);
}

// ── color de cada vertice: color de su zona por el grano de pelo ─────────────
// glTF guarda COLOR_0 en espacio LINEAL, y la paleta salio de una textura sRGB.
// Sin convertir, BOB sale lavado y varios tonos mas claro de lo que es.
const aLineal = (c) => { const x = c/255;
  return x <= 0.04045 ? x/12.92 : Math.pow((x+0.055)/1.055, 2.4); };

const N = B.P.length/3;
const COLOR = new Uint8Array(N*3);
for (let v=0; v<N; v++) {
  const base = PALETA[zB[v]];
  const X=B.P[v*3], Y=B.P[v*3+1], Z=B.P[v*3+2];
  const g = ruido(X*260,Y*260,Z*260)*0.75 + ruido(X*46,Y*46,Z*46)*0.25;
  const grano = 0.82 + g*0.36;
  for (let k=0;k<3;k++)
    COLOR[v*3+k] = Math.max(0, Math.min(255, Math.round(aLineal(base[k]) * grano * 255)));
}

// ── escribirlo en el GLB como atributo COLOR_0 ───────────────────────────────
const gS = abrir(DESTINO);
const trozos = [gS.bin];
let fin = gS.bin.length;
let escritos = 0;
for (const m of gS.json.meshes) for (const pr of m.primitives) {
  const cuantos = gS.json.accessors[pr.attributes.POSITION].count;
  const parte = COLOR.subarray(escritos*3, (escritos+cuantos)*3);
  escritos += cuantos;
  const relleno = (4 - (fin % 4)) % 4;
  if (relleno) { trozos.push(Buffer.alloc(relleno)); fin += relleno; }
  const desde = fin;
  const bytes = Buffer.from(parte.buffer, parte.byteOffset, parte.byteLength);
  trozos.push(bytes); fin += bytes.length;
  gS.json.bufferViews.push({ buffer:0, byteOffset:desde, byteLength:bytes.length, target:34962 });
  gS.json.accessors.push({ bufferView: gS.json.bufferViews.length-1, byteOffset:0,
    componentType:5121, normalized:true, count:cuantos, type:'VEC3',
    min:[0,0,0], max:[1,1,1] });
  pr.attributes.COLOR_0 = gS.json.accessors.length-1;
}
if (escritos !== N) throw new Error(`conteo de vertices no coincide: ${escritos} vs ${N}`);

const binNuevo = Buffer.concat(trozos);
const pad4 = (b, con) => { const r=(4-(b.length%4))%4; return r ? Buffer.concat([b, Buffer.alloc(r, con)]) : b; };
gS.json.buffers[0].byteLength = binNuevo.length;
const jsonBuf = pad4(Buffer.from(JSON.stringify(gS.json),'utf8'), 0x20);
const binBuf = pad4(binNuevo, 0);
const cab = Buffer.alloc(12);
cab.writeUInt32LE(0x46546C67,0); cab.writeUInt32LE(2,4);
cab.writeUInt32LE(12+8+jsonBuf.length+8+binBuf.length, 8);
const jc = Buffer.alloc(8); jc.writeUInt32LE(jsonBuf.length,0); jc.writeUInt32LE(0x4E4F534A,4);
const bc = Buffer.alloc(8); bc.writeUInt32LE(binBuf.length,0); bc.writeUInt32LE(0x004E4942,4);
fs.writeFileSync(SALIDA, Buffer.concat([cab,jc,jsonBuf,bc,binBuf]));
console.log(`${SALIDA}: ${(fs.statSync(SALIDA).size/1048576).toFixed(2)} MB (color por vertice: +${(N*3/1024).toFixed(0)} KB)`);
