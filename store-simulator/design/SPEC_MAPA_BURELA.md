# Spec de referencia: Complejo Burela 2570

> Estado: referencia de escala, materiales y distribucion. El mundo actual
> `Burela Base`, las posiciones exportadas por el World Editor y las decisiones
> directas de Kusher tienen prioridad sobre las medidas estimadas de este
> documento. Los autos reales ya forman parte del mundo, aunque el brief
> historico de abajo diga que no deben modelarse.

Brief de art-direction para reconstruir en **three.js** el exterior real de un complejo de
4 torres en Villa Urquiza, CABA. El jugador spawnea en la vereda de Burela, se mueve solo
por la calle principal (límites = paredes invisibles), sube los escalones de la galería y
entra al local **FourTwenty** (Torre 1, Local 6).

- **Motor:** three.js
- **Escala:** 1 unidad = 1 metro
- **Ejes:** Y arriba · +Z hacia la calle · origen = pie de los escalones, frente al local
- **Estilo:** GTA-V realista (buena iluminación, PBR)
- **Prioridad de fidelidad:** escalones · dimensiones · texturas · color
- **NO modelar autos.**
- Las medidas son **estimadas desde Street View** — calibrar in-engine con la vista 360° real.

---

## 01 · Plano general (top-down)

De la calle hacia el fondo:

1. **Calle Burela** (sur) — adoquín granítico. Autos: no modelar.
2. **Cordón** de granito gris.
3. **Vereda** — baldosa gris 0.40 m. CAMINABLE. ~40 m de frente jugable.
4. **Escalones** — 3 pasos, suben +0.45 m a la galería.
5. **Galería porticada** — bajo alero volado, columnas verdes, vidrieras de locales. CAMINABLE.
   - El local **FourTwenty** está en este frente (base de la Torre 1).
6. **Patio-jardín interno** — compartido por las 4 torres, cercado por reja verde. NO caminable.
7. **4 torres** de ladrillo alrededor del patio. Torre 1 = la del local.

**Spawn del jugador:** centro de la vereda, mirando a la galería.
**Recorrido:** vereda → escalones → galería → puerta del local.

### Zona caminable
- Tramo de vereda de Burela (~40 m de frente)
- Escalones de acceso a la galería
- Galería porticada bajo el alero
- Interior del local FourTwenty

### Paredes invisibles (límites)
- Borde del cordón (el jugador no baja a la calzada)
- Extremos izquierdo/derecho del tramo (límite de las fotos)
- Reja verde del patio interno (no se entra)
- Vidrieras y columnas = colisión sólida real

---

## 02 · Colisiones
- Avatar: **capsule collider** radio 0.35 m, alto 1.8 m.
- Todo lo modelado (columnas, muretes, vidrieras, escalones) lleva mesh collider.
- Paredes invisibles = **box colliders sin render** en los 3 límites del tramo + reja del patio.
- La galería está +0.45 m: usar collision escalonada en los peldaños **o** una rampa
  invisible a ~26° para que el avatar suba suave.

---

## 03 · Escalones (CRÍTICO)

La galería está elevada sobre la vereda. El acceso son **3 escalones anchos y bajos** de
hormigón gastado, tipo peldaños amplios de conjunto habitacional (no una escalera estrecha).

| Parámetro      | Valor    |
|----------------|----------|
| Contrahuella   | 0.15 m   |
| Huella         | 0.32 m   |
| Nº de pasos    | 3        |
| Desnivel total | +0.45 m  |

Detalle:
- Ancho de tramo variable **3–6 m** según el vano; frente al local es un tramo ancho corrido.
- Los peldaños **envuelven la esquina** (giran 90°), no son un solo frente recto.
- Material: hormigón alisado gris cálido, canto vivo desgastado, sin nariz metálica.
- Junta de dilatación cada ~1.5 m; grietas finas y parches más oscuros; musgo en juntas.
- Rampa peatonal lateral en algún extremo (accesibilidad) — opcional.

---

## 04 · Materiales y texturas

- **Piso plaza seca:** adoquín/pastilla **hexagonal** de hormigón ("panal de abeja"), tono
  tostado cálido, ~0.20 m entre caras. Roughness 0.9, variación de tono pieza a pieza,
  juntas más oscuras.
- **Vereda:** baldosa gris 0.40×0.40 m, patrón cuadriculado (algunas "panza de sapo").
  Desgaste, manchas. Cordón de granito gris en el borde.
- **Ladrillo torres:** ladrillo visto rojo-terracota en **bandas horizontales** alternando
  con fajas de revoque crema. Junta tomada clara. Normal map marcado.
- **Muretes / jardineras:** ladrillo visto rojo más rústico (aparejo a la vista), alto
  ~0.50 m, coronamiento plano. Delimitan canteros elevados.
- **Columnas y alero:** hormigón pintado **verde salvia grisáceo**. Columnas de sección
  cuadrada ~0.40 m. Alero/losa voladiza plana, canto del mismo verde, manchas de escurrido.
- **Vidrieras del local:** carpintería metálica **verde inglés**, vidrio en cuadrícula,
  zócalo inferior ciego verde oscuro (~0.9 m). Rejas verticales sobre el vidrio en algunos vanos.

---

## 05 · Paleta (albedo base, pre-luz)

| Color            | Hex       | Uso                     |
|------------------|-----------|-------------------------|
| Verde salvia     | `#8C9A78` | columnas / alero        |
| Verde inglés     | `#2F5A3A` | carpintería de vidriera |
| Ladrillo rojo    | `#A44E32` | fajas de torres         |
| Revoque crema    | `#E1DDC6` | fajas / celosías        |
| Adoquín hexagonal| `#C3AC8E` | piso de plaza           |
| Hormigón         | `#B4AEA2` | escalones / vereda      |
| Ladrillo murete  | `#96583F` | jardineras              |
| Verde reja       | `#3E6B60` | barandas / reja patio   |

---

## 06 · Elevación frontal (galería)

- Ritmo de columnas regular, **eje a eje ~4.5 m**.
- **Altura libre** bajo el alero: 3.2 m. Alero: espesor 0.35 m, vuelo 1.5 m.
- Vidriera del local **FourTwenty**: ancho ~5.5 m, cristal ~2.6 m de alto sobre zócalo
  ciego verde de ~0.9 m.
- Sobre el alero arrancan los pisos de vivienda con balcones y baranda verde.
- Cartel/toldo del local sobre la vidriera — dejar plano para el branding FourTwenty.
- Fajas de fachada de la Torre 1: ladrillo + revoque alternados.

---

## 07 · Vegetación y decoración

- **Árboles de vereda:** caducos — uno florecido rosa pálido (ciruelo/cerezo ornamental),
  otros con hoja verde grande tipo magnolia. Tronco recto 4–7 m, alcorque cuadrado.
- **Canteros:** agapantos (hojas largas acintadas), arbustos redondeados podados, algún
  yucca/palmerita puntiaguda dentro de las jardineras de ladrillo.
- **Detalles urbanos:** reja verde tubular del jardín interno, contenedores de basura al
  cordón, cartel pizarra de oferta en la vereda, cableado aéreo, señal vial. Sin autos.

---

## 08 · Cámara, luz y atmósfera

**Cámara (3ª persona estilo GTA-V):**
- Detrás y arriba del avatar: offset ≈ (0, 2.2, -4) m
- FOV 55–60°, leve pitch hacia abajo (~10°)
- Collision de cámara con muros; suavizar con lerp
- Al entrar al local, acercar a ~2.5 m

**Iluminación:**
- Sol de mediodía-invierno: luz cálida rasante, sombras largas y nítidas (día despejado)
- Cielo celeste limpio, HDRI clear sky
- Sombra propia del alero sobre la galería (media penumbra)
- PBR + ambient occlusion + tone-mapping filmic; leve bloom

---

## 09 · Notas de implementación · three.js

```
// escala & ejes
1 unidad = 1 m · Y arriba · +Z hacia la calle · origen = pie de escalones frente al local

// dimensiones clave (m)
galeria.profundidad = 3.5
columna              = 0.40 x 0.40
h_libre              = 3.2
eje_columnas         = 4.5
alero.espesor        = 0.35
alero.vuelo          = 1.5
plataforma.alto      = 0.45
escalon              = { huella: 0.32, contra: 0.15, nº: 3 }
murete               = { alto: 0.50, ancho: 0.30 }
vidriera_local       = { ancho: 5.5, cristal: 2.6, zocalo: 0.9 }
vereda.ancho         = 4.5
frente_jugable       ≈ 40
torre                ≈ 18 x 14 en planta, alto ≈ 42 (≈14 pisos)
patio_interno        ≈ 20 de luz

// materiales (MeshStandardMaterial)
salvia        #8C9A78  roughness 0.8
vidrieraFrame #2F5A3A  metalness 0.4
ladrillo      #A44E32  + normalMap
crema         #E1DDC6
hexPav        #C3AC8E  roughness 0.95  + tiling
hormigon      #B4AEA2  roughness 0.9
muretes       #96583F  + normalMap
rejaVerde     #3E6B60  metalness 0.5
vidrio                 transmission 0.9

// jugador & límites
capsule(r = 0.35, h = 1.8) · walk 2.2 m/s / run 5 m/s
rampa invisible 26° sobre los escalones
boxColliders invisibles: cordón + 2 extremos del tramo + reja del patio
spawn = (0, 0, 6) mirando a la galería (-Z)
trigger de entrada en la puerta del local
```
