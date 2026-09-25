// MANEJAR EL BANAPOD CON EL JOYSTICK.
//
// Kusher lo pidio asi: "quiero que el banapod se maneje con el pad del
// joystick, las cuatro opciones, quiero que sea como un puntero de mouse pero
// usando el pad para toda la interfaz del banapod e interactuar solo tocando el
// pad y presionandolo, Circulo para volver atras".
//
// ⚠️ ACLARACION IMPORTANTE SOBRE EL PANEL TACTIL. El navegador NO ve DONDE
// pusiste el dedo en el panel del DualSense: la Gamepad API expone el CLICK del
// panel (boton 17) y nada mas. Las coordenadas del dedo existen en el mando,
// pero para leerlas haria falta WebHID, que es otro permiso y otro protocolo.
// O sea: un puntero libre arrastrado con el dedo NO se puede hacer hoy.
//
// Lo que si se hace, y se siente igual de directo: un SELECTOR que salta de
// boton en boton segun para donde empujes (cruceta o stick izquierdo), y
// aprieta con el panel tactil o con la cruz. Como no hay un cursor que pueda
// quedar en el vacio, nunca se pierde.
//
// COMO SE ELIGE EL SIGUIENTE BOTON. No se usa el orden del HTML sino la
// GEOMETRIA: se mide donde esta cada boton en pantalla y se salta al que
// realmente esta para ese lado. Con el orden del HTML, empujar a la derecha en
// la pantalla principal saltaba al reloj —que esta arriba— porque venia primero
// en el codigo.
import { BOTON, leerMando } from '../core/mando.js';

const CLASE_FOCO = 'ft-mando-foco';
const REPETIR_PRIMERA = 380;   // ms que hay que mantener para que empiece a repetir
const REPETIR_LUEGO = 130;     // ms entre repeticiones
const UMBRAL_STICK = 0.55;     // el stick tiene que estar bien empujado para contar

function estilo() {
  if (document.getElementById('ft-mando-banapod-style')) return;
  const tag = document.createElement('style');
  tag.id = 'ft-mando-banapod-style';
  // El aro se dibuja con outline y no con border: un borde cambia el tamaño del
  // boton y toda la pantalla se mueve un pixel cada vez que salta el selector.
  tag.textContent = `
    .${CLASE_FOCO} {
      outline: 2px solid #39ff6a !important;
      outline-offset: 2px;
      box-shadow: 0 0 12px rgba(57, 255, 106, 0.55) !important;
      border-radius: 6px;
    }
  `;
  document.head.appendChild(tag);
}

/** ¿Se ve de verdad? Un boton en una vista escondida tiene ancho 0. */
function visible(el) {
  if (el.disabled) return false;
  const caja = el.getBoundingClientRect();
  return caja.width > 0 && caja.height > 0;
}

const centro = (el) => {
  const c = el.getBoundingClientRect();
  return { x: c.left + c.width / 2, y: c.top + c.height / 2 };
};

/**
 * El siguiente control en la direccion pedida.
 * Puntaje = cuanto avanza para ese lado + el doble de cuanto se desvia. El x2
 * del desvio es lo que hace que empujando a la derecha se prefiera al de al
 * lado y no a uno lejano en diagonal.
 */
function vecino(desde, candidatos, dx, dy) {
  const a = centro(desde);
  let mejor = null;
  let mejorPuntaje = Infinity;
  for (const el of candidatos) {
    if (el === desde) continue;
    const b = centro(el);
    const avance = (b.x - a.x) * dx + (b.y - a.y) * dy;
    if (avance <= 4) continue;                       // no esta para ese lado
    const desvio = Math.abs((b.x - a.x) * dy - (b.y - a.y) * dx);
    const puntaje = avance + desvio * 2;
    if (puntaje < mejorPuntaje) { mejorPuntaje = puntaje; mejor = el; }
  }
  return mejor;
}

/**
 * @param {object} phone  lo que devuelve `createPhone` ({ isOpen, hide, ... })
 */
export function conectarMandoAlBanapod(phone) {
  estilo();
  const raiz = document.getElementById('ft-phone');
  if (!raiz || !phone) return () => {};

  let foco = null;
  let rafId = 0;
  let antes = new Set();
  // direccion sostenida: { dx, dy, desde }
  let sostenido = null;

  function controles() {
    const todos = raiz.querySelectorAll(
      '[data-app], [data-action], [data-playlist], [data-cart-action], input[type="range"], input[type="time"]',
    );
    // El boton que abre y cierra el Banapod queda afuera: para cerrarlo ya esta
    // el circulo, y tenerlo en la grilla hace que el selector se escape del
    // telefono.
    return [...todos].filter((el) => el.dataset?.action !== 'phone-toggle' && visible(el));
  }

  function poner(el) {
    if (foco === el) return;
    foco?.classList.remove(CLASE_FOCO);
    foco = el ?? null;
    if (!foco) return;
    foco.classList.add(CLASE_FOCO);
    foco.focus?.({ preventScroll: true });
  }

  /** Si el foco se murio (cambio de vista), se pone en el primero que haya. */
  function revisarFoco() {
    const lista = controles();
    if (!lista.length) { poner(null); return lista; }
    if (!foco || !lista.includes(foco)) poner(lista[0]);
    return lista;
  }

  function mover(dx, dy) {
    const lista = revisarFoco();
    if (!foco) return;
    // ⚠️ Sobre un slider, izquierda y derecha CAMBIAN EL VALOR en vez de
    // saltar de boton. Es lo que uno espera de una barra, y ademas la barra de
    // la hora ocupa todo el ancho: sin esto no habria forma de moverla.
    if (foco.type === 'range' && dy === 0) {
      const paso = Number(foco.step) || 1;
      const valor = Number(foco.value) + paso * dx;
      foco.value = String(Math.min(Number(foco.max), Math.max(Number(foco.min), valor)));
      foco.dispatchEvent(new Event('input', { bubbles: true }));
      foco.dispatchEvent(new Event('change', { bubbles: true }));
      return;
    }
    const destino = vecino(foco, lista, dx, dy);
    if (destino) poner(destino);
  }

  function apretar() {
    if (!foco) return;
    if (foco.tagName === 'INPUT') return;   // una barra no se "aprieta"
    foco.click();
    // La vista pudo haber cambiado: el foco viejo ya no existe.
    requestAnimationFrame(() => { foco = null; revisarFoco(); });
  }

  /** Circulo: volver a la pantalla principal, y si ya estabas ahi, cerrar. */
  function atras() {
    const volver = raiz.querySelector('.phone-view:not([hidden]) [data-action="home"]');
    if (volver && visible(volver)) {
      volver.click();
      requestAnimationFrame(() => { foco = null; revisarFoco(); });
      return;
    }
    phone.hide();
  }

  function direccionDelMando(mando) {
    if (mando.apretados.has(BOTON.CRUCETA_IZQ)) return { dx: -1, dy: 0 };
    if (mando.apretados.has(BOTON.CRUCETA_DER)) return { dx: 1, dy: 0 };
    if (mando.apretados.has(BOTON.CRUCETA_ARRIBA)) return { dx: 0, dy: -1 };
    if (mando.apretados.has(BOTON.CRUCETA_ABAJO)) return { dx: 0, dy: 1 };
    const x = mando.mover.x;
    const y = -mando.mover.z;                 // arriba en pantalla = y negativa
    if (Math.hypot(x, y) < UMBRAL_STICK) return null;
    // Se queda con el eje dominante: media diagonal no tiene que mover dos veces.
    return Math.abs(x) > Math.abs(y)
      ? { dx: Math.sign(x), dy: 0 }
      : { dx: 0, dy: Math.sign(y) };
  }

  function cuadro() {
    rafId = requestAnimationFrame(cuadro);
    if (!phone.isOpen()) {
      if (foco) poner(null);
      sostenido = null;
      antes.clear();
      return;
    }

    const mando = leerMando();
    if (!mando) return;
    revisarFoco();

    // --- botones (flanco: solo cuando se acaban de apretar) ---
    const nuevos = new Set();
    for (const b of mando.apretados) if (!antes.has(b)) nuevos.add(b);
    antes = new Set(mando.apretados);

    if (nuevos.has(BOTON.CIRCULO)) { atras(); return; }
    if (nuevos.has(BOTON.TACTIL) || nuevos.has(BOTON.CRUZ)) { apretar(); return; }

    // --- direccion, con repeticion al mantener ---
    const dir = direccionDelMando(mando);
    if (!dir) { sostenido = null; return; }
    const ahora = performance.now();
    if (!sostenido || sostenido.dx !== dir.dx || sostenido.dy !== dir.dy) {
      sostenido = { ...dir, desde: ahora, proxima: ahora + REPETIR_PRIMERA };
      mover(dir.dx, dir.dy);
      return;
    }
    if (ahora >= sostenido.proxima) {
      sostenido.proxima = ahora + REPETIR_LUEGO;
      mover(dir.dx, dir.dy);
    }
  }

  rafId = requestAnimationFrame(cuadro);
  return () => { cancelAnimationFrame(rafId); poner(null); };
}
