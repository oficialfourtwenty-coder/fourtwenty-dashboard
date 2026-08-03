# Prueba Terraza PS3

## Versiones activas

Para el trabajo diario se consideran activas solamente estas dos ramas:

- Final aprobada: `version-final-final-final` en `0d85939`.
- Prueba actual: `codex/prueba-terraza-ps3`, iniciada desde `9ca1f33`.

Las ramas anteriores quedan como historial. No deben usarse como punto de
partida ni borrarse sin autorizacion explicita de Kusher.

## Regla de esta prueba

- La version final no se modifica.
- Solo cambia el piso 5, Terraza.
- ORIGEN, HOOP SEASON, CULTURA y BOB conservan la base Binco anterior.
- Kusher prueba el resultado y decide si se integra, se corrige o se descarta.
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
- ciudad nocturna de bajo costo alrededor del local;
- panorama 360 propio del piso;
- piezas principales editables con `T`.

No es una copia de GTA V ni un piso final. Es el patron visual que Kusher debe
evaluar antes de repetir trabajo en los otros pisos.

## Rendimiento de referencia

Medido en la vista de diagnostico de la misma computadora:

- Terraza nueva: cerca de 260 draw calls y 116k triangulos.
- Piso ORIGEN anterior: cerca de 886 draw calls y 114k triangulos.
- Texturas nuevas: aproximadamente 1.3 MB en WebP.
- Panorama de Terraza: aproximadamente 3.5 MB en EXR.
- Los recursos del piso se cargan cuando se entra a Terraza y se liberan al
  salir de la escena.

La prueba agrega mas detalle visual con muchas menos llamadas de dibujo que la
base anterior. La medicion de FPS del navegador integrado no representa por si
sola el equipo final, pero sirve para comparar ambos pisos en las mismas
condiciones.

## Archivos principales

- `src/world/terracePs3Trial.js`
- `src/world/destinationScenes.js`
- `src/world/bincoShopTrial.js`
- `public/assets/materials/terrace-ps3/`
- `src/assets/environments/pisos/5-terraza/terrace-evening.exr`

## Prueba minima antes de integrar

1. Entrar a Terraza desde el ascensor.
2. Recorrer los limites y comprobar que no haya bloqueos invisibles.
3. Abrir `T`, buscar y mover una pieza de Terraza.
4. Abrir el ascensor y viajar a otro piso.
5. Confirmar que los otros pisos no cambiaron.
6. Comparar fluidez con ORIGEN en el mismo navegador.
7. Solo despues de la aprobacion de Kusher preparar la integracion a la final.
