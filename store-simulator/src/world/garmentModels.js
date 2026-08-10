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
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { registerEditableObject } from './editor/editableRegistry.js';

const loader = new GLTFLoader();
const cache = new Map();

// -90° en X: pasa de Z-arriba (Blender) a Y-arriba (three.js).
const ROTACION_DE_PIE = -Math.PI / 2;

export const PRENDAS_GLB = Object.freeze({
  'remera-oversize': {
    nombre: 'Remera oversize',
    archivo: '/assets/garments/remera-oversize.glb',
    // El nombre de la malla del cuerpo dentro del GLB. Es lo que se pinta y lo
    // que despues va a recibir la estampa; la percha queda afuera a proposito.
    tela: /^Remera_.*_Mesh$/i,
  },
  'remera-regular': {
    nombre: 'Remera regular',
    archivo: '/assets/garments/remera-regular.glb',
    tela: /^Remera_.*_Mesh$/i,
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
  modelo.rotation.x = ROTACION_DE_PIE;
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
  root.scale.setScalar(scale);
  root.userData.editorCollider = false;   // una prenda colgada no frena a BOB
  // Marca para el editor de prendas: con esto sabe cual malla pintar.
  root.userData.garmentModel = { clave, telaNombre: tela?.name ?? null };
  scene.add(root);

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
