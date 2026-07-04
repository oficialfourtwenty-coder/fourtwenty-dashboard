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
  t.magFilter = THREE.LinearFilter;
  t.minFilter = THREE.LinearMipmapLinearFilter;
  t.generateMipmaps = true;
  t.anisotropy = 8;
  return t;
}

// Cartel físico: caja de marco oscuro + frente luminoso (el bloom del
// post-processing hace brillar el tubo de neón).
function neonSign(text, width, height) {
  const group = new THREE.Group();
  const frame = new THREE.Mesh(
    new THREE.BoxGeometry(width + 0.15, height + 0.15, 0.18),
    new THREE.MeshStandardMaterial({ color: 0x1a1a1e, roughness: 0.4, metalness: 0.6 }),
  );
  frame.position.z = -0.1;
  frame.castShadow = true;
  group.add(frame);
  const face = new THREE.Mesh(
    new THREE.PlaneGeometry(width, height),
    new THREE.MeshBasicMaterial({ map: neonTexture(text) }),
  );
  group.add(face);
  return group;
}

export function buildSignage(scene) {
  const back = INTERIOR.z - 0.03;   // cara interna pared fondo (mira a -z)

  // Planta baja: cartelón principal sobre la pared del fondo
  // corrido a la izquierda para que la escalera no lo tape
  const main = neonSign('FOURTWENTY', 5.5, 0.85);
  main.position.set(-2.6, 2.45, back);
  main.rotation.y = Math.PI;
  scene.add(main);
  const glow = new THREE.PointLight(0x39ff6a, 6, 6, 2);
  glow.position.set(-2.6, 2.45, back - 1.0);
  scene.add(glow);

  // Un cartel por piso superior (te recibe al subir la escalera)
  for (let j = 1; j < FLOOR_YS.length; j++) {
    const s = neonSign('FOURTWENTY', 4.2, 0.6);
    s.position.set(0, FLOOR_YS[j] + 2.85, back);
    s.rotation.y = Math.PI;
    scene.add(s);
  }

  // Frente, arriba de la vidriera, mirando adentro
  const frente = neonSign('FOURTWENTY', 4.5, 0.7);
  frente.position.set(0, 2.85, -INTERIOR.z + 0.03);
  scene.add(frente);
}
