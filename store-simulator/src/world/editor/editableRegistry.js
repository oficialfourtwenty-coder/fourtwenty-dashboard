const registry = new Map();

function toArray3(value, fallback = [0, 0, 0]) {
  if (Array.isArray(value) && value.length >= 3) return value.slice(0, 3).map(Number);
  return fallback.slice();
}

function transformFromObject(object3D) {
  return {
    position: object3D?.position?.toArray?.() ?? [0, 0, 0],
    rotation: object3D?.rotation ? [object3D.rotation.x, object3D.rotation.y, object3D.rotation.z] : [0, 0, 0],
    scale: object3D?.scale?.toArray?.() ?? [1, 1, 1],
  };
}

function emitRegistryChange() {
  window.dispatchEvent(new CustomEvent('fourtwenty:editable-registry-change'));
}

function markEditableTree(object3D, id) {
  object3D.userData.editable = true;
  object3D.userData.editorId = id;
  object3D.userData.editorRoot = true;
  object3D.traverse?.((child) => {
    child.userData.editable = true;
    child.userData.editorId = id;
    if (child !== object3D) child.userData.editorRoot = false;
  });
}

function unmarkEditableTree(object3D) {
  object3D?.traverse?.((child) => {
    delete child.userData.editable;
    delete child.userData.editorId;
    delete child.userData.editorRoot;
  });
}

function serializeEntry(entry) {
  const live = transformFromObject(entry.object3D);
  const data = {
    id: entry.id,
    name: entry.name,
    type: entry.type,
    model: entry.model,
    position: live.position,
    rotation: live.rotation,
    scale: live.scale,
    castShadow: entry.castShadow !== false,
    receiveShadow: entry.receiveShadow !== false,
    locked: entry.locked === true,
    visible: entry.object3D ? entry.object3D.visible !== false : entry.visible !== false,
  };
  if (entry.cloneOf) data.cloneOf = entry.cloneOf;
  if (entry.manageShadows === false) data.manageShadows = false;
  return data;
}

function applyShadowFlags(object3D, castShadow, receiveShadow) {
  object3D.traverse?.((child) => {
    if (child.isMesh) {
      child.castShadow = castShadow;
      child.receiveShadow = receiveShadow;
    }
  });
}

export function registerEditableObject(config, { silent = false } = {}) {
  if (!config?.id || !config.object3D) {
    console.warn('registerEditableObject: id y object3D son obligatorios.', config);
    return null;
  }

  const previous = registry.get(config.id);
  if (previous?.object3D && previous.object3D !== config.object3D) {
    unmarkEditableTree(previous.object3D);
  }

  const live = transformFromObject(config.object3D);
  const entry = {
    id: config.id,
    name: config.name ?? config.id,
    type: config.type ?? 'object',
    model: config.model ?? '',
    object3D: config.object3D,
    position: toArray3(config.position, live.position),
    rotation: toArray3(config.rotation, live.rotation),
    scale: toArray3(config.scale, live.scale),
    castShadow: config.castShadow !== false,
    receiveShadow: config.receiveShadow !== false,
    locked: config.locked === true,
    visible: config.visible ?? (config.object3D.visible !== false),
    // manageShadows=false: objetos auto-registrados de la escena; el editor no
    // les pisa las flags de sombra (cada mesh conserva la suya del build).
    manageShadows: config.manageShadows !== false,
    cloneOf: config.cloneOf ?? null,
    // transient=true: editable en vivo pero nunca se guarda ni se restaura
    // desde layout. Sirve para BOB jugador: el juego maneja su spawn.
    transient: config.transient === true,
  };

  entry.object3D.visible = entry.visible;
  if (entry.manageShadows) applyShadowFlags(entry.object3D, entry.castShadow, entry.receiveShadow);
  markEditableTree(entry.object3D, entry.id);
  registry.set(entry.id, entry);
  if (!silent) emitRegistryChange();
  return entry;
}

export function unregisterEditableObject(id) {
  const entry = registry.get(id);
  if (!entry) return false;
  unmarkEditableTree(entry.object3D);
  registry.delete(id);
  emitRegistryChange();
  return true;
}

export function getEditableObjects() {
  return Array.from(registry.values());
}

export function getEditableById(id) {
  return registry.get(id) ?? null;
}

export function findEditableRoot(object) {
  let current = object;
  while (current) {
    const id = current.userData?.editorId;
    if (id && registry.has(id)) return registry.get(id).object3D;
    current = current.parent;
  }
  return null;
}

export function serializeEditableObjects() {
  return getEditableObjects().filter((entry) => !entry.transient).map(serializeEntry);
}

export function applyLayout(layout) {
  if (!Array.isArray(layout)) {
    console.warn('applyLayout: layout invalido, se esperaba un array.', layout);
    return;
  }

  for (const item of layout) {
    const entry = getEditableById(item.id);
    // sin warning: el layout guarda TODO (calle + BOBILONIA + muebles) y cada
    // escena aplica solo lo suyo; el resto se aplica cuando esa escena carga.
    if (!entry?.object3D) continue;
    if (entry.transient) continue;

    const position = toArray3(item.position, entry.position);
    const rotation = toArray3(item.rotation, entry.rotation);
    const scale = toArray3(item.scale, entry.scale);
    entry.object3D.position.fromArray(position);
    entry.object3D.rotation.set(rotation[0], rotation[1], rotation[2]);
    entry.object3D.scale.fromArray(scale);
    entry.object3D.visible = item.visible !== false;

    entry.name = item.name ?? entry.name;
    entry.type = item.type ?? entry.type;
    entry.model = item.model ?? entry.model;
    entry.position = position;
    entry.rotation = rotation;
    entry.scale = scale;
    entry.castShadow = item.castShadow !== false;
    entry.receiveShadow = item.receiveShadow !== false;
    entry.locked = item.locked === true;
    entry.visible = item.visible !== false;
    if (entry.manageShadows) applyShadowFlags(entry.object3D, entry.castShadow, entry.receiveShadow);
  }

  emitRegistryChange();
}

export function clearEditableRegistry() {
  for (const entry of registry.values()) unmarkEditableTree(entry.object3D);
  registry.clear();
  emitRegistryChange();
}

// ---------------------------------------------------------------------------
// Auto-registro de escena completa ("mover absolutamente todo"): recorre el
// árbol y registra cada Group/Mesh renderable con un id determinístico por
// posición en el árbol (mismo build → mismos ids → el layout guardado aplica).
// Registra anidado: el grupo entero Y sus partes (el click selecciona la parte;
// tecla P / botón Parent sube al grupo).
// ---------------------------------------------------------------------------

function hasRenderableDescendant(object) {
  if (object.isMesh || object.isSprite || object.isInstancedMesh || object.isPoints || object.isLine) return true;
  for (const child of object.children ?? []) {
    if (hasRenderableDescendant(child)) return true;
  }
  return false;
}

function labelFor(object) {
  if (object.name) return object.name;
  if (object.isInstancedMesh) return 'Instancias';
  if (object.isSprite) return 'Sprite';
  if (object.isMesh) return (object.geometry?.type ?? 'Mesh').replace('Geometry', '');
  return 'Grupo';
}

export function autoRegisterScene(root, { prefix = 'mundo', skip = [] } = {}) {
  const skipSet = new Set(skip.filter(Boolean));
  const registered = [];
  const visit = (object, path) => {
    for (let i = 0; i < object.children.length; i++) {
      const child = object.children[i];
      if (skipSet.has(child)) continue;
      if (child.userData?.editorHelper || child.userData?.editorClone) continue;
      // ya registrado por otro sistema (p.ej. muebles GLB): se respeta como unidad
      if (child.userData?.editorId && registry.get(child.userData.editorId)?.object3D === child) continue;
      if (!hasRenderableDescendant(child)) continue;
      const childPath = [...path, i];
      const id = `${prefix}:${childPath.join('.')}`;
      const entry = registerEditableObject({
        id,
        name: `${labelFor(child)} ${childPath.join('.')}`,
        type: prefix,
        object3D: child,
        manageShadows: false,
      }, { silent: true });
      if (entry) registered.push(entry);
      if (child.children.length) visit(child, childPath);
    }
  };
  visit(root, []);
  emitRegistryChange();
  return registered;
}

function sceneRootOf(object) {
  let current = object;
  while (current.parent) current = current.parent;
  return current;
}

export function isObjectInScene(object, sceneRoot) {
  if (!object || !sceneRoot) return false;
  return sceneRootOf(object) === sceneRoot;
}

export function duplicateEditable(id, { offset = [0.6, 0, 0], transform = null, newId = null } = {}) {
  const entry = registry.get(id);
  if (!entry?.object3D?.parent) return null;
  const source = entry.object3D;
  const clone = source.clone(true);
  clone.traverse((child) => {
    delete child.userData.editable;
    delete child.userData.editorId;
    delete child.userData.editorRoot;
  });
  clone.userData.editorClone = true; // que el auto-registro no lo re-indexe

  let cloneId = newId;
  if (!cloneId) {
    const base = entry.cloneOf ?? entry.id;
    let n = 1;
    do { cloneId = `${base}-copia-${n++}`; } while (registry.has(cloneId));
  }

  source.parent.add(clone);
  if (source.visible === false) clone.visible = true;
  if (transform) {
    clone.position.fromArray(toArray3(transform.position, source.position.toArray()));
    const rot = toArray3(transform.rotation, [source.rotation.x, source.rotation.y, source.rotation.z]);
    clone.rotation.set(rot[0], rot[1], rot[2]);
    clone.scale.fromArray(toArray3(transform.scale, source.scale.toArray()));
  } else {
    clone.position.x += offset[0];
    clone.position.y += offset[1];
    clone.position.z += offset[2];
  }
  clone.updateMatrixWorld(true);

  return registerEditableObject({
    id: cloneId,
    name: `${entry.name} (copia)`,
    type: entry.type,
    model: entry.model,
    object3D: clone,
    cloneOf: entry.cloneOf ?? entry.id,
    manageShadows: entry.manageShadows,
  });
}

// Borrar: las copias se eliminan de verdad; los objetos originales del mundo
// se OCULTAN (visible=false, persistido) para poder recuperarlos desde la lista.
export function removeEditable(id) {
  const entry = registry.get(id);
  if (!entry?.object3D) return null;
  if (entry.cloneOf) {
    entry.object3D.parent?.remove(entry.object3D);
    unmarkEditableTree(entry.object3D);
    registry.delete(id);
    emitRegistryChange();
    return 'removed';
  }
  entry.visible = false;
  entry.object3D.visible = false;
  emitRegistryChange();
  return 'hidden';
}

export function setEditableVisible(id, visible) {
  const entry = registry.get(id);
  if (!entry?.object3D) return null;
  entry.visible = visible !== false;
  entry.object3D.visible = entry.visible;
  emitRegistryChange();
  return entry.visible;
}

export function getParentEditableId(id) {
  const entry = registry.get(id);
  let current = entry?.object3D?.parent;
  while (current) {
    const pid = current.userData?.editorId;
    if (pid && registry.get(pid)?.object3D === current) return pid;
    current = current.parent;
  }
  return null;
}

// Recrea las copias guardadas en el layout (items con cloneOf) cuya fuente ya
// está registrada en la escena actual. Idempotente: si la copia ya existe en
// la misma escena que su fuente, no hace nada.
export function restoreClones(layout) {
  if (!Array.isArray(layout)) return;
  let changed = false;
  for (const item of layout) {
    if (!item?.id || !item.cloneOf) continue;
    const source = registry.get(item.cloneOf);
    if (!source?.object3D) continue;
    const existing = registry.get(item.id);
    if (existing?.object3D && sceneRootOf(existing.object3D) === sceneRootOf(source.object3D)) continue;
    const entry = duplicateEditable(item.cloneOf, {
      newId: item.id,
      transform: { position: item.position, rotation: item.rotation, scale: item.scale },
    });
    if (entry) {
      entry.name = item.name ?? entry.name;
      entry.visible = item.visible !== false;
      entry.object3D.visible = entry.visible;
      changed = true;
    }
  }
  if (changed) emitRegistryChange();
}
