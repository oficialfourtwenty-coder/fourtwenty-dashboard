# Guia para el Codex de Fer — Simulador Bobilonia (FOURTWENTY)

Este archivo es para el agente que trabaja con Fer. Leelo entero antes de tocar
nada, y despues lee `CLAUDE.md` en la raiz, que es el contexto completo del
proyecto.

---

## 1. Quien es quien

- **Luca (Kusher)** — dueno de FOURTWENTY. **No programa.** Decide que entra al
  proyecto. Todo se le explica con palabras simples y mostrando como probarlo.
- **Claude Code** — agente de ingenieria de Luca. Trabaja sobre la rama oficial,
  integra lo que Luca aprueba, y revisa lo que llega de afuera.
- **Fer** — colaborador. Trabaja en su propia computadora, con vos.
- **Chelo** — colaborador, hace modelos 3D de prendas.
- **Codex** — otro agente que trabaja en el mismo repo, coordinado por Luca.

---

## 2. Tu regla numero uno

**Antes de proponerle algo a Fer, verifica si el simulador puede recibirlo.**

Fer no trabajo antes en este proyecto por miedo a romper algo. Tu trabajo es que
eso no pase: no alcanza con que una idea se vea bien, tiene que poder entrar.

Antes de dar por buena cualquier cosa, chequea:

1. **¿Corre en el navegador?** Es three.js r184 sobre WebGL2, no un motor de
   escritorio. Nada que dependa de compute shaders, de multithreading pesado o
   de features que Safari no soporta.
2. **¿Cuanto pesa?** El presupuesto de primera carga es 15 MB ideal, 20 MB tope.
   Si algo suma peso, hay que medirlo y decirlo, no estimarlo.
3. **¿Cuantas llamadas de dibujo agrega?** En este proyecto **las llamadas de
   dibujo pesan mas que los triangulos**. Esta medido: fusionar 4 mallas en 1
   bajo el costo de las perchas un 75% sin cambiar un pixel.
4. **¿Rompe algo que ya funciona?** Movimiento, colisiones, ascensor, editor de
   mundo, celular y autos tienen que seguir andando.
5. **¿Se puede editar despues?** Luca acomoda el mundo el mismo con la tecla
   `T`. Un objeto que no se puede mover ni borrar desde ahi le sirve poco.

Si algo no cumple, **decilo antes de que Fer lo construya**, no despues. Es mas
barato descartar una idea que rehacer cinco prendas.

---

## 3. Como se trabaja: rama de pruebas

**Fer NUNCA toca la rama oficial.** La oficial es `version-lunes-3-de-agosto` y
solo la mueve Luca a traves de Claude Code.

Fer trabaja en **`fer/pruebas`**, que ya existe y sale de la oficial:

```bash
git clone https://github.com/oficialfourtwenty-coder/fourtwenty-dashboard
cd fourtwenty-dashboard
git switch fer/pruebas
cd store-simulator
npm install
npm run dev -- --host 0.0.0.0 --port 5173
```

Abrir `http://127.0.0.1:5173/`

Para traer lo ultimo de la oficial sin perder lo propio:

```bash
git fetch origin
git rebase origin/version-lunes-3-de-agosto
```

**Cuando algo le gusta a Fer**, lo entrega asi:

- Commits chicos y con un solo tema cada uno.
- Un mensaje que diga: que hace, que archivos toca, cuanto peso suma, y como
  probarlo.
- Capturas si el cambio es visual.
- Luca decide si entra completo, por partes, o no entra.

**Nunca** hagas push a `version-lunes-3-de-agosto` ni a ninguna rama que no sea
la de Fer.

---

## 4. Que es el proyecto

Una tienda de ropa 3D que corre en el navegador. El personaje (BOB) camina por
una recreacion de la calle y el local de Burela, sube en ascensor a cinco pisos
tematicos, y **tiene que poder terminar una compra real**.

- Aplicacion: `store-simulator/`
- Objetivo visual: acercarse a GTA V en PlayStation 3. Geometria simple con
  buenas texturas, no muchos poligonos.
- **La compra es la condicion de lanzamiento.** Una experiencia linda sin compra
  real no sirve comercialmente.

---

## 5. Mapa del codigo

```
store-simulator/src/
  main.js                    renderer, escenas, transiciones, bucle principal
  world/
    street.js                Calle Burela, exterior y local
    terracePs3Trial.js       constructor comun de los 5 pisos
    destinationScenes.js     escenas aisladas por piso
    garments.js              prendas colgadas (malla parametrica)
    garmentPrints.js         estampas que se apoyan sobre la prenda
    displayTable.js          mesa de exhibicion y pilas de ropa doblada
    productVisuals.js        conecta una malla con un producto del catalogo
    editor/                  editor de mundo (tecla T), catalogo, guardado
      pieceBuilder.js        crear piezas a mano y pegarles textura
  ui/
    garmentEditor.js         panel de diseno de prenda (click derecho)
    frameEditor.js           panel de diseno de cuadros
    adminPanel.js            catalogo de productos (tecla P)
    phone.js                 celular: musica, carrito, reloj
  data/productosStore.js     catalogo, unica fuente de datos de producto
  minigames/                 minijuegos
```

---

## 6. Sistemas que YA existen — no los rehagas

Esto es lo que mas tiempo ahorra. Todo lo siguiente esta hecho y funcionando:

- **Editor de mundo (`T`)** — buscar, mover, rotar, escalar por eje, duplicar,
  cambiar color, y crear piezas desde cero con textura propia.
- **Editor de prenda (click derecho)** — cambiar el cuerpo, el color, y subir
  una imagen como estampa en el frente o el dorso, con recorte de fondo
  automatico.
- **Editor de cuadros (click derecho)** — texto, tipografias, logos y fotos.
- **Catalogo de productos (`P`)** — nombre, precio, link, foto y estampa por
  producto. Las prendas del mundo se visten solas con lo que se cargue ahi.
- **Ascensor, colisiones, autos, celular, musica, minijuegos.**
- **Visor de colisiones (`K`)** — dibuja las cajas de colision y nombra lo que
  esta frenando al jugador.

Si una idea de Fer se parece a algo de esta lista, revisa primero si ya esta
resuelto.

---

## 7. Reglas tecnicas del simulador

**Peso**
- Primera carga: 15 MB ideal, 20 MB tope.
- Texturas: 512 o 1024. 2048 solo para algo protagonista.
- Audio comprimido y cargado al reproducir. Modelos y videos bajo demanda.
- Solo una zona o piso cargado a la vez.

**Rendimiento**
- Objetivo 60 FPS en escritorio, minimo 30 durante juego normal.
- **Las llamadas de dibujo pesan mas que los triangulos.** Fusionar geometrias
  que comparten material (`mergeGeometries`) antes de repetir un objeto.
- Una luz con sombra por zona. Las PointLight con sombra son carisimas: cada una
  dibuja la escena 6 veces.

**Modelos 3D**
- GLB, Y arriba, escala real en metros, transformaciones aplicadas.
- Una malla y un material por objeto reutilizable.
- **UV desplegada de verdad**, con islas separadas y sin superponer. Ya se
  rechazaron dos modelos por venir con la UV fragmentada (uno generado con IA):
  se ven bien pero no se les puede pintar nada encima.
- Sin rig salvo que el objeto lo necesite. Las prendas de los percheros son
  escenografia, el personaje no las usa.
- Comprimir con Draco.

**Video**
- HEVC no se reproduce en Chrome ni Firefox: convertir siempre a H.264.
- `preload="none"` para que no entre en la primera carga.

**Materiales**
- `MeshStandardMaterial` como base. `MeshPhysicalMaterial` solo para vidrio,
  pintura de autos y superficies protagonistas.
- Mapas de color en sRGB; normal y roughness en lineal.

---

## 8. Como verificar de verdad

En este proyecto hay tres formas de probar que **mienten**, y ya costaron horas:

1. **Mover al personaje con `bob.position` teletransporta** y saltea la
   colision. Para probar una colision hay que leer la lista real:
   `window.__colliders()`.
2. **El Chromium sin interfaz de las pruebas no trae H.264.** Cualquier mp4
   falla ahi aunque ande perfecto en el navegador real. Para probar la logica de
   un video hay que generar una copia en VP9/WebM.
3. **Un `dispatchEvent(new KeyboardEvent(...))` sintetico no dispara nada.** Hay
   que mandar la tecla de verdad. Las teclas sueltas si llegan; el movimiento
   sostenido con WASD no.

Antes de decir que algo funciona, probalo. Y si no lo pudiste probar, decilo —
no lo reportes como verificado.

---

## 9. Lo que NO se hace sin permiso de Luca

- Optimizar mobile durante la fase web.
- Construir FT$ (moneda interna) ni la plataforma multimarca de 2027.
- Asumir una arquitectura de pago como aprobada.
- Reemplazar zonas enteras del mundo de una vez. Primero una prueba chica.
- Subir musica sin permiso del artista, ni modelos sin revisar peso y licencia.
- Cambiar la rama oficial, el nombre de version o la fecha de lanzamiento.
- Borrar o revertir trabajo de otro colaborador.

---

## 10. Como reportar

Cuando Fer termine algo, el reporte tiene que decir:

- **Que hace**, en una linea y en castellano simple (lo lee Luca, que no
  programa).
- **Que archivos toca.**
- **Cuanto peso suma**, medido.
- **Como probarlo**, con los comandos exactos.
- **Que quedo pendiente** o sin verificar.

Si algo no se pudo probar, decirlo. Un reporte que dice "verificado" sobre algo
que no se probo hace perder mas tiempo que un error admitido.
