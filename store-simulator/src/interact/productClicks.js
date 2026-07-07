// Click en prendas → panel de producto. Capa NUEVA y AISLADA: raycaster y
// listeners de mouse propios, sin tocar cámara, controles ni los listeners
// existentes (selector de pisos, editor). Solo son clickeables los meshes
// tageados con userData.productSlot = { piso, index } (gallery.js/street.js);
// el producto que corresponde a cada gancho sale de productosStore.
import * as THREE from 'three';
import { getProductoForSlot, getColeccionByPiso } from '../data/productosStore.js';
import { createProductPanel } from '../ui/productPanel.js';

const TIP_ID = 'ft-product-tip';

function ensureTip() {
  let tip = document.getElementById(TIP_ID);
  if (tip) return tip;
  tip = document.createElement('div');
  tip.id = TIP_ID;
  tip.style.cssText = [
    'position:fixed', 'left:50%', 'bottom:64px', 'transform:translateX(-50%)',
    'z-index:60', 'display:none', 'padding:6px 14px',
    'font-family:"Courier New",monospace', 'font-size:12px', 'letter-spacing:2px',
    'color:#111', 'background:#39ff6a', 'font-weight:900',
    'box-shadow:0 6px 18px rgba(0,0,0,0.35)', 'pointer-events:none',
  ].join(';');
  document.body.appendChild(tip);
  return tip;
}

export function initProductClicks({ canvas, camera, getScene, isBlocked = () => false }) {
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2(-2, -2);
  const panel = createProductPanel();
  const tip = ensureTip();

  // cache de meshes clickeables; se rearma cuando cambia la escena activa
  let cachedScene = null;
  let productMeshes = [];
  let hovered = null;
  let pointerDirty = false;

  function rescan() {
    cachedScene = getScene();
    productMeshes = [];
    cachedScene?.traverse((obj) => {
      if (obj.userData?.productSlot) {
        if (obj.isMesh) productMeshes.push(obj);
        // grupos tageados (ej. exhibidor del jean): clickeable por sus hijos
        else obj.traverse((child) => { if (child.isMesh) productMeshes.push(child); });
      }
    });
  }

  function slotOf(object) {
    let current = object;
    while (current) {
      if (current.userData?.productSlot) return current.userData.productSlot;
      current = current.parent;
    }
    return null;
  }

  function raycastSlot() {
    if (getScene() !== cachedScene) rescan();
    if (!productMeshes.length) return null;
    raycaster.setFromCamera(pointer, camera);
    const hit = raycaster.intersectObjects(productMeshes, false)[0]?.object ?? null;
    return hit ? { hit, slot: slotOf(hit) } : null;
  }

  function clearHover() {
    hovered = null;
    tip.style.display = 'none';
    // el cursor lo comparte el selector de pisos: solo lo tocamos si lo pusimos nosotros
    if (canvas.style.cursor === 'pointer' && canvas.dataset.productHover === '1') {
      canvas.style.cursor = 'default';
    }
    delete canvas.dataset.productHover;
  }

  canvas.addEventListener('pointermove', (e) => {
    pointer.set((e.clientX / window.innerWidth) * 2 - 1, -(e.clientY / window.innerHeight) * 2 + 1);
    pointerDirty = true;
  });

  // hover barato: raycast solo cuando el mouse se movió, en el próximo frame
  function tickHover() {
    requestAnimationFrame(tickHover);
    if (!pointerDirty) return;
    pointerDirty = false;
    if (isBlocked() || panel.isOpen()) { clearHover(); return; }
    const res = raycastSlot();
    if (!res?.slot) { if (hovered) clearHover(); return; }
    if (res.hit !== hovered) {
      hovered = res.hit;
      const info = getProductoForSlot(res.slot.piso, res.slot.index);
      tip.textContent = info?.producto?.nombre
        ? `${info.producto.nombre.toUpperCase()} — CLICK PARA VER`
        : 'VER PRENDA — CLICK';
      tip.style.display = 'block';
      canvas.style.cursor = 'pointer';
      canvas.dataset.productHover = '1';
    }
  }
  requestAnimationFrame(tickHover);

  canvas.addEventListener('click', () => {
    if (isBlocked() || panel.isOpen()) return;
    const res = raycastSlot();
    if (!res?.slot) return;
    const info = getProductoForSlot(res.slot.piso, res.slot.index);
    panel.show({
      producto: info?.producto ?? null,
      coleccion: info?.coleccion ?? getColeccionByPiso(res.slot.piso),
      slotIndex: res.slot.index,
    });
    clearHover();
  });

  return { rescan, panel };
}
