// CANCHA DE BARRIO — la escena del 1v1 del piso HOOP SEASON.
//
// Bloque 1 de 5: geometría, medidas y look. Todavía no hay juego acá adentro.
//
// MEDIDAS REALES, EN METROS. Nada de "unidades del mundo": si el aro no está a
// 3,05 m y la pelota no mide 24,26 cm, la física del tiro se siente falsa por
// más que los números del código sean lindos. Todo el resto del juego lee estas
// constantes, así que se corrigen en un solo lugar.
//
// Sistema de coordenadas:
//   - la línea de fondo es z = 0 y la cancha crece hacia +z
//   - x = 0 es el centro del aro; la media cancha termina en z = 14,33
//   - y = 0 es el asfalto
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import {
  asfaltoColor, asfaltoNormal, ASFALTO_METROS, pinturaGastada,
  manchaAceite, parcheAsfalto, alambradoTex, tableroTex, yuyoTex,
} from './texturas.js';
import { ladrilloTex, revoqueTex } from '../../world/texturasBurela.js';

export const MEDIDAS = Object.freeze({
  // aro y tablero (medidas NBA, que son las del 2K)
  ARO_ALTURA: 3.05,
  ARO_RADIO: 0.2285,            // interior: diámetro 0,457
  ARO_TUBO: 0.009,              // caño de 18 mm
  TABLERO_ANCHO: 1.83,
  TABLERO_ALTO: 1.07,
  TABLERO_ESPESOR: 0.06,
  TABLERO_BORDE_INFERIOR: 2.90,
  TABLERO_Z: 1.20,              // cara del tablero, medida desde la línea de fondo
  ARO_A_TABLERO: 0.375,         // centro del aro respecto de la cara del tablero

  // cancha
  ANCHO: 15.24,                 // 50 pies
  FONDO: 14.33,                 // media cancha, 47 pies
  PINTURA_ANCHO: 4.88,
  LIBRES_Z: 5.79,
  LIBRES_RADIO: 1.80,
  TRIPLE_RADIO: 6.75,           // criterio FIBA, que es el que usan las canchas de barrio
  TRIPLE_ESQUINA_X: 6.60,
  RESTRINGIDA_RADIO: 1.25,
  LINEA_ANCHO: 0.05,

  // pelota y jugadores (los usan los bloques que vienen)
  PELOTA_RADIO: 0.1213,         // diámetro 24,26 cm
  PELOTA_MASA: 0.62,
  JUGADOR_ALTO: 1.90,
});

const M = MEDIDAS;
const ARO_Z = M.TABLERO_Z + M.ARO_A_TABLERO;   // 1,575

// Random con semilla: la cancha tiene que salir IGUAL en cada partida. Con
// Math.random() las manchas y los yuyos se mueven en cada mount y no se puede
// comparar una captura contra la anterior.
function dado(semilla) {
  let s = semilla >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

// ---------------------------------------------------------------------------
// Líneas de la cancha
// ---------------------------------------------------------------------------
// Van como GEOMETRÍA, no pintadas en la textura del piso. Tres motivos:
//   - quedan nítidas a cualquier distancia (una textura de piso que cubriera
//     los 15 m de ancho necesitaría 2048 px y son 16 MB de VRAM)
//   - todas juntas son UN solo draw call después de fusionarlas
//   - el desgaste se lo pone un alphaMap chiquito, que se ve mejor que
//     dibujar la pintura saltada a mano
const Y_LINEA = 0.006;

function lineaRecta(x1, z1, x2, z2, ancho = M.LINEA_ANCHO) {
  const largo = Math.hypot(x2 - x1, z2 - z1);
  const g = new THREE.PlaneGeometry(largo, ancho);
  g.rotateX(-Math.PI / 2);
  g.rotateY(-Math.atan2(z2 - z1, x2 - x1));
  g.translate((x1 + x2) / 2, 0, (z1 + z2) / 2);
  return g;
}

// Ángulos medidos en el piso desde +X hacia +Z. Ojo: la RingGeometry vive en el
// plano XY y al acostarla con rotateX(-90°) su ángulo queda espejado respecto
// del mundo — por eso theta = -phi. Perder media hora con esto es tradición.
function arco(cx, cz, radio, desdeGrados, hastaGrados, ancho = M.LINEA_ANCHO) {
  const largo = THREE.MathUtils.degToRad(hastaGrados - desdeGrados);
  const g = new THREE.RingGeometry(
    radio - ancho / 2, radio + ancho / 2,
    Math.max(10, Math.round(Math.abs(largo) * 42)), 1,
    -THREE.MathUtils.degToRad(hastaGrados), largo,
  );
  g.rotateX(-Math.PI / 2);
  g.translate(cx, 0, cz);
  return g;
}

function construirLineas() {
  const partes = [];
  const mitad = M.ANCHO / 2;              // 7,62
  const pintura = M.PINTURA_ANCHO / 2;    // 2,44

  // perímetro
  partes.push(lineaRecta(-mitad, 0, mitad, 0));                 // fondo
  partes.push(lineaRecta(-mitad, M.FONDO, mitad, M.FONDO));     // media cancha
  partes.push(lineaRecta(-mitad, 0, -mitad, M.FONDO));          // laterales
  partes.push(lineaRecta(mitad, 0, mitad, M.FONDO));

  // pintura y línea de libres
  partes.push(lineaRecta(-pintura, 0, -pintura, M.LIBRES_Z));
  partes.push(lineaRecta(pintura, 0, pintura, M.LIBRES_Z));
  partes.push(lineaRecta(-pintura, M.LIBRES_Z, pintura, M.LIBRES_Z));

  // círculo de libres: la mitad de afuera va entera, la de adentro punteada,
  // como en una cancha de verdad
  partes.push(arco(0, M.LIBRES_Z, M.LIBRES_RADIO, 0, 180));
  for (let i = 0; i < 6; i++) {
    const desde = 180 + i * 30 + 6;
    partes.push(arco(0, M.LIBRES_Z, M.LIBRES_RADIO, desde, desde + 18));
  }

  // triple: dos rectas de esquina y el arco que las une
  const zEsquina = ARO_Z + Math.sqrt(M.TRIPLE_RADIO ** 2 - M.TRIPLE_ESQUINA_X ** 2);
  const angEsquina = THREE.MathUtils.radToDeg(Math.atan2(zEsquina - ARO_Z, M.TRIPLE_ESQUINA_X));
  partes.push(lineaRecta(-M.TRIPLE_ESQUINA_X, 0, -M.TRIPLE_ESQUINA_X, zEsquina));
  partes.push(lineaRecta(M.TRIPLE_ESQUINA_X, 0, M.TRIPLE_ESQUINA_X, zEsquina));
  partes.push(arco(0, ARO_Z, M.TRIPLE_RADIO, angEsquina, 180 - angEsquina));

  // zona restringida bajo el aro
  partes.push(arco(0, ARO_Z, M.RESTRINGIDA_RADIO, 0, 180, 0.04));

  // medio círculo del centro
  partes.push(arco(0, M.FONDO, M.LIBRES_RADIO, 180, 360));

  const fusionada = mergeGeometries(partes, false);
  partes.forEach((p) => p.dispose());

  // Las UV se reescriben en coordenadas del MUNDO para que la pintura saltada
  // se reparta parejo por toda la cancha. Con las UV originales cada línea
  // llevaría el patrón completo estirado a su largo y se notaría la repetición.
  const pos = fusionada.attributes.position;
  const uv = fusionada.attributes.uv;
  for (let i = 0; i < pos.count; i++) {
    uv.setXY(i, pos.getX(i) / 2, pos.getZ(i) / 2);
  }
  uv.needsUpdate = true;
  fusionada.translate(0, Y_LINEA, 0);
  return fusionada;
}

// ---------------------------------------------------------------------------
// Aro, tablero, red y poste
// ---------------------------------------------------------------------------
function construirCanasta(recolectar) {
  const grupo = new THREE.Group();
  grupo.name = 'canasta';

  const naranja = recolectar(new THREE.MeshStandardMaterial({
    color: 0xd4501f, roughness: 0.55, metalness: 0.35,
  }));
  const metal = recolectar(new THREE.MeshStandardMaterial({
    color: 0x6f7378, roughness: 0.45, metalness: 0.85,
  }));
  const metalOscuro = recolectar(new THREE.MeshStandardMaterial({
    color: 0x3a3d42, roughness: 0.6, metalness: 0.7,
  }));

  // ── tablero ──────────────────────────────────────────────────────────────
  const caraTablero = recolectar(new THREE.MeshStandardMaterial({
    map: tableroTex(), roughness: 0.72, metalness: 0.05,
  }));
  const cantoTablero = recolectar(new THREE.MeshStandardMaterial({
    color: 0xb9b6ad, roughness: 0.8,
  }));
  const tableroGeo = recolectar(new THREE.BoxGeometry(
    M.TABLERO_ANCHO, M.TABLERO_ALTO, M.TABLERO_ESPESOR,
  ));
  // el índice 4 de una BoxGeometry es la cara +Z, que es la que mira a la cancha
  const tablero = new THREE.Mesh(tableroGeo, [
    cantoTablero, cantoTablero, cantoTablero, cantoTablero, caraTablero, cantoTablero,
  ]);
  tablero.position.set(0, M.TABLERO_BORDE_INFERIOR + M.TABLERO_ALTO / 2,
    M.TABLERO_Z - M.TABLERO_ESPESOR / 2);
  tablero.castShadow = true;
  tablero.receiveShadow = true;
  grupo.add(tablero);

  // ── aro ──────────────────────────────────────────────────────────────────
  const aroGeo = recolectar(new THREE.TorusGeometry(M.ARO_RADIO, M.ARO_TUBO, 10, 40));
  const aro = new THREE.Mesh(aroGeo, naranja);
  aro.rotation.x = -Math.PI / 2;
  aro.position.set(0, M.ARO_ALTURA, ARO_Z);
  aro.castShadow = true;
  aro.name = 'aro';
  grupo.add(aro);

  // chapa de anclaje y dos riostras: sin esto el aro parece flotar
  const chapa = new THREE.Mesh(recolectar(new THREE.BoxGeometry(0.34, 0.22, 0.03)), metalOscuro);
  chapa.position.set(0, M.ARO_ALTURA + 0.02, M.TABLERO_Z + 0.015);
  grupo.add(chapa);
  for (const lado of [-1, 1]) {
    const riostra = new THREE.Mesh(recolectar(new THREE.CylinderGeometry(0.012, 0.012, 0.30, 6)), metalOscuro);
    riostra.position.set(lado * 0.11, M.ARO_ALTURA - 0.09, M.TABLERO_Z + 0.14);
    riostra.rotation.x = Math.PI / 2.6;
    grupo.add(riostra);
  }

  // ── red de cadena ────────────────────────────────────────────────────────
  // 12 cadenas de 5 tramos que se van cerrando. Todas fusionadas en una malla:
  // sueltas serían 60 draw calls colgando de un aro.
  const CADENAS = 12, TRAMOS = 5, LARGO = 0.42;
  const tramos = [];
  for (let i = 0; i < CADENAS; i++) {
    const ang = (i / CADENAS) * Math.PI * 2;
    for (let t = 0; t < TRAMOS; t++) {
      // la red se cierra de 1,0 a 0,55 del radio del aro, como una de verdad
      const r0 = M.ARO_RADIO * (1 - (t / TRAMOS) * 0.45);
      const r1 = M.ARO_RADIO * (1 - ((t + 1) / TRAMOS) * 0.45);
      const y0 = -(t / TRAMOS) * LARGO;
      const y1 = -((t + 1) / TRAMOS) * LARGO;
      const a = new THREE.Vector3(Math.cos(ang) * r0, y0, Math.sin(ang) * r0);
      const b = new THREE.Vector3(Math.cos(ang) * r1, y1, Math.sin(ang) * r1);
      const largo = a.distanceTo(b);
      const g = new THREE.CylinderGeometry(0.0055, 0.0055, largo, 4);
      const medio = a.clone().add(b).multiplyScalar(0.5);
      const eje = b.clone().sub(a).normalize();
      const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), eje);
      g.applyQuaternion(q);
      g.translate(medio.x, medio.y, medio.z);
      tramos.push(g);
    }
  }
  const redGeo = recolectar(mergeGeometries(tramos, false));
  tramos.forEach((t) => t.dispose());
  const red = new THREE.Mesh(redGeo, metal);
  red.position.set(0, M.ARO_ALTURA, ARO_Z);
  red.castShadow = true;
  red.name = 'red';
  grupo.add(red);

  // ── poste y brazo ────────────────────────────────────────────────────────
  // Poste plantado atrás de la línea de fondo, con el brazo en cuello de ganso.
  // Así están las canchas de barrio: el poste NUNCA va abajo del aro.
  const POSTE_Z = -0.75;
  const poste = new THREE.Mesh(
    recolectar(new THREE.CylinderGeometry(0.085, 0.10, 3.75, 12)), metalOscuro,
  );
  poste.position.set(0, 3.75 / 2, POSTE_Z);
  poste.castShadow = true;
  grupo.add(poste);

  const brazo = new THREE.Mesh(
    recolectar(new THREE.BoxGeometry(0.13, 0.13, M.TABLERO_Z - POSTE_Z)), metalOscuro,
  );
  brazo.position.set(0, 3.62, (POSTE_Z + M.TABLERO_Z) / 2 - 0.03);
  brazo.castShadow = true;
  grupo.add(brazo);

  // puntal en diagonal del brazo al poste
  const puntal = new THREE.Mesh(
    recolectar(new THREE.CylinderGeometry(0.05, 0.05, 1.5, 8)), metalOscuro,
  );
  puntal.position.set(0, 2.98, POSTE_Z + 0.62);
  puntal.rotation.x = -Math.PI / 4;
  puntal.castShadow = true;
  grupo.add(puntal);

  // base de hormigón
  const base = new THREE.Mesh(
    recolectar(new THREE.CylinderGeometry(0.42, 0.5, 0.22, 12)),
    recolectar(new THREE.MeshStandardMaterial({ color: 0x8e8b83, roughness: 0.95 })),
  );
  base.position.set(0, 0.09, POSTE_Z);
  base.receiveShadow = true;
  base.castShadow = true;
  grupo.add(base);

  return { grupo, aro, tablero, red };
}

// ---------------------------------------------------------------------------
// Alambrado olímpico
// ---------------------------------------------------------------------------
function construirAlambrado(recolectar) {
  const grupo = new THREE.Group();
  grupo.name = 'alambrado';
  const ALTO = 3.2;
  const tex = alambradoTex();

  const mat = recolectar(new THREE.MeshStandardMaterial({
    map: tex, alphaMap: tex, transparent: false, alphaTest: 0.42,
    side: THREE.DoubleSide, roughness: 0.5, metalness: 0.6,
    color: 0x9aa0a6, depthWrite: true,
  }));
  const caño = recolectar(new THREE.MeshStandardMaterial({
    color: 0x8b9096, roughness: 0.5, metalness: 0.7,
  }));

  const X = M.ANCHO / 2 + 1.9;     // 9,52
  const Z0 = -2.9;
  const Z1 = M.FONDO + 1.6;

  const paños = [
    { largo: X * 2, x: 0, z: Z0, rot: 0 },              // atrás del aro
    { largo: Z1 - Z0, x: -X, z: (Z0 + Z1) / 2, rot: Math.PI / 2 },
    { largo: Z1 - Z0, x: X, z: (Z0 + Z1) / 2, rot: Math.PI / 2 },
  ];

  for (const p of paños) {
    // La textura trae 4 rombos: repetida cada 0,6 m da rombos de 15 cm. Cada
    // paño mide distinto, así que necesita su propia copia con su repeat — dos
    // paños no pueden compartir la textura si no comparten medida.
    const propia = recolectar(tex.clone());
    propia.needsUpdate = true;
    propia.repeat.set(p.largo / 0.6, ALTO / 0.6);
    const matPropio = recolectar(mat.clone());
    matPropio.map = propia;
    matPropio.alphaMap = propia;

    const geo = recolectar(new THREE.PlaneGeometry(p.largo, ALTO));
    const malla = new THREE.Mesh(geo, matPropio);
    malla.position.set(p.x, ALTO / 2, p.z);
    malla.rotation.y = p.rot;
    grupo.add(malla);

    // postes cada 3 m y caño superior
    const cantidad = Math.max(2, Math.round(p.largo / 3));
    for (let i = 0; i <= cantidad; i++) {
      const t = i / cantidad - 0.5;
      const poste = new THREE.Mesh(
        recolectar(new THREE.CylinderGeometry(0.045, 0.045, ALTO + 0.12, 6)), caño,
      );
      poste.position.set(
        p.x + Math.cos(p.rot) * t * p.largo,
        (ALTO + 0.12) / 2,
        p.z - Math.sin(p.rot) * t * p.largo,
      );
      poste.castShadow = true;
      grupo.add(poste);
    }
    const rail = new THREE.Mesh(
      recolectar(new THREE.CylinderGeometry(0.035, 0.035, p.largo, 6)), caño,
    );
    rail.rotation.z = Math.PI / 2;
    rail.rotation.y = p.rot;
    rail.position.set(p.x, ALTO, p.z);
    grupo.add(rail);
  }
  return grupo;
}

// ---------------------------------------------------------------------------
// Alrededores: edificios, banco, farola, yuyos
// ---------------------------------------------------------------------------
function construirEntorno(recolectar) {
  const grupo = new THREE.Group();
  grupo.name = 'entorno';
  const rnd = dado(4207);

  // ── edificios de fondo ───────────────────────────────────────────────────
  // Cajas con textura de ladrillo/revoque de Burela (las mismas del mundo
  // grande: salen en gris y el color lo pone el material, así comparten trama).
  const ladrillo = ladrilloTex();
  const revoque = revoqueTex();
  const paleta = [0xa5705a, 0xc0b3a0, 0x8d8172, 0xb08a6d, 0x94897c];

  for (let i = 0; i < 7; i++) {
    const ancho = 6 + rnd() * 9;
    const alto = 5.5 + rnd() * 11;
    const fondo = 6 + rnd() * 6;
    const usaLadrillo = rnd() > 0.45;
    const tex = (usaLadrillo ? ladrillo : revoque).clone();
    tex.needsUpdate = true;
    tex.repeat.set(ancho / 1.2, alto / 1.2);
    recolectar(tex);

    const mat = recolectar(new THREE.MeshStandardMaterial({
      map: tex, color: paleta[i % paleta.length], roughness: 0.94,
    }));
    const geo = recolectar(new THREE.BoxGeometry(ancho, alto, fondo));
    const edificio = new THREE.Mesh(geo, mat);
    // ⚠️ La posición es el CENTRO de la caja: con 12 m de fondo, un centro en
    // z = -9 deja la fachada en z = -3, o sea pegada al alambrado (z = -2,9).
    // Así estaban en la primera prueba y parecían encima de la cancha.
    edificio.position.set(-26 + i * 8.5 + rnd() * 2.5, alto / 2, -13 - rnd() * 11);
    edificio.castShadow = true;
    edificio.receiveShadow = true;
    grupo.add(edificio);
  }

  // ── banco de plaza ───────────────────────────────────────────────────────
  const madera = recolectar(new THREE.MeshStandardMaterial({ color: 0x6b4a2f, roughness: 0.85 }));
  const hierro = recolectar(new THREE.MeshStandardMaterial({ color: 0x2f3336, roughness: 0.6, metalness: 0.5 }));
  const banco = new THREE.Group();
  for (let i = 0; i < 3; i++) {
    const tabla = new THREE.Mesh(recolectar(new THREE.BoxGeometry(1.8, 0.05, 0.14)), madera);
    tabla.position.set(0, 0.45, -0.18 + i * 0.17);
    tabla.castShadow = true;
    banco.add(tabla);
  }
  for (const lado of [-0.75, 0.75]) {
    const pata = new THREE.Mesh(recolectar(new THREE.BoxGeometry(0.06, 0.45, 0.5)), hierro);
    pata.position.set(lado, 0.225, 0);
    pata.castShadow = true;
    banco.add(pata);
  }
  banco.position.set(-M.ANCHO / 2 - 1.1, 0, 7.5);
  banco.rotation.y = Math.PI / 2;
  grupo.add(banco);

  // ── farola ───────────────────────────────────────────────────────────────
  const farola = new THREE.Group();
  const columna = new THREE.Mesh(recolectar(new THREE.CylinderGeometry(0.07, 0.09, 5.2, 8)), hierro);
  columna.position.y = 2.6;
  columna.castShadow = true;
  farola.add(columna);
  const luminaria = new THREE.Mesh(
    recolectar(new THREE.BoxGeometry(0.55, 0.12, 0.3)),
    recolectar(new THREE.MeshStandardMaterial({ color: 0x2f3336, roughness: 0.6, metalness: 0.5 })),
  );
  luminaria.position.set(0.32, 5.15, 0);
  farola.add(luminaria);
  farola.position.set(M.ANCHO / 2 + 1.3, 0, 3.2);
  grupo.add(farola);

  // ── yuyos en las rajaduras y contra el alambrado ─────────────────────────
  // Dos planos cruzados por mata: de lejos leen como pasto, cuestan nada.
  const yuyoMat = recolectar(new THREE.MeshStandardMaterial({
    map: yuyoTex(), alphaMap: yuyoTex(), transparent: false, alphaTest: 0.5,
    side: THREE.DoubleSide, roughness: 1,
  }));
  const matas = [];
  for (let i = 0; i < 46; i++) {
    const borde = rnd();
    let x, z;
    if (borde < 0.5) {                       // pegados al alambrado
      x = (rnd() > 0.5 ? 1 : -1) * (M.ANCHO / 2 + 1.6 + rnd() * 0.5);
      z = -2.6 + rnd() * (M.FONDO + 3.8);
    } else if (borde < 0.75) {
      x = -M.ANCHO / 2 - 2.6 + rnd() * (M.ANCHO + 5.2);
      z = -2.7 + rnd() * 0.5;
    } else {                                  // alguna que rompe el asfalto
      x = (rnd() - 0.5) * M.ANCHO * 0.95;
      z = 0.4 + rnd() * (M.FONDO - 0.8);
    }
    const alto = 0.18 + rnd() * 0.22;
    for (const giro of [0, Math.PI / 2]) {
      const g = new THREE.PlaneGeometry(alto * 1.3, alto);
      g.translate(0, alto / 2, 0);
      g.rotateY(giro + rnd() * 0.6);
      g.translate(x, 0, z);
      matas.push(g);
    }
  }
  const yuyoGeo = recolectar(mergeGeometries(matas, false));
  matas.forEach((m) => m.dispose());
  grupo.add(new THREE.Mesh(yuyoGeo, yuyoMat));

  return grupo;
}

// ---------------------------------------------------------------------------
// Cielo + iluminación
// ---------------------------------------------------------------------------
// El cielo se dibuja en un canvas equirectangular chiquito y se usa para DOS
// cosas: la cúpula que se ve, y el `environment` de la escena (PMREM). Ese
// segundo uso es el que hace que el metal del aro y del alambrado reflejen algo
// y no se vean de plástico. Es el cambio más grande por menos KB que hay.
function cieloYLuces(scene, renderer, recolectar) {
  const W = 256, H = 128;
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const g = c.getContext('2d');
  const grad = g.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0.00, '#2f5c96');
  grad.addColorStop(0.35, '#7ea6cf');
  grad.addColorStop(0.62, '#e8c79a');
  grad.addColorStop(0.78, '#e8a06a');
  grad.addColorStop(1.00, '#6b5a4c');
  g.fillStyle = grad;
  g.fillRect(0, 0, W, H);
  // sol bajo, del lado del que se tiran las sombras largas
  const sol = g.createRadialGradient(W * 0.20, H * 0.66, 1, W * 0.20, H * 0.66, 26);
  sol.addColorStop(0, 'rgba(255,246,224,1)');
  sol.addColorStop(1, 'rgba(255,214,150,0)');
  g.fillStyle = sol;
  g.fillRect(0, 0, W, H);

  const cieloTex = recolectar(new THREE.CanvasTexture(c));
  cieloTex.mapping = THREE.EquirectangularReflectionMapping;
  cieloTex.colorSpace = THREE.SRGBColorSpace;

  const pmrem = new THREE.PMREMGenerator(renderer);
  const entorno = pmrem.fromEquirectangular(cieloTex).texture;
  pmrem.dispose();
  scene.environment = entorno;
  scene.environmentIntensity = 0.85;
  scene.background = cieloTex;

  // Sol: rasante, cálido. La luz baja es la que le saca textura al asfalto —
  // con el sol en el cenit el normal map no se ve y todo queda plano.
  const sunLight = new THREE.DirectionalLight(0xffd7a3, 2.9);
  sunLight.position.set(-13, 8.5, -5);
  sunLight.target.position.set(0, 0, 6);
  sunLight.castShadow = true;
  sunLight.shadow.mapSize.set(2048, 2048);
  const s = sunLight.shadow.camera;
  s.left = -16; s.right = 16; s.top = 16; s.bottom = -16;
  s.near = 1; s.far = 48;
  s.updateProjectionMatrix();
  sunLight.shadow.bias = -0.0005;
  sunLight.shadow.normalBias = 0.022;
  scene.add(sunLight, sunLight.target);

  const cielo = new THREE.HemisphereLight(0x9dc0e8, 0x4a4034, 0.55);
  scene.add(cielo);

  return { sunLight, cielo, entorno };
}

// ---------------------------------------------------------------------------
// Armado
// ---------------------------------------------------------------------------
/**
 * Construye la cancha completa dentro de `scene`.
 * Devuelve las referencias que van a necesitar los bloques siguientes (aro,
 * tablero, red) y un `dispose()` que libera TODO: geometrías, materiales y
 * texturas. Sin eso, abrir y cerrar el juego diez veces se come la VRAM.
 */
export function construirCancha(scene, renderer) {
  const basura = [];
  const recolectar = (x) => { basura.push(x); return x; };

  const raiz = new THREE.Group();
  raiz.name = 'cancha-barrio';
  scene.add(raiz);

  const rnd = dado(9317);

  // ── piso ─────────────────────────────────────────────────────────────────
  const color = asfaltoColor().clone();
  const normal = asfaltoNormal().clone();
  color.needsUpdate = true; normal.needsUpdate = true;
  const PISO_ANCHO = M.ANCHO + 5.5;
  const PISO_FONDO = M.FONDO + 6.5;
  color.repeat.set(PISO_ANCHO / ASFALTO_METROS, PISO_FONDO / ASFALTO_METROS);
  normal.repeat.copy(color.repeat);
  recolectar(color); recolectar(normal);

  const piso = new THREE.Mesh(
    recolectar(new THREE.PlaneGeometry(PISO_ANCHO, PISO_FONDO)),
    recolectar(new THREE.MeshStandardMaterial({
      map: color, normalMap: normal,
      normalScale: new THREE.Vector2(0.9, 0.9),
      roughness: 0.96, metalness: 0,
    })),
  );
  piso.rotation.x = -Math.PI / 2;
  piso.position.set(0, 0, M.FONDO / 2 - 1.2);
  piso.receiveShadow = true;
  raiz.add(piso);

  // ── manchas y parches sobre el asfalto ───────────────────────────────────
  // Es lo que rompe la repetición de la textura del piso. Sin esto se ve el
  // patrón de 4 m repetido y canta que es procedural.
  const manchaMat = recolectar(new THREE.MeshStandardMaterial({
    map: manchaAceite(), transparent: true, depthWrite: false,
    roughness: 0.75, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2,
  }));
  const parcheMat = recolectar(new THREE.MeshStandardMaterial({
    map: parcheAsfalto(), roughness: 0.9,
    polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1,
  }));
  for (let i = 0; i < 14; i++) {
    const esParche = i % 3 === 0;
    const tam = esParche ? 1.4 + rnd() * 2.6 : 0.7 + rnd() * 1.9;
    const g = recolectar(new THREE.PlaneGeometry(tam, tam * (0.6 + rnd() * 0.7)));
    const m = new THREE.Mesh(g, esParche ? parcheMat : manchaMat);
    m.rotation.x = -Math.PI / 2;
    m.rotation.z = rnd() * Math.PI;
    m.position.set(
      (rnd() - 0.5) * (M.ANCHO + 3),
      esParche ? 0.002 : 0.004,
      -1 + rnd() * (M.FONDO + 4),
    );
    raiz.add(m);
  }

  // ── líneas ───────────────────────────────────────────────────────────────
  const gastada = pinturaGastada();
  const lineas = new THREE.Mesh(
    recolectar(construirLineas()),
    recolectar(new THREE.MeshStandardMaterial({
      color: 0xe9e5da, roughness: 0.88, metalness: 0,
      alphaMap: gastada, transparent: false, alphaTest: 0.34,
      polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3,
    })),
  );
  lineas.name = 'lineas';
  raiz.add(lineas);

  // ── canasta, alambrado, entorno ──────────────────────────────────────────
  const canasta = construirCanasta(recolectar);
  raiz.add(canasta.grupo);
  raiz.add(construirAlambrado(recolectar));
  raiz.add(construirEntorno(recolectar));

  const luces = cieloYLuces(scene, renderer, recolectar);

  return {
    raiz,
    aro: canasta.aro,
    tablero: canasta.tablero,
    red: canasta.red,
    ...luces,
    // Punto exacto del centro del aro: lo va a necesitar el bloque del tiro.
    centroAro: new THREE.Vector3(0, M.ARO_ALTURA, ARO_Z),
    dispose() {
      scene.remove(raiz);
      scene.remove(luces.sunLight, luces.sunLight.target, luces.cielo);
      scene.environment = null;
      scene.background = null;
      raiz.traverse((o) => { if (o.isMesh) o.geometry = null; });
      for (const x of basura) x.dispose?.();
      basura.length = 0;
    },
  };
}
