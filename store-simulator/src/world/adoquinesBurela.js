import * as THREE from 'three';

// Granito gastado, como el empedrado porteño: piezas de 22 x 11 cm,
// hiladas trabadas y juntas de arena. Referencia de medidas: Manual de Diseño
// Urbano de Buenos Aires / Pavimentos de piezas / Adoquines.
// Se genera una vez en memoria: funciona sin Internet y sin bajar imágenes.
export const ADOQUIN_METROS = 2.2;
const SIZE = 512;
let canvases;

function makeCanvas(data) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = SIZE;
  const ctx = canvas.getContext('2d');
  ctx.putImageData(new ImageData(data, SIZE, SIZE), 0, 0);
  return canvas;
}

function createCanvases() {
  const color = new Uint8ClampedArray(SIZE * SIZE * 4);
  const normals = new Uint8ClampedArray(color.length);
  const height = new Float32Array(SIZE * SIZE);
  let seed = 2570420;
  const random = () => ((seed = Math.imul(seed, 1664525) + 1013904223 | 0) >>> 0) / 4294967296;
  const stones = Array.from({ length: 200 }, () => ({
    value: 102 + random() * 43,
    warm: random() * 11 - 4,
    corner: 1.5 + random() * 2.1,
    crown: 0.73 + random() * 0.22,
    phase: random() * Math.PI * 2,
  }));
  const width = SIZE / 10, depth = SIZE / 20;
  for (let y = 0; y < SIZE; y++) {
    const row = Math.floor(y / depth);
    for (let x = 0; x < SIZE; x++) {
      const shiftedX = (x + (row % 2) * width / 2) % SIZE;
      const col = Math.floor(shiftedX / width);
      const stone = stones[row * 10 + col];
      const px = shiftedX % width - width / 2;
      const py = y % depth - depth / 2;
      // Rounded, slightly irregular shoulders; raised centers catch the sun.
      const roughEdge = Math.sin(px * 0.63 + stone.phase) * 0.35
        + Math.sin(py * 0.91 + stone.phase) * 0.3;
      const qx = Math.abs(px) - (width / 2 - 1.2 - stone.corner);
      const qy = Math.abs(py) - (depth / 2 - 1.2 - stone.corner);
      const distance = Math.hypot(Math.max(qx, 0), Math.max(qy, 0))
        + Math.min(Math.max(qx, qy), 0) - stone.corner + roughEdge;
      const shoulder = Math.max(0, Math.min(1, -distance / 2.8));
      const grain = random();
      const crown = 1 - 0.12 * ((px / width) ** 2 + (py / depth) ** 2);
      const at = y * SIZE + x, i = at * 4;
      height[at] = shoulder * stone.crown * crown + (grain - 0.5) * 0.035;
      const fleck = grain < 0.07 ? -27 : grain > 0.95 ? 28 : (grain - 0.5) * 17;
      const value = 53 + shoulder * (stone.value - 53) + fleck;
      color[i] = value + stone.warm * shoulder;
      color[i + 1] = value + stone.warm * 0.48 * shoulder;
      color[i + 2] = value - stone.warm * 0.27 * shoulder;
      color[i + 3] = 255;
    }
  }
  const at = (x, y) => height[((y + SIZE) % SIZE) * SIZE + ((x + SIZE) % SIZE)];
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      const dx = (at(x + 1, y) - at(x - 1, y)) * 2.3;
      const dy = (at(x, y + 1) - at(x, y - 1)) * 2.3;
      const length = Math.hypot(dx, dy, 1), i = (y * SIZE + x) * 4;
      normals[i] = (0.5 - dx / length * 0.5) * 255;
      normals[i + 1] = (0.5 - dy / length * 0.5) * 255;
      normals[i + 2] = (0.5 + 1 / length * 0.5) * 255;
      normals[i + 3] = 255;
    }
  }
  return { map: makeCanvas(color), normal: makeCanvas(normals) };
}

export function adoquinesBurelaMaterial(repeatX = 1, repeatY = 1, { vertexColors = false } = {}) {
  canvases ??= createCanvases();
  const texture = (canvas, colorSpace) => {
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = colorSpace;
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(repeatX, repeatY);
    tex.anisotropy = 8;
    return tex;
  };
  return new THREE.MeshStandardMaterial({
    map: texture(canvases.map, THREE.SRGBColorSpace),
    normalMap: texture(canvases.normal, THREE.NoColorSpace),
    normalScale: new THREE.Vector2(0.65, 0.65),
    roughness: 0.96,
    metalness: 0,
    vertexColors,
  });
}
