# FOURTWENTY — Store Simulator

Juego web 3D: una tienda de ropa virtual de la marca **fourtwenty** donde el jugador
camina con **BOB** (mascota de la marca), se prueba ropa, junta prendas en la bolsa y
termina comprando en el checkout real de TiendaNube.

## ⚠️ VERSIÓN DE TRABAJO ACTUAL (leer esto primero, siempre)

**`version-lunes-13` es la ÚNICA versión sobre la que se trabaja** (branch en
GitHub, pusheada el 13 de julio). Reemplaza a `probar-mundo-perfecto-6742172`
(ver más abajo por qué). El respaldo inmediato anterior es `domingo-12`
(sin ascensor, previo a que el dueño lo aprobara). **No volver a ninguna
versión anterior sin que el dueño lo pida explícitamente.**

- **Cómo correrlo (Mac del dueño):**
  ```bash
  cd /Users/kusher/Desktop/fourtwenty-dashboard
  git switch version-lunes-13
  cd store-simulator
  npm run dev -- --host 0.0.0.0 --port 5190
  ```
- **Historia (para entender el árbol de branches, no repetir el lío):**
  `probar-mundo-perfecto-6742172` (commit `6742172`, "mundo perfecto"
  recuperado tras el desastre del ascensor del 8 de julio) fue la versión de
  trabajo hasta el 13 de julio. Sobre esa base, el dueño le pidió a Codex
  el ascensor en una copia aparte de su Mac (nunca tocando la versión
  principal); cuando le gustó el resultado, guardó ese estado como
  `domingo-12` (checkpoint sin ascensor, solo con datos/layout actualizados)
  y encima `version-lunes-13` (con el ascensor ya integrado). Ambos branches
  arrancan desde el mismo punto de `probar-mundo-perfecto-6742172` (el commit
  de los fixes de BOB, ver más abajo) — **no se perdió nada de esos fixes**,
  se mergearon a mano después de que las 3 ramas quedaran en GitHub.
  `probar-mundo-perfecto-6742172` queda **superada/congelada** — no seguir
  trabajando ahí.
- ⚠️ **Ojo con confundir ramas locales:** el 13 de julio hubo una sesión entera
  perdida arreglando `bob.glb` en `probar-mundo-perfecto-6742172` mientras el
  dueño probaba los resultados en `version-lunes-13` (rama local en su Mac,
  todavía no pusheada) — dos archivos `bob.glb` completamente distintos, cada
  arreglo en una rama no aparecía en la otra. **Antes de reportar o descartar
  un bug, confirmar explícitamente en qué branch/carpeta se está parado** (a
  ambos lados: el dueño en su Mac, cualquier sesión de Claude/Codex).

### Qué tiene esta versión que las anteriores no tenían
- 🛗 **Ascensor de 6 pisos** (`src/world/elevator.js`, `src/world/destinationScenes.js`,
  `src/ui/elevatorPanel.js`) — hecho por Codex en una carpeta aparte
  (`/Users/kusher/Documents/simulador/prueba-ascensor`, fuera de este repo) y
  aprobado por el dueño; recién integrado acá. Panel con destinos, escenas de
  piso independientes (solo se carga el piso activo), objetos movibles/color
  editable por piso vía el World Editor (tecla T).
- `bob.glb` con animación de caminata real y todos los fixes de skinning
  descritos más abajo (piernas quietas, manos/pies sin bugs).
- Editor de mundo (tecla T) extendido (`editableRegistry.js`, `editorPanel.js`,
  `worldEditor.js`), `productVisuals.js`, mueble `apartment-building.glb`,
  video real `cultura-intro.mp4` — heredado de `probar-mundo-perfecto-6742172`.

### Qué NO tiene (para no reintroducir por accidente)
- **El módulo `src/ui/culturaIntro.js`** (intro de video de Cultura como
  componente aislado) que se hizo en `claude/fourtwenty-store-simulator-g3rigz`
  **no existe acá**. Esta versión resuelve el video de Cultura de otra forma,
  integrada directo en `main.js`/`index.html` (mismo patrón que las pantallas
  de carga de hoop-season/bob-collection). Son DOS implementaciones distintas
  del mismo feature — no mezclar ambas sin revisar primero cuál quedó.

### Regla operativa
Antes de tocar código de este proyecto, cualquier sesión (mía o de Codex) debe
confirmar en qué branch está parada y que coincide con `version-lunes-13`.
Si se va a probar algo grande y riesgoso, hacerlo en un branch/worktree
separado y NO mezclarlo con este hasta que el dueño lo vea funcionando y lo
apruebe explícitamente.

## Estructura del repo

```
index.html          → FT Dashboard (widget existente, NO tocar salvo pedido explícito)
store-simulator/    → el juego (Vite + Three.js)
.claude/skills/     → pack gamedev (router + three.js + disciplinas) — se cargan solos
```

## Decisiones técnicas (NO re-discutir, ya están tomadas)

- **Motor:** Three.js + Vite. Todo en navegador, gratis, sin Blender.
- **Estética (actualizada por el dueño — pase visual GTA V):** tienda estilo
  Ponsonbys/Suburban. Render a resolución completa con antialiasing (NADA de
  pixelado), texturas canvas con LinearFilter+mipmaps+anisotropía, materiales PBR
  (piso `MeshPhysicalMaterial` roughness 0.45 con reflejo del RoomEnvironment,
  paredes mate), luz con contraste: ambiente bajo + spots cálidos ~3200K (uno con
  sombra real por piso, PCFSoft), y post-processing EffectComposer: bloom sutil
  (neones), grade cálido + saturación y viñeta (shader propio en main.js).
  **Mobile/perf:** abrir con `?q=low` desactiva sombras, AA y post. SSAO quedó
  descartado por costo (las sombras + ambiente bajo ya dan profundidad).
  Movimiento con peso: aceleración/frenada en rampa, giro suave, sprint con Shift.
- **BOB (actualizado por el dueño):** modelo 3D (mono, generado con Tripo) en
  `public/assets/bob/bob.glb`, cargado por `src/player/bob3d.js` (escala y pies se
  normalizan solos; sombra blob estilo PS2; ⚠️ el frente del GLB de Tripo es **+x**,
  bob3d.js lo rota -90° al cargar — la estatua del piso 4 también lo asume).
  **Ya tiene skeleton + 1 animation clip de caminata** ("walk", 0.96s, 42 huesos):
  el dueño pasó un `bob_final.blend` (mismo mesh de Tripo, riggeado y con un ciclo
  de caminata keyframeado a mano — 8 huesos de piernas/brazos, 12 huesos totales
  animados) que se convirtió acá con Blender headless (`bpy` vía pip, no vino
  instalado — ⚠️ el paquete `bpy` pip solo se puede `import` si el script corre por
  **stdin** (`python3 - < script.py`); por archivo (`python3 script.py`) crashea con
  "InitGoogleLogging() called twice", bug conocido de esa build) + exportado a GLB +
  optimizado con `gltf-transform optimize --texture-size 1024 --compress false`
  (⚠️ dejar `--compress false`: el modo default mete `EXT_meshopt_compression`/
  `KHR_mesh_quantization` como *required*, y el `GLTFLoader` de bob3d.js no tiene
  registrado el decoder — rompería la carga). GLB final: 1.3 MB (era 2.6 MB).
  ⚠️ **El `.blend` traía el skinning roto de fondo — ojo si se vuelve a
  re-exportar:** el primer intento de arreglo fue parcial (limpiar a mano ~230
  vértices de cabeza/orejas mal pesados hacia `L_Upperarm`/`R_Upperarm`) y no
  alcanzó — el dueño reportó que al caminar "se movía casi toda la parte del
  costado". Medición real: la **suma de pesos por vértice tenía mediana ~12.8**
  (debería ser ~1.0) — casi todos los vértices del mesh estaban influenciados
  fuerte por 15+ huesos sin relación anatómica entre sí (torso mezclado con
  brazo, pierna, etc.), probablemente del auto-rig de Tripo. Blender lo
  disimulaba normalizando en tiempo real al deformar en el viewport, pero el
  exportador de glTF solo guarda los 4 huesos de mayor peso por vértice — con
  docenas de huesos casi empatados en peso, terminaba eligiendo casi al azar,
  de ahí la deformación grande al animar el brazo.
  **Fix real:** recalcular el skinning de cero con el algoritmo de Blender
  (`bpy.ops.object.parent_set(type='ARMATURE_AUTO')`, difusión de calor sobre
  la superficie de la malla, no por distancia euclídea — importante porque en
  la pose de reposo los brazos están pegados al torso) tras borrar todos los
  vertex groups viejos. Post-fix: mediana de suma de pesos ~0.995, 95% de los
  vértices en rango sano, más un suavizado leve
  (`bpy.ops.object.vertex_group_smooth(factor=0.5, repeat=3)` en modo Weight
  Paint) para limar transiciones duras entre huesos.
  ⚠️ **Segunda vuelta — "grietas" al mover el brazo:** el recálculo de arriba
  dejó el cuerpo estable pero abrió grietas visibles en hombro/cuello al
  animar. Causa real, dos partes: (1) el mesh tiene **4019 grupos de vértices
  duplicados por costura UV/normal** (misma posición 3D, distinto UV — normal
  en cualquier malla con textura) y muchos de esos grupos quedaron con pesos
  de hueso ligeramente distintos entre copias (la difusión de calor las trata
  como nodos separados del grafo de conectividad) — al rotar el brazo cada
  copia se movía un poquito distinto y la costura se abría. (2) **358 vértices
  quedaron sin ningún peso asignado** (geometría casi aislada, sobre todo cerca
  del cuello/omóplato, que la difusión de calor no pudo alcanzar) — sin peso,
  un vértice no seguía al esqueleto para nada.
  Fix (`tools` ad-hoc en Blender, no versionado): (1) para cada vértice sin
  peso, copiar el peso completo del vértice pesado más cercano (KDTree); (2)
  ⚠️ ese paso va ANTES de sincronizar duplicados — si no, algunos grupos
  duplicados quedaban con peso total 0 y no se sincronizaban (pasó en el primer
  intento: solo 3984 de 4019); (3) agrupar vértices por posición idéntica
  (redondeada a 5 decimales), promediar los pesos de cada grupo y reasignar el
  mismo resultado a todas las copias — con (1) hecho antes, esta vez sincronizó
  los 4019 de 4019. Verificado con 24 frames repartidos por todo el ciclo de
  caminata (antes solo se habían mirado 6 y por eso se dio por resuelto una vez
  sin serlo del todo): sin grietas en ninguno. El `neutral_bone` (huérfano, sin
  peso de ningún vértice tras el fix) quedó podado del esqueleto exportado —
  inofensivo, era un hueso de control sin uso real.
  ⚠️ **Tercera vuelta — dedos/mano pegados al cuerpo (pedido explícito del
  dueño: no hace falta articulación de dedos, solo que el brazo y la pierna se
  muevan bien):** primer intento — buscar vértices que ya tuvieran ALGO de
  peso en `Hand`/`ToeBase` y pasarlos 100% a `Forearm`/`Foot` — **no
  alcanzó**: el dueño reportó que un dedo de la mano seguía pegado al cuerpo.
  Causa real: cerca de la mano, un grupo de vértices había quedado pesado casi
  entero hacia huesos de la **pierna** (`L_Calf`/`L_Thigh` — la mano descansa
  cerca de la pierna en la pose de reposo, mismo tipo de confusión de la
  difusión de calor que con los brazos y el torso) **con prácticamente CERO
  peso en `Hand`** — el filtro "¿tiene peso en Hand?" nunca los detectaba.
  **Fix correcto — criterio geométrico, no por peso existente:** tomar la
  posición mundial del hueso `Hand`/`ToeBase` (segmento cabeza→cola en pose de
  reposo) y, sin importar a qué estuviera pesado antes, forzar **100% de
  `Forearm`/`Foot`** a cualquier vértice a menos de 0.09 m de ese segmento.
  Esto sí atrapa los vértices "huérfanos" que el primer intento se salteaba.
  ~4118 vértices afectados (antes solo se habían tocado ~3450). Se hace
  DESPUÉS del fix de vértices sin peso y ANTES de sincronizar duplicados de
  costura. Verificado con 24 frames del ciclo completo, mirando de cerca la
  zona de mano/cadera en cada uno: sin nada pegado ni deformado.
  ⚠️ **Cuarta vuelta — el dueño reportó OTRA vez algo pegado (captura con la
  pierna muy distorsionada) y pidió explícitamente cortar por lo sano: "que
  las partes del cuerpo se mantengan donde van, únicamente debe moverse las
  manos y los brazos".** Decisión: en vez de seguir persiguiendo bugs de
  skinning en la pierna, se sacaron directamente los 12 fcurves de rotación de
  `L_Thigh`/`R_Thigh`/`L_Calf`/`R_Calf` del clip `walk` (quedan 12, solo
  `L_Upperarm`/`R_Upperarm`/`L_Forearm`/`R_Forearm`) — la pierna queda fija en
  pose de reposo todo el ciclo, así que no importa qué tan prolijo esté su
  skinning: nunca se mueve, nunca se puede deformar. Verificado dos formas:
  (1) numéricamente, leyendo el quaternion local de los huesos de pierna en 12
  puntos del ciclo vía Playwright — idéntico en los 12; (2) visualmente con 36
  capturas repartidas en todo el ciclo, zoom en cadera/mano: sin nada pegado
  ni deformado en ninguna. Si en algún momento se quiere que la pierna vuelva
  a moverse, hay que re-agregar esos fcurves Y resolver el skinning de la
  pierna en serio (probablemente con el mismo criterio geométrico que
  mano/pie, o pintura de pesos a mano) — no alcanza con los fixes ya hechos.
  ⚠️ **Quinta vuelta — el dueño reportó otra vez "un dedo pegado al cuerpo"
  aun con la pierna quieta:** midiendo a fondo el archivo YA exportado (no un
  intermedio) encontré que **5434 de 15683 vértices** tenían >15% de peso en
  `Upperarm`/`Forearm` (los únicos huesos que se mueven) **estando fuera de
  la zona real del brazo** — incluía vértices literalmente a la altura del
  pie, 100% pesados a `R_Forearm`. Causa: los fixes anteriores (mano→Forearm,
  dedo del pie→Foot) solo agarraban vértices *cerca* de esos huesos, nunca al
  revés — vértices lejos del brazo que igual habían quedado mal pesados por
  la misma confusión de la difusión de calor (mano y pie quedan muy cerca
  entre sí en la pose de reposo, un mono chico con brazos largos).
  Fix: una "cápsula" geométrica a lo largo de toda la cadena
  `Clavicle→Upperarm→Forearm→Hand` (radio 0.14m, cada lado). Cualquier
  vértice CON peso en esos huesos pero FUERA de la cápsula pierde ese peso
  por completo, sin importar cuánto tuviera — es el opuesto exacto del fix de
  mano/pie (ahí se fuerza peso a los vértices *cerca*; acá se saca a los
  vértices *lejos*). ⚠️ Se aplica como el **último** paso del pipeline (después
  de sincronizar duplicados de costura), no antes — un intento anterior lo
  hizo más temprano y la sincronización de costuras post-fix reintrodujo
  parte de la contaminación en las copias duplicadas; haciéndolo al final no
  hay ningún paso posterior que lo pueda arruinar. Los vértices que quedan en
  0 tras sacarles el peso de brazo se reasignan del vértice pesado más
  cercano que **también** esté fuera de la cápsula (si no se excluye esto, el
  vecino más cercano de un vértice de pie puede ser un vértice real de mano
  — vuelven a quedar pegados). ~728 vértices corregidos. Verificado con 24
  capturas del ciclo completo, zoom en mano/cadera/pie en cada una: nada
  pegado ni estirado. (Nota: sigue habiendo un grupo de vértices a altura de
  pie con peso residual en `Forearm` que la auditoría numérica detecta pero
  que NO es visible en ninguna de las 24 capturas — probablemente mechones de
  pelaje que cuelgan de la muñeca y llegan cerca del tobillo en la pose de
  reposo; si en el futuro se ve algo raro ahí, revisar con
  `tools/inspect_glb.py` + un script que compare `JOINTS_0`/`WEIGHTS_0` contra
  la posición Y de cada vértice, no asumir que ya está 100% perfecto.)
  ⚠️ **Sexta vuelta — el dueño mandó otra captura con la mano/dedo estirado en
  forma de garra:** el fix de mano/pie (vuelta anterior) usaba un radio fijo
  (0.09m) desde el segmento del hueso `Hand`/`ToeBase` — no llegaba a los
  vértices de la PUNTA de los dedos si se extendían más allá de ese radio.
  Esos vértices seguían con su peso original (a veces huesos de PIERNA,
  ahora congelada) — al mover el brazo, ese dedo se estiraba entre el punto
  fijo (pegado a la pierna quieta) y el resto de la mano (que sí sigue al
  brazo). **Fix: flood-fill por conectividad de malla** en vez de radio fijo:
  arrancar de los vértices con >30% de peso en `Hand`/`ToeBase` (núcleo
  confiable) y expandir por aristas reales de la superficie (hasta 25 saltos)
  — así se cubre toda la mano/dedo/pie sin importar la distancia euclídea al
  hueso, porque sigue la malla real en vez de adivinar un radio. ~3700
  vértices afectados. Verificado con 24 capturas del ciclo completo (zoom en
  mano/cadera) + prueba de juego real (60 frames, 6s caminando y girando):
  sin nada pegado ni estirado. Sigue habiendo un residuo chico (~200 vértices
  de mano con ~17% de peso en huesos de pierna, no dominante) que la
  auditoría numérica marca pero no se ve en ninguna prueba — mismo tipo de
  nota que arriba: no asumir 100% perfecto, si vuelve a aparecer algo raro
  revisar con más cuidado (probablemente haga falta pintura de pesos a mano
  en Blender en vez de otro script automático).
  El material también traía `Sheen`/`Anisotropic`/`Specular IOR Level` subidos
  en el Principled BSDF (probablemente para simular "fur" en el viewport de
  Blender), que el exportador vuelca como
  `KHR_materials_sheen`/`anisotropy`/`specular` — con las luces cálidas + bloom
  del juego se veía plástico brillante en vez de peluche mate. Se resetearon a
  los valores neutros de Blender antes de exportar (Specular IOR Level 0.5,
  Anisotropic 0, Sheen Weight 0) — el material final quedó igual de simple que
  el bob.glb original (solo baseColor+roughness+normal, sin extensions).
  `bob3d.js` no tiene clip de "idle" propio (el .blend solo trae el de caminata):
  cuando la velocidad es ~0 el clip de caminata se **pausa** en el frame en el que
  esté (pose neutra), y cuando BOB se mueve se reproduce con `timeScale` escalado a
  la velocidad — ver `this._singleClip` en `bob3d.js`. Si en el futuro llega un
  clip de idle separado, `_setupModel` ya lo detecta por nombre (`idle|stand|breath`)
  y vuelve al crossfade idle↔move de antes. El `bob.glb` viejo (sin animación) quedó
  de backup en `bob.sin-animacion-previo.glb` (mismo patrón que
  `bob.sin-rig-o-previo.glb`, que es el aún más viejo, sin rig). El sistema sprite
  viejo (`src/player/bob.js` + PNGs) sigue de **backup — NO TOCAR NI BORRAR**.
- **Probador:** sistema de capas PNG. BOB base + 1 PNG transparente por prenda dibujado
  sobre su pose, apiladas en tiempo real (torso/piernas/pies/accesorio). Como los avatares 2K.
- **Login:** cuenta propia del juego, match por email contra la API de clientes de
  TiendaNube (TN no tiene SSO de clientes).
- **Compra:** el backend crea cupón de descuento (FT$ canjeados) + carrito por API de TN
  y abre el checkout real de TiendaNube. El juego NUNCA procesa pagos.
- **Productos exclusivos:** cargados en TN sin categoría, no indexados, comprables solo
  por link directo que conoce el juego. (Verificar comportamiento en Fase 5.)
- **FT$:** base de datos Notion (Usuario/Email/FT$/Historial) vía API. El saldo vive en
  el servidor, nunca en el navegador.
- **Hosting:** Vercel (funciones serverless para backend) + dominio propio.
- **Assets:** las ilustraciones (BOB, prendas, texturas de marca) se generan FUERA y se
  guardan en `store-simulator/public/assets/`. El código no dibuja arte final — los
  placeholders procedurales existen solo hasta que llegue el asset real.

## ⚠️ PIVOT DE ARQUITECTURA (pedido del dueño): la INTRO ahora es la calle real

El juego YA NO arranca directo adentro del shopping de 5 pisos. Arranca **afuera**,
en una recreación del **exterior real de Burela 2570** (Villa Urquiza), construida
según el spec de art-direction del dueño en `design/SPEC_MAPA_BURELA.md` (medidas,
paleta hex, materiales, todo). Todo esto vive en `world/street.js`, con su propio
sistema de coordenadas del spec: **1u=1m, +Z hacia la calle, origen = pie de los
escalones frente al local**.

- **Ejes/alturas:** vereda y plaza a y=0; galería y local ELEVADOS a **y=0.45**
  (`PLAT`). Se sube por **3 escalones** (contrahuella 0.15, huella 0.32) — el spec
  marca esto como CRÍTICO. `streetSampleGround(x,z)` da la altura: rampa invisible a
  ~26° sobre los escalones (los peldaños son visuales, la colisión es la rampa).
- **Suelos:** calzada oscura (no caminable, más allá del cordón), vereda gris
  (`veredaTile`), plaza de adoquín hexagonal "panal de abeja" (`hexPaver`).
- **Galería porticada:** columnas cuadradas 0.40 verde salvia `#8C9A78` (eje 4.5m),
  alero volado 1.5m. Frente de locales: persiana verde inglés (cerrados) menos el
  vano central = **FOURTWENTY**, con vidriera de cuadrícula verde inglés `#2F5A3A`,
  zócalo ciego, puerta abierta y neón.
- **Torre de fondo** (bandas ladrillo `#A44E32` + crema `#E1DDC6` + balcones verdes),
  torres vecinas y reja verde del patio — solo decorado.
- **Local chico de FOURTWENTY** (adentro, `buildLocalInterior`, a y=0.45): SOLO la
  estructura — **sin muebles todavía**, el dueño manda esos assets después (ver
  `design/GUIA_DISENO.md`).
- **Hueco atrás-derecha del local:** a propósito sin nada cargado — futuro acceso al
  shopping de 5 pisos. Nota grande al final de `world/street.js`. No implementar el
  trigger sin que el dueño lo pida.
- **Movimiento (actualizado por el dueño):** WASD marca el RUMBO relativo a la
  cámara, estilo GTA a pie: A/D mueven a los costados (BOB gira suave hacia ese
  rumbo y la cámara fija lo sigue sola; mantener A/D = correr en círculo, como
  GTA con teclado). S retrocede SIN darse vuelta (0.6x, A/D dirigen tipo tanque).
  Velocidades aprobadas: WALK 3.4 / RUN 5.8, giro TURN_SPIN 2.6 rad/s.
- **Refactors para soportar 2 mundos:** `player/bob3d.js` tiene `this.sampleGround`
  reemplazable (la calle pasa la suya); `core/camera.js` recibe `bounds` +
  `ceilingHeight` por parámetro (main.js los cambia según afuera/adentro);
  `ui/hud.js` tiene `setZone(texto)` para escenas sin pisos numerados.

⚠️ **El shopping de 5 pisos NO se tocó ni se borró** — `world/building.js`,
`retail.js`, `gallery.js`, `signage.js`, `collections.js`, `layout.js`,
`customModels.js` siguen intactos y funcionando, solo que `main.js` no los llama
por ahora (están "en espera" hasta la carga de mapa). Toda la regla de diseño de
abajo (pisos, colecciones) sigue vigente PARA CUANDO SE RECONECTE ese mundo.

## Regla de diseño del shopping de 5 pisos (en espera, ver arriba)

El local es un **edificio de 5 pisos** (losas, paredes, escaleras alternadas) de
**12 x 9 m por piso** (÷3 pedido por el dueño: escala de tienda real GTA V, techos
3.4 m). **El dueño dirige el diseño interior.** NO agregar muebles,
decoración ni gráfica sin que él lo pida explícitamente. Distribución pedida y hecha:
- **Piso 1 (planta baja):** lobby FOURTWENTY con **carteles de neón** con el nombre
  de la marca (`world/signage.js`) — también hay un neón por piso.
- **Piso 2 · ORIGEN** — 12 prendas, galería estilo showroom (foto de referencia).
- **Piso 3 · HOOP SEASON** — 4 prendas de básquet (camisetas con número), media
  cancha de madera pintada + aro con tablero.
- **Piso 4 · BOB** — 42 prendas con la carita del mono, en dos paredes a dos filas,
  + **estatua gigante de BOB** (el mismo bob.glb, 2.6 m) sobre pedestal.
- **Piso 5 · CULTURA** — 1 prenda única en vitrina central con foco, mural graffiti
  "CULTURA", alfombra negra y LEDs verticales (ambiente hip hop).
Nombres/cantidades/paletas editables en `world/collections.js`; geometría en
`world/gallery.js`. Las prendas son siluetas dibujadas (remera/buzo/camiseta),
placeholders hasta linkear TiendaNube (Fase 5): cada colección se mapea a una
categoría de TN y aparecen los productos reales con foto y precio.

## Productos + Tiendanube (catálogo, click de compra y admin)

El catálogo de prendas vive en `public/assets/data/productos.json` (5 colecciones:
`local` + los 4 pisos), y es la ÚNICA fuente para el panel de producto y el admin.
Dos formas de llenarlo, MISMO formato — a mano ahora, automático cuando haya
credenciales — sin cambiar cómo se muestra nada.

```
src/data/productosStore.js       única puerta a los datos: carga (localStorage del
                                 dueño → productos.json), guarda (localStorage +
                                 POST /api/productos en dev), getProductoForSlot
                                 (cicla los activos por gancho), export/import, subs.
src/interact/productClicks.js    ⭐ CLICK EN PRENDA: capa NUEVA y AISLADA (raycaster
                                 propio, no toca cámara/controles). Solo mira meshes
                                 tageados userData.productSlot={piso,index}. Hover con
                                 tooltip + click → panel. Bloqueada en loading/editor.
src/ui/productPanel.js           tarjeta de producto (imagen/nombre/precio/desc) +
                                 botón COMPRAR que SOLO redirige al link de TN (jamás
                                 procesa pagos). Cierra con Esc/✕/click afuera.
src/ui/adminPanel.js             ⭐ ADMIN (tecla P; en build online ?admin=1): prendas
                                 por piso, form por percha (imagen/nombre/precio/link/
                                 desc/visible), +agregar/borrar, categoriaTN por piso.
                                 Auto-guarda (localStorage + productos.json en dev).
                                 Export/Import JSON + botón Sincronizar Tiendanube.
                                 P se bloquea si el editor de mundo está activo (usa P).
src/integrations/tiendanube/     mapper.js (PURO, browser+node: {es} multi-idioma,
                                 precio de variants, imagen images[].src, link
                                 canonical_url) + client.js (/api/tn/* con degradado) +
                                 README con el paso a paso completo del dueño.
tools/tiendanube/                SOLO node (credenciales del .env, nunca al bundle):
                                 api.mjs (auth code→token en apps/authorize/token, API
                                 v1 con header 'Authentication: bearer'), get-token.mjs
                                 (npm run tn:token -- CODE), sync.mjs (npm run tn:sync →
                                 llena productos.json: cada colección con categoriaTN se
                                 vuelve espejo de esa categoría; las demás quedan manual).
vite.config.js                   middleware SOLO-dev: GET/POST /api/productos (el admin
                                 escribe el archivo real) + /api/tn/status + /api/tn/sync.
```

Prendas tageadas `userData.productSlot` (sin cambio visual): las 4 colgadas + el jean
del local (`street.js`) y todas las de galería + la pieza CULTURA (`gallery.js`).
Credenciales en `.env` (gitignoreado, ver `.env.example`) — sin `.env` todo funciona
igual con carga manual. `npm run dev` habilita guardar en archivo y el sync; el build
online cae a localStorage + Exportar.

## Estado de fases

| Fase | Qué | Estado |
|------|-----|--------|
| 1 | Local 3 pisos vacío + BOB caminando (WASD + mouse) | ✅ hecha |
| 2 | Prendas, precios y probador (capas PNG) | pendiente |
| 3 | Bolsa y caja (economía local) | pendiente |
| 4 | Backend, login y FT$ reales (Notion) | pendiente |
| 5 | Integración TiendaNube (compra real) | pendiente |
| 6 | Mobile (joystick virtual) | pendiente |
| 7 | Deploy Vercel + pulido | pendiente |

## Cómo correr el juego

```bash
cd store-simulator
npm install
npm run dev      # http://localhost:5173
npm run build    # produce dist/
```

## Estructura del juego (`store-simulator/src/`)

```
main.js               bootstrap: renderer pixelado, loop, wiring de módulos.
                       ESCENA ACTIVA hoy: world/street.js (calle + local chico).
                       El shopping de 5 pisos está en espera (ver pivot arriba).
core/input.js         input por acciones (WASD/flechas, Shift sprint, mouse, E) — Fase 6 suma touch
core/camera.js        cámara GTA: inercia, auto-acomodo detrás (caminando y parado); bounds
                       y ceilingHeight son parámetro, cada escena pasa los suyos
world/street.js       ⭐ ESCENA ACTIVA: vereda/galería real de Burela 2570 + local chico
                       de FOURTWENTY (sin muebles todavía). Ver pivot de arquitectura arriba.
world/anim.js         displays giratorios (vitrina CULTURA, plataforma del lobby)
world/textures.js     texturas procedurales 256px (piso blanco, pared blanca, escalera, ventanas)
world/building.js     obra gruesa x5: 3 losas, paredes, 2 escaleras, colliders, sampleGround(x,z,y)
world/layout.js       ⭐ PLANO EDITABLE: el dueño mueve/agrega/quita muebles y elige
                      colores acá (coordenadas + tipos documentados en el archivo)
world/customModels.js carga muebles GLB propios del dueño (herramienta imagen→3D):
                      normaliza escala/pivote solo — ver public/assets/furniture/README.md
                      (ya en uso: `perchero_remeras.glb`, un perchero real con remeras
                      reales del dueño, uno por piso — reemplaza al perchero de prueba)
world/collections.js  una colección por piso: nombre, cantidad, tema, paleta, y
                      `fotos` (PNG reales de prendas en public/assets/prendas/)
world/gallery.js      galería showroom por colección + ambientaciones temáticas
world/signage.js      neones FOURTWENTY (lobby + uno por piso)
world/retail.js       mobiliario retail de los 5 pisos (patrón aprobado por el dueño):
                      percheros circulares, estanterías con zapatillas, maniquíes,
                      probador con cortina, caja con posnet, espejos, carteles físicos
                      y rieles de luz. Props repetidos via InstancedMesh (un mesh por
                      tipo para todo el edificio). Cada piso respeta su colección.
world/editor/         ⭐ WORLD EDITOR interno (tecla T o Tab; en build ?editor=1):
                      worldEditor.js (gizmo TransformControls + órbita libre de cámara +
                      atajos), editableRegistry.js (registro de TODO el mundo: auto-registro
                      recursivo con ids determinísticos calle:N.N / bobilonia:N.N, duplicar,
                      borrar/ocultar, clones persistentes), editorPanel.js (panel DOM con
                      lista + filtro + inputs XYZ), layoutStore.js (localStorage +
                      public/assets/layouts/furniture-layout.json como base del repo).
                      Atajos: T/Tab editor · click o lista selecciona · 1/2/3 mover/rotar/
                      escalar (escala por eje = estirar) · Q world/local · G snap ·
                      Ctrl+C/V copiar-pegar objeto · Ctrl+D duplicar · Supr borrar (originales
                      se OCULTAN, copias se borran) · P selecciona el grupo padre · Esc
                      deselecciona · Ctrl+S guardar. En modo editor la cámara es libre
                      (orbitar/pan/zoom con mouse) y BOB queda pausado. BOB está
                      registrado como editable "transient" (id `bob`): se puede
                      teletransportar/escalar/rotar en vivo pero NUNCA queda en el
                      layout (el spawn no se rompe); duplicarlo crea una estatua que
                      sí persiste. ⚠️ Los colliders son cajas fijas: mover una pared
                      con el editor NO mueve su colisión. Excepción: los objetos BAJOS
                      (alto propio ≤ 0.42m, sin importar cómo estén rotados/inclinados)
                      son "escalones" — no bloquean, se pisan, y su altura real se mide
                      con un raycast que sí sigue su rotación (main.js: STEP_MAX_HEIGHT,
                      sampleStepHeight). Así, un escalón/rampa duplicado con el editor y
                      rotado en diagonal o inclinado sigue siendo subible.
player/bob3d.js       jugador ACTIVO: GLB + física GTA (aceleración, giro suave) + sombra blob
                      + AnimationMixer con el clip real de caminata (ver BOB arriba)
player/bob.js         backup sprite 2D — NO TOCAR NI BORRAR
ui/hud.js             HUD retro: título, indicador de piso, ayuda de controles
tools/inspect_glb.py  inspector de GLB: skeleton, clips, tamaño
```

Convenciones: ES modules, sin framework de UI (DOM plano para HUD), unidades en metros,
`three` version-pinned en package.json. Assets reales de BOB van en
`public/assets/bob/` (ver README ahí) y reemplazan el placeholder automáticamente.
