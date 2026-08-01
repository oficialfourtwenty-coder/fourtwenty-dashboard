# Autos del Simulador Bobilonia

## Estado actual

Los modelos GLB reales ya estan activos:

- `car-up-luca.glb`: Volkswagen up! Pepper de Luca.
- `car-corolla-fer.glb`: Toyota Corolla.

`src/world/cars.js` conserva un modelo procedural como respaldo si un GLB no
carga, pero no es la visual principal.

Cada auto mantiene:

- Posicion y color editables.
- Colision e interaccion.
- Entrada a una vista de interior.
- Radio compartida con el celular.
- Musica persistente al entrar o salir.

Interiores:

- `interiors/pepper-luca.jpg`.
- `interiors/corolla-fer.jpg`.

## Reemplazar u optimizar

Mantener exactamente los nombres anteriores para no perder interacciones. Antes
de reemplazar:

1. Hacer la prueba en una rama separada.
2. Conservar escala, pivote y orientacion.
3. Revisar puertas, radio, asiento, colision y World Editor.
4. Apuntar a menos de 2.5–3 MB por auto cuando sea posible.
5. Ejecutar build y probar ambos interiores.

No activar compresion GLB que requiera un decoder inexistente. El futuro
pipeline visual agregara decoders de forma central antes de recomprimir assets.
