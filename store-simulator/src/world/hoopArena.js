// HOOP ARENA — estadio NBA que rodea al local del piso HOOP SEASON.
//
// Por qué está hecho con geometría y no con un skybox de IA:
//   - Pesa ~0 KB (todo procedural) contra 1-3 MB de una imagen 360.
//   - No ocupa VRAM: una equirectangular de 4096x2048 se come 34 MB de video.
//   - El texto sale LEGIBLE. Los generadores de 360 escriben cualquier cosa.
//   - La simetría es exacta por construcción, no por suerte del prompt.
//   - Cambiar el verde neón o el texto es una línea de este archivo.
//
// Se ve principalmente por el vidrio del frente (pared z = ROOM_MIN_Z), así que
// el detalle está puesto en la bandeja baja y en el cartel LED de cancha, que
// son los que quedan a la altura de los ojos. Las bandejas altas y el jumbotron
// están igual porque cuestan poquísimo y aparecen si se mira hacia arriba.
//
// No tiene colisión ni sombras: es decorado, vive afuera del local.
import * as THREE from 'three';

const VERDE = 0x39ff6a;      // el mismo verde del neón del local
const NEGRO = 0x0a0b0c;
const CENTRO_Z = 4.5;        // centro del local (ROOM_MIN_Z + ROOM_D / 2)
const OVALO_Z = 1.32;        // el estadio es más largo que ancho, como uno real
const sharedArenaTextures = new Map();

function arenaTexture(key, create) {
  if (!sharedArenaTextures.has(key)) sharedArenaTextures.set(key, create());
  return sharedArenaTextures.get(key);
}

// Bandejas: [radio abajo, radio arriba, y abajo, y arriba]
const BANDEJAS = [
  [22, 31, 0.9, 7.0],
  [32, 42, 9.0, 17.0],
  [43, 54, 19.0, 28.0],
];

// ---------------------------------------------------------------------------
// Texturas dibujadas a mano en canvas (no se descarga ni un byte)
// ---------------------------------------------------------------------------

// Filas de butacas negras con algún asiento verde suelto. Se repite muchas
// veces sobre la bandeja: de lejos lee como una tribuna llena de asientos.
function texturaButacas() {
  const c = document.createElement('canvas');
  c.width = 64; c.height = 64;
  const g = c.getContext('2d');
  g.fillStyle = '#111214';
  g.fillRect(0, 0, 64, 64);
  for (let fila = 0; fila < 8; fila++) {
    for (let col = 0; col < 8; col++) {
      const verde = Math.random() < 0.045;
      g.fillStyle = verde ? '#1f7a3a' : (fila % 2 ? '#191b1e' : '#212429');
      g.fillRect(col * 8 + 1, fila * 8 + 1, 6, 5);
    }
    g.fillStyle = 'rgba(0,0,0,0.55)'; // sombra del escalón
    g.fillRect(0, fila * 8 + 6, 64, 2);
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

// Cartel LED que da la vuelta a la cancha. El texto va acá, nítido y editable.
function texturaCartel(textos, { alto = 128, ancho = 4096, fondo = '#050607' } = {}) {
  const c = document.createElement('canvas');
  c.width = ancho; c.height = alto;
  const g = c.getContext('2d');
  g.fillStyle = fondo;
  g.fillRect(0, 0, ancho, alto);

  const frase = `${textos.join('   ·   ')}   ·   `;
  g.font = `900 ${Math.round(alto * 0.56)}px "Arial Black", Impact, sans-serif`;
  g.textBaseline = 'middle';
  const anchoFrase = g.measureText(frase).width;
  const repeticiones = Math.max(1, Math.ceil(ancho / anchoFrase));

  g.fillStyle = `#${VERDE.toString(16).padStart(6, '0')}`;
  g.shadowColor = g.fillStyle;
  g.shadowBlur = alto * 0.35;
  for (let i = 0; i < repeticiones; i++) {
    g.fillText(frase, i * anchoFrase, alto / 2);
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  // Los carteles son cilindros vistos DESDE ADENTRO (BackSide): sin esto el
  // texto se lee al revés, como en un espejo.
  t.repeat.x = -1;
  t.offset.x = 1;
  return t;
}

// Piso de parquet con el círculo central y la pintura de la marca.
function texturaCancha() {
  const c = document.createElement('canvas');
  c.width = c.height = 1024;
  const g = c.getContext('2d');

  g.fillStyle = '#0d0e10';
  g.fillRect(0, 0, 1024, 1024);
  // duelas de parquet oscuro
  for (let x = 0; x < 1024; x += 26) {
    g.fillStyle = x % 52 ? '#191410' : '#1d1712';
    g.fillRect(x, 0, 24, 1024);
  }
  const verde = `#${VERDE.toString(16).padStart(6, '0')}`;

  // límite de cancha
  g.strokeStyle = verde; g.lineWidth = 7;
  g.strokeRect(88, 148, 848, 728);

  // círculo central
  g.beginPath(); g.arc(512, 512, 132, 0, Math.PI * 2); g.stroke();

  // las dos zonas pintadas (simétricas)
  g.lineWidth = 6;
  for (const y of [148, 876 - 260]) {
    g.strokeRect(392, y, 240, 260);
  }

  // texto en las dos mitades, espejado, para que se lea de los dos lados
  g.fillStyle = verde;
  g.font = '900 60px "Arial Black", Impact, sans-serif';
  g.textAlign = 'center';
  g.fillText('FOURTWENTY', 512, 300);
  g.save();
  g.translate(512, 760); g.rotate(Math.PI);
  g.fillText('FOURTWENTY', 0, 0);
  g.restore();

  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// ---------------------------------------------------------------------------

const anillo = (rAbajo, rArriba, alto, segmentos = 64) =>
  new THREE.CylinderGeometry(rArriba, rAbajo, alto, segmentos, 1, true);

/**
 * Construye el estadio y lo cuelga de la escena.
 * Las seis texturas se comparten entre visitas para que volver al piso no
 * reserve memoria nueva en cada viaje de ascensor.
 */
export function buildHoopArena(scene) {
  const root = new THREE.Group();
  root.name = 'HOOP ARENA · estadio (decorado, sin colisión)';
  root.position.set(0, 0, CENTRO_Z);
  root.scale.z = OVALO_Z;

  const negroMate = new THREE.MeshStandardMaterial({ color: NEGRO, roughness: 0.92, metalness: 0.05 });
  const neon = new THREE.MeshBasicMaterial({ color: VERDE }); // Basic: brilla sin depender de luces

  // --- cancha -------------------------------------------------------------
  const cancha = new THREE.Mesh(
    new THREE.PlaneGeometry(58, 44),
    new THREE.MeshStandardMaterial({ map: arenaTexture('cancha', texturaCancha), roughness: 0.34, metalness: 0.0 }),
  );
  cancha.rotation.x = -Math.PI / 2;
  cancha.position.y = -0.02; // apenas debajo del piso del local, para no pelearse con él
  root.add(cancha);

  // --- bandejas de tribuna ------------------------------------------------
  BANDEJAS.forEach(([rAbajo, rArriba, yAbajo, yArriba], i) => {
    const alto = yArriba - yAbajo;
    const mapa = arenaTexture(`butacas-${i}`, () => {
      const texture = texturaButacas();
      texture.repeat.set(46, Math.max(6, Math.round(alto * 1.6)));
      return texture;
    });

    const grada = new THREE.Mesh(
      anillo(rAbajo, rArriba, alto),
      new THREE.MeshStandardMaterial({ map: mapa, side: THREE.BackSide, roughness: 0.95 }),
    );
    grada.position.y = yAbajo + alto / 2;
    root.add(grada);

    // muro vertical bajo cada bandeja + su tira de neón arriba
    if (yAbajo > 0.5) {
      const muroAlto = yAbajo - (BANDEJAS[i - 1]?.[3] ?? 0);
      const muro = new THREE.Mesh(anillo(rAbajo, rAbajo, muroAlto), negroMate.clone());
      muro.material.side = THREE.BackSide;
      muro.position.y = yAbajo - muroAlto / 2;
      root.add(muro);
    }
    const tira = new THREE.Mesh(anillo(rArriba, rArriba, 0.34), neon);
    tira.position.y = yArriba + 0.17;
    root.add(tira);
  });

  // --- cartel LED de cancha (el que se lee desde el local) -----------------
  const cartelBajo = new THREE.Mesh(
    anillo(21.8, 21.8, 1.5),
    new THREE.MeshBasicMaterial({
      map: arenaTexture('cartel-bajo', () => texturaCartel(['FOURTWENTY', 'WE ROLL DIFFERENT', 'HOOP SEASON'])),
      side: THREE.BackSide,
    }),
  );
  cartelBajo.position.y = 1.5;
  root.add(cartelBajo);

  // --- cartel del anillo superior ----------------------------------------
  const cartelAlto = new THREE.Mesh(
    anillo(31.6, 31.6, 2.2),
    new THREE.MeshBasicMaterial({
      map: arenaTexture('cartel-alto', () => texturaCartel(['HOOP SEASON', 'FOURTWENTY'], { alto: 160 })),
      side: THREE.BackSide,
    }),
  );
  cartelAlto.position.y = 8.0;
  root.add(cartelAlto);

  // --- jumbotron de cuatro caras -----------------------------------------
  const jumbo = new THREE.Group();
  jumbo.name = 'HOOP ARENA · jumbotron';
  // Las caras del jumbotron son planos vistos de frente: acá el texto NO va
  // espejado, así que se deshace el flip que traen los carteles cilíndricos.
  const mapaJumbo = arenaTexture('jumbotron', () => texturaCartel(['FOURTWENTY'], { alto: 256, ancho: 1024 }));
  mapaJumbo.repeat.x = 1;
  mapaJumbo.offset.x = 0;
  const pantalla = new THREE.MeshBasicMaterial({ map: mapaJumbo });
  const cuerpo = new THREE.Mesh(new THREE.BoxGeometry(9, 5, 9), negroMate);
  jumbo.add(cuerpo);
  for (let i = 0; i < 4; i++) {
    const cara = new THREE.Mesh(new THREE.PlaneGeometry(8.2, 4.2), pantalla);
    const a = (i * Math.PI) / 2;
    cara.position.set(Math.sin(a) * 4.55, 0, Math.cos(a) * 4.55);
    cara.rotation.y = a;
    jumbo.add(cara);
  }
  jumbo.position.set(0, 21, 0);
  jumbo.scale.z = 1 / OVALO_Z; // que no salga estirado por el óvalo del padre
  root.add(jumbo);

  // --- techo: disco oscuro que cierra el cielo ----------------------------
  const techo = new THREE.Mesh(
    new THREE.CircleGeometry(56, 48),
    new THREE.MeshStandardMaterial({ color: 0x070809, side: THREE.BackSide, roughness: 1 }),
  );
  techo.rotation.x = -Math.PI / 2;
  techo.position.y = 30;
  root.add(techo);

  // --- luz de estadio: focos cenitales verdes suaves ----------------------
  const focos = new THREE.HemisphereLight(0x2a3340, 0x05070a, 0.55);
  root.add(focos);

  // nada del estadio proyecta ni recibe sombras: es decorado lejano
  root.traverse((o) => {
    if (!o.isMesh) return;
    o.castShadow = false;
    o.receiveShadow = false;
    o.userData.editorCollider = false;
    o.frustumCulled = true;
  });

  // La niebla original tapaba todo a 46 unidades: se corre para que el estadio
  // se vea, y el fondo pasa a negro de estadio cerrado.
  scene.background = new THREE.Color(0x05070a);
  if (scene.fog) {
    scene.fog.color.setHex(0x05070a);
    scene.fog.near = 40;
    scene.fog.far = 150;
  }

  scene.add(root);

  return {
    root,
    dispose() {},
  };
}
