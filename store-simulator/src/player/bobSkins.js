// LOS 10 BOBS — pelajes para elegir al cargar la partida.
//
// EL PROBLEMA QUE RESUELVE ESTE ARCHIVO
// Kusher pidio 10 BOBs para elegir. La via obvia —10 archivos GLB— es
// inviable y hay que decirlo con numeros: `bob.glb` pesa 0,83 MB comprimido,
// asi que 10 modelos distintos serian 8,3 MB. El presupuesto ENTERO de primera
// carga son 20 MB y hoy vamos en 17,2. Diez BOBs de archivo se comen la mitad
// del presupuesto ellos solos, y encima habria que modelar diez monos.
//
// COMO ESTA HECHO EN CAMBIO
// UN solo `bob.glb` y 10 recetas de color. El modelo tiene una sola malla, un
// solo material y un solo atlas de pelaje (`bob_basecolor`, 156 KB). Cada BOB
// es ese mismo atlas repintado en un `<canvas>`:
//
//   se lee la LUMINANCIA de cada pixel (que es donde vive todo el detalle del
//   pelo y el sombreado) y se la usa para mezclar entre un color oscuro y uno
//   claro. El dibujo del pelaje se conserva entero; lo unico que cambia es la
//   paleta.
//
// Es la misma idea con la que se pintan las prendas GLB en `garmentGlbEditor.js`.
// Costo de descarga de los 10 BOBs: 0 KB. No hay ningun archivo nuevo.
//
// ⚠️ EL BOB 0 NO SE TOCA. Es el mono original de la marca, con su textura tal
// cual vino. Es el que sale por defecto. Los otros nueve son variantes suyas.
//
// ⚠️ MEMORIA. Una textura de 1024x1024 ocupa ~4 MB en la placa de video. Diez
// serian 40 MB por diez monos, un despropferio. Por eso:
//   · las MINIATURAS de la pantalla de eleccion se generan a 256 px (~0,25 MB)
//     y se sueltan apenas se dibujan;
//   · la textura GRANDE se genera solo para el BOB elegido, uno por vez, y la
//     anterior se libera con `.dispose()`.
import * as THREE from 'three';

const CLAVE_GUARDADO = 'ft-bob-elegido-v1';

// sombra = color de las zonas oscuras del pelaje · luz = el de las claras.
// `metalness`/`roughness` son opcionales: solo los usan el dorado y el cromado.
export const BOB_SKINS = Object.freeze([
  {
    id: 'original',
    nombre: 'BOB',
    descripcion: 'El de siempre. El mono de la marca, tal cual.',
    original: true,
    // Colores solo para el cartelito de la tarjeta; la textura no se toca.
    sombra: [0x3a, 0x1d, 0x0c], luz: [0xf0, 0x92, 0x2b],
  },
  {
    id: 'noche',
    nombre: 'BOB NOCHE',
    descripcion: 'Negro carbon.',
    sombra: [0x04, 0x04, 0x06], luz: [0x44, 0x46, 0x4e],
    gamma: 1.5,               // empuja todo hacia la sombra: negro de verdad
    roughness: 0.9,
  },
  {
    id: 'humo',
    nombre: 'BOB HUMO',
    descripcion: 'Gris ceniza.',
    sombra: [0x33, 0x35, 0x3a], luz: [0xd8, 0xda, 0xde],
  },
  {
    id: 'nieve',
    nombre: 'BOB NIEVE',
    descripcion: 'Crema, casi blanco.',
    sombra: [0x8a, 0x80, 0x6c], luz: [0xff, 0xfb, 0xef],
    gamma: 0.7,               // al reves: casi todo del lado claro
  },
  {
    // El verde salvia de la galeria de Burela (#8C9A78) y el ingles de la
    // vidriera (#2F5A3A). Ver design/SPEC_MAPA_BURELA.md.
    id: 'salvia',
    nombre: 'BOB SALVIA',
    descripcion: 'El verde de la galeria de Burela.',
    sombra: [0x14, 0x2b, 0x1a], luz: [0x9e, 0xb5, 0x7e],
  },
  {
    // El ladrillo de la torre del fondo. El #A44E32 del spec tiene que caer en
    // el MEDIO de la rampa, no en la punta clara: poniendolo de extremo claro
    // el mono salia beige y se confundia con BOB NIEVE.
    id: 'burela',
    nombre: 'BOB BURELA',
    descripcion: 'Ladrillo, como la torre.',
    sombra: [0x2e, 0x0d, 0x06], luz: [0xd8, 0x7c, 0x4e],
    gamma: 1.2,
  },
  {
    id: 'cielo',
    nombre: 'BOB CIELO',
    descripcion: 'Azul de mediodia.',
    sombra: [0x0e, 0x22, 0x45], luz: [0x8f, 0xc4, 0xf0],
  },
  {
    id: 'oro',
    nombre: 'BOB ORO',
    descripcion: 'Dorado. Brilla.',
    sombra: [0x4a, 0x33, 0x05], luz: [0xff, 0xdc, 0x6b],
    metalness: 0.85, roughness: 0.28,
  },
  {
    id: 'uva',
    nombre: 'BOB UVA',
    descripcion: 'Violeta profundo.',
    sombra: [0x21, 0x10, 0x38], luz: [0xbf, 0x9b, 0xe8],
  },
  {
    id: 'fuego',
    nombre: 'BOB FUEGO',
    descripcion: 'Rojo encendido.',
    sombra: [0x3d, 0x06, 0x06], luz: [0xff, 0x8a, 0x3d],
  },
]);

export function skinPorId(id) {
  return BOB_SKINS.find((s) => s.id === id) ?? BOB_SKINS[0];
}

// ---- Lo que quedo elegido -------------------------------------------------
// Vive en el navegador, igual que el layout del editor y los diseños de las
// prendas. ⚠️ Eso significa que es POR COMPUTADORA: si Kusher elige un BOB en
// la Mac, en otra maquina vuelve a salir el original.
export function bobElegido() {
  try {
    const id = localStorage.getItem(CLAVE_GUARDADO);
    return id ? skinPorId(id) : null;   // null = todavia no eligio nunca
  } catch { return null; }
}

export function guardarBobElegido(id) {
  try { localStorage.setItem(CLAVE_GUARDADO, skinPorId(id).id); } catch { /* modo incognito */ }
}

// ---- El repintado ----------------------------------------------------------

// Devuelve un canvas con el atlas repintado con la paleta del skin.
// `lado` chico (256) para las miniaturas, grande (el original) para el juego.
function repintar(imagenBase, skin, lado) {
  const ancho = lado ?? imagenBase.width;
  const alto = lado ? Math.round(imagenBase.height * (lado / imagenBase.width)) : imagenBase.height;
  const c = document.createElement('canvas');
  c.width = ancho; c.height = alto;
  const ctx = c.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(imagenBase, 0, 0, ancho, alto);

  const img = ctx.getImageData(0, 0, ancho, alto);
  const d = img.data;
  const [sr, sg, sb] = skin.sombra;
  const [lr, lg, lb] = skin.luz;

  // Rango real de luminancia del atlas. Se mide en vez de asumir 0..255:
  // el pelaje de BOB no llega ni al negro puro ni al blanco puro, y estirar
  // el rango real es lo que hace que los colores se lean fuertes en lugar de
  // salir todos lavados.
  let min = 255, max = 0;
  for (let i = 0; i < d.length; i += 4) {
    if (d[i + 3] < 8) continue;                       // pixel vacio del atlas
    const y = (d[i] * 0.299 + d[i + 1] * 0.587 + d[i + 2] * 0.114);
    if (y < 4) continue;                              // fondo negro entre islas
    if (y < min) min = y;
    if (y > max) max = y;
  }
  const rango = Math.max(1, max - min);

  // `gamma` corre el punto medio de la rampa. Sin esto todos los pelajes caen
  // en el centro (el atlas de BOB es casi todo medios tonos) y los oscuros
  // salian gris ratón, indistinguibles entre sí: NOCHE, HUMO, NIEVE y BURELA
  // se veian los cuatro iguales. >1 empuja a la sombra, <1 a la luz.
  const gamma = skin.gamma ?? 1;
  for (let i = 0; i < d.length; i += 4) {
    const y = (d[i] * 0.299 + d[i + 1] * 0.587 + d[i + 2] * 0.114);
    let t = Math.min(1, Math.max(0, (y - min) / rango));
    if (gamma !== 1) t = Math.pow(t, gamma);
    d[i]     = sr + (lr - sr) * t;
    d[i + 1] = sg + (lg - sg) * t;
    d[i + 2] = sb + (lb - sb) * t;
  }
  ctx.putImageData(img, 0, 0);
  return c;
}

// Textura lista para usar. `lado` null = tamaño original.
export function texturaDeSkin(imagenBase, skin, lado = null) {
  const tex = new THREE.CanvasTexture(repintar(imagenBase, skin, lado));
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.flipY = false;              // igual que la textura del glTF
  tex.needsUpdate = true;
  return tex;
}

// Encuentra la malla con esqueleto (BOB es una sola, pero no damos por hecho
// el nombre: `GLTFLoader` bautiza los objetos por el NODO del glTF, no por la
// malla, y eso ya nos mordio con las prendas de Fer).
export function mallaDeBob(root) {
  let encontrada = null;
  root.traverse((o) => {
    if (!encontrada && o.isMesh && o.material?.map) encontrada = o;
  });
  return encontrada;
}

// Pinta un modelo de BOB ya cargado con el skin pedido.
// Devuelve una funcion para liberar lo que se creo (o null si no creo nada).
export function aplicarSkin(root, skin, { lado = null } = {}) {
  const malla = mallaDeBob(root);
  if (!malla) return null;

  // El material se CLONA una sola vez por modelo. Sin esto, pintar al BOB del
  // jugador tambien pintaria la estatua gigante del piso 4: los dos salen del
  // mismo GLB y `GLTFLoader` les da el MISMO material.
  if (!malla.userData.materialPropio) {
    malla.material = malla.material.clone();
    malla.userData.materialPropio = true;
    malla.userData.texturaOriginal = malla.material.map;
  }

  const base = malla.userData.texturaOriginal;
  const anterior = malla.userData.texturaSkin ?? null;

  if (skin.original) {
    malla.material.map = base;
  } else {
    if (!base?.image) return null;   // la textura todavia no decodifico
    const tex = texturaDeSkin(base.image, skin, lado);
    malla.material.map = tex;
    malla.userData.texturaSkin = tex;
  }
  if (skin.metalness !== undefined) malla.material.metalness = skin.metalness;
  if (skin.roughness !== undefined) malla.material.roughness = skin.roughness;
  malla.material.needsUpdate = true;

  // La textura vieja se suelta DESPUES de poner la nueva: soltarla antes deja
  // un cuadro con el material sin mapa y BOB parpadea en blanco.
  if (anterior && anterior !== malla.material.map) anterior.dispose();

  return () => {
    if (malla.userData.texturaSkin) {
      malla.userData.texturaSkin.dispose();
      malla.userData.texturaSkin = null;
    }
  };
}
