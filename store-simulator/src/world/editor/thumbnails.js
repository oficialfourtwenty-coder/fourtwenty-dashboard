// MINIATURAS DEL EDITOR — una foto de cada objeto al lado de su nombre.
//
// POR QUE EXISTE
// La lista del editor tiene 360 objetos con nombres parecidos: "Columna salvia
// galeria 4 (copia) (copia)", "Vereda gris frente al local (copia) (copia)
// (copia)". Con eso Kusher no puede saber cual es cual sin ir clickeando uno
// por uno hasta que algo se ilumina. Sus palabras: "necesitaria que facilites
// los nombres en el editor para poder abrir los correctos, mismo podrias poner
// una imagen al lado de cada nombre para ver cual es cual".
//
// COMO ESTA HECHO
// Un renderer chiquito aparte (96x96) con su propia escena y sus propias luces.
// Del objeto se hace un CLON: `Object3D.clone()` comparte geometrias y
// materiales, asi que no duplica memoria, y sobre todo NO toca el objeto que
// esta en el mundo — moverlo para fotografiarlo lo hubiera dejado corrido.
//
// Se generan de a una y solo cuando la fila aparece en pantalla (ver
// `editorPanel.js`): dibujar 360 miniaturas de golpe congelaria el juego varios
// segundos, que es justo lo que estamos tratando de evitar en este proyecto.

import * as THREE from 'three';

export const THUMB_SIZE = 96;

let renderer = null;
let escena = null;
let camara = null;
const cache = new Map();

function iniciar() {
  if (renderer) return;
  renderer = new THREE.WebGLRenderer({
    alpha: true,
    antialias: true,
    // Sin esto `toDataURL` sale en negro: el navegador limpia el buffer apenas
    // termina de dibujar.
    preserveDrawingBuffer: true,
  });
  renderer.setSize(THUMB_SIZE, THUMB_SIZE);
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  escena = new THREE.Scene();
  // Luz propia: el objeto se fotografia fuera de su escena, asi que las luces
  // del mundo no lo alcanzan. Tres cuartos + relleno para que se lea el volumen
  // y no salga una silueta plana.
  escena.add(new THREE.HemisphereLight(0xffffff, 0x555560, 2.1));
  const principal = new THREE.DirectionalLight(0xffffff, 2.4);
  principal.position.set(3, 5, 4);
  escena.add(principal);
  const relleno = new THREE.DirectionalLight(0xbcd2ff, 0.9);
  relleno.position.set(-4, 1, -3);
  escena.add(relleno);

  camara = new THREE.PerspectiveCamera(35, 1, 0.01, 500);
}

/**
 * Devuelve una foto del objeto como dataURL, o null si no hay nada que dibujar.
 * El resultado queda cacheado por `clave`.
 */
export function miniaturaDe(object3D, clave) {
  if (!object3D) return null;
  if (cache.has(clave)) return cache.get(clave);

  let tieneMalla = false;
  object3D.traverse((o) => { if (o.isMesh || o.isInstancedMesh) tieneMalla = true; });
  if (!tieneMalla) { cache.set(clave, null); return null; }

  iniciar();

  const clon = object3D.clone(true);
  // Se lo fotografia siempre visible aunque en el mundo este apagado: la
  // miniatura sirve JUSTAMENTE para encontrar lo que no se ve.
  clon.traverse((o) => { o.visible = true; });
  clon.position.set(0, 0, 0);
  clon.rotation.set(0, 0, 0);
  clon.updateMatrixWorld(true);

  const caja = new THREE.Box3().setFromObject(clon);
  if (caja.isEmpty()) { cache.set(clave, null); return null; }
  const centro = caja.getCenter(new THREE.Vector3());
  const radio = Math.max(caja.getSize(new THREE.Vector3()).length() / 2, 0.001);

  escena.add(clon);
  // Tres cuartos desde arriba, la vista que mas informacion da de un objeto.
  const distancia = radio / Math.sin((camara.fov * Math.PI / 180) / 2) * 1.25;
  camara.position.set(
    centro.x + distancia * 0.62,
    centro.y + distancia * 0.48,
    centro.z + distancia * 0.62,
  );
  camara.near = Math.max(distancia - radio * 3, 0.01);
  camara.far = distancia + radio * 4;
  camara.updateProjectionMatrix();
  camara.lookAt(centro);

  let url = null;
  try {
    renderer.render(escena, camara);
    url = renderer.domElement.toDataURL('image/webp', 0.7);
  } catch (error) {
    console.warn('No se pudo dibujar la miniatura.', error);
  }
  escena.remove(clon);

  cache.set(clave, url);
  return url;
}

/** Se llama cuando un objeto cambia de forma o color y su foto quedo vieja. */
export function olvidarMiniatura(clave) {
  cache.delete(clave);
}

export function olvidarTodasLasMiniaturas() {
  cache.clear();
}
