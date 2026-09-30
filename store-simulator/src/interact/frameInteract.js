// Click derecho sobre un cuadro -> abre el editor de diseño.
//
// POR QUE ASI
// El editor ya se podia abrir con la tecla `T` (editor de mundo) + click sobre
// el cuadro, pero eso obliga a saber que existe el modo editor, entrar, y
// entender que la pieza que se selecciona no es el cuadro entero. Kusher no lo
// encontraba, y con razon. El click derecho no necesita modo previo y es un
// gesto que ya significa "opciones" en cualquier programa.
//
// Capa aislada, mismo patron que productClicks/carInteract: raycaster propio,
// estado propio y un `isBlocked()` armado con el estado de los demas sistemas.
// No toca la camara ni los listeners de nadie.

import * as THREE from 'three';
import { cuadroDesde, esCuadro, getFrameEditor } from '../ui/frameEditor.js';

const TIP_ID = 'ft-frame-tip';

function crearCartel() {
  let tip = document.getElementById(TIP_ID);
  if (tip) return tip;
  tip = document.createElement('div');
  tip.id = TIP_ID;
  tip.style.cssText = `
    position: fixed; z-index: 96; display: none; pointer-events: none;
    transform: translate(-50%, -140%);
    background: rgba(10,12,10,0.9); border: 1px solid rgba(231,185,76,0.65);
    color: #e9e4d6; font-family: 'Courier New', monospace; font-size: 11px;
    letter-spacing: 1px; padding: 5px 9px; border-radius: 4px; white-space: nowrap;
  `;
  document.body.appendChild(tip);
  return tip;
}

export function initFrameInteract({
  canvas,
  camera,
  getScene,
  isBlocked = () => false,
} = {}) {
  if (!canvas || !camera || !getScene) return null;

  const editor = getFrameEditor();
  const raycaster = new THREE.Raycaster();
  const puntero = new THREE.Vector2();
  const cartel = crearCartel();
  let ultimoX = 0;
  let ultimoY = 0;

  // Los cuadros se buscan en cada consulta y no se cachean: cambian con el
  // piso, y el editor de mundo puede duplicarlos o esconderlos en cualquier
  // momento.
  function cuadrosDeLaEscena() {
    const scene = getScene();
    const encontrados = [];
    scene?.traverse?.((o) => {
      if (esCuadro(o) && o.visible) encontrados.push(o);
    });
    return encontrados;
  }

  function cuadroBajoElMouse(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    puntero.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    puntero.y = -((clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(puntero, camera);
    const cuadros = cuadrosDeLaEscena();
    if (!cuadros.length) return null;
    const golpe = raycaster.intersectObjects(cuadros, true)[0]?.object;
    return golpe ? cuadroDesde(golpe) : null;
  }

  function ocultarCartel() {
    cartel.style.display = 'none';
  }

  function onPointerMove(event) {
    ultimoX = event.clientX;
    ultimoY = event.clientY;
    if (isBlocked() || editor.isOpen()) { ocultarCartel(); return; }
    const cuadro = cuadroBajoElMouse(event.clientX, event.clientY);
    if (!cuadro) { ocultarCartel(); return; }
    cartel.textContent = 'CLICK DERECHO · DISEÑAR CUADRO';
    cartel.style.left = `${event.clientX}px`;
    cartel.style.top = `${event.clientY}px`;
    cartel.style.display = 'block';
  }

  // Se escucha en `window`, no en el canvas: el juego tiene overlays de
  // interfaz (HUD, pantalla de carga) que se comen los eventos del canvas, y
  // ahi el click derecho no llegaba nunca. Se comprobo instrumentando el
  // evento: llegaba a window y no al canvas. Como el raycast usa coordenadas
  // de pantalla contra el rectangulo del canvas, da igual quien lo reciba.
  function onContextMenu(event) {
    // click derecho sobre un panel/formulario: menu normal del navegador
    if (event.target?.closest?.(`#${TIP_ID}, #ft-frame-editor, input, select, textarea, button`)) return;
    if (isBlocked()) return;
    const cuadro = cuadroBajoElMouse(event.clientX, event.clientY);
    if (!cuadro) return;              // fuera de un cuadro, menu normal del navegador
    event.preventDefault();
    ocultarCartel();
    editor.abrir(cuadro);
  }

  function onKeyDown(event) {
    if (event.code !== 'Escape' || !editor.isOpen()) return;
    editor.cerrar();
  }

  // pointermove tambien en window por el mismo motivo que contextmenu
  window.addEventListener('pointermove', onPointerMove);
  canvas.addEventListener('pointerleave', ocultarCartel);
  window.addEventListener('contextmenu', onContextMenu);
  window.addEventListener('keydown', onKeyDown);

  return {
    isOpen: () => editor.isOpen(),
    cerrar: () => editor.cerrar(),
    dispose() {
      window.removeEventListener('pointermove', onPointerMove);
      canvas.removeEventListener('pointerleave', ocultarCartel);
      window.removeEventListener('contextmenu', onContextMenu);
      window.removeEventListener('keydown', onKeyDown);
      ocultarCartel();
    },
  };
}
