export const MODEL_CATALOG_MIGRATION_KEY = 'fourtwenty-editor-model-catalog-v3';

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

// ---- PACK BABILONIA — los 25 GLB que trajo Fer (03/09) ---------------------
//
// Todos con Draco, 3,4 MB en total. Aparecen en el buscador de `T` para que
// Kusher los coloque a mano, que es como se arman los pisos desde que quedaron
// vacios.
//
// ⚠️ NINGUNO LLEVA `height`. Eso es a proposito: cuando el catalogo no dice
// altura, `loadFurnitureModel` NO reescala y el modelo entra con el tamaño que
// le dio Fer. Poner una altura acá lo estiraria o achicaria contra su medida
// real, que es justo lo que no queremos — un banquito y un mostrador no miden
// lo mismo y Fer ya los modelo a escala.
//
// `searchTerms` va sin acentos y con las palabras que usaria Kusher buscando
// ("perchero", "espejo", "probador"), no con el nombre del archivo en ingles.
function babilonia(carpeta, archivo, name, searchTerms, extra = {}) {
  return {
    name,
    model: `assets/babilonia/${carpeta}/${archivo}.glb`,
    castShadow: true,
    collidable: true,
    searchTerms,
    ...extra,
  };
}

const PACK_BABILONIA = {
  // --- Muebles de tienda ---
  'bab-mostrador': babilonia('muebles', 'counter-checkout-01', 'Babilonia · Mostrador de caja', 'mostrador caja counter checkout local'),
  'bab-probador-doble': babilonia('muebles', 'frame-fitting-double-01', 'Babilonia · Probador doble', 'probador vestidor fitting doble cortina'),
  'bab-espejo-1': babilonia('muebles', 'mirror-fitting-01', 'Babilonia · Espejo de probador 1', 'espejo mirror probador vestidor'),
  'bab-espejo-2': babilonia('muebles', 'mirror-fitting-02', 'Babilonia · Espejo de probador 2', 'espejo mirror probador vestidor'),
  'bab-exhibidor-mostrador': babilonia('muebles', 'rack-counter-display-01', 'Babilonia · Exhibidor de mostrador', 'exhibidor mostrador vitrina rack display'),
  'bab-perchero-ornado': babilonia('muebles', 'rack-freestanding-ornate-01', 'Babilonia · Perchero de pie ornamentado', 'perchero parante ornamentado rack ropa'),
  'bab-perchero-pared-1': babilonia('muebles', 'rack-wall-clothing-01', 'Babilonia · Perchero de pared 1', 'perchero pared barral ropa rack'),
  'bab-perchero-pared-2': babilonia('muebles', 'rack-wall-clothing-02', 'Babilonia · Perchero de pared 2', 'perchero pared barral ropa rack'),
  'bab-grilla-pared': babilonia('muebles', 'rack-wall-grid-01', 'Babilonia · Grilla de pared', 'grilla reja pared rack grid exhibidor'),
  'bab-barral-1': babilonia('muebles', 'rod-fitting-01', 'Babilonia · Barral 1', 'barral tubo caño colgar ropa rod'),
  'bab-barral-2': babilonia('muebles', 'rod-fitting-02', 'Babilonia · Barral 2', 'barral tubo caño colgar ropa rod'),
  'bab-estante-bolsos': babilonia('muebles', 'shelf-bag-display-01', 'Babilonia · Estante de bolsos', 'estante bolsos carteras mochilas shelf'),
  'bab-estante-doblada': babilonia('muebles', 'shelf-folded-display-01', 'Babilonia · Estante de ropa doblada', 'estante ropa doblada pila shelf'),
  'bab-estante-zapatillas': babilonia('muebles', 'shelf-shoe-wall-01', 'Babilonia · Estante de zapatillas', 'estante zapatillas zapatos calzado pared shelf'),
  'bab-sofa': babilonia('muebles', 'sofa-retail-01', 'Babilonia · Sofa de local', 'sofa sillon banco asiento local'),
  'bab-banqueta-1': babilonia('muebles', 'stool-round-01', 'Babilonia · Banqueta redonda 1', 'banqueta taburete asiento redondo stool'),
  'bab-banqueta-2': babilonia('muebles', 'stool-round-02', 'Babilonia · Banqueta redonda 2', 'banqueta taburete asiento redondo stool'),
  'bab-mesa-exhibicion': babilonia('muebles', 'table-display-01', 'Babilonia · Mesa de exhibicion', 'mesa exhibicion display muestra'),

  // --- Arcades y exhibidores ---
  'bab-arcade-carreras': babilonia('arcades-y-exhibidores', 'arcade-car-racer', 'Babilonia · Arcade de carreras', 'arcade maquina juego carreras auto racer fichin'),
  'bab-arcade-pistola': babilonia('arcades-y-exhibidores', 'arcade-light-gun', 'Babilonia · Arcade de pistola', 'arcade maquina juego pistola disparo fichin'),
  'bab-arcade-pacman': babilonia('arcades-y-exhibidores', 'arcade-pacman', 'Babilonia · Arcade Pacman', 'arcade maquina juego pacman comecocos fichin'),
  'bab-arcade-espada': babilonia('arcades-y-exhibidores', 'arcade-zany-sword', 'Babilonia · Arcade de espadas', 'arcade maquina juego espada sword fichin'),
  // El mas caro del pack: 1,6 MB y 45 mallas, o sea 45 llamadas de dibujo.
  // Ademas se coloca solo en HOOP SEASON (ver `addThemeDetails`); sigue en el
  // catalogo por si Kusher lo quiere en otro lado.
  'bab-display-kobe': babilonia('arcades-y-exhibidores', 'display-kobe', 'Babilonia · Exhibidor Kobe', 'kobe basket vitrina exhibidor display hoop'),

  // --- Autos ---
  // ⚠️ Estos dos YA son los autos del juego desde el 03/09: sus archivos se
  // copiaron sobre `assets/cars/car-up-luca.glb` y `car-corolla-fer.glb`.
  // Quedan aca por si se quiere poner una copia decorativa en algun lado.
  'bab-pepper': babilonia('autos', 'pepper-optimizado', 'Babilonia · VW up! Pepper (decorativo)', 'auto coche pepper volkswagen up decorativo'),
  'bab-toyota': babilonia('autos', 'toyota-optimizado', 'Babilonia · Toyota Corolla (decorativo)', 'auto coche toyota corolla decorativo'),
};

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
  ...PACK_BABILONIA,
  'kenney-house-a': kenneyBuilding('building-sample-house-a', 'Casa A', 10),
  'kenney-house-b': kenneyBuilding('building-sample-house-b', 'Casa B', 11),
  'kenney-house-c': kenneyBuilding('building-sample-house-c', 'Casa C', 10),
  'kenney-tower-a': kenneyBuilding('building-sample-tower-a', 'Torre A', 24),
  'kenney-tower-b': kenneyBuilding('building-sample-tower-b', 'Torre B', 21),
  'kenney-tower-c': kenneyBuilding('building-sample-tower-c', 'Torre C', 27),
  'kenney-tower-d': kenneyBuilding('building-sample-tower-d', 'Torre D', 31),
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
