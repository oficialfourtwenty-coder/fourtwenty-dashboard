// Cartelería luminosa FOURTWENTY (pedido del dueño: "el local es de
// fourtwenty, debe haber carteles luminosos con su nombre").
// Neón dibujado en canvas (unlit = brilla siempre) + luz puntual de acento.
import * as THREE from 'three';
import { FLOOR_YS, INTERIOR } from './building.js';

function neonTexture(text, w = 1024, h = 128) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const ctx = c.getContext('2d');
  // fondo panel oscuro con borde
  ctx.fillStyle = '#101012';
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = '#2c2c30';
  ctx.lineWidth = 6;
  ctx.strokeRect(3, 3, w - 6, h - 6);
  ctx.font = `bold ${Math.floor(h * 0.58)}px monospace`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  // halo verde (varias pasadas de blur) + núcleo casi blanco
  ctx.shadowColor = '#39ff6a';
  for (const blur of [26, 14, 6]) {
    ctx.shadowBlur = blur;
    ctx.fillStyle = '#39ff6a';
    ctx.fillText(text, w / 2, h / 2 + 3);
  }
  ctx.shadowBlur = 0;
  ctx.fillStyle = '#eafff0';
  ctx.fillText(text, w / 2, h / 2 + 3);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.magFilter = THREE.NearestFilter;
  t.minFilter = THREE.NearestFilter;
  return t;
}

function neonSign(text, width, height) {
  return new THREE.Mesh(
    new THREE.PlaneGeometry(width, height),
    new THREE.MeshBasicMaterial({ map: neonTexture(text) }),
  );
}

export function buildSignage(scene) {
  const back = INTERIOR.z - 0.03;   // cara interna pared fondo (mira a -z)

  // Planta baja: cartelón principal sobre la pared del fondo
  const main = neonSign('FOURTWENTY', 16, 2.0);
  main.position.set(0, 2.7, back);
  main.rotation.y = Math.PI;
  scene.add(main);
  const glow = new THREE.PointLight(0x39ff6a, 30, 18, 2);
  glow.position.set(0, 2.7, back - 1.5);
  scene.add(glow);

  // Un cartel por piso superior (te recibe al subir la escalera)
  for (let j = 1; j < FLOOR_YS.length; j++) {
    const s = neonSign('FOURTWENTY', 9, 1.1);
    s.position.set(0, FLOOR_YS[j] + 3.2, back);
    s.rotation.y = Math.PI;
    scene.add(s);
  }

  // Frente, arriba de la vidriera, mirando adentro
  const frente = neonSign('FOURTWENTY', 10, 1.2);
  frente.position.set(0, 3.4, -INTERIOR.z + 0.03);
  scene.add(frente);
}
