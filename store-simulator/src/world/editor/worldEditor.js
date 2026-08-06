import * as THREE from 'three';
import { TransformControls } from 'three/examples/jsm/controls/TransformControls.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { addFurnitureItem } from '../furniture.js';
import { createPiece, groupPieces, mergePiece, PIEZAS, setPieceTexture } from './pieceBuilder.js';
import { leerImagen } from '../../ui/estampaImagen.js';
import { createEditorPanel } from './editorPanel.js';
import { cuadroDesde, getFrameEditor } from '../../ui/frameEditor.js';
import { ADDABLE_MODELS, searchableModelPresets } from './modelCatalog.js';
import {
  applyLayout,
  duplicateEditable,
  findEditableRoot,
  getEditableById,
  getEditableColorInfo,
  getEditableLightRangeInfo,
  getEditableObjects,
  getParentEditableId,
  isEditableEffectivelyVisible,
  isObjectInScene,
  removeEditable,
  serializeEditableObjects,
  setEditableColor,
  setEditableLightRange,
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
  const sourceBox = new THREE.Box3();
  const sourceCenter = new THREE.Vector3();
  const sourceSize = new THREE.Vector3();
  const sourceWorldPosition = new THREE.Vector3();
  const sourceWorldScale = new THREE.Vector3();
  const sourceWorldQuaternion = new THREE.Quaternion();
  const cloneLocalPosition = new THREE.Vector3();
  const cloneLocalScale = new THREE.Vector3();
  const cloneLocalQuaternion = new THREE.Quaternion();
  const cloneLocalRotation = new THREE.Euler();
  const targetCenter = new THREE.Vector3();
  const targetRootWorldPosition = new THREE.Vector3();
  const targetWorldMatrix = new THREE.Matrix4();
  const parentInverseMatrix = new THREE.Matrix4();
  const cloneLocalMatrix = new THREE.Matrix4();
  const pointer = new THREE.Vector2();
  const orbitDir = new THREE.Vector3();
  const spawnDir = new THREE.Vector3();
  const spawnPos = new THREE.Vector3();
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

  // Editor de cuadros: aparece solo cuando el objeto seleccionado ES un cuadro.
  // Se cuelga de la seleccion del editor de mundo en vez de tener su propia
  // tecla o su propia interaccion, porque "cambiar como se ve el mundo" ya es
  // lo que hace la tecla T y no hacia falta un modo nuevo que aprender.
  // Mismo editor que abre el click derecho: uno solo para todo el juego.
  let cuadroSeleccionado = null;
  const frameEditor = getFrameEditor();

  // Abre o cierra el editor de cuadros segun lo que este seleccionado.
  function sincronizarEditorDeCuadro(entry) {
    // Se busca hacia arriba: al clickear se selecciona la pieza tocada (el
    // vidrio, un perfil), no el grupo del cuadro.
    const cuadro = cuadroDesde(entry?.object3D ?? null);
    if (cuadro) {
      if (cuadroSeleccionado !== cuadro) {
        cuadroSeleccionado = cuadro;
        frameEditor.abrir(cuadro);
      }
      return;
    }
    if (cuadroSeleccionado) {
      cuadroSeleccionado = null;
      frameEditor.cerrar();
    }
  }

  const panel = createEditorPanel({
    modelPresets: searchableModelPresets(),
    onMode: setMode,
    onToggleSpace: toggleSpace,
    onToggleSnap: toggleSnap,
    onDeselect: deselect,
    onSelectId: duplicateFromObjectList,
    onTransformInput: applyInputTransform,
    onColorInput: applyInputColor,
    onLightRangeInput: applyInputLightRange,
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
    onAddModel: addModelFromPreset,
    onPiece: handlePieceAction,
    onPieceTexture: applyPieceTexture,
  });

  function isInCurrentScene(object) {
    return isObjectInScene(object, currentScene);
  }

  function refreshPanel() {
    panel.setState(state);
    // la lista muestra solo la escena activa (calle o BOBILONIA)
    panel.setObjects(
      getEditableObjects()
        .filter((entry) => entry.object3D && isInCurrentScene(entry.object3D))
        .map((entry) => ({ ...entry, effectiveVisible: isEditableEffectivelyVisible(entry.id) })),
      state.selectedId,
    );
    const selected = state.selectedId ? getEditableById(state.selectedId) : null;
    panel.setSelected(
      selected,
      selected ? getEditableColorInfo(selected.id) : null,
      selected ? getEditableLightRangeInfo(selected.id) : null,
    );
    sincronizarEditorDeCuadro(selected);
  }

  // refresco liviano (mientras se arrastra el gizmo): no reconstruye la lista
  function refreshSelected() {
    const selected = state.selectedId ? getEditableById(state.selectedId) : null;
    panel.setSelected(
      selected,
      selected ? getEditableColorInfo(selected.id) : null,
      selected ? getEditableLightRangeInfo(selected.id) : null,
    );
    sincronizarEditorDeCuadro(selected);
  }

  function setStatus(message) {
    panel.setStatus(message);
  }

  function notifyWorldChanged() {
    if (renderer.shadowMap) renderer.shadowMap.needsUpdate = true;
    window.dispatchEvent(new CustomEvent('fourtwenty:world-edited'));
  }

  function setScene(nextScene) {
    if (!nextScene || nextScene === currentScene) return;
    deselect();
    currentScene.remove(transformHelper);
    currentScene.remove(boxHelper);
    currentScene = nextScene;
    currentScene.add(transformHelper);
    currentScene.add(boxHelper);
    refreshPanel();
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
      frameEditor.cerrar();
      cuadroSeleccionado = null;
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
    notifyWorldChanged();
    scheduleSave();
  }

  function applyInputColor(value) {
    if (!state.selectedId) return;
    const colorInfo = setEditableColor(state.selectedId, value);
    if (!colorInfo?.supported) {
      setStatus('Ese objeto no tiene un material compatible con color.');
      refreshSelected();
      return;
    }
    refreshSelected();
    notifyWorldChanged();
    scheduleSave();
    setStatus(`Color ${colorInfo.value} aplicado.`);
  }

  function applyInputLightRange(value) {
    if (!state.selectedId) return;
    const rangeInfo = setEditableLightRange(state.selectedId, value);
    if (!rangeInfo?.supported) {
      setStatus('Ese objeto no tiene rango de iluminacion editable.');
      refreshSelected();
      return;
    }
    refreshSelected();
    notifyWorldChanged();
    scheduleSave();
    setStatus(`Rango de iluminacion ${rangeInfo.value} aplicado.`);
  }

  function scheduleSave() {
    clearTimeout(saveTimer);
    saveTimer = window.setTimeout(() => saveNow('Auto-save local actualizado.'), 450);
  }

  function saveNow(message) {
    clearTimeout(saveTimer);
    const ok = saveLocalLayout(serializeCurrentLayout(), { preserveOtherDestinations: true });
    setStatus(ok ? message : 'No se pudo guardar local.');
  }

  function uniqueFurnitureId(key) {
    let n = 1;
    let id = `furniture:${key}-${Date.now().toString(36)}`;
    while (getEditableById(id)) id = `furniture:${key}-${Date.now().toString(36)}-${n++}`;
    return id;
  }

  function directionInFrontOfPlayer() {
    if (Number.isFinite(player?.modelYaw)) {
      spawnDir.set(Math.sin(player.modelYaw), 0, Math.cos(player.modelYaw));
    } else {
      camera.getWorldDirection(spawnDir);
      spawnDir.y = 0;
    }
    if (spawnDir.lengthSq() < 0.001) spawnDir.set(0, 0, -1);
    spawnDir.normalize();
    return spawnDir;
  }

  function playerWorldPosition() {
    if (player?.rig?.getWorldPosition) player.rig.getWorldPosition(spawnPos);
    else if (player?.position) spawnPos.copy(player.position);
    else spawnPos.copy(camera.position);
    return spawnPos;
  }

  function spawnPositionInFront(distance = 6) {
    playerWorldPosition();
    spawnPos.addScaledVector(directionInFrontOfPlayer(), distance);
    return spawnPos.toArray();
  }

  function duplicateFromObjectList(id) {
    const source = getEditableById(id);
    if (!source?.object3D) {
      setStatus(`Objeto no encontrado: ${id}`);
      return;
    }

    if (source.object3D.userData?.editorSelectExisting === true) {
      selectId(source.id);
      setStatus(`${source.name} seleccionado para editar.`);
      return;
    }

    source.object3D.updateWorldMatrix(true, true);
    sourceBox.setFromObject(source.object3D);
    if (sourceBox.isEmpty()) sourceBox.setFromCenterAndSize(source.object3D.getWorldPosition(sourceCenter), sourceSize.set(1, 1, 1));
    sourceBox.getCenter(sourceCenter);
    sourceBox.getSize(sourceSize);
    source.object3D.matrixWorld.decompose(sourceWorldPosition, sourceWorldQuaternion, sourceWorldScale);

    const forward = directionInFrontOfPlayer();
    const halfDepth = (Math.abs(forward.x) * sourceSize.x + Math.abs(forward.z) * sourceSize.z) * 0.5;
    const distance = Math.max(2.25, halfDepth + 1.25);
    targetCenter.copy(playerWorldPosition()).addScaledVector(forward, distance);
    targetCenter.y = playerWorldPosition().y + Math.max(0.85, sourceSize.y * 0.5);
    targetRootWorldPosition.copy(sourceWorldPosition).add(targetCenter).sub(sourceCenter);

    currentScene.updateWorldMatrix(true, false);
    targetWorldMatrix.compose(targetRootWorldPosition, sourceWorldQuaternion, sourceWorldScale);
    parentInverseMatrix.copy(currentScene.matrixWorld).invert();
    cloneLocalMatrix.multiplyMatrices(parentInverseMatrix, targetWorldMatrix);
    cloneLocalMatrix.decompose(cloneLocalPosition, cloneLocalQuaternion, cloneLocalScale);
    cloneLocalRotation.setFromQuaternion(cloneLocalQuaternion, source.object3D.rotation.order);

    const entry = duplicateEditable(id, {
      transform: {
        position: cloneLocalPosition.toArray(),
        rotation: [cloneLocalRotation.x, cloneLocalRotation.y, cloneLocalRotation.z],
        scale: cloneLocalScale.toArray(),
      },
      makeVisible: true,
      cloneAtSceneRoot: true,
    });
    if (!entry) {
      setStatus(`No se pudo crear una copia de ${source.name}.`);
      return;
    }
    selectId(entry.id);
    notifyWorldChanged();
    saveNow(`${entry.name} creado frente a BOB.`);
  }

  async function addModelFromPreset(key) {
    const preset = ADDABLE_MODELS[key];
    if (!preset) {
      setStatus(`Modelo no encontrado: ${key}`);
      return;
    }

    if (preset.sourceId) {
      const source = getEditableById(preset.sourceId);
      if (!source?.object3D) {
        setStatus(`No se encontro el origen de ${preset.name}.`);
        return;
      }
      source.object3D.updateWorldMatrix(true, true);
      sourceBox.setFromObject(source.object3D);
      sourceBox.getCenter(sourceCenter);
      spawnPositionInFront();
      spawnPos.sub(sourceCenter).add(source.object3D.position);

      const entry = duplicateEditable(preset.sourceId, {
        newId: uniqueFurnitureId(key),
        transform: {
          position: spawnPos.toArray(),
          rotation: [source.object3D.rotation.x, source.object3D.rotation.y, source.object3D.rotation.z],
          scale: source.object3D.scale.toArray(),
        },
        makeVisible: true,
      });
      if (!entry) {
        setStatus(`No se pudo agregar ${preset.name}.`);
        return;
      }
      entry.name = `${preset.name} agregado`;
      entry.type = 'furniture';
      entry.object3D.userData.editorCollider = true;
      selectId(entry.id);
      notifyWorldChanged();
      saveNow(`${preset.name} agregado.`);
      return;
    }

    setStatus(`Cargando ${preset.name}...`);
    const id = uniqueFurnitureId(key);
    const object = await addFurnitureItem(currentScene, {
      ...preset,
      id,
      type: 'furniture',
      position: spawnPositionInFront(),
      rotation: [0, 0, 0],
      scale: [1, 1, 1],
      castShadow: preset.castShadow !== false,
      receiveShadow: true,
      visible: true,
    });
    if (!object) {
      setStatus(`No se pudo cargar ${preset.name}.`);
      return;
    }
    selectId(id);
    notifyWorldChanged();
    saveNow(`${preset.name} agregado.`);
  }

  // ---- Armar a mano (ver editor/pieceBuilder.js) ----------------------------
  // Las piezas marcadas para agrupar. Se guardan por id y no por objeto: el
  // editor puede recrear un objeto (al aplicar un layout) y la referencia vieja
  // quedaria apuntando a algo que ya no esta en la escena.
  const marcadas = new Set();

  function refrescarNotaPiezas(extra = '') {
    const base = marcadas.size
      ? `${marcadas.size} pieza(s) marcada(s). Apretá Agrupar para juntarlas.`
      : 'Marcá varias piezas y apretá Agrupar. Fusionar las junta en una sola malla cuando terminaste.';
    panel.setPieceNote(extra ? `${extra} · ${base}` : base);
  }

  function handlePieceAction(accion) {
    if (PIEZAS[accion]) {
      const entry = createPiece(currentScene, accion, { position: spawnPositionInFront().toArray?.() ?? spawnPositionInFront() });
      if (!entry) { setStatus('No se pudo crear la pieza.'); return; }
      selectId(entry.id);
      notifyWorldChanged();
      saveNow(`${entry.name} creada. Movela con 1, rotala con 2, escalala con 3.`);
      refrescarNotaPiezas();
      return;
    }

    if (accion === 'marcar') {
      if (!state.selectedId) { setStatus('Seleccioná una pieza primero.'); return; }
      if (marcadas.has(state.selectedId)) marcadas.delete(state.selectedId);
      else marcadas.add(state.selectedId);
      refrescarNotaPiezas();
      return;
    }

    if (accion === 'agrupar') {
      if (marcadas.size < 2) { setStatus('Marcá al menos 2 piezas para agrupar.'); return; }
      const entry = groupPieces(currentScene, [...marcadas]);
      marcadas.clear();
      if (!entry) { setStatus('No se pudieron agrupar esas piezas.'); refrescarNotaPiezas(); return; }
      selectId(entry.id);
      notifyWorldChanged();
      saveNow('Piezas agrupadas. Ahora se mueven juntas.');
      refrescarNotaPiezas();
      return;
    }

    if (accion === 'fusionar') {
      if (!state.selectedId) { setStatus('Seleccioná el objeto agrupado.'); return; }
      const r = mergePiece(state.selectedId);
      if (!r.ok) { setStatus(r.motivo); return; }
      notifyWorldChanged();
      saveNow(`Fusionado: de ${r.antes} piezas a ${r.despues} malla(s). Baja el costo de dibujo.`);
      return;
    }
  }

  async function applyPieceTexture(file) {
    if (!state.selectedId) { setStatus('Seleccioná una pieza primero.'); return; }
    setStatus('Procesando la imagen…');
    try {
      // Mismo procesado que las estampas: le quita el fondo plano y le recorta
      // el margen vacio, asi una cinta con el logo entra ocupando la pieza
      // entera y no como un sello chico en el medio.
      const { url, recorte } = await leerImagen(file, { maxLado: 1024 });
      if (!setPieceTexture(state.selectedId, url)) {
        setStatus('Ese objeto no tiene un material que acepte imagen.');
        return;
      }
      notifyWorldChanged();
      saveNow(recorte.quitado ? 'Imagen aplicada (se le quitó el fondo).' : 'Imagen aplicada.');
    } catch (error) {
      setStatus(`No se pudo cargar la imagen: ${error.message}`);
    }
  }

  async function copyJSON() {
    const ok = await copyLayoutToClipboard(serializeCurrentLayout());
    setStatus(ok ? 'JSON copiado al portapapeles.' : 'No se pudo copiar JSON.');
  }

  async function resetFromFile() {
    clearLocalLayout();
    const base = await loadBaseLayout();
    applyLayout(base);
    notifyWorldChanged();
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
      notifyWorldChanged();
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
    notifyWorldChanged();
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
    notifyWorldChanged();
    saveNow(`Duplicado: ${entry.name}.`);
  }

  function deleteSelected() {
    if (!state.selectedId) return;
    const entry = getEditableById(state.selectedId);
    const result = removeEditable(state.selectedId);
    deselect();
    notifyWorldChanged();
    if (result === 'removed') saveNow(`${entry.name} borrado.`);
    else if (result === 'hidden') saveNow(`${entry.name} oculto (en la lista podes volver a mostrarlo).`);
  }

  function toggleSelectedVisible() {
    if (!state.selectedId) return;
    const entry = getEditableById(state.selectedId);
    const visible = setEditableVisible(state.selectedId, !isEditableEffectivelyVisible(state.selectedId));
    updateHelper();
    notifyWorldChanged();
    saveNow(visible ? `${entry.name} visible.` : `${entry.name} oculto.`);
  }

  function selectParent() {
    if (!state.selectedId) return;
    const parentId = getParentEditableId(state.selectedId);
    if (parentId) selectId(parentId);
    else setStatus('Ese objeto no tiene grupo padre editable.');
  }

  function wantsGroupSelection(event) {
    return event.shiftKey || event.getModifierState?.('CapsLock') === true;
  }

  function parentForQuickGroup(id) {
    const parentId = getParentEditableId(id);
    if (!parentId) return null;
    const parent = getEditableById(parentId);
    // Evita que Shift/Caps sobre una pieza suelta seleccione todo el mapa.
    if (parent?.object3D?.userData?.editorWorldRoot) return null;
    return parentId;
  }

  function onPointerDown(event) {
    if (!state.enabled) return;
    // preventDefault impide que el click saque el foco de los inputs del panel;
    // lo hacemos a mano para que T/atajos vuelvan a funcionar tras editar números.
    if (isTypingTarget(document.activeElement)) document.activeElement.blur();
    if (transformControls.dragging || transformControls.axis) return;
    event.preventDefault();
    event.stopPropagation();

    const rect = renderer.domElement.getBoundingClientRect();
    pointer.set(
      ((event.clientX - rect.left) / rect.width) * 2 - 1,
      -((event.clientY - rect.top) / rect.height) * 2 + 1,
    );

    const roots = getEditableObjects()
      .filter((entry) => isEditableEffectivelyVisible(entry.id) && isInCurrentScene(entry.object3D))
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
    if (!id) return;
    selectId(wantsGroupSelection(event) ? (parentForQuickGroup(id) ?? id) : id);
  }

  function onKeyDown(event) {
    if (document.body.classList.contains('elevator-panel-open')
      || document.body.classList.contains('twenty-time-open')
      || document.body.classList.contains('package-station-mission-open')) return;
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
    notifyWorldChanged();
    scheduleSave();
  });

  renderer.domElement.addEventListener('pointerdown', onPointerDown);
  window.addEventListener('keydown', onKeyDown, true);
  window.addEventListener('fourtwenty:editable-registry-change', refreshPanel);

  refreshPanel();
  console.info('FOURTWENTY World Editor listo. T (o Tab) activa/desactiva el modo editor; en build usar ?editor=1.');

  return {
    isEnabled: () => state.enabled,
    setEnabled,
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
