// EDITOR DE PRENDAS GLB — el "mini photoshop" sobre la remera modelada a mano.
//
// POR QUE ES OTRO ARCHIVO Y NO EL DE SIEMPRE
// El editor viejo (`garmentEditor.js`) trabaja sobre las prendas PARAMETRICAS:
// puede cambiarles el CUERPO (tee/hoodie/pantalon) porque la forma la genera una
// formula, y arma la estampa como un parche 3D calculado con
// `garmentSurfacePoint`. Nada de eso existe en un GLB: la forma es la que modelo
// Fer y no hay funcion de superficie que recorrer.
//
// El color sí usa el mapa UV del GLB. Los bordados se colocan como capas 3D
// independientes sobre frente/espalda: no se deforman aunque cada modelo tenga
// un UV distinto y se mueven con coordenadas simples dentro del pecho.

import * as THREE from 'three';
import { leerImagen } from './estampaImagen.js';

const CLAVE = 'ft-prendas-glb-v1';
const ORIGEN_REMERAS = new Map([
  ...[
    ['prenda:remera-oversize:mxkblc', 'fourtwenty-negro.png'],
    ['prenda:remera-oversize:mxkblc-copia-1', 'cannabis-negro.png'],
    ['prenda:remera-oversize:mxkblc-copia-2', '420-negro.png'],
  ].map(([id, image]) => [id, { color: '#202124', image }]),
  ...[
    ['prenda:remera-regular:vmooh3', 'fourtwenty-blanco.png'],
    ['prenda:remera-regular:vmooh3-copia-1', 'cannabis-blanco.png'],
    ['prenda:remera-regular:vmooh3-copia-2', '420-blanco.png'],
  ].map(([id, image]) => [id, { color: '#ffffff', image }]),
  ...[
    ['prenda:remera-oversize:mxkblc-copia-3', 'fourtwenty-blanco.png'],
    ['prenda:remera-oversize:mxkblc-copia-4', 'cannabis-verde.png'],
    ['prenda:remera-oversize:mxkblc-copia-5', '420-negro.png'],
  ].map(([id, image]) => [id, { color: '#202124', image }]),
  ...[
    ['prenda:remera-regular:vmooh3-copia-3', 'fourtwenty-negro.png'],
    ['prenda:remera-regular:vmooh3-copia-4', 'cannabis-verde.png'],
    ['prenda:remera-regular:vmooh3-copia-5', '420-negro.png'],
  ].map(([id, image]) => [id, { color: '#ffffff', image }]),
]);
function garmentDesignId(prenda) {
  return prenda?.userData?.garmentDesignId ?? prenda?.userData?.editorId ?? prenda?.name;
}
export function originShirtDesign(id) {
  const spec = ORIGEN_REMERAS.get(id);
  if (!spec) return null;
  return { color: spec.color, frente: { ...LADO_BASE, imagen: `/assets/bordados/${spec.image}` }, dorso: { ...LADO_BASE } };
}

// ⚠️ 2048 y no 1024. El logo ocupa una fraccion chica del mapa —en el pecho,
// como un 16% del ancho— asi que a 1024 le tocaban ~160 pixeles y se veia
// pastoso, nada parecido a un bordado. A 2048 son ~330 y se lee la trama.
// El costo se controla con el cache de abajo: dos prendas con el MISMO diseño
// comparten una sola textura, asi que 20 remeras con 4 diseños son 4 texturas.
const LADO_SIN_IMAGEN = 512;   // color plano: no hace falta resolucion

// Texturas ya pintadas, por diseño. Sin esto cada prenda colgada se llevaba su
// propia textura de 2048: veinte prendas eran 320 MB de memoria de video.
const cacheDeTexturas = new Map();
const cacheDeBordados = new Map();
const NOMBRE_CAPA_BORDADO = '__ft_bordado_3d__';
const PANEL_ID = 'ft-garment-glb-editor';
export const BORDADOS = Object.freeze([
  { archivo: 'fourtwenty-blanco.png', nombre: 'FOURTWENTY blanco' },
  { archivo: 'fourtwenty-negro.png', nombre: 'FOURTWENTY negro' },
  { archivo: 'cannabis-verde.png', nombre: 'Hoja verde' },
  { archivo: 'cannabis-negro.png', nombre: 'Hoja negra' },
  { archivo: 'cannabis-blanco.png', nombre: 'Hoja blanca' },
  { archivo: '420-blanco.png', nombre: '420 blanco' },
  { archivo: '420-negro.png', nombre: '420 negro' },
]);

// Arranca sobre el pecho del frente. Sale de medir en que UV caen los vertices
// del pecho-frente del GLB; es un punto de partida, no una jaula: se mueve.
const LADO_BASE = Object.freeze({
  imagen: null,
  x: 0.5,              // coordenadas simples dentro del pecho, no UV
  y: 0.30,
  tamaño: 0.52,
  rotacion: 0,        // grados
  espejar: false,
  // Relieve del bordado. Un logo pegado plano se lee como calcomania; un
  // bordado real tiene un borde con sombra porque el hilo levanta sobre la
  // tela. Se dibuja una copia oscura corrida un pelo abajo y a la derecha,
  // debajo del logo. 0 lo apaga.
  relieve: 0.5,
});

const ladoBase = () => ({ ...LADO_BASE });

export const DISEÑO_BASE = Object.freeze({
  color: null,        // null = el color con el que vino el GLB
  frente: Object.freeze(ladoBase('frente')),
  dorso: Object.freeze(ladoBase('dorso')),
});

// Compatibilidad con todo lo ya guardado: hasta esta mejora el diseño era un
// solo objeto plano. Al abrirlo pasa al FRENTE y la espalda nace vacía.
function normalizarDiseño(raw = {}) {
  const normalizarLado = (valor = {}, lado = 'frente') => {
    const salida = { ...ladoBase(), ...valor };
    // Migra los diseños anteriores: conserva la posicion visual elegida, pero
    // deja de depender del UV distinto de cada remera o hoodie.
    if (!Number.isFinite(valor.x) && Number.isFinite(valor.u)) {
      const zona = lado === 'dorso'
        ? { minU: 0.57, maxU: 0.83, minV: 0.58, maxV: 0.96 }
        : { minU: 0.16, maxU: 0.41, minV: 0.58, maxV: 0.96 };
      salida.x = Math.max(0, Math.min(1, (valor.u - zona.minU) / (zona.maxU - zona.minU)));
      salida.y = Math.max(0, Math.min(1, (zona.maxV - valor.v) / (zona.maxV - zona.minV)));
      salida.tamaño = Math.max(0.08, Math.min(0.95, valor.ancho / (zona.maxU - zona.minU)));
    }
    return salida;
  };
  if (raw.frente || raw.dorso) {
    return {
      color: raw.color ?? null,
      frente: normalizarLado(raw.frente, 'frente'),
      dorso: normalizarLado(raw.dorso, 'dorso'),
    };
  }
  const { color = null, ...ladoAnterior } = raw;
  return {
    color,
    frente: normalizarLado(ladoAnterior, 'frente'),
    dorso: ladoBase('dorso'),
  };
}

export function esPrendaGlb(objeto) {
  return Boolean(objeto?.userData?.garmentModel);
}

/** El raycast pega en la tela o en la percha: se sube hasta la prenda. */
export function prendaGlbDesde(objeto) {
  let actual = objeto;
  while (actual) {
    if (esPrendaGlb(actual)) return actual;
    actual = actual.parent;
  }
  return null;
}

// Cual de las mallas del GLB es LA TELA.
// Se busca por nombre si el modelo lo dejo anotado, pero el respaldo no depende
// de como nombre las cosas quien modele: se descarta la percha y se queda con la
// malla mas pesada, que en una prenda colgada siempre es el cuerpo (2.267
// triangulos contra 130 y 180 de las dos piezas de la percha).
const ES_PERCHA = /hanger|percha|hook/i;

function telaDe(prenda) {
  const nombre = prenda?.userData?.garmentModel?.telaNombre;
  let porNombre = null;
  let masPesada = null;
  let maxVertices = -1;
  prenda?.traverse?.((o) => {
    if (!o.isMesh) return;
    if (nombre && o.name === nombre) porNombre ??= o;
    if (ES_PERCHA.test(o.name)) return;
    const vertices = o.geometry?.attributes?.position?.count ?? 0;
    if (vertices > maxVertices) { maxVertices = vertices; masPesada = o; }
  });
  return porNombre ?? masPesada;
}

// ---------------------------------------------------------------------------
// Guardado por id estable de cada prenda. El nombre se conserva solo como
// respaldo para datos viejos: distintas copias pueden tener el mismo nombre.
// ---------------------------------------------------------------------------
let diseñosEnMemoria;
let promesaHidratarDiseños;
let promesaBaseDiseños;
let baseDatosDiseños;

function leerLegado() {
  try { return JSON.parse(localStorage.getItem(CLAVE)) ?? {}; } catch { return {}; }
}

function abrirBaseDiseños() {
  if (baseDatosDiseños) return Promise.resolve(baseDatosDiseños);
  promesaBaseDiseños ??= new Promise((resolve, reject) => {
    const request = indexedDB.open('bobilonia-designs', 1);
    request.onupgradeneeded = () => request.result.createObjectStore('designs');
    request.onsuccess = () => { baseDatosDiseños = request.result; resolve(baseDatosDiseños); };
    request.onerror = () => { promesaBaseDiseños = null; reject(request.error); };
  });
  return promesaBaseDiseños;
}

function leerEnBase(db) {
  return new Promise((resolve, reject) => {
    const request = db.transaction('designs').objectStore('designs').get('garment-designs-v1');
    request.onsuccess = () => resolve(request.result ?? null);
    request.onerror = () => reject(request.error);
  });
}

function escribirEnBase(db, value) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction('designs', 'readwrite');
    tx.objectStore('designs').put(value, 'garment-designs-v1');
    tx.oncomplete = resolve;
    tx.onabort = () => reject(tx.error ?? Error('Guardado interrumpido'));
    tx.onerror = () => reject(tx.error);
  });
}

function hidratarGuardados() {
  // leerGuardado() puede crear el cache en memoria antes de que abra IndexedDB.
  // Tener un objeto en memoria no significa que la base durable ya se leyo.
  promesaHidratarDiseños ??= (async () => {
    diseñosEnMemoria ??= leerLegado();
    try {
      const db = await abrirBaseDiseños();
      const durables = await leerEnBase(db);
      if (durables && typeof durables === 'object') diseñosEnMemoria = { ...diseñosEnMemoria, ...durables };
      if (!durables || Object.keys(diseñosEnMemoria).some(k => JSON.stringify(durables[k]) !== JSON.stringify(diseñosEnMemoria[k]))) {
        await escribirEnBase(db, diseñosEnMemoria);
      }
      // La copia durable está confirmada; recién entonces retiramos el duplicado
      // del localStorage, que tiene un límite pequeño por sitio.
      const copia = await leerEnBase(db);
      if (copia && Object.keys(diseñosEnMemoria).every(k => JSON.stringify(copia[k]) === JSON.stringify(diseñosEnMemoria[k]))) {
        localStorage.removeItem(CLAVE);
      }
    } catch (error) {
      console.warn('No se pudo preparar el guardado durable de bordados.', error);
    }
    return diseñosEnMemoria;
  })();
  return promesaHidratarDiseños;
}

function leerGuardado() {
  if (!diseñosEnMemoria) diseñosEnMemoria = leerLegado();
  return diseñosEnMemoria;
}

export async function prepararGuardadoDeBordados() {
  return hidratarGuardados();
}

async function guardar(todos) {
  diseñosEnMemoria = todos;
  try {
    const db = await abrirBaseDiseños();
    await escribirEnBase(db, todos);
    const copia = await leerEnBase(db);
    if (!copia || Object.keys(todos).some(k => JSON.stringify(copia[k]) !== JSON.stringify(todos[k]))) return false;
    localStorage.removeItem(CLAVE);
    return true;
  } catch (error) {
    console.warn('No se pudo guardar el bordado en IndexedDB.', error);
    return false;
  }
}

export function diseñoDe(prenda) {
  const id = garmentDesignId(prenda);
  const guardados = leerGuardado();
  const actual = prenda?.userData?.ftDiseñoActual;
  const guardado = guardados[id];
  const preset = originShirtDesign(id);
  const legado = guardados[prenda?.name];
  // El layout es el diseño publicado; IndexedDB guarda el ajuste posterior de
  // esta computadora. El ajuste local debe ganar al volver a cargar el piso.
  const diseñoDelLayout = prenda?.userData?.garmentDesignFromLayout ? actual : null;
  const elegido = guardado ?? diseñoDelLayout ?? preset ?? actual ?? legado
    ?? { color: prenda?.userData?.garmentModel?.color ?? null };
  return normalizarDiseño(elegido);
}

// ---------------------------------------------------------------------------
// El color usa el UV del GLB. El bordado NO: vive como una capa 3D plana sobre
// el pecho. Asi nunca se retuerce por el mapa UV particular de cada modelo.
// ---------------------------------------------------------------------------
function cajaLocalDeTela(prenda, tela) {
  tela.geometry?.computeBoundingBox?.();
  prenda.updateMatrixWorld(true);
  tela.updateMatrixWorld(true);
  const caja = tela.geometry?.boundingBox;
  if (!caja) return null;
  const aPrenda = new THREE.Matrix4()
    .copy(prenda.matrixWorld).invert()
    .multiply(tela.matrixWorld);
  const resultado = new THREE.Box3();
  for (const x of [caja.min.x, caja.max.x]) {
    for (const y of [caja.min.y, caja.max.y]) {
      for (const z of [caja.min.z, caja.max.z]) {
        resultado.expandByPoint(new THREE.Vector3(x, y, z).applyMatrix4(aPrenda));
      }
    }
  }
  return resultado;
}

function quitarCapasBordado(prenda) {
  const capas = prenda.children.filter((o) => o.userData?.ftCapaBordado);
  for (const capa of capas) {
    prenda.remove(capa);
    capa.material?.map?.dispose?.();
    capa.geometry?.dispose?.();
    capa.material?.dispose?.();
  }
}

function texturaBordado(url, alCargar) {
  let registro = cacheDeBordados.get(url);
  if (registro) return registro;
  registro = { imagen: null, aspecto: 1, cargando: true };
  cacheDeBordados.set(url, registro);
  const imagen = new Image();
  imagen.onload = () => {
    registro.imagen = imagen;
    registro.aspecto = imagen.width / Math.max(1, imagen.height) || 1;
    registro.cargando = false;
    alCargar?.();
  };
  imagen.src = url;
  return registro;
}

const ZONA_PECHO = Object.freeze({
  'remera-oversize': { ancho: 0.46, inicio: 0.25, alto: 0.47 },
  'remera-regular': { ancho: 0.45, inicio: 0.24, alto: 0.48 },
  hoodie: { ancho: 0.43, inicio: 0.29, alto: 0.39 },
});

function superficieDePecho(prenda, tela, caja, nombreLado) {
  const posicion = tela.geometry?.attributes?.position;
  if (!posicion) return null;
  const indice = tela.geometry.index;
  const aPrenda = new THREE.Matrix4().copy(prenda.matrixWorld).invert().multiply(tela.matrixWorld);
  const medida = caja.getSize(new THREE.Vector3());
  const centro = caja.getCenter(new THREE.Vector3());
  const zona = ZONA_PECHO[prenda.userData?.garmentModel?.clave] ?? ZONA_PECHO['remera-regular'];
  const ancho = medida.x * zona.ancho;
  const izquierda = centro.x - ancho / 2;
  const arriba = caja.max.y - medida.y * zona.inicio;
  const alto = medida.y * zona.alto;
  const signo = nombreLado === 'frente' ? 1 : -1;
  const salida = [];
  const normales = [];
  const uvs = [];
  const a = new THREE.Vector3();
  const b = new THREE.Vector3();
  const c = new THREE.Vector3();
  const normal = new THREE.Vector3();
  const centroTri = new THREE.Vector3();
  const total = indice ? indice.count : posicion.count;
  const leer = (n, destino) => destino.fromBufferAttribute(posicion, indice ? indice.getX(n) : n).applyMatrix4(aPrenda);
  for (let i = 0; i + 2 < total; i += 3) {
    leer(i, a); leer(i + 1, b); leer(i + 2, c);
    centroTri.copy(a).add(b).add(c).multiplyScalar(1 / 3);
    const u = (centroTri.x - izquierda) / ancho;
    const v = (arriba - centroTri.y) / alto;
    normal.subVectors(b, a).cross(new THREE.Vector3().subVectors(c, a)).normalize();
    if (u < 0 || u > 1 || v < 0 || v > 1 || normal.z * signo < 0.08) continue;
    const empuje = normal.clone().multiplyScalar(Math.max(0.0004, medida.z * 0.002));
    for (const p of [a, b, c]) {
      salida.push(p.x + empuje.x, p.y + empuje.y, p.z + empuje.z);
      normales.push(normal.x, normal.y, normal.z);
      uvs.push((p.x - izquierda) / ancho, 1 - ((arriba - p.y) / alto));
    }
  }
  if (!salida.length) return null;
  const geometria = new THREE.BufferGeometry();
  geometria.setAttribute('position', new THREE.Float32BufferAttribute(salida, 3));
  geometria.setAttribute('normal', new THREE.Float32BufferAttribute(normales, 3));
  geometria.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  return geometria;
}

function texturaDeDiseño(config, registro) {
  if (!registro.imagen) return null;
  const lienzo = document.createElement('canvas');
  lienzo.width = lienzo.height = 1024;
  const ctx = lienzo.getContext('2d');
  const caja = (config.tamaño ?? 0.52) * lienzo.width;
  const w = registro.aspecto >= 1 ? caja : caja * registro.aspecto;
  const h = registro.aspecto >= 1 ? caja / registro.aspecto : caja;
  ctx.translate((config.x ?? 0.5) * lienzo.width, (config.y ?? 0.30) * lienzo.height);
  ctx.rotate((config.rotacion ?? 0) * Math.PI / 180);
  if (config.espejar) ctx.scale(-1, 1);
  ctx.drawImage(registro.imagen, -w / 2, -h / 2, w, h);
  const textura = new THREE.CanvasTexture(lienzo);
  textura.colorSpace = THREE.SRGBColorSpace;
  textura.anisotropy = 16;
  return textura;
}

function aplicarCapasBordado(prenda, tela, diseño) {
  quitarCapasBordado(prenda);
  const caja = cajaLocalDeTela(prenda, tela);
  if (!caja) return;
  for (const nombreLado of ['frente', 'dorso']) {
    const config = diseño[nombreLado];
    if (!config?.imagen) continue;
    const registro = texturaBordado(config.imagen, () => {
      aplicarCapasBordado(prenda, tela, prenda.userData.ftDiseñoActual ?? diseño);
    });
    const geometria = superficieDePecho(prenda, tela, caja, nombreLado);
    const textura = texturaDeDiseño(config, registro);
    if (!geometria || !textura) { geometria?.dispose(); continue; }
    const material = new THREE.MeshBasicMaterial({
      map: textura,
      transparent: true,
      alphaTest: 0.025,
      depthWrite: false,
      depthTest: true,
      polygonOffset: true,
      polygonOffsetFactor: -4,
      polygonOffsetUnits: -4,
      side: THREE.DoubleSide,
      toneMapped: false,
    });
    const capa = new THREE.Mesh(geometria, material);
    capa.name = `${NOMBRE_CAPA_BORDADO}-${nombreLado}`;
    capa.userData.ftCapaBordado = true;
    capa.renderOrder = 200;
    prenda.add(capa);
  }
}

export function pintarPrenda(prenda, diseño, { usarCache = true, lado = null } = {}) {
  const tela = telaDe(prenda);
  if (!tela?.material) return null;

  const completo = normalizarDiseño(diseño);
  prenda.userData.ftDiseñoActual = completo;
  if (prenda.userData?.garmentModel && completo.color) {
    prenda.userData.garmentModel.color = completo.color;
  }

  tela.userData.colorOriginal ??= tela.material.color.getHex();

  // Misma pinta => misma textura. Se compara el diseño entero, imagen incluida.
  const clave = JSON.stringify({ color: completo.color });
  const cacheada = usarCache ? cacheDeTexturas.get(clave) : null;
  if (cacheada) {
    tela.userData.texturaTemporal?.dispose?.();
    delete tela.userData.texturaTemporal;
    tela.material.map = cacheada.textura;
    tela.material.color.set(0xffffff);
    tela.material.needsUpdate = true;
    tela.userData.lienzoPrenda = cacheada.lienzo;
    aplicarCapasBordado(prenda, tela, completo);
    return cacheada.lienzo;
  }

  const lienzo = document.createElement('canvas');
  lienzo.width = lienzo.height = lado ?? LADO_SIN_IMAGEN;
  tela.userData.lienzoPrenda = lienzo;
  const ctx = lienzo.getContext('2d');
  // Sin esto el logo sale con escalones al achicarlo.
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  const LADO_ACTUAL = lienzo.width;

  // Fondo: el color de la tela. Se pinta el lienzo ENTERO, no solo la zona del
  // dibujo — el mapa cubre toda la prenda y cualquier hueco saldria negro.
  const color = completo.color ?? `#${tela.userData.colorOriginal.toString(16).padStart(6, '0')}`;
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, LADO_ACTUAL, LADO_ACTUAL);

  const textura = new THREE.CanvasTexture(lienzo);
  textura.colorSpace = THREE.SRGBColorSpace;
  textura.anisotropy = 16;
  tela.material.map = textura;
  if (usarCache) {
    tela.userData.texturaTemporal?.dispose?.();
    delete tela.userData.texturaTemporal;
    cacheDeTexturas.set(clave, { textura, lienzo });
    while (cacheDeTexturas.size > 12) cacheDeTexturas.delete(cacheDeTexturas.keys().next().value);
  } else {
    const anterior = tela.userData.texturaTemporal;
    tela.userData.texturaTemporal = textura;
    if (anterior && anterior !== textura) anterior.dispose();
  }
  tela.material.color.set(0xffffff);
  tela.material.needsUpdate = true;

  aplicarCapasBordado(prenda, tela, completo);
  return lienzo;
}

/** Repinta las prendas GLB de una escena con lo que Kusher tenga guardado. */
export function applySavedGlbGarmentDesigns(scene) {
  const todos = leerGuardado();
  let pintadas = 0;
  scene?.traverse?.((o) => {
    if (!esPrendaGlb(o)) return;
    const id = garmentDesignId(o);
    if (!todos[id] && !todos[o.name] && !originShirtDesign(id) && !o.userData.garmentDesignFromLayout) return;
    pintarPrenda(o, diseñoDe(o));
    pintadas++;
  });
  return pintadas;
}

// ---------------------------------------------------------------------------
// Panel
// ---------------------------------------------------------------------------
function inyectarCss() {
  if (document.getElementById(`${PANEL_ID}-css`)) return;
  const s = document.createElement('style');
  s.id = `${PANEL_ID}-css`;
  s.textContent = `
    #${PANEL_ID} {
      position: fixed; left: 14px; top: 14px; z-index: 98; display: none;
      width: min(320px, calc(100vw - 28px)); max-height: calc(100vh - 28px); overflow: auto;
      box-sizing: border-box; color: #ece7db; background: rgba(10,11,12,0.94);
      border: 1px solid rgba(231,185,76,0.6); padding: 12px 13px;
      font-family: "Courier New", monospace; font-size: 12px; line-height: 1.35;
      backdrop-filter: blur(10px);
    }
    #${PANEL_ID}.is-open { display: block; }
    #${PANEL_ID} * { box-sizing: border-box; }
    #${PANEL_ID} h3 { margin: 0 0 2px; color: #e7b94c; font-size: 13px; letter-spacing: 2px; }
    #${PANEL_ID} .gg-sub { color: rgba(236,231,219,0.6); font-size: 10px; margin-bottom: 10px; }
    #${PANEL_ID} .gg-label { margin: 9px 0 4px; font-size: 10px; letter-spacing: 1px;
      text-transform: uppercase; color: rgba(236,231,219,0.72); }
    #${PANEL_ID} button { min-height: 28px; padding: 5px 8px; font: inherit; cursor: pointer;
      color: #ece7db; background: rgba(255,255,255,0.07);
      border: 1px solid rgba(255,255,255,0.16); text-transform: uppercase; letter-spacing: 0.5px; }
    #${PANEL_ID} button:hover { border-color: #e7b94c; background: rgba(231,185,76,0.14); }
    #${PANEL_ID} input[type="range"] { width: 100%; }
    #${PANEL_ID} input[type="color"] { width: 100%; height: 30px; padding: 2px; cursor: pointer; }
    #${PANEL_ID} .gg-fila { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; }
    #${PANEL_ID} .gg-lados { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; margin: 8px 0; }
    #${PANEL_ID} .gg-lados button.is-activo { background: #e7b94c; color: #14170f;
      border-color: #e7b94c; font-weight: bold; }
    #${PANEL_ID} .gg-bordados { display: grid; grid-template-columns: repeat(3, 1fr); gap: 5px; }
    #${PANEL_ID} .gg-bordados button { padding: 4px; min-height: 68px; font-size: 8px; }
    #${PANEL_ID} .gg-bordados img { display: block; width: 100%; height: 42px; object-fit: contain;
      margin-bottom: 3px; background: #24262a; }
    #${PANEL_ID} .gg-prenda { width: 100%; aspect-ratio: 4 / 5; margin: 6px 0;
      border: 1px solid rgba(255,255,255,0.2); border-radius: 6px; background: #17191c;
      image-rendering: auto; display: block; cursor: crosshair; touch-action: none; }
    #${PANEL_ID} .gg-ayuda { margin: 4px 0 7px; text-align: center; font-size: 9px;
      color: rgba(236,231,219,0.62); }
    #${PANEL_ID} .gg-presets { display: grid; grid-template-columns: repeat(3, 1fr); gap: 5px; }
    #${PANEL_ID} .gg-presets button { font-size: 9px; padding: 5px 3px; }
    #${PANEL_ID} .gg-aviso { margin-top: 8px; font-size: 10px; color: rgba(236,231,219,0.62); min-height: 13px; }
    #${PANEL_ID} .gg-aviso.is-error { color: #ff8a6a; }
  `;
  document.head.appendChild(s);
}

let instancia = null;

export function createGarmentGlbEditor() {
  inyectarCss();
  const panel = document.createElement('div');
  panel.id = PANEL_ID;
  panel.innerHTML = `
    <h3>DISEÑAR PRENDA</h3>
    <div class="gg-sub" data-f="nombre">—</div>

    <div class="gg-label">Color de la tela</div>
    <input type="color" data-f="color" value="#ffffff">

    <div class="gg-lados">
      <button data-lado="frente" class="is-activo">FRENTE</button>
      <button data-lado="dorso">ESPALDA</button>
    </div>

    <canvas class="gg-prenda" data-f="prendaCanvas" width="560" height="700"></canvas>
    <div class="gg-ayuda">ARRASTRÁ EL BORDADO DIRECTAMENTE SOBRE LA PRENDA</div>
    <div class="gg-presets">
      <button data-preset="centro">CENTRO</button>
      <button data-preset="pecho">PECHO IZQ.</button>
      <button data-preset="grande">GRANDE</button>
    </div>

    <div class="gg-label">Diseño</div>
    <div class="gg-bordados">
      ${BORDADOS.map(({ archivo, nombre }) => `<button data-bordado="/assets/bordados/${archivo}" title="${nombre}"><img src="/assets/bordados/thumbs/${archivo}" alt="" loading="lazy" decoding="async"><span>${nombre}</span></button>`).join('')}
    </div>
    <div class="gg-fila">
      <button data-a="subir">Subir imagen</button>
      <button data-a="quitar">Quitar</button>
    </div>
    <div class="gg-fila" style="margin-top:6px">
      <button data-a="fondo" data-f="fondoBtn">Fondo: automático</button>
      <button data-a="relieve" data-f="relieveBtn">Bordado: sí</button>
    </div>

    <div class="gg-label">Tamaño <span data-f="tamTxt"></span></div>
    <input type="range" data-f="tam" min="0.08" max="0.95" step="0.01">
    <div class="gg-label">Girar <span data-f="rotTxt"></span></div>
    <input type="range" data-f="rot" min="-180" max="180" step="1">

    <div class="gg-fila" style="margin-top:8px">
      <button data-a="espejar">Dar vuelta</button>
      <button data-a="reset">Volver al centro</button>
    </div>

    <div class="gg-fila" style="margin-top:10px">
      <button data-a="guardar">Guardar</button>
      <button data-a="cerrar">Cerrar</button>
    </div>
    <div class="gg-aviso" data-f="aviso"></div>
    <input type="file" accept="image/*" data-f="archivo" hidden>
  `;
  document.body.appendChild(panel);
  const f = {};
  for (const el of panel.querySelectorAll('[data-f]')) f[el.dataset.f] = el;

  let prenda = null;
  let diseño = normalizarDiseño();
  let ladoActivo = 'frente';
  let timerPrevia = null;
  let arrastrando = false;
  const imagenesPrevia = new Map();
  // Como tratar el fondo de la proxima imagen que se suba.
  let modoFondo = 'auto';
  const TEXTO_FONDO = { auto: 'Fondo: automático', true: 'Fondo: quitar', false: 'Fondo: dejar' };

  const avisar = (t, error = false) => {
    f.aviso.textContent = t;
    f.aviso.classList.toggle('is-error', error);
  };

  const ladoActual = () => diseño?.[ladoActivo];
  const limitar = (valor, min, max) => Math.max(min, Math.min(max, valor));

  function dibujarSilueta() {
    const canvas = f.prendaCanvas;
    const ctx = canvas.getContext('2d');
    const w = canvas.width;
    const h = canvas.height;
    const hoodie = prenda?.userData?.garmentModel?.clave === 'hoodie';
    const lado = ladoActual();
    ctx.clearRect(0, 0, w, h);
    const fondo = ctx.createLinearGradient(0, 0, 0, h);
    fondo.addColorStop(0, '#292c31');
    fondo.addColorStop(1, '#111316');
    ctx.fillStyle = fondo;
    ctx.fillRect(0, 0, w, h);

    // Silueta grande y limpia. No agrega imágenes: se dibuja en memoria.
    ctx.beginPath();
    ctx.moveTo(205, 135);
    ctx.lineTo(135, 170);
    ctx.lineTo(55, 300);
    ctx.lineTo(125, 342);
    ctx.lineTo(150, 270);
    ctx.lineTo(145, 625);
    ctx.quadraticCurveTo(280, 655, 415, 625);
    ctx.lineTo(410, 270);
    ctx.lineTo(435, 342);
    ctx.lineTo(505, 300);
    ctx.lineTo(425, 170);
    ctx.lineTo(355, 135);
    ctx.quadraticCurveTo(280, 182, 205, 135);
    ctx.closePath();
    ctx.fillStyle = diseño.color ?? '#d7d7d7';
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.34)';
    ctx.lineWidth = 3;
    ctx.stroke();
    if (hoodie) {
      ctx.beginPath();
      ctx.moveTo(205, 143);
      ctx.quadraticCurveTo(205, 35, 280, 30);
      ctx.quadraticCurveTo(355, 35, 355, 143);
      ctx.quadraticCurveTo(280, 195, 205, 143);
      ctx.fillStyle = diseño.color ?? '#d7d7d7';
      ctx.fill();
      ctx.stroke();
    }

    ctx.fillStyle = 'rgba(255,255,255,0.48)';
    ctx.font = '700 18px Courier New, monospace';
    ctx.textAlign = 'center';
    ctx.fillText(ladoActivo === 'frente' ? 'FRENTE' : 'ESPALDA', w / 2, h - 22);

    if (!lado?.imagen) {
      ctx.fillStyle = 'rgba(255,255,255,0.52)';
      ctx.font = '15px Courier New, monospace';
      ctx.fillText('ELEGÍ UN BORDADO', w / 2, 390);
      return;
    }

    const area = { x: 150, y: 165, w: 260, h: 420 };
    const nx = limitar(lado.x ?? 0.5, 0, 1);
    const ny = limitar(lado.y ?? 0.30, 0, 1);
    const cx = area.x + nx * area.w;
    const cy = area.y + ny * area.h;
    const tamaño = limitar((lado.tamaño ?? 0.52) * area.w, 22, 310);
    let img = imagenesPrevia.get(lado.imagen);
    if (!img) {
      img = new Image();
      imagenesPrevia.set(lado.imagen, img);
      img.onload = dibujarSilueta;
      img.src = lado.imagen;
    }
    if (!img.complete || !img.naturalWidth) return;
    const proporcion = img.naturalWidth / Math.max(1, img.naturalHeight);
    const iw = proporcion >= 1 ? tamaño : tamaño * proporcion;
    const ih = proporcion >= 1 ? tamaño / proporcion : tamaño;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate((lado.rotacion ?? 0) * Math.PI / 180);
    if (lado.espejar) ctx.scale(-1, 1);
    ctx.drawImage(img, -iw / 2, -ih / 2, iw, ih);
    ctx.restore();
    ctx.strokeStyle = '#e7b94c';
    ctx.lineWidth = 2;
    ctx.strokeRect(cx - iw / 2 - 5, cy - ih / 2 - 5, iw + 10, ih + 10);
  }

  function refrescarPrevia() {
    clearTimeout(timerPrevia);
    dibujarSilueta();
    timerPrevia = window.setTimeout(() => {
      if (prenda) pintarPrenda(prenda, diseño, { usarCache: false, lado: 1024 });
    }, 70);
  }

  function pintarControles() {
    const lado = ladoActual();
    f.tam.value = lado.tamaño;
    f.rot.value = lado.rotacion ?? 0;
    f.tamTxt.textContent = `${Math.round(lado.tamaño * 100)}%`;
    f.rotTxt.textContent = `${Math.round(lado.rotacion ?? 0)}°`;
    if (diseño.color) f.color.value = diseño.color;
    f.fondoBtn.textContent = TEXTO_FONDO[String(modoFondo)] ?? TEXTO_FONDO.auto;
    f.relieveBtn.textContent = lado.relieve > 0 ? 'Bordado: sí' : 'Bordado: no';
    for (const boton of panel.querySelectorAll('[data-lado]')) {
      boton.classList.toggle('is-activo', boton.dataset.lado === ladoActivo);
    }
  }

  function cambio() {
    pintarControles();
    refrescarPrevia();
  }

  async function aplicarBordado(archivo) {
    avisar('Procesando la imagen…');
    const { url, recorte } = await leerImagen(archivo, { maxLado: 2048, quitarFondo: modoFondo });
    ladoActual().imagen = url;
    cambio();
    if (recorte.quitado) avisar('Bordado puesto (se le quitó el fondo).');
    else if (recorte.yaRecortada) avisar('Bordado puesto. El PNG ya venía sin fondo.');
    else avisar('Bordado puesto.');
  }

  f.rot.addEventListener('input', () => { ladoActual().rotacion = Number(f.rot.value); cambio(); });
  f.tam.addEventListener('input', () => {
    ladoActual().tamaño = Number(f.tam.value);
    cambio();
  });
  f.color.addEventListener('input', () => { diseño.color = f.color.value; cambio(); });

  for (const boton of panel.querySelectorAll('[data-lado]')) {
    boton.addEventListener('click', () => {
      ladoActivo = boton.dataset.lado;
      cambio();
      avisar(ladoActivo === 'dorso' ? 'Editando la espalda.' : 'Editando el frente.');
    });
  }

  for (const boton of panel.querySelectorAll('[data-preset]')) {
    boton.addEventListener('click', () => {
      const lado = ladoActual();
      const preset = boton.dataset.preset;
      lado.x = preset === 'pecho' ? 0.28 : 0.50;
      lado.y = preset === 'grande' ? 0.44 : 0.30;
      if (preset === 'pecho') lado.tamaño = 0.25;
      if (preset === 'centro') lado.tamaño = 0.52;
      if (preset === 'grande') lado.tamaño = 0.90;
      cambio();
    });
  }

  function moverDesdePuntero(ev) {
    const lado = ladoActual();
    if (!lado?.imagen) { avisar('Primero elegí un bordado.', true); return; }
    const rect = f.prendaCanvas.getBoundingClientRect();
    // Misma zona visual usada por dibujarSilueta, llevada de 560x700 a CSS.
    const nx = limitar(((ev.clientX - rect.left) / rect.width - 150 / 560) / (260 / 560), 0, 1);
    const ny = limitar(((ev.clientY - rect.top) / rect.height - 165 / 700) / (420 / 700), 0, 1);
    lado.x = nx;
    lado.y = ny;
    cambio();
  }

  f.prendaCanvas.addEventListener('pointerdown', (ev) => {
    arrastrando = true;
    f.prendaCanvas.setPointerCapture(ev.pointerId);
    moverDesdePuntero(ev);
  });
  f.prendaCanvas.addEventListener('pointermove', (ev) => {
    if (arrastrando) moverDesdePuntero(ev);
  });
  const terminarArrastre = () => { arrastrando = false; };
  f.prendaCanvas.addEventListener('pointerup', terminarArrastre);
  f.prendaCanvas.addEventListener('pointercancel', terminarArrastre);

  panel.addEventListener('click', async (ev) => {
    const bordado = ev.target?.closest?.('[data-bordado]');
    if (bordado) {
      ev.stopPropagation();
      try {
        const respuesta = await fetch(bordado.dataset.bordado);
        if (!respuesta.ok) throw new Error(`archivo ${respuesta.status}`);
        const blob = await respuesta.blob();
        await aplicarBordado(new File([blob], bordado.dataset.bordado.split('/').pop(), { type: blob.type || 'image/png' }));
      } catch (error) {
        avisar(`No se pudo cargar: ${error.message}`, true);
      }
      return;
    }
    const accion = ev.target?.dataset?.a;
    if (!accion) return;
    ev.stopPropagation();
    if (accion === 'subir') f.archivo.click();
    else if (accion === 'quitar') { ladoActual().imagen = null; cambio(); avisar('Diseño quitado de este lado.'); }
    else if (accion === 'espejar') { ladoActual().espejar = !ladoActual().espejar; cambio(); }
    else if (accion === 'relieve') {
      ladoActual().relieve = ladoActual().relieve > 0 ? 0 : 0.5;
      cambio();
      avisar(ladoActual().relieve ? 'Con relieve de bordado.' : 'Plano, sin relieve.');
    } else if (accion === 'fondo') {
      // auto -> forzar quitado -> no tocar -> auto
      modoFondo = modoFondo === 'auto' ? true : (modoFondo === true ? false : 'auto');
      pintarControles();
      avisar('Volvé a subir la imagen para aplicar el cambio.');
    }
    else if (accion === 'reset') {
      diseño[ladoActivo] = ladoBase(ladoActivo);
      cambio();
    } else if (accion === 'guardar') {
      const todos = leerGuardado();
      todos[garmentDesignId(prenda)] = structuredClone(diseño);
      pintarPrenda(prenda, diseño);
      // El layout exportado toma ftDiseñoActual; avisar al editor general hace
      // que el cambio no quede aislado en este panel.
      window.dispatchEvent(new CustomEvent('fourtwenty:world-edited'));
      avisar('Guardando de forma segura…');
      guardar(todos).then(ok => avisar(ok ? 'Guardado en esta computadora.' : 'No se pudo completar el guardado. El diseño sigue visible; descargá una copia antes de cerrar.', !ok));
    } else if (accion === 'cerrar') cerrar();
  });

  f.archivo.addEventListener('change', async () => {
    const archivo = f.archivo.files?.[0];
    if (!archivo) return;
    try {
      await aplicarBordado(archivo);
    } catch (error) {
      avisar(`No se pudo cargar: ${error.message}`, true);
    }
    f.archivo.value = '';
  });

  function abrir(objetivo) {
    prenda = objetivo;
    diseño = diseñoDe(objetivo);
    ladoActivo = 'frente';
    panel.dataset.garmentDesignId = garmentDesignId(objetivo);
    f.nombre.textContent = objetivo.name ?? 'prenda';
    panel.classList.add('is-open');
    cambio();
    avisar('Elegí un bordado y arrastralo sobre la prenda.');
  }

  function cerrar() {
    clearTimeout(timerPrevia);
    panel.classList.remove('is-open');
    delete panel.dataset.garmentDesignId;
    prenda = null;
  }

  return { abrir, cerrar, estaAbierto: () => panel.classList.contains('is-open') };
}

export function getGarmentGlbEditor() {
  if (!instancia) instancia = createGarmentGlbEditor();
  return instancia;
}
