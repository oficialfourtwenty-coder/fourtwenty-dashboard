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
export function veredaTile(repeatX, repeatY) {
  const c = makeCanvas();
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#B4AEA2';
  ctx.fillRect(0, 0, SIZE, SIZE);
  noise(ctx, 0, 0.07, 1100);
  ctx.strokeStyle = '#8f8c82';
  ctx.lineWidth = 3;
  for (let x = 0; x <= SIZE; x += 64) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, SIZE); ctx.stroke(); }
  for (let y = 0; y <= SIZE; y += 64) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(SIZE, y); ctx.stroke(); }
  // alguna baldosa manchada / "panza de sapo"
  for (let i = 0; i < 5; i++) {
    ctx.fillStyle = 'rgba(90,85,75,0.14)';
    ctx.fillRect(Math.floor(Math.random() * 4) * 64, Math.floor(Math.random() * 4) * 64, 64, 64);
  }
  return toTexture(c, repeatX, repeatY);
}

// Piso de plaza seca: adoquín/pastilla HEXAGONAL "panal de abeja" tostado
// #C3AC8E (spec 04), juntas oscuras, variación de tono pieza a pieza.
export function hexPaver(repeatX, repeatY) {
  const c = makeCanvas();
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#8f7c60'; // junta oscura de fondo
  ctx.fillRect(0, 0, SIZE, SIZE);
  const R = 20;                       // radio del hexágono
  const w = Math.sqrt(3) * R;         // ancho (flat-top)
  const h = 1.5 * R;                  // avance vertical entre filas
  const hexPath = (cx, cy) => {
    ctx.beginPath();
    for (let k = 0; k < 6; k++) {
      const a = Math.PI / 180 * (60 * k - 30);
      const px = cx + R * Math.cos(a), py = cy + R * Math.sin(a);
      k === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
    }
    ctx.closePath();
  };
  for (let row = -1, y = 0; y < SIZE + R; row++, y = row * h) {
    const xoff = (row % 2) * (w / 2);
    for (let x = -w; x < SIZE + w; x += w) {
      const t = (Math.random() - 0.5) * 18;
      ctx.fillStyle = `rgb(${195 + t},${172 + t},${142 + t})`; // #C3AC8E ± jitter
      hexPath(x + xoff, y);
      ctx.fill();
    }
  }
  noise(ctx, 0, 0.06, 900);
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
