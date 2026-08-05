// Prendas con volumen real para los pisos de ropa.
//
// POR QUE EXISTE ESTE ARCHIVO
// Hasta ahora una prenda colgada era `new THREE.PlaneGeometry(0.7, 0.88)` con
// una textura recortada: una calcomania plana. Desde el costado desaparecia y
// de frente no tenia ni pecho ni caida, por eso el local no llegaba al nivel
// "Binco" de GTA V aunque las paredes y el piso ya tuvieran PBR real.
//
// Aca la prenda es una malla parametrica: una seccion transversal aplastada que
// cambia de ancho y de profundidad segun la altura. Ancha y finita arriba (las
// mangas), angosta y con fondo en el pecho, y con ondas verticales que crecen
// hacia el ruedo — igual que una remera colgada de verdad, tensa arriba y
// suelta abajo.
//
// El costo es ~600 triangulos por prenda y la geometria se cachea por tipo, asi
// que 9 prendas de un perchero comparten una sola geometria en memoria.
//
// La foto del producto sigue entrando por `material.map` de la malla que
// devuelve `mesh`, asi que `bindProductVisual` funciona igual que antes.

import * as THREE from 'three';

const geometryCache = new Map();
let fabricNormalCache = null;

// ---------------------------------------------------------------------------
// Tela: normal map de trama tejida
// ---------------------------------------------------------------------------

// Genera el normal map calculando la pendiente real de una funcion de altura
// (hilos cruzados). Dibujar la trama en gris y usarla de bumpMap se ve peor:
// el bump no tiene direccion, y la luz rasante de los focos del local es
// justamente la que hace que la tela se lea como tela.
function fabricNormalTexture() {
  if (fabricNormalCache) return fabricNormalCache;
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  const image = ctx.createImageData(size, size);

  const hilos = 16; // hilos por lado del tile
  const altura = (x, y) => {
    const u = (x / size) * Math.PI * 2 * hilos;
    const v = (y / size) * Math.PI * 2 * hilos;
    // trama: un hilo horizontal y uno vertical, desfasados como un tejido
    return Math.sin(u) * 0.5 + Math.sin(v) * 0.5 + Math.sin(u + v) * 0.12;
  };

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = altura(x + 1, y) - altura(x - 1, y);
      const dy = altura(x, y + 1) - altura(x, y - 1);
      // normal = normalize(-dx, -dy, escala). Escala alta = relieve suave.
      const nx = -dx;
      const ny = -dy;
      const nz = 6.0;
      const largo = Math.hypot(nx, ny, nz);
      const i = (y * size + x) * 4;
      image.data[i] = ((nx / largo) * 0.5 + 0.5) * 255;
      image.data[i + 1] = ((ny / largo) * 0.5 + 0.5) * 255;
      image.data[i + 2] = ((nz / largo) * 0.5 + 0.5) * 255;
      image.data[i + 3] = 255;
    }
  }
  ctx.putImageData(image, 0, 0);

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(3, 4);
  texture.colorSpace = THREE.NoColorSpace; // es un mapa de datos, no color
  fabricNormalCache = texture;
  return texture;
}

// ---------------------------------------------------------------------------
// Textura de la prenda
// ---------------------------------------------------------------------------

const skinCache = new Map();

// OJO: esta textura es OPACA a proposito, a diferencia de la vieja
// `garmentTexture` de gallery.js, que dibujaba la silueta de una remera sobre
// fondo transparente. Aquella servia cuando la prenda era un plano: el recorte
// ERA la forma. Ahora la forma la da la malla 3D, y si la textura trajera
// transparencia el alphaTest le comeria las mangas al modelo. Aca la textura
// solo aporta color, costuras y estampa; la silueta ya no depende de ella.
function garmentSkinTexture({ color, type, number, monkeyFace }) {
  const clave = `${color}:${type}:${number ?? ''}:${monkeyFace ? 1 : 0}`;
  const cacheado = skinCache.get(clave);
  if (cacheado) return cacheado;

  const W = 256;
  const H = 320;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  const base = `#${color.toString(16).padStart(6, '0')}`;

  ctx.fillStyle = base;
  ctx.fillRect(0, 0, W, H);

  // Mangas: la UV mapea la posicion horizontal real, asi que las esquinas de
  // arriba de la textura caen sobre las mangas de la malla. Sombrearlas ahi es
  // lo que hace que se despeguen del pecho — la geometria sola no alcanza
  // porque la manga y el torso comparten la misma curva.
  if (type !== 'jersey') {
    ctx.fillStyle = 'rgba(0,0,0,0.13)';
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(W * 0.2, 0);
    ctx.lineTo(W * 0.15, H * 0.26); ctx.lineTo(0, H * 0.24); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(W, 0); ctx.lineTo(W * 0.8, 0);
    ctx.lineTo(W * 0.85, H * 0.26); ctx.lineTo(W, H * 0.24); ctx.closePath(); ctx.fill();
  }

  // costuras: las verticales son las axilas, la de abajo es el ruedo
  ctx.strokeStyle = 'rgba(0,0,0,0.2)';
  ctx.lineWidth = 2;
  for (const x of [W * 0.16, W * 0.84]) {
    ctx.beginPath(); ctx.moveTo(x, H * 0.2); ctx.lineTo(x, H * 0.97); ctx.stroke();
  }
  ctx.beginPath(); ctx.moveTo(W * 0.1, H * 0.955); ctx.lineTo(W * 0.9, H * 0.955); ctx.stroke();

  // cuello (la fila de arriba de la malla es el hombro)
  if (type !== 'jersey') {
    ctx.fillStyle = 'rgba(0,0,0,0.24)';
    ctx.beginPath();
    ctx.ellipse(W / 2, H * 0.045, W * 0.14, H * 0.035, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  if (type === 'hoodie') {
    // bolsillo canguro
    ctx.strokeStyle = 'rgba(0,0,0,0.22)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.roundRect(W * 0.27, H * 0.62, W * 0.46, H * 0.2, 10);
    ctx.stroke();
  }

  // estampa del pecho
  const cx = W / 2;
  const cy = H * 0.35;
  const claro = ((color >> 16) & 255) * 0.299 + ((color >> 8) & 255) * 0.587 + (color & 255) * 0.114 > 140;
  ctx.fillStyle = claro ? 'rgba(20,20,22,0.9)' : 'rgba(240,238,232,0.92)';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  if (monkeyFace) {
    ctx.beginPath(); ctx.arc(cx, cy, 34, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = base;
    ctx.beginPath(); ctx.arc(cx - 12, cy - 6, 6, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(cx + 12, cy - 6, 6, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(cx, cy + 12, 13, 0, Math.PI); ctx.fill();
  } else if (number != null) {
    ctx.font = 'bold 96px Impact, sans-serif';
    ctx.fillText(String(number), cx, cy);
  } else {
    // estampa de pecho, no cartel: ocupa poco mas de un tercio del ancho
    ctx.font = 'bold 38px Impact, sans-serif';
    ctx.fillText('FT', cx, cy);
    ctx.font = 'bold 11px monospace';
    ctx.fillText('FOURTWENTY', cx, cy + 29);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  skinCache.set(clave, texture);
  return texture;
}

// ---------------------------------------------------------------------------
// Silueta de la prenda
// ---------------------------------------------------------------------------

// Perfiles: [altura relativa (0 hombros, 1 ruedo), valor]. Entre puntos se
// interpola suave (smoothstep), asi la manga no termina en un escalon duro.
// Medidas tomadas de prendas reales: una remera de hombre colgada mide unos
// 54 cm de ancho por 74 de alto. La proporcion importa mas que el detalle: con
// ancho y alto parecidos la prenda se lee como un barril, no como ropa.
//
// La clave de que se lean las MANGAS es el contraste de fondo, no el de ancho:
// la manga es ancha pero PLANA (fondo 0.045) y el pecho es mas angosto pero
// PROFUNDO (fondo 0.10). Esa diferencia es la que hace que la luz separe una
// cosa de la otra. Subiendo solo el ancho se obtiene un cono, no una manga.
const PERFILES = {
  tee: {
    alto: 0.74,
    // El hombro se abre en dos tramos (0->0.09) en vez de uno: si sube de golpe
    // queda un escalon horizontal y la prenda parece una bolsa con asas.
    // La axila es el tramo corto 0.17->0.25, que si tiene que ser marcado.
    ancho: [[0, 0.135], [0.03, 0.21], [0.09, 0.265], [0.17, 0.255], [0.25, 0.21], [0.60, 0.205], [1, 0.225]],
    fondo: [[0, 0.03], [0.05, 0.042], [0.26, 0.10], [0.62, 0.092], [1, 0.078]],
  },
  hoodie: {
    alto: 0.82,
    ancho: [[0, 0.17], [0.04, 0.30], [0.18, 0.285], [0.26, 0.235], [0.62, 0.23], [1, 0.25]],
    fondo: [[0, 0.05], [0.06, 0.062], [0.28, 0.125], [0.64, 0.115], [1, 0.10]],
  },
  jersey: {
    alto: 0.70,
    // musculosa: sin mangas, hombros angostos y sin el pico de ancho de arriba
    ancho: [[0, 0.10], [0.06, 0.165], [0.30, 0.20], [0.65, 0.195], [1, 0.21]],
    fondo: [[0, 0.03], [0.30, 0.09], [0.65, 0.085], [1, 0.075]],
  },
};

function interpolar(perfil, t) {
  for (let i = 0; i < perfil.length - 1; i++) {
    const [t0, v0] = perfil[i];
    const [t1, v1] = perfil[i + 1];
    if (t > t1) continue;
    const k = t1 === t0 ? 0 : (t - t0) / (t1 - t0);
    const suave = k * k * (3 - 2 * k); // smoothstep
    return v0 + (v1 - v0) * suave;
  }
  return perfil[perfil.length - 1][1];
}

/**
 * Malla cerrada de una prenda colgada. La seccion transversal es una elipse
 * aplastada cuyo ancho y fondo cambian con la altura; encima se le suman ondas
 * verticales que crecen hacia abajo (arriba la percha la mantiene tensa).
 */
function garmentGeometry(type) {
  const cacheado = geometryCache.get(type);
  if (cacheado) return cacheado;

  const perfil = PERFILES[type] ?? PERFILES.tee;
  const COLUMNAS = 20; // vuelta completa a la seccion
  const FILAS = 22;    // de hombros a ruedo
  const anchoMaximo = Math.max(...perfil.ancho.map(([, v]) => v));

  const posiciones = [];
  const uvs = [];
  const indices = [];

  for (let fila = 0; fila <= FILAS; fila++) {
    const t = fila / FILAS;
    const semiAncho = interpolar(perfil.ancho, t);
    const semiFondo = interpolar(perfil.fondo, t);
    const y = -t * perfil.alto;
    // las ondas casi no existen en el hombro y se abren hacia el ruedo
    const onda = 0.055 * Math.pow(t, 1.7);

    for (let col = 0; col <= COLUMNAS; col++) {
      const angulo = (col / COLUMNAS) * Math.PI * 2;
      const pliegue = 1 + onda * Math.sin(angulo * 5 + t * 2.6);
      const x = Math.cos(angulo) * semiAncho * pliegue;
      const z = Math.sin(angulo) * semiFondo * pliegue;
      posiciones.push(x, y, z);
      // la foto del producto se mapea por posicion horizontal real, asi queda
      // centrada en el frente y no estirada en los costados
      uvs.push(0.5 + (x / anchoMaximo) * 0.5, 1 - t);
    }
  }

  const porFila = COLUMNAS + 1;
  for (let fila = 0; fila < FILAS; fila++) {
    for (let col = 0; col < COLUMNAS; col++) {
      const a = fila * porFila + col;
      const b = a + porFila;
      indices.push(a, b, a + 1, a + 1, b, b + 1);
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(posiciones, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  geometryCache.set(type, geometry);
  return geometry;
}

// ---------------------------------------------------------------------------
// Percha
// ---------------------------------------------------------------------------

// Antes las perchas eran `LineSegments`: lineas de 1 pixel que no reciben luz
// ni proyectan sombra, se veian como alambre de wireframe. Ahora son tubos
// reales de ~1 cm con material metalico.
function createHanger(material, ancho = 0.34) {
  const group = new THREE.Group();
  group.name = 'Percha';

  const cuerpo = new THREE.TubeGeometry(
    new THREE.CatmullRomCurve3([
      new THREE.Vector3(-ancho / 2, -0.005, 0),
      new THREE.Vector3(-ancho / 4, 0.075, 0),
      new THREE.Vector3(0, 0.105, 0),
      new THREE.Vector3(ancho / 4, 0.075, 0),
      new THREE.Vector3(ancho / 2, -0.005, 0),
    ]),
    18, 0.0075, 6, false,
  );
  group.add(new THREE.Mesh(cuerpo, material));

  // travesaño de abajo
  const travesano = new THREE.CylinderGeometry(0.006, 0.006, ancho, 6);
  travesano.rotateZ(Math.PI / 2);
  travesano.translate(0, -0.005, 0);
  group.add(new THREE.Mesh(travesano, material));

  // gancho
  const gancho = new THREE.TorusGeometry(0.032, 0.0065, 6, 14, Math.PI * 1.55);
  gancho.rotateY(Math.PI / 2);
  gancho.translate(0, 0.137, 0);
  group.add(new THREE.Mesh(gancho, material));
  const cuello = new THREE.CylinderGeometry(0.0065, 0.0065, 0.04, 6);
  cuello.translate(0, 0.118, 0);
  group.add(new THREE.Mesh(cuello, material));

  return group;
}

// ---------------------------------------------------------------------------
// API
// ---------------------------------------------------------------------------

/**
 * Prenda colgada completa (tela + percha).
 *
 * Devuelve `{ group, mesh }`. `mesh` es la malla de tela: es la que hay que
 * pasarle a `bindProductVisual` para que la foto real del producto reemplace
 * la textura de placeholder.
 */
export function createHangingGarment({
  color,
  type = 'tee',
  number = null,
  monkeyFace = false,
  hangerMaterial,
  variacion = 0,
}) {
  const group = new THREE.Group();
  const texture = garmentSkinTexture({ color, type, number, monkeyFace });

  const material = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: texture,
    normalMap: fabricNormalTexture(),
    // la trama es sutil: si se pasa, la remera parece arpillera
    normalScale: new THREE.Vector2(0.28, 0.28),
    // el algodon no brilla, pero tampoco es tiza: 0.9 con un toque de variacion
    roughness: 0.88 + (variacion % 3) * 0.03,
    metalness: 0,
    // alphaTest 0 a proposito: la silueta la da la malla, no el recorte de la
    // textura. bindProductVisual copia este valor como fallback, asi que si
    // aca hubiera recorte, la prenda quedaria mordida al no haber producto.
    alphaTest: 0,
    side: THREE.DoubleSide,
  });

  const mesh = new THREE.Mesh(garmentGeometry(type), material);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  group.add(mesh);

  const hanger = createHanger(hangerMaterial);
  hanger.position.y = 0.045;
  group.add(hanger);

  // Ninguna prenda cuelga igual que la de al lado: sin esta variacion un
  // perchero se lee como un sello repetido.
  const giro = Math.sin(variacion * 12.9898) * 0.5;
  group.rotation.y = giro * 0.13;
  group.rotation.z = Math.cos(variacion * 4.1414) * 0.035;
  group.scale.setScalar(0.97 + (variacion % 4) * 0.018);

  return { group, mesh };
}

/** Pila de prendas dobladas para estantes y mesas. */
export function createFoldedStack({ colors, material, cantidad = 4, ancho = 0.34 }) {
  const group = new THREE.Group();
  let y = 0;
  for (let i = 0; i < cantidad; i++) {
    const alto = 0.045 + (i % 2) * 0.008;
    const geometry = new THREE.BoxGeometry(ancho, alto, ancho * 0.82);
    const tela = material.clone();
    tela.color = new THREE.Color(colors[i % colors.length]);
    tela.normalMap = fabricNormalTexture();
    tela.normalScale = new THREE.Vector2(0.22, 0.22);
    const pieza = new THREE.Mesh(geometry, tela);
    pieza.castShadow = true;
    pieza.receiveShadow = true;
    // las pilas reales nunca estan perfectamente alineadas
    pieza.position.set(Math.sin(i * 3.1) * 0.012, y + alto / 2, Math.cos(i * 2.3) * 0.01);
    pieza.rotation.y = Math.sin(i * 7.7) * 0.06;
    group.add(pieza);
    y += alto;
  }
  return group;
}
