# Musica del Simulador Bobilonia

La musica se comparte entre el celular y las radios de los autos.

## Estado actual

- Volkswagen up! Pepper de Luca: `luca/`.
- Toyota Corolla: `fer/`.
- El manifiesto `playlists.json` se genera al correr dev/build. No editarlo a
  mano salvo una tarea tecnica especifica.
- Los 11 temas activos estan en MP3 mono, 44.1 kHz y 96 kbps. Ocupan unos
  26 MB en total; antes ocupaban unos 361 MB en WAV.

## Objetivo aprobado

- Llegar a 33 canciones totales, incluyendo beats.
- Rediseñar el celular para navegar primero por artista y luego por tema/beat.
- Mantener play, pausa, anterior y siguiente sincronizados entre auto y celular.
- Cargar el audio solamente cuando se reproduce.

## Agregar musica durante desarrollo

Guardar el archivo en la carpeta correspondiente y reiniciar el servidor:

```text
public/assets/musica/luca/nombre_tema.ext
public/assets/musica/fer/nombre_tema.ext
```

Usar nombres simples. El formato publicado recomendado es MP3 mono a 44.1 kHz y
96 kbps. Si se agrega un WAV durante desarrollo, convertirlo antes de llevarlo
a la rama oficial y retirar el WAV de `public/`. Conservar los masters fuera del
build publicado.

## Permisos

Cada artista debe autorizar por escrito el uso del tema en el simulador. Guardar
el permiso fuera del repositorio. No subir musica descargada de plataformas ni
material sin autorizacion.

## Rendimiento

Treinta y tres temas son viables si no se descargan al inicio. Registrar peso,
duracion, artista y permiso de cada archivo antes de publicar.
