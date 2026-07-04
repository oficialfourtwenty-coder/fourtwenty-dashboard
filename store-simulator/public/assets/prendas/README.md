# Fotos reales de prendas

Acá van los PNG de las prendas que se cuelgan en las paredes de cada piso.

Requisitos de cada archivo:
- **PNG con fondo transparente** (la prenda recortada, sin fondo)
- Proporción aproximada 4:5 (más alto que ancho), mínimo ~512px de alto
- Nombre simple sin espacios: `origen_01.png`, `hoop_03.png`, etc.

Para activarlas: abrí `src/world/collections.js` y anotá los nombres en la
lista `fotos` de la colección, en orden. Ejemplo:

```js
fotos: ['origen_01.png', 'origen_02.png'],
```

La prenda 1 del piso usa la primera foto, la 2 la segunda… las que no tengan
foto siguen mostrando la silueta dibujada. En la Fase 5 estas fotos van a
salir solas de TiendaNube.
