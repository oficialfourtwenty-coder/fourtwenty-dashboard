# Assets optimizados de Babilonia

Paquete de 25 modelos GLB preparado por Fer para revisión de Luca:

- `muebles/`: 18 muebles de local.
- `arcades-y-exhibidores/`: 5 arcades y exhibidores.
- `autos/`: 2 autos.

Peso total del paquete: **3.461.584 bytes (3,30 MiB)**.

Los archivos ya están optimizados y usan compresión Draco. El catálogo del World Editor los carga exclusivamente mediante `gltfLoader()` de `src/world/gltfLoaders.js`.

Los 25 modelos están incorporados al catálogo del World Editor. Para verlos, abrir el editor con `T`, buscar `Babilonia` y elegir el modelo. Se descargan únicamente al agregarlos al mundo, por lo que sus 3,30 MiB no se suman a la primera carga.

Los dos autos se incorporan como modelos decorativos editables; todavía no reemplazan a los autos manejables ni incluyen interacciones de vehículo.

Antes de aprobar la integración oficial, conservar o confirmar la licencia original de cada modelo descargado.
