// CONSTRUCTOR DE PIEZAS — modelar a mano desde adentro del juego.
//
// POR QUE EXISTE
// Las prendas, los muebles y los objetos del mundo los venia generando yo con
// formulas parametricas. Una formula no tiene ojo: sale siempre geometrica y
// nunca termina de parecerse a una prenda real. Kusher SI tiene ese ojo, pero
// no tenia con que armar nada: el editor solo dejaba duplicar cosas que ya
// existian o traer un GLB del catalogo.
//
// Aca puede crear piezas desde cero (caja, cilindro, plano, esfera, tubo),
// acomodarlas con los controles que ya conoce (1 mover, 2 rotar, 3 escalar por
// eje), pegarles una imagen como textura, agruparlas en un objeto y —cuando
// termino— fusionarlas en una sola malla.
//
// Es el mismo criterio que la caja de GTA San Andreas: la geometria es simple y
// lo que la hace ver bien es la textura. Con eso Kusher llega mas lejos armando
// a mano que yo generando con formulas.

import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { getEditableById, registerEditableObject, unregisterEditableObject } from './editableRegistry.js';

export const PIEZAS = Object.freeze({
  caja: { nombre: 'Caja', crear: () => new THREE.BoxGeometry(0.5, 0.5, 0.5) },
  plano: { nombre: 'Plano', crear: () => new THREE.PlaneGeometry(0.5, 0.5) },
  // 12 lados y no 32: a la distancia a la que se mira un objeto de tienda no se
  // nota, y una prenda armada con 20 cilindros de 32 lados se va a 15.000
  // triangulos sin que se vea mejor.
  cilindro: { nombre: 'Cilindro', crear: () => new THREE.CylinderGeometry(0.2, 0.2, 0.6, 12) },
  esfera: { nombre: 'Esfera', crear: () => new THREE.SphereGeometry(0.25, 14, 10) },
  tubo: { nombre: 'Tubo', crear: () => new THREE.CylinderGeometry(0.03, 0.03, 1.2, 8) },
  // Cono truncado: sirve de manga, de pierna y de ruedo, que es lo que mas
  // falta al armar ropa a mano con cajas.
  manga: { nombre: 'Manga / cono', crear: () => new THREE.CylinderGeometry(0.12, 0.09, 0.4, 12, 1, true) },
  // ESFERA 360 para Burela. Los pisos ya tenian la suya (`addEditableHdriSphere`
  // en bincoShopTrial.js), pero esa se construye con el piso y vive atada a el;
  // Burela no tenia forma de ponerle una.
  // Va aca y no como modelo del catalogo porque el catalogo son archivos GLB, y
  // asi hereda gratis lo que ya funciona: se agarra con `T`, se mueve, rota y
  // escala, se le sube una imagen, y `restorePieces` la reconstruye al refrescar.
  // `fondo: true` la marca como telon: ver `createPiece`.
  esfera360: {
    nombre: 'ESFERA 360',
    fondo: true,
    // Radio 100: mas afuera que todo lo que hay en Burela (los edificios de
    // Kenney llegan a z=-58). Si queda grande se achica con la tecla 3.
    // 48x24 y no 64x32: es una superficie lisa que se mira de lejos.
    crear: () => new THREE.SphereGeometry(100, 48, 24),
  },
});

const texturaCache = new Map();

function texturaDesde(dataUrl) {
  if (!dataUrl) return null;
  const cacheada = texturaCache.get(dataUrl);
  if (cacheada) return cacheada;
  const texture = new THREE.TextureLoader().load(dataUrl);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  texturaCache.set(dataUrl, texture);
  return texture;
}

// Telon de fondo: se mira DESDE ADENTRO, no lo toca la luz y no entra en el
// ciclo de dia/noche. Basic y no Standard a proposito — una foto 360 ya trae su
// propia iluminacion pintada, sombrearla otra vez la ensucia.
function materialDeFondo({ color = 0x9fb3c4, textura = null } = {}) {
  return new THREE.MeshBasicMaterial({
    color: textura ? 0xffffff : color,
    map: texturaDesde(textura),
    side: THREE.BackSide,
    fog: false,
    depthWrite: false,
    toneMapped: true,
  });
}

function materialDePieza({ color = 0xb9b3a6, textura = null } = {}) {
  return new THREE.MeshStandardMaterial({
    color,
    map: texturaDesde(textura),
    roughness: 0.85,
    metalness: 0,
    // Recorta el fondo transparente de una textura sin meter la pieza en la
    // cola de transparentes, que se ordena mal contra la geometria del mundo.
    alphaTest: 0.02,
    // Una pieza suelta se mira de los dos lados mientras se la acomoda: con
    // FrontSide desaparece al pasar la camara detras y parece que se borro.
    side: THREE.DoubleSide,
  });
}

let contador = 0;

function idDePieza(tipo) {
  contador += 1;
  return `pieza:${tipo}-${Date.now().toString(36)}-${contador}`;
}

/**
 * Crea una pieza nueva y la registra como objeto editable.
 * `datos.piece` es lo que permite volver a crearla al recargar la pagina: el
 * layout guarda posicion y escala de todo, pero una pieza inventada no existe
 * en ninguna escena hasta que alguien la vuelve a construir.
 */
export function createPiece(scene, tipo, {
  position = [0, 1, 0],
  rotation = [0, 0, 0],
  scale = [1, 1, 1],
  id = null,
  name = null,
  color = 0xb9b3a6,
  textura = null,
  visible = true,
} = {}) {
  const preset = PIEZAS[tipo];
  if (!preset || !scene) return null;

  const esFondo = preset.fondo === true;
  const mesh = new THREE.Mesh(
    preset.crear(),
    esFondo ? materialDeFondo({ color, textura }) : materialDePieza({ color, textura }),
  );
  mesh.name = name ?? (esFondo ? preset.nombre : `${preset.nombre} ${contador + 1}`);
  mesh.position.fromArray(position);
  mesh.rotation.set(rotation[0], rotation[1], rotation[2]);
  mesh.scale.fromArray(scale);
  mesh.visible = visible;
  // ⚠️ El telon NO proyecta ni recibe sombra, NO genera colision y se dibuja
  // primero. Sin `editorCollider = false` BOB choca contra el cielo; sin
  // `renderOrder` tapa la escena; sin `frustumCulled = false` desaparece al
  // mirar hacia afuera del centro.
  mesh.castShadow = !esFondo;
  mesh.receiveShadow = !esFondo;
  mesh.userData.editorCollider = !esFondo;
  if (esFondo) {
    mesh.renderOrder = -100;
    mesh.frustumCulled = false;
    mesh.userData.skipShadow = true;
    mesh.userData.editorHint = 'Tecla 3 para agrandar o achicar · tecla 2 para girarla · el boton IMAGEN le pone tu foto 360';
  }
  scene.add(mesh);

  const entryId = id ?? idDePieza(tipo);
  const entry = registerEditableObject({
    id: entryId,
    name: mesh.name,
    type: 'pieza',
    object3D: mesh,
    position, rotation, scale,
    castShadow: true,
    receiveShadow: true,
    locked: false,
    visible,
    // Marca de reconstruccion: sin esto la pieza desaparece al refrescar.
    piece: { tipo, textura, color },
  });
  return entry;
}

/** Pega una imagen sobre una pieza (o sobre todas las piezas de un grupo). */
export function setPieceTexture(id, dataUrl) {
  const entry = getEditableById(id);
  if (!entry?.object3D) return false;
  const textura = texturaDesde(dataUrl);
  let aplicadas = 0;
  entry.object3D.traverse((hijo) => {
    if (!hijo.isMesh || !hijo.material) return;
    for (const material of (Array.isArray(hijo.material) ? hijo.material : [hijo.material])) {
      if (!('map' in material)) continue;
      material.map = textura;
      // El color se lleva a blanco: si la pieza quedo tenida, la textura sale
      // con ese tinte encima y no se entiende por que se ve de otro color.
      material.color?.set?.(0xffffff);
      material.needsUpdate = true;
      aplicadas++;
    }
  });
  if (entry.piece) {
    entry.piece.textura = dataUrl;
    // En un grupo, cada pieza guarda SU textura: `restorePieces` reconstruye
    // pieza por pieza y sin esto la imagen se perdia al refrescar, aunque en
    // pantalla se viera aplicada.
    for (const p of entry.piece.piezas ?? []) p.textura = dataUrl;
  }
  return aplicadas > 0;
}

/**
 * Junta varias piezas en un objeto solo. Siguen siendo piezas separadas —se
 * pueden seguir moviendo por dentro— pero el grupo se mueve, rota y escala como
 * una unidad, y se guarda como un objeto.
 *
 * El grupo se crea en el centro del conjunto y no en el origen: si no, rotarlo
 * lo manda a la otra punta del local.
 */
export function groupPieces(scene, ids, nombre = 'Objeto armado') {
  const entradas = ids.map((id) => getEditableById(id)).filter((e) => e?.object3D);
  if (entradas.length < 2) return null;

  const centro = new THREE.Vector3();
  const punto = new THREE.Vector3();
  for (const entrada of entradas) {
    entrada.object3D.getWorldPosition(punto);
    centro.add(punto);
  }
  centro.divideScalar(entradas.length);

  const grupo = new THREE.Group();
  grupo.name = nombre;
  grupo.position.copy(centro);
  grupo.userData.editorCollider = true;
  scene.add(grupo);
  grupo.updateMatrixWorld(true);

  const inversa = new THREE.Matrix4().copy(grupo.matrixWorld).invert();
  const piezas = [];
  for (const entrada of entradas) {
    const objeto = entrada.object3D;
    objeto.updateMatrixWorld(true);
    // Se conserva la posicion en el MUNDO al cambiar de padre. Sin esto cada
    // pieza salta al reinterpretarse su posicion respecto del grupo nuevo.
    const local = new THREE.Matrix4().multiplyMatrices(inversa, objeto.matrixWorld);
    objeto.removeFromParent();
    grupo.add(objeto);
    local.decompose(objeto.position, objeto.quaternion, objeto.scale);
    piezas.push({
      tipo: entrada.piece?.tipo ?? 'caja',
      textura: entrada.piece?.textura ?? null,
      color: entrada.piece?.color ?? 0xb9b3a6,
      position: objeto.position.toArray(),
      rotation: [objeto.rotation.x, objeto.rotation.y, objeto.rotation.z],
      scale: objeto.scale.toArray(),
      name: objeto.name,
    });
    unregisterEditableObject(entrada.id);
  }

  return registerEditableObject({
    id: `pieza:grupo-${Date.now().toString(36)}-${++contador}`,
    name: nombre,
    type: 'pieza',
    object3D: grupo,
    position: grupo.position.toArray(),
    rotation: [0, 0, 0],
    scale: [1, 1, 1],
    castShadow: true,
    receiveShadow: true,
    locked: false,
    visible: true,
    piece: { tipo: 'grupo', piezas },
  });
}

/**
 * Fusiona las mallas de un grupo en UNA sola.
 *
 * POR QUE IMPORTA: un objeto armado con 20 piezas cuesta 20 llamadas de dibujo.
 * Si ese objeto ademas se repite en varios percheros, se multiplica. En este
 * proyecto las llamadas de dibujo pesan mas que los triangulos —lo medimos con
 * las perchas, donde fusionar bajo el costo un 75% sin cambiar un pixel.
 *
 * Solo fusiona las piezas que comparten textura: dos mallas con imagenes
 * distintas no pueden ser una sola sin rehacer las UV.
 */
export function mergePiece(id) {
  const entry = getEditableById(id);
  const raiz = entry?.object3D;
  if (!raiz?.isGroup) return { ok: false, motivo: 'Seleccioná un objeto agrupado.' };

  const porTextura = new Map();
  raiz.updateMatrixWorld(true);
  const inversa = new THREE.Matrix4().copy(raiz.matrixWorld).invert();

  raiz.traverse((hijo) => {
    if (!hijo.isMesh || !hijo.geometry) return;
    const material = Array.isArray(hijo.material) ? hijo.material[0] : hijo.material;
    const clave = material?.map?.uuid ?? `color:${material?.color?.getHex?.() ?? 0}`;
    const geo = hijo.geometry.clone();
    geo.applyMatrix4(new THREE.Matrix4().multiplyMatrices(inversa, hijo.matrixWorld));
    // Todas las geometrias fusionadas tienen que traer los mismos atributos, si
    // no mergeGeometries devuelve null. Se quedan los tres basicos.
    for (const nombre of Object.keys(geo.attributes)) {
      if (!['position', 'normal', 'uv'].includes(nombre)) geo.deleteAttribute(nombre);
    }
    if (!geo.attributes.uv) {
      geo.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(geo.attributes.position.count * 2), 2));
    }
    const grupo = porTextura.get(clave) ?? { material, geos: [] };
    grupo.geos.push(geo);
    porTextura.set(clave, grupo);
  });

  if (!porTextura.size) return { ok: false, motivo: 'Ese objeto no tiene piezas para fusionar.' };

  const antes = [...porTextura.values()].reduce((n, g) => n + g.geos.length, 0);
  for (const hijo of [...raiz.children]) raiz.remove(hijo);

  for (const { material, geos } of porTextura.values()) {
    const fusionada = geos.length === 1 ? geos[0] : mergeGeometries(geos, false);
    if (!fusionada) continue;
    const malla = new THREE.Mesh(fusionada, material);
    malla.name = `${raiz.name} · fusionado`;
    malla.castShadow = true;
    malla.receiveShadow = true;
    raiz.add(malla);
    if (geos.length > 1) for (const g of geos) g.dispose();
  }

  // Queda anotado en el layout: al recargar, `restorePieces` reconstruye las
  // piezas sueltas y hay que volver a fusionarlas. Sin esta marca la fusion se
  // perdia en cada refresco y el ahorro de dibujo era mentira.
  if (entry.piece) entry.piece.fusionado = true;

  const despues = porTextura.size;
  return { ok: true, antes, despues };
}

/**
 * Vuelve a construir las piezas guardadas en el layout. Se llama al cargar,
 * igual que `restoreClones`: el layout guarda donde esta cada pieza, pero una
 * pieza inventada por Kusher no existe en ninguna escena hasta que alguien la
 * crea de nuevo.
 */
export function restorePieces(scene, layout) {
  if (!Array.isArray(layout) || !scene) return 0;
  let creadas = 0;
  for (const item of layout) {
    if (item?.type !== 'pieza' || !item.piece || getEditableById(item.id)?.object3D) continue;

    if (item.piece.tipo === 'grupo') {
      const grupo = new THREE.Group();
      grupo.name = item.name ?? 'Objeto armado';
      grupo.position.fromArray(item.position ?? [0, 1, 0]);
      grupo.rotation.set(...(item.rotation ?? [0, 0, 0]));
      grupo.scale.fromArray(item.scale ?? [1, 1, 1]);
      grupo.visible = item.visible !== false;
      grupo.userData.editorCollider = true;
      scene.add(grupo);
      for (const p of item.piece.piezas ?? []) {
        const preset = PIEZAS[p.tipo] ?? PIEZAS.caja;
        const malla = new THREE.Mesh(preset.crear(), materialDePieza(p));
        malla.name = p.name ?? preset.nombre;
        malla.position.fromArray(p.position ?? [0, 0, 0]);
        malla.rotation.set(...(p.rotation ?? [0, 0, 0]));
        malla.scale.fromArray(p.scale ?? [1, 1, 1]);
        malla.castShadow = true;
        malla.receiveShadow = true;
        grupo.add(malla);
      }
      registerEditableObject({
        id: item.id, name: grupo.name, type: 'pieza', object3D: grupo,
        position: grupo.position.toArray(),
        rotation: [grupo.rotation.x, grupo.rotation.y, grupo.rotation.z],
        scale: grupo.scale.toArray(),
        castShadow: true, receiveShadow: true, locked: false,
        visible: item.visible !== false,
        piece: item.piece,
      }, { silent: true });
      if (item.piece.fusionado) mergePiece(item.id);
      creadas++;
      continue;
    }

    const entry = createPiece(scene, item.piece.tipo, {
      id: item.id,
      name: item.name,
      position: item.position,
      rotation: item.rotation,
      scale: item.scale,
      color: item.piece.color,
      textura: item.piece.textura,
      visible: item.visible !== false,
    });
    if (entry) creadas++;
  }
  return creadas;
}
