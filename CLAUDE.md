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
- **Estética (actualizada por el dueño):** look **GTA San Andreas** — piso blanco
  showroom, paredes blancas, luz blanca pareja, render interno a 1/2 resolución
  reescalado con `image-rendering: pixelated`, texturas procedurales 256px
  `NearestFilter`, niebla clara. Movimiento con peso: aceleración/frenada en rampa,
  giro suave, sprint con Shift.
- **BOB (actualizado por el dueño):** modelo 3D low-poly en `public/assets/bob/bob.glb`
  cargado por `src/player/bob3d.js` (escala y pies se normalizan solos; si el GLB trae
  clips usa AnimationMixer, si no anima procedural; sombra blob estilo PS2). El sistema
  sprite viejo (`src/player/bob.js` + PNGs) queda de **backup — NO TOCAR NI BORRAR**.
  ⚠️ `bob.glb` existe solo en la máquina del dueño; falta pushearlo al repo.
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

## ⚠️ Regla de diseño (pedido explícito del dueño)

El local es un **edificio de 3 pisos** (obra gruesa: losas, paredes, escaleras) de
**70 x 50 m por piso** (x5 del original, pedido del dueño). **El dueño diseña el
interior desde cero.** NO agregar muebles, decoración ni gráfica sin que él lo pida
explícitamente. Lo ya pedido y hecho:
- **Una colección por piso** (pedido del dueño), cada una con galería/showroom estilo
  Urban Monkey (foto de referencia): prendas colgadas con placas, atriles, pedestales
  blancos, LEDs lineales y cartel con el nombre. Piso 1 `FT ESSENTIALS` (paleta '92),
  piso 2 `FT STREET` (naranja/negro/gris), piso 3 `FT EXCLUSIVE` (dorado/negro, para
  las exclusivas canjeables con FT$). Nombres/paletas editables en
  `world/collections.js`; la geometría en `world/gallery.js`. Todo greybox/placeholder
  hasta linkear TiendaNube (Fase 5): ahí cada colección se mapea a una categoría de TN
  y aparecen los productos reales.

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
main.js               bootstrap: renderer pixelado, loop, wiring de módulos
core/input.js         input por acciones (WASD/flechas, Shift sprint, mouse, E) — Fase 6 suma touch
core/camera.js        cámara GTA: inercia, auto-acomodo detrás al caminar, clamp al local
world/textures.js     texturas procedurales 256px (piso blanco, pared blanca, escalera, ventanas)
world/building.js     obra gruesa x5: 3 losas, paredes, 2 escaleras, colliders, sampleGround(x,z,y)
world/collections.js  una colección por piso: nombre, paleta, títulos (editable)
world/gallery.js      galería showroom reutilizable (greybox, pedido del dueño)
player/bob3d.js       jugador ACTIVO: GLB + física GTA (aceleración, giro suave) + sombra blob
player/bob.js         backup sprite 2D — NO TOCAR NI BORRAR
ui/hud.js             HUD retro: título, indicador de piso, ayuda de controles
tools/inspect_glb.py  inspector de GLB: skeleton, clips, tamaño
```

Convenciones: ES modules, sin framework de UI (DOM plano para HUD), unidades en metros,
`three` version-pinned en package.json. Assets reales de BOB van en
`public/assets/bob/` (ver README ahí) y reemplazan el placeholder automáticamente.
