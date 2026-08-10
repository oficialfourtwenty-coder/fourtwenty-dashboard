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
const LADO = 1024;
const PANEL_ID = 'ft-garment-glb-editor';

// Arranca sobre el pecho del frente. Sale de medir en que UV caen los vertices
// del pecho-frente del GLB; es un punto de partida, no una jaula: se mueve.
export const DISEÑO_BASE = Object.freeze({
  color: null,        // null = el color con el que vino el GLB
  imagen: null,
  u: 0.285,           // centro horizontal en el mapa (0 a 1)
  v: 0.835,           // centro vertical
  ancho: 0.16,
  alto: 0.16,
  rotacion: 0,        // grados
  espejar: false,
});

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
  return { ...DISEÑO_BASE, ...(leerGuardado()[prenda?.name] ?? {}) };
}

// ---------------------------------------------------------------------------
// El lienzo: aca esta todo el trabajo real
// ---------------------------------------------------------------------------
export function pintarPrenda(prenda, diseño) {
  const tela = telaDe(prenda);
  if (!tela?.material) return null;

  const lienzo = tela.userData.lienzoPrenda ?? document.createElement('canvas');
  lienzo.width = lienzo.height = LADO;
  tela.userData.lienzoPrenda = lienzo;
  const ctx = lienzo.getContext('2d');

  // Fondo: el color de la tela. Se pinta el lienzo ENTERO, no solo la zona del
  // dibujo — el mapa cubre toda la prenda y cualquier hueco saldria negro.
  const color = diseño.color ?? `#${(tela.userData.colorOriginal ?? tela.material.color.getHex()).toString(16).padStart(6, '0')}`;
  tela.userData.colorOriginal ??= tela.material.color.getHex();
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, LADO, LADO);

  const dibujar = () => {
    tela.material.map = tela.userData.texturaPrenda ?? new THREE.CanvasTexture(lienzo);
    tela.userData.texturaPrenda = tela.material.map;
    tela.material.map.colorSpace = THREE.SRGBColorSpace;
    tela.material.map.anisotropy = 8;
    // ⚠️ El color del material se lleva a BLANCO: si queda tenido, multiplica
    // la textura y el diseño sale con ese tinte encima.
    tela.material.color.set(0xffffff);
    tela.material.map.needsUpdate = true;
    tela.material.needsUpdate = true;
  };

  if (!diseño.imagen) { dibujar(); return lienzo; }

  const img = new Image();
  img.onload = () => {
    const w = diseño.ancho * LADO;
    const h = diseño.alto * LADO;
    // El eje V del mapa va al reves que el Y del lienzo.
    const cx = diseño.u * LADO;
    const cy = (1 - diseño.v) * LADO;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate((diseño.rotacion ?? 0) * Math.PI / 180);
    if (diseño.espejar) ctx.scale(-1, 1);
    ctx.drawImage(img, -w / 2, -h / 2, w, h);
    ctx.restore();
    dibujar();
  };
  img.onerror = () => dibujar();
  img.src = diseño.imagen;
  return lienzo;
}

/** Repinta las prendas GLB de una escena con lo que Kusher tenga guardado. */
export function applySavedGlbGarmentDesigns(scene) {
  const todos = leerGuardado();
  if (!Object.keys(todos).length) return 0;
  let pintadas = 0;
  scene?.traverse?.((o) => {
    if (!esPrendaGlb(o) || !todos[o.name]) return;
    pintarPrenda(o, { ...DISEÑO_BASE, ...todos[o.name] });
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
    /* La PREVIA del mapa plano: es lo que convierte esto en un photoshop.
       Sin verlo, mover el diseño es adivinar. */
    #${PANEL_ID} .gg-previa { width: 100%; aspect-ratio: 1; margin-top: 6px;
      border: 1px solid rgba(255,255,255,0.16); background: #15161a;
      image-rendering: auto; display: block; }
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

    <div class="gg-label">Diseño</div>
    <div class="gg-fila">
      <button data-a="subir">Subir imagen</button>
      <button data-a="quitar">Quitar</button>
    </div>

    <div class="gg-label">Mover a lo ancho <span data-f="uTxt"></span></div>
    <input type="range" data-f="u" min="0" max="1" step="0.005">
    <div class="gg-label">Mover a lo alto <span data-f="vTxt"></span></div>
    <input type="range" data-f="v" min="0" max="1" step="0.005">
    <div class="gg-label">Tamaño <span data-f="tamTxt"></span></div>
    <input type="range" data-f="tam" min="0.02" max="0.6" step="0.005">
    <div class="gg-label">Girar <span data-f="rotTxt"></span></div>
    <input type="range" data-f="rot" min="-180" max="180" step="1">

    <div class="gg-fila" style="margin-top:8px">
      <button data-a="espejar">Dar vuelta</button>
      <button data-a="reset">Volver al centro</button>
    </div>

    <div class="gg-label">Como queda el mapa</div>
    <canvas class="gg-previa" data-f="previa" width="256" height="256"></canvas>

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
  let diseño = { ...DISEÑO_BASE };

  const avisar = (t, error = false) => {
    f.aviso.textContent = t;
    f.aviso.classList.toggle('is-error', error);
  };

  function refrescarPrevia() {
    const lienzo = prenda && pintarPrenda(prenda, diseño);
    // El repintado del lienzo grande puede tardar un frame si hay imagen: se
    // copia despues para que la previa no salga en blanco.
    requestAnimationFrame(() => {
      if (!lienzo) return;
      const ctx = f.previa.getContext('2d');
      ctx.clearRect(0, 0, 256, 256);
      ctx.drawImage(lienzo, 0, 0, 256, 256);
    });
  }

  function pintarControles() {
    f.u.value = diseño.u;
    f.v.value = diseño.v;
    f.tam.value = diseño.ancho;
    f.rot.value = diseño.rotacion ?? 0;
    f.uTxt.textContent = `${Math.round(diseño.u * 100)}%`;
    f.vTxt.textContent = `${Math.round(diseño.v * 100)}%`;
    f.tamTxt.textContent = `${Math.round(diseño.ancho * 100)}%`;
    f.rotTxt.textContent = `${Math.round(diseño.rotacion ?? 0)}°`;
    if (diseño.color) f.color.value = diseño.color;
  }

  function cambio() {
    pintarControles();
    refrescarPrevia();
  }

  f.u.addEventListener('input', () => { diseño.u = Number(f.u.value); cambio(); });
  f.v.addEventListener('input', () => { diseño.v = Number(f.v.value); cambio(); });
  f.rot.addEventListener('input', () => { diseño.rotacion = Number(f.rot.value); cambio(); });
  f.tam.addEventListener('input', () => {
    // Ancho y alto van juntos: separarlos deforma el logo y nadie quiere eso.
    diseño.ancho = diseño.alto = Number(f.tam.value);
    cambio();
  });
  f.color.addEventListener('input', () => { diseño.color = f.color.value; cambio(); });

  panel.addEventListener('click', async (ev) => {
    const accion = ev.target?.dataset?.a;
    if (!accion) return;
    ev.stopPropagation();
    if (accion === 'subir') f.archivo.click();
    else if (accion === 'quitar') { diseño.imagen = null; cambio(); avisar('Diseño quitado.'); }
    else if (accion === 'espejar') { diseño.espejar = !diseño.espejar; cambio(); }
    else if (accion === 'reset') {
      diseño = { ...diseño, u: DISEÑO_BASE.u, v: DISEÑO_BASE.v, ancho: DISEÑO_BASE.ancho, alto: DISEÑO_BASE.alto, rotacion: 0 };
      cambio();
    } else if (accion === 'guardar') {
      const todos = leerGuardado();
      todos[prenda.name] = diseño;
      const ok = guardar(todos);
      avisar(ok ? 'Guardado en esta computadora.' : 'No entró: liberá espacio.', !ok);
    } else if (accion === 'cerrar') cerrar();
  });

  f.archivo.addEventListener('change', async () => {
    const archivo = f.archivo.files?.[0];
    if (!archivo) return;
    avisar('Procesando la imagen…');
    try {
      // Mismo procesado que las estampas: le saca el fondo plano y le recorta el
      // margen vacio, asi un logo con fondo blanco no tapa media remera.
      const { url, recorte } = await leerImagen(archivo, { maxLado: 1024 });
      diseño.imagen = url;
      cambio();
      avisar(recorte.quitado ? 'Imagen puesta (se le quitó el fondo).' : 'Imagen puesta.');
    } catch (error) {
      avisar(`No se pudo cargar: ${error.message}`, true);
    }
    f.archivo.value = '';
  });

  function abrir(objetivo) {
    prenda = objetivo;
    diseño = diseñoDe(objetivo);
    f.nombre.textContent = objetivo.name ?? 'prenda';
    panel.classList.add('is-open');
    cambio();
    avisar('Subí tu diseño y movelo hasta donde lo quieras.');
  }

  function cerrar() {
    panel.classList.remove('is-open');
    prenda = null;
  }

  return { abrir, cerrar, estaAbierto: () => panel.classList.contains('is-open') };
}

export function getGarmentGlbEditor() {
  if (!instancia) instancia = createGarmentGlbEditor();
  return instancia;
}
