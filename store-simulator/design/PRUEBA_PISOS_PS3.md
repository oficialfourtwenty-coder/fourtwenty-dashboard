# Prueba de pisos PS3 tematicos

## Versiones

- Rama de prueba: `codex/prueba-pisos-ps3`.
- Base oficial preservada: `version-final-final-final` en `e65a59e`.
- Esta prueba no modifica Calle Burela ni reemplaza la version oficial hasta que
  Kusher la apruebe.

## Base visual compartida

Los pisos ORIGEN, HOOP SEASON, CULTURA, BOB y TERRAZA usan la arquitectura PS3
aprobada en Terraza:

- local de 14 x 20 con vidrio panoramico;
- materiales PBR de hormigon, ladrillo y madera;
- techo industrial, conductos, focos y estructura metalica;
- caja, probador, percheros, mobiliario curvo y exhibidores;
- esfera exterior independiente por piso;
- objetos principales editables con `T`;
- una sola escena de piso cargada a la vez.

Se conservaron ascensor, productos, carrito, compra, arcades, telefono y editor.

## Identidad de cada piso

### ORIGEN

- Murales de graffiti ORIGEN y BURELA.
- Cajones y latas de pintura.
- Tres cuadros reemplazables y movibles.
- Paleta verde, bordó, hormigon y metal.

Para cambiar los cuadros, dejar hasta tres archivos JPG, JPEG, PNG o WebP en:

`src/assets/artworks/pisos/1-origen/`

Se ordenan alfabeticamente. Al recargar el simulador se colocan en los tres
marcos sin editar codigo ni JSON. La carpeta contiene instrucciones detalladas.

### HOOP SEASON

- Media cancha de madera con grafica 420.
- Aro, tablero y red.
- Carro con pelotas.
- Marcador Burela League.
- Prendas provisionales tratadas como camisetas numeradas.
- Conserva el entorno de estadio exterior.

### CULTURA

- Archivo mural de vinilos.
- Cabina DJ con dos platos y controles.
- Monitores de audio.
- Grafica inspirada en ecualizadores y cultura local.
- Conserva su esfera propia `cultura-evening-sky.webp`.

### BOBILONIA

- Mesa de juguetes BOB.
- Vitrina de figuras.
- Figura BOB central.
- Retrato BOBILONIA.
- Prendas provisionales con grafica de BOB.

### TERRAZA

- Conserva el patron PS3 ya aprobado y su panorama de terraza real.

## Rendimiento esperado

- Cada viaje libera el piso anterior y construye solamente el elegido.
- Los panoramas y materiales siguen cargandose por piso.
- En la prueba integrada, los pisos estabilizaron cerca de 60 FPS en la Mac de
  trabajo, con aproximadamente 170 a 290 llamadas de dibujo segun el tema.
- BOBILONIA es el piso mas cargado por la cantidad de juguetes, pero mantiene
  materiales compartidos y no carga sus objetos en los otros pisos.

## Prueba minima

1. Recorrer los pisos 1 a 5 desde el ascensor.
2. En cada piso confirmar limites, ascensor y maquina arcade.
3. Abrir un producto en ORIGEN, HOOP, CULTURA y BOB.
4. Abrir `T`, buscar una pieza tematica y moverla.
5. En ORIGEN buscar `cuadro reemplazable` y comprobar los tres marcos.
6. Volver a Calle Burela y confirmar que no cambio.
7. Aprobar o rechazar toda la rama como una unidad antes de promoverla.
