// Click derecho sobre una prenda colgada -> abre el editor de prenda.
//
// Misma capa aislada que frameInteract/productClicks: raycaster propio, estado
// propio y un `isBlocked()` armado con el estado de los demas sistemas.
//
// ⚠️ CONVIVE CON EL EDITOR DE CUADROS. Los dos escuchan `contextmenu` en
// `window`, asi que los dos reciben todos los clicks derechos. No se pisan
// porque cada uno hace su propio raycast y sale si no pego en lo suyo, pero SI
// hay que chequear que el otro panel no este abierto: con el de cuadros abierto,
// un click derecho sobre una prenda que quedara detras del panel abriria los dos
// a la vez.

import * as THREE from 'three';
import { esPrenda, getGarmentEditor, prendaDesde } from '../ui/garmentEditor.js';
import { esPrendaGlb, getGarmentGlbEditor, prendaGlbDesde } from '../ui/garmentGlbEditor.js';

const TIP_ID = 'ft-garment-tip';

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

export function initGarmentInteract({
  canvas,
  camera,
  getScene,
  isBlocked = () => false,
} = {}) {
  if (!canvas || !camera || !getScene) return null;

  const editor = getGarmentEditor();
  // Las prendas modeladas a mano (GLB) tienen su propio panel: no se les puede
  // cambiar el CUERPO —la forma es la que modelo Fer— pero si pintarles el
  // diseño sobre el mapa UV. Ver `ui/garmentGlbEditor.js`.
  const editorGlb = getGarmentGlbEditor();
  const algunoAbierto = () => editor.isOpen() || editorGlb.estaAbierto();
  const raycaster = new THREE.Raycaster();
  const puntero = new THREE.Vector2();
  const cartel = crearCartel();

  // Las prendas se buscan en cada consulta y no se cachean: cambian con el
  // piso, y el editor de mundo puede duplicarlas o esconderlas cuando quiera.
  function prendasDeLaEscena() {
    const scene = getScene();
    const encontradas = [];
    scene?.traverse?.((o) => {
      if ((esPrenda(o) || esPrendaGlb(o)) && o.visible) encontradas.push(o);
    });
    return encontradas;
  }

  function prendaBajoElMouse(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    puntero.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    puntero.y = -((clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(puntero, camera);
    const prendas = prendasDeLaEscena();
    if (!prendas.length) return null;
    const golpe = raycaster.intersectObjects(prendas, true)[0]?.object;
    if (!golpe) return null;
    return prendaGlbDesde(golpe) ?? prendaDesde(golpe);
  }

  function ocultarCartel() {
    cartel.style.display = 'none';
  }

  function onPointerMove(event) {
    if (isBlocked() || algunoAbierto()) { ocultarCartel(); return; }
    const prenda = prendaBajoElMouse(event.clientX, event.clientY);
    if (!prenda) { ocultarCartel(); return; }
    cartel.textContent = 'CLICK DERECHO · DISEÑAR PRENDA';
    cartel.style.left = `${event.clientX}px`;
    cartel.style.top = `${event.clientY}px`;
    cartel.style.display = 'block';
  }

  function onContextMenu(event) {
    // click derecho sobre un panel/formulario: menu normal del navegador
    if (event.target?.closest?.(`#${TIP_ID}, #ft-garment-editor, #ft-garment-glb-editor, #ft-frame-editor, input, select, textarea, button`)) return;
    if (isBlocked()) return;
    const prenda = prendaBajoElMouse(event.clientX, event.clientY);
    if (!prenda) return;            // fuera de una prenda, menu normal del navegador
    event.preventDefault();
    ocultarCartel();
    if (esPrendaGlb(prenda)) editorGlb.abrir(prenda);
    else editor.abrir(prenda);
  }

  function onKeyDown(event) {
    if (event.code !== 'Escape' || !algunoAbierto()) return;
    editor.cerrar();
    editorGlb.cerrar();
  }

  // En `window` y no en el canvas por el mismo motivo que el editor de cuadros:
  // los overlays de interfaz se comen los eventos del canvas y el click derecho
  // no llegaba nunca.
  window.addEventListener('pointermove', onPointerMove);
  canvas.addEventListener('pointerleave', ocultarCartel);
  window.addEventListener('contextmenu', onContextMenu);
  window.addEventListener('keydown', onKeyDown);

  return {
    isOpen: () => algunoAbierto(),
    cerrar: () => { editor.cerrar(); editorGlb.cerrar(); },
    dispose() {
      window.removeEventListener('pointermove', onPointerMove);
      canvas.removeEventListener('pointerleave', ocultarCartel);
      window.removeEventListener('contextmenu', onContextMenu);
      window.removeEventListener('keydown', onKeyDown);
      ocultarCartel();
    },
  };
}
