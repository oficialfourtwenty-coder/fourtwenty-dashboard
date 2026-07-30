# Autos del simulador 🚗

Los dos autos estacionados en la calle Burela. Además de easter egg, son **la
radio del juego** (ver `public/assets/musica/README.md`).

## Estado actual: modelos procedurales

Hoy los autos están construidos **por código** (`src/world/cars.js`): la
silueta sale de un perfil lateral real extruido, con ruedas, vidrios, luces,
espejos, patente Mercosur e interior. Son **reconocibles y con las
proporciones reales de cada modelo**, pero no son fotorrealistas.

| Auto | Dueño | Playlist |
|---|---|---|
| Volkswagen up! Pepper TSI | Luca | `luca` |
| Toyota Corolla 2019 SLINE | Fer | `fer` |

## Cómo poner los modelos REALES (el upgrade)

El sistema ya está preparado. Cuando tengas los modelos 3D de verdad:

1. Guardalos acá con **exactamente** estos nombres:
   - `car-up-luca.glb`
   - `car-corolla-fer.glb`
2. Recargá el juego.

Eso es todo. El auto procedural se esconde solo y en su lugar aparece el
modelo real, **ya escalado a la altura correcta**. La puerta, el asiento de
BOB, la radio y la colisión siguen funcionando igual — no hay que tocar nada
de código.

### Cómo generar los modelos

La forma más directa es la misma que usaste con BOB: **una foto → modelo 3D**.

- Sacale fotos a los autos reales (varias vueltas alrededor, buena luz)
- Pasalas por una herramienta de imagen/foto → 3D (Tripo, Meshy) o por una app
  de escaneo 3D (**Polycam**, **RealityScan** de Epic — gratis)
- Exportá en `.glb`

**Ojo con el peso:** un escaneo crudo puede pesar 50-100 MB, y eso no carga en
un celular. Antes de subirlo acá, optimizalo:

```bash
npx @gltf-transform/cli optimize entrada.glb car-up-luca.glb \
  --texture-size 1024 --compress false --simplify false
```

> `--compress false` es importante: el modo por defecto agrega compresión que
> el cargador del juego no tiene registrada y el modelo no aparecería. Es el
> mismo detalle que con `bob.glb`.

Apuntá a **menos de 3 MB por auto**.

## Ajustes rápidos (sin modelos nuevos)

En `src/world/cars.js`, arriba del archivo, está `CAR_SPECS`. Es una línea por
dato:

| Qué cambiar | Campo |
|---|---|
| Color de la carrocería | `bodyColor` (formato `0xRRGGBB`) |
| Color del techo | `roofColor` |
| Color de las llantas | `rimColor` |
| Patente | `plate` |
| Medidas | `length`, `width`, `height`, `wheelbase` |

Y en `PARKING` (mismo archivo) se cambia **dónde** está estacionado cada uno.
También los podés mover en vivo con el **editor de mundo (tecla T)** — la
colisión se recalcula sola.
