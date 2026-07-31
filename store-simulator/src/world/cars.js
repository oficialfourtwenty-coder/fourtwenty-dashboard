// Los dos autos estacionados en la calle Burela: el Volkswagen up! Pepper TSI
// de Luca y el Toyota Corolla 2019 de Fer. Además de easter egg, son LA RADIO
// del simulador: te subís, elegís tema y sigue sonando mientras recorrés todo.
//
// Cómo están hechos: la silueta sale de un PERFIL LATERAL 2D extruido a lo
// ancho (no cajas apiladas), así cada modelo tiene su forma real — el up! con
// capó cortísimo, techo alto y portón casi vertical; el Corolla con capó largo
// y baúl de 3 volúmenes. Encima van ruedas, vidrios, luces, espejos, patente
// Mercosur e interior (butacas, tablero, volante y la radio clickeable).
//
// ⚠️ MODELO REEMPLAZABLE: si existe public/assets/cars/<id>.glb, se carga ese
// modelo real y la carrocería procedural se esconde sola (las ruedas, vidrios
// e interior también). Toda la lógica —puerta, asiento, radio— es la misma.
// O sea: cuando generes los autos de verdad desde fotos (igual que hiciste con
// BOB), los tirás en esa carpeta y quedan idénticos sin tocar una línea de acá.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { normalizeGLTFHeight } from './gltfUtils.js';

// ---- Especificación de cada auto -------------------------------------------
// ⚠️ COLOR Y PATENTE: cambialos acá si no coinciden con los autos reales.
// Es una línea por dato, no hace falta tocar nada más.
const CAR_SPECS = [
  {
    id: 'car-up-luca',
    owner: 'Luca',
    model: 'Volkswagen up! Pepper TSI',
    playlist: 'luca',
    radioLabel: 'BEATS DE LUCA',
    interiorView: {
      image: 'assets/cars/interiors/pepper-luca.jpg',
      width: 1448,
      height: 1086,
      radio: { x: 575, y: 475, width: 285, height: 185 },
    },
    // medidas reales del up! (m)
    length: 3.60, width: 1.65, height: 1.50, wheelbase: 2.42,
    bodyColor: 0x3C4046,      // gris oscuro (auto real de Luca)
    roofColor: 0x3C4046,      // mismo color que la carrocería
    rimColor: 0xE6E6E2,       // llantas BLANCAS
    mirrorColor: 0x2A2D31,    // espejos al tono, oscuros
    plate: 'AE 902 KT',
    // perfil lateral: [x a lo largo, y altura] — hatchback de 3 puertas
    profile: [
      [0.00, 0.30], [0.03, 0.56], [0.20, 0.67], [0.60, 0.78], [0.80, 0.83],
      [1.28, 1.40], [2.60, 1.50], [2.96, 1.45], [3.28, 0.88], [3.50, 0.60],
      [3.56, 0.30],
    ],
    // ventanas laterales (x0, x1) del perfil
    sideGlass: [[1.32, 2.05], [2.14, 2.86]],
    // índices del perfil: base→techo del parabrisas, y techo→base de la luneta.
    // ⚠️ explícitos a propósito: buscarlos por "el punto más alto" agarraba el
    // fondo del techo y estiraba el vidrio sobre toda la cabina.
    windshieldIdx: [4, 5],
    rearGlassIdx: [7, 8],
    seat: [-0.05, 0.62, -0.34],   // butaca del lado de la vereda
    radio: [0.62, 0.78, 0.00],    // en el tablero
    wheelRadius: 0.29, wheelWidth: 0.19,
  },
  {
    id: 'car-corolla-fer',
    owner: 'Fer',
    model: 'Toyota Corolla 2019 SLINE',
    playlist: 'fer',
    radioLabel: 'ARTISTAS FOURTWENTY',
    interiorView: {
      image: 'assets/cars/interiors/corolla-fer.jpg',
      width: 1448,
      height: 1086,
      radio: { x: 475, y: 630, width: 290, height: 185 },
    },
    // medidas reales del Corolla (m)
    length: 4.62, width: 1.78, height: 1.44, wheelbase: 2.70,
    bodyColor: 0xF0F0EA,      // BLANCO (auto real de Fer)
    roofColor: 0xF0F0EA,
    rimColor: 0x17181A,       // llantas NEGRAS
    mirrorColor: 0x17181A,    // espejos laterales NEGROS
    plate: 'AC 471 ND',
    // perfil lateral: sedán de 3 volúmenes (capó largo + baúl)
    profile: [
      [0.00, 0.26], [0.05, 0.52], [0.32, 0.62], [1.02, 0.76], [1.30, 0.81],
      [2.02, 1.38], [3.02, 1.44], [3.60, 1.12], [3.98, 0.94], [4.42, 0.91],
      [4.52, 0.56], [4.58, 0.26],
    ],
    sideGlass: [[2.06, 2.78], [2.86, 3.52]],
    windshieldIdx: [4, 5],
    rearGlassIdx: [6, 7],
    seat: [0.10, 0.58, -0.36],
    radio: [0.92, 0.74, 0.00],
    wheelRadius: 0.32, wheelWidth: 0.21,
  },
];

// Dónde quedan estacionados: la calzada arranca en z=6 y el cordón está en
// z=7.4, así que z≈9 los deja sobre el asfalto, paralelos al cordón, con el
// lado de la vereda (-Z) hacia el jugador.
const PARKING = {
  'car-up-luca': { x: -7.2, z: 9.05, rotationY: 0 },
  'car-corolla-fer': { x: 6.4, z: 9.05, rotationY: 0 },
};

const DOOR_OPEN_ANGLE = -Math.PI * 0.34; // hacia afuera, lado vereda

function plateTexture(text) {
  const canvas = document.createElement('canvas');
  canvas.width = 256; canvas.height = 96;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#f2f2ee'; ctx.fillRect(0, 0, 256, 96);
  ctx.fillStyle = '#12318f'; ctx.fillRect(0, 0, 256, 22); // franja Mercosur
  ctx.fillStyle = '#f2d417'; ctx.font = '700 12px sans-serif';
  ctx.textAlign = 'center'; ctx.fillText('MERCOSUR', 128, 16);
  ctx.fillStyle = '#111'; ctx.font = '700 46px "Arial Narrow", sans-serif';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 128, 60);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

function bodyGeometry(spec) {
  const shape = new THREE.Shape();
  const pts = spec.profile;
  shape.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) shape.lineTo(pts[i][0], pts[i][1]);
  shape.lineTo(pts[pts.length - 1][0], 0.30);
  shape.lineTo(pts[0][0], 0.30);
  shape.closePath();

  const bevel = 0.055;
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: spec.width - bevel * 2,
    bevelEnabled: true,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelSegments: 3,
    curveSegments: 6,
  });
  // centrar: largo sobre X, ancho sobre Z, apoyado en y=0
  geo.rotateY(0);
  geo.translate(-spec.length / 2, 0, -(spec.width - bevel * 2) / 2);
  geo.computeVertexNormals();
  return geo;
}

function wheel(spec, x, z, rimMat, tyreMat) {
  const group = new THREE.Group();
  const tyre = new THREE.Mesh(
    new THREE.CylinderGeometry(spec.wheelRadius, spec.wheelRadius, spec.wheelWidth, 22),
    tyreMat,
  );
  tyre.rotation.x = Math.PI / 2;
  group.add(tyre);

  const rim = new THREE.Mesh(
    new THREE.CylinderGeometry(spec.wheelRadius * 0.62, spec.wheelRadius * 0.62, spec.wheelWidth + 0.012, 20),
    rimMat,
  );
  rim.rotation.x = Math.PI / 2;
  group.add(rim);

  // rayos de la llanta
  for (let i = 0; i < 5; i++) {
    const spoke = new THREE.Mesh(
      new THREE.BoxGeometry(spec.wheelRadius * 1.05, 0.055, spec.wheelWidth * 0.5),
      rimMat,
    );
    spoke.rotation.z = (i / 5) * Math.PI;
    group.add(spoke);
  }

  group.position.set(x, spec.wheelRadius, z);
  group.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  return group;
}

function buildInterior(spec, group, materials, refs) {
  const { seatMat, darkMat, glassMat } = materials;
  const halfW = spec.width / 2;
  const cabinX = spec.seat[0];

  // tablero, de lado a lado
  const dash = new THREE.Mesh(
    new THREE.BoxGeometry(0.34, 0.24, spec.width - 0.24),
    darkMat,
  );
  dash.position.set(spec.radio[0], spec.radio[1] - 0.02, 0);
  group.add(dash);

  // butacas (la del lado vereda es donde aparece BOB)
  for (const side of [-1, 1]) {
    const base = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.12, 0.44), seatMat);
    base.position.set(cabinX, 0.52, side * halfW * 0.42);
    group.add(base);
    const backrest = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.56, 0.44), seatMat);
    backrest.position.set(cabinX - 0.28, 0.80, side * halfW * 0.42);
    group.add(backrest);
  }

  // volante del lado del conductor (izquierda = +Z en este sistema)
  const wheelRing = new THREE.Mesh(new THREE.TorusGeometry(0.15, 0.022, 8, 20), darkMat);
  wheelRing.position.set(spec.radio[0] - 0.22, spec.radio[1] + 0.10, halfW * 0.42);
  wheelRing.rotation.y = Math.PI / 2;
  wheelRing.rotation.x = -0.35;
  group.add(wheelRing);

  // ⭐ LA RADIO: es lo clickeable de adentro del auto
  const radioBody = new THREE.Mesh(new THREE.BoxGeometry(0.10, 0.13, 0.26), darkMat);
  radioBody.position.set(spec.radio[0] - 0.13, spec.radio[1] + 0.02, spec.radio[2]);
  group.add(radioBody);

  const screenMat = new THREE.MeshStandardMaterial({
    color: 0x0d1a12, emissive: 0x39ff6a, emissiveIntensity: 0.85, roughness: 0.4,
  });
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(0.20, 0.085), screenMat);
  screen.position.set(spec.radio[0] - 0.185, spec.radio[1] + 0.03, spec.radio[2]);
  screen.rotation.y = -Math.PI / 2;
  screen.name = `${spec.id} · radio`;
  screen.userData.carRadio = spec.id;
  group.add(screen);

  refs.radioMesh = screen;
  refs.radioScreenMat = screenMat;

  // parasoles: dan volumen al interior visto desde afuera
  const visor = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.02, spec.width - 0.4), darkMat);
  visor.position.set(cabinX - 0.05, spec.height - 0.16, 0);
  group.add(visor);

  void glassMat;
}

function buildCar(spec) {
  const root = new THREE.Group();
  root.name = `${spec.model} (${spec.owner})`;
  root.userData.car = spec.id;

  // Pintura de auto: metalness BAJO + clearcoat. Con metalness alto la
  // carrocería se comporta como un espejo, refleja el RoomEnvironment y el
  // bloom la convierte en un manchón blanco (se veía como cromo, no como
  // pintura). El brillo real de un auto viene del clearcoat, no del metal.
  const paint = new THREE.MeshPhysicalMaterial({
    color: spec.bodyColor,
    metalness: 0.05,
    roughness: 0.42,
    clearcoat: 0.7,
    clearcoatRoughness: 0.18,
  });
  const roofPaint = new THREE.MeshPhysicalMaterial({
    color: spec.roofColor, metalness: 0.05, roughness: 0.45, clearcoat: 0.6, clearcoatRoughness: 0.2,
  });
  const glassMat = new THREE.MeshPhysicalMaterial({
    color: 0x16191c, metalness: 0.1, roughness: 0.08,
    transparent: true, opacity: 0.62, clearcoat: 1,
  });
  const darkMat = new THREE.MeshStandardMaterial({ color: 0x191b1d, roughness: 0.65, metalness: 0.25 });
  const tyreMat = new THREE.MeshStandardMaterial({ color: 0x121213, roughness: 0.95 });
  const rimMat = new THREE.MeshStandardMaterial({ color: spec.rimColor, metalness: 0.85, roughness: 0.3 });
  const seatMat = new THREE.MeshStandardMaterial({ color: 0x24262a, roughness: 0.88 });
  const chromeMat = new THREE.MeshStandardMaterial({ color: 0xc4c8cc, metalness: 0.95, roughness: 0.18 });

  const refs = {};
  const halfL = spec.length / 2;
  const halfW = spec.width / 2;

  // carrocería (perfil extruido) — es lo que se esconde si llega el GLB real
  const proceduralBody = new THREE.Group();
  proceduralBody.name = `${spec.id} · carroceria procedural`;

  const body = new THREE.Mesh(bodyGeometry(spec), paint);
  body.name = `${spec.model} · carroceria`;
  proceduralBody.add(body);

  // techo pintado aparte (el up! Pepper lo tiene negro)
  if (spec.roofColor !== spec.bodyColor) {
    const roofStart = spec.profile.find((p) => p[1] >= spec.height - 0.06);
    const roofX = roofStart ? roofStart[0] : spec.length * 0.5;
    const roof = new THREE.Mesh(
      new THREE.BoxGeometry(spec.length * 0.42, 0.035, spec.width - 0.14),
      roofPaint,
    );
    roof.position.set(-halfL + roofX + spec.length * 0.16, spec.height - 0.005, 0);
    proceduralBody.add(roof);
  }

  // vidrios: parabrisas, luneta y las ventanas laterales del spec
  const glassInset = halfW - 0.012;
  for (const side of [-1, 1]) {
    for (const [gx0, gx1] of spec.sideGlass) {
      const w = gx1 - gx0;
      const pane = new THREE.Mesh(new THREE.PlaneGeometry(w, 0.44), glassMat);
      pane.position.set(-halfL + (gx0 + gx1) / 2, spec.height - 0.31, side * glassInset);
      pane.rotation.y = side > 0 ? 0 : Math.PI;
      proceduralBody.add(pane);
    }
  }
  // parabrisas y luneta: se arman entre dos puntos EXPLÍCITOS del perfil, así
  // el vidrio sigue la inclinación real y no se pasa de largo sobre el techo.
  const profile = spec.profile;
  const cowl = profile[spec.windshieldIdx[0]];

  // ⚠️ La rotación va sobre la GEOMETRÍA, no sobre el objeto: combinando dos
  // rotaciones Euler en el mesh, el orden XYZ inclinaba el eje ancho del vidrio
  // y la caja de colisión del auto salía 40cm más alta de lo real.
  function rakedGlass(from, to, name) {
    const dx = to[0] - from[0];
    const dy = to[1] - from[1];
    const geo = new THREE.PlaneGeometry(spec.width - 0.18, Math.hypot(dx, dy));
    geo.rotateY(Math.PI / 2);            // el ancho del panel pasa a ser el ancho del auto
    geo.rotateZ(-Math.atan2(dx, dy));    // y el alto sigue la inclinación real del vidrio
    geo.translate(-halfL + (from[0] + to[0]) / 2, (from[1] + to[1]) / 2, 0);
    const pane = new THREE.Mesh(geo, glassMat);
    pane.name = name;
    return pane;
  }

  proceduralBody.add(rakedGlass(
    profile[spec.windshieldIdx[0]], profile[spec.windshieldIdx[1]],
    `${spec.model} · parabrisas`,
  ));
  proceduralBody.add(rakedGlass(
    profile[spec.rearGlassIdx[0]], profile[spec.rearGlassIdx[1]],
    `${spec.model} · luneta`,
  ));

  // luces
  const headMat = new THREE.MeshStandardMaterial({
    color: 0xf3f6ef, emissive: 0xdfe6d8, emissiveIntensity: 0.35, roughness: 0.25,
  });
  const tailMat = new THREE.MeshStandardMaterial({
    color: 0x8d1418, emissive: 0xd0242c, emissiveIntensity: 0.55, roughness: 0.35,
  });
  for (const side of [-1, 1]) {
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.10, 0.13, 0.36), headMat);
    head.position.set(-halfL + 0.10, spec.profile[2][1] - 0.02, side * (halfW - 0.30));
    proceduralBody.add(head);

    const tail = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.16, 0.32), tailMat);
    tail.position.set(halfL - 0.08, spec.profile[spec.profile.length - 2][1] + 0.08, side * (halfW - 0.28));
    proceduralBody.add(tail);
  }

  // parrilla + paragolpes
  const grille = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.14, spec.width - 0.52), darkMat);
  grille.position.set(-halfL + 0.03, spec.profile[1][1] - 0.02, 0);
  proceduralBody.add(grille);
  const chromeBar = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.035, spec.width - 0.56), chromeMat);
  chromeBar.position.set(-halfL + 0.015, spec.profile[2][1] - 0.03, 0);
  proceduralBody.add(chromeBar);

  for (const [bx, by] of [[-halfL + 0.06, 0.42], [halfL - 0.06, 0.42]]) {
    const bumper = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.20, spec.width - 0.10), darkMat);
    bumper.position.set(bx, by, 0);
    proceduralBody.add(bumper);
  }

  // espejos y manijas
  const mirrorMat = new THREE.MeshStandardMaterial({
    color: spec.mirrorColor ?? 0x191b1d, roughness: 0.55, metalness: 0.2,
  });
  for (const side of [-1, 1]) {
    const mirror = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.07, 0.16), mirrorMat);
    mirror.position.set(-halfL + cowl[0] + 0.16, spec.height - 0.42, side * (halfW + 0.07));
    proceduralBody.add(mirror);
  }

  // zócalos laterales oscuros: cortan el "bloque" de color
  for (const side of [-1, 1]) {
    const skirt = new THREE.Mesh(new THREE.BoxGeometry(spec.length * 0.62, 0.10, 0.05), darkMat);
    skirt.position.set(0, 0.34, side * (halfW + 0.005));
    proceduralBody.add(skirt);
  }

  // patente atrás
  const plate = new THREE.Mesh(new THREE.PlaneGeometry(0.40, 0.15), new THREE.MeshBasicMaterial({ map: plateTexture(spec.plate) }));
  plate.position.set(halfL + 0.005, 0.50, 0);
  plate.rotation.y = Math.PI / 2;
  proceduralBody.add(plate);

  root.add(proceduralBody);

  // ---- puerta que se abre (lado vereda, -Z) --------------------------------
  // pivote adelante para que gire como una puerta real
  const doorPivot = new THREE.Group();
  doorPivot.name = `${spec.id} · pivote puerta`;
  const doorX0 = -halfL + cowl[0] + 0.10;
  const doorLen = Math.min(spec.length * 0.30, 1.15);
  doorPivot.position.set(doorX0, 0, -halfW + 0.02);

  const doorPanel = new THREE.Mesh(
    new THREE.BoxGeometry(doorLen, 0.62, 0.07),
    paint,
  );
  doorPanel.name = `${spec.model} · puerta`;
  doorPanel.position.set(doorLen / 2, 0.62, 0);
  doorPivot.add(doorPanel);

  const doorGlass = new THREE.Mesh(new THREE.PlaneGeometry(doorLen - 0.12, 0.40), glassMat);
  doorGlass.position.set(doorLen / 2, 1.13, 0.0);
  doorPivot.add(doorGlass);

  const doorFrame = new THREE.Mesh(new THREE.BoxGeometry(doorLen, 0.05, 0.06), darkMat);
  doorFrame.position.set(doorLen / 2, 0.93, 0);
  doorPivot.add(doorFrame);

  const handle = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.035, 0.04), chromeMat);
  handle.position.set(doorLen * 0.78, 0.80, -0.05);
  doorPivot.add(handle);

  proceduralBody.add(doorPivot);
  refs.doorPivot = doorPivot;

  // interior
  buildInterior(spec, proceduralBody, { seatMat, darkMat, glassMat }, refs);

  // ruedas
  const axleF = -halfL + cowl[0] - 0.18;
  const axleR = axleF + spec.wheelbase;
  const wheels = new THREE.Group();
  wheels.name = `${spec.id} · ruedas`;
  for (const wx of [axleF, axleR]) {
    for (const side of [-1, 1]) {
      wheels.add(wheel(spec, wx, side * (halfW - spec.wheelWidth * 0.55), rimMat, tyreMat));
    }
  }
  proceduralBody.add(wheels);

  proceduralBody.traverse((o) => {
    if (o.isMesh && !o.material.transparent) { o.castShadow = true; o.receiveShadow = true; }
  });

  const parking = PARKING[spec.id] ?? { x: 0, z: 9, rotationY: 0 };
  root.position.set(parking.x, 0, parking.z);
  root.rotation.y = parking.rotationY;

  return { root, proceduralBody, refs, paint };
}

class Car {
  constructor(spec) {
    this.spec = spec;
    this.id = spec.id;
    this.owner = spec.owner;
    this.model = spec.model;
    this.playlist = spec.playlist;
    this.radioLabel = spec.radioLabel;
    this.interiorView = spec.interiorView;

    const built = buildCar(spec);
    this.root = built.root;
    this.proceduralBody = built.proceduralBody;
    this.doorPivot = built.refs.doorPivot;
    this.radioMesh = built.refs.radioMesh;
    this.radioScreenMat = built.refs.radioScreenMat;

    this.doorProgress = 0;
    this.doorTarget = 0;
    this._box = new THREE.Box3();
    this._colliders = [];
    this._local = new THREE.Vector3();
    this.interactionRevision = 0;

    this._tryLoadRealModel();
  }

  // Si el dueño deja un GLB real en public/assets/cars/<id>.glb, se usa ese y
  // la carrocería procedural desaparece. La puerta/asiento/radio siguen igual.
  _tryLoadRealModel() {
    new GLTFLoader().load(
      `assets/cars/${this.id}.glb`,
      (gltf) => {
        const model = gltf.scene;
        normalizeGLTFHeight(model, this.spec.height);
        model.name = `${this.model} · modelo real`;
        model.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
        this.root.add(model);
        this.realModel = model;
        this.interactionRevision += 1;
        // la radio del procedural sigue viva pero invisible: se usa solo como
        // punto de referencia, el click al auto entra igual.
        this.proceduralBody.visible = false;
        console.info(`[cars] modelo real cargado para ${this.id}`);
      },
      undefined,
      () => { /* sin GLB real: se queda el procedural, que es lo normal hoy */ },
    );
  }

  openDoor() { this.doorTarget = 1; }
  closeDoor() { this.doorTarget = 0; }

  setRadioActive(active) {
    if (!this.radioScreenMat) return;
    this.radioScreenMat.emissiveIntensity = active ? 2.6 : 0.85;
  }

  // Punto del asiento en coordenadas del mundo (donde aparece BOB).
  getSeatWorldPosition(target = new THREE.Vector3()) {
    this.root.updateWorldMatrix(true, false);
    return this.root.localToWorld(target.fromArray(this.spec.seat));
  }

  // Punto de bajada: al lado de la puerta, sobre la calzada.
  getExitWorldPosition(target = new THREE.Vector3()) {
    this.root.updateWorldMatrix(true, false);
    return this.root.localToWorld(
      target.set(this.spec.seat[0], 0, -this.spec.width / 2 - 1.15),
    );
  }

  getRadioWorldPosition(target = new THREE.Vector3()) {
    if (!this.radioMesh) return this.getSeatWorldPosition(target);
    return this.radioMesh.getWorldPosition(target);
  }

  distanceTo(position) {
    this.root.updateWorldMatrix(true, false);
    return this.root.position.distanceTo(position);
  }

  update(dt) {
    if (this.doorProgress !== this.doorTarget) {
      const speed = dt * 2.6;
      const delta = this.doorTarget - this.doorProgress;
      this.doorProgress += Math.sign(delta) * Math.min(Math.abs(delta), speed);
      const eased = this.doorProgress * this.doorProgress * (3 - 2 * this.doorProgress);
      if (this.doorPivot) this.doorPivot.rotation.y = DOOR_OPEN_ANGLE * eased;
    }
  }

  // Colisión: conserva las medidas funcionales del auto aunque el GLB incluya
  // geometría decorativa fuera de la carrocería.
  getColliders() {
    this.root.updateWorldMatrix(true, true);
    this._colliders.length = 0;
    this._box.setFromObject(this.proceduralBody);
    if (!this._box.isEmpty()) {
      this._colliders.push({
        minX: this._box.min.x, maxX: this._box.max.x,
        minY: 0, maxY: Math.max(this._box.max.y, 1.2),
        minZ: this._box.min.z, maxZ: this._box.max.z,
        source: this.root.name,
      });
    }
    return this._colliders;
  }
}

// Construye los dos autos y los agrega a la escena de la calle.
export function buildCars(scene) {
  const cars = CAR_SPECS.map((spec) => {
    const car = new Car(spec);
    scene.add(car.root);
    return car;
  });
  return cars;
}

export { CAR_SPECS };
