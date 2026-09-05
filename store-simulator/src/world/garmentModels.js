// PRENDAS DE VERDAD — los GLB que modela Fer/Chelo en Blender.
//
// POR QUE EXISTE
// Hasta hoy las prendas se generaban con formulas (`world/garments.js`): una
// malla parametrica que salia siempre geometrica. Kusher pidio reemplazarlas por
// las prendas modeladas a mano y armar el, a mano, cada perchero. Entonces los
// percheros quedan VACIOS y de cada prenda se deja una sola de muestra por
// escena; el resto lo duplica el con `T`.
//
// LO QUE HAY QUE SABER DE ESTOS ARCHIVOS (medido el 10/08)
// - 77 KB, 2.577 triangulos, 3 mallas: la remera, y la percha en dos piezas
//   (madera y metal, materiales distintos, por eso no se fusionan).
// - El cuerpo de la prenda es su PROPIA malla con su PROPIO material, sin
//   textura pegada: por eso el color se puede cambiar sin tocar la percha.
// - Tienen UV, y el frente y el dorso caen en zonas SEPARADAS del mapa
//   (frente ~U 0.24-0.33, dorso ~U 0.65-0.76). Eso es lo que permite estampar
//   el pecho sin que el dibujo aparezca espejado en la espalda.
// - ⚠️ Vienen en Z ARRIBA (la convencion de Blender, sin convertir). Medido por
//   las cajas: el gancho esta en Z maximo y la prenda cuelga hacia -Z. Tal cual
//   salen del archivo entran ACOSTADAS DE ESPALDAS. Por eso `ROTACION_DE_PIE`.
//   Lo correcto es que se exporten con "+Y up" y ahi esta constante se va.

import * as THREE from 'three';
import { getEditableById, registerEditableObject } from './editor/editableRegistry.js';
import { diseñoDe, pintarPrenda } from '../ui/garmentGlbEditor.js';
import { gltfLoader } from './gltfLoaders.js';

const loader = gltfLoader();
const cache = new Map();

// -90° en X: pasa de Z-arriba (Blender) a Y-arriba (three.js).
// ⚠️ NO todas las prendas la necesitan. Las dos remeras y el jean colgado
// vienen en Z-arriba y hay que pararlas; el hoodie ya vino exportado con
// "+Y up" y el jean doblado esta acostado A PROPOSITO (va sobre una mesa).
// Por eso la rotacion es por prenda y no una constante global: aplicarsela a
// todas dejaba unas de pie y otras de costado.
const ROTACION_DE_PIE = -Math.PI / 2;

export const PRENDAS_GLB = Object.freeze({
  'remera-oversize': {
    nombre: 'Remera oversize',
    archivo: '/assets/garments/remera-oversize.glb',
    // El nombre de la malla del cuerpo dentro del GLB. Es lo que se pinta y lo
    // que despues va a recibir la estampa; la percha queda afuera a proposito.
    // ⚠️ Es el nombre del NODO, no el de la malla dentro del glTF. GLTFLoader
    // bautiza el Object3D con el nodo: aca es `Remera_Oversize_Negra_Sin_Logo`,
    // no `Remera_Oversize_Negra_Mesh`. Buscar por el nombre de la malla no
    // encontraba nada y la prenda quedaba sin poder pintarse.
    tela: /^Remera/i,
  },
  'remera-regular': {
    nombre: 'Remera regular',
    archivo: '/assets/garments/remera-regular.glb',
    // ⚠️ Es el nombre del NODO, no el de la malla dentro del glTF. GLTFLoader
    // bautiza el Object3D con el nodo: aca es `Remera_Oversize_Negra_Sin_Logo`,
    // no `Remera_Oversize_Negra_Mesh`. Buscar por el nombre de la malla no
    // encontraba nada y la prenda quedaba sin poder pintarse.
    tela: /^Remera/i,
  },
  hoodie: {
    nombre: 'Hoodie',
    archivo: '/assets/garments/hoodie.glb',
    tela: /^HOODIE/i,
    // Ya vino con "+Y up": no hay que pararlo.
    rotacionX: 0,
    // ⚠️ ACHICADO A PROPOSITO. Medido: el archivo trae la prenda de 1,77 m de
    // ancho por 1,92 m de alto — casi tres veces una prenda real. Colgado en un
    // perchero tapaba media tienda y atravesaba las paredes. 0.38 lo deja en
    // ~73 cm de alto, la medida de un hoodie de verdad.
    // El arreglo limpio es que se exporte a escala real y este numero se va.
    escala: 0.38,
  },
  'jean-colgado': {
    nombre: 'Jean colgado',
    archivo: '/assets/garments/jean-colgado.glb',
    tela: /^JEAN/i,
    // Viene en Z-arriba: 46 cm de ancho por 97 de largo. Se para.
    rotacionX: -Math.PI / 2,
  },
  'jean-doblado': {
    nombre: 'Jean doblado (para mesa)',
    archivo: '/assets/garments/jean-doblado.glb',
    tela: /^JEAN/i,
    // ⚠️ Este NO se para. Es un jean doblado para apoyar sobre una mesa: 44 x 55
    // cm y 3 cm de espesor. Ya viene acostado y asi tiene que quedar.
    rotacionX: 0,
    // No cuelga de un perchero: se apoya. Ponelo sobre la mesa con el gizmo.
  },
});

function cargar(archivo) {
  if (!cache.has(archivo)) {
    cache.set(archivo, new Promise((resolve, reject) => {
      loader.load(archivo, resolve, undefined, reject);
    }));
  }
  return cache.get(archivo);
}

/**
 * Cuelga una prenda GLB en una escena y la deja editable con `T`.
 *
 * Es asincrona porque el GLB se baja una sola vez y despues se CLONA: 20 copias
 * de la misma remera comparten una sola geometria y una sola textura en memoria.
 * Lo que si se paga por copia son las llamadas de dibujo (3 por prenda, porque
 * la percha viene adentro del archivo).
 */
export async function addGarmentModel(scene, clave, {
  position = [0, 0, 0],
  rotationY = 0,
  scale = 1,
  id = null,
  name = null,
  // En que escena se colgo. Se guarda para que al recargar vuelva SOLO ahi:
  // sin esto una remera puesta en HOOP reaparecia tambien en Burela.
  destinationId = null,
  // ⚠️ Solo las prendas que Kusher cuelga a mano se guardan en el layout.
  // Las MUESTRAS no: la escena las crea sola cada vez que se arma, asi que
  // guardarlas las duplicaba —una del codigo y otra del layout— y la copia se
  // multiplicaba en cada refresco.
  persistente = false,
} = {}) {
  const preset = PRENDAS_GLB[clave];
  if (!preset || !scene) return null;

  let gltf;
  try {
    gltf = await cargar(preset.archivo);
  } catch (error) {
    console.warn(`No se pudo cargar la prenda ${preset.archivo}.`, error);
    return null;
  }
  if (scene.userData?.disposed) return null;

  const root = new THREE.Group();
  root.name = name ?? preset.nombre;
  const modelo = gltf.scene.clone(true);
  modelo.rotation.x = preset.rotacionX ?? ROTACION_DE_PIE;
  root.add(modelo);

  // El material se clona por prenda: si no, cambiarle el color a una se lo
  // cambia a TODAS, porque el clon del GLB comparte el material del original.
  let tela = null;
  modelo.traverse((hijo) => {
    if (!hijo.isMesh) return;
    hijo.castShadow = true;
    hijo.receiveShadow = true;
    hijo.material = hijo.material.clone();
    if (preset.tela.test(hijo.name)) tela = hijo;
  });

  root.position.fromArray(position);
  root.rotation.y = rotationY;
  // La escala de correccion del modelo se multiplica por la que pida quien lo
  // coloca, asi el hoodie entra ya corregido sin que nadie tenga que acordarse.
  root.scale.setScalar(scale * (preset.escala ?? 1));
  root.userData.editorCollider = false;   // una prenda colgada no frena a BOB
  // Marca para el editor de prendas: con esto sabe cual malla pintar.
  root.userData.garmentModel = { clave, telaNombre: tela?.name ?? null };
  scene.add(root);

  // ⚠️ El diseño guardado se aplica ACA y no al terminar de armar la escena.
  // El GLB se baja de forma asincronica: cuando `buildPs3FloorScene` llama a
  // `applySavedGlbGarmentDesigns` la prenda todavia no existe en la escena, asi
  // que no la encontraba y el diseño de Kusher no aparecia nunca.
  const diseño = diseñoDe(root);
  if (diseño.imagen || diseño.color) pintarPrenda(root, diseño);

  registerEditableObject({
    id: id ?? `prenda:${clave}:${Math.random().toString(36).slice(2, 8)}`,
    name: root.name,
    type: 'prenda',
    object3D: root,
    position,
    rotation: [0, rotationY, 0],
    scale: [scale, scale, scale],
    castShadow: true,
    receiveShadow: true,
    locked: false,
    visible: true,
    // Sin esto una prenda agregada a mano desaparece al refrescar: el layout
    // guarda DONDE esta, no que archivo cargar. Lo reconstruye
    // `restorePrendasGlb`, igual que `restoreMuebles` con los muebles.
    ...(persistente ? { prendaGlb: { clave, destinationId: destinationId ?? scene?.userData?.ps3DestinationId ?? 0 } } : {}),
  });

  return { root, tela };
}

/**
 * Deja UNA de cada prenda como muestra en la escena. Kusher duplica a mano.
 * Se llama sin await a proposito: la escena no espera al GLB para abrirse.
 */
export function addSampleGarments(scene, {
  x = 0, y = 1.55, z = 0, rotationY = 0, escala = 1,
  // Por que eje se separan las dos muestras. El barral de los pisos corre en X;
  // el del local de Burela corre en Z (esta girado 90°). Separarlas siempre en X
  // dejaba una de las dos colgando al lado del barral, en el aire.
  eje = 'x',
} = {}) {
  const muestras = Object.keys(PRENDAS_GLB);
  muestras.forEach((clave, i) => {
    const salto = i * 0.32;
    addGarmentModel(scene, clave, {
      position: eje === 'z' ? [x, y, z + salto] : [x + salto, y, z],
      rotationY,
      scale: escala,
      name: `${PRENDAS_GLB[clave].nombre} · muestra`,
    }).catch((error) => console.warn('No se pudo colgar la prenda de muestra.', error));
  });
}

/**
 * Reconstruye las prendas que Kusher colgo a mano. Es asincrona (el GLB se
 * baja), asi que devuelve la cantidad que va a crear, no las ya creadas.
 */
// Prendas que se estan bajando ahora mismo. Hace falta porque `addGarmentModel`
// es asincrona: hasta que el GLB no resuelve, la prenda no esta registrada, y si
// mientras tanto se vuelve a aplicar el layout se pedia otra copia. Se veian
// tres remeras donde habia una.
const colgandose = new Set();

export function restorePrendasGlb(scene, layout, destinoDeLaEscena) {
  if (!Array.isArray(layout) || !scene) return 0;
  let pedidas = 0;
  for (const item of layout) {
    if (!item?.prendaGlb?.clave) continue;
    // Mismo motivo que en `restoreMuebles`: sin este filtro la prenda se
    // recreaba en todas las escenas.
    if ((item.prendaGlb.destinationId ?? 0) !== destinoDeLaEscena) continue;
    // Ya esta puesta. Este chequeo es el principal: `applySavedEditorLayout`
    // corre varias veces por entrada a un piso, y sin el se colgaban tres
    // remeras donde habia una. El de `colgandose` cubre la ventana en la que el
    // GLB todavia se esta bajando y la prenda aun no figura en el registro.
    if (getEditableById(item.id)?.object3D?.parent) continue;
    if (colgandose.has(item.id)) continue;
    colgandose.add(item.id);
    pedidas++;
    addGarmentModel(scene, item.prendaGlb.clave, {
      id: item.id,
      name: item.name,
      position: item.position ?? [0, 0, 0],
      rotationY: item.rotation?.[1] ?? 0,
      scale: item.scale?.[0] ?? 1,
      destinationId: destinoDeLaEscena,
      persistente: true,
    })
      .catch((error) => console.warn('No se pudo recolgar la prenda.', error))
      .finally(() => colgandose.delete(item.id));
  }
  return pedidas;
}
