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

function caja(cubos, material, color, w, h, d, x, y, z, metros = 1.2, giroY = 0) {
  const g = new THREE.BoxGeometry(w, h, d);
  escalarUV(g, w, h, d, metros);
  // El giro va ANTES de mover: `rotateY` gira alrededor del origen, asi que si
  // se rota despues de trasladar, la pieza sale despedida lejos.
  if (giroY) g.rotateY(giroY);
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

// ---- La grilla de cuadras --------------------------------------------------
// ⚠️ DE DONDE SALE LA MEDIDA DE LA CUADRA, que no la invente. Las fotos de
// Street View que paso Kusher van de Burela 2502 a 2593. En Buenos Aires la
// numeracion da 100 numeros por cuadra, asi que esas seis fotos son UNA cuadra
// entera, de esquina a esquina — y la cuadra recreada (x -34,75 a 39,25) es esa
// cuadra. Por eso las calles transversales van justo en sus dos puntas.
const CUADRA_X0 = -34.75, CUADRA_X1 = 39.25;
const ANCHO_CALLE = 12;          // entre lineas de edificacion
const OCHAVA = 4;                // el corte a 45 grados de la esquina

// Centro de cada calle transversal.
const CRUCES = [CUADRA_X0 - ANCHO_CALLE / 2, CUADRA_X1 + ANCHO_CALLE / 2];

// ---- Una calle que corta la cuadra -----------------------------------------
// Es lo que mas cambia la escena. Sin esto la cuadra de enfrente es una cinta
// continua sin una sola esquina, y encima tapa TODAS las lineas de fuga: no hay
// por donde ver lejos. Una calle perpendicular alejandose es lo que hace que se
// vea profundidad de verdad.
function calleTransversal(cubos, azar, cx) {
  const z0 = -30;                 // arranca detras de nuestra manzana
  const z1 = Z_FACHADA + 46;      // y se va hasta donde la niebla la come
  const largo = z1 - z0, cz = (z0 + z1) / 2;

  // Igual que arriba: aca va el HUECO entre manzanas y los frentes que lo
  // miran, pero el piso de la calle no. Lo arma Kusher.

  // Los frentes que miran a ESTA calle: son los costados de las manzanas
  // vecinas, y son los que dan la fuga porque se ven de canto, alejandose.
  for (const lado of [-1, 1]) {
    const xf = cx + lado * (ANCHO_CALLE / 2);
    // hacia el fondo (la manzana de enfrente) y hacia atras (la nuestra)
    for (const [za, zb, alt] of [[Z_FACHADA + 2, z1 - 4, 12], [z0 + 4, Z_NUESTRA_FACHADA - 10, 9]]) {
      let z = za;
      while (z < zb) {
        const fondo = Math.min(5 + azar() * 7, zb - z);
        if (fondo < 2.5) break;
        const alto = 4.5 + azar() * (alt - 4.5);
        const color = COLORES_CERCA[Math.floor(azar() * COLORES_CERCA.length)];
        caja(cubos, azar() < 0.3 ? 'ladrillo' : 'revoque', color,
          9, alto, fondo, xf + lado * 4.5, alto / 2, z + fondo / 2);
        caja(cubos, 'lejos', COLORES_TECHO[Math.floor(azar() * COLORES_TECHO.length)],
          9.4, 0.35, fondo + 0.4, xf + lado * 4.5, alto + 0.17, z + fondo / 2);
        z += fondo + 0.15;
      }
    }
  }

  // ---- Las OCHAVAS ---------------------------------------------------------
  // El corte a 45 grados de la esquina. Es obligatorio por codigo en Buenos
  // Aires desde 1887 y es LA firma visual de la ciudad: sin ochava las esquinas
  // se leen en angulo recto y quedan raras aunque uno no sepa por que.
  // Cuatro por cruce: las dos de la vereda de enfrente y las dos de la nuestra.
  for (const lado of [-1, 1]) {
    const xe = cx + lado * (ANCHO_CALLE / 2);
    for (const [z, alto] of [[Z_FACHADA, 7.5], [Z_NUESTRA_FACHADA - 9, 6.5]]) {
      const haciaAdentro = z > 0 ? 1 : -1;
      caja(cubos, 'revoque', '#cfc7b8', OCHAVA, alto, OCHAVA,
        xe + lado * OCHAVA * 0.30, alto / 2, z + haciaAdentro * OCHAVA * 0.30,
        1.2, Math.PI / 4);
    }
  }
}

export function buildBurelaAlrededores(scene) {
  const azar = dado(4200420);
  const mats = materiales();
  const cubos = {};

  // ===========================================================================
  // 1) LA CALLE QUE SIGUE, CORTADA EN CUADRAS.
  // Parado en la vereda y mirando a lo largo de la calle, antes se veia el
  // asfalto cortarse en el aire. Despues quedo continua, pero era una tira
  // infinita de casas pegadas sin una sola esquina. Ahora tiene las calles
  // transversales, asi que se lee como cuadras.
  // ===========================================================================
  // ⚠️ Los tramos EMPIEZAN despues de cada calle transversal: por eso -46,75 y
  // 51,25 y no las puntas de la cuadra recreada. Ese hueco es el cruce.
  const TRAMOS = [
    [-78, CUADRA_X0 - ANCHO_CALLE],
    [CUADRA_X1 + ANCHO_CALLE, 78],
  ];
  for (const [x0, x1] of TRAMOS) {
    // Vereda de enfrente (la misma linea que las casas recreadas).
    tiraDeCasas(cubos, azar, {
      x0, x1, z: Z_FACHADA, fondo: FONDO_FRENTE, altoMin: 4.5, altoMax: 11.5, material: 'mixto',
    });
    coronarTechos(cubos, azar, { x0, x1, z: Z_FACHADA + 4, alto: 7.5, cantidad: 5 });
    // Nuestra vereda: la fila de locales sigue para el mismo lado.
    tiraDeCasas(cubos, azar, {
      x0, x1, z: Z_NUESTRA_FACHADA - 9, fondo: 9, altoMin: 4.0, altoMax: 9.5, material: 'mixto',
    });
  }

  // ⚠️ ACA NO VA NINGUN PISO NI NINGUN CORDON, Y ES A PROPOSITO.
  //
  // Tenia losas de vereda y de asfalto de 156 m de largo cruzando todo el mapa,
  // mas dos cordones. Fue un error y Kusher lo vio enseguida:
  //   · la losa de vereda quedaba a la MISMA altura (y=0) que el piso que el ya
  //     tenia, asi que las dos superficies peleaban por el mismo pixel — eso es
  //     el rayado que se ve en la captura, y ademas lagueaba;
  //   · el cordon caia justo encima del `Cordon calle Burela` de street.js, o
  //     sea dos cordones pisados;
  //   · encima tapaba la vereda que Kusher habia acomodado a mano, una por una.
  //
  // REGLA: el piso de la zona jugable es de Kusher. Este archivo pone la MASA
  // del barrio (paredes, techos, siluetas) y NADA que se pise ni que compita
  // con algo que ya exista. Las calles las arma el con el editor.

  for (const cx of CRUCES) calleTransversal(cubos, azar, cx);

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
