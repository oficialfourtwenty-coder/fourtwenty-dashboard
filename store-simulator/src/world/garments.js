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
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { applyGarmentPrint } from './garmentPrints.js';

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
// Fraccion del ancho de la textura que ocupa el TORSO. La UV mapea por posicion
// horizontal real, asi que al sumarle mangas de verdad el torso dejo de ocupar
// la textura entera: las costuras dibujadas en 0.16/0.84 caian sobre las mangas
// y se veian como una banda blanca en el biceps. Con esto las costuras se
// colocan donde estan los costados reales del cuerpo, sea cual sea la prenda.
function proporcionCuerpo(perfil) {
  const anchoCuerpo = Math.max(...perfil.ancho.map(([, v]) => v));
  const alcanceManga = perfil.mangas
    ? perfil.mangas.desdeX
      + perfil.mangas.largo * Math.sin(perfil.mangas.inclinacion)
      + Math.max(...perfil.mangas.ancho.map(([, v]) => v))
    : 0;
  const anchoPierna = perfil.piernas ? Math.max(...perfil.piernas.ancho.map(([, v]) => v)) : 0;
  const maximo = Math.max(anchoCuerpo, alcanceManga, anchoPierna);
  return maximo > 0 ? anchoCuerpo / maximo : 1;
}

function garmentSkinTexture({ color, type, number, monkeyFace, limpia = false }) {
  const clave = `${color}:${type}:${number ?? ''}:${monkeyFace ? 1 : 0}:${limpia ? 'l' : ''}`;
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

  const perfilTex = PERFILES[type] ?? PERFILES.tee;
  const r = proporcionCuerpo(perfilTex); // medio-ancho del torso en la textura
  // Bordes reales del torso dentro de la textura. Todo lo que se dibuje fuera
  // de este rango cae sobre las mangas o las piernas, no sobre el pecho.
  const bordeIzq = 0.5 - r * 0.5;
  const bordeDer = 0.5 + r * 0.5;
  const dentro = (f) => (bordeIzq + (bordeDer - bordeIzq) * f) * W;

  // Sombreado de axila: solo para las prendas SIN manga modelada. Las que ya
  // tienen manga de verdad (tee, hoodie) no lo necesitan — la geometria hace el
  // trabajo — y dibujarlo ademas les manchaba el hombro.
  if (type !== 'jersey' && !perfilTex.mangas) {
    ctx.fillStyle = 'rgba(0,0,0,0.13)';
    ctx.beginPath(); ctx.moveTo(dentro(0), 0); ctx.lineTo(dentro(0.2), 0);
    ctx.lineTo(dentro(0.15), H * 0.26); ctx.lineTo(dentro(0), H * 0.24); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(dentro(1), 0); ctx.lineTo(dentro(0.8), 0);
    ctx.lineTo(dentro(0.85), H * 0.26); ctx.lineTo(dentro(1), H * 0.24); ctx.closePath(); ctx.fill();
  }

  // costuras: las verticales son los costados, la de abajo es el ruedo
  ctx.strokeStyle = 'rgba(0,0,0,0.2)';
  ctx.lineWidth = 2;
  for (const f of [0.05, 0.95]) {
    ctx.beginPath(); ctx.moveTo(dentro(f), H * 0.2); ctx.lineTo(dentro(f), H * 0.97); ctx.stroke();
  }
  ctx.beginPath(); ctx.moveTo(dentro(0.02), H * 0.955); ctx.lineTo(dentro(0.98), H * 0.955); ctx.stroke();

  // cuello (la fila de arriba de la malla es el hombro)
  if (type !== 'jersey' && !perfilTex.piernas) {
    ctx.fillStyle = 'rgba(0,0,0,0.24)';
    ctx.beginPath();
    ctx.ellipse(W / 2, H * 0.045, W * r * 0.16, H * 0.035, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  if (type === 'hoodie') {
    // bolsillo canguro
    ctx.strokeStyle = 'rgba(0,0,0,0.22)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.roundRect(dentro(0.16), H * 0.62, dentro(0.84) - dentro(0.16), H * 0.2, 10);
    ctx.stroke();
  }

  // Estampa de relleno. Se saltea cuando la prenda trae su propia estampa
  // (garmentPrints.js): son dos estampas en el mismo pecho, y ademas esta se
  // dibuja espejada tambien en el dorso porque la UV envuelve la seccion.
  if (limpia) {
    const texturaLimpia = new THREE.CanvasTexture(canvas);
    texturaLimpia.colorSpace = THREE.SRGBColorSpace;
    texturaLimpia.anisotropy = 4;
    skinCache.set(clave, texturaLimpia);
    return texturaLimpia;
  }

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
// ⚠️ EL FONDO VA CORTO A PROPOSITO (06/08, corregido con capturas HD de Binco).
// Una prenda colgada de una percha NO tiene panza: la tela cae y se aplasta
// contra si misma. En las fotos de GTA, un perchero visto de costado es casi
// una lamina — se ven los cantos, no volumenes. Antes tenia `fondo` hasta 0.10
// (20 cm de espesor de pecho, mas que una campera inflada) y por eso cada
// prenda se leia como un cilindro de color. Ahora el pecho queda en ~11 cm de
// espesor total, que es lo que mide una remera colgada de verdad.
// El volumen NO es lo que las hace ver reales: son los pliegues oscuros.
const PERFILES = {
  tee: {
    alto: 0.74,
    // El hombro se abre en dos tramos (0->0.09) en vez de uno: si sube de golpe
    // queda un escalon horizontal y la prenda parece una bolsa con asas.
    // Ya NO llega a 0.265: el ancho de hombro que sobraba era el intento de
    // insinuar las mangas ensanchando el torso, y lo unico que lograba era una
    // musculosa gorda. Ahora el torso es un torso y las mangas son mangas.
    ancho: [[0, 0.125], [0.03, 0.175], [0.10, 0.196], [0.25, 0.196], [0.60, 0.196], [1, 0.214]],
    fondo: [[0, 0.022], [0.05, 0.030], [0.26, 0.056], [0.62, 0.052], [1, 0.046]],
    mangas: {
      largo: 0.21, desdeY: 0.055, desdeX: 0.175,
      inclinacion: 0.72,   // radianes desde la vertical: cae abierta, no pegada
      ancho: [[0, 0.078], [1, 0.070]],
      fondo: [[0, 0.052], [1, 0.044]],
    },
  },
  hoodie: {
    alto: 0.82,
    ancho: [[0, 0.155], [0.04, 0.215], [0.18, 0.228], [0.26, 0.228], [0.62, 0.228], [1, 0.246]],
    // el buzo si tiene mas cuerpo que una remera, pero sigue lejos de una pelota
    fondo: [[0, 0.034], [0.06, 0.042], [0.28, 0.075], [0.64, 0.070], [1, 0.062]],
    // manga larga: llega casi al ruedo y se afina hacia el puño
    mangas: {
      largo: 0.46, desdeY: 0.075, desdeX: 0.205,
      inclinacion: 0.52,
      ancho: [[0, 0.092], [0.75, 0.070], [1, 0.060]],
      fondo: [[0, 0.066], [0.75, 0.052], [1, 0.046]],
    },
  },
  jersey: {
    alto: 0.70,
    // musculosa: sin mangas, hombros angostos y sin el pico de ancho de arriba
    ancho: [[0, 0.10], [0.06, 0.165], [0.30, 0.20], [0.65, 0.195], [1, 0.21]],
    fondo: [[0, 0.03], [0.30, 0.09], [0.65, 0.085], [1, 0.075]],
  },
  // ---- Prendas de abajo -----------------------------------------------------
  // Un pantalon NO es un tubo: de la cintura a la entrepierna es un cuerpo
  // solo, y de ahi para abajo son dos. Por eso estos perfiles tienen `piernas`:
  // `ancho`/`fondo` describen la cadera (de t=0 a t=`piernas.desde`) y
  // `piernas.ancho`/`piernas.fondo` describen UNA pierna, con su propio t local
  // de 0 (entrepierna) a 1 (botamanga). garmentGeometry barre las tres piezas y
  // las fusiona en una sola malla: 1 llamada de dibujo, igual que una remera.
  pantalon: {
    alto: 1.04,
    // colgado de las presillas: la cintura queda tensa y la cadera se abre poco
    ancho: [[0, 0.165], [0.35, 0.19], [1, 0.195]],
    fondo: [[0, 0.075], [0.35, 0.10], [1, 0.108]],
    piernas: {
      desde: 0.30,        // t donde termina la cadera y arrancan las dos piernas
      separacion: 0.086,  // del eje al centro de cada pierna
      // la pierna se afina hacia abajo, pero no termina en punta: la botamanga
      // real de un jean queda casi recta en el ultimo tercio
      ancho: [[0, 0.092], [0.30, 0.072], [0.75, 0.061], [1, 0.059]],
      fondo: [[0, 0.086], [0.30, 0.070], [0.75, 0.060], [1, 0.058]],
    },
  },
  bermuda: {
    alto: 0.62,
    // mas ancha de cadera y mas corta: la bermuda cuelga suelta, no ajustada
    ancho: [[0, 0.17], [0.35, 0.205], [1, 0.215]],
    fondo: [[0, 0.078], [0.35, 0.108], [1, 0.118]],
    piernas: {
      desde: 0.46,        // la entrepierna cae mas abajo que en un pantalon
      separacion: 0.092,
      // pierna ancha y recta: si se afina se lee como un pantalon cortado
      ancho: [[0, 0.105], [0.4, 0.10], [1, 0.098]],
      fondo: [[0, 0.098], [0.4, 0.095], [1, 0.094]],
    },
  },
};

/** Alto total de la prenda en metros (lo usa el editor de estampas). */
export function garmentHeight(type) {
  return (PERFILES[type] ?? PERFILES.tee).alto;
}

export function garmentTypes() {
  return Object.keys(PERFILES);
}

// Onda de pliegues: casi nula en el hombro, se abre hacia el ruedo (arriba la
// percha mantiene la tela tensa). Vive en su propia funcion porque la estampa
// tiene que apoyarse sobre EXACTAMENTE la misma superficie que la tela: si la
// calcula distinto, el parche flota o se hunde en los pliegues.
function pliegue(t, angulo) {
  return 1 + 0.055 * Math.pow(t, 1.7) * Math.sin(angulo * 5 + t * 2.6);
}

/**
 * Punto de la superficie de la prenda en (t, angulo), en el espacio local de
 * la malla. `t` va de 0 (hombros/cintura) a 1 (ruedo/botamanga); `angulo` da la
 * vuelta a la seccion — PI/2 es el centro del FRENTE y 3PI/2 el del DORSO.
 *
 * Exportada para que las estampas puedan generar un parche que siga la curva
 * real de la tela en vez de un cartel plano pegado encima.
 */
export function garmentSurfacePoint(type, t, angulo, destino = { x: 0, y: 0, z: 0 }) {
  const perfil = PERFILES[type] ?? PERFILES.tee;
  const pierna = perfil.piernas;

  // En un pantalon el frente util esta en la cadera; abajo son dos tubos y una
  // estampa no tendria donde apoyarse, asi que el parche se queda en la cadera.
  const tCuerpo = pierna ? Math.min(t, pierna.desde) : t;
  const semiAncho = interpolar(perfil.ancho, pierna ? tCuerpo / pierna.desde : tCuerpo);
  const semiFondo = interpolar(perfil.fondo, pierna ? tCuerpo / pierna.desde : tCuerpo);
  const p = pliegue(tCuerpo, angulo);

  destino.x = Math.cos(angulo) * semiAncho * p;
  destino.y = -tCuerpo * perfil.alto;
  destino.z = Math.sin(angulo) * semiFondo * p;
  destino.semiAncho = semiAncho * p;
  destino.semiFondo = semiFondo * p;
  return destino;
}

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

// AO DE PLIEGUE — lo que separa esto de "geometria basica".
//
// Mirando las prendas colgadas de Binco (GTA V): la tela es lisa y de un color
// plano, y lo que las hace leer como ropa son las ARRUGAS OSCURAS. Los pliegues
// ya existian en la malla, pero solo como forma: la luz de la tienda es difusa,
// asi que una ondulacion de 5 mm casi no cambia el sombreado y la prenda volvia
// a leerse como un cilindro de color.
//
// Aca se hornea la oclusion en el color de vertice: donde la tela se mete hacia
// adentro (valle del pliegue) se oscurece, donde sobresale (cresta) queda
// limpia. Es gratis — ni una textura ni un triangulo mas — y va multiplicado
// sobre el color del material, asi que funciona con cualquier color de prenda.
//
// El termino de altura suma la sombra que cae naturalmente en el ruedo y bajo
// las mangas, que es lo que evita que la prenda flote sin peso.
function aoDePliegue(t, angulo) {
  // -1 en el valle, +1 en la cresta: la misma onda que deforma la geometria
  const onda = Math.sin(angulo * 5 + t * 2.6);
  // solo oscurece (nunca aclara): las crestas quedan en 1, los valles bajan
  const valle = (1 - onda) * 0.5;              // 0 cresta ... 1 valle
  const fuerza = 0.30 * Math.pow(t, 1.2);      // arriba la percha estira la tela
  // Sombra de contacto: la axila y el ruedo siempre estan mas oscuros.
  const axila = Math.exp(-Math.pow((t - 0.22) / 0.10, 2)) * 0.12;
  return 1 - valle * fuerza - axila;
}

// Barre una seccion (elipse aplastada) a lo largo de la altura y devuelve los
// arrays crudos. `desplazamientoX` corre la pieza al costado, que es lo que
// permite armar las dos piernas de un pantalon con la misma funcion.
function barrerSeccion({
  perfilAncho, perfilFondo, alto, yInicial = 0,
  tGlobalDesde = 0, tGlobalHasta = 1,
  desplazamientoX = 0, columnas, filas, anchoMaximo,
  // Banda de U fija [desde, hasta] en vez de mapear por posicion horizontal.
  // Hace falta para las MANGAS: se barren derechas y se rotan despues, asi que
  // su x local es chico y la UV por posicion las mandaba al centro de la
  // textura — o sea que la manga mostraba un pedazo del logo del pecho. Se veia
  // como una mancha clara en el biceps.
  uFijo = null,
}) {
  const posiciones = [];
  const uvs = [];
  const colores = [];
  const indices = [];

  for (let fila = 0; fila <= filas; fila++) {
    const tLocal = fila / filas;
    // t global = altura dentro de la prenda entera. Es lo que usan el AO y la
    // UV, para que una pierna no repita el degrade de la cadera.
    const tGlobal = tGlobalDesde + (tGlobalHasta - tGlobalDesde) * tLocal;
    const semiAncho = interpolar(perfilAncho, tLocal);
    const semiFondo = interpolar(perfilFondo, tLocal);
    const y = yInicial - tLocal * alto;
    const onda = 0.055 * Math.pow(tGlobal, 1.7);

    for (let col = 0; col <= columnas; col++) {
      const angulo = (col / columnas) * Math.PI * 2;
      const p = 1 + onda * Math.sin(angulo * 5 + tGlobal * 2.6);
      const x = Math.cos(angulo) * semiAncho * p + desplazamientoX;
      const z = Math.sin(angulo) * semiFondo * p;
      posiciones.push(x, y, z);
      // la foto del producto se mapea por posicion horizontal real, asi queda
      // centrada en el frente y no estirada en los costados
      const u = uFijo
        ? uFijo[0] + (uFijo[1] - uFijo[0]) * (col / columnas)
        : 0.5 + (x / anchoMaximo) * 0.5;
      uvs.push(u, 1 - tGlobal);
      const ao = aoDePliegue(tGlobal, angulo);
      colores.push(ao, ao, ao);
    }
  }

  const porFila = columnas + 1;
  for (let fila = 0; fila < filas; fila++) {
    for (let col = 0; col < columnas; col++) {
      const a = fila * porFila + col;
      const b = a + porFila;
      indices.push(a, b, a + 1, a + 1, b, b + 1);
    }
  }

  return { posiciones, uvs, colores, indices };
}

function geometriaDesde({ posiciones, uvs, colores, indices }) {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(posiciones, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colores, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

/**
 * Malla cerrada de una prenda colgada. La seccion transversal es una elipse
 * aplastada cuyo ancho y fondo cambian con la altura; encima se le suman ondas
 * verticales que crecen hacia abajo (arriba la percha la mantiene tensa).
 *
 * Las prendas de abajo (pantalon, bermuda) se arman con TRES barridos —cadera y
 * dos piernas— fusionados en una sola geometria. Fusionar importa: tres mallas
 * sueltas serian tres llamadas de dibujo por pantalon, y en este proyecto las
 * llamadas de dibujo pesan mas que los triangulos.
 */
function garmentGeometry(type) {
  const cacheado = geometryCache.get(type);
  if (cacheado) return cacheado;

  const perfil = PERFILES[type] ?? PERFILES.tee;
  // 16x18 = 576 triangulos por prenda. Con 20x22 (880) no se notaba diferencia
  // a la distancia real a la que se mira un perchero, y eran 5.500 triangulos
  // de mas por piso. Las normales suavizadas hacen el trabajo.
  const COLUMNAS = 16; // vuelta completa a la seccion
  const FILAS = 18;    // de hombros a ruedo
  // Incluye la punta de la manga: la UV mapea por posicion horizontal real, y
  // si el maximo no contempla las mangas estas se salen de la textura y quedan
  // de un color plano.
  const alcanceManga = perfil.mangas
    ? perfil.mangas.desdeX
      + perfil.mangas.largo * Math.sin(perfil.mangas.inclinacion)
      + Math.max(...perfil.mangas.ancho.map(([, v]) => v))
    : 0;
  const anchoMaximo = Math.max(
    ...perfil.ancho.map(([, v]) => v),
    ...(perfil.piernas ? perfil.piernas.ancho.map(([, v]) => v) : []),
    alcanceManga,
  );

  let geometry;
  if (perfil.mangas) {
    // MANGAS COMO PIEZA PROPIA (06/08). Antes se insinuaban ensanchando el
    // hombro del torso, y el resultado era una musculosa ancha: una remera
    // colgada tiene las mangas SALIENDO del cuerpo en diagonal, con un hueco de
    // sombra en la axila. Eso no se puede hacer con una sola seccion barrida.
    // Cada manga es un barrido corto que se rota y se pega al hombro; las tres
    // piezas se fusionan, asi que la remera sigue costando 1 llamada de dibujo.
    const m = perfil.mangas;
    const piezas = [geometriaDesde(barrerSeccion({
      perfilAncho: perfil.ancho, perfilFondo: perfil.fondo,
      alto: perfil.alto, columnas: COLUMNAS, filas: FILAS, anchoMaximo,
    }))];

    for (const lado of [-1, 1]) {
      const manga = geometriaDesde(barrerSeccion({
        perfilAncho: m.ancho, perfilFondo: m.fondo,
        alto: m.largo,
        // t global bajo a proposito: la manga cuelga del hombro, donde la tela
        // esta tensa. Con el t real de su altura le tocaria el AO del ruedo y
        // saldria mas oscura que el pecho que tiene al lado.
        tGlobalDesde: 0.10, tGlobalHasta: 0.34,
        columnas: 8, filas: 5, anchoMaximo,
        // Zona lisa de la textura, a la izquierda del costado del torso
        // (`proporcionCuerpo` deja libre todo lo que esta antes de ~0.22).
        // Ahi no hay ni logo ni costuras: la manga sale de tela limpia.
        uFijo: [0.05, 0.19],
      }));
      // Se rota sobre Z para abrirla hacia afuera y se lleva al hombro. El
      // orden importa: primero girar en el origen, despues trasladar.
      manga.applyMatrix4(new THREE.Matrix4()
        .makeTranslation(lado * m.desdeX, -m.desdeY, 0)
        .multiply(new THREE.Matrix4().makeRotationZ(lado * m.inclinacion)));
      piezas.push(manga);
    }

    geometry = mergeGeometries(piezas, false);
    for (const pieza of piezas) pieza.dispose();
  } else if (!perfil.piernas) {
    geometry = geometriaDesde(barrerSeccion({
      perfilAncho: perfil.ancho, perfilFondo: perfil.fondo,
      alto: perfil.alto, columnas: COLUMNAS, filas: FILAS, anchoMaximo,
    }));
  } else {
    const { desde, separacion, ancho: anchoPierna, fondo: fondoPierna } = perfil.piernas;
    const altoCadera = perfil.alto * desde;
    const altoPierna = perfil.alto * (1 - desde);
    // La cadera se lleva menos filas que las piernas: es mas corta y casi no
    // cambia de forma, mientras que la pierna es donde se ve la caida.
    const filasCadera = Math.max(4, Math.round(FILAS * desde));
    const filasPierna = FILAS - filasCadera;

    const piezas = [geometriaDesde(barrerSeccion({
      perfilAncho: perfil.ancho, perfilFondo: perfil.fondo,
      alto: altoCadera, tGlobalDesde: 0, tGlobalHasta: desde,
      columnas: COLUMNAS, filas: filasCadera, anchoMaximo,
    }))];

    for (const lado of [-1, 1]) {
      piezas.push(geometriaDesde(barrerSeccion({
        perfilAncho: anchoPierna, perfilFondo: fondoPierna,
        alto: altoPierna, yInicial: -altoCadera,
        tGlobalDesde: desde, tGlobalHasta: 1,
        desplazamientoX: lado * separacion,
        // la pierna es un tubo: con menos columnas se lee igual y ahorra el
        // 40% de los triangulos de un pantalon
        columnas: 10, filas: filasPierna, anchoMaximo,
      })));
    }

    geometry = mergeGeometries(piezas, false);
    for (const pieza of piezas) pieza.dispose();
  }

  geometryCache.set(type, geometry);
  return geometry;
}

// ---------------------------------------------------------------------------
// Percha
// ---------------------------------------------------------------------------

// Antes las perchas eran `LineSegments`: lineas de 1 pixel que no reciben luz
// ni proyectan sombra, se veian como alambre de wireframe. Ahora son tubos
// reales de ~1 cm con material metalico.
// Las 4 piezas (cuerpo, travesaño, gancho y cuello) se fusionan en UNA sola
// geometria. Si se dejan como 4 mallas, cada percha cuesta 4 llamadas de
// dibujo: con 9 prendas por perchero son 36 llamadas para un objeto de 30 cm
// que casi no se ve. Las llamadas de dibujo pesan mas que los triangulos,
// sobre todo en celular. La geometria se cachea: todas las perchas comparten
// la misma.
let hangerGeometryCache = null;

function hangerGeometry(ancho = 0.34) {
  if (hangerGeometryCache) return hangerGeometryCache;

  const cuerpo = new THREE.TubeGeometry(
    new THREE.CatmullRomCurve3([
      new THREE.Vector3(-ancho / 2, -0.005, 0),
      new THREE.Vector3(-ancho / 4, 0.075, 0),
      new THREE.Vector3(0, 0.105, 0),
      new THREE.Vector3(ancho / 4, 0.075, 0),
      new THREE.Vector3(ancho / 2, -0.005, 0),
    ]),
    12, 0.0075, 5, false,
  );

  const travesano = new THREE.CylinderGeometry(0.006, 0.006, ancho, 5);
  travesano.rotateZ(Math.PI / 2);
  travesano.translate(0, -0.005, 0);

  const gancho = new THREE.TorusGeometry(0.032, 0.0065, 5, 10, Math.PI * 1.55);
  gancho.rotateY(Math.PI / 2);
  gancho.translate(0, 0.137, 0);

  const cuello = new THREE.CylinderGeometry(0.0065, 0.0065, 0.04, 5);
  cuello.translate(0, 0.118, 0);

  hangerGeometryCache = mergeGeometries([cuerpo, travesano, gancho, cuello], false);
  return hangerGeometryCache;
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
  // Estampa propia: cuando la prenda la trae, la textura del cuerpo se dibuja
  // LIMPIA (sin el "FT" de relleno) para que no se superponga con el diseño de
  // verdad. Ver world/garmentPrints.js.
  print = null,
}) {
  const group = new THREE.Group();
  const conEstampaPropia = Boolean(print?.frente?.imagen || print?.dorso?.imagen);
  const texture = garmentSkinTexture({
    color, type, number, monkeyFace, limpia: conEstampaPropia,
  });

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
    // AO de pliegue horneado en el color de vertice (ver aoDePliegue). Es lo
    // que hace que las arrugas se OSCUREZCAN: sin esto la luz difusa de la
    // tienda no marca una ondulacion de 5 mm y la prenda vuelve a leerse como
    // un cilindro de color plano.
    vertexColors: true,
  });

  const mesh = new THREE.Mesh(garmentGeometry(type), material);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  // Marca para encontrar la tela dentro del grupo sin depender del nombre, que
  // se lo pone cada piso a su gusto.
  mesh.userData.garmentBody = true;
  group.add(mesh);

  // Datos que necesita el editor de estampas para reconocer la prenda y
  // redibujarla sin tener que reconstruir la escena.
  group.userData.garment = { type, color, variacion };
  if (print) {
    applyGarmentPrint(group, type, 'frente', print.frente);
    applyGarmentPrint(group, type, 'dorso', print.dorso);
    group.userData.garment.print = print;
  }

  const hanger = new THREE.Mesh(hangerGeometry(), hangerMaterial);
  hanger.name = 'Percha';
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

/**
 * Cambia el cuerpo y/o el color de una prenda YA construida, sin rehacer la
 * escena. Lo usa el editor de prendas cuando Kusher elige otro tipo o retoca el
 * color.
 *
 * La geometria NO se libera: viene del cache compartido por tipo, asi que otras
 * prendas del mismo tipo la estan usando. La textura vieja tampoco: tambien
 * esta cacheada por color+tipo. Liberar cualquiera de las dos dejaria en negro
 * a las prendas vecinas.
 */
export function restyleGarment(group, { type, color, limpia = false }) {
  const info = group?.userData?.garment;
  if (!info) return null;

  let cuerpo = null;
  group.traverse((hijo) => {
    if (!cuerpo && hijo.userData?.garmentBody) cuerpo = hijo;
  });
  if (!cuerpo) return null;

  const tipoFinal = PERFILES[type] ? type : info.type;
  info.type = tipoFinal;
  if (Number.isFinite(color)) info.color = color;

  cuerpo.geometry = garmentGeometry(tipoFinal);
  cuerpo.material.map = garmentSkinTexture({
    color: info.color,
    type: tipoFinal,
    number: null,
    monkeyFace: false,
    limpia,
  });
  cuerpo.material.needsUpdate = true;
  return cuerpo;
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
