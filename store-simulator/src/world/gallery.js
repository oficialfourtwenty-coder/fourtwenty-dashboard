// Galería/showroom por colección — una por piso, ambientada según el tema.
// Referencia base del dueño (foto estilo Urban Monkey): pared blanca con
// prendas colgadas, placas, atriles, pedestales y LEDs lineales.
// Prendas = siluetas dibujadas (remera/buzo/camiseta), NO cubos: placeholders
// hasta que TiendaNube traiga las fotos reales (Fase 5).
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { FLOOR_YS, FLOOR_H, INTERIOR } from './building.js';

const WALL_W = -INTERIOR.x + 0.03; // cara interna pared oeste
const WALL_E = INTERIOR.x - 0.03;  // cara interna pared este

const smooth = (t) => {
  t.colorSpace = THREE.SRGBColorSpace;
  t.magFilter = THREE.LinearFilter;
  t.minFilter = THREE.LinearMipmapLinearFilter;
  t.generateMipmaps = true;
  t.anisotropy = 8;
  return t;
};

// Canvas al doble de resolución dibujando con las mismas coordenadas.
function hiCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w * 2; c.height = h * 2;
  const ctx = c.getContext('2d');
  ctx.scale(2, 2);
  return [c, ctx];
}

function box(w, h, d, x, y, z, mat) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y, z);
  return m;
}

// ---- Texturas dibujadas ----------------------------------------------------
function css(color) { return `#${color.toString(16).padStart(6, '0')}`; }

// Silueta de prenda: 'tee' | 'hoodie' | 'jersey'. Extras: number, monkeyFace.
// (la usa también fixtures.js para la ropa de los percheros)
export function garmentTexture(color, type, { number, monkeyFace } = {}) {
  const [c, ctx] = hiCanvas(96, 112);
  const col = css(color);
  const dark = 'rgba(0,0,0,0.25)';
  ctx.fillStyle = col;
  if (type === 'jersey') {
    ctx.fillRect(28, 22, 40, 74);            // cuerpo
    ctx.fillRect(24, 22, 8, 26); ctx.fillRect(64, 22, 8, 26); // tiras
  } else {
    ctx.fillRect(24, 24, 48, 66);            // cuerpo
    ctx.fillRect(8, 26, 18, type === 'hoodie' ? 44 : 24);   // manga izq
    ctx.fillRect(70, 26, 18, type === 'hoodie' ? 44 : 24);  // manga der
    if (type === 'hoodie') {
      ctx.beginPath(); ctx.arc(48, 26, 18, Math.PI, 0); ctx.fill(); // capucha
      ctx.fillStyle = dark;
      ctx.fillRect(34, 70, 28, 16);          // bolsillo canguro
      ctx.fillStyle = col;
    }
  }
  // cuello
  ctx.fillStyle = dark;
  if (type !== 'jersey') ctx.fillRect(40, 22, 16, 5);
  // sombra lateral
  ctx.fillRect(type === 'jersey' ? 62 : 66, 24, 6, type === 'jersey' ? 70 : 64);
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
  return smooth(new THREE.CanvasTexture(c));
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
const white = new THREE.MeshStandardMaterial({ color: 0xf6f5f2, roughness: 0.9 });
const ledMat = new THREE.MeshBasicMaterial({ color: 0xffffff });

// Prenda colgada en una pared (side: 'w' | 'e'), con gancho.
function hangGarment(g, side, z, y, tex) {
  const x = side === 'w' ? WALL_W : WALL_E;
  const rotY = side === 'w' ? Math.PI / 2 : -Math.PI / 2;
  const garment = new THREE.Mesh(
    new THREE.PlaneGeometry(0.95, 1.15),
    new THREE.MeshStandardMaterial({ map: tex, transparent: true, alphaTest: 0.4, roughness: 0.95, side: THREE.DoubleSide }),
  );
  garment.position.set(x + (side === 'w' ? 0.06 : -0.06), y, z);
  garment.rotation.y = rotY;
  g.add(garment);
  g.add(box(0.03, 0.2, 0.03, x + (side === 'w' ? 0.05 : -0.05), y + 0.66, z, white));
}

function plaque(g, side, z, y, tex) {
  const x = side === 'w' ? WALL_W : WALL_E;
  const p = new THREE.Mesh(new THREE.PlaneGeometry(0.85, 0.42), new THREE.MeshBasicMaterial({ map: tex }));
  p.position.set(x + (side === 'w' ? 0.04 : -0.04), y, z);
  p.rotation.y = side === 'w' ? Math.PI / 2 : -Math.PI / 2;
  g.add(p);
}

function pedestals(g, colliders, Y, count, colors, types) {
  const heights = [0.6, 0.85, 1.1, 0.7, 0.95, 0.6, 1.05, 0.8, 0.65, 0.9, 1.15, 0.75];
  const n = Math.min(count, 12);
  for (let i = 0; i < n; i++) {
    const row = Math.floor(i / 4), col = i % 4;
    const h = heights[i];
    const px = WALL_W + 2.2 + row * 1.6;
    const pz = -8 + col * 2.9 + row * 0.8;
    g.add(box(0.5, h, 0.5, px, Y + h / 2, pz, white));
    g.add(box(0.58, 0.06, 0.58, px, Y + 0.03, pz, white));       // zócalo
    g.add(box(0.55, 0.035, 0.55, px, Y + h - 0.017, pz, white)); // remate
    if (i % 3 !== 2) {
      g.add(box(0.2, 0.09, 0.24, px, Y + h + 0.045, pz,
        new THREE.MeshStandardMaterial({ color: colors[i % colors.length], roughness: 0.9 })));
    }
    colliders.push({ minX: px - 0.25, maxX: px + 0.25, minY: Y, maxY: Y + h, minZ: pz - 0.25, maxZ: pz + 0.25 });
  }
}

function ceilingLeds(g, Y) {
  for (let row = 0; row < 3; row++) {
    for (let k = 0; k < 4; k++) {
      g.add(box(0.12, 0.04, 2.4, WALL_W + 1.2 + row * 2.0, Y + FLOOR_H - 0.12, -9 + k * 4.0, ledMat));
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
  const texFor = (i) => garmentTexture(
    colors[i % colors.length],
    types[i % types.length],
    theme === 'basket' ? { number: (i + 1) * 7 } : theme === 'bob' ? { monkeyFace: true } : {},
  );

  // Cartel de colección sobre la pared oeste
  const sign = new THREE.Mesh(
    new THREE.PlaneGeometry(6.5, 0.85),
    new THREE.MeshBasicMaterial({ map: labelTexture(name, 512, 64, { title: true }) }),
  );
  sign.position.set(WALL_W + 0.04, Y + 3.45, -3);
  sign.rotation.y = Math.PI / 2;
  g.add(sign);

  // Distribución de prendas según cantidad
  if (count === 1) {
    // pieza única: se exhibe en el centro (lo arma el theme hiphop)
  } else if (count <= 14) {
    const z0 = -10, z1 = 4;
    const step = (z1 - z0) / (count - 1);
    for (let i = 0; i < count; i++) {
      const z = z0 + step * i;
      hangGarment(g, 'w', z, Y + 1.95, texFor(i));
      plaque(g, 'w', z, Y + 3.02, labelTexture(`${name} ${String(i + 1).padStart(2, '0')}`, 128, 64));
      if (i % 2 === 0) {
        const stand = box(0.55, 0.03, 0.75, WALL_W + 0.45, Y + 1.05, z, white);
        stand.rotation.z = -0.5;
        g.add(stand);
      }
    }
  } else {
    // muchas prendas (colección BOB, 42): dos paredes, dos filas
    const perRowW = 11, perRowE = 10;
    let placed = 0;
    for (const [side, perRow] of [['w', perRowW], ['e', perRowE]]) {
      for (let row = 0; row < 2 && placed < count; row++) {
        const y = Y + (row === 0 ? 2.6 : 1.25);
        for (let i = 0; i < perRow && placed < count; i++) {
          const z = -10 + i * (14 / (perRow - 1));
          hangGarment(g, side, z, y, texFor(placed));
          placed++;
        }
      }
    }
  }

  // Pedestales + LEDs (no para la pieza única, que tiene su propia puesta)
  if (count > 1) {
    pedestals(g, colliders, Y, count >= 12 ? 12 : count, colors, types);
    ceilingLeds(g, Y);
  }

  // ---- Ambientación temática ----
  if (theme === 'basket') {
    // media cancha: piso de madera pintado + aro con tablero
    const court = new THREE.Mesh(
      new THREE.PlaneGeometry(10, 7),
      new THREE.MeshStandardMaterial({ map: courtTexture(), roughness: 0.9 }),
    );
    court.rotation.x = -Math.PI / 2;
    court.position.set(WALL_W + 5.5, Y + 0.02, -2);
    g.add(court);
    // aro completo: base + poste + brazo + tablero con marco + anillo + red
    const px = WALL_W + 10.2, pz = -2;
    const metal = new THREE.MeshStandardMaterial({ color: 0x3e3e44, roughness: 0.35, metalness: 0.75 });
    const boardMat = new THREE.MeshStandardMaterial({ color: 0xf5f2ea, roughness: 0.4 });
    g.add(box(0.7, 0.1, 0.7, px, Y + 0.05, pz, metal));                    // base
    g.add(box(0.14, 3.3, 0.14, px, Y + 1.65, pz, metal));                  // poste
    const arm = box(0.5, 0.09, 0.09, px - 0.28, Y + 3.28, pz, metal);      // brazo
    g.add(arm);
    g.add(box(0.06, 1.05, 1.8, px - 0.52, Y + 3.15, pz, boardMat));        // tablero
    for (const [dy, dz, w, hh] of [[0.5, 0, 1.86, 0.05], [-0.5, 0, 1.86, 0.05], [0, 0.9, 0.05, 1.0], [0, -0.9, 0.05, 1.0]]) {
      g.add(box(0.07, hh, w === 1.86 ? 0.05 : w, px - 0.52, Y + 3.15 + dy, pz + dz, metal)); // marco
    }
    // calco naranja del tablero (cuadrado interior)
    for (const [dy, dz, w, hh] of [[0.16, 0, 0.5, 0.04], [-0.16, 0, 0.5, 0.04], [0, 0.24, 0.04, 0.3], [0, -0.24, 0.04, 0.3]]) {
      g.add(box(0.02, hh, w === 0.5 ? 0.04 : w, px - 0.555, Y + 3.0 + dy, pz + dz,
        new THREE.MeshStandardMaterial({ color: 0xd96b2f, roughness: 0.6 })));
    }
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(0.23, 0.022, 10, 24),
      new THREE.MeshStandardMaterial({ color: 0xd96b2f, roughness: 0.35, metalness: 0.6 }),
    );
    ring.rotation.x = Math.PI / 2;
    ring.position.set(px - 0.82, Y + 2.95, pz);
    g.add(ring);
    // red: 8 tiritas blancas en cono
    const netMat = new THREE.MeshStandardMaterial({ color: 0xf5f2ea, roughness: 0.9 });
    for (let k = 0; k < 8; k++) {
      const a = (k / 8) * Math.PI * 2;
      const strip = box(0.015, 0.34, 0.015, px - 0.82 + Math.cos(a) * 0.19, Y + 2.77, pz + Math.sin(a) * 0.19, netMat);
      strip.rotation.z = Math.cos(a) * 0.28;
      strip.rotation.x = -Math.sin(a) * 0.28;
      g.add(strip);
    }
    colliders.push({ minX: px - 0.35, maxX: px + 0.35, minY: Y, maxY: Y + 3.3, minZ: pz - 0.35, maxZ: pz + 0.35 });
  }

  if (theme === 'bob') {
    // estatua gigante de BOB en el centro de la sala, sobre pedestal
    const sx = WALL_W + 5, sz = -3;
    const ped = box(1.6, 0.5, 1.6, sx, Y + 0.25, sz, white);
    g.add(ped);
    colliders.push({ minX: sx - 0.8, maxX: sx + 0.8, minY: Y, maxY: Y + 3.4, minZ: sz - 0.8, maxZ: sz + 0.8 });
    new GLTFLoader().load('assets/bob/bob.glb', (gltf) => {
      const statue = gltf.scene;
      const bbox = new THREE.Box3().setFromObject(statue);
      const size = bbox.getSize(new THREE.Vector3());
      statue.scale.setScalar(2.6 / (size.y || 1));
      const b2 = new THREE.Box3().setFromObject(statue);
      const ctr = b2.getCenter(new THREE.Vector3());
      statue.position.set(sx - ctr.x, Y + 0.5 - b2.min.y, sz - ctr.z);
      statue.rotation.y = Math.PI / 2; // mirando al centro de la sala
      statue.traverse((m) => { if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } });
      scene.add(statue);
    });
  }

  if (theme === 'hiphop') {
    // mural graffiti + alfombra oscura + pieza única bajo foco
    const mural = new THREE.Mesh(
      new THREE.PlaneGeometry(8, 3.0),
      new THREE.MeshBasicMaterial({ map: muralTexture() }),
    );
    mural.position.set(WALL_W + 0.05, Y + 2.0, -3);
    mural.rotation.y = Math.PI / 2;
    g.add(mural);
    const rug = new THREE.Mesh(
      new THREE.PlaneGeometry(6, 6),
      new THREE.MeshStandardMaterial({ color: 0x1c1c20, roughness: 1 }),
    );
    rug.rotation.x = -Math.PI / 2;
    rug.position.set(WALL_W + 4.5, Y + 0.02, -3);
    g.add(rug);
    // vitrina central: pedestal alto + prenda única + 4 LEDs verticales
    const px = WALL_W + 4.5, pz = -3;
    g.add(box(0.9, 1.0, 0.9, px, Y + 0.5, pz, white));
    colliders.push({ minX: px - 0.45, maxX: px + 0.45, minY: Y, maxY: Y + 1.0, minZ: pz - 0.45, maxZ: pz + 0.45 });
    const pieza = new THREE.Mesh(
      new THREE.PlaneGeometry(1.05, 1.25),
      new THREE.MeshStandardMaterial({ map: texFor(0), transparent: true, alphaTest: 0.4, roughness: 0.9, side: THREE.DoubleSide }),
    );
    pieza.position.set(px, Y + 1.75, pz);
    g.add(pieza);
    for (const [dx, dz] of [[-1.6, -1.6], [1.6, -1.6], [-1.6, 1.6], [1.6, 1.6]]) {
      g.add(box(0.08, 2.4, 0.08, px + dx, Y + 1.2, pz + dz, ledMat));
    }
    const foco = new THREE.PointLight(0xffe9c4, 26, 12, 2);
    foco.position.set(px, Y + 3.2, pz);
    scene.add(foco);
  }

  // spot cálido bañando la pared de prendas (contraste, no luz pareja)
  if (theme !== 'hiphop') {
    const spot = new THREE.SpotLight(0xffc58f, 32, 24, 1.05, 0.65, 1.6);
    spot.position.set(WALL_W + 4.5, Y + FLOOR_H - 0.3, -3);
    spot.target.position.set(WALL_W, Y + 1.6, -3);
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
