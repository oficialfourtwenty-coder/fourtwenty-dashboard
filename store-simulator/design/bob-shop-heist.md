# BOB: ORIGEN, UN MILLON

## Fantasia de juego

BOB entra a ORIGEN como un cliente cualquiera y trata de llevarse prendas
FOURTWENTY por un valor de $1.000.000 sin que los guardias lo identifiquen. La
mision sucede dentro del simulador: conserva el avatar BOB, la camara en tercera
persona y el lenguaje de movimiento del mundo principal.

La tension no viene de disparar ni de correr todo el tiempo. Viene de observar
rutinas, aparentar normalidad, usar muebles como cobertura, elegir una prenda y
aguantar la accion de robo mientras un guardia puede darse vuelta.

## Ciclo de la mision

1. **Entrada y lectura.** BOB aparece en la entrada. El jugador ve el objetivo,
   los guardias y sus recorridos antes de arriesgarse.
2. **Aproximacion casual.** Caminar no genera alarma. Correr hace ruido y atrae
   seguridad. Agacharse reduce la exposicion, pero resulta mas lento.
3. **Robo comprometido.** Cerca de una prenda, hay que mantener la accion. BOB
   extiende el brazo, la prenda viaja a la mochila y el progreso puede cancelarse
   si el jugador suelta el control. Los guardias solo identifican a BOB si lo
   tienen en su campo visual durante esta accion.
4. **Presion creciente.** Cada objeto suma dinero. Al pasar $350.000 y $700.000,
   los guardias patrullan mas rapido, miran mas lejos e investigan faltantes.
5. **Escape.** Llegar al millon no completa la mision por si solo. BOB tiene que
   volver a la entrada con la mercaderia sin quedar plenamente identificado.

## Dificultad

| Tramo | Estado del local | Intencion |
| --- | --- | --- |
| $0-$349.999 | Patrulla normal y margen para aprender | Enseñar rutas y coberturas |
| $350.000-$699.999 | Velocidad y vision aumentadas; investigan faltantes | Romper la ruta segura inicial |
| $700.000-$999.999 | Seguridad agresiva y sospecha inicial mayor | Obligar a subir y arriesgar |
| $1.000.000+ | Entrada marcada; guardias buscan activamente | Convertir el regreso en el climax |

El valor disponible en planta baja es insuficiente para ganar. El jugador debe
usar la escalera, exponerse al tercer guardia y robar al menos una pieza del piso
superior.

## Inteligencia de seguridad

Cada guardia usa tres estados: patrulla, investigacion y persecucion. La vision
depende de distancia, angulo, piso y linea de vista. Islas, exhibidores y muebles
cortan la vision. Correr genera un punto de ruido que el guardia mas cercano va a
investigar, pero ver a BOB caminar o pasar cerca se considera comportamiento de
cliente y no genera sospecha. Solo presenciar el robo llena la barra; si BOB
cancela a tiempo o corta la vision, la evidencia baja rapidamente.

Los guardias son instancias del BOB GLB del simulador con uniforme y linterna
superpuestos. El jugador y los clientes usan el GLB sin ropa geometrica agregada;
los clientes siguen rutas lentas y no participan de la deteccion.

## Interfaz y tension

- El HUD muestra botin, meta, objetivo actual y sospecha sin tapar la escena.
- El minimapa marca al jugador, las prendas restantes, la salida y los guardias.
- Un indicador sobre cada guardia comunica calma, investigacion o persecucion.
- La pantalla se cierra con una vineta roja al subir la sospecha.
- Latidos y una señal sonora de deteccion refuerzan el peligro sin musica
  constante ni mensajes arcade.
- El texto contextual cambia entre observar, robar, ocultarse y escapar.

## Controles

| Accion | Teclado | DualSense |
| --- | --- | --- |
| Moverse / girar | WASD o flechas | Stick izquierdo |
| Camara | Mouse | Stick derecho |
| Correr | Shift | L3 |
| Agacharse | Ctrl | L2 mantenido |
| Robar | E o Espacio mantenido | Circulo mantenido |

## Limites reemplazables

La arquitectura actual de dos pisos es una maqueta funcional y usa mobiliario y
prendas reales de ORIGEN. El mapa definitivo de Fer puede sustituirla sin cambiar
el estado de mision, la IA, el HUD ni la economia. De la misma forma, la accion
actual reutiliza un recorte de una animacion existente de BOB; el clip final de
esconder la prenda puede reemplazarse en el punto de robo sin rehacer la logica.

## Criterios de version final

- Usar el piso ORIGEN definitivo con coberturas y rutas de navegacion revisadas.
- Vestuario de seguridad integrado al rig en lugar de geometria superpuesta.
- Clip especifico de mirar, tomar, esconder y recomponerse como cliente.
- Reacciones ambientales: guardia revisando un exhibidor vacio y clientes que
  miran o se apartan cuando aumenta la tension.
- Ajuste con sesiones reales para que una partida dure entre cuatro y siete
  minutos y ninguna ruta garantice siempre el millon.
