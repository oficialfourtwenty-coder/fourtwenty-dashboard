export const MODEL_CATALOG_MIGRATION_KEY = 'fourtwenty-editor-model-catalog-v1';

export const ADDABLE_MODELS = Object.freeze({
  cantero: {
    name: 'Cantero',
    sourceId: 'calle-kit:26',
  },
  'apartment-building': {
    name: 'Edificio GLB Burela · apartment-building',
    model: 'assets/furniture/apartment-building.glb',
    height: 20,
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
    castShadow: true,
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
});

function bundledFurniture(key, id, position) {
  const preset = ADDABLE_MODELS[key];
  return Object.freeze({
    id,
    name: preset.name,
    type: 'furniture',
    model: preset.model,
    position: Object.freeze(position),
    rotation: Object.freeze([0, 0, 0]),
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
]);

export function searchableModelPresets() {
  return Object.entries(ADDABLE_MODELS)
    .filter(([, preset]) => preset.model)
    .map(([key, preset]) => ({ key, ...preset }));
}
