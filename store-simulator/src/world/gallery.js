// Galería/showroom por colección — una por piso, ambientada según el tema.
// Referencia base del dueño (foto estilo Urban Monkey): pared blanca con
// prendas colgadas, placas, atriles, pedestales y LEDs lineales.
// Prendas = siluetas dibujadas (remera/buzo/camiseta), NO cubos: placeholders
// hasta que TiendaNube traiga las fotos reales (Fase 5).
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { FLOOR_YS, FLOOR_H, INTERIOR } from './building.js';
import { registerSpinner } from './anim.js';
import { normalizeGLTFHeight } from './gltfUtils.js';
import { box, smoothTexture as smooth, hiCanvas, white } from './gfxUtils.js';
import { bindProductVisual } from './productVisuals.js';

const WALL_W = -INTERIOR.x + 0.03; // cara interna pared oeste
const WALL_E = INTERIOR.x - 0.03;  // cara interna pared este

// ---- Texturas dibujadas ----------------------------------------------------
function css(color) { return `#${color.toString(16).padStart(6, '0')}`; }

const garmentTextureCache = new Map();

// Silueta de prenda: 'tee' | 'hoodie' | 'jersey'. Extras: number, monkeyFace.
// (la usa también retail.js para la ropa de los percheros)
export function garmentTexture(color, type, { number, monkeyFace } = {}) {
  const cacheKey = `${color}:${type}:${number ?? ''}:${monkeyFace ? 1 : 0}`;
  const cached = garmentTextureCache.get(cacheKey);
  if (cached) return cached;

  const [c, ctx] = hiCanvas(96, 112, 4); // x4: siluetas suaves, nada pixelado
  const col = css(color);
  const dark = 'rgba(0,0,0,0.25)';
  const rr = (x, y, w, h, r) => {
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, r);
    ctx.fill();
  };
  ctx.fillStyle = col;
  if (type === 'jersey') {
    rr(28, 22, 40, 74, 7);                   // cuerpo
    rr(24, 22, 8, 26, 3); rr(64, 22, 8, 26, 3); // tiras
  } else {
    rr(24, 24, 48, 66, 8);                   // cuerpo
    rr(8, 26, 18, type === 'hoodie' ? 44 : 24, 6);   // manga izq
    rr(70, 26, 18, type === 'hoodie' ? 44 : 24, 6);  // manga der
    if (type === 'hoodie') {
      ctx.beginPath(); ctx.arc(48, 26, 18, Math.PI, 0); ctx.fill(); // capucha
      ctx.fillStyle = dark;
      rr(34, 70, 28, 16, 5);                 // bolsillo canguro
      ctx.fillStyle = col;
    }
  }
  // cuello
  ctx.fillStyle = dark;
  if (type !== 'jersey') rr(40, 22, 16, 5, 2);
  // sombra lateral
  rr(type === 'jersey' ? 62 : 66, 24, 6, type === 'jersey' ? 70 : 64, 3);
  // gráfica
  if (number != null) {
    ctx.fillStyle = 'rgba(255,255,255,0.92)';
    ctx.font = 'bold 26px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(String(number), 48, 66);
  } else if (monkeyFace) {
    // carita de BOB: orejas + cara + ojos
    ctx.fillStyle = '#8a5a36';
    ctx.beginPath(); ctx.arc(38, 52, 5, 0, 7); ctx.arc(58, 52, 5, 0, 7); ctx.fill();
    ctx.beginPath(); ctx.arc(48, 54, 11, 0, 7); ctx.fill();
    ctx.fillStyle = '#c98d5f';
    ctx.beginPath(); ctx.arc(48, 57, 7, 0, 7); ctx.fill();
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(44, 51, 3, 3); ctx.fillRect(50, 51, 3, 3);
  } else {
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.font = 'bold 12px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('FT', 48, 58);
  }
  const texture = smooth(new THREE.CanvasTexture(c));
  garmentTextureCache.set(cacheKey, texture);
  return texture;
}

function labelTexture(text, w, h, { title = false } = {}) {
  const [c, ctx] = hiCanvas(w, h);
  ctx.fillStyle = '#fafafa';
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = '#d0d0cc';
  ctx.strokeRect(1, 1, w - 2, h - 2);
  ctx.fillStyle = '#1a1a1a';
  if (title) {
    ctx.font = `bold ${Math.floor(h * 0.55)}px monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, w / 2, h / 2 + 2);
  } else {
    ctx.font = 'bold 11px monospace';
    ctx.fillText(text, 8, 18);
    ctx.fillStyle = '#9a9a96';
    for (let i = 0; i < 4; i++) ctx.fillRect(8, 28 + i * 8, w - 28 - i * 12, 3);
  }
  return smooth(new THREE.CanvasTexture(c));
}

// Piso de cancha de básquet (madera + líneas pintadas).
function courtTexture() {
  const [c, ctx] = hiCanvas(256, 192);
  ctx.fillStyle = '#c8955c';
  ctx.fillRect(0, 0, 256, 192);
  ctx.strokeStyle = 'rgba(120,70,30,0.35)';
  for (let x = 0; x < 256; x += 16) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, 192); ctx.stroke(); }
  ctx.strokeStyle = '#f5f2ea';
  ctx.lineWidth = 4;
  ctx.strokeRect(8, 8, 240, 176);
  ctx.beginPath(); ctx.arc(128, 96, 30, 0, 7); ctx.stroke();       // círculo central
  ctx.strokeRect(8, 60, 60, 72);                                    // zona pintada
  ctx.beginPath(); ctx.arc(68, 96, 36, -Math.PI / 2, Math.PI / 2); ctx.stroke();
  return smooth(new THREE.CanvasTexture(c));
}

// Mural graffiti hip hop con "CULTURA".
function muralTexture() {
  const [c, ctx] = hiCanvas(512, 160);
  ctx.fillStyle = '#26262b';
  ctx.fillRect(0, 0, 512, 160);
  const sprays = ['#e33fa1', '#3fc1e3', '#e3d23f', '#5ee33f', '#d4af37'];
  for (let i = 0; i < 26; i++) {
    const x = Math.random() * 512, y = Math.random() * 160, r = 14 + Math.random() * 34;
    const g = ctx.createRadialGradient(x, y, 2, x, y, r);
    g.addColorStop(0, sprays[i % 5] + 'aa');
    g.addColorStop(1, sprays[i % 5] + '00');
    ctx.fillStyle = g;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }
  ctx.save();
  ctx.translate(256, 84);
  ctx.rotate(-0.04);
  ctx.font = 'bold 64px monospace';
  ctx.textAlign = 'center';
  ctx.lineWidth = 10;
  ctx.strokeStyle = '#111';
  ctx.strokeText('CULTURA', 0, 0);
  ctx.fillStyle = '#f5f2ea';
  ctx.fillText('CULTURA', 0, 0);
  ctx.restore();
  ctx.font = 'bold 22px monospace';
  ctx.fillStyle = '#d4af37';
  ctx.fillText('FT', 468, 140);
  return smooth(new THREE.CanvasTexture(c));
}

// ---- Piezas ---------------------------------------------------------------
const ledMat = new THREE.MeshBasicMaterial({ color: 0xffffff });

// Prenda colgada en una pared (side: 'w' | 'e'), con gancho. `slot` la vuelve
// clickeable como producto (src/interact/productClicks.js): { piso, index }.
function hangGarment(g, side, z, y, tex, scale = 1, slot = null) {
  const x = side === 'w' ? WALL_W : WALL_E;
  const rotY = side === 'w' ? Math.PI / 2 : -Math.PI / 2;
  const garment = new THREE.Mesh(
    new THREE.PlaneGeometry(0.95 * scale, 1.15 * scale),
    new THREE.MeshStandardMaterial({ map: tex, transparent: true, alphaTest: 0.4, roughness: 0.95, side: THREE.DoubleSide }),
  );
  garment.position.set(x + (side === 'w' ? 0.06 : -0.06), y, z);
  garment.rotation.y = rotY;
  if (slot) bindProductVisual(garment, slot, tex);
  g.add(garment);
  g.add(box(0.03, 0.2 * scale, 0.03, x + (side === 'w' ? 0.05 : -0.05), y + 0.66 * scale, z, white));
}

function plaque(g, side, z, y, tex) {
  const x = side === 'w' ? WALL_W : WALL_E;
  const p = new THREE.Mesh(new THREE.PlaneGeometry(0.85, 0.42), new THREE.MeshBasicMaterial({ map: tex }));
  p.position.set(x + (side === 'w' ? 0.04 : -0.04), y, z);
  p.rotation.y = side === 'w' ? Math.PI / 2 : -Math.PI / 2;
  g.add(p);
}

function pedestals(g, colliders, Y, count, colors, types) {
  const heights = [0.6, 0.85, 1.05, 0.7, 0.95, 0.75];
  const n = Math.min(count, 6);
  for (let i = 0; i < n; i++) {
    const row = Math.floor(i / 3), col = i % 3;
    const h = heights[i];
    const px = WALL_W + 1.2 + row * 1.15;
    const pz = -2.4 + col * 1.5 + row * 0.4;
    g.add(box(0.45, h, 0.45, px, Y + h / 2, pz, white));
    g.add(box(0.52, 0.05, 0.52, px, Y + 0.025, pz, white));      // zócalo
    g.add(box(0.49, 0.03, 0.49, px, Y + h - 0.015, pz, white));  // remate
    if (i % 3 !== 2) {
      g.add(box(0.2, 0.09, 0.24, px, Y + h + 0.045, pz,
        new THREE.MeshStandardMaterial({ color: colors[i % colors.length], roughness: 0.9 })));
    }
    colliders.push({ minX: px - 0.23, maxX: px + 0.23, minY: Y, maxY: Y + h, minZ: pz - 0.23, maxZ: pz + 0.23 });
  }
}

function ceilingLeds(g, Y) {
  for (let row = 0; row < 2; row++) {
    for (let k = 0; k < 2; k++) {
      g.add(box(0.1, 0.04, 1.8, WALL_W + 0.9 + row * 1.3, Y + FLOOR_H - 0.1, -1.8 + k * 2.2, ledMat));
    }
  }
}

// ---- Galería por colección --------------------------------------------------
export function buildGallery(scene, collection) {
  const Y = FLOOR_YS[collection.piso - 1];
  const { colors, name, count, theme } = collection;
  const g = new THREE.Group();
  const colliders = [];
  const types = theme === 'basket' ? ['jersey'] : ['tee', 'hoodie', 'tee', 'hoodie'];
  // Si la colección tiene fotos reales (collections.js → fotos: [...]), se usan;
  // si no, silueta dibujada de placeholder. Las fotos van en
  // public/assets/prendas/ como PNG con fondo transparente.
  const photoLoader = new THREE.TextureLoader();
  const texFor = (i) => {
    const foto = collection.fotos?.[i];
    if (foto) {
      return smooth(photoLoader.load(`assets/prendas/${foto}`));
    }
    return garmentTexture(
      colors[i % colors.length],
      types[i % types.length],
      theme === 'basket' ? { number: (i + 1) * 7 } : theme === 'bob' ? { monkeyFace: true } : {},
    );
  };

  // Cartel de colección sobre la pared oeste
  const sign = new THREE.Mesh(
    new THREE.PlaneGeometry(4, 0.55),
    new THREE.MeshBasicMaterial({ map: labelTexture(name, 512, 64, { title: true }) }),
  );
  sign.position.set(WALL_W + 0.04, Y + 2.85, -1);
  sign.rotation.y = Math.PI / 2;
  g.add(sign);

  // Distribución de prendas según cantidad (local 12x9: pared útil z -3.5..1.5)
  if (count <= 0) {
    // colección vacía a propósito: espera fotos reales antes de exhibir prendas.
  } else if (count === 1) {
    // pieza única: se exhibe en el centro (lo arma el theme hiphop)
  } else if (count <= 6) {
    const z0 = -3, z1 = 1.5;
    const step = (z1 - z0) / (count - 1);
    for (let i = 0; i < count; i++) {
      const z = z0 + step * i;
      hangGarment(g, 'w', z, Y + 1.75, texFor(i), 1, { piso: collection.piso, index: i });
      plaque(g, 'w', z, Y + 2.5, labelTexture(`${name} ${String(i + 1).padStart(2, '0')}`, 128, 64));
    }
  } else if (count <= 14) {
    // dos filas en la pared oeste
    const perRow = Math.ceil(count / 2);
    let placed = 0;
    for (let row = 0; row < 2 && placed < count; row++) {
      const y = Y + (row === 0 ? 2.3 : 1.1);
      for (let i = 0; i < perRow && placed < count; i++) {
        hangGarment(g, 'w', -3.5 + i * (5 / (perRow - 1)), y, texFor(placed), 0.85, { piso: collection.piso, index: placed });
        placed++;
      }
    }
  } else {
    // muchas prendas (colección BOB, 42): dos paredes, tres filas compactas
    let placed = 0;
    for (const side of ['w', 'e']) {
      for (let row = 0; row < 3 && placed < count; row++) {
        const y = Y + [2.55, 1.65, 0.75][row];
        for (let i = 0; i < 7 && placed < count; i++) {
          hangGarment(g, side, -3.5 + i * (5 / 6), y, texFor(placed), 0.72, { piso: collection.piso, index: placed });
          placed++;
        }
      }
    }
  }

  // Pedestales + LEDs (no en básquet —la cancha es la estrella— ni pieza única)
  if (count > 1 && theme !== 'basket') {
    pedestals(g, colliders, Y, 6, colors, types);
    ceilingLeds(g, Y);
  }

  // ---- Ambientación temática ----
  if (theme === 'basket') {
    // media cancha: piso de madera pintado + aro con tablero
    const court = new THREE.Mesh(
      new THREE.PlaneGeometry(4.6, 3.2),
      new THREE.MeshStandardMaterial({ map: courtTexture(), roughness: 0.55 }),
    );
    court.rotation.x = -Math.PI / 2;
    court.position.set(WALL_W + 2.4, Y + 0.02, -0.6);
    g.add(court);
    // aro completo: base + poste + brazo + tablero con marco + anillo + red
    const px = WALL_W + 4.35, pz = -0.6;
    const metal = new THREE.MeshStandardMaterial({ color: 0x3e3e44, roughness: 0.35, metalness: 0.75 });
    const boardMat = new THREE.MeshStandardMaterial({ color: 0xf5f2ea, roughness: 0.4 });
    g.add(box(0.6, 0.08, 0.6, px, Y + 0.04, pz, metal));                   // base
    g.add(box(0.12, 2.9, 0.12, px, Y + 1.45, pz, metal));                  // poste
    g.add(box(0.4, 0.08, 0.08, px - 0.22, Y + 2.86, pz, metal));           // brazo
    g.add(box(0.05, 0.9, 1.5, px - 0.42, Y + 2.72, pz, boardMat));         // tablero
    for (const [dy, dz, w, hh] of [[0.43, 0, 1.56, 0.05], [-0.43, 0, 1.56, 0.05], [0, 0.75, 0.05, 0.85], [0, -0.75, 0.05, 0.85]]) {
      g.add(box(0.06, hh, w === 1.56 ? 0.05 : w, px - 0.42, Y + 2.72 + dy, pz + dz, metal)); // marco
    }
    // calco naranja del tablero (cuadrado interior)
    for (const [dy, dz, w, hh] of [[0.14, 0, 0.44, 0.035], [-0.14, 0, 0.44, 0.035], [0, 0.21, 0.035, 0.26], [0, -0.21, 0.035, 0.26]]) {
      g.add(box(0.02, hh, w === 0.44 ? 0.035 : w, px - 0.45, Y + 2.6 + dy, pz + dz,
        new THREE.MeshStandardMaterial({ color: 0xd96b2f, roughness: 0.6 })));
    }
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(0.21, 0.02, 10, 24),
      new THREE.MeshStandardMaterial({ color: 0xd96b2f, roughness: 0.35, metalness: 0.6 }),
    );
    ring.rotation.x = Math.PI / 2;
    ring.position.set(px - 0.68, Y + 2.52, pz);
    g.add(ring);
    // red: 8 tiritas blancas en cono
    const netMat = new THREE.MeshStandardMaterial({ color: 0xf5f2ea, roughness: 0.9 });
    for (let k = 0; k < 8; k++) {
      const a = (k / 8) * Math.PI * 2;
      const strip = box(0.015, 0.3, 0.015, px - 0.68 + Math.cos(a) * 0.17, Y + 2.36, pz + Math.sin(a) * 0.17, netMat);
      strip.rotation.z = Math.cos(a) * 0.28;
      strip.rotation.x = -Math.sin(a) * 0.28;
      g.add(strip);
    }
    colliders.push({ minX: px - 0.3, maxX: px + 0.3, minY: Y, maxY: Y + 2.9, minZ: pz - 0.3, maxZ: pz + 0.3 });
  }

  if (theme === 'bob') {
    // estatua de BOB (2m) sobre pedestal, contra la zona de galería
    const sx = WALL_W + 3.4, sz = -0.8;
    const ped = box(1.2, 0.45, 1.2, sx, Y + 0.225, sz, white);
    g.add(ped);
    colliders.push({ minX: sx - 0.6, maxX: sx + 0.6, minY: Y, maxY: Y + 2.6, minZ: sz - 0.6, maxZ: sz + 0.6 });
    new GLTFLoader().load('assets/bob/bob.glb', (gltf) => {
      const statue = gltf.scene;
      normalizeGLTFHeight(statue, 2.0); // centrado en X/Z, apoyado en Y=0
      statue.position.x += sx;
      statue.position.y += Y + 0.45; // altura del pedestal
      statue.position.z += sz;
      statue.rotation.y = 0; // frente del GLB es +x → mira al centro de la sala
      statue.traverse((m) => { if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } });
      scene.add(statue);
    });
  }

  if (theme === 'hiphop') {
    // mural graffiti + alfombra oscura + pieza única bajo foco
    const mural = new THREE.Mesh(
      new THREE.PlaneGeometry(5, 2.0),
      new THREE.MeshBasicMaterial({ map: muralTexture() }),
    );
    mural.position.set(WALL_W + 0.05, Y + 1.55, -1);
    mural.rotation.y = Math.PI / 2;
    g.add(mural);
    const rug = new THREE.Mesh(
      new THREE.PlaneGeometry(3.4, 3.4),
      new THREE.MeshStandardMaterial({ color: 0x1c1c20, roughness: 1 }),
    );
    rug.rotation.x = -Math.PI / 2;
    rug.position.set(WALL_W + 2.6, Y + 0.02, -1);
    g.add(rug);
    // vitrina central: pedestal alto + prenda única + 4 LEDs verticales
    const px = WALL_W + 2.6, pz = -1;
    g.add(box(0.7, 0.8, 0.7, px, Y + 0.4, pz, white));
    colliders.push({ minX: px - 0.35, maxX: px + 0.35, minY: Y, maxY: Y + 0.8, minZ: pz - 0.35, maxZ: pz + 0.35 });
    const piezaTex = texFor(0);
    const pieza = new THREE.Mesh(
      new THREE.PlaneGeometry(0.9, 1.05),
      new THREE.MeshStandardMaterial({ map: piezaTex, transparent: true, alphaTest: 0.4, roughness: 0.9, side: THREE.DoubleSide }),
    );
    pieza.position.set(px, Y + 1.45, pz);
    bindProductVisual(pieza, { piso: collection.piso, index: 0 }, piezaTex); // clickeable
    g.add(pieza);
    registerSpinner(pieza); // gira lento, vidriera GTA V
    for (const [dx, dz] of [[-1.1, -1.1], [1.1, -1.1], [-1.1, 1.1], [1.1, 1.1]]) {
      g.add(box(0.07, 2.0, 0.07, px + dx, Y + 1.0, pz + dz, ledMat));
    }
    const foco = new THREE.PointLight(0xffe9c4, 14, 8, 2);
    foco.position.set(px, Y + 2.9, pz);
    scene.add(foco);
  }

  // spot cálido bañando la pared de prendas (contraste, no luz pareja)
  if (theme !== 'hiphop') {
    const spot = new THREE.SpotLight(0xffc58f, 9, 9, 1.05, 0.7, 1.6);
    spot.position.set(WALL_W + 2.2, Y + FLOOR_H - 0.25, -1);
    spot.target.position.set(WALL_W, Y + 1.4, -1);
    scene.add(spot, spot.target);
  }

  // todo lo sólido de la galería proyecta y recibe sombra
  g.traverse((m) => {
    if (m.isMesh && !m.material.isMeshBasicMaterial) {
      m.castShadow = true;
      m.receiveShadow = true;
    }
  });

  scene.add(g);
  return colliders;
}
