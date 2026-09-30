// Texturas de la cuadra de enfrente de Burela.
//
// ⚠️ TODAS SALEN EN GRIS, casi blancas. El color no lo pone la textura: lo pone
// el COLOR POR VERTICE de cada casa (ver `burelaFrente.js`). Asi ocho casas de
// ocho colores distintos comparten un solo material y se pueden fusionar en una
// malla. Si estas texturas trajeran color propio, cada tono necesitaria su
// material y volveriamos a cientos de llamadas de dibujo.
//
// Por eso el promedio de cada una ronda el blanco: aportan la TRAMA (la junta
// del ladrillo, la costilla de la teja, la lama de la persiana) y nada mas. Si
// se oscurecen, todas las casas salen apagadas y no se entiende por que.
import * as THREE from 'three';

const SIZE = 256;

function lienzo() {
  const c = document.createElement('canvas');
  c.width = SIZE; c.height = SIZE;
  return c;
}

function aTextura(canvas) {
  const t = new THREE.CanvasTexture(canvas);
  t.colorSpace = THREE.SRGBColorSpace;
  t.magFilter = THREE.LinearFilter;
  t.minFilter = THREE.LinearMipmapLinearFilter;
  t.generateMipmaps = true;
  t.anisotropy = 8;
  t.wrapS = THREE.RepeatWrapping;
  t.wrapT = THREE.RepeatWrapping;
  return t;
}

// Las texturas se generan UNA vez y se comparten: ocho casas, un solo canvas
// por acabado.
const cache = {};
const unaVez = (clave, hacer) => (cache[clave] ??= aTextura(hacer()));

// Ladrillo a la vista: hiladas trabadas, junta clara, cada ladrillo un poco
// distinto. La textura cubre 1,2 m, o sea unas 5 hiladas.
export const ladrilloTex = () => unaVez('ladrillo', () => {
  const c = lienzo(), x = c.getContext('2d');
  x.fillStyle = '#d8d4cc'; x.fillRect(0, 0, SIZE, SIZE);   // junta
  const filas = 8, alto = SIZE / filas, ancho = SIZE / 4;
  for (let f = 0; f < filas; f++) {
    const traba = (f % 2) * (ancho / 2);
    for (let i = -1; i < 5; i++) {
      const v = 226 + Math.floor(Math.random() * 26) - 13;
      x.fillStyle = `rgb(${v},${v - 4},${v - 8})`;
      x.fillRect(i * ancho + traba + 1.5, f * alto + 1.5, ancho - 3, alto - 3);
    }
  }
  // manchas de humedad y hollin: sin esto el ladrillo se ve de plastico
  for (let i = 0; i < 60; i++) {
    x.fillStyle = `rgba(120,110,100,${Math.random() * 0.09})`;
    x.beginPath();
    x.arc(Math.random() * SIZE, Math.random() * SIZE, 4 + Math.random() * 22, 0, 7);
    x.fill();
  }
  return c;
});

// Revoque: casi liso, con el grano fino del fratasado y alguna veta.
export const revoqueTex = () => unaVez('revoque', () => {
  const c = lienzo(), x = c.getContext('2d');
  x.fillStyle = '#f2f0ec'; x.fillRect(0, 0, SIZE, SIZE);
  for (let i = 0; i < 5000; i++) {
    const v = Math.random() * 0.10;
    x.fillStyle = `rgba(${Math.random() > 0.5 ? '255,255,255' : '90,86,80'},${v})`;
    x.fillRect(Math.random() * SIZE, Math.random() * SIZE, 2, 2);
  }
  for (let i = 0; i < 14; i++) {
    x.strokeStyle = `rgba(140,134,126,${0.03 + Math.random() * 0.05})`;
    x.lineWidth = 1 + Math.random() * 6;
    x.beginPath();
    const y0 = Math.random() * SIZE;
    x.moveTo(0, y0);
    x.bezierCurveTo(SIZE / 3, y0 + 20, SIZE / 2, y0 - 24, SIZE, y0 + 8);
    x.stroke();
  }
  return c;
});

// Teja colonial: las costillas redondeadas, vistas de frente.
export const tejaTex = () => unaVez('teja', () => {
  const c = lienzo(), x = c.getContext('2d');
  x.fillStyle = '#e6e2dc'; x.fillRect(0, 0, SIZE, SIZE);
  const paso = SIZE / 7;
  for (let i = 0; i < 7; i++) {
    const g = x.createLinearGradient(i * paso, 0, (i + 1) * paso, 0);
    g.addColorStop(0, 'rgba(110,100,92,0.42)');
    g.addColorStop(0.35, 'rgba(255,255,255,0.16)');
    g.addColorStop(0.7, 'rgba(255,255,255,0.05)');
    g.addColorStop(1, 'rgba(110,100,92,0.42)');
    x.fillStyle = g;
    x.fillRect(i * paso, 0, paso, SIZE);
  }
  for (let i = 0; i < 400; i++) {
    x.fillStyle = `rgba(90,84,78,${Math.random() * 0.10})`;
    x.fillRect(Math.random() * SIZE, Math.random() * SIZE, 3, 2);
  }
  return c;
});

// Persiana / chapa de porton: lamas horizontales.
export const persianaTex = () => unaVez('persiana', () => {
  const c = lienzo(), x = c.getContext('2d');
  x.fillStyle = '#eceae5'; x.fillRect(0, 0, SIZE, SIZE);
  const lamas = 16, alto = SIZE / lamas;
  for (let i = 0; i < lamas; i++) {
    const g = x.createLinearGradient(0, i * alto, 0, (i + 1) * alto);
    g.addColorStop(0, 'rgba(255,255,255,0.20)');
    g.addColorStop(0.75, 'rgba(255,255,255,0.03)');
    g.addColorStop(1, 'rgba(80,74,68,0.45)');
    x.fillStyle = g;
    x.fillRect(0, i * alto, SIZE, alto);
  }
  return c;
});
