# Simulador Bobilonia Maestro - contexto obligatorio

Ultima actualizacion documental: 1 de agosto de 2026.

Este archivo es la fuente de contexto que deben leer Claude, Claude Code, Codex
y cualquier colaborador antes de trabajar. El dueno no programa: explicar los
cambios con palabras simples, mostrar como probarlos y no asumir decisiones de
producto que no esten escritas aqui.

## 1. Fuente de verdad y version oficial

- Repositorio: `oficialfourtwenty-coder/fourtwenty-dashboard`.
- Raiz local de Kusher: `/Users/kusher/Desktop/fourtwenty-dashboard`.
- Aplicacion: `store-simulator/`.
- Rama oficial actual: `version-final-final-final`.
- Respaldo anterior a todo el trabajo de esta noche: `version-jueves-30` en
  `234e8e2`. No desarrollar sobre ese respaldo salvo pedido de Kusher.
- Ultimo checkpoint funcional incluido antes de esta actualizacion documental:
  `ae33f2a` (`perf(audio): compress simulator music for web`).
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
git switch version-final-final-final
git pull --ff-only
```

El pase visual ya comenzo mediante pruebas aprobadas como base, pero todavia no
alcanzo el resultado final GTA V/PS3. Kusher decide el siguiente bloque de
trabajo y puede cambiar el orden del plan cuando lo desee.

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
- FT$ queda postergado. El dueno puede manejarlo manualmente si algun dia se
  usa; no construir ahora una economia ni una base de saldos.

## 3. Prioridades de agosto de 2026

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
- El layout oficial incluye varias copias de City Map alrededor de los limites
  y dos Tram Station para crear fondo urbano, desnivel y vias.
- City Map y Tram Station fueron comprimidos con Draco sin perder su edicion
  mediante `T`.
- El interior del local es la replica actual aprobada por el dueno. Conservar
  posiciones, entrada, espejo, luces y cambios guardados en el editor.
- El World Editor se abre con `T` o `Tab`: permite buscar, crear una copia
  delante de BOB, mover, rotar, escalar, duplicar, cambiar color y ajustar
  rango de luces.
- `Save Local` conserva cambios en el navegador de esa computadora. Para que
  Claude, Codex, Fer y GitHub los reciban, Kusher debe exportar el JSON y se
  debe revisar antes de reemplazar `public/assets/layouts/furniture-layout.json`.

### BOB

- Modelo activo: `public/assets/bob/bob.glb`, aproximadamente 1.3 MB.
- Tiene skeleton y un clip de caminata, pero el rig fue reparado muchas veces.
- El compromiso actual mantiene las piernas sin animacion para evitar
  deformaciones y mueve principalmente brazos/manos.
- Antes de producir muchas prendas 3D se necesita un rig definitivo, estable,
  con nombres de huesos congelados y una prenda piloto verificada.

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

### Ascensor y pisos

- Destinos: 0 Calle Burela, 1 ORIGEN, 2 HOOP SEASON, 3 CULTURA, 4 BOB,
  5 Terraza.
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

### Twenty Time

- El puesto de Twenty Time permite abrir un lector de revista.
- Hay cuatro dobles paginas provisionales y animacion al cambiar de pagina.
- Imagenes y contenido se reemplazaran por la edicion final de FOURTWENTY.

### Local y luces

- Luminarias interiores editables con rango 1, 2 o 3.
- Interruptor rosa apaga/prende luces blancas.
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

### Objetivos iniciales

- Primera carga: ideal 15 MB, tope 20 MB.
- Objetivo de escritorio: 60 FPS; minimo aceptable durante juego normal: 30.
- Solo una zona/piso cargado.
- Texturas comunes: 512/1024; 2048 solo para elementos protagonistas.
- Audio comprimido y cargado al reproducir.
- Modelos y videos cargados bajo demanda.
- Medir peso agregado antes de aceptar cada asset.

### Cloudflare

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

## 11. Ejecutar y verificar

```bash
cd /Users/kusher/Desktop/fourtwenty-dashboard
git switch version-final-final-final
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
- No construir FT$.
- No construir la plataforma multi-marca 2027.
- No asumir una arquitectura de pago como aprobada.
- No reemplazar todo el mundo de una vez sin pedido directo; normalmente mostrar
  primero una prueba pequeña cuando el riesgo sea alto.
- No subir musica sin permiso ni modelos sin revisar peso/licencia.
- No cambiar rama oficial, nombre de version o fecha de lanzamiento por cuenta
  propia.
