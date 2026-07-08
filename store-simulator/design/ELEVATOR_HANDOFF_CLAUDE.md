# Handoff ascensor FOURTWENTY

Objetivo: continuar el ascensor en una version aparte, sin romper el mundo actual.

Estado base correcto:
- Rama base: `claude/fourtwenty-store-simulator-g3rigz`.
- No usar el prototipo anterior de Codex como referencia visual/final.
- Mantener Tiendanube, prendas, panel de producto, BOB, controles, camara y layout del local.
- No modificar estetica final de calle, autos, casas, muebles ni realismo de BOB en esta fase.

Ubicacion:
- El ascensor va dentro del local, atras, en el mini pasillito.
- No es entrada principal del local.
- No tocar ni mover objetos importantes del local.
- En pisos superiores, el ascensor debe aparecer siempre en el mismo sector relativo.

Primera fase recomendada:
1. Crear solo una prueba funcional minima del ascensor.
2. Puerta corrediza exterior.
3. BOB llama el ascensor con boton.
4. Puertas abren.
5. BOB entra sin trabarse.
6. Puertas cierran.
7. Fade negro de 5 segundos.
8. Vista primera persona dentro del ascensor.
9. Panel simple con 6 botones.
10. Elegir piso.
11. Fade/transicion.
12. BOB aparece afuera del ascensor del piso elegido, con puerta abierta y sin collider bloqueando la salida.

Prioridades tecnicas:
- Modularizar en `ElevatorSystem` o similar.
- Separar datos de pisos en un archivo propio si hace falta.
- No mezclar ascensor con datos de productos.
- Colliders dinamicos: puertas solo bloquean cuando estan cerradas.
- Al llegar a un piso, desactivar collider de puerta hasta que BOB pueda salir.
- Evitar allocations por frame; cuidar rendimiento.
- Debug visible: piso actual, estado, destino, BOB dentro/fuera, puertas abiertas/cerradas.

Experiencia deseada:
- Ascensor metalico realista con espejo interior, pero sin rehacer toda la estetica del mundo todavia.
- Al entrar: difuminacion negra de 5 segundos antes de primera persona.
- Primera persona enfocada en panel/botones.
- Ideal futuro: mano de BOB presionando boton, pero no bloquear fase funcional por eso.

Problemas a evitar:
- No hacer una torre GLB enorme dentro del local.
- No dejar BOB trabado al llegar a otro piso.
- No hacer puertas con colliders fijos que bloqueen entrada/salida.
- No expandir o redisenar todo el edificio antes de validar el flujo basico.
- No usar el ascensor como selector abstracto; tiene que ser fisico: llamar, entrar, cerrar, elegir, viajar, salir.

Pruebas minimas antes de entregar:
- `npm run build`
- BOB llama ascensor desde el pasillito.
- La puerta corrediza abre.
- BOB entra sin trabarse.
- Fade de 5 segundos.
- Panel de 6 botones aparece.
- Cada piso transporta bien.
- BOB aparece fuera del ascensor.
- Puede salir caminando.
- Prendas/productos siguen funcionando.
- Sin errores de consola.
