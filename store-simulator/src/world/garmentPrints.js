// Estampas de prenda: la imagen que Kusher sube y ubica sobre el frente o el
// dorso de una remera, un hoodie, un pantalon o una bermuda.
//
// POR QUE UN PARCHE Y NO UNA TEXTURA
// La via obvia seria dibujar la estampa adentro de la textura de la prenda.
// Tiene dos problemas serios:
//   1. La UV del cuerpo envuelve la seccion como la etiqueta de una lata, asi
//      que lo que se dibuja en el frente aparece TAMBIEN en el dorso, espejado.
//      Justo lo que Kusher pidio poder separar.
//   2. Para que un diseño real se vea nitido en el pecho harian falta ~1024 px
//      solo de estampa, o sea un atlas de 2K por prenda. Seis prendas en un
//      perchero = 24 MB de textura para unos pocos pixeles utiles.
//
// Aca la estampa es un PARCHE: una malla chica generada con la misma funcion de
// superficie que la tela (`garmentSurfacePoint`), corrida 4 mm hacia afuera. Se
// curva con el pecho, se dobla con los mismos pliegues, usa la imagen a su
// resolucion nativa y no toca la textura del cuerpo. Cambiar tamaño o posicion
// es regenerar ~200 triangulos: instantaneo.
//
// El parche hereda el AO de pliegue del cuerpo, asi que la estampa se oscurece
// dentro de las arrugas igual que la tela. Sin eso se ve como una calcomania
// pegada encima, que es exactamente lo que no queremos.

import * as THREE from 'three';
import { getProductoForSlot, onProductosChange } from '../data/productosStore.js';
import { garmentHeight, garmentSurfacePoint, restyleGarment } from './garments.js';
import { unbindProductVisuals } from './productVisuals.js';

// Angulos de la seccion: PI/2 mira al frente (+Z), 3PI/2 al dorso (-Z).
const ANGULO_LADO = { frente: Math.PI / 2, dorso: (Math.PI * 3) / 2 };

// 4 mm: suficiente para que no pelee con la tela en el z-buffer, poco para que
// no se vea despegada ni en un primer plano.
const SEPARACION = 0.004;

const COLUMNAS = 12;
const FILAS = 12;

export const PRINT_DEFAULTS = Object.freeze({
  lado: 'frente',
  anchoCm: 22,     // estampa de pecho tipica
  altoCm: 26,
  // altura del CENTRO de la estampa, 0 = hombros, 1 = ruedo. 0.34 cae en el
  // pecho, que es donde va una estampa serigrafiada real.
  centroY: 0.34,
  opacidad: 1,
});

/** Igual que el AO del cuerpo (garments.js). Duplicado a proposito: si el
 * parche usara otra formula, la estampa se veria mas clara que la tela justo
 * adentro de los pliegues. */
function aoDePliegue(t, angulo) {
  const valle = (1 - Math.sin(angulo * 5 + t * 2.6)) * 0.5;
  const fuerza = 0.30 * Math.pow(t, 1.2);
  const axila = Math.exp(-Math.pow((t - 0.22) / 0.10, 2)) * 0.12;
  return 1 - valle * fuerza - axila;
}

/**
 * Semi-apertura angular que hace que el parche mida `anchoM` de arco sobre la
 * superficie. Se integra numericamente en vez de usar `ancho/radio` porque la
 * seccion es una elipse bien aplastada: cerca del frente el arco avanza mucho
 * mas rapido que el angulo, y con la formula simple la estampa salia como el
 * doble de ancha de lo pedido.
 */
function aperturaParaAncho(type, t, anguloCentro, anchoM) {
  const objetivo = anchoM / 2;
  const PASOS = 64;
  // Hasta 83 grados a cada lado: practicamente la mitad delantera entera de la
  // prenda. Antes el tope era 51 grados y una estampa grande dejaba de crecer
  // aunque el control siguiera subiendo. No se llega a 90: ahi esta la costura
  // del costado y el parche quedaria de canto contra la camara.
  const paso = 1.45 / PASOS;
  const p = { x: 0, y: 0, z: 0 };
  const anterior = { x: 0, z: 0 };
  garmentSurfacePoint(type, t, anguloCentro, p);
  anterior.x = p.x; anterior.z = p.z;

  let arco = 0;
  for (let i = 1; i <= PASOS; i++) {
    const ang = anguloCentro + i * paso;
    garmentSurfacePoint(type, t, ang, p);
    arco += Math.hypot(p.x - anterior.x, p.z - anterior.z);
    anterior.x = p.x; anterior.z = p.z;
    if (arco >= objetivo) return i * paso;
  }
  return PASOS * paso;
}

/**
 * Malla del parche de estampa, en el espacio local de la prenda.
 * Devuelve null si la prenda no admite estampa en esa altura.
 */
export function printPatchGeometry(type, { lado, anchoCm, altoCm, centroY }) {
  const anguloCentro = ANGULO_LADO[lado] ?? ANGULO_LADO.frente;
  const alto = garmentHeight(type);
  const altoM = altoCm / 100;
  const anchoM = anchoCm / 100;

  // Rango de altura, recortado para que la estampa no se trepe al hombro ni se
  // caiga del ruedo. 0.04..0.97 deja siempre un margen de tela.
  const medioT = (altoM / alto) / 2;
  const tArriba = Math.max(0.04, centroY - medioT);
  const tAbajo = Math.min(0.97, centroY + medioT);
  if (tAbajo <= tArriba) return null;

  const apertura = aperturaParaAncho(type, centroY, anguloCentro, anchoM);

  const posiciones = [];
  const uvs = [];
  const colores = [];
  const indices = [];
  const p = { x: 0, y: 0, z: 0, semiAncho: 1, semiFondo: 1 };

  for (let fila = 0; fila <= FILAS; fila++) {
    const fv = fila / FILAS;
    const t = tArriba + (tAbajo - tArriba) * fv;
    for (let col = 0; col <= COLUMNAS; col++) {
      const fu = col / COLUMNAS;
      const angulo = anguloCentro + (fu - 0.5) * 2 * apertura;
      garmentSurfacePoint(type, t, angulo, p);

      // Normal exterior de la elipse en ese punto: para (a·cos, b·sin) la
      // normal va como (b·cos, a·sin). Sin esto el parche se separa distinto en
      // el centro que en los bordes y se ve torcido.
      let nx = p.semiFondo * Math.cos(angulo);
      let nz = p.semiAncho * Math.sin(angulo);
      const largo = Math.hypot(nx, nz) || 1;
      nx /= largo; nz /= largo;

      posiciones.push(p.x + nx * SEPARACION, p.y, p.z + nz * SEPARACION);
      // El dorso se mira desde -Z: sin invertir la U, la estampa de atras sale
      // espejada (un texto se leeria al reves).
      uvs.push(lado === 'dorso' ? 1 - fu : fu, 1 - fv);
      const ao = aoDePliegue(t, angulo);
      colores.push(ao, ao, ao);
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
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colores, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

const texturaCache = new Map();

/** Textura desde el dataURL que sube Kusher. Se cachea por URL: si dos prendas
 * usan el mismo archivo, comparten una sola textura en memoria. */
export function printTexture(dataUrl) {
  if (!dataUrl) return null;
  const cacheado = texturaCache.get(dataUrl);
  if (cacheado) return cacheado;
  const texture = new THREE.TextureLoader().load(dataUrl);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  // La estampa NO se repite: si la imagen no llena el parche, el borde se
  // estira en vez de aparecer un mosaico.
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texturaCache.set(dataUrl, texture);
  return texture;
}

function printMaterial(texture, opacidad) {
  // `transparent` SOLO si la estampa es traslucida a proposito. Un PNG con
  // fondo recortado se resuelve con alphaTest y nada mas: activar los dos
  // mete la estampa en la cola de objetos transparentes, que se ordena por
  // distancia al centro del objeto — y ahi la estampa parpadea por delante y
  // por detras de la tela segun donde este parado el jugador.
  const traslucida = opacidad < 1;
  return new THREE.MeshStandardMaterial({
    map: texture,
    transparent: traslucida,
    // Recorta el fondo del PNG. 0.02 y no 0.5: los bordes suavizados de un
    // logo tienen alpha bajo y con un umbral alto quedan dentados.
    alphaTest: 0.02,
    opacity: opacidad,
    roughness: 0.82,   // la serigrafia brilla un toque mas que el algodon
    metalness: 0,
    side: THREE.DoubleSide,
    vertexColors: true, // hereda el AO de los pliegues de la tela
    // El parche esta 4 mm afuera, pero en un primer plano con la camara casi
    // pegada eso no siempre alcanza contra el z-buffer.
    polygonOffset: true,
    polygonOffsetFactor: -2,
    polygonOffsetUnits: -2,
  });
}

/**
 * Crea (o rehace) el parche de estampa de un lado de la prenda.
 * `contenedor` es el grupo de la prenda; el parche se agrega ahi con un nombre
 * fijo para poder encontrarlo y reemplazarlo.
 */
export function applyGarmentPrint(contenedor, type, lado, config) {
  const nombre = `Estampa ${lado}`;
  const anterior = contenedor.getObjectByName(nombre);
  if (anterior) {
    contenedor.remove(anterior);
    anterior.geometry?.dispose?.();
    anterior.material?.dispose?.();
  }

  if (!config?.imagen) return null;

  const opciones = { ...PRINT_DEFAULTS, ...config, lado };
  const geometry = printPatchGeometry(type, opciones);
  if (!geometry) return null;

  const texture = printTexture(config.imagen);
  const mesh = new THREE.Mesh(geometry, printMaterial(texture, opciones.opacidad));
  mesh.name = nombre;
  // La estampa no proyecta sombra propia: es tinta sobre la tela, y una sombra
  // duplicada a 4 mm del cuerpo se ve como una lamina flotando.
  mesh.castShadow = false;
  mesh.receiveShadow = true;
  contenedor.add(mesh);
  return mesh;
}

// ---------------------------------------------------------------------------
// Estampa que viene del catalogo de productos
// ---------------------------------------------------------------------------
//
// El camino largo (click derecho -> subir imagen -> guardar) sirve para probar
// y ajustar, pero no escala: son 99 prendas en el mundo y el navegador aguanta
// unas 20 imagenes guardadas. Aca la estampa sale del producto que la prenda ya
// tiene asignado (`userData.productSlot`), cargado desde el panel de admin
// (tecla P) y guardado como archivo en public/assets/estampas/.
//
// Asi cargar un producto viste la prenda Y la deja comprable de una sola vez,
// en lugar de ser dos trabajos separados.

const conProducto = new Set();

function estampaDelProducto(slot) {
  const info = getProductoForSlot(slot.piso, slot.index);
  const ruta = info?.producto?.estampa;
  return typeof ruta === 'string' && ruta.trim() ? ruta.trim() : '';
}

function refrescarPrenda(grupo) {
  const datos = grupo.userData?.garment;
  const slot = grupo.userData?.productSlot;
  if (!datos || !slot) return;

  // Una estampa cargada a mano con el editor MANDA sobre la del producto: si
  // Kusher se tomo el trabajo de ubicarla, no se la puede pisar el catalogo.
  if (datos.print?.frente?.imagen && datos.print.frente.manual) return;

  const ruta = estampaDelProducto(slot);
  const actual = grupo.userData.estampaProducto;
  if (ruta === actual) return;
  grupo.userData.estampaProducto = ruta;

  if (ruta) {
    // Con estampa propia, el cuerpo vuelve a ser TELA. Sin esto se veian dos
    // cosas encimadas: `bindProductVisual` estira la foto del producto —que es
    // la foto de una remera— sobre la malla de la remera, y encima iba el
    // diseño. La foto del producto sigue viva para el panel y el carrito.
    unbindProductVisuals(grupo);
    restyleGarment(grupo, { type: datos.type, color: datos.color, limpia: true });
  }

  const config = { ...PRINT_DEFAULTS, ...(datos.print?.frente ?? {}), imagen: ruta || null };
  datos.print = { ...(datos.print ?? {}), frente: config };
  applyGarmentPrint(grupo, datos.type, 'frente', config);
}

/**
 * Deja una prenda enganchada al catalogo: toma la estampa de su producto y se
 * actualiza sola cuando Kusher carga o cambia el diseño en el panel de admin.
 */
export function bindGarmentToProduct(grupo, slot) {
  if (!grupo?.userData?.garment || !slot) return grupo;
  grupo.userData.productSlot = slot;
  conProducto.add(grupo);
  refrescarPrenda(grupo);
  return grupo;
}

/** Suelta las prendas de una escena que se destruye (cambio de piso). Sin esto
 * el Set las retiene y la escena vieja nunca se libera de memoria. */
export function unbindGarmentsFromProducts(raiz) {
  raiz?.traverse?.((o) => conProducto.delete(o));
}

let pendiente = 0;
onProductosChange(() => {
  if (pendiente) return;
  pendiente = requestAnimationFrame(() => {
    pendiente = 0;
    for (const grupo of conProducto) {
      if (!grupo.parent) { conProducto.delete(grupo); continue; }
      refrescarPrenda(grupo);
    }
  });
});
