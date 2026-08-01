// Qué minijuego abre el arcade de cada piso.
//
// Por qué existe este archivo: antes `bobsMaze.js` se importaba de forma
// estática en main.js, así que sus ~620 líneas viajaban en el bundle inicial y
// se las descargaba todo el mundo, entrara o no a jugar. Acá cada juego se pide
// con `import()` dinámico: Vite lo separa en su propio chunk y el navegador solo
// lo baja cuando alguien aprieta el botón rojo del arcade.
//
// El import dinámico se resuelve ACÁ, no adentro del minigameManager: el manager
// recibe siempre una factory normal y sincrónica, así su contrato genérico
// (mount/destroy obligatorios, start/pause/resize opcionales) queda simple y no
// tiene que saber nada de carga.
//
// ⚠️ Estado actual (pedido de Kusher): los cinco destinos abren BOB'S MAZE a
// propósito, para probar recorrido y rendimiento con la máquina repetida en
// todos los pisos. El mapa de abajo ya está listo para que cada piso apunte a su
// propio juego cuando se aprueben los diseños — se cambia una línea por piso.

// destino → cómo cargar su juego. La función devuelve la factory del juego.
const LOADERS = {
  1: loadBobsMaze, // ORIGEN
  2: loadBobsMaze, // HOOP SEASON  → futuro: básquet
  3: loadBobsMaze, // CULTURA
  4: loadBobsMaze, // BOB
  5: loadBobsMaze, // TERRAZA
};

async function loadBobsMaze() {
  const { createBobsMazeGame } = await import('./bobsMaze.js');
  return createBobsMazeGame;
}

// Un juego ya descargado no se vuelve a pedir: la segunda partida abre al toque.
const cache = new Map();
// Evita que dos toques seguidos al botón disparen dos descargas del mismo chunk.
const inFlight = new Map();

export function hasMinigame(destinationId) {
  return Object.hasOwn(LOADERS, Number(destinationId));
}

/**
 * Devuelve la factory del minijuego de ese piso, o null si el piso no tiene o
 * si la descarga falló (el juego no abre, pero el simulador sigue andando).
 */
export function loadMinigame(destinationId) {
  const id = Number(destinationId);
  if (cache.has(id)) return Promise.resolve(cache.get(id));
  if (inFlight.has(id)) return inFlight.get(id);

  const loader = LOADERS[id];
  if (!loader) return Promise.resolve(null);

  const pending = loader()
    .then((factory) => {
      cache.set(id, factory);
      inFlight.delete(id);
      return factory;
    })
    .catch((err) => {
      inFlight.delete(id); // que un fallo de red no deje el botón muerto
      console.warn(`[minijuegos] no se pudo cargar el juego del piso ${id}`, err);
      return null;
    });

  inFlight.set(id, pending);
  return pending;
}
