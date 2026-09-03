// EL LINK DE LA CUENTA DE FOURTWENTY EN TIENDANUBE.
//
// QUE ES Y QUE NO ES
// Es un LINK guardado, nada mas. Sirve para dos cosas concretas:
//   1. Que el boton COMPRAR tenga adonde ir cuando una prenda todavia no tiene
//      su link propio cargado. Hoy en ese caso el boton no hace nada y dice
//      "sin link de compra"; con esto lleva a la tienda.
//   2. Tener a mano la cuenta desde el simulador.
//
// ⚠️ NO es un login. No valida nada, no trae el carrito de la cuenta, no sabe
// quien sos y NO tiene nada que ver con cobrar. La compra real —checkout,
// pago, webhook— sigue sin existir y este archivo no la acerca ni un paso.
// Se aclara porque un campo que pide "tu cuenta" invita a pensar lo contrario.
//
// ⚠️ NUNCA guardar acá un token, una contraseña ni una credencial. Esto vive en
// el navegador, o sea del lado del cliente, donde cualquiera puede leerlo. Las
// credenciales de Tiendanube van en el `.env` del servidor y no salen de ahí.

const CLAVE = 'ft-cuenta-tiendanube-v1';

// Solo http/https. Sin esto un `javascript:...` pegado en el campo se
// ejecutaria al apretar COMPRAR: el campo lo escribe una persona, pero el
// texto podria venir copiado de cualquier lado.
export function linkValido(texto) {
  const t = String(texto ?? '').trim();
  if (!t) return null;
  let url;
  try { url = new URL(t.includes('://') ? t : `https://${t}`); } catch { return null; }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') return null;
  if (!url.hostname.includes('.')) return null;
  return url.toString();
}

export function cuentaTiendanube() {
  try { return localStorage.getItem(CLAVE) || ''; } catch { return ''; }
}

// Devuelve el link normalizado si se guardo, o null si el texto no servia.
// Un texto vacio BORRA el guardado (es como se saca un link puesto de mas).
export function guardarCuentaTiendanube(texto) {
  const vacio = !String(texto ?? '').trim();
  try {
    if (vacio) { localStorage.removeItem(CLAVE); return ''; }
    const url = linkValido(texto);
    if (!url) return null;
    localStorage.setItem(CLAVE, url);
    return url;
  } catch { return null; }   // modo incognito: no se guarda, pero no rompe
}
