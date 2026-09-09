// LO QUE HAY ALREDEDOR DE BURELA — el barrio que no se camina.
//
// POR QUE EXISTE. La cuadra de enfrente (`burelaFrente.js`) quedo bien, pero
// era un decorado de carton: se terminaba de golpe. Medido con capturas desde
// los cuatro rumbos y desde arriba, el mundo era una isla flotando en niebla:
//   · mirando al oeste o al este, la calle SE CORTA — la vereda y el asfalto
//     terminan en el aire y atras hay color plano;
//   · arriba de los techos de enfrente no hay nada;
//   · desde arriba se ve el borde del mundo.
// Estando parado en la vereda eso es la mitad de la pantalla.
//
// QUE HACE. Llena esas zonas con la MASA del barrio, no con detalle: la calle
// que sigue para los dos lados y se pierde, el fondo de la manzana de enfrente,
// la manzana de atras, y un anillo de siluetas en el horizonte para que no
// quede ningun rumbo vacio.
//
// ⚠️ NADA DE ESTO SE PUEDE PISAR. Todo queda del otro lado de las paredes
// invisibles de la calle (`colliders` de street.js), asi que no lleva colision:
// el jugador nunca lo toca.
//
// ⚠️ EL LIMITE REAL NO ES EL GUSTO, ES LA CAMARA. `main.js` usa
// `far = 140` y `Fog(30, 110)`. O sea:
//   · mas alla de 110 m todo es color de niebla puro — poner detalle ahi es
//     tirar triangulos, no se ve NADA;
//   · mas alla de 140 m directamente no se dibuja.
// Por eso el grueso de la masa esta entre 25 y 75 m, que es donde la niebla
// todavia deja ver, y el anillo del horizonte a ~78 m ya entra casi disuelto —
// que es justo el efecto de lejania que se busca.
//
// ⚠️ COSTO. Se arma con cajas, color POR VERTICE y se FUSIONA por material.
// En este proyecto las llamadas de dibujo pesan mas que los triangulos: sin
// fusionar esto serian ~250 llamadas. Fusionado son 4. Misma regla que las
// casas de enfrente y que las perchas de `garments.js`.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { revoqueTex, ladrilloTex } from './texturasBurela.js';
import { Z_CORDON_FRENTE, Z_FACHADA } from './burelaFrente.js';

// ---- Donde termina lo jugable ---------------------------------------------
// La zona caminable llega a x = ±28,5 y la cuadra de enfrente ocupa
// x = -34,75 a 39,25. De ahi para afuera arranca esto.
const X_FIN_OESTE = -35;
const X_FIN_ESTE = 39.5;
const FONDO_FRENTE = 11;                      // profundidad de las casas de enfrente
const Z_FONDO_MANZANA = Z_FACHADA + FONDO_FRENTE;  // 28,2: donde termina la cuadra de enfrente
// Nuestra vereda: la galeria del local mira al norte desde z ~ -4,5.
const Z_NUESTRA_FACHADA = -4.5;

const ACLARAR = 0.06;   // mismo criterio que burelaFrente.js: aclarar poco, iluminar mucho

// ---- Materiales ------------------------------------------------------------
// Solo tres, y los dos primeros comparten textura con las casas de enfrente
// para que el barrio se lea como el mismo barrio y no como dos maquetas.
function materiales() {
  const comun = { vertexColors: true, roughness: 0.93, metalness: 0 };
  return {
    revoque: new THREE.MeshStandardMaterial({ ...comun, map: revoqueTex() }),
    ladrillo: new THREE.MeshStandardMaterial({ ...comun, map: ladrilloTex() }),
    // Los volumenes lejanos van SIN textura: a 60 m una junta de ladrillo mide
    // menos de un pixel. Se midio: poniendole textura no cambia un pixel y
    // suma un material mas.
    lejos: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.98, metalness: 0 }),
  };
}

function pintar(geo, hex) {
  const c = new THREE.Color(hex).convertSRGBToLinear();
  c.lerp(new THREE.Color(1, 1, 1), ACLARAR);
  const n = geo.attributes.position.count;
  const col = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b; }
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
}

// Igual que en burelaFrente: sin reescalar UV el ladrillo sale del ancho de un
// auto en una pared de 12 m. El orden de caras de BoxGeometry es +X, -X, +Y,
// -Y, +Z, -Z, cuatro vertices cada una.
function escalarUV(geo, w, h, d, metros) {
  const uv = geo.attributes.uv;
  const lados = [[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]];
  for (let cara = 0; cara < 6; cara++) {
    const [cw, ch] = lados[cara];
    for (let v = 0; v < 4; v++) {
      const i = cara * 4 + v;
      uv.setXY(i, uv.getX(i) * (cw / metros), uv.getY(i) * (ch / metros));
    }
  }
}

function caja(cubos, material, color, w, h, d, x, y, z, metros = 1.2) {
  const g = new THREE.BoxGeometry(w, h, d);
  escalarUV(g, w, h, d, metros);
  g.translate(x, y, z);
  pintar(g, color);
  (cubos[material] ??= []).push(g);
}

// ---- Azar con semilla ------------------------------------------------------
// ⚠️ Semilla FIJA a proposito. Con `Math.random()` el barrio salia distinto en
// cada recarga: no se pueden comparar dos capturas, y si a Kusher le gusta una
// version no hay forma de volver a ella. Asi el barrio es siempre el mismo.
function dado(semilla) {
  let s = semilla;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

// Paletas sacadas de las mismas fotos de Street View que las casas de enfrente:
// revoque claro, crema, salvia, ladrillo, marron.
const COLORES_CERCA = ['#d9d3c6', '#c9c0ae', '#b9c2ae', '#a8836a', '#cfc4b4', '#9aa894', '#c2b7a4'];
const COLORES_TECHO = ['#8f5140', '#6d5c52', '#7a4a3a', '#5f5952'];

// ---- Una tira de casas -----------------------------------------------------
// Genera fachadas pegadas una a la otra a lo largo de X, con alturas y colores
// que varian. Es la unidad con la que se arma todo el barrio.
function tiraDeCasas(cubos, azar, {
  x0, x1, z, fondo, altoMin, altoMax, material = 'revoque', tejado = true, ventanas = true,
}) {
  let x = x0;
  while (x < x1) {
    const ancho = Math.min(5 + azar() * 7, x1 - x);
    if (ancho < 2.5) break;
    const alto = altoMin + azar() * (altoMax - altoMin);
    const cx = x + ancho / 2;
    const color = COLORES_CERCA[Math.floor(azar() * COLORES_CERCA.length)];
    const mat = material === 'mixto' ? (azar() < 0.3 ? 'ladrillo' : 'revoque') : material;
    caja(cubos, mat, color, ancho, alto, fondo, cx, alto / 2, z + fondo / 2);
    if (tejado) {
      caja(cubos, 'lejos', COLORES_TECHO[Math.floor(azar() * COLORES_TECHO.length)],
        ancho + 0.4, 0.35, fondo + 0.4, cx, alto + 0.17, z + fondo / 2);
    }
    // Ventanas: una banda oscura hundida por piso. A esta distancia no hace
    // falta marco ni vidrio — lo que se lee es el ritmo de agujeros oscuros.
    if (ventanas) {
      const pisos = Math.max(1, Math.floor(alto / 3.1));
      for (let p = 0; p < pisos; p++) {
        const y = 1.6 + p * 3.1;
        if (y + 0.7 > alto) break;
        const huecos = Math.max(1, Math.floor(ancho / 2.6));
        for (let h = 0; h < huecos; h++) {
          const hx = cx - ancho / 2 + (ancho / huecos) * (h + 0.5);
          caja(cubos, 'lejos', '#2f3844', 1.1, 1.35, 0.12, hx, y, z - 0.06);
        }
      }
    }
    x += ancho + 0.15;
  }
}

// Tanques de agua y medianeras: es lo que hace que un techo argentino no
// parezca una caja. Cuatro cajitas por techo, cuestan nada.
function coronarTechos(cubos, azar, { x0, x1, z, alto, cantidad }) {
  for (let i = 0; i < cantidad; i++) {
    const x = x0 + azar() * (x1 - x0);
    const h = 1.0 + azar() * 0.7;
    caja(cubos, 'lejos', '#8d8a82', 1.1, h, 1.1, x, alto + h / 2, z);
    caja(cubos, 'lejos', '#6f6b64', 0.16, 1.0, 0.16, x - 0.35, alto + 0.5, z + 0.6);
  }
}

export function buildBurelaAlrededores(scene) {
  const azar = dado(4200420);
  const mats = materiales();
  const cubos = {};

  // ===========================================================================
  // 1) LA CALLE QUE SIGUE — es lo mas importante de todo el archivo.
  // Parado en la vereda y mirando a lo largo de la calle, antes se veia el
  // asfalto cortarse en el aire. Ahora la cuadra continua para los dos lados
  // con las DOS veredas, asi que la calle se va cerrando en perspectiva y se
  // pierde en la niebla, que es lo que hace una calle de verdad.
  // ===========================================================================
  for (const [x0, x1] of [[-78, X_FIN_OESTE], [X_FIN_ESTE, 78]]) {
    // Vereda de enfrente (la misma linea que las casas recreadas).
    tiraDeCasas(cubos, azar, {
      x0, x1, z: Z_FACHADA, fondo: FONDO_FRENTE, altoMin: 4.5, altoMax: 11.5, material: 'mixto',
    });
    coronarTechos(cubos, azar, { x0, x1, z: Z_FACHADA + 4, alto: 7.5, cantidad: 5 });
    // Nuestra vereda: la fila de locales sigue para el mismo lado.
    tiraDeCasas(cubos, azar, {
      x0, x1, z: Z_NUESTRA_FACHADA - 9, fondo: 9, altoMin: 4.0, altoMax: 9.5, material: 'mixto',
    });
    // Calzada y cordones: el asfalto de street.js llega a x = ±(28,5+10). Se
    // continua con una tira lisa; a esta distancia el adoquin no se distingue.
    const ancho = x1 - x0, cx = (x0 + x1) / 2;
    caja(cubos, 'lejos', '#3a3a3c', ancho, 0.06, Z_CORDON_FRENTE - 6.6, cx, -0.03, (Z_CORDON_FRENTE + 6.6) / 2 + 0.4);
    caja(cubos, 'lejos', '#8a8880', ancho, 0.14, 3.2, cx, 0.07, Z_CORDON_FRENTE + 1.6);
    caja(cubos, 'lejos', '#b4aea2', ancho, 0.12, 4.4, cx, 0.06, 4.6);
  }

  // ===========================================================================
  // 2) EL FONDO DE LA MANZANA DE ENFRENTE.
  // Arriba de los techos recreados no habia NADA: la cuadra terminaba en una
  // linea recta contra el cielo. En una calle real, por encima de las casas de
  // enfrente asoman las medianeras y los techos de la cuadra siguiente.
  // ===========================================================================
  tiraDeCasas(cubos, azar, {
    x0: -46, x1: 50, z: Z_FONDO_MANZANA + 2, fondo: 12, altoMin: 5.5, altoMax: 13.5, material: 'mixto',
  });
  coronarTechos(cubos, azar, { x0: -40, x1: 44, z: Z_FONDO_MANZANA + 8, alto: 9.5, cantidad: 9 });
  // Segunda fila, ya mas lejos y sin ventanas: a 45 m son manchas.
  tiraDeCasas(cubos, azar, {
    x0: -56, x1: 60, z: Z_FONDO_MANZANA + 20, fondo: 14, altoMin: 7, altoMax: 18, material: 'lejos',
    ventanas: false, tejado: false,
  });

  // ===========================================================================
  // 3) LA MANZANA DE ATRAS (detras del local).
  // Ya habia torres Kenney sueltas por ahi; esto les pone la cuadra alrededor
  // para que no se lean como maquetas apoyadas en el pasto.
  // ===========================================================================
  tiraDeCasas(cubos, azar, {
    x0: -50, x1: 54, z: -52, fondo: 13, altoMin: 6, altoMax: 16, material: 'lejos',
    ventanas: false, tejado: false,
  });
  tiraDeCasas(cubos, azar, {
    x0: -40, x1: 44, z: -38, fondo: 10, altoMin: 4.5, altoMax: 10, material: 'mixto',
  });

  // ===========================================================================
  // 4) EL ANILLO DEL HORIZONTE.
  // Tapa cualquier rumbo que haya quedado vacio — sobre todo las diagonales,
  // que es por donde se seguia viendo el borde del mundo. A ~78 m la niebla ya
  // se los come casi enteros: aportan la SILUETA, no el edificio.
  // ===========================================================================
  const R = 78;
  for (let i = 0; i < 46; i++) {
    const a = (i / 46) * Math.PI * 2 + azar() * 0.05;
    const r = R + (azar() - 0.5) * 14;
    const x = Math.cos(a) * r;
    const z = -8 + Math.sin(a) * r;
    const h = 7 + azar() * 22;
    const w = 8 + azar() * 14;
    caja(cubos, 'lejos', azar() < 0.5 ? '#9fa5a8' : '#8e8e90', w, h, 10, x, h / 2, z);
  }

  // ---- Fusion --------------------------------------------------------------
  // Una malla por material. Sin esto serian ~250 llamadas de dibujo.
  const raiz = new THREE.Group();
  raiz.name = 'Barrio alrededor de Burela';
  raiz.userData.editorHint = 'T · decorado lejano, sin colision';
  let mallas = 0, triangulos = 0;
  for (const [clave, lista] of Object.entries(cubos)) {
    if (!lista.length) continue;
    const geo = mergeGeometries(lista, false);
    lista.forEach((g) => g.dispose());
    const malla = new THREE.Mesh(geo, mats[clave]);
    malla.name = `Barrio Burela · ${clave}`;
    // ⚠️ Sin sombras a proposito. Son 78 m de mapa: meterlos en el mapa de
    // sombras del sol obliga a agrandar su caja y la sombra de BOB y del local
    // —que es la que de verdad se ve— pierde definicion. Ademas no proyectan
    // sobre nada que el jugador pise.
    malla.castShadow = false;
    malla.receiveShadow = false;
    raiz.add(malla);
    mallas++;
    triangulos += geo.index ? geo.index.count / 3 : geo.attributes.position.count / 3;
  }
  scene.add(raiz);
  return { raiz, mallas, triangulos: Math.round(triangulos) };
}
