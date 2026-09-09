// La CUADRA DE ENFRENTE de Calle Burela, recreada a mano segun las fotos de
// Street View que paso Kusher (Burela 2502 a 2593, Buenos Aires).
//
// POR QUE ESTO EXISTE. La vereda por la que se camina ya estaba hecha, pero
// enfrente habia un kit de ciudad generico —casitas beige de dibujito— que no
// se parece en nada a Burela. Estando parado en la vereda, la mitad de lo que
// ve el jugador es esa pared de enfrente: si esa mitad no es Burela, no estas
// en Burela.
//
// QUE SE REPITE EN LAS FOTOS, Y POR ESO ESTA ACA:
//   · casas bajas de 1 y 2 pisos mezcladas con algun edificio de 3
//   · ladrillo a la vista al lado de revoque pintado (blanco, crema, verde
//     salvia, amarillo, marron)
//   · zocalo pintado de otro color en la base de la pared (celeste, gris)
//   · tejas coloradas, casi siempre solo en el borde del techo
//   · MUCHOS aires acondicionados colgados del frente — es lo que mas grita
//     "Buenos Aires" y son cuatro cajitas, cuestan nada
//   · balcones con baranda horizontal blanca y plantas
//   · persianas de madera, rejas en las ventanas bajas
//   · portones de chapa verdes, marrones y turquesa
//   · tanques de agua arriba
//   · arboles grandes en la vereda que tapan media fachada
//
// ⚠️ COSTO: se arma con cajas y se FUSIONA por material dentro de cada casa.
// En este proyecto las llamadas de dibujo pesan mas que los triangulos: sin
// fusionar, ocho casas con este detalle serian ~400 llamadas. Fusionadas son
// ~3 o 4 por casa. Ver la nota de `terminar()`.
//
// ⚠️ El color NO va en el material sino POR VERTICE. Asi ocho casas de ocho
// colores distintos comparten UN material de revoque y se pueden fusionar. Si
// cada color fuera su propio material, no habria fusion posible y volveriamos
// a las cientos de llamadas. Las texturas por eso son GRISES: aportan la trama
// (ladrillo, teja, persiana) y el color lo pone el vertice encima.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { ladrilloTex, revoqueTex, tejaTex, persianaTex } from './texturasBurela.js';

// ---- Donde va -------------------------------------------------------------
// El asfalto de `street.js` llega hasta z=14. De ahi para adelante es la vereda
// de enfrente, y las fachadas arrancan en Z_FACHADA.
export const Z_CORDON_FRENTE = 14.0;
export const Z_FACHADA = 17.2;
const FONDO = 11;            // profundidad del volumen de cada casa
const PISO = 3.15;           // alto de un piso

// ---- Materiales: uno por acabado, todos con color por vertice --------------
function materiales() {
  const comun = { vertexColors: true, roughness: 0.92, metalness: 0 };
  return {
    revoque: new THREE.MeshStandardMaterial({ ...comun, map: revoqueTex() }),
    ladrillo: new THREE.MeshStandardMaterial({ ...comun, map: ladrilloTex() }),
    teja: new THREE.MeshStandardMaterial({ ...comun, map: tejaTex(), roughness: 0.8 }),
    persiana: new THREE.MeshStandardMaterial({ ...comun, map: persianaTex(), roughness: 0.75 }),
    metal: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.55, metalness: 0.35 }),
    // ⚠️ El vidrio lleva EMISIVO. Sin el salia NEGRO: estas fachadas no reciben
    // sol directo, y un vidrio sin nada que reflejar es un agujero oscuro — la
    // primera prueba parecia una fila de casas tapiadas. En la calle real la
    // ventana devuelve el cielo, y eso es lo que imita el emisivo. Es tenue a
    // proposito: de noche baja con el resto en vez de quedar como un cartel.
    vidrio: new THREE.MeshStandardMaterial({
      vertexColors: true, roughness: 0.15, metalness: 0.2,
      emissive: 0x27333d, emissiveIntensity: 1,
    }),
  };
}

// ---- Armado de piezas ------------------------------------------------------
// Cada casa junta geometrias en `cubos[material]` y al final se fusionan.
// ⚠️ Apenas se aclaran los colores, y el trabajo pesado lo hace la LUZ.
// Primero probe compensar la sombra llevando cada color un 38% hacia el blanco:
// levanto el brillo pero DESATERO todo — el ladrillo quedo gris y el edificio
// verde casi blanco, la cuadra perdio la identidad. Aclarar hacia blanco sube y
// lava; subir la luz sube y conserva el tono, porque multiplica. Por eso este
// numero quedo chico y la intensidad de `luzDeRelleno` alta.
const ACLARAR = 0.06;

function pintar(geo, hex) {
  const c = new THREE.Color(hex).convertSRGBToLinear();
  c.lerp(new THREE.Color(1, 1, 1), ACLARAR);
  const n = geo.attributes.position.count;
  const col = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b; }
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
}

// ⚠️ Sin esto la textura se ESTIRA: `BoxGeometry` da UV de 0 a 1 por cara, asi
// que en una pared de 12 m de ancho el ladrillo sale del ancho de un auto. Se
// reescala cara por cara segun su tamaño real. El orden de caras de BoxGeometry
// es +X, -X, +Y, -Y, +Z, -Z, cuatro vertices cada una.
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

// ---- Piezas de fachada -----------------------------------------------------
// ⚠️ TODO RELIEVE VA HACIA -Z, O SEA RESTANDO. Estas fachadas miran a la calle,
// que esta en z MENOR; el volumen de la casa va de Z_FACHADA hacia +Z. Al
// principio sume los relieves (`z + 0.05`) y quedaron ENTERRADOS adentro de la
// pared: balcones, aires y rejas existian pero no se veian, y la cuadra parecia
// una fila de cajas lisas. Solo asomaba el vidrio, 2 cm, por eso las ventanas
// se notaban y nada mas. Si se agrega una pieza nueva, resta.
// Ventana: hueco oscuro + vidrio + marco. `persiana` la tapa a media altura,
// `reja` le pone barrotes (planta baja).
function ventana(cubos, { x, y, z, w = 1.1, h = 1.3, persiana = 0, reja = false, marco = '#e8e4da' }) {
  caja(cubos, 'vidrio', '#93a8b8', w, h, 0.08, x, y, z - 0.05);
  const t = 0.09;
  caja(cubos, 'revoque', marco, w + t * 2, t, 0.14, x, y + h / 2 + t / 2, z, 0.5);
  caja(cubos, 'revoque', marco, w + t * 2, t, 0.14, x, y - h / 2 - t / 2, z, 0.5);
  caja(cubos, 'revoque', marco, t, h, 0.14, x - w / 2 - t / 2, y, z, 0.5);
  caja(cubos, 'revoque', marco, t, h, 0.14, x + w / 2 + t / 2, y, z, 0.5);
  if (persiana > 0) {
    const hp = h * persiana;
    caja(cubos, 'persiana', '#8a5a30', w, hp, 0.06, x, y + h / 2 - hp / 2, z - 0.10, 0.35);
  }
  if (reja) {
    for (let i = 0; i <= 5; i++) {
      const bx = x - w / 2 + (w * i) / 5;
      caja(cubos, 'metal', '#2b2b28', 0.035, h, 0.035, bx, y, z - 0.13);
    }
    caja(cubos, 'metal', '#2b2b28', w, 0.04, 0.04, x, y + h / 2, z - 0.13);
    caja(cubos, 'metal', '#2b2b28', w, 0.04, 0.04, x, y - h / 2, z - 0.13);
  }
}

// Aire acondicionado: la cajita gris colgada del frente. Es EL detalle que
// hace que una fachada se lea como porteña, y son dos cubos.
function aire(cubos, x, y, z) {
  caja(cubos, 'metal', '#d9d7d0', 0.78, 0.5, 0.32, x, y, z - 0.16, 0.6);
  caja(cubos, 'metal', '#8e8c86', 0.6, 0.34, 0.03, x, y, z - 0.33, 0.4);
}

// Balcon: losa + baranda horizontal (las de las fotos son de caño blanco).
function balcon(cubos, { x, y, z, w = 2.6, color = '#efece4' }) {
  const vuelo = 0.95;
  caja(cubos, 'revoque', color, w, 0.14, vuelo, x, y, z - vuelo / 2, 0.8);
  const hb = 1.0;
  for (const t of [0.35, 0.68, 1.0]) {
    caja(cubos, 'metal', color, w, 0.05, 0.05, x, y + t, z - vuelo);
  }
  for (const bx of [-w / 2 + 0.05, 0, w / 2 - 0.05]) {
    caja(cubos, 'metal', color, 0.05, hb, 0.05, x + bx, y + hb / 2, z - vuelo);
  }
  caja(cubos, 'metal', color, 0.05, hb, 0.05, x - w / 2 + 0.05, y + hb / 2, z - vuelo / 2);
  caja(cubos, 'metal', color, 0.05, hb, 0.05, x + w / 2 - 0.05, y + hb / 2, z - vuelo / 2);
}

// Porton de chapa (garage). En las fotos son verdes, turquesa y marrones.
function porton(cubos, { x, z, w = 2.6, h = 2.3, color = '#3f6b45' }) {
  caja(cubos, 'persiana', color, w, h, 0.1, x, h / 2, z - 0.07, 0.3);
  caja(cubos, 'revoque', '#cfcabd', w + 0.16, 0.12, 0.16, x, h + 0.06, z, 0.5);
}

function puerta(cubos, { x, z, w = 0.95, h = 2.15, color = '#4a3327' }) {
  caja(cubos, 'metal', color, w, h, 0.1, x, h / 2, z - 0.07, 0.6);
  caja(cubos, 'revoque', '#e6e2d8', w + 0.14, 0.1, 0.14, x, h + 0.05, z, 0.5);
}

// Tanque de agua: casi todas las terrazas de las fotos tienen uno.
function tanque(cubos, x, y, z, color = '#2f3a44') {
  caja(cubos, 'metal', color, 1.1, 0.95, 1.1, x, y + 0.48, z, 0.9);
  caja(cubos, 'metal', '#6b6b66', 0.12, 0.7, 0.12, x - 0.35, y + 0.35, z + 0.62);
  caja(cubos, 'metal', '#6b6b66', 0.12, 0.7, 0.12, x + 0.35, y + 0.35, z + 0.62);
}

// Borde de tejas coloradas. En las fotos el techo casi nunca se ve entero:
// se ve la FRANJA de tejas asomando arriba de la pared, y con eso alcanza.
function alaTejas(cubos, { x, y, w, vuelo = 0.55, color = '#9c4a34' }) {
  caja(cubos, 'teja', color, w + 0.5, 0.34, vuelo, x, y + 0.17, Z_FACHADA - vuelo / 2 + 0.1, 0.45);
  caja(cubos, 'teja', color, w + 0.5, 0.5, 0.34, x, y + 0.42, Z_FACHADA - 0.12, 0.45);
}

// ---- Las ocho casas de la cuadra ------------------------------------------
// Cada una sale de una foto concreta. El comentario dice cual.
const CUADRA = [
  {
    id: 'casa-blanca-terraza', nombre: 'Enfrente · casa blanca con terraza (2593)',
    x: -30, w: 9.5, foto: 'Burela 2593, la casa blanca de la izquierda',
    build(c, { x, w }) {
      const h = 6.2;
      caja(c, 'revoque', '#e9e6dc', w, h, FONDO, x, h / 2, Z_FACHADA + FONDO / 2, 1.6);
      caja(c, 'revoque', '#d8d3c6', w + 0.3, 0.45, 0.5, x, h + 0.2, Z_FACHADA, 0.6);
      // planta baja: puerta de madera + porton con reja + ventana enrejada
      puerta(c, { x: x - 1.6, z: Z_FACHADA, color: '#6b4227' });
      porton(c, { x: x + 2.2, z: Z_FACHADA, w: 2.4, h: 2.2, color: '#8a6a3d' });
      ventana(c, { x: x - 3.5, y: 1.55, z: Z_FACHADA, w: 1.0, h: 1.1, reja: true });
      // primer piso: ventana grande con persiana bajada + baranda de terraza
      ventana(c, { x: x - 0.4, y: 4.5, z: Z_FACHADA, w: 2.4, h: 1.5, persiana: 0.55 });
      for (let i = 0; i <= 10; i++) {
        caja(c, 'metal', '#2f3330', 0.05, 0.95, 0.05, x - w / 2 + 0.4 + (i * (w - 0.8)) / 10, h + 0.9, Z_FACHADA - 0.12);
      }
      caja(c, 'metal', '#2f3330', w - 0.7, 0.06, 0.06, x, h + 1.35, Z_FACHADA - 0.12);
      aire(c, x + 3.2, 4.6, Z_FACHADA);
      tanque(c, x + 2.4, h + 0.45, Z_FACHADA + 3.2);
    },
  },
  {
    id: 'edificio-verde', nombre: 'Enfrente · edificio verde salvia con balcones (2593)',
    x: -18.5, w: 14, foto: 'Burela 2593, el edificio verde de 3 pisos',
    build(c, { x, w }) {
      const h = PISO * 3 + 0.6;
      caja(c, 'revoque', '#c3cbaa', w, h, FONDO, x, h / 2, Z_FACHADA + FONDO / 2, 1.8);
      // planta baja crema, mas clara que los pisos
      caja(c, 'revoque', '#e3ddc4', w, 3.0, 0.5, x, 1.5, Z_FACHADA - 0.02, 1.4);
      alaTejas(c, { x, y: h, w });
      porton(c, { x: x - 4.6, z: Z_FACHADA, w: 3.0, h: 2.4, color: '#b9b2a0' });
      puerta(c, { x: x - 1.4, z: Z_FACHADA, w: 1.1, h: 2.3, color: '#c8a86a' });
      ventana(c, { x: x + 2.0, y: 1.6, z: Z_FACHADA, w: 2.2, h: 1.2, reja: true });
      porton(c, { x: x + 5.4, z: Z_FACHADA, w: 2.8, h: 2.4, color: '#c9c2b0' });
      // dos pisos de balcones con baranda blanca, mas los aires colgados
      for (let piso = 1; piso <= 2; piso++) {
        const y = 3.0 + (piso - 1) * PISO;
        balcon(c, { x: x - 4.2, y, z: Z_FACHADA, w: 3.4 });
        balcon(c, { x: x + 2.6, y, z: Z_FACHADA, w: 4.6 });
        ventana(c, { x: x - 4.2, y: y + 1.25, z: Z_FACHADA, w: 1.6, h: 1.5, persiana: 0.3 });
        ventana(c, { x: x + 1.6, y: y + 1.25, z: Z_FACHADA, w: 1.4, h: 1.5 });
        ventana(c, { x: x + 3.8, y: y + 1.25, z: Z_FACHADA, w: 1.4, h: 1.5, persiana: 0.5 });
        aire(c, x - 6.0, y + 1.6, Z_FACHADA);
        aire(c, x - 0.6, y + 1.6, Z_FACHADA);
        aire(c, x + 5.9, y + 1.5, Z_FACHADA);
      }
      // el ultimo piso, sin balcon
      ventana(c, { x: x - 4.2, y: 9.6, z: Z_FACHADA, w: 1.6, h: 1.4, persiana: 0.35 });
      ventana(c, { x: x + 1.6, y: 9.6, z: Z_FACHADA, w: 1.4, h: 1.4 });
      ventana(c, { x: x + 3.8, y: 9.6, z: Z_FACHADA, w: 1.4, h: 1.4, persiana: 0.6 });
      aire(c, x - 6.0, 9.7, Z_FACHADA);
      aire(c, x + 5.9, 9.7, Z_FACHADA);
      tanque(c, x - 3, h + 0.4, Z_FACHADA + 4);
      tanque(c, x + 3, h + 0.4, Z_FACHADA + 5.4, '#3d4a52');
    },
  },
  {
    id: 'casa-marron', nombre: 'Enfrente · casa marron con persiana (2571)',
    x: -8.0, w: 7.5, foto: 'Burela 2571, el frente marron liso con la persiana',
    build(c, { x, w }) {
      const h = 4.6;
      caja(c, 'revoque', '#a98a63', w, h, FONDO, x, h / 2, Z_FACHADA + FONDO / 2, 1.5);
      caja(c, 'revoque', '#8f7351', w + 0.2, 0.4, 0.45, x, h + 0.18, Z_FACHADA, 0.6);
      // la persiana de madera ancha, medio bajada, es lo que define esta casa
      caja(c, 'persiana', '#7b4f2a', 2.9, 1.7, 0.1, x - 1.4, 2.9, Z_FACHADA - 0.07, 0.32);
      caja(c, 'revoque', '#cfc6b4', 3.1, 0.14, 0.2, x - 1.4, 3.82, Z_FACHADA, 0.5);
      puerta(c, { x: x + 2.3, z: Z_FACHADA, w: 1.0, h: 2.25, color: '#3a3a38' });
      caja(c, 'revoque', '#c9bfa9', 0.35, 0.5, 0.12, x + 3.2, 1.5, Z_FACHADA - 0.08, 0.4); // portero
      aire(c, x - 3.0, 3.6, Z_FACHADA);
    },
  },
  {
    id: 'casa-ladrillo-teja', nombre: 'Enfrente · casa de ladrillo con tejas (2561)',
    x: -0.5, w: 8.0, foto: 'Burela 2561, ladrillo a la vista con techo de tejas',
    build(c, { x, w }) {
      const h = 6.0;
      caja(c, 'ladrillo', '#9c5f47', w, h, FONDO, x, h / 2, Z_FACHADA + FONDO / 2, 1.1);
      alaTejas(c, { x, y: h, w, vuelo: 0.7 });
      // reja/porton negro y puerta de madera
      porton(c, { x: x - 2.2, z: Z_FACHADA, w: 2.7, h: 2.35, color: '#2e3330' });
      puerta(c, { x: x + 1.4, z: Z_FACHADA, w: 1.0, h: 2.2, color: '#5a3a24' });
      ventana(c, { x: x + 3.1, y: 1.6, z: Z_FACHADA, w: 1.1, h: 1.15, reja: true });
      // ventana redonda del primer piso (la de la foto)
      caja(c, 'revoque', '#e4dfd2', 1.25, 1.25, 0.14, x + 0.4, 4.5, Z_FACHADA - 0.08, 0.6);
      caja(c, 'vidrio', '#93a8b8', 0.95, 0.95, 0.06, x + 0.4, 4.5, Z_FACHADA - 0.12);
      ventana(c, { x: x - 2.4, y: 4.4, z: Z_FACHADA, w: 1.3, h: 1.4, persiana: 0.45 });
      aire(c, x + 2.9, 4.5, Z_FACHADA);
      tanque(c, x, h + 0.9, Z_FACHADA + 3.4, '#8d8a80');
    },
  },
  {
    id: 'casa-beige-alero', nombre: 'Enfrente · casa beige con alero de tejas (2541)',
    x: 8.0, w: 7.5, foto: 'Burela 2541, la casa baja beige con el alerito de tejas',
    build(c, { x, w }) {
      const h = 3.7;
      caja(c, 'revoque', '#c9bda4', w, h, FONDO, x, h / 2, Z_FACHADA + FONDO / 2, 1.5);
      caja(c, 'revoque', '#b3a68c', w + 0.2, 0.35, 0.4, x, h + 0.15, Z_FACHADA, 0.6);
      // alerito de tejas sobre la entrada
      caja(c, 'teja', '#a04f37', 3.4, 0.22, 0.9, x - 0.6, 2.75, Z_FACHADA - 0.4, 0.4);
      puerta(c, { x: x - 0.6, z: Z_FACHADA, w: 1.05, h: 2.2, color: '#6a4a2e' });
      ventana(c, { x: x - 2.9, y: 1.7, z: Z_FACHADA, w: 1.3, h: 1.2, reja: true });
      ventana(c, { x: x + 2.2, y: 1.7, z: Z_FACHADA, w: 1.5, h: 1.2, reja: true, persiana: 0.25 });
      aire(c, x + 3.1, 3.0, Z_FACHADA);
    },
  },
  {
    id: 'casa-turquesa', nombre: 'Enfrente · casa blanca con puertas turquesa (2515)',
    x: 16.5, w: 9.0, foto: 'Burela 2515, las puertas turquesa y el porton verde',
    build(c, { x, w }) {
      const h = 3.9;
      caja(c, 'revoque', '#dedbd0', w, h, FONDO, x, h / 2, Z_FACHADA + FONDO / 2, 1.5);
      caja(c, 'ladrillo', '#8f5a41', 2.6, h, 0.35, x + 3.2, h / 2, Z_FACHADA - 0.05, 1.0);
      caja(c, 'revoque', '#cdc7b8', w + 0.2, 0.38, 0.42, x, h + 0.17, Z_FACHADA, 0.6);
      puerta(c, { x: x - 3.4, z: Z_FACHADA, w: 1.0, h: 2.2, color: '#2f8f92' });
      // el doble porton turquesa del medio
      caja(c, 'persiana', '#2f8f92', 2.5, 2.35, 0.1, x - 0.4, 1.18, Z_FACHADA - 0.07, 0.3);
      caja(c, 'revoque', '#cfcabd', 2.7, 0.12, 0.16, x - 0.4, 2.42, Z_FACHADA, 0.5);
      porton(c, { x: x + 3.2, z: Z_FACHADA, w: 2.3, h: 2.3, color: '#3f6b45' });
      caja(c, 'revoque', '#e8e4da', 0.5, 0.65, 0.1, x - 2.0, 1.9, Z_FACHADA - 0.07, 0.4); // buzon/chapa
      aire(c, x + 1.4, 3.1, Z_FACHADA);
    },
  },
  {
    id: 'rotiseria-ladrillo', nombre: 'Enfrente · edificio de ladrillo con rotiseria (2502)',
    x: 26.0, w: 10.0, foto: 'Burela 2502, el edificio de ladrillo con la rotiseria abajo',
    build(c, { x, w }) {
      const h = PISO * 3 + 0.4;
      caja(c, 'ladrillo', '#a05f42', w, h, FONDO, x, h / 2, Z_FACHADA + FONDO / 2, 1.1);
      caja(c, 'revoque', '#8d5238', w + 0.25, 0.4, 0.45, x, h + 0.2, Z_FACHADA, 0.6);
      // cartel de la rotiseria y toldo rojo
      caja(c, 'revoque', '#1e1e1c', 4.4, 0.75, 0.12, x - 2.4, 3.35, Z_FACHADA - 0.08, 0.9);
      caja(c, 'metal', '#8e2b22', 5.0, 0.22, 0.75, x - 2.2, 3.95, Z_FACHADA - 0.45, 0.7);
      porton(c, { x: x - 3.6, z: Z_FACHADA, w: 2.4, h: 2.3, color: '#3f6b45' });
      porton(c, { x: x - 0.6, z: Z_FACHADA, w: 2.2, h: 2.4, color: '#3f6b45' });
      puerta(c, { x: x + 1.6, z: Z_FACHADA, w: 1.0, h: 2.3, color: '#6a5330' });
      // dos pisos con balcon de baranda verde
      for (let piso = 1; piso <= 2; piso++) {
        const y = 4.3 + (piso - 1) * PISO;
        balcon(c, { x: x - 1.4, y, z: Z_FACHADA, w: 4.6, color: '#3d6b4a' });
        ventana(c, { x: x - 2.6, y: y + 1.3, z: Z_FACHADA, w: 1.5, h: 1.5, persiana: 0.35 });
        ventana(c, { x: x + 0.2, y: y + 1.3, z: Z_FACHADA, w: 1.5, h: 1.5 });
        aire(c, x + 3.3, y + 1.4, Z_FACHADA);
      }
      ventana(c, { x: x - 2.6, y: 10.0, z: Z_FACHADA, w: 1.5, h: 1.4, persiana: 0.5 });
      ventana(c, { x: x + 0.2, y: 10.0, z: Z_FACHADA, w: 1.5, h: 1.4 });
      tanque(c, x + 1.5, h + 0.35, Z_FACHADA + 4.2);
    },
  },
  {
    id: 'casa-zocalo-azul', nombre: 'Enfrente · casa blanca con zocalo celeste (2502)',
    x: 34.5, w: 8.0, foto: 'Burela 2502, la casa blanca de zocalo celeste',
    build(c, { x, w }) {
      const h = 3.6;
      caja(c, 'revoque', '#e4e0d5', w, h, FONDO, x, h / 2, Z_FACHADA + FONDO / 2, 1.5);
      // el zocalo pintado: aparece en casi todas las fotos
      caja(c, 'revoque', '#7d9bb4', w + 0.06, 0.85, 0.06, x, 0.42, Z_FACHADA - 0.02, 0.9);
      caja(c, 'revoque', '#cfc9ba', w + 0.2, 0.36, 0.4, x, h + 0.16, Z_FACHADA, 0.6);
      ventana(c, { x: x - 2.3, y: 1.85, z: Z_FACHADA, w: 1.25, h: 1.15, reja: true });
      ventana(c, { x: x + 0.6, y: 1.85, z: Z_FACHADA, w: 1.25, h: 1.15, reja: true });
      puerta(c, { x: x + 3.0, z: Z_FACHADA, w: 1.0, h: 2.15, color: '#4a3327' });
      aire(c, x - 3.2, 2.9, Z_FACHADA);
    },
  },
];

// ---- Vereda de enfrente ---------------------------------------------------
function vereda(grupo) {
  const ancho = 86;
  const losa = new THREE.MeshStandardMaterial({ color: 0xb0aca2, roughness: 0.95 });
  const piso = new THREE.Mesh(new THREE.PlaneGeometry(ancho, Z_FACHADA - Z_CORDON_FRENTE), losa);
  piso.rotation.x = -Math.PI / 2;
  piso.position.set(2, 0.01, (Z_CORDON_FRENTE + Z_FACHADA) / 2);
  piso.receiveShadow = true;
  piso.name = 'Vereda de enfrente';
  grupo.add(piso);
  const cordon = new THREE.Mesh(new THREE.BoxGeometry(ancho, 0.16, 0.35),
    new THREE.MeshStandardMaterial({ color: 0x8a8880, roughness: 0.9 }));
  cordon.position.set(2, 0.08, Z_CORDON_FRENTE);
  cordon.name = 'Cordon de enfrente';
  grupo.add(cordon);
}

// ---- Arboles de vereda ----------------------------------------------------
// En las fotos los arboles tapan media fachada. No son decoracion: son lo que
// rompe la fila de cajas y hace que la cuadra parezca una cuadra.
function arboles(grupo) {
  const troncoMat = new THREE.MeshStandardMaterial({ color: 0x6b5340, roughness: 0.95 });
  const hojaMat = new THREE.MeshStandardMaterial({ color: 0x3f6b34, roughness: 0.9 });
  const troncos = [], hojas = [];
  let n = 1;
  // ⚠️ Ni muchos ni parejos. Con nueve arboles equidistantes la cuadra parecia
  // un boulevard de chupetines y tapaban justo el medio de cada fachada. En las
  // fotos hay pocos, desparejos, y varios flacos. Se eligen a mano y cada uno
  // sale de distinto tamaño.
  for (const [x, escala] of [[-25.5, 1.0], [-13, 0.72], [-1.5, 0.95], [10.5, 0.68], [21, 1.05], [33, 0.8]]) {
    const alto = (3.2 + ((n * 37) % 9) / 10) * escala;
    const t = new THREE.CylinderGeometry(0.15 * escala, 0.23 * escala, alto, 6);
    t.translate(x, alto / 2, Z_CORDON_FRENTE + 1.1);
    troncos.push(t);
    for (const [dx, dy, dz, r] of [[0, alto + 0.55, 0, 1.25], [-0.75, alto + 0.2, 0.45, 0.9], [0.8, alto + 0.3, -0.35, 0.95]]) {
      const h = new THREE.IcosahedronGeometry(r * escala * (0.85 + ((n * 13) % 7) / 24), 1);
      h.translate(x + dx * escala, dy, Z_CORDON_FRENTE + 1.1 + dz * escala);
      hojas.push(h);
    }
    n++;
  }
  const a = new THREE.Mesh(mergeGeometries(troncos), troncoMat);
  a.name = 'Arboles de enfrente · troncos';
  const b = new THREE.Mesh(mergeGeometries(hojas), hojaMat);
  b.name = 'Arboles de enfrente · copas';
  b.castShadow = true;
  grupo.add(a, b);
}

// ---- Fusion final ---------------------------------------------------------
// ⚠️ ACA ESTA EL AHORRO. Cada casa junta 40-90 cajas; sin fusionar, la cuadra
// entera serian ~450 llamadas de dibujo, mas que TODA Burela junta (621
// mallas). Fusionadas por material quedan 3 o 4 por casa. Se fusiona por casa
// y no por cuadra entera para que cada casa siga siendo un objeto que Kusher
// puede mover y borrar con `T`.
function terminar(cubos, mats, grupo, casa) {
  let mallas = 0;
  for (const [clave, lista] of Object.entries(cubos)) {
    if (!lista.length) continue;
    const geo = mergeGeometries(lista, false);
    for (const g of lista) g.dispose();
    const m = new THREE.Mesh(geo, mats[clave]);
    m.name = `${casa.nombre} · ${clave}`;
    m.castShadow = true;
    m.receiveShadow = true;
    grupo.add(m);
    mallas++;
  }
  return mallas;
}

// ---- Luz de relleno -------------------------------------------------------
// ⚠️ HACE FALTA, NO ES CAPRICHO. El sol de Burela esta en (14,16,10) mirando al
// origen, asi que ilumina lo que mira hacia +Z — la vidriera del local. Estas
// fachadas miran al reves, hacia -Z, y el producto punto da -0,43: reciben CERO
// sol directo. Con solo la hemisferica salian casi negras; se ve en la primera
// prueba, la cuadra parecia quemada.
// Es una segunda direccional SIN SOMBRA (no cuesta shadow map) que viene del
// lado del local, o sea la luz que en la calle real rebota de la vereda
// soleada. Intensidad baja a proposito: la vereda de enfrente sigue siendo el
// lado en sombra, solo que ahora se ve.
// Medido: el frente del local cambia menos de 2/255 por canal.
function luzDeRelleno(scene) {
  const luz = new THREE.DirectionalLight(0xf2efe6, 2.35);
  luz.position.set(-6, 13, -14);
  luz.target.position.set(0, 3, Z_FACHADA);
  luz.castShadow = false;
  luz.name = 'Relleno cuadra de enfrente';
  scene.add(luz, luz.target);
}

export function buildBurelaFrente(scene) {
  const mats = materiales();
  const raiz = new THREE.Group();
  raiz.name = 'Cuadra de enfrente Burela';
  scene.add(raiz);

  luzDeRelleno(scene);
  vereda(raiz);
  arboles(raiz);

  let mallas = 0;
  for (const casa of CUADRA) {
    const g = new THREE.Group();
    g.name = casa.nombre;
    const cubos = {};
    casa.build(cubos, casa);
    mallas += terminar(cubos, mats, g, casa);
    raiz.add(g);
    // ⚠️ NO se llama a `registerEditableObject`. La escena de Burela se
    // auto-registra por posicion en el arbol, asi que cada casa YA queda
    // editable con `T` sola (aparecen como `calle-kit:52.x`, hijas del grupo
    // 52). Registrarlas ademas a mano las dejaba anotadas DOS veces con el
    // mismo objeto: dos entradas distintas guardando la posicion del mismo
    // mueble, y al recargar ganaba la ultima. Se saco.
  }
  return { raiz, mallas };
}
