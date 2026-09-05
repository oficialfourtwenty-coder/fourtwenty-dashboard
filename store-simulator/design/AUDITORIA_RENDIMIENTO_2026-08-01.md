# Auditoria de rendimiento - 2026-08-01

## Resumen facil

La preocupacion era correcta: el simulador tenia tirones antes de completar el
40% restante. Los minijuegos y el futuro checkout no eran el problema principal.
El gasto venia de modelos de fondo muy pesados, texturas 4K, un espejo que
renderizaba el mundo otra vez y trabajo de colisiones repetido en cada cuadro.

Esta auditoria se hizo en `codex/auditoria-rendimiento-60`, aislada de la rama
oficial. No cambia posiciones, escalas ni interacciones guardadas por Kusher.

## Resultado medido

Prueba repetida en el mismo navegador, ventana y Mac:

| Prueba | Antes | Despues |
| --- | ---: | ---: |
| Build web completo | 132 MB | 49 MB |
| Calle, calidad alta | 8 FPS | 27 FPS |
| Calle, modo liviano | 11 FPS | 54 FPS |
| Mision 3D | 23 FPS | 38 FPS |
| Triangulos de calle medidos sin postprocesado | 4.21 M | aprox. 1.58 M |
| Dibujos por cuadro medidos sin postprocesado | 682 | aprox. 527 |

Los cinco pisos se mantuvieron entre 38 y 40 FPS luego de estabilizar la carga.
La policia dispara, el paquete se recoge, se entrega y la mision vuelve al piso
BOB restaurando la calidad normal.

Las cifras sirven para comparar este codigo contra si mismo. Otro equipo,
navegador o tamano de pantalla puede dar FPS distintos.

## Que se corrigio

1. Modelos GLB de fondo comprimidos con Draco, texturas WebP y menos triangulos.
2. Originales y duplicados movidos a `source-assets/`, fuera del build web.
3. Videos de carga convertidos a 720p y configurados para bajar solo al usarlos.
4. Imagen de HOOP convertida de PNG pesado a WebP.
5. Espejo reducido a 512/256 px y actualizado cada 2/4 cuadros.
6. Edificios decorativos sin calculo de sombras.
7. Cajas de colision editables recalculadas solo cuando algo cambia con `T`.
8. Resolucion dinamica durante la mision y restauracion automatica al salir.
9. Geometrias, materiales, texturas y referencias de productos liberadas al
   abandonar un piso.
10. Texturas del ascensor y del estadio reutilizadas entre visitas.

## Peso actual publicado

| Grupo | Peso aproximado |
| --- | ---: |
| Musica | 24 MB |
| Autos e interiores | 8.4 MB |
| Esfera 360 base | 7 MB |
| Modelos de mobiliario | 3.2 MB |
| Videos e interfaz | 1.9 MB |
| Minijuegos | 0.8 MB |

`source-assets/` pesa mas porque conserva originales, pero el visitante no lo
descarga. La musica debe seguir cargandose por tema, nunca toda de golpe.

## Presupuesto para el 40% restante

- GLB de fondo: ideal menor a 1.5 MB y 150k triangulos.
- GLB interactivo principal: ideal menor a 4 MB y 100k triangulos.
- Texturas normales: 1K. Usar 2K solo cuando la prenda se vea muy cerca.
- Imagen de producto: WebP y, como objetivo, menor a 250 KB.
- Video de carga: 720p y menor a 2 MB.
- Esfera por piso: una sola imagen 2048x1024. No duplicar la esfera base.
- Minijuego: import dinamico; JS menor a 0.5 MB y assets preferentemente menores
  a 2 MB.
- No sumar sombras a mapas, estaciones o edificios usados como fondo.

El checkout, carrito y conexion de pago agregan poco peso grafico. El riesgo del
tramo comercial son las fotos y modelos de muchas prendas, no el boton de pago.

## Control antes de aceptar una funcion

1. Ejecutar `npm run build` y anotar el peso de `dist/`.
2. Probar calle, piso, ascensor y mision en calidad alta.
3. Probar `?q=low` en un equipo mas lento.
4. Viajar diez veces entre pisos y confirmar que las geometrias no crecen.
5. Revisar consola: ningun error de GLB, textura, video o audio.
6. Comparar visualmente el modelo optimizado con su original.

Para ver las metricas de auditoria:

```text
http://127.0.0.1:5200/?elevatorTest=1&debugUi=1&perfAudit=1
```

Modo liviano:

```text
http://127.0.0.1:5200/?q=low&elevatorTest=1&debugUi=1&perfAudit=1
```

## Riesgo que queda vigilado

El contador interno de Three.js todavia muestra una textura adicional pequena
por ciclo completo de piso. Las geometrias ya permanecen estables. No es un
bloqueo para esta prueba, pero debe volver a medirse antes del lanzamiento y al
incorporar prendas reales.
