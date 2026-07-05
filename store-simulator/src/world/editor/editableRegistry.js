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
  return {
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
}

function applyShadowFlags(object3D, castShadow, receiveShadow) {
  object3D.traverse?.((child) => {
    if (child.isMesh) {
      child.castShadow = castShadow;
      child.receiveShadow = receiveShadow;
    }
  });
}

export function registerEditableObject(config) {
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
    visible: config.visible !== false,
  };

  entry.object3D.visible = entry.visible;
  applyShadowFlags(entry.object3D, entry.castShadow, entry.receiveShadow);
  markEditableTree(entry.object3D, entry.id);
  registry.set(entry.id, entry);
  emitRegistryChange();
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
  return getEditableObjects().map(serializeEntry);
}

export function applyLayout(layout) {
  if (!Array.isArray(layout)) {
    console.warn('applyLayout: layout invalido, se esperaba un array.', layout);
    return;
  }

  for (const item of layout) {
    const entry = getEditableById(item.id);
    if (!entry?.object3D) {
      console.warn(`applyLayout: no existe objeto editable con id "${item?.id}".`);
      continue;
    }

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
    applyShadowFlags(entry.object3D, entry.castShadow, entry.receiveShadow);
  }

  emitRegistryChange();
}

export function clearEditableRegistry() {
  for (const entry of registry.values()) unmarkEditableTree(entry.object3D);
  registry.clear();
  emitRegistryChange();
}
