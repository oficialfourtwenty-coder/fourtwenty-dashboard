// LECTOR DE GLB COMPARTIDO — uno solo para todo el simulador.
//
// POR QUE EXISTE
// Un `new GLTFLoader()` pelado NO sabe leer un archivo comprimido con Draco:
// no tira error, no avisa nada, simplemente el modelo no aparece. Ya casi pasa
// dos veces:
//   · 11/08 con los autos — `cars.js` tenia un lector pelado y se comprimieron
//     los GLB. Se detecto de casualidad antes de subirlo.
//   · 03/09 con BOB — se comprimio `bob.glb` de 2,33 MB a 0,83 MB y habia DOS
//     lugares que lo cargaban: `player/bob3d.js` (el jugador) y `world/gallery.js`
//     (la estatua gigante del piso BOB). Los dos con lector pelado.
//
// La causa de fondo es que cada archivo se armaba su propio lector. Mientras
// eso siga asi, comprimir cualquier GLB es una ruleta: hay que acordarse de
// todos los lugares que lo cargan, y alcanza con olvidarse de uno.
//
// Ahora hay UNO solo y ya viene con Draco puesto. Un lector con Draco lee
// perfecto los archivos sin comprimir, asi que no hay contra: el decodificador
// recien se descarga si aparece un archivo que de verdad lo necesita.
//
// Bonus medido: antes habia DOS DRACOLoader vivos (`cars.js` y `furniture.js`),
// y cada uno levanta su propia tanda de workers. Ahora es uno.
//
// ⚠️ REGLA: no crear `new GLTFLoader()` en ningun otro archivo. Importar
// `gltfLoader()` de aca.
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

let _loader = null;

export function gltfLoader() {
  if (!_loader) {
    const draco = new DRACOLoader();
    draco.setDecoderPath('/assets/draco/');
    _loader = new GLTFLoader();
    _loader.setDRACOLoader(draco);
  }
  return _loader;
}
