import * as THREE from 'three';
import { getProductoForSlot, onProductosChange } from '../data/productosStore.js';
import { smoothTexture } from './gfxUtils.js';

const imageFields = ['imagen', 'imageUrl', 'image', 'foto', 'urlImagen'];
const registered = new Set();
const textureCache = new Map();
const failedUrls = new Set();
const loader = new THREE.TextureLoader();
loader.setCrossOrigin?.('anonymous');

let refreshRaf = 0;

function productImageUrl(producto) {
  if (!producto) return '';
  for (const field of imageFields) {
    const value = producto[field];
    if (typeof value === 'string' && value.trim()) return value.trim();
    if (value && typeof value === 'object') {
      const nested = value.src ?? value.url ?? value.href;
      if (typeof nested === 'string' && nested.trim()) return nested.trim();
    }
  }
  return '';
}

function materialList(mesh) {
  return Array.isArray(mesh.material) ? mesh.material : [mesh.material].filter(Boolean);
}

function applyMap(mesh, map, { product = false } = {}) {
  for (const material of materialList(mesh)) {
    if (!('map' in material)) continue;
    material.map = map;
    material.transparent = true;
    material.alphaTest = product ? 0.02 : (mesh.userData.productVisual?.fallbackAlphaTest ?? 0.4);
    material.side = THREE.DoubleSide;
    material.color?.set?.(0xffffff);
    material.needsUpdate = true;
  }
}

function applyFallback(mesh) {
  const state = mesh.userData.productVisual;
  applyMap(mesh, state?.fallbackMap ?? null, { product: false });
}

function applyProductUrl(mesh, url) {
  const state = mesh.userData.productVisual;
  if (!state) return;

  if (textureCache.has(url)) {
    applyMap(mesh, textureCache.get(url), { product: true });
    return;
  }
  if (failedUrls.has(url)) {
    applyFallback(mesh);
    return;
  }

  const token = ++state.loadToken;
  loader.load(
    url,
    (texture) => {
      if (mesh.userData.productVisual?.loadToken !== token) return;
      textureCache.set(url, smoothTexture(texture));
      applyMap(mesh, textureCache.get(url), { product: true });
    },
    undefined,
    () => {
      failedUrls.add(url);
      if (mesh.userData.productVisual?.loadToken === token) applyFallback(mesh);
    },
  );
}

export function refreshProductVisual(mesh) {
  const state = mesh?.userData?.productVisual;
  if (!state) return;

  const info = getProductoForSlot(state.slot.piso, state.slot.index);
  const url = productImageUrl(info?.producto);
  if (!url) {
    state.currentUrl = '';
    state.loadToken++;
    applyFallback(mesh);
    return;
  }
  if (state.currentUrl === url) return;
  state.currentUrl = url;
  applyProductUrl(mesh, url);
}

export function refreshProductVisuals() {
  refreshRaf = 0;
  for (const mesh of registered) {
    if (!mesh?.isMesh) {
      registered.delete(mesh);
      continue;
    }
    refreshProductVisual(mesh);
  }
}

function scheduleRefresh() {
  if (refreshRaf) return;
  refreshRaf = requestAnimationFrame(refreshProductVisuals);
}

export function bindProductVisual(mesh, slot, fallbackMap = null) {
  if (!mesh?.isMesh || !slot) return mesh;
  mesh.userData.productSlot = slot;
  mesh.userData.productVisual = {
    slot,
    fallbackMap: fallbackMap ?? materialList(mesh)[0]?.map ?? null,
    fallbackAlphaTest: materialList(mesh)[0]?.alphaTest ?? 0.4,
    currentUrl: null,
    loadToken: 0,
  };
  registered.add(mesh);
  refreshProductVisual(mesh);
  return mesh;
}

onProductosChange(scheduleRefresh);
