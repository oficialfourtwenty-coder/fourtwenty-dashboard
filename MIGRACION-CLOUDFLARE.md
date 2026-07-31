# MIGRACIÓN A CLOUDFLARE — Simulador Bobilonia

Rama: `migracion-cloudflare` · Base: `version-jueves-30` (`dc8cd86`) · Fecha: 31/07/2026

---

## LO PRIMERO QUE TENÉS QUE SABER

### 1. El proyecto NO depende de Vercel. En absoluto.

Busqué en todo el repo. No hay `vercel.json`, no hay carpeta `api/`, no hay
funciones serverless, no hay ningún paquete `@vercel/*`. Las únicas
dependencias del proyecto son `three` y `vite`.

Vercel aparece **solo como plan a futuro**, mencionado en dos líneas del
`CLAUDE.md` (líneas 289 y 412) y en la Fase 1 del PLAN MAESTRO. Nunca se
construyó.

**Qué significa:** no hay nada que "portar" a Workers. Esto no es una
migración, es un primer deploy. Es mucho más fácil de lo que pensabas.

> **Ojo con esto:** los endpoints `/api/productos`, `/api/tn/status` y
> `/api/tn/sync` que ves en `vite.config.js` son middleware del **servidor de
> desarrollo** (`npm run dev`). El propio archivo lo aclara: *"En el build de
> producción nada de esto existe"*. Sirven para que el panel admin escriba el
> JSON en tu disco mientras trabajás. En producción el juego lee el JSON
> estático y el admin guarda en localStorage. No se rompe nada al mudarse.

### 2. Cloudflare Pages NO acepta archivos de más de 25 MB. Tenés 9.

Este es el punto que hace que R2 sea **obligatorio**, no opcional:

| Archivo | Peso |
|---|---|
| `assets/furniture/tram-station.glb` | 82 MB |
| `assets/musica/fer/Domingo en Burela..wav` | 58 MB |
| `assets/musica/luca/pal coliseo ft.FF42.wav` | 42 MB |
| `assets/musica/luca/mi polo v5.wav` | 40 MB |
| `assets/musica/fer/n l valhalla.wav` | 40 MB |
| `assets/musica/luca/BUENOS AIRES.wav` | 34 MB |
| `assets/musica/fer/revolution sample.wav` | 31 MB |
| `assets/musica/fer/bile.wav` | 31 MB |
| `assets/musica/luca/VALENTINO V8000.wav` | 30 MB |

Si intentás deployar tal cual, **el deploy falla**. No es que ande lento: falla.

El límite de cantidad de archivos (20.000 en plan gratis) no es problema:
`public/` tiene 41 archivos.

> Fuente: [límite de 25 MB por archivo en Cloudflare Pages](https://community.cloudflare.com/t/a-question-about-limits/492111) ·
> [aumento del límite de cantidad de archivos, enero 2026](https://developers.cloudflare.com/changelog/post/2026-01-23-pages-file-limit-increase/)

**Conclusión:** el orden correcto es **R2 primero, Pages después**. Si hacés
Pages primero te vas a comer un error y no vas a entender por qué.

---

## LO QUE YA HICE EN ESTA RAMA

Nada de esto cambia cómo funciona el juego hoy. Verificado con `npm run build`
y sirviendo el `dist/` real.

**Archivos nuevos**

- `store-simulator/src/core/assetUrl.js` — el único lugar del que salen las URLs
  de los assets pesados. Sin variable de entorno devuelve la ruta tal cual
  (comportamiento idéntico al de hoy); con variable, antepone la URL del bucket.
- `store-simulator/public/_headers` — reglas de cache y seguridad para Pages.
  Vite lo copia solo a `dist/`. Ya verificado que llega.
- `store-simulator/wrangler.toml` — para poder probar el sitio localmente tal
  como lo va a servir Cloudflare, y con el binding de R2 dejado listo pero
  comentado.
- `store-simulator/functions/api/health.js` — endpoint mínimo para confirmar que
  el runtime de Workers está vivo después del deploy.

**Archivos modificados** (solo se cambió el punto donde se pide el archivo)

`src/audio/musicPlayer.js` · `src/world/customModels.js` · `src/world/cars.js` ·
`src/world/gallery.js` · `src/player/bob.js` · `src/player/bob3d.js` ·
`src/ui/carInteriorView.js` · `src/main.js` · `.env.example`

**Decisión importante que tomé:** apliqué la resolución de URL en el **punto de
carga**, nunca en los datos. El campo `model` del catálogo (`modelCatalog.js`) se
guarda dentro de `furniture-layout.json` y de localStorage — si le metía la URL
del bucket ahí, te quedaba la dirección del CDN hardcodeada adentro de tus
layouts guardados y se rompía todo el día que cambiaras de dominio. Así como
está, tus layouts siguen guardando `assets/furniture/x.glb` y solo la descarga
se redirige.

**Lo que NO pasa por R2, a propósito:** `productos.json`, `furniture-layout.json`
y `playlists.json`. Son chicos, cambian seguido y son parte del deploy. Viajan
siempre con el sitio.

**Los dos videos** (`bob-loading.mp4` 10,6 MB · `cultura-intro.mp4` 6 MB) están
hardcodeados en `index.html`, no en JS. Están por debajo de 25 MB, así que se
pueden quedar en Pages sin problema. Moverlos a R2 requiere tocar el HTML —
optimización para después, no bloquea nada.

**Verificación hecha:**

- `npm run build` sin variable → OK. Las rutas quedan relativas, idénticas a hoy.
- `npm run build` con `VITE_ASSETS_BASE_URL` → OK. Las URLs apuntan al bucket.
- `dist/` servido de verdad: `/` 200, `bob.glb` 200 `model/gltf-binary`,
  los tres JSON de datos 200.
- El bundle pasó de 929,18 kB a 929,39 kB. +0,2 kB.

---

## PARTE 1 — LO QUE TENÉS QUE HACER VOS, A MANO

> Hacelo en este orden. El orden importa: R2 antes que Pages.

### Paso 1 — Crear la cuenta de Cloudflare

1. Entrá a `dash.cloudflare.com/sign-up`.
2. Registrate con tu mail. Verificá el mail.
3. **No agregues todavía el dominio `fourtwenty.com`.** El dominio es el último
   paso de todo esto. Si lo agregás ahora no rompés nada, pero te vas a tentar
   de apurar el DNS antes de tiempo.

El plan gratis alcanza para arrancar. R2 tiene 10 GB gratis por mes: vos vas a
usar menos de 1 GB.

### Paso 2 — Crear el bucket R2 y subir los assets

1. En el panel: **R2** → **Create bucket**.
2. Nombre: `bobilonia-assets`. Región: automática.
3. Una vez creado, entrá al bucket → **Settings** → **Public access**:
   - Para probar: activá el subdominio **r2.dev**. Te da una URL tipo
     `https://pub-xxxxx.r2.dev`. Sirve para testear, tiene límite de tráfico.
   - Para producción: **Custom domain** → `assets.fourtwenty.com`. Esto recién
     lo vas a poder hacer cuando el dominio esté en Cloudflare (Paso 6).
4. **CORS — no te saltees esto.** El juego carga los GLB con `fetch` y las
   texturas con `crossOrigin`, así que sin CORS los modelos no cargan y no vas a
   entender por qué. En el bucket → **Settings** → **CORS policy** → pegá:

   ```json
   [
     {
       "AllowedOrigins": ["*"],
       "AllowedMethods": ["GET", "HEAD"],
       "AllowedHeaders": ["*"],
       "MaxAgeSeconds": 3600
     }
   ]
   ```

   (Cuando tengas el dominio final, cambiá `"*"` por
   `["https://juego.fourtwenty.com"]` y quedás más prolijo.)

5. **Subir los archivos.** Son 41 archivos, 556 MB. Desde la terminal, parado en
   `store-simulator`:

   ```bash
   cd ~/Desktop/fourtwenty-dashboard/store-simulator
   npx wrangler login          # abre el navegador, autorizás una vez

   # sube TODO public/assets/ manteniendo la misma estructura de carpetas
   find public/assets -type f | while read -r f; do
     key="${f#public/}"
     echo "subiendo $key"
     npx wrangler r2 object put "bobilonia-assets/$key" --file "$f" --remote
   done
   ```

   Subí **todo** `public/assets/`, no solo los archivos grandes. Es más simple y
   te evita errores: así cualquier ruta `assets/...` existe en los dos lados.
   556 MB en R2 cuesta menos de 1 centavo de dólar por mes.

6. Cuando termine, verificá en el navegador que un archivo abre:
   `https://pub-xxxxx.r2.dev/assets/bob/bob.glb` debería descargar.

### Paso 3 — Conectar el repo a Cloudflare Pages

1. En el panel: **Workers & Pages** → **Create** → **Pages** → **Connect to Git**.
2. Autorizá GitHub y elegí `oficialfourtwenty-coder/fourtwenty-dashboard`.
3. **Production branch:** elegí `migracion-cloudflare`. **No pongas `main`.**
   `main` está vacío (solo tiene un `index.html` suelto) y no queremos tocar la
   rama oficial hasta que esto esté probado.
4. Configuración de build — estos valores exactos:

   | Campo | Valor |
   |---|---|
   | Framework preset | `None` |
   | Build command | `npm run build` |
   | Build output directory | `dist` |
   | **Root directory** | `store-simulator` |

   El **Root directory** es el que más se olvida. Si no lo ponés, Cloudflare
   busca el `package.json` en la raíz del repo, no lo encuentra y el build falla.

5. Antes de darle a Deploy, cargá las variables del Paso 4.

### Paso 4 — Cargar las variables de entorno

En el proyecto de Pages → **Settings** → **Environment variables** →
**Production** (y repetí en **Preview** si querés que las ramas de prueba
también usen R2).

| Variable | Valor | De dónde sale |
|---|---|---|
| `VITE_ASSETS_BASE_URL` | `https://pub-xxxxx.r2.dev` | Del Paso 2.3, la URL pública del bucket. **Sin barra al final.** Después la cambiás por `https://assets.fourtwenty.com`. |
| `NODE_VERSION` | `22` | Fijo. Es la versión con la que se probó el build. |

**Sobre las credenciales de Tiendanube (`TN_CLIENT_ID`, `TN_CLIENT_SECRET`,
`TN_ACCESS_TOKEN`, `TN_STORE_ID`): NO las cargues.** No hacen falta y cargarlas
sería un riesgo sin ganancia. Esas credenciales las usan los scripts
`npm run tn:sync` que corrés **en tu compu**, y el resultado (`productos.json`)
se commitea al repo. El sitio publicado nunca las necesita. Viven solo en tu
`.env` local, que está en `.gitignore`.

Cuando llegue la Fase 1 (checkout con Mercado Pago) ahí sí vas a cargar las
credenciales de MP en Pages, y van **sin** el prefijo `VITE_`.

> **La regla del prefijo `VITE_`:** todo lo que empieza con `VITE_` queda
> **visible dentro del código que se descarga al navegador**. `VITE_ASSETS_BASE_URL`
> lleva ese prefijo a propósito, porque es una URL pública. Una credencial con
> prefijo `VITE_` es una credencial filtrada. Nunca.

### Paso 5 — Deploy y prueba

Dale a **Save and Deploy**. Tarda 1–3 minutos. Te queda una URL
`https://<algo>.pages.dev`. Andá a la Parte 2 de este documento y probá todo
antes de seguir.

### Paso 6 — El dominio (recién ahora, y solo si el Paso 5 salió perfecto)

1. Cloudflare → **Add a site** → `fourtwenty.com`.
2. Cloudflare escanea tus DNS actuales. **Revisá que estén TODOS los registros**,
   sobre todo los MX (mail) y los que apuntan a Tiendanube. Si falta alguno,
   agregalo a mano **antes** de cambiar los nameservers.
3. Cloudflare te da dos nameservers. Los cargás en el panel donde compraste el
   dominio (NIC.ar, GoDaddy, donde sea).
4. Esperá la propagación (de minutos a 24 h).
5. En el proyecto de Pages → **Custom domains** → agregá `juego.fourtwenty.com`.
6. En el bucket R2 → **Custom domain** → `assets.fourtwenty.com`.
7. Actualizá `VITE_ASSETS_BASE_URL` a `https://assets.fourtwenty.com` y **volvé a
   deployar** (la variable se aplica en build, no en runtime — si no redeployás
   sigue usando la URL vieja).

> **Lo importante del Paso 6:** tu tienda de Tiendanube sigue funcionando en
> `fourtwenty.com`. El simulador vive en el subdominio `juego.fourtwenty.com`.
> El cambio de nameservers mueve **todo** el DNS del dominio a Cloudflare,
> incluido el que apunta a Tiendanube. Por eso el punto 2 es crítico: si perdés
> un registro, se cae la tienda. Sacale una captura a la lista de DNS actual
> antes de tocar nada.

---

## PARTE 2 — QUÉ PROBAR ANTES DE TOCAR EL DOMINIO

Todo esto sobre la URL `*.pages.dev`, con la tienda real intacta.

**Prueba local primero** (opcional pero recomendado, es más rápido que esperar
un deploy):

```bash
cd ~/Desktop/fourtwenty-dashboard/store-simulator
VITE_ASSETS_BASE_URL=https://pub-xxxxx.r2.dev npm run build
npx wrangler pages dev dist
```

Eso levanta el sitio exactamente como lo sirve Cloudflare, con `_headers` y con
`functions/` activas.

**Checklist sobre el sitio publicado:**

- [ ] El sitio abre y se ve la pantalla de carga.
- [ ] `https://<tu-sitio>.pages.dev/api/health` devuelve el JSON con `ok: true`.
      Si da 404, el Root directory está mal puesto.
- [ ] BOB aparece con su modelo 3D (si ves un muñeco plano, el `bob.glb` no
      cargó → CORS del bucket).
- [ ] Abrí la consola del navegador (F12) → pestaña **Console**: no tiene que
      haber errores rojos de CORS ni 404.
- [ ] Pestaña **Network**: filtrá por `.glb` — tienen que venir del dominio de
      R2, con estado 200.
- [ ] Caminás por la calle Burela y los muebles/edificios están.
- [ ] Entrás al Corolla y al Pepper: se ve la foto del interior.
- [ ] La radio del auto reproduce música (esto prueba R2 con archivos pesados).
- [ ] La música sigue sonando al bajarte del auto.
- [ ] El ascensor sube y baja, y cada piso carga.
- [ ] El celular abre con `C`: Música, Carrito y RELOJ.
- [ ] El World Editor abre con `T`.
- [ ] Los objetos están **en las posiciones que vos guardaste** (esto verifica
      que `furniture-layout.json` se sigue leyendo del sitio y no se rompió).
- [ ] Probalo en el celular, aunque sea rápido.
- [ ] Cronometrá la primera carga. Anotá el número — es el dato que te dice si
      llegás al presupuesto de ≤8 segundos en 4G del PLAN MAESTRO.

**Recién cuando todo esto esté en verde, tocás el DNS.**

---

## PARTE 3 — CÓMO VOLVER ATRÁS

Ordenado de menos a más grave. Lo importante: **hasta el Paso 6, no hay nada que
revertir** — tu tienda no se tocó y tu rama oficial tampoco.

### Si el build de Pages falla

No hay nada roto: Pages simplemente no publica. Mirá el log del deploy en el
panel. Las tres causas casi siempre son:

1. **Root directory** no está en `store-simulator`.
2. **Build output** no está en `dist`.
3. `NODE_VERSION` no está seteado.

### Si el sitio carga pero faltan modelos / no suena la música

Es R2, no es el código. Por orden de probabilidad:

1. Falta la **CORS policy** del bucket (Paso 2.4). Es la causa nº 1.
2. `VITE_ASSETS_BASE_URL` tiene **barra al final** — sacala.
3. Cambiaste la variable pero **no redeployaste**. La variable se aplica al
   compilar, no al servir.
4. El archivo no se subió. Verificá abriendo su URL directa en el navegador.

**Vuelta atrás inmediata:** borrá la variable `VITE_ASSETS_BASE_URL` y redeployá.
El sitio vuelve a servir los assets desde Pages. Van a fallar solo los 9 archivos
de más de 25 MB, pero el resto del juego anda y podés diagnosticar tranquilo.

### Si querés deshacer un deploy

Pages guarda todos los deploys. **Deployments** → elegí el anterior →
**Rollback**. Es instantáneo.

### Si el DNS sale mal (lo único realmente delicado)

En el panel de tu registrador, volvé a poner los **nameservers originales**.
Anotalos antes de cambiarlos. La propagación tarda entre minutos y 24 h.

Mientras tanto la tienda vuelve a resolver como antes. Por eso el Paso 6.2
(revisar que estén todos los registros DNS, sobre todo MX) es el punto donde
más lento tenés que ir.

### Si querés borrar todo y hacer de nuevo

- El proyecto de Pages se borra desde **Settings** → **Delete project**. No toca
  el repo.
- El bucket R2 se borra desde su panel. Los archivos originales siguen en tu
  Mac y en el repo — R2 es una copia, no una mudanza. Nada se pierde.

### Sobre esta rama

`migracion-cloudflare` sale de `version-jueves-30` y **no está mergeada a
ninguna rama oficial**. Si decidís que no va, se borra y listo:

```bash
git branch -D migracion-cloudflare
git push origin --delete migracion-cloudflare
```

---

## LO QUE FALTA / NO ESTÁ RESUELTO ACÁ

Cosas que quedan pendientes y que conviene tener en la cabeza:

1. **El backend de la Fase 1 no existe todavía.** El checkout con Mercado Pago +
   creación del pedido en Tiendanube por API hay que escribirlo. Va en
   `store-simulator/functions/api/`. La carpeta ya está creada y probada.
2. **Los WAV siguen siendo WAV.** 361 MB de música es el problema número uno del
   proyecto. Pasarlos a MP3 192 kbps los baja a ~6 MB cada uno (de 361 MB a
   ~70 MB). R2 hace que el deploy no falle, pero no hace que la descarga sea
   rápida: al usuario le sigue llegando el archivo completo. **Esto no es
   opcional para el lanzamiento.**
3. **El JS sigue en un solo bundle de 929 kB.** Falta code splitting.
4. **Tram Station (82 MB / 612.000 triángulos) y City Map (22 MB)** necesitan LOD
   o una versión reducida antes de producción.
5. **Los dos videos de `index.html`** podrían ir a R2, pero requiere tocar el HTML.

Ninguna de estas cinco cosas bloquea el deploy. Las cinco están en el PLAN
MAESTRO.

---

## RESUMEN EN CINCO LÍNEAS

1. No había nada de Vercel. Esto es un primer deploy, no una migración.
2. R2 es obligatorio porque 9 archivos superan el límite de 25 MB de Pages.
3. El código ya está listo: una sola variable de entorno prende o apaga R2.
4. Sin esa variable, todo funciona exactamente como hoy.
5. El DNS es lo último y lo único que puede afectar la tienda real.
