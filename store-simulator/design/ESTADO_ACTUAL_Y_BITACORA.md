# Simulador Bobilonia - estado vigente y bitacora

Este documento complementa `CLAUDE.md`. Resume el estado real del simulador,
las decisiones del dueno, los intentos que funcionaron o no funcionaron y el
trabajo mas reciente. Deben leerlo Claude, Claude Code, Codex y cualquier
colaborador antes de proponer cambios.

## Regla principal de planificacion

- Kusher elige el siguiente trabajo segun lo que quiera explorar y evaluar.
- Las fechas son metas orientativas, no una prohibicion para trabajar otra area.
- No rechazar una tarea solo porque estaba anotada para otra semana.
- La compra real sigue siendo condicion obligatoria para publicar, aunque ahora
  se prioricen estetica, mundo, experiencias o minijuegos.
- Cuando una instruccion nueva de Kusher contradice un plan anterior, manda la
  instruccion nueva.
- Para evitar trabajo repetido, sigue siendo preferible aprobar un patron antes
  de multiplicarlo. Esto es una recomendacion tecnica, no un limite creativo.

## Fuente de verdad actual

- Repositorio: `oficialfourtwenty-coder/fourtwenty-dashboard`.
- Aplicacion: `store-simulator/`.
- Rama oficial: `version-jueves-30`.
- El nombre de la rama es historico. No representa una fecha limite ni una
  version vieja por el solo hecho de llamarse asi.
- Checkpoint de codigo que contiene todo el trabajo funcional de esta bitacora:
  `e6123bc`.
- El commit documental que publique este archivo puede ser posterior.
- Si Notion y GitHub difieren sobre codigo, archivos o commits, manda GitHub.
- Si difieren sobre una decision creativa reciente, confirmar la instruccion mas
  nueva de Kusher.

## Vision vigente

Simulador Bobilonia es una experiencia web 3D de compra de FOURTWENTY. Tiene que
sentirse primero como un juego y, al mismo tiempo, permitir terminar una compra
real. BOB recorre Burela, entra al local, usa autos, musica, celular, ascensor,
pisos tematicos, revistas, easter eggs y minijuegos.

- Prioridad de plataforma: web/escritorio.
- Mobile conserva su base y se optimiza despues de cerrar la experiencia web.
- Direccion visual: acercarse todo lo posible a GTA V de PlayStation 3 sin
  copiar assets del juego y sin intentar crear una version para consola.
- La meta visual no es solo agregar filtros: se buscan mejores proporciones,
  materiales, texturas, siluetas, iluminacion y detalle ambiental.
- La fidelidad a la calle y al local de Burela importa mas que una ciudad enorme.
- La posible plataforma multi-marca queda pausada hasta 2027.
- FT$ queda postergado.

## Trabajo consolidado en la sesion mas reciente

### 1. Mundo exterior y layout

- Se preservo el ultimo layout exportado por Kusher.
- Hay varias copias editables del City Map alrededor de los limites y dos Tram
  Station usadas para formar fondo urbano, desnivel y vias.
- Los objetos siguen editables con `T`: posicion, rotacion y escala.
- City Map se optimizo de aproximadamente 6.1 MB a 1.2 MB.
- Tram Station se optimizo de aproximadamente 85.7 MB a 6.2 MB.
- Se agrego decodificacion Draco para esos modelos comprimidos.
- La lectura visual del fondo fue aprobada como base comoda, no como escenario
  exterior final.
- Quedan advertencias de rendimiento por edificios GLB de muchos triangulos.

### 2. Minijuego BOB'S MAZE

- Existe una capa generica de minijuegos desacoplada del mundo Three.js.
- Al abrirla se detienen los controles del mundo; al salir se reanudan.
- Incluye ganar, perder, reintentar, salir y premio de descuento provisional.
- El prototipo usa Canvas, teclado y control tactil.
- Usa el rostro de BOB como jugador, un joint pixelado como power-up y un mapa
  con forma de 420.
- Empezo como prueba exclusiva del piso ORIGEN.
- La maquina arcade se copio despues a todos los pisos para evaluar recorrido y
  rendimiento. Por ahora todas abren el mismo prototipo.
- Problema conocido aceptado por Kusher: los dos ultimos puntos inferiores
  derechos pueden quedar sin comerse. No corregir hasta nuevo pedido.
- Los juegos finales, su arte y el descuento comercial todavia no estan hechos.

### 3. Twenty Time

- El puesto Twenty Time tiene interaccion para leer una revista.
- Se incluyeron cuatro dobles paginas provisionales.
- El lector permite avanzar y retroceder con animacion de pagina.
- El contenido y las imagenes son de prueba y se reemplazaran por una edicion
  oficial de FOURTWENTY.
- Archivos principales: `src/interact/twentyTimeInteract.js` y
  `src/ui/twentyTimeReader.js`.

### 4. Evolucion visual de los pisos

Se hicieron varios intentos. Es importante conservar tambien lo aprendido:

1. Un primer pase de luces, ladrillo y piso mejoro la escena, pero Kusher lo
   siguio viendo demasiado basico y cercano a Minecraft.
2. Una primera prueba PS3 en Hoop Season tampoco alcanzo el nivel buscado.
3. Se estudio Binco de GTA V como referencia de densidad comercial, distribucion
   y detalle. No se copiaron assets propietarios del mod descargado.
4. Se reconstruyo Hoop con una tienda procedural mas completa: exhibidores,
   prendas, maniqui, percheros, mesa, zapatillas, probadores, caja, banco,
   espejo, ventilacion, carteleria, ladrillo y luces.
5. El resultado fue un avance grande y aprobado como base, pero todavia no es
   el objetivo final GTA V/PS3.
6. Una imagen exterior plana mejoraba la vista desde lejos, pero se notaba 2D
   al acercarse a las ventanas.
7. Se reemplazo por una esfera HDRI 360 con paredes y techo de vidrio.
8. La esfera dio mas amplitud y continuidad exterior. Limitacion conocida: la
   perspectiva del panorama puede hacer que los costados parezcan inclinados o
   que la escala exterior no coincida perfectamente con BOB.
9. Las primeras columnas y vidrios quedaron mal ubicados respecto de la esfera.
   Kusher borro varios con el editor. Se corrigieron colisiones, sombras y
   seleccion para que los espacios eliminados no sigan bloqueando.
10. La base visual de Hoop se compartio con ORIGEN, CULTURA, BOB y Terraza para
    que Kusher parta de una estructura comun y personalice cada piso.

Estado actual: los cinco pisos comparten temporalmente la base Binco/Hoop y una
maquina arcade. No interpretar esto como diseño final de todos los pisos.

### 5. Esferas 360 reemplazables por carpeta

Cada piso puede elegir su panorama sin editar codigo. Carpeta principal:

`src/assets/environments/pisos/`

- `1-origen/`
- `2-hoop-season/`
- `3-cultura/`
- `4-bob/`
- `5-terraza/`

Flujo:

1. Dejar una sola imagen 360 en la carpeta del piso.
2. El nombre del archivo puede ser cualquiera.
3. Formatos: JPG, JPEG, PNG, WebP, HDR o EXR.
4. Actualizar el navegador con `Cmd + Shift + R`.
5. Usar `T` y buscar `ESFERA 360` para mover, rotar o escalar.

- Recomendado para pruebas web: 2048 x 1024 o menos.
- WebP o JPG suele pesar mucho menos que EXR.
- Si un piso no tiene imagen propia usa el panorama base.
- La esfera base se redujo de 24.4 MB a 7.0 MB manteniendo HDR en 2K.
- Al salir de un piso, su textura personalizada se libera de memoria.
- Si una imagen falla, el piso vuelve automaticamente al entorno base.

## Estado funcional general

- BOB camina y corre con camara en tercera persona.
- World Editor con `T` o `Tab`: buscar, crear delante de BOB, mover, rotar,
  escalar, duplicar, cambiar color y editar rango de luces.
- Dos autos GLB con colision, entrada, interiores fotograficos y radio.
- Celular con Musica, Carrito base, RELOJ y Opcion 4 reservada.
- Reloj con hora real/manual, sol, luna, cielo e iluminacion.
- Ascensor con destinos 0 a 5 y escenas aisladas.
- Luces blancas regulables e interruptor rosa; neon `WE ROLL DIFFERENT`
  permanece encendido.
- Twenty Time interactiva.
- Capa generica de minijuegos y BOB'S MAZE funcional como prototipo.
- Mobile horizontal base existente, fuera de prioridad por ahora.

## Guardado del editor

- `Save Local` guarda en el navegador de esa computadora.
- Sirve para continuar trabajando sin descargar en cada movimiento.
- No queda automaticamente disponible para Claude, Codex, Fer o GitHub.
- Para oficializar posiciones se exporta el JSON y se reemplaza, despues de
  revisarlo, `public/assets/layouts/furniture-layout.json`.
- Nunca reemplazar el layout oficial sin comprobar que es la descarga mas nueva
  de Kusher.

## Rendimiento medido despues de esta sesion

- `dist/`: aproximadamente 485 MB.
- `public/`: aproximadamente 466 MB.
- Musica: aproximadamente 361 MB, principal causa del peso.
- Muebles GLB: aproximadamente 39 MB.
- Entorno HDRI compartido: aproximadamente 7 MB.
- Revista Twenty Time: aproximadamente 520 KB.
- JavaScript principal: aproximadamente 1.02 MB minificado / 285 KB gzip.
- El build termina correctamente, con advertencia por bundle mayor a 500 KB.
- Tambien aparecen advertencias por algunos GLB de 330k a 501k triangulos.
- El sistema reduce calidad automaticamente cuando detecta rendimiento bajo.

Prioridades tecnicas de optimizacion:

1. Convertir WAV a audio web comprimido y cargar cada tema bajo demanda.
2. Evitar que modelos grandes entren en la primera carga.
3. Continuar con escenas separadas por piso.
4. Usar panoramas 2K WebP/JPG cuando no se necesite iluminacion HDR.
5. Medir antes de agregar muchos juegos, modelos o texturas simultaneos.

## Compra real

La compra es la condicion comercial obligatoria, aunque no sea el trabajo de
esta semana o de esta sesion.

- Existe producto, panel y carrito visual base.
- No existe todavia el flujo productivo de punta a punta.
- Objetivo: elegir prendas, talle y cantidad; completar contacto, direccion y
  envio dentro del simulador; salir solo para confirmar el pago.
- Precio, stock y envio deben validarse en backend.
- Credenciales nunca van en frontend.
- El webhook del proveedor confirma el estado real.
- Se debe verificar con Tiendanube si autoriza checkout externo para esta
  integracion. Si no, se usa su checkout oficial como respaldo.

## Forma de colaborar

- Kusher mantiene control total de la rama oficial.
- Claude, Claude Code y Codex deben leer `CLAUDE.md` y este documento.
- Antes de tocar codigo: confirmar rama, commit y `git status`.
- Fer trabaja en su rama aislada y entrega Pull Request o commit pequeno.
- Nada de Fer entra automaticamente a la maestra.
- Experimentos grandes se hacen en rama separada.
- Kusher prueba y decide integrar, corregir o descartar.
- No copiar codigo manual entre computadoras cuando puede compartirse un commit.
- No usar el calendario para bloquear una instruccion directa del dueno.
- Si un agente ve trabajo local que aun no esta en GitHub, debe esperar la
  publicacion oficial antes de editar los mismos archivos.

## Proximos bloques posibles, sin orden obligatorio

- Probar panoramas distintos en cada piso.
- Personalizar arquitectura, productos y ambientacion de cada coleccion.
- Diseñar un minijuego diferente por piso sobre la capa generica existente.
- Corregir y pulir BOB'S MAZE cuando Kusher lo pida.
- Crear las paginas oficiales de Twenty Time.
- Mejorar prendas, maniquies y rig de BOB.
- Rediseñar celular, artistas, canciones y carrito.
- Seguir el pase visual de Burela y del local hacia la direccion PS3.
- Preparar y probar la compra real.
- Comprimir audio y dividir carga de codigo/assets.

Kusher puede elegir cualquiera de estos bloques. Antes de multiplicar un cambio
a todo el mundo, conviene mostrar una prueba pequeña cuando el costo o el riesgo
sean altos.

## Verificacion del checkpoint

- `npm run build`: correcto.
- Prueba web de calle, ascensor y Hoop Season: correcta.
- Esfera base detectada en Hoop Season: correcta.
- Arcade presente en el piso: correcto.
- Sin errores nuevos de carga de la esfera.
- Advertencias restantes: bundle grande, sombras deprecadas y GLB pesados.
