# FOURTWENTY — Store Simulator

Juego web 3D: una tienda de ropa virtual de la marca **fourtwenty** donde el jugador
camina con **BOB** (mascota de la marca), se prueba ropa, junta prendas en la bolsa y
termina comprando en el checkout real de TiendaNube.

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
  El GLB está optimizado: 465k → 22.5k triángulos, 15.5 MB → 2.6 MB (gltf-transform).
  **Sin skeleton ni animation clips** → animación procedural (bounce/lean). Mejora
  pendiente: conseguir versión riggeada con clips idle/walk (Mixamo o rig de Tripo)
  y el AnimationMixer ya presente en bob3d.js la usa solo. El sistema sprite viejo
  (`src/player/bob.js` + PNGs) queda de **backup — NO TOCAR NI BORRAR**.
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
- **Movimiento:** el spec sugiere walk 2.2 / run 5 m/s, pero el dueño ya aprobó el
  feel actual (WALK 3.4, sprint x3) — NO se tocó bob3d.js. El spec es art-direction
  del mapa, no del movimiento.
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
                      (orbitar/pan/zoom con mouse) y BOB queda pausado. ⚠️ Los colliders son
                      cajas fijas: mover una pared con el editor NO mueve su colisión.
player/bob3d.js       jugador ACTIVO: GLB + física GTA (aceleración, giro suave) + sombra blob
player/bob.js         backup sprite 2D — NO TOCAR NI BORRAR
ui/hud.js             HUD retro: título, indicador de piso, ayuda de controles
tools/inspect_glb.py  inspector de GLB: skeleton, clips, tamaño
```

Convenciones: ES modules, sin framework de UI (DOM plano para HUD), unidades en metros,
`three` version-pinned en package.json. Assets reales de BOB van en
`public/assets/bob/` (ver README ahí) y reemplazan el placeholder automáticamente.
