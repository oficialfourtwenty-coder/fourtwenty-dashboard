# Simulador Bobilonia Maestro - contexto obligatorio

Ultima actualizacion documental: 3 de septiembre de 2026.

**El plan de trabajo vigente esta en la seccion 3.** Es el orden que decidio
Kusher el 03/09 y es lo que hay que mirar antes de elegir en que trabajar.

Este archivo es la fuente de contexto que deben leer Claude, Claude Code, Codex
y cualquier colaborador antes de trabajar. El dueno no programa: explicar los
cambios con palabras simples, mostrar como probarlos y no asumir decisiones de
producto que no esten escritas aqui.

## 1. Fuente de verdad y version oficial

- Repositorio: `oficialfourtwenty-coder/fourtwenty-dashboard`.
- **Carpeta de trabajo real: `/Users/kusher/Documents/simulador/auditoria-rendimiento`.**
  Es un worktree de git y es donde trabaja Codex y donde Kusher prueba
  (`http://127.0.0.1:5201/`). Ahi vive la rama oficial.
- ⚠️ `/Users/kusher/Desktop/fourtwenty-dashboard` es el clon original pero
  quedo en una rama vieja. `git switch` a la rama oficial FALLA ahi con
  "already checked out at .../auditoria-rendimiento" — git no permite la misma
  rama en dos worktrees. El 03/08 se perdio mas de una hora por esto: se
  probaba en la carpeta del Desktop creyendo que era la version nueva y faltaban
  el Banapod, el BOB rerenderizado y los pisos PS3. **Antes de dar por
  incompleta una version, correr `git worktree list` y confirmar en que carpeta
  se esta parado.** Mismo tipo de error que el lio de los dos `bob.glb` de
  julio.
- Otros worktrees sueltos (solo pruebas viejas, ninguno tiene trabajo unico):
  `Desktop/ft-probar-0bbbb13`, `ft-probar-a209171`, `ft-probar-interior`,
  `ft-probar-layout`.
- Aplicacion: `store-simulator/`.
- **Rama oficial actual: `version-3-de-septiembre-final`** (etiqueta
  `3-de-septiembre-final`). Aprobada por Kusher el 03/09 despues de probarla a
  mano. Contiene todo lo de `version-lunes-10-de-agosto` mas la rama
  `claude/todo-junto` entera y el trabajo del 03/09.
  Lo que suma sobre la del 10 de agosto:
  - Percheros vacios y las prendas GLB de Fer (5 modelos, 0,43 MB los cinco).
  - Los cinco pisos arrancan vacios + catalogo de muebles para armarlos a mano.
  - Miniatura de cada objeto en el editor.
  - Editor de diseño de las prendas GLB y cuadro duplicable.
  - Arreglo de los PNG de logos (el quitado de fondo rompia los ya recortados).
  - La estacion de tranvia se muda al mapa del juego del paquete.
  - Video de intro y autos comprimidos.
  - BOB comprimido con Draco (2,33 → 0,83 MB) y lector de GLB compartido.
  - Pantalla para elegir entre 10 BOBs al cargar la partida.
  - BOB usa sus tres clips: antes caminaba con la animacion de correr.
  - Primera carga medida: 17,16 → 15,44 MB.
  ⚠️ **PENDIENTE CONOCIDO Y ACEPTADO:** los pies de BOB se mueven bien pero los
  DEDOS quedan pegados al cuerpo. Es del rig, no del codigo, y Kusher lo va a
  pulir. Se aprobo la version igual. No "arreglarlo" tocando el codigo de
  animacion: el arreglo va en el modelo.
- Checkpoint anterior: `version-lunes-10-de-agosto` (etiqueta
  `lunes-10-de-agosto`), aprobada el 10/08. Esta incluida entera dentro de la
  rama nueva. Antes de esa, `version-lunes-3-de-agosto`.
- Respaldo mas viejo: `version-jueves-30` en `234e8e2`. No desarrollar sobre
  ese respaldo salvo pedido de Kusher.
- La rama oficial incluye el audio comprimido, el registro dinamico de juegos,
  la mision de la estacion, la auditoria de rendimiento, la Terraza PS3
  aprobada y la esfera optimizada de CULTURA.
- Lo que suma esta version sobre la del 3 de agosto:
  - Liberacion de editables y pilas al cerrar un piso (Codex). Antes una
    escena cerrada quedaba retenida entera: medido, 48 entradas por viaje.
  - El video de intro ya no puede colgar el juego para siempre. Ver la seccion
    del ascensor.
  - Prueba automatica del recorrido completo (`npm run smoke`) y herramienta de
    medicion de viajes (`npm run diagnostico`).
- Para conocer el commit exacto vigente usar
  `git rev-parse origin/version-3-de-septiembre-final`; no partir de un hash viejo
  escrito en una conversacion.
- Bitacora detallada vigente:
  `store-simulator/design/ESTADO_ACTUAL_Y_BITACORA.md`.
- Manual de vision y decisiones en Notion:
  `https://www.notion.so/3aba25d04bd08107bb9bf70276a2e561`.
- Checkpoint anterior: `version-lunes-13` en `551b429`.
- Respaldo historico: `domingo-12`.
- `codex/prueba-telefono` ya fue incorporada al checkpoint actual. No tratarla
  como la version mas nueva ni publicarla de nuevo.
- La rama remota `migracion-cloudflare` es una propuesta separada, todavia no
  integrada a la version oficial.
- Si GitHub y Notion difieren sobre archivos, ramas o commits, manda GitHub.
  Notion explica vision, decisiones y prioridades flexibles.

Antes de tocar codigo:

```bash
cd /Users/kusher/Desktop/fourtwenty-dashboard
git status --short --branch
git fetch origin
git switch version-3-de-septiembre-final
git pull --ff-only
```

El pase visual ya comenzo. La Terraza PS3 fue aprobada e integrada como patron
oficial; los otros pisos todavia necesitan su propio pase completo. El conjunto
aun no alcanzo el resultado final GTA V/PS3. Kusher decide el siguiente bloque
de trabajo y puede cambiar el orden del plan cuando lo desee.

## 2. Vision actual del producto

Simulador Bobilonia es una tienda de ropa web 3D de FOURTWENTY. BOB recorre una
recreacion de la calle y el local de Burela, descubre productos, usa autos,
musica, celular, ascensor, pisos tematicos, easter eggs y minijuegos, y debe
poder terminar una compra real.

Decisiones vigentes del dueno:

- Prioridad inmediata: web/escritorio.
- Mobile conserva su base actual, pero se adapta despues de cerrar la web.
- Objetivo visual: acercarse todo lo posible a GTA V en PlayStation 3, sin
  copiar assets ni intentar ejecutar el juego en una consola PS3.
- La experiencia debe sentirse como un juego 3D completo, pero mantenerse
  fluida y cargar solo lo necesario.
- La compra es la condicion de lanzamiento mas importante. Una experiencia
  hermosa sin compra real no sirve comercialmente.
- La posible plataforma para alquilar tiendas virtuales a otras marcas queda
  completamente pausada hasta 2027. No debe consumir trabajo actual.
- **FT$ SI va a existir** (decision del 03/09, cambia lo anterior). Es la moneda
  propia de la marca y es el motivo por el que hace falta el login: sin cuenta
  no hay donde guardar un saldo. Va en el **ultimo** paso del plan (seccion 3,
  paso 5), despues de la compra real. Hasta entonces no se construye ni la
  economia ni la base de saldos.

## 3. PLAN VIGENTE — el orden que decidio Kusher (03/09/2026)

**Esta es la lista de lo que falta, en el orden en que se hace.** La dicto
Kusher el 03/09 y reemplaza al calendario de agosto, que quedo viejo (ver
seccion 3.b, se conserva solo como referencia de lo ya hecho).

### Paso 1 — Texturas de los pisos

- Fer esta armando los cinco pisos, pero **le salen todos blancos**: geometria
  sin material.
- Falta ponerle **textura a todo**. Es el trabajo que esta abierto ahora.
- Encaja con el criterio de fondo del proyecto (seccion 5): la geometria simple
  esta bien, lo que hace que se vea como PS3 es la textura.

### Paso 2 — Prendas y sistema de compra

- Con los pisos ya armados, **cargar las prendas**.
- **Hacer el sistema de compra.** Sigue siendo la condicion de lanzamiento
  (seccion 7 y seccion 12): sin compra real verificada la version no es
  publicable.

### Paso 3 — Un juego por piso

- Cada piso tiene que tener su propio juego. Hoy los cinco abren el mismo
  (BOB'S MAZE) desde la arcade, solo para probar recorrido y rendimiento.
- Ya existe la capa generica de minijuegos y cada juego vive en su propio
  archivo `src/minigames/<juego>.js`, asi que ahi no hay conflicto entre
  agentes.
- ⚠️ **Antes del primer minijuego 3D hay que pausar el bucle de render
  principal** mientras el juego este abierto. Hoy el mundo se sigue dibujando
  por detras: con un juego 2D no se nota, con uno 3D si.

### Paso 4 — GLB finales y detalles de Burela

- Recien con los pisos amueblados, la compra andando y los juegos hechos:
  **cargar los GLB definitivos** y terminar los detalles del mundo de Burela.
- Se deja para despues a proposito: son los assets mas caros y no conviene
  congelarlos antes de saber que entra y que no.

### Paso 5 — Login, tu BOB y los FT$ (LO ULTIMO)

Decision de Kusher, textual: poder loguearse para usar **tu** BOB, y que
**como lo vistas, los FT$ que gastes y lo que hagas quede guardado** para
seguir usandolo.

⚠️ **Kusher decidio que esto va AL FINAL**, despues de la compra. Es su
decision y manda. Queda anotado aca lo que hay que tener en cuenta cuando se
llegue, no para discutirlo antes:

- **El saldo de FT$ NO puede vivir en el navegador, nunca.** Si vive ahi,
  cualquiera abre las herramientas del navegador, se escribe el saldo que
  quiera y lo canjea. No hace falta saber programar. **El saldo vive en el
  servidor** y el navegador solo puede pedir, nunca decidir. Es la misma regla
  que ya rige para el precio (seccion 7).
- **Lo mismo vale para el guardado del avatar**: hoy el BOB elegido y el layout
  viven en `localStorage`, o sea por computadora. Para que "tu BOB" te siga a
  otra maquina tiene que estar en el servidor, atado a la cuenta.
- **Tiendanube NO tiene login de clientes para apps externas.** No existe un
  "entra con tu cuenta de Tiendanube". Lo que si se puede: cuenta propia del
  simulador (mail y clave) y cruzar ese mail contra la API de clientes de
  Tiendanube del lado del servidor para reconocer al comprador.
- **FT$ y la compra necesitan el MISMO backend** (servidor, cuentas, base de
  datos, validacion del lado servidor). Como la compra va en el paso 2, para
  cuando se llegue al paso 5 ese backend ya deberia existir: los FT$ se montan
  encima, no se empieza de cero.
- **Consecuencia del orden elegido:** no tiene sentido dar FT$ antes de que
  exista el login, porque un saldo sin cuenta no se puede guardar ni defender.
  Los FT$ entran junto con el login, no antes.

### Vestir a BOB estilo GTA (queda dentro del paso 5)

- Kusher pregunto si en vez de 10 BOBs distintos se puede hacer **uno solo y
  vestirlo** con la ropa que compra adentro del simulador. **Si, y es mejor**:
  es como esta hecho GTA — un cuerpo, y las prendas son mallas aparte pegadas
  al mismo esqueleto. Fer ya modela las prendas en GLB.
- Se combina con lo que ya existe: se elige **pelaje** (los 10 de
  `bobSkins.js`, que cuestan 0 KB) **y** ropa.
- ⚠️ **Requisito duro: el rig definitivo de BOB, con los nombres de huesos
  congelados.** El rig fue reparado muchas veces; si cambia despues, toda prenda
  hecha antes deja de encajar. Es el mismo pendiente ya anotado en la seccion de
  prendas.
- Kusher ademas quiere **cargar el mismo los 10 BOBs a mano** cuando los tenga
  hechos. El sistema actual acepta las dos cosas: `BOB_SKINS` en
  `player/bobSkins.js` es una lista de recetas de color, y si algun dia hay
  modelos propios se cambia esa lista por archivos sin tocar la pantalla.

## 3.b Prioridades de agosto de 2026 (VIEJO — solo referencia)

⚠️ Este calendario vencio. El plan vigente es la seccion 3. Se conserva porque
explica por que estan hechas las cosas que estan hechas.

Las fechas siguientes son metas orientativas para no olvidar la compra. No son
un calendario rigido ni impiden que Kusher elija otra tarea. Ningun agente debe
rechazar una instruccion directa porque estaba anotada para otra semana.

### 1 al 14 de agosto: pase visual web

- Medir el estado actual antes de cambiarlo.
- Continuar las ramas de prueba visual que Kusher vaya autorizando.
- Preparar una escena patron: BOB, un tramo de Calle Burela, fachada/entrada,
  interior visible, un auto y ciclo de luz.
- Pasar del aspecto bloqueado/procedural actual a proporciones, modelos,
  texturas e iluminacion de juego PS3.
- Aprobar la escena patron antes de extenderla al resto.

### 15 al 23 de agosto: mundo y experiencias

- Extender el estilo aprobado a las zonas prioritarias.
- Mantener movimiento, colisiones, editor, autos, celular y ascensor.
- Completar los pisos y agregar solo los easter eggs/minijuegos que entren sin
  comprometer rendimiento ni la semana de compra.
- Preparar en paralelo credenciales, producto, talle, envio y consultas a las
  plataformas de pago. Esto no requiere frenar el pase visual.

### 24 al 31 de agosto: compra obligatoria

- Congelar nuevas mejoras esteticas.
- Implementar y probar una compra real de principio a fin.
- Si algo no entra en agosto, se recortan minijuegos o detalles secundarios,
  nunca el funcionamiento de compra.
- No declarar la version lanzable sin una compra real verificada.

Regla de trabajo real: Kusher trabaja por exploracion visual y funcional. Puede
pedir ahora un piso, despues una revista, despues una esfera o un minijuego. La
recomendacion de crear patrones reduce retrabajo, pero no limita su decision.

### Despues de cerrar web

- Adaptacion y optimizacion mobile.
- Minijuegos, apartamentos y easter eggs que hayan quedado pendientes.
- Mejoras visuales adicionales medidas contra rendimiento.

## 4. Estado funcional actual

### Mundo Burela Base

- La calle, complejo, local y entorno existen. Gran parte sigue construida con
  geometria procedural simple, por eso el dueno la describe como Minecraft.
- Se agregaron modelos GLB grandes y se escalaron para acercar las torres al
  tamano real. Al dueno le gusta esta direccion aunque siga incompleta.
- El fondo urbano lo dan ahora **7 edificios modulares de Kenney** (3 casas y
  4 torres) repartidos en 14 lugares: siete al este y siete atras. Reemplazan
  al City Map, que era un GLB monolitico puesto 4 veces. Medido: Burela paso de
  703 a 621 mallas y esa ciudad de 740 KB a 239 KB. Los siete estan en el
  catalogo de `T` como `Ciudad Kenney · Casa A` / `Torre A`, asi que Kusher
  puede seguir agregando.
- ⚠️ La migracion que hace ese cambio **borra del layout guardado los objetos
  cuyo modelo sea `city-map-free.glb`** y reescribe el localStorage
  (`saveLocalLayout`). Corre una sola vez, protegida por
  `MODEL_CATALOG_MIGRATION_KEY` (hoy `v2`). Todo lo demas que Kusher acomodo se
  conserva: la migracion recorre su layout y solo saca esos objetos. Si se
  agrega otra migracion parecida hay que subir esa clave, si no nunca corre.
- Quedan dos Tram Station para crear desnivel y vias, y siguen 5 copias de
  `apartment-building.glb` y 2 de `b54-ftt-lowpoly-simulator.glb`.
- Tram Station fue comprimido con Draco sin perder su edicion mediante `T`.
- El interior del local es la replica actual aprobada por el dueno. Conservar
  posiciones, entrada, espejo, luces y cambios guardados en el editor.
- El World Editor se abre con `T` o `Tab`: permite buscar, crear una copia
  delante de BOB, mover, rotar, escalar, duplicar, cambiar color y ajustar
  rango de luces.
- `Save Local` conserva cambios en el navegador de esa computadora. Para que
  Claude, Codex, Fer y GitHub los reciban, Kusher debe exportar el JSON y se
  debe revisar antes de reemplazar `public/assets/layouts/furniture-layout.json`.
- ⚠️ **AL 10/08 EL ARCHIVO DEL REPO ESTA ATRASADO.** `furniture-layout.json`
  tiene 328 objetos y no se toca desde el 01/08. Todo lo que Kusher acomodo
  despues vive SOLO en el localStorage de su Mac: no esta en GitHub, no lo
  tiene ningun agente, y **la version publica se arma con el archivo del repo,
  no con su navegador**. Si se vacia la cache o se usa otra computadora, ese
  trabajo no aparece.
  Pendiente concreto: que Kusher use **EXPORTAR JSON** y lo mande. Antes de
  reemplazar el archivo hay que comparar contra el actual y decirle que cambio;
  no pisarlo a ciegas.
  Lo mismo vale para los diseños de cuadros, que tienen su propio EXPORTAR JSON.

### BOB

- Modelo activo: `public/assets/bob/bob.glb`, **0,83 MB con Draco** (03/09).
  Antes eran 2,33 MB sin comprimir: era el archivo mas pesado de la primera
  carga. El original sin comprimir queda en `source-assets/bob/` (esa carpeta
  no se publica) y ademas vive en el historial de git, en `f1c4a10`.
- ⚠️ **AHORA NECESITA UN LECTOR CON DRACO.** Un `GLTFLoader` pelado no lo abre y
  **no da error**: BOB simplemente no aparece y se cae al muñeco de respaldo.
  Por eso ya no se crea ningun lector suelto — ver la seccion del lector
  compartido mas abajo.
- Como se verifico que comprimirlo no lo rompe (no alcanza con mirar el peso):
  se renderizaron las dos versiones en la MISMA pose, con los tres clips, y se
  compararon pixel por pixel. Resultado: la caja del modelo ya deformado
  coincide hasta 0,10 mm, y de 134.400 pixeles solo 16 cambian de verdad
  (0,01%); el resto se mueve 1,5/255, que es invisible. Los 41 huesos y los 3
  clips quedan intactos.
  ⚠️ Comparar los vertices por indice NO sirve: Draco los reordena y da errores
  de 994 mm que parecen catastroficos y son un espejismo.
- **Tiene 3 clips: `BOB_idle`, `BOB_walk` y `BOB_run`** (41 huesos).
  ⚠️ Hasta el 03/09 el codigo usaba UNO. Buscaba el clip de movimiento con
  `/run|walk|jog|move/` y `Array.find` devuelve el PRIMERO que coincide, que en
  el orden del archivo es `BOB_run`: **BOB caminaba con la animacion de correr,
  ralentizada**, y el clip de caminata estaba ahi sin usar. Ahora se mezclan los
  tres en dos tramos (quieto→caminata de 0 a 3,4 m/s, caminata→corrida de 3,4 a
  5,8). Verificado midiendo los pesos: quieto idle=1, caminando walk=1,
  corriendo run=1.
- Antes de producir muchas prendas 3D se necesita un rig definitivo, estable,
  con nombres de huesos congelados y una prenda piloto verificada.
- Las dos texturas del GLB (`bob_basecolor` 156 KB y `bob_normal_fur` 345 KB,
  las dos 1024x1024) son ya la mitad del peso del archivo. Draco comprime la
  MALLA, no las texturas. Bajarlas es el proximo ahorro posible (~150-200 KB),
  pero toca al personaje protagonista: no hacerlo sin comparar a ojo.

### El dedo pegado al muslo: son DOS problemas, no uno

Aparece en todo modelo hecho con IA (Tripo, Meshy) porque se generan en pose de
reposo con las manos apoyadas en los muslos. Arreglar uno solo no alcanza y la
version "arreglada" se ve igual de mal:

1. **Los PESOS.** Hay vertices pintados con la mano y con la pierna a la vez, asi
   que la mano viaja con la pierna. Se arregla con
   `tools/rig/despegar-cadenas.mjs`. ⚠️ **Sin umbral**: un residuo de 0,01 de
   muslo en un vertice de la mano ya arrastra 160 mm en una zancada.
2. **La PIEL.** La mano y el muslo son literalmente **la misma superficie**:
   hay triangulos que los cosen. Los pesos correctos hacen que cada parte
   obedezca a su hueso, pero la piel cosida se estira como una membrana entre
   las dos. Se arregla con `tools/rig/descoser-manos.mjs`, que corta esos
   triangulos y tapa los agujeros.

Medido en el modelo de Meshy: los pesos solos bajaron el arrastre de la mano de
7.888 mm a 0,0 mm **y aun asi se veia la membrana**. El corte la saco: pintando
el reves de la piel de rojo, los pixeles de agujero pasan de 20,4% a 0,8%.

⚠️ **Como se comprueba, y como NO.** Mirar la silueta no sirve: yo di por bueno
un arreglo mirando fotos donde la membrana parecia una sombra. Lo que sirve es
pintar el reves de rojo y contar pixeles, y comparar el **mismo cuadro exacto**
de la animacion en las dos versiones — con distinto cuadro no se puede concluir
nada. Y antes de creerle a cualquier medicion de movimiento, pasarle una pose de
rotacion CERO: tiene que dar 0,0000 mm.

### Elegir BOB al cargar la partida

- Al apretar **ENTRAR A BOBILONIA** aparece una pantalla con **10 BOBs** para
  elegir. El elegido queda guardado y es con el que se juega.
  `src/ui/bobSelect.js` + `src/player/bobSkins.js`.
- ⚠️ **NO son 10 archivos.** Diez GLB distintos serian 8,3 MB, casi la mitad del
  presupuesto entero de primera carga, para un solo detalle. Es UN `bob.glb` con
  10 recetas de color: se lee la luminancia del atlas de pelaje y se la mapea a
  una rampa de dos colores en un `<canvas>`. El dibujo del pelo se conserva
  entero, solo cambia la paleta. **Costo de descarga de los 10: 0 KB.**
  Misma idea con la que se pintan las prendas GLB en `garmentGlbEditor.js`.
- El BOB 0 es el original de la marca, con su textura sin tocar. Es el que sale
  por defecto y no se le aplica ningun repintado.
- `gamma` por skin corre el punto medio de la rampa. Hace falta: el atlas de BOB
  es casi todo medios tonos, y sin eso NOCHE, HUMO, NIEVE y BURELA salian los
  cuatro gris raton, indistinguibles.
- Las 10 fotos de la pantalla **se renderizan con el modelo de verdad** en el
  momento (256 px, un renderer aparte que se suelta al terminar). No son PNG
  guardados: si Fer cambia a BOB, las diez fotos cambian solas.
  ⚠️ `preserveDrawingBuffer: true` es obligatorio o `toDataURL` sale en negro.
  ⚠️ Al terminar se hace `renderer.dispose()` + `forceContextLoss()`: un contexto
  WebGL abierto cuenta contra el limite del navegador y despues el juego se
  queda sin poder crear el suyo.
- La eleccion vive en `localStorage` (`ft-bob-elegido-v1`), o sea **por
  computadora**, igual que el layout del editor y los diseños de las prendas.
- ⚠️ **LA PANTALLA NO SE SALTEA CON ESCAPE** — es una eleccion, no un video. Las
  pruebas automaticas tienen que apretarle el boton `#bob-select .bs-go`; si se
  lo olvidan, el juego nunca arranca y los seis destinos fallan por algo que no
  tiene nada que ver con el ascensor. Ya esta contemplado en `recorrido.mjs` y
  en `diagnostico-viajes.mjs`.
- La pantalla tiene ademas un campo para el **link de la cuenta de FOURTWENTY en
  Tiendanube** (`src/data/cuentaTiendanube.js`). Es SOLO un link guardado: si
  una prenda todavia no tiene su link de compra propio, el boton COMPRAR lleva
  ahi en vez de no hacer nada. **No es un login y no tiene nada que ver con
  cobrar.** Se valida que sea `http(s)` — sin eso, un `javascript:` pegado en el
  campo se ejecutaria al apretar COMPRAR. Nunca guardar ahi una credencial: es
  el navegador, cualquiera lo lee.

### Lector de GLB compartido — no crear nunca uno suelto

- `src/world/gltfLoaders.js` exporta `gltfLoader()`: **un solo** `GLTFLoader`
  para todo el simulador, ya con Draco puesto.
- ⚠️ **REGLA: no escribir `new GLTFLoader()` en ningun otro archivo.**
- Por que existe: un lector pelado no abre un archivo Draco y **falla en
  silencio**. Ya casi pasa dos veces. El 10/08 con los autos (`cars.js` tenia el
  suyo y se detecto de casualidad antes de subirlo). El 03/09 al comprimir a BOB
  aparecio que habia **DOS** lugares cargando `bob.glb` con lector pelado:
  `player/bob3d.js` y `world/gallery.js` (la estatua gigante). Mientras cada
  archivo se arme su propio lector, comprimir cualquier GLB es una ruleta.
- Bonus medido: antes habia DOS `DRACOLoader` vivos (`cars.js` y `furniture.js`)
  y cada uno levanta su propia tanda de workers. Ahora es uno.
- Para comprobar que los modelos siguen apareciendo despues de comprimir algo:
  `npm run modelos` (cuenta huesos, triangulos y mallas de verdad en el
  navegador). Un GLB que no se puede leer no da error — contar es la unica forma
  de saberlo.

### Autos y musica

- Autos GLB activos:
  `public/assets/cars/car-corolla-fer.glb` y
  `public/assets/cars/car-up-luca.glb`.
- Ambos conservan colision, entrada, interaccion, radio y posicion editable.
- Al entrar cambia a una imagen interior. La radio central abre la misma musica
  que controla el celular.
- Playlists actuales por carpetas: `musica/fer/` y `musica/luca/`.
- Objetivo futuro: 33 canciones totales, incluyendo beats, presentadas por
  artista y tema en una interfaz de celular redisenada.
- Los 11 temas activos estan en MP3 mono, 44.1 kHz y 96 kbps: aproximadamente
  26 MB en total. Los masters WAV quedan fuera del build publicado.
- Toda musica nueva debe comprimirse antes de incorporarla a la rama oficial.
- Cada artista debe dar permiso por escrito.

### Celular

- Se abre con `C`.
- Opcion 1: Musica.
- Opcion 2: Carrito base. Falta su experiencia final y conexion con compra.
- Opcion 3: RELOJ. Permite hora real/manual y controla sol, luna, cielo y luz.
- Opcion 4: reservada.
- Falta el rediseño visual definitivo de artistas, beats, canciones y carrito.
- No hay un sistema meteorologico completo; existe control horario y de luz.

### Entrada al simulador

- La pantalla de inicio muestra **BOBILONIA** sobre el primer frame del video
  de intro (`assets/ui/bobilonia-intro-poster.webp`, 70 KB) y un boton
  **ENTRAR A BOBILONIA**.
- Al apretarlo se reproduce `assets/ui/bobilonia-intro.mp4` (59 s, 11 MB) y
  despues arranca el simulador. Se saltea con `Esc` o click.
- **El video NO entra en la primera carga**: es `preload="none"` y recien se
  pide al apretar el boton. Antes de eso solo se baja el poster. Verificado
  midiendo las descargas: el mp4 no aparece hasta el click.
- Sus 59 segundos son ademas tiempo gratis para que el mundo termine de
  cargar detras.
- Comprimido de 24 MB (1080p HEVC .MOV) a 11 MB con
  `-crf 30 -maxrate 1500k -bufsize 3000k`. Se comparo contra CRF 26 (18 MB)
  recortando el mismo frame de las dos: no se ve diferencia, ni en el texto
  chico de la bolsa del delivery. No bajar mas sin volver a comparar.

### Ascensor y pisos

- Destinos: 0 Calle Burela, 1 ORIGEN, 2 HOOP SEASON, 3 CULTURA, 4 BOB,
  5 Terraza.
- Videos de entrada por piso: CULTURA, Terraza y HOOP SEASON (este ultimo
  sumado el 03/08). Se saltean con `Esc` o click. Para sumar el video de otro
  piso hay tres lugares y ninguno mas: el `<video>` en `index.html`, su clase
  en el CSS de `#loading-screen`, y una linea en `ELEVATOR_INTROS` de
  `main.js`. Los originales sin comprimir van a `store-simulator/source-assets/ui/`
  (esa carpeta no se publica) y el comprimido a `public/assets/ui/`.
- ⚠️ **`stalled` y `abort` NO deben cortar un video de intro** (`playElevatorIntro`
  en `main.js`). Los dos son falsos positivos: `stalled` salta mientras el
  navegador todavia buffferea (los mp4 son `preload="none"`), y `abort` lo
  dispara el propio `video.load()` de `showElevatorIntroFrame` cuando ya habia
  una carga en curso — el video moria en el frame 0 y la escena siguiente se
  abria de una. Solo `error` corta; el jugador siempre puede saltear con `Esc`
  o click. Se detecto el 03/08 instrumentando los eventos del `<video>` con
  Playwright, no se veia leyendo el codigo.
- ⚠️ **Pero `error` tampoco llega siempre, y por eso hay un vigilante** (10/08).
  Medido con `npm run diagnostico`: un `<video>` con `preload="none"` y sin
  datos emite `loadstart`, `waiting`, `suspend`... y despues **silencio
  absoluto**. Ni `ended` ni `error`. Como `playElevatorIntro` se resolvia solo
  con esos dos, la promesa quedaba colgada para siempre; `travelToDestination`
  la espera, asi que `travelling` nunca volvia a false y **el ascensor quedaba
  muerto por el resto de la sesion**: todo viaje posterior salia rechazado por
  la guarda en 0 ms sin moverse. El jugador podia salvarse con `Esc`, pero solo
  si adivinaba que habia que hacerlo.
  Ahora hay un vigilante: si el video no da ninguna senal de vida durante 12 s
  se saltea el intro y el juego sigue. Se rearma con `progress`, `canplay`,
  `playing`, `loadeddata` y `timeupdate`. Verificado que NO corta un video que
  anda: se apunto el `<source>` de HOOP a una copia VP9 de 22 s (mas larga que
  el tope a proposito) y llego entera hasta `ended`.
  **No sacar ese vigilante.** Sin el vuelve el ascensor muerto.
- ⚠️ **Llegar a un piso NO es haber terminado el viaje.** `activateDestination`
  corre ANTES del video: el destino ya cambio pero el viaje sigue abierto y
  `travelling` sigue en true. Cualquier prueba que dispare el viaje siguiente
  apenas ve el cambio de destino se lo va a comer rechazado. Hay que esperar a
  que la pantalla de intro se vaya.
- ⚠️ **El Chromium headless de las pruebas NO trae H.264**: cualquier mp4 falla
  ahi con `DEMUXER_ERROR_NO_SUPPORTED_STREAMS` aunque ande perfecto en el
  navegador real. Para probar la logica de un video, generar una copia corta en
  VP9/WebM y apuntar el `<source>` ahi (cambiando tambien su `type`), o el test
  miente. Ademas un video CON audio no arranca solo sin gesto real del usuario:
  disparar la interaccion con una tecla de verdad (`page.keyboard.press`), no
  llamando a la funcion por JS.
- Comando de compresion usado (4K HEVC 18.5 MB -> 1080p H.264 2.4 MB). El HEVC
  NO se reproduce en Chrome/Firefox: siempre convertir a H.264.

  ```bash
  ffmpeg -i original.mp4 -vf "scale=1920:1080:flags=lanczos" \
    -c:v libx264 -crf 24 -preset slow -profile:v high -level 4.0 \
    -pix_fmt yuv420p -movflags +faststart -c:a aac -b:a 128k salida.mp4
  ```
- Apertura inmediata, entrada, cierre y transicion de aproximadamente 1 s.
- Cada destino es una escena separada. Solo debe existir la escena activa.
- Los objetos de cada piso deben seguir siendo editables y movibles.
- Los cinco pisos usan temporalmente la base visual Binco/Hoop: estructura de
  tienda detallada, ladrillo, vidrio, techo panoramico, equipamiento comercial
  y una esfera exterior 360.
- La base comun no es la estetica final. Kusher la usara para personalizar cada
  coleccion.
- Cada piso tiene una carpeta donde se puede arrastrar una imagen 360 distinta:
  `src/assets/environments/pisos/`.
- La esfera se busca como `ESFERA 360` en el editor y puede moverse, rotarse o
  escalarse.
- La textura personalizada se libera al salir del piso.
- Existe una capa generica de minijuegos y el prototipo BOB'S MAZE.
- La maquina arcade esta temporalmente en todos los pisos y abre el mismo juego
  para probar experiencia y rendimiento.
- Error conocido aceptado: dos puntos inferiores derechos del laberinto pueden
  quedar sin comerse. No corregir sin nuevo pedido.

### El editor de mundo se traga teclas (fase de captura)

- `worldEditor.js` escucha `keydown` en **fase de CAPTURA**
  (`addEventListener('keydown', onKeyDown, true)`), y a las teclas de su lista
  `handled` les hace `stopPropagation()`. En captura eso mata el evento **antes**
  de que lo vea `core/input.js`, que escucha normal.
- ⚠️ Por eso `KeyE` estaba en esa lista y **el ascensor no abria con el editor
  abierto** (06/08): la tecla no llegaba nunca al juego. Como Kusher construye
  con `T` abierto, salir del piso era imposible y parecia que el ascensor
  estaba roto. Se saco `KeyE` de la lista; el editor no la usa para nada.
- Ademas `interactNearest` (main.js) deja pasar SOLO el ascensor cuando el
  editor esta abierto, y el bucle principal ya no descarta la E por
  `editorActive`. El CLICK sobre el boton sigue bloqueado a proposito: con el
  editor abierto el click sirve para seleccionar objetos.
- Si alguna otra interaccion "no responde" con el editor abierto, mirar primero
  esa lista `handled` antes de buscar en main.js.

### ⚠️ El teclado SI llega al navegador de pruebas

- Anotado mal antes: `page.keyboard.press('t')` y `press('e')` funcionan y
  disparan el juego. Lo que NO funciona es el MOVIMIENTO con WASD sostenido.
- Un `window.dispatchEvent(new KeyboardEvent(...))` sintetico **no** sirve:
  Playwright tiene que mandar la tecla de verdad con `page.keyboard.press`.
  Confundir las dos cosas hizo dar por "no verificable" un arreglo que estaba
  mal, y encima se reporto como verificado.

### Estampas: dos niveles de control

- **Panel (click derecho sobre la prenda):** cuerpo, color, imagen, ancho, alto,
  mover en los dos ejes, dar vuelta la imagen, y moldear el cuerpo. Es el
  control grueso.
- **Gizmo (tecla `T`):** la estampa se registra como objeto editable con el id
  `estampa:<nombre de la prenda>:<lado>`, asi que se agarra y se mueve, rota y
  escala con los mismos controles que cualquier objeto del mundo. Es el ajuste
  fino, porque los sliders nunca alcanzan para encajar una imagen "al ojo".
- ⚠️ El transform del gizmo se guarda con el DISEÑO de la prenda, no en el
  layout del mundo (`transient: true`). Y se lee al apretar GUARDAR en el
  panel: si Kusher acomoda con el gizmo y no guarda, se pierde, porque cualquier
  slider regenera el parche desde cero.
- ⚠️ **La estampa del frente salia ESPEJADA** hasta el 06/08. Al recorrer el
  parche, `fu = 0` cae del lado +X de la prenda, que mirandola de frente es la
  DERECHA de la pantalla: con `u = fu` el borde izquierdo de la imagen
  aterrizaba a la derecha. Ahora los dos lados usan `u = 1 - fu`. Se verifica
  midiendo en que X cae `u ≈ 0`, no mirando una captura.

### Constructor de piezas — armar objetos a mano con `T`

- Kusher pidio poder modelar el mismo, con sus propias palabras: "dejame poder
  hacer los objetos a mi manera manual, y despues le cargo una imagen que sea
  una textura encima". El diagnostico era correcto: las formas generadas con
  formulas salen siempre geometricas porque una formula no tiene ojo.
- Vive en `src/world/editor/pieceBuilder.js`. Se usa desde el editor de mundo
  (`T`), seccion **ARMAR A MANO**.
- Crea piezas desde cero: caja, plano, cilindro, esfera, tubo y manga/cono.
  Se acomodan con los controles de siempre (1 mover, 2 rotar, 3 escalar, y la
  escala es POR EJE).
- **Marcar** varias y **Agrupar**: quedan como un objeto solo que se mueve,
  rota y escala junto. Adentro se siguen pudiendo mover una por una.
- **Textura**: sube una imagen y se la pega a la pieza. Usa el mismo procesado
  que las estampas (`ui/estampaImagen.js`): le quita el fondo plano y le
  recorta el margen vacio.
- **Fusionar**: junta las mallas del grupo en una sola. ⚠️ NO es opcional para
  algo que se repita: un objeto de 20 piezas cuesta 20 llamadas de dibujo, y en
  este proyecto las llamadas pesan mas que los triangulos. Solo fusiona piezas
  que comparten textura — dos mallas con imagenes distintas no pueden ser una
  sin rehacer las UV.
- Criterio de fondo: es como esta hecho GTA San Andreas. La geometria es simple
  y lo que la hace ver bien es la textura.
- ⚠️ **Una pieza inventada no existe en ninguna escena.** El layout guarda
  DONDE esta cada objeto, pero no como construirlo. Por eso cada pieza guarda
  `piece: { tipo, textura, color, piezas, fusionado }` y `restorePieces(scene,
  layout)` la reconstruye al cargar, igual que `restoreClones` con los clones.
  Se llama en `applySavedEditorLayout` de `main.js`. Sin eso desaparecen al
  refrescar.
- ⚠️ Los dos agujeros de guardado que aparecieron probando, por si vuelven:
  la marca `fusionado` (si no, la fusion se perdia en cada refresco y el ahorro
  era mentira) y la textura copiada a CADA pieza del grupo (si no, en pantalla
  se veia aplicada pero al recargar volvia sin imagen).

### Cuadros editables por piso

- **Los tres cuadros existen en los CINCO pisos** (04/08). Antes se creaban
  dentro de `addOriginDetails`, o sea solo en ORIGEN; ahora los crea
  `addArtworkFrames`, que llama `buildPs3FloorScene` para todos.
- La pared derecha es la misma en los cinco, pero cada piso ya tiene cosas
  colgadas ahi, asi que la posicion en Z se elige por tema en
  `CUADROS_POR_PISO`: CULTURA tiene un poster en z=1.15 y BOB una vitrina de
  juguetes en z=4.8, por eso sus cuadros van corridos.
- ORIGEN ademas sigue pudiendo tomar fotos de su carpeta; los otros pisos
  arrancan con el afiche provisional y se personalizan con el editor.
- Cada piso guarda sus diseños por separado: la clave incluye el nombre del
  piso (`HOOP SEASON PS3 · cuadro reemplazable 1`).
- Cada piso tiene cuadros que Kusher puede diseñar desde adentro del juego:
  abrir el editor de mundo con `T` y clickear un cuadro. A la izquierda se abre
  **EDITOR DE CUADRO** (`src/ui/frameEditor.js`).
- Permite titulo, subtitulo, 4 tipografias, tamaño y color por texto,
  alineacion, altura del bloque, logo (FT / FOURTWENTY / hoja), color de fondo,
  y subir una foto real con zoom y encuadre. Todo se ve en vivo.
- El cuadro no muestra un archivo: muestra un `<canvas>` que se dibuja por
  capas (fondo -> foto -> logo -> textos) y se vuelca a una `CanvasTexture`.
- Los diseños se guardan **por NOMBRE del cuadro** (`ORIGEN PS3 · cuadro
  reemplazable 1`), no por id del editor. El nombre lo pone el constructor del
  piso y no cambia; el id se genera al registrar la escena y puede correrse si
  cambia el orden de creacion.
- `applySavedFrameDesigns(scene)` se llama al final de `buildPs3FloorScene`:
  sin eso los cuadros vuelven al afiche provisional cada vez que se entra.
- Guardar deja el diseño en el navegador. Para que llegue al repo hay que usar
  **EXPORTAR JSON** y pasarlo, igual que el layout del editor de mundo.
- Las fotos se achican a 1280 px y se guardan como dataURL. El limite real es
  el de localStorage (~5 MB en total): por eso se achican, y si no entra el
  panel avisa en vez de fallar en silencio.
- Sigue funcionando la via vieja: dejar imagenes en
  `src/assets/artworks/pisos/1-origen/` (ver su LEEME).

### Twenty Time

- El puesto de Twenty Time permite abrir un lector de revista.
- **Al interactuar se reproduce primero `assets/ui/twenty-time-intro.mp4`**
  (BOB en el kiosco, 10s, 3.6 MB) y despues abre la revista. Se ve UNA sola vez
  por sesion: dura 10s y verlo cada vez cansaria. Se saltea con `Esc` o click,
  y si el archivo faltara la revista abre igual.
- Como esta hecho: `initTwentyTimeInteract` recibe un `beforeOpen` opcional; si
  devuelve una promesa, el lector espera. El video vive en `main.js`, no en
  `twentyTimeInteract.js` — ese archivo no sabe nada de video, solo que hay
  algo que ocurre antes.
- Hay cuatro dobles paginas provisionales y animacion al cambiar de pagina.
- Imagenes y contenido se reemplazaran por la edicion final de FOURTWENTY.

### Fondo del local y visor de colisiones

- El hueco del fondo (detras de la pared trasera, donde vive el Stock
  selector) pasa de 2 a **6 m de profundidad** (`GAP_STUB` en `street.js`).
  Con 2 m estaba lleno de punta a punta con las remeras y no habia lugar para
  entrar caminando ni para poner el ascensor. Ahora es un pasillo: las remeras
  quedan adelante y atras hay espacio libre. `MAP_MIN_Z` se calcula a partir
  de `GAP_STUB`, asi que el limite del mundo se corre solo.
- ⚠️ **Las posiciones guardadas en el layout mandan sobre el codigo.** Cambiar
  `GAP_STUB` mueve la geometria que se construye, pero los objetos que Kusher
  ya movio con `T` vuelven a su posicion guardada al aplicar el layout. Si algo
  no se movio despues de tocar una medida, es por esto.
- ⚠️ **Un objeto bajo solo cuenta como escalon si ademas se puede SUBIR a el.**
  Antes `isSteppable` miraba solo el alto propio: cualquier pieza fina que
  quedara a media altura (una tapa de mesa, un estante, una tabla escalada con
  `T`) se clasificaba como escalon y se atravesaba caminando. Era el caso del
  mostrador del local. Ahora tambien se mira el borde de abajo contra el suelo:
  si esta mas arriba de `STEP_UP_ALLOWANCE`, no es escalon, es obstaculo.
- Junto con eso se bajo el minimo de altura para generar caja (de 0.2 m a
  0.03): existia para que una pieza fina no se volviera pared, pero dejaba sin
  colision justo a las tablas flotando. Lo bajo se sigue pisando via
  `isSteppable`, y solo entran objetos marcados como solidos, asi que una
  manija o un tirador siguen sin bloquear. Medido en el local: el mostrador
  paso de 2 a 6 cajas (tiene 6 piezas).
- **Borrar u ocultar SI saca la colision.** Verificado leyendo la lista de
  cajas: al ocultar el mostrador pasa de 6 a 0. Si algo invisible frena, es una
  copia que sigue visible, no un fantasma — se la encuentra con `K`.
- ⚠️ **Como probar una colision de verdad:** leer la lista con
  `window.__colliders()`. Mover a BOB seteando `bob.position` TELETRANSPORTA
  (saltea la colision) y el teclado no llega en el navegador headless de las
  pruebas, asi que esos dos metodos dan resultados falsos. Se perdio tiempo el
  05/08 confiando en ellos.
- **Tecla `K`: visor de colisiones.** Dibuja en rojo todas las cajas de
  colision activas y, al pararse contra una, un cartel arriba dice el NOMBRE
  del objeto que frena (en verde). Con ese nombre se lo busca en la lista del
  editor (`T`) y se lo borra o se lo mueve.
- Para que sirve: una caja de colision no se ve. Cuando algo frena a BOB y en
  pantalla no hay nada, sin esto no habia forma de saber que era. La causa
  tipica son **copias hechas con el editor** que quedaron invisibles o
  superpuestas: el visor las muestra por nombre, incluidas las `(copia)`.

### Local y luces

- Luminarias interiores editables con rango 1, 2 o 3.
- Interruptor rosa apaga/prende luces blancas.
- **Arrancan APAGADAS a proposito (03/08).** Hay 15 PointLight blancas dentro
  del local; encenderlas durante la carga inicial obliga a compilar los shaders
  de toda la escena con esas 15 luces y ahi se producia el tiron del arranque
  que reporto Kusher. Al abrir el juego quedan 5 luces activas en total en vez
  de 18. Se prenden a mano con el interruptor rosa (tecla `E` al lado, o click
  sobre el boton) cuando se quiere ambiente de noche.
- El estado se reimpone despues de restaurar el layout del editor
  (`whiteLightSwitch.reapply()` en `applySavedEditorLayout`). Hace falta porque
  `restoreClones` fuerza `visible = true` en TODOS los hijos de una luminaria
  duplicada, incluida su PointLight: sin esa llamada las copias se prendian
  solas aunque el interruptor estuviera apagado.
- **Solo enciende 1 de cada 2 (decision de Kusher, 03/08).** Con las 15
  prendidas seguia trabando un poco y la version final no puede trabar en
  ningun momento. Ahora al prender el interruptor se encienden 8 en vez de 15.
  Las lentes de TODAS siguen brillando, asi que el techo se ve igual: no falta
  ningun foco, solo ilumina la mitad. Bonus: tambien arreglo que el interior se
  quemara a blanco (15 PointLight sumadas en un ambiente chico saturaban).
- Se controla con `LUCES_UNA_DE_CADA` en `createWhiteLightSwitch`
  (`world/street.js`). Poner 1 vuelve a encenderlas todas; 3 dejaria un tercio.
- Cuales encienden se decide ordenando por posicion (fondo->frente,
  izquierda->derecha) y tomando una si, una no. Se ordena por posicion y no por
  orden de creacion para que la mitad encendida quede repartida por todo el
  local y el reparto no cambie cuando el editor recrea las luminarias
  duplicadas en otro orden.
- No se borro ninguna luminaria ni se cambio su intensidad: las posiciones son
  las que guardo Kusher en el editor.
- El neon verde y el texto amarillo `WE ROLL DIFFERENT` permanecen encendidos.
- Ciclo de sol/luna interpolado por hora, tambien visible en terraza.

### Mobile existente

- Base horizontal con joystick invisible, boton de celular e interaccion
  contextual.
- No ampliar ni optimizar mobile durante el pase visual web salvo pedido
  expreso del dueno.

## 5. Objetivo visual: juego PS3 inspirado en GTA V

El salto visual no se consigue solo con filtros. El aspecto bloqueado actual
proviene sobre todo de formas simples, materiales planos y falta de detalle
urbano. Three.js puede sostener la direccion deseada si se trabaja por zonas.

Principios:

- Escala y proporciones creibles antes que exceso de poligonos.
- Modelos low/medium poly con buenas siluetas.
- Texturas de asfalto, hormigon, ladrillo, vidrio, metal, suciedad y desgaste.
- Normal/AO solo donde aporten; sombras horneadas cuando convenga.
- `MeshStandardMaterial` como base. `MeshPhysicalMaterial` reservado para
  vidrio, pintura de autos y superficies protagonistas.
- Una luz con sombra importante por zona; luces secundarias baratas.
- Correccion de color y bloom discretos, sin tapar problemas de geometria.
- Detalles urbanos: marcos, balcones, cordones, desagues, cables, carteles,
  plantas, mobiliario y autos.
- LOD, instancias, atlas de texturas, colisiones simples y carga diferida.

Evolucion y criterio visual:

1. La primera prueba de Hoop con materiales y luces mejoro, pero siguio siendo
   demasiado basica.
2. La reconstruccion inspirada en Binco agrego densidad comercial y fue un gran
   avance, aunque todavia no alcanza el objetivo GTA V/PS3.
3. La imagen exterior 2D se descarto porque se notaba plana de cerca.
4. La esfera HDRI 360 con vidrio fue aprobada como base mas abierta y agradable.
5. La perspectiva del panorama todavia puede generar escalas o pendientes
   irreales en los costados.
6. La base se compartio entre pisos para que Kusher pueda editarla y cambiar su
   panorama. Cada piso se diferenciara despues.
7. Los siguientes pasos se eligen segun instruccion de Kusher: Burela, pisos,
   prendas, juegos, celular, revista o compra.

Leer el detalle de intentos y decisiones en
`store-simulator/design/ESTADO_ACTUAL_Y_BITACORA.md`.

## 6. Prendas, productos y maniquies

- El objetivo visual son prendas y maniquies del nivel de una tienda de ropa
  de GTA V, no siluetas planas permanentes.
- **Tambien en el LOCAL de Burela (05/08):** las 4 del barral izquierdo y las
  5 del Stock selector del fondo usan la misma malla. El barral izquierdo se
  mira justo de costado al entrar, que es donde el plano viejo desaparecia.
- **Prendas colgadas de los percheros: hechas (04/08) y en los CINCO pisos**
  (`createRetailRail` lo llama el constructor comun `buildPs3FloorScene`, asi
  que ORIGEN, HOOP, CULTURA, BOB y TERRAZA las tienen todas).
  `src/world/garments.js`.
  Antes cada prenda era un `PlaneGeometry` con textura recortada: una
  calcomania que desaparecia de costado. Ahora es una malla parametrica: la
  seccion transversal cambia de ancho y de fondo segun la altura, con ondas
  verticales que crecen hacia el ruedo. ~600 triangulos, geometria cacheada por
  tipo (tee / hoodie / jersey), asi que las 9 prendas de un perchero comparten
  una sola en memoria.
- Lo que hace que se lean las MANGAS no es el ancho sino el contraste de fondo:
  manga ancha y plana (0.042) contra pecho angosto y profundo (0.10), mas un
  sombreado de manga dibujado en las esquinas de arriba de la textura. Subiendo
  solo el ancho sale un cono, no una manga.
- La textura de la prenda es OPACA a proposito (`garmentSkinTexture`). La vieja
  `garmentTexture` de `gallery.js` tenia fondo transparente porque el recorte
  ERA la forma; con malla 3D ese recorte le come las mangas al modelo. Por eso
  el material se crea con `alphaTest: 0` — `bindProductVisual` copia ese valor
  como fallback.
- La foto real del producto sigue entrando igual: se le pasa a
  `bindProductVisual` la malla de tela (`mesh`), no el grupo.
- Perchas: tubos reales de ~1 cm. Antes eran `LineSegments` de 1 px, que no
  reciben luz ni proyectan sombra y se veian como alambre de wireframe.
- **Costo medido en ORIGEN (04/08):** de 210 mallas / 77.118 triangulos a
  228 mallas / 92.130. Son +18 mallas y +15.012 triangulos (+19%) por 18
  prendas.
- ⚠️ La primera version costaba +72 mallas porque cada percha eran 4 mallas
  sueltas (cuerpo, travesaño, gancho, cuello). Se fusionan con
  `mergeGeometries` en una sola. **En este proyecto las llamadas de dibujo
  pesan mas que los triangulos**, sobre todo en celular: fusionar bajo el
  costo un 75% sin cambiar un pixel. Misma logica para cualquier objeto
  chico que se repita muchas veces.
- La malla de tela es 16x18 (576 triangulos). Con 20x22 (880) no se ve
  diferencia a la distancia real a la que se mira un perchero.
- PENDIENTE en ORIGEN: maniquies, pilas de ropa doblada y exhibidores de pared
  siguen con el estilo viejo. `createFoldedStack` ya existe en `garments.js`
  pero todavia no esta conectado.
- Separar prendas por zonas: cabeza, torso, piernas y calzado.
- Una prenda nueva debe compartir el rig definitivo de BOB o usar un maniqui
  independiente optimizado.
- Ocultar piel bajo una prenda reduce clipping, pero no lo elimina por si solo.
- Probar primero una sola remera con animacion antes de producir la coleccion.
- Fotos PNG de productos siguen siendo utiles para paneles, paredes y catalogo.
- Los productos comerciales deben conservar IDs y variantes reales para que el
  carrito no dependa del nombre visual del objeto.

## 7. Compra: requisito de lanzamiento

Estado actual:

- Existe base de productos, panel de producto y carrito visual.
- Existe sincronizacion de catalogo Tiendanube para desarrollo.
- No existe backend de produccion, checkout completo, cobro, webhook ni
  sincronizacion de una venta real.

Experiencia objetivo:

1. BOB elige prendas dentro del mundo.
2. El celular muestra carrito, talles, cantidades y total.
3. Nombre, contacto, direccion y envio se completan dentro del simulador.
4. El servidor vuelve a validar producto, stock, envio y precio.
5. `Pagar` crea un checkout unico de Mercado Pago.
6. El unico tramo externo deseado es confirmar el pago en Mercado Pago.
7. Mercado Pago vuelve al simulador y un webhook confirma el estado real.
8. Se muestra aprobado, pendiente o rechazado.
9. El pedido se sincroniza con Tiendanube si la plataforma autoriza ese flujo.

Reglas de seguridad:

- Nunca confiar en el precio enviado por el navegador.
- Nunca poner credenciales de Tiendanube o Mercado Pago en frontend.
- Nunca manejar datos crudos de tarjeta en codigo propio.
- El redirect no prueba un pago: manda el webhook verificado.
- Antes de produccion, consultar por escrito a Tiendanube si permite checkout
  externo para una integracion privada de la propia tienda.
- Si no lo permite, usar el checkout oficial de Tiendanube como respaldo.
- Empezar con un producto, un talle y un envio sencillo en sandbox.

La forma final no esta cerrada. No asumir Mercado Pago Bricks, Checkout Pro o
checkout Tiendanube hasta completar la prueba y validacion oficial.

## 8. Rendimiento, peso y Cloudflare

### Medicion conocida del 01/08

- `dist/`: aproximadamente 150 MB despues de comprimir la musica.
- Assets publicos: aproximadamente 135 MB.
- Musica MP3: aproximadamente 26 MB; antes eran 361 MB en WAV. La reduccion es
  de aproximadamente 93%, unas 14 veces menos peso.
- JS principal: aproximadamente 1.02 MB minificado / 285 KB gzip.
- Tram Station optimizado: aproximadamente 6.2 MB; antes 85.7 MB.
- City Map optimizado: aproximadamente 1.2 MB; antes 6.1 MB en el archivo que
  se incorporo a este checkpoint.
- Entorno HDRI base: 7.0 MB en 2048 x 1024; antes 24.4 MB en 4K.
- Revista Twenty Time: aproximadamente 520 KB.
- Muebles GLB: aproximadamente 39 MB.
- Autos: aproximadamente 4 MB cada uno.
- El build detecta algunos muebles de 330k a 501k triangulos y reduce sombras y
  postprocesado cuando mide bajo rendimiento.

### Medicion del 03/09 — primera carga

Medido con el mismo metodo en las dos versiones (bytes que baja el navegador
hasta que el juego esta listo, servidor de desarrollo):

| | antes (`f1c4a10`) | despues | cambio |
|---|---|---|---|
| **Primera carga** | 17,16 MB | **15,44 MB** | **−1,72 MB** |
| modelos 3D | 5,23 MB | 3,72 MB | −1,51 MB (BOB) |
| JavaScript | 6,36 MB | 6,45 MB | +0,09 MB (la pantalla de BOBs) |
| imagenes | 2,51 MB | 2,51 MB | = |

En produccion el JS viaja empaquetado y comprimido, asi que el numero real es
bastante menor. La pantalla de eleccion suma **10,7 kB** al bundle
(3,7 kB comprimidos) — contra 1,5 MB que ahorra BOB.

### Ahorro medido que TODAVIA NO se hizo

- **121 kB (41,8 kB comprimidos) de JavaScript se cargan siempre y solo se usan
  apretando `T`**: `worldEditor.js`, `editorPanel.js`, `pieceBuilder.js` y
  `thumbnails.js`. Es el 13% del JS de la primera carga, para algo que la
  version publica no va a tener. Se arregla con `import()` dinamico + un stub
  que responda `isEnabled() → false` hasta que se cargue.
  ⚠️ No se hizo en esta rama a proposito: son 16 puntos de contacto en
  `main.js`, y `main.js` es archivo compartido con Codex (hay acuerdo de avisar
  antes de tocarlo). Merece su propia rama.
  ⚠️ `restorePieces` de `pieceBuilder.js` se necesita SIEMPRE (reconstruye las
  piezas hechas a mano al cargar): ese archivo no se puede diferir entero.
- Composicion medida del bundle: three.js 778 kB (205 kB comprimido, el 70% —
  es el motor, no se toca), codigo propio 170 kB, editor 86 kB, paneles de
  edicion 68 kB, revista 17 kB.
- Los GLB que quedan sin comprimir son los siete de la ciudad Kenney (30-40 KB
  cada uno) y las cinco prendas de Fer (40-210 KB). **Draco no rinde a ese
  tamaño** —tiene costo fijo por archivo y puede agrandarlos—: se midieron y se
  dejaron como estan. Todo lo que pesaba de verdad ya esta comprimido.
- `/favicon.ico` devuelve 404 (no existe). Es cosmetico —la pestaña queda sin
  iconito— y es de antes; se deja porque elegir el icono es decision de marca.

### Objetivos iniciales

- Primera carga: ideal 15 MB, tope 20 MB.
- Objetivo de escritorio: 60 FPS; minimo aceptable durante juego normal: 30.
- Solo una zona/piso cargado.
- Texturas comunes: 512/1024; 2048 solo para elementos protagonistas.
- Audio comprimido y cargado al reproducir.
- Modelos y videos cargados bajo demanda.
- Medir peso agregado antes de aceptar cada asset.

### Hostinger — la plataforma elegida (03/09)

**Kusher decidio publicar todo en Hostinger.** Reemplaza al plan de Cloudflare,
que queda como referencia mas abajo.

Motivo: ya tiene contratado **Business Web Hosting**, pago **hasta el 5 de marzo
de 2027**, y ese plan hace las dos cosas que necesitamos, cosa que un hosting
barato no hace. Confirmado por soporte de Hostinger:

- **Node.js** 18/20/22/24, con **proceso persistente** y reinicio desde panel.
  O sea que el backend de la compra puede vivir ahi.
- **Despliegue desde GitHub** (tambien .zip o el conector de VS Code). Los
  `npm install` corren solos al desplegar; no hay que hacerlo por SSH.
- **Webhooks entrantes** por HTTPS en el dominio propio. Sin bloqueo general —
  la validacion de firma la hace nuestra app.
- **SSH y variables de entorno**: las credenciales van ahi, NUNCA al repo.
- **MariaDB 10.5**, hasta 300 bases. Aca viven los usuarios y el saldo de FT$.
- **50 GB** de almacenamiento total y sin tope mensual de ancho de banda.

Dominios propios: `fourtwentyofficial.com` (vence **13/10/2026**) y
`fourtwentyoficial.com` (vence 22/12/2026).

⚠️ **Kusher desactivo la renovacion automatica de los cinco servicios.** El
hosting vence el 05/03/2027 y **el dominio el 13/10/2026, mucho antes**. Al
reactivar NO se conserva el precio viejo: se aplica la tarifa vigente (la ultima
consultada fue $263.988 ARS). El dominio es lo urgente, no el hosting.

⚠️ **Los 20 MB de primera carga NO son un limite de hosting.** Es un
presupuesto que nos pusimos nosotros: cuanto descarga el visitante antes de
poder jugar. Mudarse de plataforma no lo cambia. Con 50 GB de disco el
presupuesto sigue siendo el mismo, porque el problema es el tiempo de espera y
los datos moviles del que entra, no el espacio guardado.

⚠️ Es hosting **compartido**. Para la escala inicial alcanza. Si algun dia hay
mucho trafico, lo que conviene mover a un CDN son los archivos pesados (video,
modelos), dejando en Hostinger el backend. Eso es un problema de exito, no de
ahora: no adelantarlo.

### Cloudflare (propuesta anterior — NO vigente)

⚠️ Se conserva por si algun dia se vuelve. La plataforma elegida es Hostinger.

- Direccion prevista: Pages para aplicacion y R2 para modelos, audio y archivos
  grandes. La migracion aun no esta integrada.
- Pages no admite un archivo individual mayor de 25 MiB.
- No basta cambiar las URLs: el build de produccion debe excluir de `dist/`
  los archivos enviados a R2.
- El free tier de R2 es 10 GB-mes de almacenamiento, 1 millon de escrituras y
  10 millones de lecturas mensuales; las lecturas no equivalen a visitantes.
- Usar dominio propio y cache para reducir accesos directos a R2.
- La escala inicial de la marca probablemente entra en el free tier, pero se
  monitorea; no prometer costo cero ilimitado.

## 9. Arquitectura y archivos principales

- `src/main.js`: renderer, calidad, escenas, transiciones y bucle principal.
- `src/world/street.js`: Calle Burela, exterior y local base.
- `src/world/building.js`: construccion interior anterior y luces.
- `src/world/destinationScenes.js`: escenas aisladas de pisos y terraza.
- `src/world/bincoShopTrial.js`: base comercial detallada compartida y esfera.
  Ojo: los cinco pisos ya NO se construyen aca, sino en `terracePs3Trial.js`
  (`buildPs3FloorScene`). De este archivo solo sigue viva la esfera 360.
- `src/world/garments.js`: prendas colgadas con volumen real (malla parametrica
  + normal map de trama) y perchas. Ver seccion de prendas mas abajo.
- `src/ui/frameEditor.js`: editor de cuadros (texto, tipografia, logo y foto)
  que se abre al seleccionar un cuadro con `T`. Ver mas abajo.
- `src/world/floorEnvironmentCatalog.js`: imagen 360 elegida por carpeta/piso.
- `src/world/dayNightCycle.js`: hora, paleta, sol y luna.
- `src/world/editor/`: editor, catalogo, seleccion y persistencia.
- `src/player/bob3d.js`: carga, movimiento y animacion de BOB.
- `src/world/cars.js`: GLB/fallback, posiciones y radios.
- `src/ui/phone.js`: celular, musica, carrito, reloj y opcion 4.
- `src/audio/musicPlayer.js`: estado musical compartido.
- `src/data/cartStore.js`: estado del carrito entre escenas.
- `src/minigames/`: capa generica y BOB'S MAZE.
- `src/world/originArcade.js`: maquina arcade reemplazable/editable.
- `src/interact/twentyTimeInteract.js`: interaccion del puesto Twenty Time.
- `src/ui/twentyTimeReader.js`: lector y cambio animado de paginas.
- `src/integrations/tiendanube/`: catalogo y futura integracion comercial.
- `public/assets/layouts/furniture-layout.json`: posiciones oficiales del editor.
- `public/assets/data/productos.json`: catalogo publicado del simulador.

## 10. Flujo de trabajo obligatorio

- Kusher conserva control total y decide que entra a la rama oficial.
- Kusher puede elegir el siguiente bloque sin respetar un orden fijo. Las fechas
  son recordatorios de prioridad, no limites para una tarea.
- Una instruccion nueva y directa de Kusher manda sobre el plan anterior.
- Experimentos grandes se hacen en una rama separada desde la oficial.
- No perder posiciones, colores ni objetos guardados por Kusher.
- No revertir cambios ajenos ni limpiar archivos sin autorizacion.
- Un bloque por vez: implementar, probar, medir, mostrar y pedir aprobacion.
- Crear primero un patron sigue siendo recomendable cuando evita mucho
  retrabajo, pero no debe usarse para bloquear una instruccion del dueno.
- Si al dueno no le gusta una prueba, se descarta la rama y la oficial queda
  exactamente como estaba.
- Antes de integrar: `npm run build`, prueba web, consola sin errores y captura
  si el cambio es visual.
- Reportar archivos modificados, peso agregado, forma de probar y pendientes.

### Fer

- Fer trabaja en su computadora, con su Codex y una rama aislada.
- Debe partir de la rama oficial actual, no de un backup viejo.
- No hace push directo a ramas oficiales.
- Entrega Pull Request pequeno con objetivo, commit, archivos, peso, build y
  capturas. Kusher decide si se integra completo, por commit o se rechaza.
- No copiar fragmentos manualmente entre computadoras si existe un commit.

### Comunicacion entre agentes (Claude Code <-> Codex)

- Claude Code y Codex son companeros de trabajo del mismo proyecto y pueden
  hablarse cuando lo necesiten. Luca fomenta esas charlas: mejoran la
  coordinacion y evitan pisarse en los mismos archivos.
- Canal actual: Luca es el mensajero. Cuando Claude Code necesite hablar con
  Codex dice exactamente: "Luca, necesito hablar con codex, porfavor enviale
  este mensaje" y a continuacion el mensaje listo para copiar y pegar.
- Los mensajes entre agentes van EN INGLES: tokeniza mas barato y ninguno de
  los dos necesita la traduccion. Lo que se le muestra a Luca sigue en espanol.
- Mensajes cortos y de un solo tema. Que cada mensaje ahorre trabajo, no que
  lo genere.
- Acuerdo vigente de reparto: quien tenga un cambio abierto sobre `main.js` o
  `minigameManager.js` lo avisa; `destinationScenes.js` se toca solo avisando
  antes; cada minijuego vive en su propio archivo `src/minigames/<juego>.js`
  y ahi no hay conflicto posible.

## 11. Ejecutar y verificar

```bash
cd /Users/kusher/Desktop/fourtwenty-dashboard
git switch version-3-de-septiembre-final
git pull --ff-only
cd store-simulator
npm install
npm run dev -- --host 0.0.0.0 --port 4177
```

- Computadora: abrir `http://127.0.0.1:4177/`.
- Prueba de ascensor: agregar `?elevatorTest=1` si la funcion sigue disponible.
- Calidad liviana: agregar `?q=low`.
- Celular fisico en la misma Wi-Fi: usar la IP local del Mac y puerto 4177.

Build:

```bash
cd /Users/kusher/Desktop/fourtwenty-dashboard/store-simulator
npm run build
```

Pruebas automaticas (con el `npm run dev` corriendo en otra pestana; la primera
vez hace falta `npx playwright install chromium`):

```bash
SMOKE_URL=http://127.0.0.1:5201 npm run smoke        # recorre Burela y los 5 pisos
SMOKE_URL=http://127.0.0.1:5201 npm run diagnostico  # mide donde se va el tiempo
SMOKE_URL=http://127.0.0.1:5201 npm run modelos      # los GLB siguen apareciendo?
```

- ⚠️ Hasta el 03/09 `recorrido.mjs` **no leia `SMOKE_URL`**: solo aceptaba
  `--url`, asi que el comando de arriba —el que dice este manual— ignoraba la
  direccion en silencio y pegaba contra el 5173. O fallaba con "connection
  refused" sin explicar por que, o probaba OTRO servidor que estuviera ahi
  levantado. Ahora las dos herramientas aceptan las dos formas.

- `smoke` tiene que terminar en `✅ TODO BIEN` y devolver salida 0. Comprueba
  que los 6 destinos abren, que se vuelve a Burela, y que **no queda ninguna
  entrada de piso registrada** al volver (esa es la fuga que arreglo Codex).
- `diagnostico` imprime, viaje por viaje, cuanto tardo, cuanto se congelo el
  hilo principal y que eventos tiro el video de intro. Es la herramienta con la
  que se encontro el ascensor muerto del 10/08.
- ⚠️ Ese navegador dibuja **por software**: sus segundos sirven para comparar
  pisos entre si, no para predecir la maquina de Kusher.

## 12. Definicion de terminado para agosto

Una version no esta terminada solo porque se vea bien. Para declarar el
lanzamiento web deben cumplirse todos estos puntos:

- Calle/local/BOB tienen una direccion visual coherente aprobada.
- Movimiento, colisiones, autos, celular y ascensor funcionan.
- Los pisos prioritarios cargan por separado.
- Los assets iniciales respetan el presupuesto acordado.
- No hay errores graves de consola ni bloqueos de interfaz.
- Una compra real se completa desde producto hasta confirmacion.
- Precio y estado del pago se validan en servidor.
- Existe un recorrido de respaldo si falla la integracion comercial ideal.

## 13. No hacer sin nueva aprobacion

- No optimizar mobile durante la fase web.
- No construir FT$ **todavia**: esta aprobado, pero es el paso 5 del plan y va
  despues de la compra. Adelantarlo sin servidor deja el saldo en el navegador,
  donde cualquiera se lo edita.
- No construir la plataforma multi-marca 2027.
- No asumir una arquitectura de pago como aprobada.
- No reemplazar todo el mundo de una vez sin pedido directo; normalmente mostrar
  primero una prueba pequeña cuando el riesgo sea alto.
- No subir musica sin permiso ni modelos sin revisar peso/licencia.
- No cambiar rama oficial, nombre de version o fecha de lanzamiento por cuenta
  propia.
