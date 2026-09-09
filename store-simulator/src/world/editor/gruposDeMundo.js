// JUNTAR OBJETOS DEL MUNDO PARA MOVERLOS DE A MONTON.
//
// Kusher lo pidio con estas palabras: "necesito un sistema para juntar las
// casas manualmente para mover el conjunto y no mover una por una, necesito
// seguir rellenando el mundo". Sin esto, correr una cuadra entera 10 m es
// mover casa por casa y que ninguna quede alineada.
//
// ⚠️ POR QUE NO SE PUEDEN METER ADENTRO DE UN GRUPO DE VERDAD, QUE SERIA LO
// OBVIO. El editor arma los ids por POSICION en el arbol de la escena
// (`calle-kit:52.3` = hijo 3 del grupo 52). Si se saca una casa de su grupo
// para meterla en uno nuevo, TODOS los hermanos que venian despues corren un
// lugar y el layout guardado de Kusher se aplica a los objetos equivocados.
// Ya paso una vez en este proyecto: aparecieron tres veredas, una casa en
// x=-3177 y una pared gris tapando la calle. No se toca el arbol.
//
// COMO FUNCIONA ENTONCES. El grupo es una LISTA DE IDS, no un padre. Se crea un
// objeto vacio e invisible (el "mango") en el centro de los marcados, y ese es
// el que se agarra con el gizmo. Cada vez que el mango se mueve, se calcula
// cuanto se movio y se le aplica ese mismo movimiento a cada miembro, cada uno
// en su propio lugar del arbol. Nadie cambia de padre y ningun id se corre.
//
// La cuenta se hace con MATRICES DE MUNDO y no sumando posiciones:
//     delta = mangoAhora x mangoAntes⁻¹
//     miembroNuevo = delta x miembroViejo
// Asi rotar y escalar el conjunto funciona alrededor del mango —que es lo que
// uno espera— y no cada objeto sobre su propio eje. Sumando posiciones a mano,
// mover andaba pero rotar desarmaba la cuadra.
import * as THREE from 'three';
import {
  registerEditableObject,
  unregisterEditableObject,
  getEditableById,
} from './editableRegistry.js';

const CLAVE = 'ft-grupos-mundo-v1';

// Los grupos viven en su propio guardado y NO en el layout. El layout guarda
// donde esta cada objeto; esto guarda quien va con quien. Son dos cosas
// distintas y mezclarlas hacia que exportar el layout se llevara los grupos a
// medias.
function leerGuardado() {
  try {
    const crudo = localStorage.getItem(CLAVE);
    const datos = crudo ? JSON.parse(crudo) : [];
    return Array.isArray(datos) ? datos : [];
  } catch {
    return [];
  }
}

function guardar(grupos) {
  try {
    localStorage.setItem(CLAVE, JSON.stringify(
      grupos.map((g) => ({ id: g.id, nombre: g.nombre, miembros: g.miembros })),
    ));
  } catch {
    /* sin persistencia: el grupo sigue vivo en esta sesion */
  }
}

export function crearSistemaDeGrupos({ getScene, onCambio }) {
  // id del grupo -> { id, nombre, miembros:[ids], mango, previaInversa }
  const grupos = new Map();
  let contador = 1;

  function centroDe(ids) {
    const caja = new THREE.Box3();
    let alguno = false;
    for (const id of ids) {
      const o = getEditableById(id)?.object3D;
      if (!o) continue;
      o.updateMatrixWorld(true);
      const propia = new THREE.Box3().setFromObject(o);
      if (propia.isEmpty()) continue;
      alguno ? caja.union(propia) : caja.copy(propia);
      alguno = true;
    }
    return alguno ? caja.getCenter(new THREE.Vector3()) : new THREE.Vector3();
  }

  // El mango es un objeto vacio con una cajita apenas visible para saber donde
  // esta. Va SIEMPRE al final de la escena: agregar al final no corre ningun
  // indice, insertar en el medio si.
  function crearMango(grupoId, nombre, centro) {
    const mango = new THREE.Group();
    mango.name = nombre;
    mango.position.copy(centro);
    const marca = new THREE.Mesh(
      new THREE.BoxGeometry(0.45, 0.45, 0.45),
      new THREE.MeshBasicMaterial({ color: 0x39ff6a, wireframe: true, depthTest: false, transparent: true, opacity: 0.6 }),
    );
    marca.name = `${nombre} · mango`;
    marca.renderOrder = 999;
    marca.userData.skipShadow = true;
    mango.add(marca);
    // ⚠️ que el auto-registro de la escena lo ignore, si no se registraria dos
    // veces (una como ayudante y otra por posicion en el arbol).
    mango.userData.editorHelper = true;
    getScene().add(mango);
    registerEditableObject({
      id: grupoId,
      name: nombre,
      type: 'grupo',
      object3D: mango,
      collidable: false,
      castShadow: false,
      receiveShadow: false,
      // ⚠️ transient: el mango NO se guarda en el layout. Si se guardara, al
      // recargar volveria a una posicion vieja y aplicaria ese desfasaje a los
      // miembros — que ya venian bien puestos desde el layout. Los moveria dos
      // veces. Al arrancar el mango se recalcula en el centro y el delta
      // arranca en cero.
      transient: true,
    });
    return mango;
  }

  function registrarGrupo(id, nombre, miembros) {
    const centro = centroDe(miembros);
    const mango = crearMango(id, nombre, centro);
    mango.updateMatrixWorld(true);
    grupos.set(id, {
      id,
      nombre,
      miembros: [...miembros],
      mango,
      previaInversa: new THREE.Matrix4().copy(mango.matrixWorld).invert(),
    });
    return grupos.get(id);
  }

  /** Crea un grupo con los ids dados. Devuelve el grupo o null. */
  function agrupar(ids, nombre) {
    const validos = [...new Set(ids)].filter((id) => getEditableById(id)?.object3D);
    if (validos.length < 2) return null;
    const id = `grupo:${Date.now().toString(36)}-${contador++}`;
    const grupo = registrarGrupo(id, nombre || `Conjunto ${grupos.size + 1}`, validos);
    guardar([...grupos.values()]);
    onCambio?.();
    return grupo;
  }

  /** Deshace el grupo. Los objetos quedan donde estan, sueltos. */
  function desagrupar(id) {
    const grupo = grupos.get(id);
    if (!grupo) return false;
    unregisterEditableObject(id);
    grupo.mango.parent?.remove(grupo.mango);
    grupo.mango.traverse((o) => { o.geometry?.dispose?.(); o.material?.dispose?.(); });
    grupos.delete(id);
    guardar([...grupos.values()]);
    onCambio?.();
    return true;
  }

  /**
   * Propaga al conjunto lo que se le acaba de hacer al mango.
   * Se llama desde el `objectChange` del gizmo.
   * @returns {boolean} true si el id era un grupo (o sea, si hizo algo)
   */
  function propagar(id) {
    const grupo = grupos.get(id);
    if (!grupo) return false;
    const mango = grupo.mango;
    mango.updateMatrixWorld(true);

    const delta = new THREE.Matrix4().multiplyMatrices(mango.matrixWorld, grupo.previaInversa);
    const enMundo = new THREE.Matrix4();
    const enPadre = new THREE.Matrix4();

    for (const miembroId of grupo.miembros) {
      const o = getEditableById(miembroId)?.object3D;
      if (!o?.parent) continue;
      o.updateMatrixWorld(true);
      enMundo.multiplyMatrices(delta, o.matrixWorld);
      o.parent.updateMatrixWorld(true);
      enPadre.copy(o.parent.matrixWorld).invert().multiply(enMundo);
      enPadre.decompose(o.position, o.quaternion, o.scale);
      o.updateMatrixWorld(true);
    }

    grupo.previaInversa.copy(mango.matrixWorld).invert();
    return true;
  }

  function esGrupo(id) { return grupos.has(id); }

  /**
   * Muestra o esconde TODOS los mangos.
   * ⚠️ Kusher lo reporto asi: "tambien queda eso verde". Los cubos verdes son
   * los agarres de los conjuntos y no tienen por que verse jugando: solo hacen
   * falta con el editor abierto. Se apagan al cerrar el editor.
   */
  function mostrarMangos(visible) {
    for (const grupo of grupos.values()) grupo.mango.visible = visible;
  }

  function miembrosDe(id) { return grupos.get(id)?.miembros ?? []; }

  /**
   * Vuelve a tomar como punto de partida la posicion actual del mango.
   * ⚠️ Hace falta despues de un DESHACER: si el mango vuelve a su lugar viejo
   * sin avisar, el proximo arrastre calcularia el delta contra la posicion de
   * antes de deshacer y el conjunto pegaria un salto.
   */
  function reanclar(id) {
    const grupo = grupos.get(id);
    if (!grupo) return;
    grupo.mango.updateMatrixWorld(true);
    grupo.previaInversa.copy(grupo.mango.matrixWorld).invert();
  }

  function nombresDe(id) {
    const grupo = grupos.get(id);
    if (!grupo) return [];
    return grupo.miembros.map((m) => getEditableById(m)?.name ?? m);
  }

  /**
   * Rearma los grupos guardados. Se llama DESPUES de aplicar el layout, para
   * que el mango caiga en el centro de donde quedaron los objetos de verdad.
   * Los miembros que ya no existan se descartan solos.
   */
  function restaurar() {
    for (const guardadoGrupo of leerGuardado()) {
      const vivos = (guardadoGrupo.miembros ?? []).filter((m) => getEditableById(m)?.object3D);
      if (vivos.length < 2) continue;
      registrarGrupo(guardadoGrupo.id, guardadoGrupo.nombre, vivos);
    }
    if (grupos.size) {
      guardar([...grupos.values()]);
      onCambio?.();
    }
    return grupos.size;
  }

  function listar() {
    return [...grupos.values()].map((g) => ({ id: g.id, nombre: g.nombre, miembros: g.miembros.length }));
  }

  /** Todo lo guardado, para EXPORTAR JSON junto con el layout. */
  function exportar() {
    return [...grupos.values()].map((g) => ({ id: g.id, nombre: g.nombre, miembros: g.miembros }));
  }

  return { agrupar, desagrupar, propagar, esGrupo, mostrarMangos, miembrosDe, reanclar, nombresDe, restaurar, listar, exportar };
}
