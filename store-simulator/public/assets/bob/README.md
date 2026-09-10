# BOB 3D

## Modelo activo

- Archivo: `bob.glb`.
- Peso aproximado: 1.3 MB.
- Lo carga `src/player/bob3d.js`.
- Tiene skeleton y un clip de caminata.

El rig actual funciona con un compromiso: luego de varias reparaciones de
pesos, las piernas quedaron sin animacion para evitar deformaciones y se mueven
principalmente brazos/manos. No reemplazar ni reexportar `bob.glb` como cambio
menor.

## Siguiente etapa aprobada

Antes de crear la coleccion de ropa 3D:

1. Crear un rig definitivo en una rama de prueba.
2. Congelar nombres de huesos y proporciones.
3. Verificar idle, caminar y correr.
4. Probar una sola remera durante todas las animaciones.
5. Recién despues producir mas prendas.

Los GLB `bob.sin-animacion-previo.glb` y `bob.sin-rig-o-previo.glb` son backups
de trabajo y no deben formar parte del build final.
