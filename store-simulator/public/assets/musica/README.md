# Música del simulador 🎵

La música suena en TODO el simulador (calle, local, ascensor, pisos). Los dos
autos estacionados en Burela son el **dial**: te subís, apretás la radio y
elegís tema.

- **Volkswagen up! Pepper TSI (Luca)** → playlist `luca` (tus beats)
- **Toyota Corolla 2019 (Fer)** → playlist `fer` (artistas locales con permiso)

## Cómo cargar un tema (3 pasos)

**1. Poné el archivo en esta carpeta.**
Formato `.mp3` (el que mejor anda en todos los navegadores y celulares).
Nombre simple, sin espacios ni acentos: `luca_01.mp3`, `fer_taus_01.mp3`.

> Si el original es WAV, convertilo a MP3 antes. Un WAV de 4 minutos pesa
> ~40 MB y en el celular con datos no carga nunca. MP3 a 192 kbps suena bien
> y pesa ~6 MB.

**2. Anotalo en `playlists.json`.**

```json
{
  "luca": {
    "titulo": "BEATS DE LUCA",
    "temas": [
      {
        "archivo": "luca_01.mp3",
        "titulo": "Nombre del tema",
        "artista": "Luca",
        "link": "https://instagram.com/tu_perfil"
      }
    ]
  },
  "fer": {
    "titulo": "ARTISTAS FOURTWENTY",
    "temas": [
      {
        "archivo": "fer_artista_01.mp3",
        "titulo": "Nombre del tema",
        "artista": "Nombre artístico",
        "link": "https://instagram.com/su_perfil"
      }
    ]
  }
}
```

**3. Listo.** Recargá el juego y el tema aparece en la radio de ese auto.

### Qué hace cada campo

| Campo | Para qué sirve |
|---|---|
| `archivo` | El nombre del MP3 en esta carpeta. **Obligatorio.** |
| `titulo` | Lo que se lee en la pantalla de la radio |
| `artista` | El crédito que se muestra mientras suena |
| `link` | El perfil del artista (IG/Spotify). Se puede clickear |

Si un archivo falta o falla, el reproductor lo saltea solo — no rompe el juego.

## ⚠️ Permisos (importante)

En la playlist de Fer va música de **otros artistas**. De cada uno hay que
tener el permiso **por escrito** antes de subirlo. Alcanza un WhatsApp:

> *"Te doy permiso para usar \[tema\] en el simulador de FOURTWENTY"*

Guardá esos mensajes. El campo `artista` + `link` es lo que les devuelve la
gauchada: su nombre y su perfil aparecen en pantalla mientras suena su tema.

**No subir música de artistas sin permiso.** Ni de Spotify, ni de YouTube.

## Peso total (mirar esto)

Todo lo que pongas acá se descarga cuando alguien entra al simulador desde el
celular. Recomendación: **6 a 8 temas en total**, MP3 a 192 kbps. Más que eso
solo hace que el juego tarde en abrir.
