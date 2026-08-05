// Editor de cuadros: un mini editor grafico para los cuadros de cada piso.
//
// QUE RESUELVE
// Hasta ahora un cuadro solo se podia cambiar dejando un archivo en
// `src/assets/artworks/pisos/<piso>/` y recompilando. Servia para poner una
// foto, pero no para escribir un texto, elegir tipografia o combinar foto +
// texto + logo — que es lo que hace falta para ambientar cada piso.
//
// COMO FUNCIONA
// El cuadro no muestra un archivo: muestra un <canvas> que se dibuja aca. El
// canvas se compone por capas (fondo -> foto -> logo -> textos) y se vuelca a
// una CanvasTexture que reemplaza el `map` de la cara del cuadro. Cambiar un
// campo redibuja el canvas y se ve al instante dentro del juego.
//
// El diseño se guarda en localStorage y se puede exportar a JSON para que
// entre al repositorio, igual que el layout del editor de mundo.

import * as THREE from 'three';

const STORAGE_KEY = 'ft-cuadros-v1';
const PANEL_ID = 'ft-frame-editor';

// Los diseños se guardan por NOMBRE del cuadro, no por id del editor. El
// nombre ("ORIGEN PS3 · cuadro reemplazable 1") lo pone el constructor del
// piso y es siempre el mismo; el id del editor se genera al registrar la
// escena y puede correrse si cambia el orden de creacion. Con el nombre, un
// diseño guardado hoy sigue apareciendo en su cuadro dentro de un mes.
const RE_CUADRO = /cuadro reemplazable \d+$/;

export function esCuadro(objeto) {
  return RE_CUADRO.test(objeto?.name ?? '');
}

// La cara del cuadro es el unico hijo con PlaneGeometry: el resto son el marco
// y los perfiles de bronce.
function caraDelCuadro(grupo) {
  let cara = null;
  grupo?.traverse?.((o) => {
    if (!cara && o.isMesh && o.geometry?.type === 'PlaneGeometry') cara = o;
  });
  return cara;
}

function volcarCanvas(grupo, canvas) {
  const cara = caraDelCuadro(grupo);
  if (!cara) return false;
  const anterior = cara.material.map;
  const textura = new THREE.CanvasTexture(canvas);
  textura.colorSpace = THREE.SRGBColorSpace;
  textura.anisotropy = 4;
  cara.material.map = textura;
  cara.material.needsUpdate = true;
  // la textura anterior queda sin uso: si no se libera, cada cambio de diseño
  // deja una textura huerfana en memoria de video
  if (anterior && anterior !== textura) anterior.dispose?.();
  return true;
}

// El plano del cuadro mide 1.02 x 1.36, o sea 3:4. El canvas respeta esa
// proporcion para que nada se estire.
const ANCHO = 768;
const ALTO = 1024;

// Solo tipografias que existen en cualquier maquina: el simulador no puede
// bajar fuentes de afuera (romperia el presupuesto de carga y no hay red
// garantizada).
const TIPOGRAFIAS = [
  { id: 'impact', label: 'Impact (titulos)', css: "Impact, 'Arial Black', sans-serif" },
  { id: 'mono', label: 'Monoespaciada', css: "'Courier New', monospace" },
  { id: 'sans', label: 'Sans gruesa', css: "'Arial Black', Arial, sans-serif" },
  { id: 'serif', label: 'Serif', css: "Georgia, 'Times New Roman', serif" },
];

const LOGOS = [
  { id: 'ninguno', label: 'Sin logo' },
  { id: 'ft', label: 'FT' },
  { id: 'fourtwenty', label: 'FOURTWENTY' },
  { id: 'hoja', label: 'Hoja' },
];

function diseñoPorDefecto() {
  return {
    fondo: '#11140f',
    foto: null,        // dataURL
    fotoZoom: 1,
    fotoX: 0,          // -1..1, desplazamiento relativo
    fotoY: 0,
    logo: 'ft',
    logoColor: '#e7b94c',
    titulo: 'ORIGEN',
    tituloFuente: 'impact',
    tituloTam: 120,
    tituloColor: '#f3efe4',
    subtitulo: 'DESDE ABAJO · 1992',
    subtituloFuente: 'mono',
    subtituloTam: 30,
    subtituloColor: '#e7b94c',
    alineacion: 'center',
    posicionTexto: 0.72,  // 0 arriba, 1 abajo
  };
}

function leerGuardado() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}') ?? {};
  } catch {
    return {};
  }
}

function guardar(todos) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(todos));
    return true;
  } catch {
    // localStorage lleno: casi siempre por fotos pesadas
    return false;
  }
}

function fuenteCss(id) {
  return (TIPOGRAFIAS.find((f) => f.id === id) ?? TIPOGRAFIAS[0]).css;
}

// ---------------------------------------------------------------------------
// Dibujo del cuadro
// ---------------------------------------------------------------------------

function dibujarLogo(ctx, tipo, color, cx, cy, escala) {
  if (tipo === 'ninguno') return;
  ctx.save();
  ctx.fillStyle = color;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  if (tipo === 'ft') {
    ctx.font = `bold ${110 * escala}px Impact, sans-serif`;
    ctx.fillText('FT', cx, cy);
  } else if (tipo === 'fourtwenty') {
    ctx.font = `bold ${34 * escala}px 'Courier New', monospace`;
    ctx.fillText('FOURTWENTY', cx, cy);
  } else if (tipo === 'hoja') {
    // hoja simple de 7 puntas, dibujada a mano
    ctx.translate(cx, cy);
    ctx.scale(escala, escala);
    ctx.beginPath();
    for (let i = -3; i <= 3; i++) {
      const angulo = (i / 3) * 1.15 - Math.PI / 2;
      const largo = 62 - Math.abs(i) * 11;
      ctx.moveTo(0, 18);
      ctx.quadraticCurveTo(
        Math.cos(angulo) * largo * 0.5, Math.sin(angulo) * largo * 0.5 + 10,
        Math.cos(angulo) * largo, Math.sin(angulo) * largo,
      );
      ctx.quadraticCurveTo(
        Math.cos(angulo) * largo * 0.35, Math.sin(angulo) * largo * 0.5 + 16,
        0, 18,
      );
    }
    ctx.fill();
  }
  ctx.restore();
}

function dibujarCuadro(ctx, diseño, imagenFoto) {
  ctx.clearRect(0, 0, ANCHO, ALTO);
  ctx.fillStyle = diseño.fondo;
  ctx.fillRect(0, 0, ANCHO, ALTO);

  // foto de fondo, recortada tipo "cover" y con zoom/desplazamiento propios
  if (imagenFoto) {
    const escalaBase = Math.max(ANCHO / imagenFoto.width, ALTO / imagenFoto.height);
    const escala = escalaBase * diseño.fotoZoom;
    const w = imagenFoto.width * escala;
    const h = imagenFoto.height * escala;
    const x = (ANCHO - w) / 2 + diseño.fotoX * (w - ANCHO) / 2;
    const y = (ALTO - h) / 2 + diseño.fotoY * (h - ALTO) / 2;
    ctx.drawImage(imagenFoto, x, y, w, h);
    // velo oscuro abajo: sin esto el texto blanco se pierde sobre fotos claras
    const velo = ctx.createLinearGradient(0, ALTO * 0.42, 0, ALTO);
    velo.addColorStop(0, 'rgba(0,0,0,0)');
    velo.addColorStop(1, 'rgba(0,0,0,0.72)');
    ctx.fillStyle = velo;
    ctx.fillRect(0, ALTO * 0.42, ANCHO, ALTO * 0.58);
  }

  const cx = diseño.alineacion === 'left' ? ANCHO * 0.1
    : diseño.alineacion === 'right' ? ANCHO * 0.9 : ANCHO / 2;
  ctx.textAlign = diseño.alineacion;
  ctx.textBaseline = 'alphabetic';

  dibujarLogo(ctx, diseño.logo, diseño.logoColor, cx, ALTO * 0.22, 1);

  const baseY = ALTO * diseño.posicionTexto;
  if (diseño.titulo) {
    ctx.fillStyle = diseño.tituloColor;
    ctx.font = `bold ${diseño.tituloTam}px ${fuenteCss(diseño.tituloFuente)}`;
    ctx.fillText(diseño.titulo, cx, baseY);
  }
  if (diseño.subtitulo) {
    ctx.fillStyle = diseño.subtituloColor;
    ctx.font = `bold ${diseño.subtituloTam}px ${fuenteCss(diseño.subtituloFuente)}`;
    ctx.fillText(diseño.subtitulo, cx, baseY + diseño.tituloTam * 0.55);
  }
}

// Achica la foto antes de guardarla. Una foto de celular son 3-5 MB en base64
// y localStorage aguanta ~5 MB en total: sin esto, el segundo cuadro con foto
// ya no entra y el guardado falla en silencio.
function achicarFoto(file, maxLado = 1280) {
  return new Promise((resolve, reject) => {
    const lector = new FileReader();
    lector.onerror = () => reject(new Error('no se pudo leer el archivo'));
    lector.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('el archivo no es una imagen valida'));
      img.onload = () => {
        const escala = Math.min(1, maxLado / Math.max(img.width, img.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(img.width * escala);
        canvas.height = Math.round(img.height * escala);
        canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', 0.82));
      };
      img.src = lector.result;
    };
    lector.readAsDataURL(file);
  });
}

// ---------------------------------------------------------------------------
// Panel
// ---------------------------------------------------------------------------

const CSS = `
#${PANEL_ID} {
  /* a la izquierda: el panel del editor de mundo vive a la derecha y si los
     dos van del mismo lado este lo tapa entero */
  position: fixed; top: 12px; left: 12px; width: 310px; max-height: calc(100vh - 24px);
  overflow-y: auto; z-index: 130; display: none;
  background: rgba(10,12,10,0.94); border: 1px solid rgba(231,185,76,0.5);
  border-radius: 10px; padding: 12px; box-sizing: border-box;
  font-family: 'Courier New', monospace; color: #e9e4d6; font-size: 12px;
  box-shadow: 0 12px 40px rgba(0,0,0,0.6);
}
#${PANEL_ID}.is-open { display: block; }
#${PANEL_ID} h3 { margin: 0 0 2px; font-size: 13px; letter-spacing: 2px; color: #e7b94c; }
#${PANEL_ID} .ft-sub { margin: 0 0 10px; opacity: 0.6; font-size: 10px; }
#${PANEL_ID} label { display: block; margin: 9px 0 3px; opacity: 0.75; font-size: 10px; letter-spacing: 1px; }
#${PANEL_ID} input[type="text"], #${PANEL_ID} select {
  width: 100%; box-sizing: border-box; background: #1b1e19; color: #e9e4d6;
  border: 1px solid #3a3f36; border-radius: 4px; padding: 5px 6px; font: inherit;
}
#${PANEL_ID} input[type="range"] { width: 100%; }
#${PANEL_ID} input[type="color"] { width: 100%; height: 26px; border: 1px solid #3a3f36; background: #1b1e19; border-radius: 4px; }
#${PANEL_ID} .ft-fila { display: flex; gap: 6px; }
#${PANEL_ID} .ft-fila > * { flex: 1; }
#${PANEL_ID} button {
  background: #23271f; color: #e9e4d6; border: 1px solid #4a5142;
  border-radius: 4px; padding: 6px 8px; font: inherit; cursor: pointer;
}
#${PANEL_ID} button:hover { background: #30362a; }
#${PANEL_ID} button.ft-primario { background: #e7b94c; color: #14170f; border-color: #e7b94c; font-weight: bold; }
#${PANEL_ID} .ft-acciones { display: flex; gap: 6px; margin-top: 12px; flex-wrap: wrap; }
#${PANEL_ID} .ft-acciones button { flex: 1 1 46%; }
#${PANEL_ID} .ft-aviso { margin-top: 8px; font-size: 10px; line-height: 1.4; opacity: 0.75; }
#${PANEL_ID} .ft-aviso.ft-error { color: #ff9a7a; opacity: 1; }
#${PANEL_ID} hr { border: none; border-top: 1px solid #2c3128; margin: 12px 0 2px; }
`;

function inyectarCss() {
  if (document.getElementById(`${PANEL_ID}-css`)) return;
  const style = document.createElement('style');
  style.id = `${PANEL_ID}-css`;
  style.textContent = CSS;
  document.head.appendChild(style);
}

/**
 * Aplica a una escena todos los diseños guardados. Se llama despues de
 * construir un piso: sin esto, los cuadros vuelven al afiche provisional cada
 * vez que se entra de nuevo al piso.
 */
export async function applySavedFrameDesigns(scene) {
  const todos = leerGuardado();
  if (!Object.keys(todos).length) return 0;

  const cuadros = [];
  scene?.traverse?.((o) => { if (esCuadro(o)) cuadros.push(o); });

  let aplicados = 0;
  for (const cuadro of cuadros) {
    const guardadoDeEste = todos[cuadro.name];
    if (!guardadoDeEste) continue;
    const d = { ...diseñoPorDefecto(), ...guardadoDeEste };
    let img = null;
    if (d.foto) {
      img = await new Promise((res) => {
        const i = new Image();
        i.onload = () => res(i);
        i.onerror = () => res(null);
        i.src = d.foto;
      });
    }
    const c = document.createElement('canvas');
    c.width = ANCHO;
    c.height = ALTO;
    dibujarCuadro(c.getContext('2d'), d, img);
    if (volcarCanvas(cuadro, c)) aplicados++;
  }
  return aplicados;
}

/**
 * Editor de cuadros.
 *
 * @param {object} opciones
 * @param {Function} opciones.onAplicar  recibe (frameId, canvas) cada vez que
 *        el diseño cambia; el mundo se encarga de volcarlo a la textura.
 */
export function createFrameEditor({ onAplicar } = {}) {
  inyectarCss();

  const panel = document.createElement('div');
  panel.id = PANEL_ID;
  document.body.appendChild(panel);

  const canvas = document.createElement('canvas');
  canvas.width = ANCHO;
  canvas.height = ALTO;
  const ctx = canvas.getContext('2d');

  let todos = leerGuardado();
  let frameIdActual = null;
  let diseño = diseñoPorDefecto();
  let imagenFoto = null;

  const opcionesFuente = (sel) => TIPOGRAFIAS
    .map((f) => `<option value="${f.id}"${f.id === sel ? ' selected' : ''}>${f.label}</option>`).join('');
  const opcionesLogo = (sel) => LOGOS
    .map((l) => `<option value="${l.id}"${l.id === sel ? ' selected' : ''}>${l.label}</option>`).join('');

  function render() {
    panel.innerHTML = `
      <h3>EDITOR DE CUADRO</h3>
      <p class="ft-sub">${frameIdActual ?? ''}</p>

      <label>TITULO</label>
      <input type="text" data-campo="titulo" value="${(diseño.titulo ?? '').replace(/"/g, '&quot;')}">
      <div class="ft-fila">
        <div>
          <label>TIPOGRAFIA</label>
          <select data-campo="tituloFuente">${opcionesFuente(diseño.tituloFuente)}</select>
        </div>
        <div>
          <label>COLOR</label>
          <input type="color" data-campo="tituloColor" value="${diseño.tituloColor}">
        </div>
      </div>
      <label>TAMAÑO · ${diseño.tituloTam}px</label>
      <input type="range" min="30" max="220" step="2" data-campo="tituloTam" value="${diseño.tituloTam}">

      <hr>
      <label>SUBTITULO</label>
      <input type="text" data-campo="subtitulo" value="${(diseño.subtitulo ?? '').replace(/"/g, '&quot;')}">
      <div class="ft-fila">
        <div>
          <label>TIPOGRAFIA</label>
          <select data-campo="subtituloFuente">${opcionesFuente(diseño.subtituloFuente)}</select>
        </div>
        <div>
          <label>COLOR</label>
          <input type="color" data-campo="subtituloColor" value="${diseño.subtituloColor}">
        </div>
      </div>
      <label>TAMAÑO · ${diseño.subtituloTam}px</label>
      <input type="range" min="12" max="90" step="1" data-campo="subtituloTam" value="${diseño.subtituloTam}">

      <hr>
      <div class="ft-fila">
        <div>
          <label>ALINEACION</label>
          <select data-campo="alineacion">
            <option value="left"${diseño.alineacion === 'left' ? ' selected' : ''}>Izquierda</option>
            <option value="center"${diseño.alineacion === 'center' ? ' selected' : ''}>Centro</option>
            <option value="right"${diseño.alineacion === 'right' ? ' selected' : ''}>Derecha</option>
          </select>
        </div>
        <div>
          <label>LOGO</label>
          <select data-campo="logo">${opcionesLogo(diseño.logo)}</select>
        </div>
      </div>
      <label>ALTURA DEL TEXTO</label>
      <input type="range" min="0.2" max="0.95" step="0.01" data-campo="posicionTexto" value="${diseño.posicionTexto}">
      <div class="ft-fila">
        <div><label>COLOR LOGO</label><input type="color" data-campo="logoColor" value="${diseño.logoColor}"></div>
        <div><label>FONDO</label><input type="color" data-campo="fondo" value="${diseño.fondo}"></div>
      </div>

      <hr>
      <label>FOTO REAL</label>
      <input type="file" accept="image/*" data-accion="foto" style="width:100%;font-size:10px">
      <label>ZOOM · ${diseño.fotoZoom.toFixed(2)}x</label>
      <input type="range" min="1" max="3" step="0.02" data-campo="fotoZoom" value="${diseño.fotoZoom}">
      <div class="ft-fila">
        <div><label>MOVER ↔</label><input type="range" min="-1" max="1" step="0.02" data-campo="fotoX" value="${diseño.fotoX}"></div>
        <div><label>MOVER ↕</label><input type="range" min="-1" max="1" step="0.02" data-campo="fotoY" value="${diseño.fotoY}"></div>
      </div>

      <div class="ft-acciones">
        <button class="ft-primario" data-accion="guardar">GUARDAR</button>
        <button data-accion="quitar-foto">QUITAR FOTO</button>
        <button data-accion="exportar">EXPORTAR JSON</button>
        <button data-accion="reset">RESETEAR</button>
      </div>
      <p class="ft-aviso" data-campo="aviso">Se guarda en esta computadora. Para que lo vean los demas, exporta el JSON.</p>
    `;
  }

  function avisar(texto, error = false) {
    const nodo = panel.querySelector('[data-campo="aviso"]');
    if (!nodo) return;
    nodo.textContent = texto;
    nodo.classList.toggle('ft-error', error);
  }

  function repintar() {
    dibujarCuadro(ctx, diseño, imagenFoto);
    if (frameIdActual) onAplicar?.(frameIdActual, canvas);
  }

  function cargarFoto(dataUrl) {
    return new Promise((resolve) => {
      if (!dataUrl) { imagenFoto = null; resolve(); return; }
      const img = new Image();
      img.onload = () => { imagenFoto = img; resolve(); };
      img.onerror = () => { imagenFoto = null; resolve(); };
      img.src = dataUrl;
    });
  }

  panel.addEventListener('input', async (event) => {
    const campo = event.target.dataset.campo;
    if (!campo) return;
    const valor = event.target.type === 'range' ? Number(event.target.value) : event.target.value;
    diseño[campo] = valor;
    // los sliders muestran su valor en la etiqueta: hay que re-renderizar,
    // pero solo para esos, o se pierde el foco al escribir texto
    if (event.target.type === 'range') {
      const etiqueta = event.target.previousElementSibling;
      if (etiqueta?.tagName === 'LABEL') {
        if (campo === 'tituloTam' || campo === 'subtituloTam') etiqueta.textContent = `TAMAÑO · ${valor}px`;
        if (campo === 'fotoZoom') etiqueta.textContent = `ZOOM · ${valor.toFixed(2)}x`;
      }
    }
    repintar();
  });

  panel.addEventListener('change', async (event) => {
    if (event.target.dataset.accion !== 'foto') return;
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      avisar('Procesando la foto…');
      diseño.foto = await achicarFoto(file);
      await cargarFoto(diseño.foto);
      repintar();
      avisar('Foto cargada. Acordate de GUARDAR.');
    } catch (error) {
      avisar(`No se pudo cargar: ${error.message}`, true);
    }
  });

  panel.addEventListener('click', async (event) => {
    const accion = event.target.dataset.accion;
    if (!accion) return;
    if (accion === 'guardar') {
      todos[frameIdActual] = diseño;
      if (guardar(todos)) avisar('Guardado en esta computadora.');
      else avisar('No entro: el navegador se quedo sin espacio. Usa una foto mas chica.', true);
    } else if (accion === 'quitar-foto') {
      diseño.foto = null;
      imagenFoto = null;
      repintar();
      render();
      avisar('Foto quitada.');
    } else if (accion === 'exportar') {
      const blob = new Blob([JSON.stringify(todos, null, 2)], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'cuadros-fourtwenty.json';
      a.click();
      URL.revokeObjectURL(a.href);
      avisar('JSON descargado. Pasaselo a Claude o Codex para que entre al repo.');
    } else if (accion === 'reset') {
      diseño = diseñoPorDefecto();
      await cargarFoto(null);
      render();
      repintar();
      avisar('Volvio al diseño original.');
    }
  });

  render();

  return {
    /** Abre el editor para un cuadro concreto. */
    async abrir(frameId) {
      frameIdActual = frameId;
      diseño = { ...diseñoPorDefecto(), ...(todos[frameId] ?? {}) };
      await cargarFoto(diseño.foto);
      render();
      repintar();
      panel.classList.add('is-open');
    },
    cerrar() {
      panel.classList.remove('is-open');
      frameIdActual = null;
    },
    isOpen: () => panel.classList.contains('is-open'),
    /** Diseños guardados, para que el mundo los aplique al construir el piso. */
    guardados: () => leerGuardado(),
    /** Dibuja un diseño guardado en un canvas nuevo (sin abrir el panel). */
    async render(frameId) {
      const guardadoDeEste = leerGuardado()[frameId];
      if (!guardadoDeEste) return null;
      const c = document.createElement('canvas');
      c.width = ANCHO;
      c.height = ALTO;
      const d = { ...diseñoPorDefecto(), ...guardadoDeEste };
      let img = null;
      if (d.foto) {
        img = await new Promise((res) => {
          const i = new Image();
          i.onload = () => res(i);
          i.onerror = () => res(null);
          i.src = d.foto;
        });
      }
      dibujarCuadro(c.getContext('2d'), d, img);
      return c;
    },
  };
}
