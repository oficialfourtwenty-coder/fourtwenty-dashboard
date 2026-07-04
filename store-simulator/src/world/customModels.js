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
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const loader = new GLTFLoader();
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
export function placeModel(scene, { archivo, x, y = 0, z, rot = 0, alto = 1.6 }) {
  loadOnce(`assets/furniture/${archivo}`)
    .then((gltf) => {
      const model = gltf.scene.clone(true);

      // 1) escalar para que mida `alto` metros
      const size = new THREE.Box3().setFromObject(model).getSize(new THREE.Vector3());
      model.scale.setScalar(alto / (size.y || 1));

      // 2) centrar en X/Z y apoyar la base en Y=0, DENTRO de un rig — así el
      //    rig rota alrededor del centro real del mueble, no de una esquina
      const box = new THREE.Box3().setFromObject(model);
      const center = box.getCenter(new THREE.Vector3());
      model.position.set(-center.x, -box.min.y, -center.z);

      const rig = new THREE.Group();
      rig.add(model);
      rig.position.set(x, y, z);
      rig.rotation.y = rot;
      rig.traverse((m) => {
        if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; }
      });
      scene.add(rig);
    })
    .catch(() => {
      console.warn(`No se pudo cargar el mueble "${archivo}" (¿está en public/assets/furniture/?)`);
    });
}
