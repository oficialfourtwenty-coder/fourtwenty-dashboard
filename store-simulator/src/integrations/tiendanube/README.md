# Integración Tiendanube

Conecta el catálogo del simulador (`public/assets/data/productos.json`) con los
productos reales de la tienda. **Sin credenciales todo funciona igual**: las
prendas se cargan a mano desde el panel de administración (tecla **P**) y este
módulo queda dormido.

## Arquitectura (por qué está partida en dos)

- **Navegador** (`src/integrations/tiendanube/`): nunca ve credenciales ni
  llama a `api.tiendanube.com` (la API no permite llamadas desde browsers y un
  token en el bundle sería público). Solo consulta endpoints locales.
- **Node** (`tools/tiendanube/`): acá viven las llamadas reales con el `.env`.
  Corre como script (`npm run tn:sync`) o adentro del servidor de desarrollo
  (el middleware de `vite.config.js` expone `/api/tn/*`).
- **`mapper.js`** es puro (sin fetch/DOM) y lo comparten ambos lados: una sola
  definición de cómo un producto de Tiendanube se vuelve una prenda del juego.

## Flujo de autenticación (documentación oficial)

1. Crear una app en el portal de partners (`partners.tiendanube.com`). De ahí
   salen `TN_CLIENT_ID` (App ID) y `TN_CLIENT_SECRET`.
2. Instalar la app en la tienda: visitar
   `https://www.tiendanube.com/apps/TU_APP_ID/authorize` con la sesión de la
   tienda abierta. Al autorizar, Tiendanube redirige a la Redirect URI de la
   app con `?code=XXXX`. **El code vence a los 5 minutos.**
3. Canjearlo: `npm run tn:token -- XXXX` hace el POST oficial a
   `https://www.tiendanube.com/apps/authorize/token` con
   `{ client_id, client_secret, grant_type: "authorization_code", code }` e
   imprime las líneas `TN_ACCESS_TOKEN=` y `TN_STORE_ID=` (el `user_id` de la
   respuesta ES el ID de la tienda) para pegar en el `.env`.
4. El token **no vence**: solo se invalida si se reinstala la app o se genera
   otro token.

Las llamadas a la API usan `https://api.tiendanube.com/v1/{TN_STORE_ID}/...`
con los headers `Authentication: bearer TOKEN` (literal, la doc clásica avisa
que `Authorization` solo devuelve 401 — enviamos ambos por compatibilidad con
la doc nueva) y un `User-Agent` identificatorio obligatorio (`TN_USER_AGENT`).

## Sincronizar productos

1. En el panel admin (tecla P), a cada piso cargale su **Categoría Tiendanube**:
   el nombre (o parte) o el ID de la categoría de tu tienda. Ej: piso HOOP
   SEASON → categoría "Hoop Season" de Tiendanube.
2. Correr `npm run tn:sync` (o el botón **Sincronizar Tiendanube** del admin
   corriendo `npm run dev`).
3. El sync trae todos los productos publicados, y a cada colección **con
   categoría configurada y productos que matcheen** le reemplaza las prendas
   por las reales (nombre, precio, foto, descripción y el link de compra
   `canonical_url`). Las colecciones sin categoría, o sin matches, **quedan
   como estaban** (lo cargado a mano no se pierde).
4. Commitear `productos.json` para publicar el catálogo nuevo.

El botón **Comprar** del juego solo redirige al `link` del producto (su página
real en Tiendanube). El juego **jamás** procesa pagos.
