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
- **Estética:** low-poly estilo PS2 — texturas 256px `NearestFilter`, render interno a baja
  resolución reescalado con `image-rendering: pixelated`, niebla suave, luz cálida,
  paleta tipo Ralph Lauren '92 (verde cazador, bordó, crema, dorado).
- **BOB:** sprite 2D billboard (técnica Paper Mario/Doom) dentro del mundo 3D. Solo rota
  en yaw hacia la cámara. Animación por frames PNG. **Nunca** modelo 3D.
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

El local es un **edificio de 3 pisos VACÍO** (obra gruesa: losas, paredes, escaleras).
**El dueño diseña todo el interior desde cero.** NO agregar muebles, estanterías,
percheros, probador, mostrador, decoración ni gráfica sin que él lo pida explícitamente.

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
main.js               bootstrap: renderer PS2, loop, wiring de módulos
core/input.js         input por acciones (WASD/flechas, mouse, E) — Fase 6 suma touch acá
core/camera.js        cámara tercera persona: orbit yaw/pitch, follow exponencial, clamp al local
world/textures.js     texturas procedurales 256px estilo PS2 (hormigón, revoque, escalera)
world/building.js     obra gruesa: 3 losas, paredes, 2 escaleras, colliders AABB, sampleGround(x,z,y)
player/bob.js         BOB billboard: movimiento relativo a cámara, colisión círculo-vs-AABB, frames
ui/hud.js             HUD retro: título, indicador de piso, ayuda de controles
```

Convenciones: ES modules, sin framework de UI (DOM plano para HUD), unidades en metros,
`three` version-pinned en package.json. Assets reales de BOB van en
`public/assets/bob/` (ver README ahí) y reemplazan el placeholder automáticamente.
