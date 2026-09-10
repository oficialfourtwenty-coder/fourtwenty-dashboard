// DESHACER (Ctrl+Z / Cmd+Z) en el editor de mundo.
//
// Kusher lo pidio asi: "para volver atras si borre algo que no queria borrar".
// Hasta ahora un borrado o un arrastre mal dado no tenian vuelta: habia que
// acordarse de donde estaba el objeto y volver a ponerlo a ojo.
//
// COMO ESTA PENSADO. No guarda "el estado del mundo" antes y despues —eso seria
// copiar cientos de objetos en cada movimiento— sino una PILA DE VUELTAS ATRAS:
// cada accion deja anotado como se desarma ella misma. Mover deja anotada la
// posicion vieja; borrar deja anotado el objeto y donde estaba colgado.
//
// ⚠️ POR QUE SE PUEDE DESHACER UN BORRADO. `removeEditable` no destruye nada:
// a una copia la saca del arbol y la desregistra, y a un objeto original solo
// lo esconde. La malla sigue viva en memoria mientras alguien la tenga
// agarrada, y esta pila la agarra. Si algun dia el borrado pasa a liberar la
// geometria, esto deja de funcionar en silencio y hay que rehacerlo.
//
// ⚠️ EL TOPE DE 60 NO ES CAPRICHO. Cada vuelta atras de un borrado mantiene
// viva la malla borrada. Sin tope, una sesion larga de limpieza se queda con
// todo lo borrado en memoria para siempre.
const TOPE = 60;

export function crearHistorial({ onCambio } = {}) {
  const pila = [];

  /**
   * Anota una accion que se puede deshacer.
   * @param {string} descripcion  lo que se le muestra a Kusher
   * @param {Function} volverAtras  como desarmarla
   */
  function anotar(descripcion, volverAtras) {
    if (typeof volverAtras !== 'function') return;
    pila.push({ descripcion, volverAtras });
    if (pila.length > TOPE) pila.shift();
    onCambio?.(pila.length);
  }

  /** Deshace la ultima accion. Devuelve su descripcion, o null si no hay nada. */
  function deshacer() {
    const accion = pila.pop();
    if (!accion) return null;
    try {
      accion.volverAtras();
    } catch (error) {
      // Una vuelta atras que falla no puede colgar el editor: se avisa y se
      // sigue. Pasa, por ejemplo, si el objeto ya no existe porque se cambio
      // de escena en el medio.
      console.warn('No se pudo deshacer:', accion.descripcion, error);
      onCambio?.(pila.length);
      return null;
    }
    onCambio?.(pila.length);
    return accion.descripcion;
  }

  function limpiar() {
    pila.length = 0;
    onCambio?.(0);
  }

  return { anotar, deshacer, limpiar, cuantas: () => pila.length };
}

/**
 * Foto de la posicion/rotacion/escala de un objeto, para poder volver a ella.
 * Se guardan numeros sueltos y no el Object3D: si se guardara una referencia al
 * Vector3, se movería junto con el objeto y la foto no serviria de nada.
 */
export function fotoDeTransform(objeto) {
  return {
    p: objeto.position.toArray(),
    q: objeto.quaternion.toArray(),
    e: objeto.scale.toArray(),
  };
}

export function aplicarFoto(objeto, foto) {
  objeto.position.fromArray(foto.p);
  objeto.quaternion.fromArray(foto.q);
  objeto.scale.fromArray(foto.e);
  objeto.updateMatrixWorld(true);
}
