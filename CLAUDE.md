# FOURTWENTY — Store Simulator

Juego web 3D: una tienda de ropa virtual de la marca **fourtwenty** donde el jugador
camina con **BOB** (mascota de la marca), se prueba ropa, junta prendas en la bolsa y
termina comprando en el checkout real de TiendaNube.

## ⚠️ VERSIÓN DE TRABAJO ACTUAL (leer esto primero, siempre)

**Esta es la ÚNICA versión sobre la que se trabaja.** El 8 de julio, un intento
de Codex de agregar un ascensor de 6 pisos rompió el mundo y generó versiones
viejas/confusas. El dueño recuperó esta versión ("mundo perfecto") y a partir de
acá seguimos — **no volver a ninguna versión anterior sin que el dueño lo pida
explícitamente**, aunque parezca más "limpia" en el historial de git.

- **Commit de referencia:** `6742172` ("Guardar version actual del mundo
  FOURTWENTY"), en GitHub dentro del branch `codex/elevator-handoff` (no está
  en un branch propio ahí — es un commit intermedio). En la Mac del dueño el
  branch local se llama `probar-mundo-perfecto-6742172`.
- **Cómo correrlo (Mac del dueño):**
  ```bash
  cd /Users/kusher/Desktop/fourtwenty-dashboard
  git switch probar-mundo-perfecto-6742172
  cd store-simulator
  npm run dev -- --host 0.0.0.0 --port 5190
  ```
- **Pendiente:** este branch existía SOLO en la Mac del dueño hasta que esta
  sesión lo empujó a GitHub como `probar-mundo-perfecto-6742172` (mismo commit
  `6742172` + este commit de documentación arriba). Cualquier sesión nueva
  (Claude o Codex) debe partir de acá con `git fetch && git switch
  probar-mundo-perfecto-6742172` — NUNCA de `claude/fourtwenty-store-simulator-g3rigz`
  ni de `main`, que quedaron desincronizados.

### Qué tiene esta versión que otros branches no tienen
- Editor de mundo (tecla T) bastante más extendido que en `claude/fourtwenty-store-simulator-g3rigz`
  (cambios grandes en `editableRegistry.js`, `editorPanel.js`, `worldEditor.js`).
- `src/world/productVisuals.js` (nuevo, no existe en otros branches).
- Mueble nuevo `public/assets/furniture/apartment-building.glb`.
- El video real `public/assets/ui/cultura-intro.mp4` ya cargado (antes era un
  placeholder pendiente).

### Qué NO tiene (para no reintroducir por accidente)
- **El módulo `src/ui/culturaIntro.js`** (intro de video de Cultura como
  componente aislado) que se hizo en `claude/fourtwenty-store-simulator-g3rigz`
  **no existe acá**. Esta versión resuelve el video de Cultura de otra forma,
  integrada directo en `main.js`/`index.html` (mismo patrón que las pantallas
  de carga de hoop-season/bob-collection). Son DOS implementaciones distintas
  del mismo feature — no mezclar ambas sin revisar primero cuál quedó.
- El ascensor de 6 pisos: **NO está implementado**. Se intentó, salió mal, se
  descartó. Ver `design/ELEVATOR_HANDOFF_CLAUDE.md` (si existe en un commit
  posterior) para la spec acordada si se retoma — con mucho más cuidado que la
  vez pasada: probar en un branch/worktree aparte, nunca directo sobre esta
  versión, y confirmar con el dueño antes de cada paso grande.

### Regla operativa
Antes de tocar código de este proyecto, cualquier sesión (mía o de Codex) debe
confirmar en qué branch está parada y que coincide con `probar-mundo-perfecto-6742172`.
Si se va a probar algo grande y riesgoso (como un ascensor), hacerlo en un
branch/worktree separado y NO mezclarlo con este hasta que el dueño lo vea
funcionando y lo apruebe explícitamente.

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
