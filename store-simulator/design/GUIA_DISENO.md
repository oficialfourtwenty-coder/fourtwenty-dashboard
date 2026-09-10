# Guia para comunicar el rediseño visual

> Estado: guia complementaria para que Kusher entregue referencias, fotos y
> planos. No define ramas, calendario ni arquitectura. Para decisiones vigentes
> manda el `CLAUDE.md` de la raiz. Blender y otros programas 3D estan permitidos
> cuando ayuden a llegar al objetivo GTA V de PS3 sin perder rendimiento.

# Rediseñar la tienda 3D: como dar la informacion

Esta guía es para vos (el dueño, que no programás). Te explica **qué archivos
crear, cómo ordenarlos y cómo entregármelos** para que yo (Claude) pueda
rediseñar el local 3D de una, entendiendo tu visión sin adivinar.

Léela una vez entera antes de empezar a armar tu material.

---

## PARTE A — Cómo funciono yo (para que sepas qué me sirve de verdad)

Entender esto te ahorra vueltas:

1. **Veo imágenes y dibujos.** Una foto de tu local o un plano dibujado a mano
   los "miro" igual que un humano. → Los dibujos caseros me sirven MUCHÍSIMO,
   siempre que estén **etiquetados** (con palabras que digan qué es cada cosa).

2. **Leo texto y PDF.** Un documento con tu explicación escrita lo entiendo
   completo.

3. **Traduzco tu visión a código.** Yo no "pinto" la escena a mano: escribo
   instrucciones. Por eso **cuanto más específico seas, mejor sale**. Si decís
   "pared oscura" yo elijo un gris; si decís "negro carbón como la foto ref_02",
   sale exacto. La vaguedad = yo adivino. La precisión = queda como querés.

4. **No puedo sacar archivos de adentro de un PDF.** Si tu logo está pegado en
   el PDF, no lo puedo extraer limpio para meterlo al juego. Los archivos que
   quiero USAR van SUELTOS y aparte (ver Parte B).

5. **Trabajo mejor por pasos, pero tu doc apunta a "un solo prompt".** Con un
   documento completo puedo hacer un piso piloto entero de una. Después vos
   corregís ("más oscuro", "el logo más grande") y yo replico a los otros pisos.

6. **Cuido el rendimiento siempre.** Esto va a ir embebido en tu web para gente
   con PC comunes. Texturas, colores, fotos y luces = baratos, meté todo lo que
   quieras. Muebles 3D pesados = los optimizo yo y dosificamos. Nunca voy a
   bajar la calidad/fluidez que tenés hoy.

---

## PARTE B — Qué archivos tenés que crear (son 3 cosas)

### 1. El documento principal → "Notas de Apple" exportado como **PDF**
Es tu visión escrita + las fotos de referencia + tus planos dibujados.
En Notas: **Archivo → Exportar como PDF**. (Ver Parte D para qué escribir.)

### 2. Los planos dibujados a mano (Parte C)
Pueden ir DENTRO del PDF (sacale foto al dibujo y pegalo en la nota) o mandarlos
como fotos sueltas. Da igual, mientras estén claros y etiquetados.

### 3. Los ASSETS sueltos → archivos originales, aparte del PDF
Todo lo que quiero poner LITERALMENTE en el juego:
- **Logo FOURTWENTY** → PNG con fondo transparente, lo más grande posible.
- **Fotos de tu local real** → JPG/PNG en buena calidad (para el look del lobby).
- **Texturas** de pared/piso/madera si tenés → JPG/PNG.
- **Fotos de prendas** recortadas (fondo transparente) → PNG.
- **Muebles 3D** que generes → archivos .glb.

> Regla de oro: **INSPIRACIÓN va en el PDF** (fotos de "quiero que se parezca a
> esto"). **ASSETS PARA USAR van sueltos** (el logo, tus texturas, tus prendas).
> Marcá bien cuál es cuál así no confundo una cosa con la otra.

---

## PARTE C — Cómo dibujar los planos (la parte clave, y es fácil)

No necesitás saber arquitectura. Dibujá cada piso **como si lo miraras desde
arriba** (vista de pájaro), como el plano de un supermercado.

### Reglas del dibujo
1. Dibujá el **rectángulo del piso** (la sala). Es más ancho que profundo.
2. Marcá **dónde está la ENTRADA / VIDRIERA**: escribí "FRENTE" o "VIDRIERA" en
   ese lado. Es por donde se entra y por donde entra la luz.
3. Marcá **dónde está la ESCALERA** (en el lado opuesto, el "FONDO").
4. Poné cada mueble con un **símbolo simple + una etiqueta con palabras**.
5. No te preocupes por medidas exactas — con la **posición aproximada** alcanza,
   yo la afino. Si querés, marcá "esto va pegado a la pared izquierda".

### Leyenda de símbolos sugerida (usá estos o los que quieras, pero ACLARÁ)
```
  ⭕  = perchero (redondo)        → escribí "PERCHERO"
  ▭   = mesa / mostrador / caja   → escribí "MESA" o "CAJA"
  ╪   = maniquí                   → escribí "MANIQUÍ"
  |   = espejo (línea fina)       → escribí "ESPEJO"
  ▨   = estantería (pegada a pared)→ escribí "ESTANTERÍA"
  ⌂   = probador                  → escribí "PROBADOR"
  ★   = mueble 3D tuyo            → escribí "GLB: nombre_del_archivo"
```

### Ejemplo de un plano casero (así de simple):
```
        ←──────── FRENTE / VIDRIERA / ENTRADA ────────→
        ┌───────────────────────────────────────────┐
        │  ╪maniquí        ⭕perchero      ╪maniquí   │
        │                                             │
   pared│        ▭ CAJA          ★GLB:mostrador      │pared
   izq. │                                             │der.
        │  ▨estantería                    ⌂PROBADOR   │
        └───────────────────────────────────────────┘
        ←──────────── FONDO / ESCALERA ──────────────→
```
Podés dibujarlo en papel y sacarle foto, o en el iPad, como te salga.

> 💡 Truco pro: si querés que un piso se parezca a tu local real, **sacale foto
> a tu local desde la puerta** y, aparte, dibujá el plano de cómo están puestas
> las cosas. Con las dos cosas juntas lo clavo.

---

## PARTE D — Cómo estructurar el texto del documento

Copiá esta plantilla en tu nota y rellená lo que puedas. Lo que dejes vacío, lo
mantengo como está o te pregunto.

```
════════════════════════════════════════
DISEÑO TIENDA FOURTWENTY 3D
════════════════════════════════════════

── ONDA GENERAL ──
El vibe en 3 palabras: (ej: "oscuro, street, cultura hip hop")
Quiero que el ARRANQUE del simulador (el lobby) se sienta como mi local real:
  ver foto → local_real_01.jpg, local_real_02.jpg
Referencias de inspiración general: ver ref_01, ref_02, ref_03

── CASCARÓN (lo que cambia en TODOS los pisos salvo que diga otra cosa) ──
Paredes:  (color/material o "como ref_01" — ej: "gris cemento", "negro mate")
Piso:     (color/material o "como ref_02" — ej: "madera oscura", "cemento pulido")
Techo:    (ej: "negro con caños a la vista", "blanco liso")
Luz:      (cálida como ahora / fría blanca / con neones de color / mezcla)

── MARCA ──
Logo:     usar archivo logo.png → ponerlo en (¿pared del fondo? ¿sobre la caja?)
Colores de la marca: (códigos #hex si los sabés, o "el verde de mi logo")
Murales/gráfica: usar archivo mural_xx.png en (qué piso, qué pared)
Neón FOURTWENTY: (dejar el verde actual / cambiar a tal color / sacarlo)

── POR PISO (solo lo que es DISTINTO en cada uno) ──
PISO 1 (LOBBY / entrada):  ver plano plano_p1.jpg
  (esto es lo primero que ve la gente → que se parezca a mi local real)
PISO 2 (ORIGEN):           ver plano plano_p2.jpg
PISO 3 (HOOP SEASON):      ver plano plano_p3.jpg   (temática básquet)
PISO 4 (BOB):              ver plano plano_p4.jpg   (la mascota, estatua)
PISO 5 (CULTURA):          ver plano plano_p5.jpg   (hip hop, pieza única)

── MUEBLES 3D QUE TENGO ──
perchero_remeras.glb → ya está en uso
(nombre_del_glb).glb → usar en (qué piso, dónde)

── LO QUE HOY NO ME GUSTA (para que lo cambies) ──
(ej: "los maniquíes son feos", "el piso brilla mucho", "falta música")
```

---

## PARTE E — Cómo entregármelo (y con qué prompt)

1. Juntá **todo en un solo mensaje** acá en el chat: el **PDF** + los **assets
   sueltos** (logo, fotos, texturas, planos si no van en el PDF, .glb).
2. Nombrá los archivos como los llamaste en el texto (ej: `logo.png`,
   `local_real_01.jpg`, `plano_p1.jpg`) así los cruzo sin equivocarme.
3. Pegá este **prompt de arranque** (copialo tal cual):

> "Acá está mi documento de diseño (PDF) y los assets sueltos. Rediseñá la
> estética del local siguiendo el PDF: cascarón, marca y lo que pido por piso.
> El lobby (piso 1) tiene que sentirse como mi local real de las fotos.
> Empezá haciendo el PISO 1 como piloto y mostrame captura antes de replicar al
> resto. Mantené la calidad y fluidez actual (va embebido en mi web, solo PC).
> Los muebles 3D optimizalos vos antes de meterlos."

4. Yo hago el piso 1, te muestro, corregís, y replico a los demás.

---

## Resumen de una línea
**PDF** = tu visión (texto + referencias + planos dibujados).
**Archivos sueltos** = lo que uso literal (logo, fotos, texturas, muebles .glb).
Todo junto en un mensaje + el prompt de arranque, y yo construyo.
