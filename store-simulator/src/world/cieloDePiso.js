// CIELO POR DEFECTO DE LOS PISOS — dibujado por codigo, 0 KB de descarga.
//
// POR QUE EXISTE. Hasta el 22/09/2026 los pisos sin panoramica propia
// (HOOP SEASON y BOB) usaban `urban-alley-01-4k.exr`: 7.288.874 bytes, la
// descarga mas pesada de entrar a esos pisos. Kusher decidio no usar esa foto
// —un callejon con graffitis— en ningun lado, asi que se borro.
//
// ⚠️ Y ademas ese archivo NO TENIA RANGO HDR. Medido decodificandolo a float32:
// el maximo de R, G y B era 1,0 exacto, cero muestras por encima, y el 14,13%
// de los pixeles estaban clavados en 1,0 (recortados). O sea: una foto comun
// aplastada, guardada adentro de un contenedor de 16 bits por canal. Como mapa
// de iluminacion era peor que inutil, porque el sol no tenia intensidad.
// Codex lo decodifico por su lado y llego al mismo numero.
//
// Esto lo reemplaza con un degrade generado en un <canvas>. No es la estetica
// final: es el fondo neutro que se ve mientras un piso no tenga su propia
// imagen 360. Para ponerle una, se deja el archivo en
// `src/assets/environments/pisos/<numero>-<piso>/` y el catalogo la toma sola
// (ver floorEnvironmentCatalog.js). Ahi este cielo deja de usarse.
import * as THREE from 'three';

const ANCHO = 1024;
const ALTO = 512;

// El <canvas> habla sRGB y estos numeros son sRGB, asi que NO se convierten.
// ⚠️ La trampa del cielo de Burela era al reves: alla la paleta venia en
// espacio LINEAL y habia que pasarla con `fromWorkingColorSpace`, si no el
// atardecer salia rojo fuego. Aca los valores se eligieron mirando el canvas,
// entonces meter una conversion los rompe.
const CENIT = '#3f6f9e';
const HORIZONTE = '#cdd6da';
const SUELO = '#3b4145';

// El sol va bajo y ancho. ⚠️ Nada se dibuja cerca de los polos: en una
// equirectangular el polo es toda una fila de pixeles apretada en un punto, asi
// que cualquier dibujo de ahi se ve como un remolino, no como un dibujo.
const SOL_X = 0.28;        // 0..1 a lo ancho
const SOL_Y = 0.42;        // 0..1 de arriba hacia abajo; 0,5 es el horizonte
const SOL_RADIO = 0.26;

let cache = null;

function pintar(ctx) {
  const cielo = ctx.createLinearGradient(0, 0, 0, ALTO);
  cielo.addColorStop(0.00, CENIT);
  cielo.addColorStop(0.38, CENIT);
  cielo.addColorStop(0.50, HORIZONTE);
  cielo.addColorStop(0.52, SUELO);
  cielo.addColorStop(1.00, SUELO);
  ctx.fillStyle = cielo;
  ctx.fillRect(0, 0, ANCHO, ALTO);

  // ⚠️ El halo se estira en horizontal por 1/sin(angulo polar). Sin eso, un
  // circulo perfecto en la textura se ve aplastado al mapearlo a la esfera:
  // cuanto mas arriba, mas se comprime cada fila. Es la misma correccion que
  // usa burelaCielo.js para el sol de Burela.
  const polar = Math.max(0.35, Math.sin(SOL_Y * Math.PI));
  const cx = SOL_X * ANCHO;
  const cy = SOL_Y * ALTO;
  const rx = (SOL_RADIO * ALTO) / polar;
  const ry = SOL_RADIO * ALTO;

  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(rx / ry, 1);
  const halo = ctx.createRadialGradient(0, 0, 0, 0, 0, ry);
  halo.addColorStop(0.0, 'rgba(255, 246, 224, 0.85)');
  halo.addColorStop(0.35, 'rgba(255, 236, 198, 0.34)');
  halo.addColorStop(1.0, 'rgba(255, 236, 198, 0)');
  ctx.fillStyle = halo;
  ctx.beginPath();
  ctx.arc(0, 0, ry, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/**
 * Textura equirectangular del cielo por defecto. Se genera UNA vez y se
 * comparte entre pisos: es la misma imagen y no depende de la escena.
 *
 * ⚠️ No se libera al cerrar un piso, justamente porque es compartida. Las que
 * si se liberan son las panoramicas propias de cada piso, que se marcan en
 * `scene.userData.disposableEnvironmentTextures`.
 */
export function cieloDePiso() {
  if (cache) return cache;
  const canvas = document.createElement('canvas');
  canvas.width = ANCHO;
  canvas.height = ALTO;
  pintar(canvas.getContext('2d'));

  const textura = new THREE.CanvasTexture(canvas);
  textura.mapping = THREE.EquirectangularReflectionMapping;
  textura.colorSpace = THREE.SRGBColorSpace;
  textura.generateMipmaps = false;
  textura.minFilter = THREE.LinearFilter;
  textura.magFilter = THREE.LinearFilter;
  textura.needsUpdate = true;
  cache = textura;
  return textura;
}
