// EDITOR DE PRENDA — click derecho sobre una prenda colgada.
//
// Permite a Kusher, sin tocar codigo y desde adentro del juego:
//   - elegir el cuerpo: remera, hoodie, pantalon o bermuda
//   - cambiar el color de la tela
//   - subir una imagen y apoyarla como estampa en el FRENTE o el DORSO
//   - ajustarla al cuerpo de esa prenda (ancho, alto y altura en cm reales)
//
// Mismo patron que el editor de cuadros (ui/frameEditor.js): panel a la
// izquierda, vista en vivo, guardado en localStorage por NOMBRE de la prenda y
// exportacion a JSON para que el diseño llegue al repo.
//
// POR QUE SE GUARDA POR NOMBRE Y NO POR ID
// El id del editor de mundo se genera al registrar la escena y se corre si
// cambia el orden de creacion de los objetos. El nombre lo pone el constructor
// del piso y no cambia nunca. Misma decision que en los cuadros, y por el mismo
// motivo: un diseño guardado no puede aparecer sobre otra prenda porque alguien
// agrego un mueble antes.

import { applyGarmentPrint, PRINT_DEFAULTS } from '../world/garmentPrints.js';
import { garmentTypes, restyleGarment } from '../world/garments.js';

const STORAGE_KEY = 'ft-prendas-v1';
const PANEL_ID = 'ft-garment-editor';

const NOMBRE_TIPO = {
  tee: 'REMERA',
  hoodie: 'HOODIE',
  pantalon: 'PANTALON',
  bermuda: 'BERMUDA',
  jersey: 'MUSCULOSA',
};

// ---------------------------------------------------------------------------
// Encontrar la prenda
// ---------------------------------------------------------------------------

export function esPrenda(objeto) {
  return Boolean(objeto?.userData?.garment);
}

/** El raycast pega en la tela o en la percha, no en el grupo. Sube por los
 * padres hasta encontrar la prenda, igual que `cuadroDesde` en los cuadros. */
export function prendaDesde(objeto) {
  let actual = objeto;
  while (actual) {
    if (esPrenda(actual)) return actual;
    actual = actual.parent;
  }
  return null;
}

// ---------------------------------------------------------------------------
// Guardado
// ---------------------------------------------------------------------------

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
    return { ok: true };
  } catch {
    // Casi siempre es la cuota de localStorage (~5 MB) llena de imagenes.
    return { ok: false, error: 'No entra en la memoria del navegador. Usa EXPORTAR JSON y borra alguna estampa.' };
  }
}

function diseñoDe(prenda) {
  const g = prenda.userData.garment;
  return {
    tipo: g.type,
    color: g.color,
    frente: { ...PRINT_DEFAULTS, lado: 'frente', imagen: null, ...(g.print?.frente ?? {}) },
    dorso: { ...PRINT_DEFAULTS, lado: 'dorso', imagen: null, ...(g.print?.dorso ?? {}) },
  };
}

/**
 * Aplica a una escena todos los diseños guardados. Se llama al terminar de
 * construir un piso: sin esto, las prendas vuelven a su color y sin estampa
 * cada vez que se entra de nuevo.
 */
export function applySavedGarmentDesigns(scene) {
  const todos = leerGuardado();
  if (!Object.keys(todos).length) return 0;
  let aplicados = 0;
  scene?.traverse?.((objeto) => {
    if (!esPrenda(objeto)) return;
    const diseño = todos[objeto.name];
    if (!diseño) return;
    aplicarDiseño(objeto, diseño);
    aplicados++;
  });
  return aplicados;
}

function aplicarDiseño(prenda, diseño) {
  const g = prenda.userData.garment;
  if (diseño.tipo && diseño.tipo !== g.type) g.type = diseño.tipo;
  if (Number.isFinite(diseño.color)) g.color = diseño.color;
  g.print = { frente: diseño.frente, dorso: diseño.dorso };

  restyleGarment(prenda, {
    type: g.type,
    color: g.color,
    // Si la prenda tiene estampa propia, el cuerpo se dibuja sin el "FT" de
    // relleno: si no, quedan dos estampas encimadas en el mismo pecho.
    limpia: Boolean(diseño.frente?.imagen || diseño.dorso?.imagen),
  });
  applyGarmentPrint(prenda, g.type, 'frente', diseño.frente);
  applyGarmentPrint(prenda, g.type, 'dorso', diseño.dorso);
}

// ---------------------------------------------------------------------------
// Imagen
// ---------------------------------------------------------------------------

// PNG y no JPEG: una estampa casi siempre viene con fondo transparente, y el
// JPEG no tiene canal alfa — el logo llegaria con un rectangulo blanco atras.
// El precio es que pesa mas, por eso se limita a 1024 px.
function leerImagen(file, maxLado = 1024) {
  return new Promise((resolve, reject) => {
    const lector = new FileReader();
    lector.onerror = () => reject(new Error('no se pudo leer el archivo'));
    lector.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('el archivo no es una imagen valida'));
      img.onload = () => {
        const escala = Math.min(1, maxLado / Math.max(img.width, img.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(img.width * escala));
        canvas.height = Math.max(1, Math.round(img.height * escala));
        canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve({ url: canvas.toDataURL('image/png'), ancho: img.width, alto: img.height });
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
  position: fixed; top: 12px; left: 12px; width: 300px; max-height: calc(100vh - 24px);
  overflow-y: auto; z-index: 131; display: none;
  background: rgba(10,12,10,0.94); border: 1px solid rgba(231,185,76,0.5);
  border-radius: 10px; padding: 12px; box-sizing: border-box;
  font-family: 'Courier New', monospace; color: #e9e4d6; font-size: 12px;
  box-shadow: 0 12px 40px rgba(0,0,0,0.6);
}
#${PANEL_ID}.is-open { display: block; }
#${PANEL_ID} h3 { margin: 0 0 2px; font-size: 13px; letter-spacing: 2px; color: #e7b94c;
  display: flex; justify-content: space-between; align-items: center; }
#${PANEL_ID} h3 button { padding: 1px 7px; font-size: 13px; line-height: 1; }
#${PANEL_ID} .ft-sub { margin: 0 0 10px; opacity: 0.6; font-size: 10px;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
#${PANEL_ID} label { display: block; margin: 9px 0 3px; opacity: 0.75; font-size: 10px; letter-spacing: 1px; }
#${PANEL_ID} select, #${PANEL_ID} input[type="file"] {
  width: 100%; box-sizing: border-box; background: #1b1e19; color: #e9e4d6;
  border: 1px solid #3a3f36; border-radius: 4px; padding: 5px 6px; font: inherit;
}
#${PANEL_ID} input[type="file"] { font-size: 10px; padding: 4px; }
#${PANEL_ID} input[type="range"] { width: 100%; }
#${PANEL_ID} input[type="color"] { width: 100%; height: 26px; border: 1px solid #3a3f36; background: #1b1e19; border-radius: 4px; }
#${PANEL_ID} .ft-lados { display: flex; gap: 6px; margin: 10px 0 2px; }
#${PANEL_ID} .ft-lados button { flex: 1; }
#${PANEL_ID} .ft-lados button.is-activo { background: #e7b94c; color: #14170f; border-color: #e7b94c; font-weight: bold; }
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
#${PANEL_ID} .ft-valor { float: right; opacity: 0.9; }
#${PANEL_ID} hr { border: none; border-top: 1px solid #2c3128; margin: 12px 0 2px; }
`;

function inyectarCss() {
  if (document.getElementById(`${PANEL_ID}-css`)) return;
  const style = document.createElement('style');
  style.id = `${PANEL_ID}-css`;
  style.textContent = CSS;
  document.head.appendChild(style);
}

const hex = (n) => `#${(n ?? 0).toString(16).padStart(6, '0')}`;

export function createGarmentEditor() {
  inyectarCss();

  const panel = document.createElement('div');
  panel.id = PANEL_ID;
  panel.innerHTML = `
    <h3>EDITOR DE PRENDA <button data-ft="cerrar" title="Cerrar">✕</button></h3>
    <p class="ft-sub" data-ft="nombre"></p>

    <label>CUERPO</label>
    <select data-ft="tipo"></select>

    <label>COLOR DE LA TELA</label>
    <input type="color" data-ft="color">

    <hr>
    <div class="ft-lados">
      <button data-ft="lado" data-lado="frente" class="is-activo">FRENTE</button>
      <button data-ft="lado" data-lado="dorso">DORSO</button>
    </div>

    <label>IMAGEN DE LA ESTAMPA (PNG con fondo transparente)</label>
    <input type="file" accept="image/*" data-ft="archivo">

    <label>ANCHO <span class="ft-valor" data-ft="vAncho"></span></label>
    <input type="range" min="4" max="42" step="1" data-ft="ancho">

    <label>ALTO <span class="ft-valor" data-ft="vAlto"></span></label>
    <input type="range" min="4" max="52" step="1" data-ft="alto">

    <label>ALTURA EN LA PRENDA <span class="ft-valor" data-ft="vCentro"></span></label>
    <input type="range" min="6" max="92" step="1" data-ft="centro">

    <div class="ft-acciones">
      <button data-ft="proporcion">PROPORCION ORIGINAL</button>
      <button data-ft="quitar">QUITAR ESTAMPA</button>
      <button data-ft="guardar" class="ft-primario">GUARDAR</button>
      <button data-ft="exportar">EXPORTAR JSON</button>
    </div>
    <p class="ft-aviso" data-ft="aviso"></p>
  `;
  document.body.appendChild(panel);

  const el = (nombre) => panel.querySelector(`[data-ft="${nombre}"]`);
  const selTipo = el('tipo');
  for (const tipo of garmentTypes()) {
    const opcion = document.createElement('option');
    opcion.value = tipo;
    opcion.textContent = NOMBRE_TIPO[tipo] ?? tipo.toUpperCase();
    selTipo.appendChild(opcion);
  }

  let prenda = null;
  let diseño = null;
  let lado = 'frente';
  // Proporcion original de la ultima imagen subida, para el boton de proporcion.
  let proporcion = null;

  function avisar(texto, error = false) {
    const aviso = el('aviso');
    aviso.textContent = texto;
    aviso.classList.toggle('ft-error', error);
  }

  function ladoActual() {
    return diseño[lado];
  }

  function pintarControles() {
    const l = ladoActual();
    selTipo.value = diseño.tipo;
    el('color').value = hex(diseño.color);
    el('ancho').value = l.anchoCm;
    el('alto').value = l.altoCm;
    el('centro').value = Math.round(l.centroY * 100);
    el('vAncho').textContent = `${l.anchoCm} cm`;
    el('vAlto').textContent = `${l.altoCm} cm`;
    el('vCentro').textContent = l.imagen ? `${Math.round(l.centroY * 100)}%` : '—';
    for (const boton of panel.querySelectorAll('[data-ft="lado"]')) {
      boton.classList.toggle('is-activo', boton.dataset.lado === lado);
    }
  }

  // Redibuja SOLO la estampa del lado que se esta tocando. Rehacer el cuerpo en
  // cada movimiento del slider tiraria la geometria y la textura 60 veces por
  // segundo; el parche son ~300 triangulos y se regenera sin que se note.
  function refrescarEstampa() {
    if (!prenda) return;
    applyGarmentPrint(prenda, prenda.userData.garment.type, lado, ladoActual());
    prenda.userData.garment.print = { frente: diseño.frente, dorso: diseño.dorso };
  }

  function refrescarTodo() {
    if (!prenda) return;
    aplicarDiseño(prenda, diseño);
  }

  selTipo.addEventListener('change', () => {
    diseño.tipo = selTipo.value;
    refrescarTodo();
    avisar('Cuerpo cambiado. Acordate de GUARDAR.');
  });

  el('color').addEventListener('input', () => {
    diseño.color = parseInt(el('color').value.slice(1), 16);
    refrescarTodo();
  });

  for (const boton of panel.querySelectorAll('[data-ft="lado"]')) {
    boton.addEventListener('click', () => {
      lado = boton.dataset.lado;
      proporcion = null;
      pintarControles();
      avisar(lado === 'dorso' ? 'Estas editando la ESPALDA de la prenda.' : '');
    });
  }

  el('archivo').addEventListener('change', async (evento) => {
    const file = evento.target.files?.[0];
    if (!file) return;
    try {
      const { url, ancho, alto } = await leerImagen(file);
      const l = ladoActual();
      l.imagen = url;
      proporcion = alto / ancho;
      // Alto inicial derivado de la proporcion real: si no, una imagen apaisada
      // entra estirada y hay que corregirla a mano siempre.
      l.altoCm = Math.max(4, Math.min(52, Math.round(l.anchoCm * proporcion)));
      // El cuerpo se redibuja limpio: sin esto la estampa nueva queda encima
      // del "FT" de relleno.
      refrescarTodo();
      pintarControles();
      avisar('Estampa cargada. Ajustala y apreta GUARDAR.');
    } catch (error) {
      avisar(error.message, true);
    }
  });

  el('ancho').addEventListener('input', () => {
    const l = ladoActual();
    l.anchoCm = Number(el('ancho').value);
    if (proporcion) l.altoCm = Math.max(4, Math.min(52, Math.round(l.anchoCm * proporcion)));
    refrescarEstampa();
    pintarControles();
  });

  el('alto').addEventListener('input', () => {
    ladoActual().altoCm = Number(el('alto').value);
    proporcion = null; // el dueño decidio deformarla a proposito
    refrescarEstampa();
    pintarControles();
  });

  el('centro').addEventListener('input', () => {
    ladoActual().centroY = Number(el('centro').value) / 100;
    refrescarEstampa();
    pintarControles();
  });

  el('proporcion').addEventListener('click', () => {
    const l = ladoActual();
    if (!l.imagen) { avisar('Primero subi una imagen.', true); return; }
    const img = new Image();
    img.onload = () => {
      proporcion = img.height / img.width;
      l.altoCm = Math.max(4, Math.min(52, Math.round(l.anchoCm * proporcion)));
      refrescarEstampa();
      pintarControles();
      avisar('Proporcion original restaurada.');
    };
    img.src = l.imagen;
  });

  el('quitar').addEventListener('click', () => {
    ladoActual().imagen = null;
    refrescarTodo();
    pintarControles();
    avisar('Estampa quitada. Apreta GUARDAR para que quede asi.');
  });

  el('guardar').addEventListener('click', () => {
    const todos = leerGuardado();
    todos[prenda.name] = diseño;
    const resultado = guardar(todos);
    avisar(resultado.ok
      ? 'Guardado en esta computadora. Para que llegue al repo, EXPORTAR JSON.'
      : resultado.error, !resultado.ok);
  });

  el('exportar').addEventListener('click', () => {
    const blob = new Blob([JSON.stringify(leerGuardado(), null, 2)], { type: 'application/json' });
    const enlace = document.createElement('a');
    enlace.href = URL.createObjectURL(blob);
    enlace.download = 'prendas-fourtwenty.json';
    enlace.click();
    URL.revokeObjectURL(enlace.href);
    avisar('JSON descargado. Pasaselo a Claude o a Codex.');
  });

  el('cerrar').addEventListener('click', () => api.cerrar());

  const api = {
    isOpen: () => panel.classList.contains('is-open'),
    abrir(objetivo) {
      prenda = prendaDesde(objetivo);
      if (!prenda) return;
      // Diseño guardado si existe; si no, el estado actual de la prenda.
      diseño = leerGuardado()[prenda.name] ?? diseñoDe(prenda);
      lado = 'frente';
      proporcion = null;
      el('nombre').textContent = prenda.name || '(prenda sin nombre)';
      el('archivo').value = '';
      pintarControles();
      avisar(prenda.name
        ? ''
        : 'Esta prenda no tiene nombre, asi que su diseño no se puede guardar.', !prenda.name);
      panel.classList.add('is-open');
    },
    cerrar() {
      panel.classList.remove('is-open');
      prenda = null;
      diseño = null;
    },
  };
  return api;
}

// Instancia unica: el editor se puede abrir por click derecho y (mas adelante)
// desde el editor de mundo. Dos instancias serian dos paneles peleandose la
// pantalla, igual que pasaria con el de cuadros.
let instancia = null;

export function getGarmentEditor() {
  if (!instancia) instancia = createGarmentEditor();
  return instancia;
}
