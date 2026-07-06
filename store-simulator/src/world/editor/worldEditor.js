import * as THREE from 'three';
import { TransformControls } from 'three/examples/jsm/controls/TransformControls.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { createEditorPanel } from './editorPanel.js';
import {
  applyLayout,
  duplicateEditable,
  findEditableRoot,
  getEditableById,
  getEditableObjects,
  getParentEditableId,
  isObjectInScene,
  removeEditable,
  serializeEditableObjects,
  setEditableVisible,
} from './editableRegistry.js';
import {
  clearLocalLayout,
  copyLayoutToClipboard,
  downloadLayout,
  loadBaseLayout,
  parseLayoutJSON,
  saveLocalLayout,
} from './layoutStore.js';

const SNAP = {
  translation: 0.25,
  rotation: Math.PI / 12,
  scale: 0.05,
};

function noopEditor() {
  return {
    isEnabled: () => false,
    setScene: () => {},
    selectId: () => {},
    dispose: () => {},
  };
}

function isTypingTarget(target) {
  return target?.matches?.('input, textarea, select, [contenteditable="true"]');
}

function serializeCurrentLayout() {
  return serializeEditableObjects();
}

export function initWorldEditor({ scene, camera, renderer, input, player } = {}) {
  const params = new URLSearchParams(location.search);
  const allowed = import.meta.env.DEV || params.get('editor') === '1';
  if (!allowed) return noopEditor();
  if (!scene || !camera || !renderer?.domElement) {
    console.warn('WorldEditor: faltan scene/camera/renderer; editor desactivado.');
    return noopEditor();
  }

  let currentScene = scene;
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  const orbitDir = new THREE.Vector3();
  let clipboardId = null; // Ctrl+C guarda el id del objeto; Ctrl+V lo pega
  const state = {
    enabled: false,
    selectedId: null,
    selectedObject: null,
    mode: 'translate',
    space: 'world',
    snapping: false,
  };

  const transformControls = new TransformControls(camera, renderer.domElement);
  const transformHelper = transformControls.getHelper();
  transformHelper.visible = false;
  transformHelper.userData.editorHelper = true; // que el auto-registro los ignore
  currentScene.add(transformHelper);

  const boxHelper = new THREE.BoxHelper(new THREE.Object3D(), 0xff6d18);
  boxHelper.visible = false;
  boxHelper.userData.editorHelper = true;
  currentScene.add(boxHelper);

  // Cámara libre en modo editor (la cámara del juego queda pausada): órbita
  // con click izquierdo, pan con click derecho, zoom con rueda.
  const orbit = new OrbitControls(camera, renderer.domElement);
  orbit.enabled = false;
  orbit.maxDistance = 80;

  let saveTimer = 0;
  const panel = createEditorPanel({
    onMode: setMode,
    onToggleSpace: toggleSpace,
    onToggleSnap: toggleSnap,
    onDeselect: deselect,
    onSelectId: selectId,
    onTransformInput: applyInputTransform,
    onSave: () => saveNow('Layout local guardado.'),
    onCopy: copyJSON,
    onDownload: () => downloadLayout(serializeCurrentLayout()),
    onReset: resetFromFile,
    onClear: clearLocal,
    onImportFile: importJSONFile,
    onDuplicate: duplicateSelected,
    onDelete: deleteSelected,
    onSelectParent: selectParent,
    onToggleVisible: toggleSelectedVisible,
  });

  function isInCurrentScene(object) {
    return isObjectInScene(object, currentScene);
  }

  function refreshPanel() {
    panel.setState(state);
    // la lista muestra solo la escena activa (calle o BOBILONIA)
    panel.setObjects(
      getEditableObjects().filter((entry) => entry.object3D && isInCurrentScene(entry.object3D)),
      state.selectedId,
    );
    panel.setSelected(state.selectedId ? getEditableById(state.selectedId) : null);
  }

  // refresco liviano (mientras se arrastra el gizmo): no reconstruye la lista
  function refreshSelected() {
    panel.setSelected(state.selectedId ? getEditableById(state.selectedId) : null);
  }

  function setStatus(message) {
    panel.setStatus(message);
  }

  function setScene(nextScene) {
    if (!nextScene || nextScene === currentScene) return;
    deselect();
    currentScene.remove(transformHelper);
    currentScene.remove(boxHelper);
    currentScene = nextScene;
    currentScene.add(transformHelper);
    currentScene.add(boxHelper);
  }

  function setEnabled(enabled) {
    if (state.enabled === enabled) return;
    state.enabled = enabled;
    input?.keys?.clear?.();
    if (enabled) {
      document.exitPointerLock?.();
      renderer.domElement.style.cursor = 'default';
      // órbita centrada en BOB (o en lo que mira la cámara si no hay player)
      if (player?.position) {
        orbit.target.copy(player.position);
        orbit.target.y += 1;
      } else {
        camera.getWorldDirection(orbitDir);
        orbit.target.copy(camera.position).addScaledVector(orbitDir, 4);
      }
      orbit.enabled = true;
      orbit.update();
      panel.show();
      setStatus('Edit Mode activo. Click izq: orbitar / seleccionar · click der: pan · rueda: zoom.');
    } else {
      deselect();
      orbit.enabled = false;
      if (player?.rig && typeof player.modelYaw === 'number') {
        player.modelYaw = player.rig.rotation.y;
      }
      panel.hide();
      setStatus('');
    }
    refreshPanel();
  }

  function toggleEnabled() {
    setEnabled(!state.enabled);
  }

  function setMode(mode) {
    if (!['translate', 'rotate', 'scale'].includes(mode)) return;
    state.mode = mode;
    transformControls.setMode(mode);
    refreshPanel();
  }

  function toggleSpace() {
    state.space = state.space === 'world' ? 'local' : 'world';
    transformControls.setSpace(state.space);
    refreshPanel();
  }

  function applySnapping() {
    transformControls.setTranslationSnap(state.snapping ? SNAP.translation : null);
    transformControls.setRotationSnap(state.snapping ? SNAP.rotation : null);
    transformControls.setScaleSnap(state.snapping ? SNAP.scale : null);
  }

  function toggleSnap() {
    state.snapping = !state.snapping;
    applySnapping();
    refreshPanel();
  }

  function updateHelper() {
    if (!state.selectedObject) {
      boxHelper.visible = false;
      transformHelper.visible = false;
      return;
    }
    boxHelper.setFromObject(state.selectedObject);
    boxHelper.visible = true;
    transformHelper.visible = !getEditableById(state.selectedId)?.locked;
  }

  function attachSelected() {
    const entry = getEditableById(state.selectedId);
    if (!entry?.object3D) {
      deselect();
      return;
    }
    state.selectedObject = entry.object3D;
    if (entry.locked) {
      transformControls.detach();
      setStatus(`${entry.name} esta bloqueado.`);
    } else {
      transformControls.attach(entry.object3D);
      transformControls.setMode(state.mode);
      transformControls.setSpace(state.space);
      applySnapping();
      setStatus(`${entry.name} seleccionado.`);
    }
    updateHelper();
    refreshPanel();
  }

  function selectId(id) {
    const entry = getEditableById(id);
    if (!entry) {
      setStatus(`Objeto no encontrado: ${id}`);
      deselect();
      return;
    }
    state.selectedId = id;
    attachSelected();
  }

  function deselect() {
    state.selectedId = null;
    state.selectedObject = null;
    transformControls.detach();
    boxHelper.visible = false;
    transformHelper.visible = false;
    refreshPanel();
  }

  function applyInputTransform(group, index, value) {
    if (!Number.isFinite(value) || !state.selectedObject) return;
    if (group === 'position') state.selectedObject.position.setComponent(index, value);
    if (group === 'rotation') {
      const values = [state.selectedObject.rotation.x, state.selectedObject.rotation.y, state.selectedObject.rotation.z];
      values[index] = value;
      state.selectedObject.rotation.set(values[0], values[1], values[2]);
    }
    if (group === 'scale') state.selectedObject.scale.setComponent(index, Math.max(0.001, value));
    updateHelper();
    refreshPanel();
    scheduleSave();
  }

  function scheduleSave() {
    clearTimeout(saveTimer);
    saveTimer = window.setTimeout(() => saveNow('Auto-save local actualizado.'), 450);
  }

  function saveNow(message) {
    clearTimeout(saveTimer);
    const ok = saveLocalLayout(serializeCurrentLayout());
    setStatus(ok ? message : 'No se pudo guardar local.');
  }

  async function copyJSON() {
    const ok = await copyLayoutToClipboard(serializeCurrentLayout());
    setStatus(ok ? 'JSON copiado al portapapeles.' : 'No se pudo copiar JSON.');
  }

  async function resetFromFile() {
    clearLocalLayout();
    const base = await loadBaseLayout();
    applyLayout(base);
    refreshPanel();
    updateHelper();
    setStatus('Layout local borrado y base aplicada. Refresca si agregaste o quitaste objetos.');
  }

  function clearLocal() {
    const ok = clearLocalLayout();
    setStatus(ok ? 'Layout local limpiado. Refresca para volver al archivo base.' : 'No se pudo limpiar localStorage.');
  }

  async function importJSONFile(file) {
    try {
      const layout = parseLayoutJSON(await file.text(), file.name);
      if (!layout) {
        setStatus('JSON invalido.');
        return;
      }
      applyLayout(layout);
      saveLocalLayout(layout);
      refreshPanel();
      updateHelper();
      setStatus('JSON importado y guardado localmente.');
    } catch (error) {
      console.warn('No se pudo importar JSON de layout.', error);
      setStatus('No se pudo importar JSON.');
    }
  }

  // ---- copiar / pegar / duplicar / borrar / jerarquía -----------------------

  function copySelected() {
    if (!state.selectedId) {
      setStatus('Selecciona un objeto para copiar (o usa el boton Copy JSON).');
      return;
    }
    clipboardId = state.selectedId;
    setStatus(`Copiado: ${getEditableById(clipboardId)?.name ?? clipboardId}. Ctrl+V pega.`);
  }

  function pasteClipboard() {
    if (!clipboardId || !getEditableById(clipboardId)) {
      setStatus('Nada copiado: Ctrl+C sobre un objeto primero.');
      return;
    }
    const entry = duplicateEditable(clipboardId);
    if (!entry) {
      setStatus('No se pudo pegar ese objeto.');
      return;
    }
    selectId(entry.id);
    saveNow(`Pegado: ${entry.name}.`);
  }

  function duplicateSelected() {
    if (!state.selectedId) {
      setStatus('Selecciona un objeto para duplicar.');
      return;
    }
    const entry = duplicateEditable(state.selectedId);
    if (!entry) {
      setStatus('No se pudo duplicar ese objeto.');
      return;
    }
    selectId(entry.id);
    saveNow(`Duplicado: ${entry.name}.`);
  }

  function deleteSelected() {
    if (!state.selectedId) return;
    const entry = getEditableById(state.selectedId);
    const result = removeEditable(state.selectedId);
    deselect();
    if (result === 'removed') saveNow(`${entry.name} borrado.`);
    else if (result === 'hidden') saveNow(`${entry.name} oculto (en la lista podes volver a mostrarlo).`);
  }

  function toggleSelectedVisible() {
    if (!state.selectedId) return;
    const entry = getEditableById(state.selectedId);
    const visible = setEditableVisible(state.selectedId, entry.visible === false);
    updateHelper();
    saveNow(visible ? `${entry.name} visible.` : `${entry.name} oculto.`);
  }

  function selectParent() {
    if (!state.selectedId) return;
    const parentId = getParentEditableId(state.selectedId);
    if (parentId) selectId(parentId);
    else setStatus('Ese objeto no tiene grupo padre editable.');
  }

  function onPointerDown(event) {
    if (!state.enabled) return;
    if (transformControls.dragging || transformControls.axis) return;
    event.preventDefault();
    event.stopPropagation();

    const rect = renderer.domElement.getBoundingClientRect();
    pointer.set(
      ((event.clientX - rect.left) / rect.width) * 2 - 1,
      -((event.clientY - rect.top) / rect.height) * 2 + 1,
    );

    const roots = getEditableObjects()
      .filter((entry) => entry.visible !== false && entry.object3D?.visible !== false && isInCurrentScene(entry.object3D))
      .map((entry) => entry.object3D);
    raycaster.setFromCamera(pointer, camera);

    // Performance: raycast only on editor clicks and only against registered editable roots.
    const hit = raycaster.intersectObjects(roots, true)[0]?.object;
    if (!hit) {
      deselect();
      return;
    }
    const root = findEditableRoot(hit);
    const id = root?.userData?.editorId;
    if (id) selectId(id);
  }

  function onKeyDown(event) {
    const typing = isTypingTarget(event.target);
    // T (pedido del dueño) o Tab: entrar/salir del modo editor
    if ((event.code === 'KeyT' || event.code === 'Tab') && !typing && !event.metaKey && !event.ctrlKey) {
      event.preventDefault();
      event.stopPropagation();
      toggleEnabled();
      return;
    }
    if (!state.enabled) return;

    if (event.metaKey || event.ctrlKey) {
      if (event.code === 'KeyS') {
        event.preventDefault();
        event.stopPropagation();
        saveNow('Layout local guardado.');
      } else if (event.code === 'KeyC' && !typing) {
        event.preventDefault();
        event.stopPropagation();
        // con objeto seleccionado copia el objeto; sin selección copia el JSON
        if (state.selectedId) copySelected();
        else copyJSON();
      } else if (event.code === 'KeyV' && !typing) {
        event.preventDefault();
        event.stopPropagation();
        pasteClipboard();
      } else if (event.code === 'KeyD' && !typing) {
        event.preventDefault();
        event.stopPropagation();
        duplicateSelected();
      }
      return;
    }

    if (typing) return;
    const handled = ['Escape', 'Digit1', 'Digit2', 'Digit3', 'KeyQ', 'KeyG', 'KeyP', 'Delete', 'Backspace', 'KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'KeyE', 'ShiftLeft', 'ShiftRight'].includes(event.code);
    if (handled) {
      event.preventDefault();
      event.stopPropagation();
    }
    if (event.code === 'Escape') deselect();
    if (event.code === 'Digit1') setMode('translate');
    if (event.code === 'Digit2') setMode('rotate');
    if (event.code === 'Digit3') setMode('scale');
    if (event.code === 'KeyQ') toggleSpace();
    if (event.code === 'KeyG') toggleSnap();
    if (event.code === 'KeyP') selectParent();
    if (event.code === 'Delete' || event.code === 'Backspace') deleteSelected();
  }

  transformControls.addEventListener('dragging-changed', (event) => {
    input?.keys?.clear?.();
    // mientras se arrastra el gizmo, la órbita no debe pelear por el mouse
    orbit.enabled = state.enabled && !event.value;
    if (!event.value && state.selectedObject) saveNow('Layout local guardado.');
  });
  transformControls.addEventListener('objectChange', () => {
    updateHelper();
    refreshSelected(); // liviano: no reconstruye la lista en cada frame de drag
    scheduleSave();
  });

  renderer.domElement.addEventListener('pointerdown', onPointerDown);
  window.addEventListener('keydown', onKeyDown, true);
  window.addEventListener('fourtwenty:editable-registry-change', refreshPanel);

  refreshPanel();
  console.info('FOURTWENTY World Editor listo. T (o Tab) activa/desactiva el modo editor; en build usar ?editor=1.');

  return {
    isEnabled: () => state.enabled,
    setScene,
    selectId,
    dispose() {
      clearTimeout(saveTimer);
      renderer.domElement.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('keydown', onKeyDown, true);
      window.removeEventListener('fourtwenty:editable-registry-change', refreshPanel);
      transformControls.detach();
      transformControls.dispose?.();
      orbit.dispose();
      transformHelper.parent?.remove(transformHelper);
      boxHelper.parent?.remove(boxHelper);
      panel.dispose();
    },
  };
}
