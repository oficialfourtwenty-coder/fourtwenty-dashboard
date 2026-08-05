# Cuadros de ORIGEN

Hay dos formas de cambiar un cuadro. La segunda es la nueva y la mas completa.

## 1. Poner una foto sin tocar nada (rapido)

Arrastra a esta carpeta hasta tres fotos `.jpg`, `.jpeg`, `.png` o `.webp`.
Al recargar el simulador, cada archivo aparece dentro de uno de los cuadros.

- El orden alfabetico de los nombres define cuadro 1, 2 y 3.
- Recomendado: WebP o JPG, entre 800 y 1600 px por lado, menos de 300 KB.
- Proporcion ideal 3:4 (vertical).
- Para cambiar una imagen, reemplaza el archivo conservando su nombre.

## 2. Editor de cuadros dentro del juego (texto, tipografia, logo y foto)

1. Entra al piso y abre el editor de mundo con **`T`**.
2. Clickea el cuadro que quieras (o buscalo en la lista de la derecha).
3. A la **izquierda** se abre el panel **EDITOR DE CUADRO**.

Se puede cambiar:

| Que | Detalle |
|---|---|
| Titulo y subtitulo | texto libre |
| Tipografia | 4 opciones, distintas para titulo y subtitulo |
| Tamaño y color | de cada texto por separado |
| Alineacion | izquierda, centro o derecha |
| Altura del texto | donde cae el bloque dentro del cuadro |
| Logo | FT, FOURTWENTY, hoja, o ninguno |
| Color de fondo | cuando no hay foto |
| Foto real | se sube desde la computadora |
| Zoom y encuadre | para acomodar la foto dentro del cuadro |

Todo se ve **en vivo** sobre el cuadro mientras lo editas.

### Guardar

- **GUARDAR** deja el diseño en esta computadora (el navegador). Se mantiene
  aunque salgas del piso o cierres el juego.
- **EXPORTAR JSON** descarga el archivo con todos los diseños. Eso es lo que
  hay que pasarle a Claude o a Codex para que el diseño entre al repositorio y
  lo vean Fer y cualquier otra computadora.

> Igual que con el editor de mundo: guardar en el navegador **no** lo sube a
> GitHub. Para eso hay que exportar.

### Ojo con el peso de las fotos

Las fotos se achican solas a 1280 px antes de guardarse, pero el navegador
tiene un limite total de unos 5 MB. Si aparece el aviso de que no entro, usa
una foto mas chica o quitale la foto a algun otro cuadro.

## Mover y escalar el cuadro

El cuadro completo se mueve, rota y escala con **`T`** como cualquier otro
objeto (teclas `1` mover, `2` rotar, `3` escalar).
