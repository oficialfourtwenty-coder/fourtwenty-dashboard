// Texturas procedurales 256px estilo PS2 (obra gruesa, neutras).
// Cuando haya arte de marca real, se reemplazan por PNGs en /public/assets.
import * as THREE from 'three';

const SIZE = 256;

function makeCanvas() {
  const c = document.createElement('canvas');
  c.width = SIZE;
  c.height = SIZE;
  return c;
}

function toTexture(canvas, repeatX = 1, repeatY = 1) {
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  // filtrado suave con mipmaps (pase visual GTA V): nada de pixelado involuntario
  tex.magFilter = THREE.LinearFilter;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.generateMipmaps = true;
  tex.anisotropy = 8;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeatX, repeatY);
  return tex;
}

function noise(ctx, base, amount, count = 900) {
  for (let i = 0; i < count; i++) {
    const v = (Math.random() - 0.5) * amount;
    ctx.fillStyle = `rgba(${v > 0 ? 255 : 0},${v > 0 ? 255 : 0},${v > 0 ? 255 : 0},${Math.abs(v)})`;
    ctx.fillRect(Math.floor(Math.random() * SIZE), Math.floor(Math.random() * SIZE), 2, 2);
  }
}

// ---- Mapa de relieve a partir de una imagen de altura ----------------------
// ⚠️ POR QUE HACE FALTA. Un piso dibujado es un DIBUJO de un piso: la luz le
// pega igual en la junta que en la baldosa, asi que se lee plano por mas fina
// que sea la textura. Con el mapa de relieve la junta se hunde de verdad y el
// borde de cada baldosa agarra un brillito distinto segun de donde venga el
// sol. Es la diferencia entre "papel pintado" y "piso".
//
// Se calcula con Sobel: se mira cuanto cambia la altura hacia los costados y
// eso da la inclinacion de cada punto. Cuesta 0 KB de descarga.
function normalDesdeAltura(lienzoAltura, fuerza = 2.4) {
  const n = lienzoAltura.width;
  const src = lienzoAltura.getContext('2d', { willReadFrequently: true }).getImageData(0, 0, n, n).data;
  const salida = document.createElement('canvas');
  salida.width = n; salida.height = n;
  const ctx = salida.getContext('2d');
  const img = ctx.createImageData(n, n);
  // el % n hace que el relieve tambien sea continuo en los bordes: si no, se
  // ve una costura iluminada donde la textura se repite.
  const alt = (x, y) => src[(((y + n) % n) * n + ((x + n) % n)) * 4] / 255;
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      const dx = (alt(x + 1, y) - alt(x - 1, y)) * fuerza;
      const dy = (alt(x, y + 1) - alt(x, y - 1)) * fuerza;
      const largo = Math.hypot(dx, dy, 1);
      const i = (y * n + x) * 4;
      img.data[i] = ((-dx / largo) * 0.5 + 0.5) * 255;
      img.data[i + 1] = ((-dy / largo) * 0.5 + 0.5) * 255;
      img.data[i + 2] = ((1 / largo) * 0.5 + 0.5) * 255;
      img.data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  return salida;
}

function texturaLisa(lienzo, repeatX, repeatY, { colorSpace = THREE.SRGBColorSpace } = {}) {
  const tex = new THREE.CanvasTexture(lienzo);
  tex.colorSpace = colorSpace;
  tex.magFilter = THREE.LinearFilter;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.generateMipmaps = true;
  tex.anisotropy = 8;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeatX, repeatY);
  return tex;
}

// Granito lavado: el punteado blanco y negro del arido. Es lo que hace que la
// baldosa portena no se vea como un carton gris.
function granito(ctx, n, cantidad, claro = 0.5) {
  for (let i = 0; i < cantidad; i++) {
    const x = Math.random() * n, y = Math.random() * n;
    const r = 0.4 + Math.random() * 1.1;
    const v = Math.random() < claro ? 235 + Math.random() * 20 : 60 + Math.random() * 50;
    ctx.fillStyle = `rgba(${v},${v},${v - 3},${0.20 + Math.random() * 0.35})`;
    ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill();
  }
}

// Hormigón alisado (piso) con juntas de losa.
export function concreteFloor(repeatX, repeatY) {
  const c = makeCanvas();
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#8d8578';
  ctx.fillRect(0, 0, SIZE, SIZE);
  noise(ctx, 0, 0.10, 1400);
  ctx.strokeStyle = '#6f685d';
  ctx.lineWidth = 3;
  ctx.strokeRect(1, 1, SIZE - 2, SIZE - 2);
  // manchas de obra
  for (let i = 0; i < 6; i++) {
    ctx.fillStyle = 'rgba(90,82,70,0.18)';
    ctx.beginPath();
    ctx.ellipse(Math.random() * SIZE, Math.random() * SIZE, 18 + Math.random() * 26, 10 + Math.random() * 18, Math.random() * 3, 0, Math.PI * 2);
    ctx.fill();
  }
  return toTexture(c, repeatX, repeatY);
}

// Revoque crema (paredes) con zócalo marcado.
export function plasterWall(repeatX, repeatY) {
  const c = makeCanvas();
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#e8ddc4';
  ctx.fillRect(0, 0, SIZE, SIZE);
  noise(ctx, 0, 0.07, 1100);
  // sombreado sutil arriba
  const g = ctx.createLinearGradient(0, 0, 0, SIZE);
  g.addColorStop(0, 'rgba(60,50,35,0.14)');
  g.addColorStop(0.25, 'rgba(0,0,0,0)');
  g.addColorStop(1, 'rgba(60,50,35,0.10)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, SIZE, SIZE);
  return toTexture(c, repeatX, repeatY);
}

// Losa vista desde abajo (cielorraso de hormigón).
export function concreteCeiling(repeatX, repeatY) {
  const c = makeCanvas();
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#7a7268';
  ctx.fillRect(0, 0, SIZE, SIZE);
  noise(ctx, 0, 0.08, 1000);
  // marcas de encofrado
  ctx.strokeStyle = 'rgba(50,45,38,0.35)';
  ctx.lineWidth = 2;
  for (let x = 0; x <= SIZE; x += 64) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, SIZE); ctx.stroke();
  }
  return toTexture(c, repeatX, repeatY);
}

// Escalera: hormigón con narices marcadas.
export function stairConcrete(repeatX, repeatY) {
  const c = makeCanvas();
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#948b7d';
  ctx.fillRect(0, 0, SIZE, SIZE);
  noise(ctx, 0, 0.09, 900);
  ctx.fillStyle = 'rgba(50,45,38,0.5)';
  for (let y = 0; y < SIZE; y += 32) ctx.fillRect(0, y, SIZE, 4);
  return toTexture(c, repeatX, repeatY);
}

// Piso blanco: baldosas 2m con junta gris clara (look showroom GTA SA).
export function whiteFloor(repeatX, repeatY) {
  const c = makeCanvas();
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#f2f1ed';
  ctx.fillRect(0, 0, SIZE, SIZE);
  noise(ctx, 0, 0.04, 700);
  ctx.strokeStyle = '#c9c7c0';
  ctx.lineWidth = 4;
  ctx.strokeRect(2, 2, SIZE - 4, SIZE - 4);
  // brillo sutil diagonal (piso pulido)
  const g = ctx.createLinearGradient(0, 0, SIZE, SIZE);
  g.addColorStop(0, 'rgba(255,255,255,0.10)');
  g.addColorStop(0.5, 'rgba(0,0,0,0)');
  g.addColorStop(1, 'rgba(120,120,115,0.08)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, SIZE, SIZE);
  return toTexture(c, repeatX, repeatY);
}

// Pared blanca tiza con textura leve.
export function whitePlaster(repeatX, repeatY) {
  const c = makeCanvas();
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#efece4';
  ctx.fillRect(0, 0, SIZE, SIZE);
  noise(ctx, 0, 0.05, 900);
  const g = ctx.createLinearGradient(0, 0, 0, SIZE);
  g.addColorStop(0, 'rgba(70,70,65,0.10)');
  g.addColorStop(0.3, 'rgba(0,0,0,0)');
  g.addColorStop(1, 'rgba(70,70,65,0.07)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, SIZE, SIZE);
  return toTexture(c, repeatX, repeatY);
}

// Cielorraso gris claro con placas.
export function lightCeiling(repeatX, repeatY) {
  const c = makeCanvas();
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#dcdad4';
  ctx.fillRect(0, 0, SIZE, SIZE);
  noise(ctx, 0, 0.04, 600);
  ctx.strokeStyle = 'rgba(120,118,112,0.5)';
  ctx.lineWidth = 2;
  for (let x = 0; x <= SIZE; x += 64) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, SIZE); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, x); ctx.lineTo(SIZE, x); ctx.stroke();
  }
  return toTexture(c, repeatX, repeatY);
}

// Ventana con luz de día blanca (unlit, luz "falsa" estilo PS2).
export function windowDaylight() {
  const c = makeCanvas();
  const ctx = c.getContext('2d');
  const g = ctx.createLinearGradient(0, 0, 0, SIZE);
  g.addColorStop(0, '#eaf2f8');
  g.addColorStop(0.6, '#cfe0ec');
  g.addColorStop(1, '#a9c2d4');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, SIZE, SIZE);
  ctx.fillStyle = '#4a4a45';
  ctx.fillRect(0, 0, SIZE, 8); ctx.fillRect(0, SIZE - 8, SIZE, 8);
  ctx.fillRect(0, 0, 8, SIZE); ctx.fillRect(SIZE - 8, 0, 8, SIZE);
  ctx.fillRect(SIZE / 2 - 4, 0, 8, SIZE);
  return toTexture(c);
}

// Fachada de la torre (Burela 2570, spec 04/05): bandas horizontales de
// ladrillo rojo #A44E32 alternando revoque crema #E1DDC6 + balcones con
// baranda verde reja #3E6B60. Vista de fondo, solo la silueta de colores.
export function towerFacade(repeatX, repeatY) {
  const c = makeCanvas();
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#E1DDC6'; // revoque crema
  ctx.fillRect(0, 0, SIZE, SIZE);
  // bandas de ladrillo terracota
  const bands = [[0, 34], [70, 40], [150, 30], [210, 46]];
  ctx.fillStyle = '#A44E32';
  for (const [y, h] of bands) ctx.fillRect(0, y, SIZE, h);
  noise(ctx, 0, 0.05, 800);
  // balcones: baranda verde + sombra del hueco
  ctx.fillStyle = 'rgba(30,25,20,0.35)';
  for (let y = 8; y < SIZE; y += 32) ctx.fillRect(4, y, SIZE - 8, 14);
  ctx.strokeStyle = '#3E6B60';
  ctx.lineWidth = 2;
  for (let y = 20; y < SIZE; y += 32) {
    ctx.beginPath(); ctx.moveTo(4, y); ctx.lineTo(SIZE - 4, y); ctx.stroke();
    for (let x = 8; x < SIZE; x += 14) { ctx.beginPath(); ctx.moveTo(x, y - 8); ctx.lineTo(x, y); ctx.stroke(); }
  }
  return toTexture(c, repeatX, repeatY);
}

// Persiana/reja metálica verde inglés (locales cerrados de la galería).
export function greenShutter(repeatX, repeatY) {
  const c = makeCanvas();
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#2F5A3A'; // verde inglés
  ctx.fillRect(0, 0, SIZE, SIZE);
  ctx.strokeStyle = 'rgba(0,0,0,0.28)';
  ctx.lineWidth = 3;
  for (let y = 0; y < SIZE; y += 14) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(SIZE, y); ctx.stroke(); }
  ctx.strokeStyle = 'rgba(255,255,255,0.08)';
  for (let y = 4; y < SIZE; y += 14) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(SIZE, y); ctx.stroke(); }
  return toTexture(c, repeatX, repeatY);
}

// Vereda baldosa gris hormigón #B4AEA2, 0.40m cuadriculada (spec 04).
// BALDOSA GRANITICA 20x20 — la vereda de Burela.
//
// Sale de la foto que saco Kusher en la vereda. Lo que la define, y lo que la
// version vieja no tenia:
//   · cada baldosa de 20 cm esta dividida en una CUADRICULA de cuadritos de
//     ~2,5 cm, cada uno apenas levantado, con su ranura alrededor. Antes era un
//     gris liso con lineas cada 64 px: por eso se veia como carton.
//   · el material es granitico: punteado blanco y negro del arido.
//   · entre baldosa y baldosa hay una junta mas marcada que las ranuras.
//
// ⚠️ Devuelve TAMBIEN el mapa de relieve. Sin el, los cuadritos son un dibujo
// y el piso sigue leyendose plano. Ver `normalDesdeAltura`.
//
// El lienzo cubre 1,6 m (8 baldosas de 20 cm), asi que 512 px / 1,6 m da
// 64 px por baldosa y 8 px por cuadrito: numeros enteros, y por eso la textura
// repite sin costura.
export const VEREDA_METROS = 2.4;

export function veredaTile(repeatX, repeatY) {
  return veredaGranitica(repeatX, repeatY).map;
}

export function veredaGranitica(repeatX, repeatY) {
  const n = 512;
  const BALDOSA = 64;          // 20 cm
  const CUADRITO = 8;          // 2,5 cm
  const RANURA = 3;

  const color = document.createElement('canvas'); color.width = color.height = n;
  const alto = document.createElement('canvas'); alto.width = alto.height = n;
  const c = color.getContext('2d', { willReadFrequently: true });
  const a = alto.getContext('2d');

  // Fondo = la ranura (lo hundido). Encima se dibuja cada cuadrito.
  c.fillStyle = '#55585c'; c.fillRect(0, 0, n, n);
  a.fillStyle = '#303030'; a.fillRect(0, 0, n, n);

  // Tono propio por baldosa: en la vereda real ninguna es igual a la de al lado.
  const tono = [];
  for (let i = 0; i < (n / BALDOSA) ** 2; i++) tono.push((Math.random() - 0.5) * 16);

  for (let by = 0; by < n; by += BALDOSA) {
    for (let bx = 0; bx < n; bx += BALDOSA) {
      const t = tono[(by / BALDOSA) * (n / BALDOSA) + bx / BALDOSA];
      for (let y = by; y < by + BALDOSA; y += CUADRITO) {
        for (let x = bx; x < bx + BALDOSA; x += CUADRITO) {
          // La ⚠️ del gris FRIO: el azul va un punto arriba del rojo. Con un
          // gris neutro el sol calido de la escena lo dejaba CREMA, no gris —
          // se vio en la primera captura y era lo que mas lo alejaba de la foto.
          const v = Math.round(150 + t + (Math.random() - 0.5) * 7);
          c.fillStyle = `rgb(${v - 3},${v},${v + 4})`;
          c.fillRect(x + RANURA / 2, y + RANURA / 2, CUADRITO - RANURA, CUADRITO - RANURA);
          a.fillStyle = '#d8d8d8';
          a.fillRect(x + RANURA / 2, y + RANURA / 2, CUADRITO - RANURA, CUADRITO - RANURA);
        }
      }
    }
  }

  // Junta entre baldosas: mas ancha y mas oscura que las ranuras.
  c.strokeStyle = 'rgba(58,60,64,0.9)'; c.lineWidth = 4;
  a.strokeStyle = '#1e1e1e'; a.lineWidth = 3;
  for (let k = 0; k <= n; k += BALDOSA) {
    for (const ctx2 of [c, a]) {
      ctx2.beginPath(); ctx2.moveTo(k, 0); ctx2.lineTo(k, n); ctx2.stroke();
      ctx2.beginPath(); ctx2.moveTo(0, k); ctx2.lineTo(n, k); ctx2.stroke();
    }
  }

  granito(c, n, 9000, 0.55);

  // Manchas grandes de humedad/suciedad. Van al final y solo en el color: son
  // suciedad, no relieve.
  for (let i = 0; i < 14; i++) {
    const x = Math.random() * n, y = Math.random() * n, r = 20 + Math.random() * 70;
    const g = c.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, `rgba(90,88,84,${0.05 + Math.random() * 0.07})`);
    g.addColorStop(1, 'rgba(90,88,84,0)');
    c.fillStyle = g; c.beginPath(); c.arc(x, y, r, 0, 7); c.fill();
  }

  return {
    map: texturaLisa(color, repeatX, repeatY),
    normalMap: texturaLisa(normalDesdeAltura(alto, 2.0), repeatX, repeatY, { colorSpace: THREE.NoColorSpace }),
  };
}

// BALDOSON HEXAGONAL "panal de abeja" — el otro piso de la vereda de Burela.
//
// ⚠️ ESTABA DEL COLOR EQUIVOCADO. Era beige tostado (#C3AC8E) con junta marron,
// como un patio de campo. En la foto de Kusher es HORMIGON GRIS, bastante
// desaturado, con la junta oscura y ancha y cada pieza de un tono apenas
// distinto. Ese color de mas era lo que mas lo delataba.
//
// El lienzo cubre 1,2 m con hexagonos de ~20 cm entre caras, que es la medida
// real del baldoson.
//
// ⚠️ Los periodos horizontal y vertical se eligen para que 512 sea multiplo
// exacto de los dos (5 y 3), asi la textura repite sin costura. Eso deja los
// hexagonos un 4% mas anchos que un hexagono regular perfecto; a la distancia
// a la que se mira un piso no se nota, y una costura si se nota.
export const HEX_METROS = 1.7;

export function hexPaver(repeatX, repeatY) {
  return hexPaverPs3(repeatX, repeatY).map;
}

export function hexPaverPs3(repeatX, repeatY) {
  const n = 512;
  const PASO_X = n / 5;              // 102,4 px entre centros a lo ancho
  const PASO_Y = n / 3;              // 170,67 px cada DOS filas
  const R = PASO_Y / 3;              // radio del hexagono (punta arriba)

  const color = document.createElement('canvas'); color.width = color.height = n;
  const alto = document.createElement('canvas'); alto.width = alto.height = n;
  const c = color.getContext('2d', { willReadFrequently: true });
  const a = alto.getContext('2d');

  c.fillStyle = '#4e5155'; c.fillRect(0, 0, n, n);   // junta
  a.fillStyle = '#2a2a2a'; a.fillRect(0, 0, n, n);

  const camino = (ctx, cx, cy, r) => {
    ctx.beginPath();
    for (let k = 0; k < 6; k++) {
      const ang = Math.PI / 180 * (60 * k - 30);
      // el 1,04 es el ensanche que compensa el paso elegido para que encastre
      const px = cx + r * 1.04 * Math.cos(ang), py = cy + r * Math.sin(ang);
      k === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
    }
    ctx.closePath();
  };

  // Se dibuja una fila de mas para arriba y para abajo para que las piezas
  // cortadas por el borde coincidan con las del otro lado.
  for (let fila = -2; fila <= 8; fila++) {
    const cy = fila * (PASO_Y / 2);
    const desfase = (fila % 2 === 0 ? 0 : PASO_X / 2);
    for (let col = -1; col <= 6; col++) {
      const cx = col * PASO_X + desfase;
      const t = (Math.random() - 0.5) * 22;
      const v = Math.round(138 + t);
      c.fillStyle = `rgb(${v - 3},${v},${v + 5})`;
      camino(c, cx, cy, R - 2.5); c.fill();
      a.fillStyle = '#d2d2d2';
      camino(a, cx, cy, R - 2.5); a.fill();
    }
  }

  granito(c, n, 6500, 0.45);

  // Humedad y hollin: en la foto hay piezas claramente mas oscuras que otras.
  for (let i = 0; i < 18; i++) {
    const x = Math.random() * n, y = Math.random() * n, r = 25 + Math.random() * 85;
    const g = c.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, `rgba(70,70,68,${0.05 + Math.random() * 0.09})`);
    g.addColorStop(1, 'rgba(70,70,68,0)');
    c.fillStyle = g; c.beginPath(); c.arc(x, y, r, 0, 7); c.fill();
  }

  return {
    map: texturaLisa(color, repeatX, repeatY),
    normalMap: texturaLisa(normalDesdeAltura(alto, 2.6), repeatX, repeatY, { colorSpace: THREE.NoColorSpace }),
  };
}

// Madera clara (roble/paraíso) para el mobiliario del local real: panel del
// neón, escritorio, estante, divisor — veta vertical suave.
export function lightWood(repeatX, repeatY) {
  const c = makeCanvas();
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#cfc0a4';
  ctx.fillRect(0, 0, SIZE, SIZE);
  for (let x = 0; x < SIZE; x += 6 + Math.random() * 10) {
    ctx.strokeStyle = `rgba(120,95,60,${0.06 + Math.random() * 0.1})`;
    ctx.lineWidth = 1 + Math.random() * 2;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.bezierCurveTo(x + 4, SIZE * 0.3, x - 4, SIZE * 0.7, x + 2, SIZE);
    ctx.stroke();
  }
  noise(ctx, 0, 0.04, 500);
  return toTexture(c, repeatX, repeatY);
}

// Vidriera / ventana: cielo cálido de atardecer (unlit, da luz "falsa" PS2).
export function windowGlow() {
  const c = makeCanvas();
  const ctx = c.getContext('2d');
  const g = ctx.createLinearGradient(0, 0, 0, SIZE);
  g.addColorStop(0, '#f7d9a0');
  g.addColorStop(0.55, '#e8a96b');
  g.addColorStop(1, '#b97a4e');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, SIZE, SIZE);
  // carpintería
  ctx.fillStyle = '#3a3128';
  ctx.fillRect(0, 0, SIZE, 8); ctx.fillRect(0, SIZE - 8, SIZE, 8);
  ctx.fillRect(0, 0, 8, SIZE); ctx.fillRect(SIZE - 8, 0, 8, SIZE);
  ctx.fillRect(SIZE / 2 - 4, 0, 8, SIZE);
  return toTexture(c);
}
