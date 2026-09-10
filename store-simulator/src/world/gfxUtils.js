// Ayudantes compartidos por los módulos de world/*: una caja rápida, texturas
// con filtrado suave, y la paleta de materiales base que reusan percheros,
// estanterías, carteles y la obra gruesa. Antes estaban copiados en cada
// archivo por separado (building.js, gallery.js, retail.js, signage.js).
import * as THREE from 'three';

export function box(w, h, d, x, y, z, mat) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y, z);
  return m;
}

// Filtrado suave + mipmaps + anisotropía: nada de texturas pixeladas sin querer.
export function smoothTexture(tex) {
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.magFilter = THREE.LinearFilter;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.generateMipmaps = true;
  tex.anisotropy = 8;
  return tex;
}

// Canvas a mayor resolución dibujando con las mismas coordenadas (siluetas
// más suaves, menos "pixeladas" sin que haya que recalcular nada al dibujar).
export function hiCanvas(w, h, scale = 2) {
  const c = document.createElement('canvas');
  c.width = w * scale; c.height = h * scale;
  const ctx = c.getContext('2d');
  ctx.scale(scale, scale);
  return [c, ctx];
}

// Paleta de materiales base reutilizada por percheros, estanterías, cajas,
// espejos, barandas y rieles de luz en toda la tienda.
export const white = new THREE.MeshStandardMaterial({ color: 0xf6f5f2, roughness: 0.9 });
export const chrome = new THREE.MeshStandardMaterial({ color: 0xb9bcc2, roughness: 0.25, metalness: 0.9 });
export const darkMetal = new THREE.MeshStandardMaterial({ color: 0x2e2e33, roughness: 0.4, metalness: 0.7 });
