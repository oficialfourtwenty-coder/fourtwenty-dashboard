# Terraza PS3 aprobada

## Estado de versiones

Para el trabajo diario se consideran activas solamente estas dos ramas:

- Final aprobada: `version-final-final-final`, promocionada con esta escena y la
  esfera optimizada de CULTURA.
- Rama de origen conservada como historial: `codex/prueba-terraza-ps3`.

Las ramas anteriores quedan como historial. No deben usarse como punto de
partida ni borrarse sin autorizacion explicita de Kusher.

## Resultado aprobado

- La implementacion fue probada primero sin modificar la final y despues Kusher
  pidio promoverla a `version-final-final-final`.
- El pase grafico cambia el piso 5, Terraza.
- ORIGEN, HOOP SEASON, CULTURA y BOB conservan la base Binco anterior.
- CULTURA conserva su arquitectura y suma su panorama propio optimizado.
- No copiar modelos ni texturas propietarias de GTA. Binco se usa solamente
  como referencia de densidad, materiales, iluminacion y lenguaje comercial.

## Direccion visual

La Terraza busca una lectura cercana a un juego de PlayStation 3:

- proporciones menos cuadradas;
- piso, ladrillo y madera con materiales PBR;
- barandas y cubierta de vidrio;
- techo industrial con vigas, conductos, tuberias y luces;
- mobiliario curvo, caja, probador, exhibidores y maniquies;
- prendas provisionales reemplazables por productos reales;
- panorama fotografico 360 de una terraza real, visible a traves del vidrio;
- sin edificios geometricos de fondo que compitan con la fotografia;
- piezas principales editables con `T`.

No es una copia de GTA V. Es el primer patron visual PS3 aprobado para orientar
el trabajo de los otros pisos; sus productos y contenido aun pueden evolucionar.

## Rendimiento de referencia

Medido en la vista de diagnostico de la misma computadora:

- Terraza nueva: cerca de 260 draw calls y 116k triangulos.
- Piso ORIGEN anterior: cerca de 886 draw calls y 114k triangulos.
- Texturas PBR nuevas: aproximadamente 1.3 MB en WebP.
- Panorama de Terraza: aproximadamente 144 KB en WebP, reemplazando el EXR
  anterior de 3.5 MB.
- Total visual nuevo de la prueba: aproximadamente 1.45 MB.
- Los recursos del piso se cargan cuando se entra a Terraza y se liberan al
  salir de la escena.
- El boton del ascensor confirma el piso durante 450 ms y la transicion usa
  350 ms por lado, reduciendo la espera percibida sin mostrar la escena a medio
  construir.

La prueba agrega mas detalle visual con muchas menos llamadas de dibujo que la
base anterior. La medicion de FPS del navegador integrado no representa por si
sola el equipo final, pero sirve para comparar ambos pisos en las mismas
condiciones.

## Archivos principales

- `src/world/terracePs3Trial.js`
- `src/world/destinationScenes.js`
- `src/world/bincoShopTrial.js`
- `public/assets/materials/terrace-ps3/`
- `src/assets/environments/pisos/5-terraza/terrace-rooftop-real.webp`

El panorama deriva de `Rooftop Day` de Poly Haven (licencia CC0):
`https://polyhaven.com/a/rooftop_day`.

## Prueba minima antes de integrar

1. Entrar a Terraza desde el ascensor.
2. Recorrer los limites y comprobar que no haya bloqueos invisibles.
3. Abrir `T`, buscar y mover una pieza de Terraza.
4. Abrir el ascensor y viajar a otro piso.
5. Confirmar que los otros pisos no cambiaron.
6. Comparar fluidez con ORIGEN en el mismo navegador.
7. Solo despues de la aprobacion de Kusher preparar la integracion a la final.
