# Modelos 3D editables

Esta carpeta contiene modelos que aparecen en el catalogo del World Editor.

## Flujo actual

1. Guardar el `.glb` con un nombre simple.
2. Revisar licencia, peso, cantidad de mallas y triangulos.
3. Agregar o confirmar su preset en `src/world/editor/modelCatalog.js`.
4. Abrir el juego y presionar `T` o `Tab`.
5. Buscar el modelo y seleccionarlo: se crea una copia delante de BOB.
6. Mover, rotar, escalar y configurar colision/luz.
7. Exportar `public/assets/layouts/furniture-layout.json` para hacerlo oficial.

No considerar oficial una posicion que exista solo en `localStorage`.

## Modelos pesados conocidos

- Tram Station optimizado con Draco + WebP: aproximadamente 1.5 MB y 227k
  triangulos; antes 6.2 MB y 330k triangulos en este checkpoint.
- City Map optimizado con Draco + WebP: aproximadamente 0.75 MB y 59k
  triangulos; antes 1.2 MB y 75k triangulos.
- B54 FTT optimizado: aproximadamente 58 KB y 19k triangulos; antes 1.1 MB.
- Apartment Building de fondo: aproximadamente 0.54 MB y cerca de 60k
  triangulos; antes 17 MB, 501k triangulos y texturas 4K.
- Perchero de remeras: aproximadamente 0.41 MB, 50k triangulos y texturas 1K;
  antes 4.25 MB, 67k triangulos y texturas 2K.
- El original de Apartment Building y otros modelos fuente se conservan fuera
  de `public/`, en `source-assets/`, por lo que no viajan en el build web.

Los modelos pesados deben ser opcionales, cargarse bajo demanda y optimizarse
antes de produccion. No usar una unica caja de colision para un mapa completo.

El layout vigente utiliza varias copias de City Map y dos Tram Station fuera de
los limites principales para crear fondo urbano, desnivel y vias. Sus posiciones
y escalas deben conservarse salvo pedido directo de Kusher.
