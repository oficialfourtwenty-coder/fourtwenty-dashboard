export const MODEL_CATALOG_MIGRATION_KEY = 'fourtwenty-editor-model-catalog-v2';

const KENNEY_CITY_PATH = 'assets/furniture/kenney-modular-city';

function kenneyBuilding(file, name, height) {
  return {
    name: `Ciudad Kenney · ${name}`,
    model: `${KENNEY_CITY_PATH}/${file}.glb`,
    height,
    castShadow: false,
    collidable: false,
    searchTerms: `kenney ciudad edificio modular ${name.toLowerCase()}`,
  };
}

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
  'kenney-house-a': kenneyBuilding('building-sample-house-a', 'Casa A', 10),
  'kenney-house-b': kenneyBuilding('building-sample-house-b', 'Casa B', 11),
  'kenney-house-c': kenneyBuilding('building-sample-house-c', 'Casa C', 10),
  'kenney-tower-a': kenneyBuilding('building-sample-tower-a', 'Torre A', 24),
  'kenney-tower-b': kenneyBuilding('building-sample-tower-b', 'Torre B', 21),
  'kenney-tower-c': kenneyBuilding('building-sample-tower-c', 'Torre C', 27),
  'kenney-tower-d': kenneyBuilding('building-sample-tower-d', 'Torre D', 31),
});

function bundledFurniture(key, id, position, { rotation = [0, 0, 0] } = {}) {
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
  // Fondo lateral este: fuera del limite caminable, mirando hacia Burela.
  bundledFurniture('kenney-tower-d', 'furniture:kenney-city-east-1', [43, 0, -27], { rotation: [0, -Math.PI / 2, 0] }),
  bundledFurniture('kenney-house-b', 'furniture:kenney-city-east-2', [41, 0, -14], { rotation: [0, -Math.PI / 2, 0] }),
  bundledFurniture('kenney-tower-a', 'furniture:kenney-city-east-3', [45, 0, -2], { rotation: [0, -Math.PI / 2, 0] }),
  bundledFurniture('kenney-house-c', 'furniture:kenney-city-east-4', [42, 0, 10], { rotation: [0, -Math.PI / 2, 0] }),
  bundledFurniture('kenney-tower-c', 'furniture:kenney-city-east-5', [48, 0, 22], { rotation: [0, -Math.PI / 2, 0] }),
  bundledFurniture('kenney-house-a', 'furniture:kenney-city-east-6', [57, 0, -20], { rotation: [0, -Math.PI / 2, 0] }),
  bundledFurniture('kenney-tower-b', 'furniture:kenney-city-east-7', [59, 0, 4], { rotation: [0, -Math.PI / 2, 0] }),

  // Fondo trasero: una segunda silueta urbana detras del local y las torres.
  bundledFurniture('kenney-tower-b', 'furniture:kenney-city-back-1', [-34, 0, -51]),
  bundledFurniture('kenney-house-a', 'furniture:kenney-city-back-2', [-23, 0, -48]),
  bundledFurniture('kenney-tower-c', 'furniture:kenney-city-back-3', [-12, 0, -55]),
  bundledFurniture('kenney-house-c', 'furniture:kenney-city-back-4', [0, 0, -49]),
  bundledFurniture('kenney-tower-d', 'furniture:kenney-city-back-5', [13, 0, -58]),
  bundledFurniture('kenney-house-b', 'furniture:kenney-city-back-6', [25, 0, -49]),
  bundledFurniture('kenney-tower-a', 'furniture:kenney-city-back-7', [36, 0, -54]),
]);

export function searchableModelPresets() {
  return Object.entries(ADDABLE_MODELS)
    .filter(([, preset]) => preset.model)
    .map(([key, preset]) => ({ key, ...preset }));
}
