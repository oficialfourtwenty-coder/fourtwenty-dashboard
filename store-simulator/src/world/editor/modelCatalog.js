export const MODEL_CATALOG_MIGRATION_KEY = 'fourtwenty-editor-model-catalog-v3';

const KENNEY_CITY_PATH = 'assets/furniture/kenney-modular-city';
const BABILONIA_ASSETS_PATH = 'assets/babilonia';

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

function babiloniaModel(folder, file, name, height, searchTerms, {
  castShadow = true,
  collidable = true,
} = {}) {
  return {
    name: `Babilonia · ${name}`,
    model: `${BABILONIA_ASSETS_PATH}/${folder}/${file}.glb`,
    height,
    castShadow,
    collidable,
    searchTerms: `babilonia optimizado fer ${searchTerms}`,
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

  // Pack optimizado por Fer. No se carga al iniciar: aparece en el buscador
  // del World Editor al escribir "Babilonia" y recien ahi se descarga el GLB.
  'babilonia-counter-checkout': babiloniaModel('muebles', 'counter-checkout-01', 'Mueble · Mostrador checkout', 1.05, 'mueble mostrador counter checkout caja'),
  'babilonia-frame-fitting-double': babiloniaModel('muebles', 'frame-fitting-double-01', 'Mueble · Probador doble', 2.35, 'mueble probador fitting frame doble'),
  'babilonia-mirror-fitting-01': babiloniaModel('muebles', 'mirror-fitting-01', 'Mueble · Espejo de probador 01', 2.1, 'mueble espejo mirror fitting probador'),
  'babilonia-mirror-fitting-02': babiloniaModel('muebles', 'mirror-fitting-02', 'Mueble · Espejo de probador 02', 2.1, 'mueble espejo mirror fitting probador'),
  'babilonia-rack-counter-display': babiloniaModel('muebles', 'rack-counter-display-01', 'Mueble · Rack exhibidor de mostrador', 1.35, 'mueble rack exhibidor display counter'),
  'babilonia-rack-freestanding-ornate': babiloniaModel('muebles', 'rack-freestanding-ornate-01', 'Mueble · Rack central ornamentado', 1.8, 'mueble rack central freestanding ornate perchero'),
  'babilonia-rack-wall-clothing-01': babiloniaModel('muebles', 'rack-wall-clothing-01', 'Mueble · Rack de pared 01', 2.1, 'mueble rack pared wall clothing perchero'),
  'babilonia-rack-wall-clothing-02': babiloniaModel('muebles', 'rack-wall-clothing-02', 'Mueble · Rack de pared 02', 2.1, 'mueble rack pared wall clothing perchero'),
  'babilonia-rack-wall-grid': babiloniaModel('muebles', 'rack-wall-grid-01', 'Mueble · Panel rack de pared', 2.1, 'mueble rack panel pared wall grid'),
  'babilonia-rod-fitting-01': babiloniaModel('muebles', 'rod-fitting-01', 'Mueble · Barral de probador 01', 0.06, 'mueble barral rod fitting perchero'),
  'babilonia-rod-fitting-02': babiloniaModel('muebles', 'rod-fitting-02', 'Mueble · Barral de probador 02', 0.06, 'mueble barral rod fitting perchero'),
  'babilonia-shelf-bag-display': babiloniaModel('muebles', 'shelf-bag-display-01', 'Mueble · Estantería para bolsos', 2.2, 'mueble estanteria shelf bag display bolsos'),
  'babilonia-shelf-folded-display': babiloniaModel('muebles', 'shelf-folded-display-01', 'Mueble · Estantería para ropa doblada', 2.2, 'mueble estanteria shelf folded display ropa'),
  'babilonia-shelf-shoe-wall': babiloniaModel('muebles', 'shelf-shoe-wall-01', 'Mueble · Estantería de zapatos', 2.2, 'mueble estanteria shelf shoe wall zapatos'),
  'babilonia-sofa-retail': babiloniaModel('muebles', 'sofa-retail-01', 'Mueble · Sofá de local', 0.9, 'mueble sofa sillon retail banco'),
  'babilonia-stool-round-01': babiloniaModel('muebles', 'stool-round-01', 'Mueble · Banco redondo 01', 0.48, 'mueble banco stool round asiento'),
  'babilonia-stool-round-02': babiloniaModel('muebles', 'stool-round-02', 'Mueble · Banco redondo 02', 0.48, 'mueble banco stool round asiento'),
  'babilonia-table-display': babiloniaModel('muebles', 'table-display-01', 'Mueble · Mesa exhibidora', 0.85, 'mueble mesa table display exhibidor'),

  'babilonia-arcade-car-racer': babiloniaModel('arcades-y-exhibidores', 'arcade-car-racer', 'Arcade · Carreras', 1.9, 'arcade auto carrera racer juego'),
  'babilonia-arcade-light-gun': babiloniaModel('arcades-y-exhibidores', 'arcade-light-gun', 'Arcade · Disparos', 1.9, 'arcade disparos pistola light gun juego', { castShadow: false }),
  'babilonia-arcade-pacman': babiloniaModel('arcades-y-exhibidores', 'arcade-pacman', 'Arcade · Pac-Man', 1.9, 'arcade pacman pac man juego'),
  'babilonia-figure-zany-sword': babiloniaModel('arcades-y-exhibidores', 'arcade-zany-sword', 'Exhibidor · Figura Zany Sword', 1.9, 'exhibidor figura estatua zany sword fnaf'),
  'babilonia-display-kobe': babiloniaModel('arcades-y-exhibidores', 'display-kobe', 'Exhibidor · Kobe', 2.45, 'exhibidor estatua kobe basket basketball', { castShadow: false }),

  // Por ahora son modelos decorativos editables. No reemplazan los autos
  // manejables ni agregan colisiones o interacciones de vehículo.
  'babilonia-auto-pepper': babiloniaModel('autos', 'pepper-optimizado', 'Auto decorativo · Pepper', 1.5, 'auto carroceria pepper coche', { castShadow: false, collidable: false }),
  'babilonia-auto-toyota': babiloniaModel('autos', 'toyota-optimizado', 'Auto decorativo · Toyota', 1.55, 'auto carroceria toyota coche', { castShadow: false, collidable: false }),
});

// ⚠️ LAS REMERAS NO VAN EN `ADDABLE_MODELS`.
// Estuvieron aca y era un error: agregar una por esa via la creaba como un GLB
// cualquiera, sin `userData.garmentModel`. Kusher podia ponerla en el piso pero
// el click derecho no la reconocia como prenda, asi que no se podia diseñar.
// Ahora se agregan por `prenda:<clave>` en `worldEditor.js`, que pasa por
// `addGarmentModel` — el unico camino que le pone la marca, le clona el
// material, la endereza y le aplica el diseño guardado.

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

// ⚠️ LA TRAM STATION YA NO ESTA EN BURELA (10/08, pedido de Kusher).
// Es el objeto mas caro del mundo: 1,5 MB, 227.222 triangulos y 42 llamadas de
// dibujo. Y estaba puesta ahi solo para que el juego del paquete tuviera adonde
// entregar. Peor: Kusher ya la tenia OCULTA en su layout, pero el GLB se bajaba
// igual —el codigo carga el archivo y recien despues le aplica el "invisible"—
// asi que se pagaba entera por algo que no se veia.
// Ahora la carga la mision, en su propia escena. Ver `packageStationMission.js`.
// Sigue en `ADDABLE_MODELS`: se puede volver a poner a mano desde `T`.
export const BUNDLED_FURNITURE = Object.freeze([
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
