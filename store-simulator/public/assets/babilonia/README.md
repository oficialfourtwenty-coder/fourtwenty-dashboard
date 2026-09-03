# Assets optimizados de Babilonia

Paquete de 25 modelos GLB preparado por Fer para revisión de Luca:

- `muebles/`: 18 muebles de local.
- `arcades-y-exhibidores/`: 5 arcades y exhibidores.
- `autos/`: 2 autos.

Peso total del paquete: **3.461.584 bytes (3,30 MiB)**.

Los archivos ya están optimizados y usan compresión Draco. Al integrarlos al simulador deben cargarse exclusivamente mediante `gltfLoader()` de `src/world/gltfLoaders.js`.

En esta entrega los modelos quedan almacenados pero no se incorporan al catálogo ni se cargan al iniciar la aplicación. Por eso no aumentan el peso de la primera carga hasta que se integren de forma explícita.

Antes de aprobar la integración oficial, conservar o confirmar la licencia original de cada modelo descargado.
