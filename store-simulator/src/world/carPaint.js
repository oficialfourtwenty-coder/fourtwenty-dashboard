// Repintar la carroceria de un auto GLB sin tocar el archivo.
//
// POR QUE HACE FALTA. El Corolla de Fer viene ROJO dentro del GLB y Kusher lo
// quiere azul. El color NO esta en el material —los seis materiales del modelo
// son blancos— sino en una TEXTURA DE PALETA de 32x4 pixeles que comparten
// todos. O sea que el auto entero se repinta cambiando 128 pixeles, sin
// reexportar el modelo y sin sumar un solo byte de descarga.
//
// ⚠️ POR QUE NO SE PONE `material.color = azul`. Los materiales son blancos y
// multiplican la textura: teñirlos pintaria TAMBIEN los vidrios, las llantas,
// los plasticos negros y los faros, porque los seis comparten la misma paleta.
// Hay que cambiar los pixeles rojos de la paleta y nada mas.
//
// ⚠️ LAS LUCES TRASERAS NO SE TOCAN, Y SE VERIFICO: el material `e180_glassred`
// usa OTRA textura (128x64), asi que quedan rojas solas. Por eso la regla de
// abajo solo mira texturas chicas.
//
// COMO ELIGE QUE PIXEL PINTAR. No por lista de colores —eso se rompe con
// cualquier modelo nuevo— sino por MATIZ: se pasa cada pixel a tono/saturacion/
// luz y se cambia SOLO el tono, dejando saturacion y luz como estaban. Asi
// sobreviven las sombras, los brillos y el degradado de la chapa: es la misma
// idea con la que se pintan los 10 pelajes de BOB (`bobSkins.js`).
//
// Los tres filtros y por que cada uno (medidos sobre la paleta real del
// Corolla, que tiene 18 colores en uso):
//   · saturacion minima  — deja afuera #6d6462 (gris), #e5e5e9 (vidrio) y
//                          #fff7f7 (blanco). Sin esto el auto queda azul hasta
//                          los cromados.
//   · luz minima         — deja afuera #0e0707, que es el negro de las gomas.
//                          Tiene saturacion alta por redondeo y sin este
//                          filtro las cubiertas salian azul marino.
//   · banda de matiz     — +-20 grados alrededor del rojo. Los 11 tonos de la
//                          pintura caen adentro; ninguno de los otros.
const SATURACION_MINIMA = 0.14;
const LUZ_MINIMA = 0.06;
const BANDA_MATIZ = 0.055;      // en vueltas: 0,055 = ~20 grados

// rgb 0-255 -> hsl 0-1. A mano y sin THREE.Color a proposito: el canvas habla
// sRGB y THREE.Color convierte a lineal al entrar. Mezclar los dos espacios ya
// costo un error en este proyecto (el cielo del atardecer salia rojo fuego).
function rgbAHsl(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const l = (max + min) / 2;
  const d = max - min;
  if (d === 0) return [0, 0, l];
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h;
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
  else if (max === g) h = ((b - r) / d + 2) / 6;
  else h = ((r - g) / d + 4) / 6;
  return [h, s, l];
}

function hslARgb(h, s, l) {
  if (s === 0) { const v = Math.round(l * 255); return [v, v, v]; }
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  const canal = (t) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  return [canal(h + 1 / 3), canal(h), canal(h - 1 / 3)].map((v) => Math.round(v * 255));
}

// Devuelve cuantos pixeles se cambiaron, para poder VERIFICAR que hizo algo.
// Un repintado que no toca ningun pixel se ve exactamente igual que uno roto.
function tenirLienzo(datos, matizDestino) {
  const d = datos.data;
  let cambiados = 0;
  for (let i = 0; i < d.length; i += 4) {
    if (d[i + 3] === 0) continue;                       // transparente
    const [h, s, l] = rgbAHsl(d[i], d[i + 1], d[i + 2]);
    if (s < SATURACION_MINIMA || l < LUZ_MINIMA) continue;
    const distanciaAlRojo = Math.min(h, 1 - h);         // 0 = rojo puro
    if (distanciaAlRojo > BANDA_MATIZ) continue;
    const [r, g, b] = hslARgb(matizDestino, s, l);
    d[i] = r; d[i + 1] = g; d[i + 2] = b;
    cambiados++;
  }
  return cambiados;
}

/**
 * Repinta la carroceria de un GLB ya cargado.
 * @param {THREE.Object3D} modelo  la escena del GLB
 * @param {number} matizDestino    tono en vueltas (0-1). 0,60 = azul.
 * @returns {{texturas:number, pixeles:number}} para poder medir que paso
 */
export function repintarCarroceria(THREE, modelo, matizDestino) {
  const hechas = new Map();
  let pixeles = 0;
  modelo.traverse((o) => {
    if (!o.isMesh) return;
    for (const material of (Array.isArray(o.material) ? o.material : [o.material])) {
      const mapa = material?.map;
      const img = mapa?.image;
      if (!img?.width) continue;
      // ⚠️ Solo texturas CHICAS. La paleta de la carroceria es de 32x4; los
      // faros (128x64) y el interior (128x128) tienen las suyas y no se tocan.
      if (img.width > 64 || img.height > 64) continue;
      if (hechas.has(mapa.uuid)) { material.map = hechas.get(mapa.uuid); material.needsUpdate = true; continue; }

      const lienzo = document.createElement('canvas');
      lienzo.width = img.width; lienzo.height = img.height;
      const ctx = lienzo.getContext('2d', { willReadFrequently: true });
      ctx.drawImage(img, 0, 0);
      const datos = ctx.getImageData(0, 0, lienzo.width, lienzo.height);
      pixeles += tenirLienzo(datos, matizDestino);
      ctx.putImageData(datos, 0, 0);

      const nueva = new THREE.CanvasTexture(lienzo);
      nueva.colorSpace = mapa.colorSpace;
      nueva.flipY = mapa.flipY;
      nueva.wrapS = mapa.wrapS; nueva.wrapT = mapa.wrapT;
      // ⚠️ Sin filtro: la paleta tiene un color POR PIXEL. Con el filtro
      // suavizado de siempre, cada color se mezcla con el de al lado y salen
      // franjas de colores que no existen en el auto.
      nueva.magFilter = THREE.NearestFilter;
      nueva.minFilter = THREE.NearestFilter;
      nueva.generateMipmaps = false;
      nueva.needsUpdate = true;

      hechas.set(mapa.uuid, nueva);
      material.map = nueva;
      material.needsUpdate = true;
    }
  });
  return { texturas: hechas.size, pixeles };
}
