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

- Tram Station optimizado con Draco: aproximadamente 6.2 MB; antes 85.7 MB.
- City Map optimizado con Draco: aproximadamente 1.2 MB; antes 6.1 MB en el
  archivo incorporado a este checkpoint.
- B54 FTT: aproximadamente 1.1 MB.
- Apartment Building: aproximadamente 17 MB y cerca de 501k triangulos.
- IA7Pbl7bauApRPBmpMDWo: aproximadamente 14 MB.

Los modelos pesados deben ser opcionales, cargarse bajo demanda y optimizarse
antes de produccion. No usar una unica caja de colision para un mapa completo.

El layout vigente utiliza varias copias de City Map y dos Tram Station fuera de
los limites principales para crear fondo urbano, desnivel y vias. Sus posiciones
y escalas deben conservarse salvo pedido directo de Kusher.
