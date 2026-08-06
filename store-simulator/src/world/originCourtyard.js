// PATIO FOURTWENTY — el local de ORIGEN segun la referencia de Kusher.
//
// Un patio cuadrado de hormigon a cielo abierto: tres paredes, piso de cemento
// alisado, dos postes de luz con un travesaño del que cuelga el cartel
// iluminado, un barral largo contra la pared del fondo, el mostrador de madera,
// la mesa de exhibicion central sobre una alfombra persa y dos mesas laterales.
//
// POR QUE ABIERTO ARRIBA
// El techo lo pone la esfera 360 que ya trae cada piso (`addEditableHdriSphere`,
// se busca como ESFERA 360 en el editor). Cerrar el patio taparia justamente lo
// que Kusher quiere cargar a su gusto. Las paredes llegan a 4,2 m: alto para
// que el cielo domine, bajo para que no se lea como un pozo.
//
// MEDIDAS
// El patio es de 13 x 13 m libres. No es un numero decorativo: BOB mide 1,8 m y
// camina ~3 m/s, y con menos de 12 m el pasillo entre la mesa central y los
// muebles laterales queda en menos de un metro y se choca todo el tiempo. Con
// 13 quedan 2,4 m de circulacion a cada lado de la mesa.

import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { createDisplayTable, createFoldedStack } from './displayTable.js';
import { createHangingGarment } from './garments.js';

export const PATIO = Object.freeze({
  lado: 13,        // medida libre interior, de pared a pared
  alto: 4.2,       // alto de las paredes
  espesor: 0.3,
});

function nombrar(objeto, nombre, { collider = false } = {}) {
  objeto.name = nombre;
  if (collider) objeto.userData.editorCollider = true;
  return objeto;
}

// ---------------------------------------------------------------------------
// Cartel colgante iluminado
// ---------------------------------------------------------------------------

function texturaCartel(texto = 'fourtwenty') {
  const c = document.createElement('canvas');
  c.width = 1024; c.height = 256;
  const ctx = c.getContext('2d');
  // Crema calido, no blanco puro: un cartel retroiluminado real nunca es 255.
  ctx.fillStyle = '#f4efe2';
  ctx.fillRect(0, 0, 1024, 256);
  ctx.fillStyle = '#17171a';
  ctx.font = 'bold 150px Georgia, "Times New Roman", serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(texto, 512, 138);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

function crearCartelColgante(mats) {
  const grupo = new THREE.Group();
  grupo.name = 'Patio · cartel fourtwenty';

  const marco = nombrar(new THREE.Mesh(
    new THREE.BoxGeometry(2.6, 0.72, 0.12),
    mats.black ?? new THREE.MeshStandardMaterial({ color: 0x141416, roughness: 0.5 }),
  ), 'Patio · cartel marco');
  grupo.add(marco);

  // La cara va con MeshBasicMaterial: un cartel retroiluminado emite, no
  // recibe. Con material PBR quedaria gris cuando el sol pega de costado.
  for (const lado of [1, -1]) {
    const cara = new THREE.Mesh(
      new THREE.PlaneGeometry(2.36, 0.56),
      new THREE.MeshBasicMaterial({ map: texturaCartel(), toneMapped: false }),
    );
    cara.name = `Patio · cartel cara ${lado > 0 ? 'frente' : 'dorso'}`;
    cara.position.z = lado * 0.062;
    cara.rotation.y = lado > 0 ? 0 : Math.PI;
    grupo.add(cara);
  }

  // Las dos cadenas que lo cuelgan del travesaño.
  const cadenaMat = mats.wornSteel ?? mats.steel
    ?? new THREE.MeshStandardMaterial({ color: 0x3a3a3d, roughness: 0.6, metalness: 0.8 });
  for (const dx of [-0.85, 0.85]) {
    const cadena = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 1.5, 6), cadenaMat);
    cadena.position.set(dx, 0.36 + 0.75, 0);
    grupo.add(cadena);
  }

  const luz = new THREE.PointLight(0xffe9c4, 2.4, 6, 2);
  luz.position.set(0, -0.1, 0);
  grupo.add(luz);
  return grupo;
}

// ---------------------------------------------------------------------------
// Postes de luz con travesaño y cables
// ---------------------------------------------------------------------------

function crearPoste(mats, altura = 8.5) {
  const grupo = new THREE.Group();
  grupo.userData.editorCollider = true;

  const hormigon = mats.concrete ?? new THREE.MeshStandardMaterial({ color: 0x9d9a92, roughness: 0.95 });
  const metal = mats.wornSteel ?? mats.steel
    ?? new THREE.MeshStandardMaterial({ color: 0x4a4a4d, roughness: 0.6, metalness: 0.7 });

  // Poste de hormigon: apenas conico, como los de la calle de verdad.
  const palo = nombrar(new THREE.Mesh(
    new THREE.CylinderGeometry(0.16, 0.22, altura, 10), hormigon,
  ), 'Poste · palo');
  palo.position.y = altura / 2;
  palo.castShadow = true;
  grupo.add(palo);

  // Crucetas con aisladores arriba, que es lo que los hace leer como poste de
  // luz y no como columna.
  for (const [y, largo] of [[altura - 0.5, 1.7], [altura - 1.15, 1.4]]) {
    const cruceta = nombrar(new THREE.Mesh(new THREE.BoxGeometry(largo, 0.09, 0.09), metal), 'Poste · cruceta');
    cruceta.position.y = y;
    grupo.add(cruceta);
    for (const dx of [-largo / 2 + 0.15, 0, largo / 2 - 0.15]) {
      const aislador = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 0.14, 6), metal);
      aislador.position.set(dx, y + 0.11, 0);
      grupo.add(aislador);
    }
  }

  // Caja de electricidad: el detalle que mas ensucia y da escala.
  const caja = nombrar(new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.85, 0.3), metal), 'Poste · caja electrica');
  caja.position.set(0, 2.5, 0.24);
  caja.castShadow = true;
  grupo.add(caja);
  const tapa = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.2, 0.02), mats.black ?? metal);
  tapa.position.set(0, 2.75, 0.4);
  grupo.add(tapa);

  // Caño bajante por el costado del poste.
  const caño = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 4.2, 6), metal);
  caño.position.set(0.2, 2.1, 0.05);
  grupo.add(caño);

  return grupo;
}

/** Cable colgado entre dos puntos, con la catenaria real (la panza del medio). */
function crearCable(desde, hasta, caida = 0.55, material) {
  const puntos = [];
  const PASOS = 14;
  for (let i = 0; i <= PASOS; i++) {
    const t = i / PASOS;
    const x = desde.x + (hasta.x - desde.x) * t;
    const y = desde.y + (hasta.y - desde.y) * t - Math.sin(t * Math.PI) * caida;
    const z = desde.z + (hasta.z - desde.z) * t;
    puntos.push(new THREE.Vector3(x, y, z));
  }
  const curva = new THREE.CatmullRomCurve3(puntos);
  // Tubo y no linea: una LineSegments de 1 px no recibe luz y se ve como
  // alambre de wireframe, el mismo problema que tenian las perchas.
  const geo = new THREE.TubeGeometry(curva, 20, 0.018, 5, false);
  return new THREE.Mesh(geo, material);
}

// ---------------------------------------------------------------------------
// Mostrador
// ---------------------------------------------------------------------------

function crearMostrador(mats) {
  const grupo = new THREE.Group();
  grupo.name = 'Patio · mostrador';
  grupo.userData.editorCollider = true;

  const madera = mats.wood ?? new THREE.MeshStandardMaterial({ color: 0x5a3d28, roughness: 0.72 });
  const ancho = 3.4, alto = 1.05, fondo = 0.78;

  const cuerpo = nombrar(new THREE.Mesh(new THREE.BoxGeometry(ancho, alto, fondo), madera), 'Patio · mostrador cuerpo');
  cuerpo.position.y = alto / 2;
  cuerpo.castShadow = true;
  cuerpo.receiveShadow = true;
  grupo.add(cuerpo);

  const tapa = nombrar(new THREE.Mesh(new THREE.BoxGeometry(ancho + 0.1, 0.06, fondo + 0.1), madera), 'Patio · mostrador tapa');
  tapa.position.y = alto + 0.03;
  tapa.castShadow = true;
  grupo.add(tapa);

  // Placa de bronce con el nombre, como en la referencia.
  const c = document.createElement('canvas');
  c.width = 512; c.height = 96;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#3a2a1c'; ctx.fillRect(0, 0, 512, 96);
  ctx.fillStyle = '#c9a24a';
  ctx.font = 'bold 46px Georgia, serif';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText('fourtwenty', 256, 52);
  const placaTex = new THREE.CanvasTexture(c);
  placaTex.colorSpace = THREE.SRGBColorSpace;
  const placa = nombrar(new THREE.Mesh(
    new THREE.PlaneGeometry(1.05, 0.2),
    new THREE.MeshStandardMaterial({ map: placaTex, roughness: 0.45, metalness: 0.5 }),
  ), 'Patio · mostrador placa');
  placa.position.set(0, 0.62, fondo / 2 + 0.005);
  grupo.add(placa);

  // Lampara de escritorio verde: el punto de color calido de la referencia.
  const lampara = new THREE.Group();
  lampara.name = 'Patio · lampara de mostrador';
  const bronce = new THREE.MeshStandardMaterial({ color: 0xc9a24a, roughness: 0.35, metalness: 0.8 });
  const pie = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.09, 0.03, 12), bronce);
  lampara.add(pie);
  const vastago = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.3, 8), bronce);
  vastago.position.y = 0.16; lampara.add(vastago);
  const pantalla = new THREE.Mesh(
    new THREE.CylinderGeometry(0.17, 0.19, 0.1, 14, 1, true),
    new THREE.MeshStandardMaterial({ color: 0x1f5136, roughness: 0.5, side: THREE.DoubleSide }),
  );
  pantalla.position.y = 0.32; lampara.add(pantalla);
  const foco = new THREE.PointLight(0xffdda0, 2.2, 3.2, 2);
  foco.position.y = 0.27; lampara.add(foco);
  lampara.position.set(-1.15, alto + 0.06, 0);
  grupo.add(lampara);

  return grupo;
}

// ---------------------------------------------------------------------------
// Alfombra persa
// ---------------------------------------------------------------------------

function texturaAlfombra() {
  const S = 512;
  const c = document.createElement('canvas');
  c.width = S; c.height = S;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#6d2f26'; ctx.fillRect(0, 0, S, S);

  // Cenefas concentricas + rombos: no es una alfombra persa de verdad, pero a
  // la distancia a la que se pisa lee como una. Dibujar el motivo real seria
  // horas de canvas para pixeles que nadie mira de cerca.
  const bordes = [['#22303a', 0.04], ['#c9a24a', 0.075], ['#22303a', 0.11]];
  for (const [color, m] of bordes) {
    ctx.strokeStyle = color;
    ctx.lineWidth = S * 0.018;
    ctx.strokeRect(S * m, S * m, S * (1 - m * 2), S * (1 - m * 2));
  }
  ctx.fillStyle = '#22303a';
  for (let i = 0; i < 7; i++) {
    for (let j = 0; j < 9; j++) {
      const x = S * 0.18 + i * S * 0.105;
      const y = S * 0.16 + j * S * 0.083;
      ctx.beginPath();
      ctx.moveTo(x, y - 12); ctx.lineTo(x + 12, y); ctx.lineTo(x, y + 12); ctx.lineTo(x - 12, y);
      ctx.closePath(); ctx.fill();
    }
  }
  ctx.fillStyle = 'rgba(201,162,74,0.55)';
  for (let i = 0; i < 6; i++) {
    ctx.fillRect(S * 0.2 + i * S * 0.11, S * 0.47, S * 0.06, S * 0.06);
  }
  // Suciedad: sin esto se ve como un mantel nuevo, no como una alfombra usada.
  for (let i = 0; i < 900; i++) {
    ctx.fillStyle = `rgba(0,0,0,${Math.random() * 0.12})`;
    ctx.fillRect(Math.random() * S, Math.random() * S, 3, 3);
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

function crearAlfombra(ancho = 5.2, fondo = 4.2) {
  const alfombra = new THREE.Mesh(
    new THREE.PlaneGeometry(ancho, fondo),
    new THREE.MeshStandardMaterial({ map: texturaAlfombra(), roughness: 0.98, metalness: 0 }),
  );
  alfombra.name = 'Patio · alfombra persa';
  alfombra.rotation.x = -Math.PI / 2;
  // 1 cm sobre el piso: al ras pelea con el hormigon en el z-buffer y titila.
  alfombra.position.y = 0.01;
  alfombra.receiveShadow = true;
  return alfombra;
}

// ---------------------------------------------------------------------------
// Barral largo de pared con estante arriba
// ---------------------------------------------------------------------------

function crearBarralDePared(mats, {
  largo = 8.4,
  cantidad = 16,
  colores = [0x1c1c1e, 0xf0ece0, 0x2b3a52, 0x6d2f26, 0x1f5136, 0xc9b48a],
  nombre = 'Patio · barral de pared',
} = {}) {
  const grupo = new THREE.Group();
  grupo.name = nombre;

  const cromo = mats.steel ?? new THREE.MeshStandardMaterial({ color: 0xb9bcc2, roughness: 0.3, metalness: 0.85 });
  const madera = mats.wood ?? new THREE.MeshStandardMaterial({ color: 0x5a3d28, roughness: 0.72 });

  // Estante de madera arriba (en la referencia lleva las gorras).
  const estante = nombrar(new THREE.Mesh(new THREE.BoxGeometry(largo, 0.06, 0.34), madera), `${nombre} · estante`);
  estante.position.y = 2.32;
  estante.castShadow = true;
  estante.receiveShadow = true;
  grupo.add(estante);

  for (const dx of [-largo / 2 + 0.4, 0, largo / 2 - 0.4]) {
    const mensula = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.28, 0.3), cromo);
    mensula.position.set(dx, 2.16, 0.02);
    grupo.add(mensula);
  }

  const barral = nombrar(new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, largo, 10), cromo), `${nombre} · caño`);
  barral.rotation.z = Math.PI / 2;
  barral.position.y = 1.98;
  grupo.add(barral);

  const paso = (largo - 0.5) / (cantidad - 1);
  for (let i = 0; i < cantidad; i++) {
    const { group: prenda } = createHangingGarment({
      color: colores[i % colores.length],
      type: i % 4 === 0 ? 'hoodie' : 'tee',
      hangerMaterial: cromo,
      variacion: i,
    });
    prenda.name = `${nombre} · prenda ${i + 1}`;
    prenda.position.set(-largo / 2 + 0.25 + i * paso, 1.93, 0);
    // Colgadas casi al ras de la pared, apenas abiertas — es lo que hace que
    // se lean como un perchero lleno y no como prendas sueltas.
    prenda.rotation.y = Math.PI / 2 + Math.sin(i * 2.7) * 0.09;
    prenda.scale.setScalar(0.94);
    grupo.add(prenda);
  }

  return grupo;
}

// ---------------------------------------------------------------------------
// Mesa lateral baja con ropa doblada
// ---------------------------------------------------------------------------

function crearMesaLateral(mats, { largo = 3.2, nombre = 'Patio · mesa lateral' } = {}) {
  const grupo = new THREE.Group();
  grupo.name = nombre;
  grupo.userData.editorCollider = true;

  const madera = mats.wood ?? new THREE.MeshStandardMaterial({ color: 0x5a3d28, roughness: 0.72 });
  const fondo = 0.85, alto = 0.82;

  for (const [y, ancho, prof] of [[alto, largo, fondo], [0.42, largo - 0.18, fondo - 0.1], [0.12, largo - 0.18, fondo - 0.1]]) {
    const tabla = new THREE.Mesh(new THREE.BoxGeometry(ancho, 0.05, prof), madera);
    tabla.position.y = y;
    tabla.castShadow = true;
    tabla.receiveShadow = true;
    grupo.add(tabla);
  }
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      const pata = new THREE.Mesh(new THREE.BoxGeometry(0.09, alto, 0.09), madera);
      pata.position.set(sx * (largo / 2 - 0.09), alto / 2, sz * (fondo / 2 - 0.09));
      grupo.add(pata);
    }
  }

  // Pilas de ropa doblada en los tres niveles.
  const colores = [0x1c1c1e, 0xf0ece0, 0x2b3a52, 0x4a4a44];
  let n = 0;
  for (const [y, cuantas] of [[alto + 0.025, 3], [0.445, 3], [0.145, 2]]) {
    for (let i = 0; i < cuantas; i++) {
      const pila = createFoldedStack({
        color: colores[n % colores.length],
        cantidad: 2 + (n % 3),
        material: mats.fabric,
        nombre: `${nombre} · pila ${n + 1}`,
      });
      pila.position.set((i - (cuantas - 1) / 2) * 0.92, y, 0);
      pila.rotation.y = Math.sin(n * 4.1) * 0.05;
      grupo.add(pila);
      n++;
    }
  }
  return grupo;
}

// ---------------------------------------------------------------------------
// El patio entero
// ---------------------------------------------------------------------------

export function buildOriginCourtyard(root, mats, theme) {
  const patio = new THREE.Group();
  patio.name = 'Patio FOURTWENTY';
  const L = PATIO.lado;
  const H = PATIO.alto;
  const E = PATIO.espesor;

  const hormigon = mats.concrete ?? new THREE.MeshStandardMaterial({ color: 0x9d9a92, roughness: 0.95 });
  const hormigonPiso = mats.concreteDark ?? hormigon;
  const metal = mats.wornSteel ?? mats.steel
    ?? new THREE.MeshStandardMaterial({ color: 0x4a4a4d, roughness: 0.6, metalness: 0.7 });

  // ---- piso ----
  const piso = nombrar(new THREE.Mesh(new THREE.PlaneGeometry(L, L), hormigonPiso), 'Patio · piso de cemento');
  piso.rotation.x = -Math.PI / 2;
  piso.receiveShadow = true;
  patio.add(piso);

  // ---- tres paredes (la cuarta queda abierta: por ahi se entra) ----
  const paredes = [
    { nombre: 'fondo', ancho: L + E * 2, x: 0, z: -L / 2 - E / 2, rot: 0 },
    { nombre: 'izquierda', ancho: L, x: -L / 2 - E / 2, z: 0, rot: Math.PI / 2 },
    { nombre: 'derecha', ancho: L, x: L / 2 + E / 2, z: 0, rot: Math.PI / 2 },
  ];
  for (const p of paredes) {
    const pared = nombrar(new THREE.Mesh(new THREE.BoxGeometry(p.ancho, H, E), hormigon),
      `Patio · pared ${p.nombre}`, { collider: true });
    pared.position.set(p.x, H / 2, p.z);
    pared.rotation.y = p.rot;
    pared.castShadow = true;
    pared.receiveShadow = true;
    patio.add(pared);
  }

  // ---- postes y travesaño ----
  const separacionPostes = L * 0.72;
  const alturaTravesaño = 6.4;
  for (const sx of [-1, 1]) {
    const poste = crearPoste(mats);
    poste.name = `Patio · poste ${sx < 0 ? 'izquierdo' : 'derecho'}`;
    poste.position.set(sx * separacionPostes / 2, 0, -L / 2 + 1.6);
    patio.add(poste);
  }
  const travesaño = nombrar(new THREE.Mesh(
    new THREE.CylinderGeometry(0.05, 0.05, separacionPostes, 8), metal,
  ), 'Patio · travesaño');
  travesaño.rotation.z = Math.PI / 2;
  travesaño.position.set(0, alturaTravesaño, -L / 2 + 1.6);
  patio.add(travesaño);

  // Cables entre postes, con la panza de la catenaria a distintas alturas.
  const cables = new THREE.Group();
  cables.name = 'Patio · cables';
  for (const [dy, caida] of [[1.6, 0.5], [1.95, 0.68], [2.3, 0.42]]) {
    cables.add(crearCable(
      new THREE.Vector3(-separacionPostes / 2, alturaTravesaño + dy, -L / 2 + 1.6),
      new THREE.Vector3(separacionPostes / 2, alturaTravesaño + dy, -L / 2 + 1.6),
      caida, metal,
    ));
  }
  patio.add(cables);

  // ---- cartel colgante ----
  const cartel = crearCartelColgante(mats);
  cartel.position.set(0, alturaTravesaño - 1.5, -L / 2 + 1.6);
  patio.add(cartel);

  // ---- barral largo del fondo + laterales ----
  const barralFondo = crearBarralDePared(mats, { largo: 8.4, cantidad: 16, nombre: 'Patio · barral del fondo' });
  barralFondo.position.set(0, 0, -L / 2 + 0.35);
  patio.add(barralFondo);

  for (const sx of [-1, 1]) {
    const lateral = crearBarralDePared(mats, {
      largo: 4.2, cantidad: 8,
      nombre: `Patio · barral ${sx < 0 ? 'izquierdo' : 'derecho'}`,
    });
    lateral.position.set(sx * (L / 2 - 0.35), 0, -1.4);
    lateral.rotation.y = sx < 0 ? Math.PI / 2 : -Math.PI / 2;
    patio.add(lateral);
  }

  // ---- mostrador contra el fondo ----
  const mostrador = crearMostrador(mats);
  mostrador.position.set(0, 0, -L / 2 + 2.3);
  patio.add(mostrador);

  // ---- alfombra + mesa central ----
  const alfombra = crearAlfombra(5.4, 4.4);
  alfombra.position.set(0, 0.01, 1.6);
  patio.add(alfombra);

  // ---- mesas laterales ----
  for (const sx of [-1, 1]) {
    const mesa = crearMesaLateral(mats, { nombre: `Patio · mesa ${sx < 0 ? 'izquierda' : 'derecha'}` });
    mesa.position.set(sx * (L / 2 - 1.5), 0, 0.4);
    mesa.rotation.y = sx < 0 ? Math.PI / 2 : -Math.PI / 2;
    patio.add(mesa);
  }

  root.add(patio);
  return {
    patio,
    // Donde va la mesa de exhibicion central, sobre la alfombra. Se devuelve
    // para que quien arme las 12 remeras no tenga que adivinar el numero.
    centroMesa: new THREE.Vector3(0, 0, 1.6),
  };
}
