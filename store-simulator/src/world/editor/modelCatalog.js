// ⚠️ SUBIR EL NUMERO cada vez que se agrega un mueble a BUNDLED_FURNITURE.
// `migrateBundledFurniture` (world/furniture.js) inyecta los muebles nuevos en
// el layout guardado UNA sola vez y despues marca esta clave. Si no se sube, la
// computadora de Kusher — que ya tiene la marca vieja — se saltea la migracion
// y el mueble nuevo no aparece nunca, aunque este en el codigo.
// v2: perchero FOURTWENTY de Chelo en el local.
export const MODEL_CATALOG_MIGRATION_KEY = 'fourtwenty-editor-model-catalog-v2';

export const ADDABLE_MODELS = Object.freeze({
  cantero: {
    name: 'Cantero',
    sourceId: 'calle-kit:26',
  },
  'apartment-building': {
    name: 'Edificio GLB Burela · apartment-building',
    model: 'assets/furniture/apartment-building.glb',
    height: 20,
    castShadow: false,
  },
  'tram-station': {
    name: 'Tram Station · Estacion de tranvia GLB',
    model: 'assets/furniture/tram-station.glb',
    height: 7,
    castShadow: false,
    collidable: false,
    searchTerms: 'tram estacion tranvia station',
  },
  'b54-simulator': {
    name: 'B54 FTT Lowpoly Simulator',
    model: 'assets/furniture/b54-ftt-lowpoly-simulator.glb',
    height: 6,
    castShadow: false,
    collidable: false,
    searchTerms: 'b54 ftt lowpoly simulator',
  },
  'city-map': {
    name: 'City Map Free · Mapa de ciudad',
    model: 'assets/furniture/city-map-free.glb',
    height: 5,
    castShadow: false,
    collidable: false,
    searchTerms: 'city map mapa ciudad free',
  },
  // Perchero mural hecho por Chelo en Blender (1.80 x 0.89 x 0.35 m, 274 KB).
  // SIN `height` a proposito: el modelo ya viene en metros y hay que conservar
  // su escala original — poner height lo reescalaria.
  'fourtwenty-rack-display': {
    name: 'Perchero FOURTWENTY · 6 remeras',
    model: 'assets/furniture/fourtwenty-rack-display-v01.glb',
    castShadow: false,   // 6 prendas proyectando sombra salen caras
    collidable: false,   // va contra la pared, no necesita colision
    searchTerms: 'fourtwenty perchero remeras estante local pared chelo',
  },
  // Remera suelta para vista de producto. Trae PRINT_FRONT y PRINT_BACK
  // preparados para recibir estampas.
  'fourtwenty-tshirt': {
    name: 'Remera FOURTWENTY · vista de producto',
    model: 'assets/furniture/fourtwenty-tshirt-inspection-v01.glb',
    castShadow: false,
    collidable: false,
    searchTerms: 'fourtwenty remera prenda producto estampa inspeccion',
  },
});

// `rotation` es opcional: hasta ahora todos los muebles empotrados iban
// derechos, pero el perchero de pared necesita girar para quedar contra el muro.
function bundledFurniture(key, id, position, rotation = [0, 0, 0]) {
  const preset = ADDABLE_MODELS[key];
  return Object.freeze({
    id,
    name: preset.name,
    type: 'furniture',
    model: preset.model,
    position: Object.freeze(position),
    rotation: Object.freeze(rotation),
    scale: Object.freeze([1, 1, 1]),
    castShadow: preset.castShadow !== false,
    receiveShadow: true,
    collidable: preset.collidable !== false,
    locked: false,
    visible: true,
    height: preset.height,
  });
}

export const BUNDLED_FURNITURE = Object.freeze([
  bundledFurniture('tram-station', 'furniture:tram-station-base', [16, 0, 6]),
  bundledFurniture('b54-simulator', 'furniture:b54-simulator-base', [-14, 0, 18]),
  bundledFurniture('city-map', 'furniture:city-map-base', [0, -0.2, 42]),
  // Perchero de Chelo montado en la pared izquierda del local, reemplazando al
  // barral procedural. Gira 90 grados para quedar contra el muro (x = -3).
  // Si la posicion no convence, se mueve con `T` como cualquier mueble.
  bundledFurniture(
    'fourtwenty-rack-display',
    'furniture:fourtwenty-rack-local',
    [-2.86, 1.55, -7.0],
    [0, Math.PI / 2, 0],
  ),
]);

export function searchableModelPresets() {
  return Object.entries(ADDABLE_MODELS)
    .filter(([, preset]) => preset.model)
    .map(([key, preset]) => ({ key, ...preset }));
}
