// EDITOR DE PRENDAS GLB — el "mini photoshop" sobre la remera modelada a mano.
//
// POR QUE ES OTRO ARCHIVO Y NO EL DE SIEMPRE
// El editor viejo (`garmentEditor.js`) trabaja sobre las prendas PARAMETRICAS:
// puede cambiarles el CUERPO (tee/hoodie/pantalon) porque la forma la genera una
// formula, y arma la estampa como un parche 3D calculado con
// `garmentSurfacePoint`. Nada de eso existe en un GLB: la forma es la que modelo
// Fer y no hay funcion de superficie que recorrer.
//
// Pero el GLB trae algo mejor: un mapa UV bien hecho, con el frente y el dorso
// en zonas SEPARADAS (medido el 10/08: frente ~U 0.24-0.33, dorso ~U 0.65-0.76).
// Entonces la estampa no se calcula en 3D: se PINTA en un lienzo plano que
// despues se usa como textura de la tela. Eso es literalmente lo que pidio
// Kusher — "poder armar las prendas yo con los diseños".
//
// La ventaja practica: el diseño se puede mover a cualquier lado de la prenda,
// no solo al pecho, y se ve al instante.

import * as THREE from 'three';
import { leerImagen } from './estampaImagen.js';

const CLAVE = 'ft-prendas-glb-v1';
// ⚠️ 2048 y no 1024. El logo ocupa una fraccion chica del mapa —en el pecho,
// como un 16% del ancho— asi que a 1024 le tocaban ~160 pixeles y se veia
// pastoso, nada parecido a un bordado. A 2048 son ~330 y se lee la trama.
// El costo se controla con el cache de abajo: dos prendas con el MISMO diseño
// comparten una sola textura, asi que 20 remeras con 4 diseños son 4 texturas.
const LADO = 2048;
const LADO_SIN_IMAGEN = 512;   // color plano: no hace falta resolucion

// Texturas ya pintadas, por diseño. Sin esto cada prenda colgada se llevaba su
// propia textura de 2048: veinte prendas eran 320 MB de memoria de video.
const cacheDeTexturas = new Map();
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
  u: 0.285,
  v: 0.835,           // centro vertical
  ancho: 0.16,
  alto: 0.16,
  rotacion: 0,        // grados
  espejar: false,
  // Relieve del bordado. Un logo pegado plano se lee como calcomania; un
  // bordado real tiene un borde con sombra porque el hilo levanta sobre la
  // tela. Se dibuja una copia oscura corrida un pelo abajo y a la derecha,
  // debajo del logo. 0 lo apaga.
  relieve: 0.5,
});

const ladoBase = (lado) => ({
  ...LADO_BASE,
  // Frente y espalda ocupan sectores distintos del UV. Estos centros salen
  // de medir los GLB reales, no de adivinar con sliders sobre el mapa entero.
  u: lado === 'dorso' ? 0.70 : 0.285,
});

export const DISEÑO_BASE = Object.freeze({
  color: null,        // null = el color con el que vino el GLB
  frente: Object.freeze(ladoBase('frente')),
  dorso: Object.freeze(ladoBase('dorso')),
});

// Compatibilidad con todo lo ya guardado: hasta esta mejora el diseño era un
// solo objeto plano. Al abrirlo pasa al FRENTE y la espalda nace vacía.
function normalizarDiseño(raw = {}) {
  if (raw.frente || raw.dorso) {
    return {
      color: raw.color ?? null,
      frente: { ...ladoBase('frente'), ...(raw.frente ?? {}) },
      dorso: { ...ladoBase('dorso'), ...(raw.dorso ?? {}) },
    };
  }
  const { color = null, ...ladoAnterior } = raw;
  return {
    color,
    frente: { ...ladoBase('frente'), ...ladoAnterior },
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
// Guardado (por NOMBRE de la prenda, igual que los cuadros: el id del editor
// puede correrse si cambia el orden de creacion, el nombre no)
// ---------------------------------------------------------------------------
function leerGuardado() {
  try { return JSON.parse(localStorage.getItem(CLAVE)) ?? {}; } catch { return {}; }
}

function guardar(todos) {
  try { localStorage.setItem(CLAVE, JSON.stringify(todos)); return true; }
  catch { return false; }
}

export function diseñoDe(prenda) {
  const guardado = leerGuardado()[prenda?.name];
  return normalizarDiseño(guardado ?? { color: prenda?.userData?.garmentModel?.color ?? null });
}

// ---------------------------------------------------------------------------
// El lienzo: aca esta todo el trabajo real
// ---------------------------------------------------------------------------
export function pintarPrenda(prenda, diseño, { usarCache = true, lado = null } = {}) {
  const tela = telaDe(prenda);
  if (!tela?.material) return null;

  const completo = normalizarDiseño(diseño);
  if (prenda.userData?.garmentModel && completo.color) {
    prenda.userData.garmentModel.color = completo.color;
  }

  tela.userData.colorOriginal ??= tela.material.color.getHex();

  // Misma pinta => misma textura. Se compara el diseño entero, imagen incluida.
  const clave = JSON.stringify(completo);
  const cacheada = usarCache ? cacheDeTexturas.get(clave) : null;
  if (cacheada) {
    tela.userData.texturaTemporal?.dispose?.();
    delete tela.userData.texturaTemporal;
    tela.material.map = cacheada.textura;
    tela.material.color.set(0xffffff);
    tela.material.needsUpdate = true;
    tela.userData.lienzoPrenda = cacheada.lienzo;
    return cacheada.lienzo;
  }

  const lienzo = document.createElement('canvas');
  const tieneImagen = Boolean(completo.frente.imagen || completo.dorso.imagen);
  lienzo.width = lienzo.height = lado ?? (tieneImagen ? LADO : LADO_SIN_IMAGEN);
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

  const dibujarLado = (config) => {
    if (!config.imagen) return;
    const img = new Image();
    img.onload = () => {
    // La proporcion del archivo manda: estirar un logo para llenar un cuadrado
    // lo deforma. Se encaja dentro de la caja pedida sin deformarlo.
    const caja = config.ancho * LADO_ACTUAL;
    const proporcion = img.width / Math.max(1, img.height);
    const w = proporcion >= 1 ? caja : caja * proporcion;
    const h = proporcion >= 1 ? caja / proporcion : caja;
    // El eje V del mapa va al reves que el Y del lienzo.
    const cx = config.u * LADO_ACTUAL;
    const cy = (1 - config.v) * LADO_ACTUAL;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate((config.rotacion ?? 0) * Math.PI / 180);
    if (config.espejar) ctx.scale(-1, 1);

    // RELIEVE: una copia oscura apenas corrida, debajo del logo. Es lo que hace
    // que se lea como hilo levantado sobre la tela y no como una calcomania.
    const relieve = config.relieve ?? 0;
    if (relieve > 0) {
      const corrimiento = Math.max(1, (relieve * LADO_ACTUAL) / 380);
      ctx.globalAlpha = 0.42 * relieve;
      ctx.filter = 'brightness(0.18)';
      ctx.drawImage(img, -w / 2 + corrimiento, -h / 2 + corrimiento, w, h);
      ctx.filter = 'none';
      ctx.globalAlpha = 1;
    }
    ctx.drawImage(img, -w / 2, -h / 2, w, h);
    ctx.restore();
      textura.needsUpdate = true;
    };
    img.src = config.imagen;
  };

  dibujarLado(completo.frente);
  dibujarLado(completo.dorso);
  return lienzo;
}

/** Repinta las prendas GLB de una escena con lo que Kusher tenga guardado. */
export function applySavedGlbGarmentDesigns(scene) {
  const todos = leerGuardado();
  if (!Object.keys(todos).length) return 0;
  let pintadas = 0;
  scene?.traverse?.((o) => {
    if (!esPrendaGlb(o) || !todos[o.name]) return;
    pintarPrenda(o, normalizarDiseño(todos[o.name]));
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
    <input type="range" data-f="tam" min="0.02" max="0.6" step="0.005">
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
  const ZONAS = {
    frente: { minU: 0.16, maxU: 0.41, minV: 0.58, maxV: 0.96 },
    dorso: { minU: 0.57, maxU: 0.83, minV: 0.58, maxV: 0.96 },
  };
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

    const zona = ZONAS[ladoActivo];
    const area = { x: 150, y: 165, w: 260, h: 420 };
    const nx = limitar((lado.u - zona.minU) / (zona.maxU - zona.minU), 0, 1);
    const ny = limitar((zona.maxV - lado.v) / (zona.maxV - zona.minV), 0, 1);
    const cx = area.x + nx * area.w;
    const cy = area.y + ny * area.h;
    const tamaño = limitar((lado.ancho / (zona.maxU - zona.minU)) * area.w, 22, 310);
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
    f.tam.value = lado.ancho;
    f.rot.value = lado.rotacion ?? 0;
    f.tamTxt.textContent = `${Math.round(lado.ancho * 100)}%`;
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
    // Ancho y alto van juntos: separarlos deforma el logo y nadie quiere eso.
    ladoActual().ancho = ladoActual().alto = Number(f.tam.value);
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
      const zona = ZONAS[ladoActivo];
      const preset = boton.dataset.preset;
      const nx = preset === 'pecho' ? 0.30 : 0.50;
      const ny = preset === 'grande' ? 0.48 : 0.32;
      lado.u = zona.minU + nx * (zona.maxU - zona.minU);
      lado.v = zona.maxV - ny * (zona.maxV - zona.minV);
      if (preset === 'grande') lado.ancho = lado.alto = 0.22;
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
    const zona = ZONAS[ladoActivo];
    lado.u = zona.minU + nx * (zona.maxU - zona.minU);
    lado.v = zona.maxV - ny * (zona.maxV - zona.minV);
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
      todos[prenda.name] = diseño;
      const ok = guardar(todos);
      pintarPrenda(prenda, diseño);
      avisar(ok ? 'Guardado en esta computadora.' : 'No entró: liberá espacio.', !ok);
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
    f.nombre.textContent = objetivo.name ?? 'prenda';
    panel.classList.add('is-open');
    cambio();
    avisar('Elegí un bordado y arrastralo sobre la prenda.');
  }

  function cerrar() {
    clearTimeout(timerPrevia);
    panel.classList.remove('is-open');
    prenda = null;
  }

  return { abrir, cerrar, estaAbierto: () => panel.classList.contains('is-open') };
}

export function getGarmentGlbEditor() {
  if (!instancia) instancia = createGarmentGlbEditor();
  return instancia;
}
