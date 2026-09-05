# Integracion comercial: estado y objetivo

## Lo que existe hoy

- `productos.json` puede cargarse manualmente o sincronizarse con Tiendanube.
- El navegador nunca debe recibir credenciales.
- Los scripts de `tools/tiendanube/` y el middleware de Vite sirven para
  desarrollo local.
- Existe carrito visual base, pero no checkout productivo ni cobro real.
- La implementacion actual puede conservar links de producto como respaldo.

## Objetivo de experiencia

1. Elegir producto/talle dentro del mundo.
2. Ver y editar el carrito en el celular.
3. Completar contacto, direccion y envio dentro del simulador.
4. Validar nuevamente producto, stock, envio y precio en el servidor.
5. Crear un checkout unico de Mercado Pago.
6. Abrir solamente el tramo seguro de pago fuera del simulador.
7. Regresar automaticamente.
8. Confirmar el resultado mediante webhook verificado.
9. Sincronizar el pedido con Tiendanube si autoriza este flujo.

## Decisiones pendientes antes de produccion

- Consultar por escrito a Tiendanube si permite cobrar fuera de su checkout en
  una integracion privada de la tienda y luego crear/sincronizar el pedido.
- Elegir Checkout Pro, Bricks u otra modalidad solo despues de una prueba con
  credenciales sandbox.
- Si Tiendanube no autoriza el flujo ideal, usar su checkout oficial.
- El backend previsto es Cloudflare Functions/Workers, sujeto a completar la
  migracion. No asumir Vercel.

## Reglas de seguridad

- Credenciales solo en variables de entorno del servidor.
- Precio y stock se calculan en servidor.
- Nunca guardar ni procesar numeros de tarjeta.
- Un redirect de regreso no confirma el pago; manda el webhook.
- Empezar con un producto, un talle y un envio simple.

## Calendario

Durante el pase visual solo se preparan credenciales, producto, envio y consulta
oficial. Del 24 al 31 de agosto la compra se convierte en prioridad absoluta y
se congelan nuevas mejoras esteticas hasta completar una compra real.
