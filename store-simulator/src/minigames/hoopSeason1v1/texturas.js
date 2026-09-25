// Texturas de la cancha de barrio — TODAS dibujadas por código en un <canvas>.
//
// Por qué procedurales y no imágenes descargadas:
//   - Pesan 0 KB. El presupuesto de primera carga del simulador ya está en
//     15,44 MB sobre un tope de 20: un set PBR de asfalto real son 3-8 MB.
//   - Es la misma doctrina que ya usan `world/textures.js`, `texturasBurela.js`
//     y `hoopArena.js`. No inauguramos una forma nueva de hacer las cosas.
//   - Se cambian tocando un número de este archivo, no reexportando un asset.
//
// Lo que hace que NO se vea "genérico de three.js" no es la resolución de la
// textura: es que haya suciedad, parches, manchas y pintura saltada. Una
// superficie perfecta siempre lee como plástico.
import * as THREE from 'three';

// Cache: la cancha se puede construir y destruir muchas veces (cada partida).
// Regenerar los canvas en cada `mount` es tirar CPU al pedo.
const cache = new Map();
const unaVez = (clave, crear) => {
  if (!cache.has(clave)) cache.set(clave, crear());
  return cache.get(clave);
};

/** Libera todas las texturas cacheadas. Se llama al cerrar el juego. */
export function liberarTexturas() {
  for (const tex of cache.values()) tex.dispose?.();
  cache.clear();
}

function lienzo(w, h) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return c;
}

// Ruido de valor con interpolación suave. `Math.random()` puro sale con grano
// de televisor: se ve digital. Esto sale con manchones, que es como se ve la
// suciedad de verdad.
function ruidoSuave(w, h, celda, semilla = 1) {
  const cols = Math.ceil(w / celda) + 1;
  const filas = Math.ceil(h / celda) + 1;
  const puntos = new Float32Array(cols * filas);
  let s = semilla * 9301 + 49297;
  const rnd = () => { s = (s * 9301 + 49297) % 233280; return s / 233280; };
  for (let i = 0; i < puntos.length; i++) puntos[i] = rnd();

  const suave = (t) => t * t * (3 - 2 * t);
  const salida = new Float32Array(w * h);
  for (let y = 0; y < h; y++) {
    const gy = y / celda, y0 = Math.floor(gy), fy = suave(gy - y0);
    for (let x = 0; x < w; x++) {
      const gx = x / celda, x0 = Math.floor(gx), fx = suave(gx - x0);
      const a = puntos[y0 * cols + x0], b = puntos[y0 * cols + x0 + 1];
      const c = puntos[(y0 + 1) * cols + x0], d = puntos[(y0 + 1) * cols + x0 + 1];
      salida[y * w + x] = (a * (1 - fx) + b * fx) * (1 - fy) + (c * (1 - fx) + d * fx) * fy;
    }
  }
  return salida;
}

// Varias octavas de ruido sumadas: la primera da los manchones grandes, las
// últimas el grano fino. Es lo que separa una textura creíble de una mancha.
function fractal(w, h, celdaBase, octavas, semilla = 1) {
  const total = new Float32Array(w * h);
  let amplitud = 1, suma = 0, celda = celdaBase;
  for (let o = 0; o < octavas; o++) {
    const capa = ruidoSuave(w, h, Math.max(2, Math.round(celda)), semilla + o * 17);
    for (let i = 0; i < total.length; i++) total[i] += capa[i] * amplitud;
    suma += amplitud;
    amplitud *= 0.5;
    celda *= 0.5;
  }
  for (let i = 0; i < total.length; i++) total[i] /= suma;
  return total;
}

// Convierte un mapa de altura (0..1) en un normal map. Sobel de toda la vida.
// Se hace acá y no con un `bumpMap` porque el bake de Blender ignora el nodo
// Bump (ya nos pasó con el pelo de BOB) y porque un normal real reacciona a la
// luz rasante del atardecer, que es la que le da textura al asfalto.
function normalDesdeAltura(altura, w, h, fuerza = 2.2) {
  const c = lienzo(w, h);
  const g = c.getContext('2d');
  const img = g.createImageData(w, h);
  const en = (x, y) => altura[((y + h) % h) * w + ((x + w) % w)];
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const dx = (en(x + 1, y) - en(x - 1, y)) * fuerza;
      const dy = (en(x, y + 1) - en(x, y - 1)) * fuerza;
      // normalizar (-dx, -dy, 1)
      const len = Math.hypot(dx, dy, 1);
      const i = (y * w + x) * 4;
      img.data[i] = ((-dx / len) * 0.5 + 0.5) * 255;
      img.data[i + 1] = ((-dy / len) * 0.5 + 0.5) * 255;
      img.data[i + 2] = ((1 / len) * 0.5 + 0.5) * 255;
      img.data[i + 3] = 255;
    }
  }
  g.putImageData(img, 0, 0);
  return c;
}

function texturaDe(canvas, { repeticion = 1, srgb = false } = {}) {
  const t = new THREE.CanvasTexture(canvas);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(repeticion, repeticion);
  t.anisotropy = 8;
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// ---------------------------------------------------------------------------
// ASFALTO
// ---------------------------------------------------------------------------
// 512 px que cubren 4 m de cancha (≈8 px por cm). Se repite. El detalle grande
// —parches, manchas de aceite, rajaduras— NO va acá: va como calcomanías
// sueltas en `cancha.js`, para que no se note el patrón repetido.

const ASFALTO_METROS = 4;
export { ASFALTO_METROS };

export const asfaltoColor = () => unaVez('asfalto-color', () => {
  const N = 512;
  const c = lienzo(N, N);
  const g = c.getContext('2d');
  const grueso = fractal(N, N, 90, 3, 3);
  const fino = fractal(N, N, 7, 3, 11);
  const img = g.createImageData(N, N);
  for (let i = 0; i < N * N; i++) {
    // gris asfalto: base 62, los manchones lo mueven ±18 y el grano ±14
    const v = 62 + (grueso[i] - 0.5) * 36 + (fino[i] - 0.5) * 28;
    // el asfalto real tira apenas a marrón/violeta, nunca a gris puro
    const j = i * 4;
    img.data[j] = Math.max(0, Math.min(255, v + 4));
    img.data[j + 1] = Math.max(0, Math.min(255, v + 1));
    img.data[j + 2] = Math.max(0, Math.min(255, v - 2));
    img.data[j + 3] = 255;
  }
  g.putImageData(img, 0, 0);

  // piedritas sueltas del árido: puntos claros muy chicos
  for (let i = 0; i < 2600; i++) {
    const x = Math.random() * N, y = Math.random() * N;
    const r = 0.5 + Math.random() * 1.6;
    g.fillStyle = `rgba(${140 + Math.random() * 60 | 0},${138 + Math.random() * 55 | 0},${132 + Math.random() * 50 | 0},${0.15 + Math.random() * 0.35})`;
    g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();
  }
  return texturaDe(c, { srgb: true });
});

export const asfaltoNormal = () => unaVez('asfalto-normal', () => {
  const N = 512;
  const altura = fractal(N, N, 9, 4, 23);
  return texturaDe(normalDesdeAltura(altura, N, N, 2.6));
});

// ---------------------------------------------------------------------------
// PINTURA SALTADA (alphaMap de las líneas)
// ---------------------------------------------------------------------------
// Las líneas de la cancha son geometría de verdad (nítidas a cualquier
// distancia, un solo draw call, 0 VRAM). Lo que las hace ver viejas es este
// mapa de alfa: come pintura de forma irregular, como una cancha real.
export const pinturaGastada = () => unaVez('pintura-gastada', () => {
  const N = 256;
  const c = lienzo(N, N);
  const g = c.getContext('2d');
  const mapa = fractal(N, N, 24, 4, 41);
  const img = g.createImageData(N, N);
  for (let i = 0; i < N * N; i++) {
    // curva dura: casi todo queda pintado, y se abren pocos huecos marcados
    const v = Math.max(0, Math.min(1, (mapa[i] - 0.28) * 3.4));
    const j = i * 4;
    img.data[j] = img.data[j + 1] = img.data[j + 2] = 255;
    img.data[j + 3] = v * 255;
  }
  g.putImageData(img, 0, 0);
  return texturaDe(c, { repeticion: 6 });
});

// ---------------------------------------------------------------------------
// MANCHAS Y PARCHES (calcomanías sobre el asfalto)
// ---------------------------------------------------------------------------
// Manchón oscuro de borde suave: aceite, humedad, goma quemada.
export const manchaAceite = () => unaVez('mancha-aceite', () => {
  const N = 128;
  const c = lienzo(N, N);
  const g = c.getContext('2d');
  const mapa = fractal(N, N, 30, 3, 57);
  const img = g.createImageData(N, N);
  for (let i = 0; i < N * N; i++) {
    const x = (i % N) / N - 0.5, y = Math.floor(i / N) / N - 0.5;
    // círculo con borde comido por el ruido: nunca un círculo perfecto
    const borde = 1 - Math.min(1, Math.hypot(x, y) * 2.15);
    const a = Math.max(0, Math.min(1, borde * 1.5 * (0.35 + mapa[i])));
    const j = i * 4;
    img.data[j] = 24; img.data[j + 1] = 22; img.data[j + 2] = 20;
    img.data[j + 3] = a * 210;
  }
  g.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
});

// Parche de bacheo: el asfalto nuevo es más oscuro y de grano distinto, con
// borde recto irregular. Es EL detalle que dice "esta cancha tiene años".
export const parcheAsfalto = () => unaVez('parche-asfalto', () => {
  const N = 128;
  const c = lienzo(N, N);
  const g = c.getContext('2d');
  const grano = fractal(N, N, 6, 3, 71);
  const img = g.createImageData(N, N);
  for (let i = 0; i < N * N; i++) {
    const v = 44 + (grano[i] - 0.5) * 30;
    const j = i * 4;
    img.data[j] = v; img.data[j + 1] = v - 1; img.data[j + 2] = v - 3;
    img.data[j + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
});

// ---------------------------------------------------------------------------
// ALAMBRADO OLÍMPICO
// ---------------------------------------------------------------------------
// Rombos con alfa. Va con `alphaTest` y NO con `transparent`: un material
// transparente entra en la cola de ordenamiento y a través de él se ven mal
// los objetos de atrás. Con alphaTest el alambre escribe profundidad como
// cualquier sólido y no hay artefactos.
export const alambradoTex = () => unaVez('alambrado', () => {
  const N = 128;
  const c = lienzo(N, N);
  const g = c.getContext('2d');
  g.clearRect(0, 0, N, N);
  g.lineCap = 'round';
  const paso = N / 4;                 // 4 rombos por baldosa
  for (let i = -4; i <= 8; i++) {
    // el alambre galvanizado no es un color plano: cada hilo varía
    const claro = 168 + Math.random() * 40 | 0;
    g.strokeStyle = `rgb(${claro},${claro + 4},${claro + 8})`;
    g.lineWidth = 2.6;
    g.beginPath(); g.moveTo(i * paso, 0); g.lineTo(i * paso + N, N); g.stroke();
    g.beginPath(); g.moveTo(i * paso, N); g.lineTo(i * paso + N, 0); g.stroke();
  }
  return texturaDe(c, { srgb: true });
});

// ---------------------------------------------------------------------------
// TABLERO
// ---------------------------------------------------------------------------
// Chapa pintada de blanco, gastada, con el cuadro negro reglamentario
// (0,59 × 0,45 m) y el borde. Nada de plexiglás: en el barrio el tablero es
// de chapa o de fibra, y se nota que comió lluvia.
export const tableroTex = () => unaVez('tablero', () => {
  const W = 512, H = Math.round(512 * (1.07 / 1.83)); // misma proporción que el tablero
  const c = lienzo(W, H);
  const g = c.getContext('2d');

  g.fillStyle = '#dedbd2';
  g.fillRect(0, 0, W, H);

  // suciedad y decoloración
  const suciedad = fractal(W, H, 40, 3, 91);
  const img = g.getImageData(0, 0, W, H);
  for (let i = 0; i < W * H; i++) {
    const v = (suciedad[i] - 0.5) * 46;
    const j = i * 4;
    img.data[j] += v; img.data[j + 1] += v - 2; img.data[j + 2] += v - 6;
  }
  g.putImageData(img, 0, 0);

  // óxido bajando desde los bulones de arriba
  for (const bx of [W * 0.22, W * 0.78]) {
    const grad = g.createLinearGradient(bx, H * 0.08, bx, H * 0.55);
    grad.addColorStop(0, 'rgba(122,64,28,0.55)');
    grad.addColorStop(1, 'rgba(122,64,28,0)');
    g.fillStyle = grad;
    g.fillRect(bx - 9, H * 0.08, 18, H * 0.5);
  }

  // borde perimetral
  g.strokeStyle = '#1d1f22'; g.lineWidth = W * 0.018;
  g.strokeRect(W * 0.02, H * 0.03, W * 0.96, H * 0.94);

  // cuadro interior reglamentario, apoyado sobre la línea del aro
  const cw = W * (0.59 / 1.83), ch = H * (0.45 / 1.07);
  const cx = (W - cw) / 2, cy = H * 0.955 - ch;
  g.lineWidth = W * 0.016;
  g.strokeRect(cx, cy, cw, ch);

  // pintura saltada encima de todo: se come pedacitos de las líneas
  const gastado = fractal(W, H, 18, 4, 103);
  const img2 = g.getImageData(0, 0, W, H);
  for (let i = 0; i < W * H; i++) {
    if (gastado[i] > 0.66) {
      const j = i * 4;
      const mezcla = (gastado[i] - 0.66) * 2.4;
      img2.data[j] += (198 - img2.data[j]) * mezcla;
      img2.data[j + 1] += (194 - img2.data[j + 1]) * mezcla;
      img2.data[j + 2] += (186 - img2.data[j + 2]) * mezcla;
    }
  }
  g.putImageData(img2, 0, 0);

  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
});

// ---------------------------------------------------------------------------
// PASTO / YUYOS
// ---------------------------------------------------------------------------
// Matita con alfa para plantar en las rajaduras y contra el alambrado.
export const yuyoTex = () => unaVez('yuyo', () => {
  const N = 64;
  const c = lienzo(N, N);
  const g = c.getContext('2d');
  g.clearRect(0, 0, N, N);
  for (let i = 0; i < 14; i++) {
    const x = 8 + Math.random() * (N - 16);
    const alto = 22 + Math.random() * 34;
    const curva = (Math.random() - 0.5) * 20;
    const verde = 60 + Math.random() * 45 | 0;
    g.strokeStyle = `rgb(${verde + 22},${verde + 40},${34 + Math.random() * 20 | 0})`;
    g.lineWidth = 1.4 + Math.random();
    g.beginPath();
    g.moveTo(x, N);
    g.quadraticCurveTo(x + curva * 0.5, N - alto * 0.6, x + curva, N - alto);
    g.stroke();
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
});
