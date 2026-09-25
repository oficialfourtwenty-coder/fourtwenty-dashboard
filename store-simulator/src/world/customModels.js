// Muebles hechos por el dueño: modelos GLB propios (perchero, mesa, lo que
// sea), convertidos por él desde imágenes con su herramienta externa.
// Se cargan por nombre de archivo desde public/assets/furniture/ y se
// acomodan solos (escala por altura objetivo, apoyados en el piso).
//
// Uso desde layout.js:
//   { tipo: 'modelo', archivo: 'perchero_remeras.glb', x, z, rot, alto }
//
// `alto` es la altura deseada en metros (por defecto 1.6). El modelo se
// escala para medir eso, se centra en x/z y se apoya en el piso solo — no
// hace falta calcular escalas a mano ni adivinar el pivote del archivo.
import * as THREE from 'three';
import { normalizeGLTFHeight } from './gltfUtils.js';
import { gltfLoader } from './gltfLoaders.js';

const loader = gltfLoader();
const cache = new Map(); // evita cargar el mismo GLB dos veces si se repite

function loadOnce(path) {
  if (!cache.has(path)) {
    cache.set(path, new Promise((resolve, reject) => {
      loader.load(path, resolve, undefined, reject);
    }));
  }
  return cache.get(path);
}

// Coloca un mueble GLB en (x, y, z) del mundo, rotado `rot` radianes.
// `y` es la altura del piso (la pasa el llamador, ej. FLOOR_YS[piso-1]).
// Si se pasa `colliders`, empuja ahí la caja de colisión REAL del modelo
// una vez que termina de cargar (no un radio adivinado a mano) — así Bob
// no atraviesa el mueble sea cual sea su forma real.
export function placeModel(scene, { archivo, x, y = 0, z, rot = 0, alto = 1.6 }, colliders) {
  loadOnce(`assets/furniture/${archivo}`)
    .then((gltf) => {
      const model = gltf.scene.clone(true);
      normalizeGLTFHeight(model, alto); // centrado en X/Z, apoyado en Y=0

      const rig = new THREE.Group();
      rig.add(model);
      rig.position.set(x, y, z);
      rig.rotation.y = rot;
      rig.updateMatrixWorld(true);
      rig.traverse((m) => {
        if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; }
      });
      scene.add(rig);

      if (colliders) {
        const box = new THREE.Box3().setFromObject(rig);
        colliders.push({
          minX: box.min.x, maxX: box.max.x,
          minY: box.min.y, maxY: box.max.y,
          minZ: box.min.z, maxZ: box.max.z,
        });
      }
    })
    .catch(() => {
      console.warn(`No se pudo cargar el mueble "${archivo}" (¿está en public/assets/furniture/?)`);
    });
}
