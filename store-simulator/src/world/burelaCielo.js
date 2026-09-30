// LA ESFERA DE CIELO DE BURELA.
//
// Los cinco pisos del ascensor ya tenian su esfera 360 (`ESFERA 360` en el
// editor). Burela no: afuera el cielo era un COLOR PLANO. Funciona de cerca,
// pero apenas se levanta la vista no hay nada — ni degradado, ni nubes, ni
// horizonte. Es la mitad de arriba de la pantalla vacia.
//
// ⚠️ POR QUE NO ES UNA FOTO 360, COMO EN LOS PISOS. Una foto es fija: si se
// pone, el amanecer y la noche del reloj (opcion RELOJ del celular) dejan de
// verse, porque el cielo queda siempre a la misma hora. Adentro de un piso eso
// da igual —no hay ciclo— pero en Burela el ciclo es de lo mejor que tiene.
// Asi que esta esfera se PINTA sola: toma la paleta de la hora
// (`dayNightCycle.js`) y redibuja su degradado, sus nubes y el resplandor del
// sol. Amanece y anochece con el resto del mundo.
//
// Costo de descarga: 0 KB. Es un <canvas> de 1024x512 que se genera en el
// navegador, como el pelaje de los 10 BOBs o las texturas de las casas de
// enfrente.
import * as THREE from 'three';

// ---- Tamaño y lugar --------------------------------------------------------
// ⚠️ EL RADIO NO ES LIBRE: la camara tiene `far = 140` (main.js). Lo que quede
// mas lejos que eso NO SE DIBUJA y se ve el vacio. La camara se mueve dentro de
// la zona jugable, asi que en el peor rincon esta a ~38 m del centro: con radio
// 90 el punto mas lejano de la esfera queda a 128 m, dentro de los 140 con
// margen. Subirlo a 110 hace que se recorte el cielo en las esquinas del mapa.
const RADIO = 90;
// Centro de la zona jugable, no el origen: la calle va de z=+17 a z=-33.
const CENTRO = new THREE.Vector3(0, 0, -8);

const ANCHO = 1024, ALTO = 512;

function lienzo(w = ANCHO, h = ALTO) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return c;
}

// ---- Las nubes se dibujan UNA vez ------------------------------------------
// Se guardan como mancha blanca sobre transparente. Cada vez que cambia la hora
// no se vuelven a inventar: se les cambia el color y se pegan encima del
// degradado. Redibujar 40 manchas cada 30 segundos seria tirar trabajo, y
// ademas las nubes se moverian solas de lugar en cada cambio de hora.
let mascaraNubes = null;

function nubes() {
  if (mascaraNubes) return mascaraNubes;
  const c = lienzo(), x = c.getContext('2d');
  // Semilla fija: el cielo tiene que ser el MISMO en cada partida. Con
  // Math.random() suelto, cada recarga daba otras nubes y no se podian comparar
  // dos capturas.
  let semilla = 20260909;
  const azar = () => {
    semilla = (semilla * 1664525 + 1013904223) % 4294967296;
    return semilla / 4294967296;
  };
  // ⚠️ LAS NUBES NO LLEGAN AL CENIT, Y NO ES UN GUSTO. En una esfera todas las
  // columnas del canvas se juntan en el polo: cualquier cosa dibujada arriba de
  // todo sale retorcida como un remolino. La primera version tenia nubes desde
  // la fila 14 y mirando hacia arriba se veia el vortice. Se dejan entre el 18%
  // y el 47% de la altura —o sea de unos 55 grados de altura hasta casi el
  // horizonte— que ademas es donde las nubes se ven en la vida real cuando uno
  // esta parado en la vereda.
  const Y0 = ALTO * 0.18, Y1 = ALTO * 0.47;
  const bocanada = (px, py, r, alfa) => {
    const g = x.createRadialGradient(px, py, 0, px, py, r);
    g.addColorStop(0, `rgba(255,255,255,${alfa})`);
    g.addColorStop(0.5, `rgba(255,255,255,${alfa * 0.5})`);
    g.addColorStop(1, 'rgba(255,255,255,0)');
    x.fillStyle = g;
    x.beginPath(); x.arc(px, py, r, 0, 7); x.fill();
  };
  for (let i = 0; i < 30; i++) {
    const cx = azar() * ANCHO;
    const cy = Y0 + azar() * (Y1 - Y0);
    const escala = 0.55 + azar() * 0.9;
    // Se desvanece contra los dos bordes de la banda: si una nube se corta en
    // seco se ve la linea recta del recorte.
    const t = (cy - Y0) / (Y1 - Y0);
    const borde = Math.min(1, Math.min(t, 1 - t) * 3.2);
    if (borde <= 0.02) continue;
    // Cada nube son varios circulos difusos pegados: uno solo se lee como una
    // pelota.
    for (let j = 0; j < 9; j++) {
      const r = (10 + azar() * 22) * escala;
      const px = cx + (azar() - 0.5) * 96 * escala;
      const py = cy + (azar() - 0.5) * 26 * escala;
      const alfa = 0.42 * borde;
      bocanada(px, py, r, alfa);
      // La nube se repite del otro lado del borde para que no se corte en la
      // costura de la esfera (u=0 y u=1 son el mismo meridiano).
      if (px < 120) bocanada(px + ANCHO, py, r, alfa);
      else if (px > ANCHO - 120) bocanada(px - ANCHO, py, r, alfa);
    }
  }
  mascaraNubes = c;
  return c;
}

// ⚠️ HAY QUE CONVERTIR EL COLOR ANTES DE ESCRIBIRLO EN EL CANVAS, SIEMPRE.
// Los colores de la paleta (`dayNightCycle.js`) viven en espacio LINEAL: three
// convierte cada `new THREE.Color(0x...)` al entrar. Un `<canvas>` en cambio
// habla sRGB. Escribir el numero lineal tal cual satura todo: el naranja del
// atardecer (#ed7748) salia (204,44,16) — un ROJO FUEGO que no se parecia en
// nada al cielo que habia antes. Se ve enseguida comparando la captura de las
// 18 h con el color de fondo viejo.
function s255(color) {
  const c = color.clone();
  THREE.ColorManagement.fromWorkingColorSpace(c, THREE.SRGBColorSpace);
  return [Math.round(c.r * 255), Math.round(c.g * 255), Math.round(c.b * 255)];
}
const css = (color) => `rgb(${s255(color).join(',')})`;
const rgba = (color, alfa) => `rgba(${s255(color).join(',')},${alfa})`;
// Color del resplandor: la luz de la hora, tirada un poco hacia el blanco.
const luzHalo = (palette) => palette.light.clone().lerp(new THREE.Color(1, 1, 1), 0.35);

export function buildBurelaCielo(scene) {
  const cielo = lienzo();
  const ctx = cielo.getContext('2d');
  const tenidas = lienzo();          // nubes ya pintadas del color de la hora
  const ctxTenidas = tenidas.getContext('2d');

  const textura = new THREE.CanvasTexture(cielo);
  textura.colorSpace = THREE.SRGBColorSpace;
  textura.magFilter = THREE.LinearFilter;
  textura.minFilter = THREE.LinearFilter;   // sin mipmaps: es un degradado suave
  textura.generateMipmaps = false;

  const material = new THREE.MeshBasicMaterial({
    map: textura,
    side: THREE.BackSide,   // se ve desde ADENTRO
    // ⚠️ Los tres van juntos y ninguno es opcional:
    //   fog:false        — si le entra niebla, el cielo se tapa con su propio
    //                      color de niebla y queda un gris parejo.
    //   depthWrite:false — no debe tapar nada de lo que hay adelante.
    //   toneMapped:false — asi queda igual que el color de fondo plano que
    //                      habia antes, que es el que aprobo Kusher. Con
    //                      toneMapped:true la exposicion de la noche (0,78) lo
    //                      oscurecia el doble, porque la paleta YA trae la
    //                      noche metida en el color.
    fog: false,
    depthWrite: false,
    toneMapped: false,
  });

  const raiz = new THREE.Group();
  raiz.name = 'ESFERA 360 · CIELO DE BURELA';
  raiz.position.copy(CENTRO);
  raiz.userData.editorSelectExisting = true;
  raiz.userData.editorHint = 'T · buscar ESFERA 360 · tecla 2 para girar el cielo · tecla 3 para el tamaño';

  const esfera = new THREE.Mesh(new THREE.SphereGeometry(RADIO, 40, 24), material);
  esfera.name = 'ESFERA 360 · cupula del cielo';
  esfera.frustumCulled = false;
  esfera.renderOrder = -100;          // se dibuja primero, detras de todo
  esfera.userData.skipShadow = true;
  esfera.receiveShadow = false;
  esfera.castShadow = false;
  raiz.add(esfera);
  scene.add(raiz);

  // ---- Repintado por hora --------------------------------------------------
  // ⚠️ Como se orienta el canvas: `SphereGeometry` deja uv.y = 1 en el polo de
  // ARRIBA, y `flipY` de la textura (que viene en true) hace que la fila 0 del
  // canvas caiga ahi. O sea: arriba del canvas = cenit, la mitad = horizonte,
  // abajo = suelo. Si se invierte, el cielo sale al reves y no se nota hasta
  // mirar hacia arriba.
  const HORIZONTE = Math.round(ALTO * 0.5);

  function aplicar(sample) {
    const { palette } = sample;
    const cenit = palette.sky.clone();
    // El cenit va un poco mas profundo que el color plano de antes y el
    // horizonte se iguala EXACTO al color de la niebla. Eso ultimo no es un
    // detalle: los edificios lejanos se disuelven en la niebla, asi que si el
    // cielo no termina en ese mismo color se ve la juntura como una linea.
    const arriba = cenit.clone().lerp(new THREE.Color(0x000000), 0.30);
    const medio = cenit;
    const horizonte = palette.fog.clone();
    const suelo = palette.fog.clone().lerp(new THREE.Color(0x000000), 0.30);

    const g = ctx.createLinearGradient(0, 0, 0, ALTO);
    g.addColorStop(0.00, css(arriba));
    g.addColorStop(0.30, css(medio));
    g.addColorStop(0.50, css(horizonte));
    g.addColorStop(0.58, css(horizonte));
    g.addColorStop(1.00, css(suelo));
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, ANCHO, ALTO);

    // Resplandor alrededor del sol (o de la luna). Sin esto el sol es un disco
    // pegado sobre un fondo plano; con esto el cielo se aclara a su alrededor,
    // que es lo que lo hace parecer luz y no una calcomania.
    const astro = sample.sunVisible ? sample.sunPosition : sample.moonPosition;
    const plano = astro.clone(); plano.y = 0;
    if (plano.lengthSq() > 0.0001) {
      plano.normalize();
      // La esfera pone x = -cos(phi) y z = sin(phi), asi que el angulo del
      // astro se despeja al reves de lo habitual. Se verifica mirando que el
      // resplandor caiga JUSTO detras del disco del sol, no al lado.
      let u = Math.atan2(plano.z, -plano.x) / (Math.PI * 2);
      if (u < 0) u += 1;
      const alturaNorm = THREE.MathUtils.clamp(astro.clone().normalize().y, -0.2, 1);
      const cx = u * ANCHO;
      const cy = (0.5 - alturaNorm * 0.5) * ALTO;
      const radio = ALTO * (sample.sunVisible ? 0.30 : 0.16);
      // ⚠️ EL HALO SE ESTIRA A LO ANCHO CUANDO EL SOL ESTA ALTO. Un circulo en
      // el canvas NO es un circulo en la esfera: cerca del polo las columnas se
      // juntan, asi que un halo redondo salia como un chorro vertical apuntando
      // al cenit (se vio a las 12 del mediodia). El factor 1/sin(angulo polar)
      // deshace ese apretujamiento; a la altura del horizonte vale 1 y no toca
      // nada.
      const seno = Math.max(Math.sqrt(Math.max(0, 1 - alturaNorm * alturaNorm)), 0.12);
      const estirar = 1 / seno;
      const luz = luzHalo(palette);
      ctx.save();
      ctx.translate(cx, cy);
      ctx.scale(estirar, 1);
      // Se dibuja tres veces (centro y los dos costados) para que no se corte
      // en la costura si el sol cae justo ahi.
      for (const desplazado of [-ANCHO / estirar, 0, ANCHO / estirar]) {
        const halo = ctx.createRadialGradient(desplazado, 0, 0, desplazado, 0, radio);
        halo.addColorStop(0, rgba(luz, sample.sunVisible ? 0.55 : 0.22));
        halo.addColorStop(0.45, rgba(luz, sample.sunVisible ? 0.18 : 0.07));
        halo.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = halo;
        ctx.fillRect(desplazado - radio, -radio, radio * 2, radio * 2);
      }
      ctx.restore();
    }

    // Nubes del color de la hora: blancas de dia, rosas al atardecer, gris
    // azulado de noche. Sale solo de mezclar el color de la niebla con blanco,
    // asi que siguen a la paleta sin tener que listar hora por hora.
    const colorNube = palette.fog.clone().lerp(new THREE.Color(1, 1, 1), 0.55);
    ctxTenidas.clearRect(0, 0, ANCHO, ALTO);
    ctxTenidas.globalCompositeOperation = 'source-over';
    ctxTenidas.drawImage(nubes(), 0, 0);
    ctxTenidas.globalCompositeOperation = 'source-in';
    ctxTenidas.fillStyle = css(colorNube);
    ctxTenidas.fillRect(0, 0, ANCHO, ALTO);
    ctxTenidas.globalCompositeOperation = 'source-over';
    // 0,68 y no 1: con las nubes a full el cielo de mediodia —que es un
    // celeste palido— quedaba lechoso y no se leia el azul.
    ctx.globalAlpha = 0.68;
    ctx.drawImage(tenidas, 0, 0);
    ctx.globalAlpha = 1;

    // Neblina baja: una franja mas clara pegada al horizonte. Es lo que separa
    // "cielo pintado" de "hay aire entre yo y el fondo".
    const bruma = ctx.createLinearGradient(0, HORIZONTE - ALTO * 0.11, 0, HORIZONTE + 2);
    bruma.addColorStop(0, 'rgba(0,0,0,0)');
    bruma.addColorStop(1, css(horizonte));
    ctx.fillStyle = bruma;
    ctx.globalAlpha = 0.6;
    ctx.fillRect(0, HORIZONTE - ALTO * 0.11, ANCHO, ALTO * 0.11 + 2);
    ctx.globalAlpha = 1;

    textura.needsUpdate = true;
  }

  return { raiz, esfera, aplicar, dispose: () => { textura.dispose(); material.dispose(); esfera.geometry.dispose(); } };
}
