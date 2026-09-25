// Normaliza un modelo GLB cargado: lo escala para que mida `targetHeight`
// metros y lo apoya con la base en su propio Y=0, centrado en X/Z — así el
// que lo llama solo tiene que posicionar el contenedor donde quiera, sin
// calcular escalas ni pivotes a mano. Antes esta misma secuencia (Box3 →
// escalar → Box3 → centrar/apoyar) estaba repetida en bob3d.js, la estatua
// de BOB en gallery.js y customModels.js.
import * as THREE from 'three';

export function normalizeGLTFHeight(model, targetHeight) {
  const size = new THREE.Box3().setFromObject(model).getSize(new THREE.Vector3());
  model.scale.setScalar(targetHeight / (size.y || 1));
  const box = new THREE.Box3().setFromObject(model);
  const center = box.getCenter(new THREE.Vector3());
  model.position.x -= center.x;
  model.position.y -= box.min.y;
  model.position.z -= center.z;
}
