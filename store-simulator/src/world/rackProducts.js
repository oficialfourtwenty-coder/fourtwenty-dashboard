// Percheros GLB que muestran productos reales.
//
// El perchero de Chelo (`fourtwenty-rack-display-v01.glb`) reemplazo al barral
// procedural de la pared izquierda del local. Ese barral tenia 4 prendas
// clickeables (`{ piso: 'local', index: 0..3 }`); si el GLB entrara "pelado" se
// perderian esos 4 slots de producto. Aca se los devolvemos a sus remeras.
//
// El GLB nombra sus piezas asi: TSHIRT_01_BODY ... TSHIRT_06_BODY (la tela),
// TSHIRT_0N_COLLAR (el cuello) y HANGER_0N_* (la percha). Solo la tela se marca.
//
// ⚠️ A proposito NO se usa `bindProductVisual` aca. Esa funcion PISA el mapa
// del material con la foto del producto: sirve para las prendas parametricas de
// `garments.js`, cuyo UV esta hecho para recibir una foto plana. Las remeras de
// Chelo tienen su propio material y su UV: estirarles encima un .webp de la
// tienda arruinaria justamente la evolucion grafica que aporta el modelo.
// Marcando solo `userData.productSlot` la remera se ve como la modelo Chelo y
// igual abre el panel de producto al clickearla (ver interact/productClicks.js,
// que sube por los padres buscando ese dato).
const RACKS = {
  'fourtwenty-rack-display-v01.glb': {
    piso: 'local',
    // La coleccion LOCAL BURELA tiene 4 tops + el jean (que ya vive en su
    // exhibidor, slot 4). Las 6 remeras ciclan los 4 tops en vez de colgar un
    // jean de una percha.
    slots: 4,
    tela: /^TSHIRT_(\d+)_BODY$/i,
  },
};

function rackConfig(modelPath) {
  if (typeof modelPath !== 'string') return null;
  for (const [archivo, config] of Object.entries(RACKS)) {
    if (modelPath.endsWith(archivo)) return config;
  }
  return null;
}

/**
 * Marca las remeras de un perchero GLB como productos clickeables.
 * Se llama al cargar cada mueble; si el modelo no es un perchero no hace nada,
 * asi que es seguro llamarla para todos.
 * Devuelve cuantas remeras encontro (0 si no era un perchero).
 */
export function bindRackProducts(object, modelPath) {
  const config = rackConfig(modelPath);
  if (!config || !object) return 0;

  const telas = [];
  object.traverse((child) => {
    if (!child.isMesh) return;
    const match = config.tela.exec(child.name ?? '');
    if (match) telas.push({ mesh: child, numero: Number(match[1]) });
  });
  // Por numero y no por orden de recorrido: asi la remera 01 es siempre el
  // primer producto, aunque el GLB cambie el orden de sus nodos.
  telas.sort((a, b) => a.numero - b.numero);

  telas.forEach(({ mesh }, i) => {
    mesh.userData.productSlot = { piso: config.piso, index: i % config.slots };
  });

  return telas.length;
}
