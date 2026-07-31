# Música del simulador

La música suena en todo el simulador. Los autos estacionados en Burela son las
dos radios:

- Volkswagen up! Pepper TSI de Luca: `luca/`
- Toyota Corolla 2019 de Fer: `fer/`

## Cómo cargar temas

Arrastrá el MP3 a la carpeta del auto y recargá el juego.

```text
public/assets/musica/luca/mi_tema.mp3
public/assets/musica/fer/artista_local.mp3
```

No edites `playlists.json`: ahora se genera solo cuando corre `npm run dev` o
`npm run build`.

## Nombres recomendados

Usá nombres simples, sin acentos raros:

```text
luca_01.mp3
fer_taus_01.mp3
pal_coliseo_ft_ff42.mp3
```

El nombre del archivo se convierte en el título que muestra la radio. Por
ejemplo, `pal_coliseo_ft_ff42.mp3` aparece como `Pal Coliseo Ft Ff42`.

## Permisos

En la carpeta de Fer va música de otros artistas. Tené permiso por escrito antes
de subir cada tema. Alcanza un WhatsApp:

```text
Te doy permiso para usar [tema] en el simulador de FOURTWENTY.
```

No subas música de Spotify, YouTube o artistas sin permiso.

## Peso

Recomendación: MP3 a 192 kbps, 6 a 8 temas en total. Más que eso hace que el
juego tarde más en abrir, sobre todo en celular.
