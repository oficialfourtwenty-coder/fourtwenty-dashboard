import * as THREE from 'three';
import { TransformControls } from 'three/examples/jsm/controls/TransformControls.js';
import { createEditorPanel } from './editorPanel.js';
import {
  applyLayout,
  findEditableRoot,
  getEditableById,
  getEditableObjects,
  serializeEditableObjects,
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

export function initWorldEditor({ scene, camera, renderer, input } = {}) {
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
  currentScene.add(transformHelper);

  const boxHelper = new THREE.BoxHelper(new THREE.Object3D(), 0xff6d18);
  boxHelper.visible = false;
  currentScene.add(boxHelper);

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
  });

  function refreshPanel() {
    panel.setState(state);
    panel.setObjects(getEditableObjects(), state.selectedId);
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
      panel.show();
      setStatus('Edit Mode activo.');
    } else {
      deselect();
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
      .filter((entry) => entry.visible !== false && entry.object3D?.visible !== false)
      .map((entry) => entry.object3D);

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
    if (event.code === 'Tab' && !typing) {
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
        copyJSON();
      }
      return;
    }

    if (typing) return;
    const handled = ['Escape', 'Digit1', 'Digit2', 'Digit3', 'KeyQ', 'KeyG', 'KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'KeyE', 'ShiftLeft', 'ShiftRight'].includes(event.code);
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
  }

  transformControls.addEventListener('dragging-changed', (event) => {
    input?.keys?.clear?.();
    if (!event.value && state.selectedObject) saveNow('Layout local guardado.');
  });
  transformControls.addEventListener('objectChange', () => {
    updateHelper();
    refreshPanel();
    scheduleSave();
  });

  renderer.domElement.addEventListener('pointerdown', onPointerDown);
  window.addEventListener('keydown', onKeyDown, true);
  window.addEventListener('fourtwenty:editable-registry-change', refreshPanel);

  refreshPanel();
  console.info('FOURTWENTY World Editor listo. Tab activa/desactiva el modo editor en desarrollo; en build usar ?editor=1.');

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
      transformHelper.parent?.remove(transformHelper);
      boxHelper.parent?.remove(boxHelper);
      panel.dispose();
    },
  };
}
