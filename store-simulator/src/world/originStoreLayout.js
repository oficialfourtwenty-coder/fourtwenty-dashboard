import * as THREE from 'three';
import displayUrl from '../assets/origen/origen-display-3-v1.glb?url';
import centralIslandUrl from '../assets/origen/origen-central-island-v1.glb?url';
import backRailUrl from '../assets/origen/origen-barral-pared-3-hoodies.glb?url';
import sofaUrl from '../assets/origen/origen-sofa-v1.glb?url';
import glassTableUrl from '../assets/origen/origen-glass-table-v1.glb?url';
import drDreVinylUrl from '../assets/origen/origen-vinyl-dr-dre-v1.glb?url';
import vinylCabinetUrl from '../assets/origen/origen-vinyl-cabinet-v1.glb?url';
import { registerEditableObject } from './editor/editableRegistry.js';
import { gltfLoader } from './gltfLoaders.js';

const ORIGEN_ID = 1;

function configureModel(model) {
  model.traverse((object) => {
    if (!object.isMesh) return;
    object.castShadow = true;
    object.receiveShadow = true;
    const materials = Array.isArray(object.material) ? object.material : [object.material];
    for (const material of materials) {
      if (!material?.isMeshStandardMaterial) continue;
      for (const value of Object.values(material)) {
        if (value?.isTexture) value.userData.destinationOwned = true;
      }
      material.envMapIntensity = 1.1;
      const name = `${material.name} ${object.name}`.toLowerCase();
      if (name.includes('metal')) {
        material.color.setHex(0x171716);
        material.metalness = 0.86;
        material.roughness = 0.26;
      } else if (name.includes('stone')) {
        material.color.setHex(0xb9aa97);
        material.metalness = 0.02;
        material.roughness = 0.58;
      } else if (name.includes('warm_led')) {
        material.color.setHex(0xffb36a);
        material.emissive?.setHex(0xff9b45);
        material.emissiveIntensity = 3.2;
      } else if (name.includes('leaf')) {
        material.roughness = 0.78;
        material.envMapIntensity = 0.55;
      }
      material.needsUpdate = true;
    }
  });
}

function originSignTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#171513';
  ctx.font = '500 62px Arial, Helvetica, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.letterSpacing = '14px';
  ctx.fillText('ORIGEN', 256, 66);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.generateMipmaps = false;
  texture.minFilter = THREE.LinearFilter;
  return texture;
}

// Terminacion visual liviana: cuatro barras simples y un canvas generado en
// memoria. No agrega ningun archivo, GLB ni textura descargable al proyecto.
function addOriginAtmosphere(root) {
  const atmosphere = new THREE.Group();
  atmosphere.name = 'ORIGEN · terminacion cinematografica';
  atmosphere.userData.editorHelper = true;

  const glow = new THREE.MeshStandardMaterial({
    color: 0xffd3a0,
    emissive: 0xffa451,
    emissiveIntensity: 3.6,
    roughness: 0.25,
  });
  const strip = (size, position) => {
    const light = new THREE.Mesh(new THREE.BoxGeometry(...size), glow);
    light.position.fromArray(position);
    light.castShadow = false;
    light.receiveShadow = false;
    light.userData.skipShadow = true;
    atmosphere.add(light);
  };
  strip([10.9, 0.025, 0.035], [0, 0.075, -3.78]);
  strip([0.035, 0.025, 12.15], [-5.55, 0.075, 2.25]);
  strip([0.035, 0.025, 12.15], [5.55, 0.075, 2.25]);

  const sign = new THREE.Mesh(
    new THREE.PlaneGeometry(2.75, 0.69),
    new THREE.MeshBasicMaterial({
      map: originSignTexture(),
      transparent: true,
      depthWrite: false,
      toneMapped: false,
      side: THREE.DoubleSide,
    }),
  );
  sign.name = 'ORIGEN · cartel';
  sign.position.set(0, 3.0, -3.84);
  atmosphere.add(sign);

  root.add(atmosphere);
}

function editableUnit(root, {
  id,
  name,
  position,
  rotationY = 0,
  scale = 1,
  collider = false,
}) {
  const group = new THREE.Group();
  group.name = name;
  group.position.fromArray(position);
  group.rotation.y = rotationY;
  group.scale.setScalar(scale);
  group.userData.editorUnit = true;
  group.userData.editorSelectExisting = true;
  if (collider) group.userData.destinationCollider = true;
  root.add(group);

  registerEditableObject({
    id: `destino-${ORIGEN_ID}:origen-${id}`,
    name,
    type: 'destino-1',
    object3D: group,
    manageShadows: false,
    collidable: collider,
  }, { silent: true });
  return group;
}

function addWall(root, material, {
  id,
  name,
  size,
  position,
}) {
  const group = editableUnit(root, {
    id,
    name,
    position,
    collider: true,
  });
  const wall = new THREE.Mesh(new THREE.BoxGeometry(...size), material);
  wall.name = `${name} · superficie`;
  wall.castShadow = true;
  wall.receiveShadow = true;
  group.add(wall);
}

function loadModelInto(group, url) {
  gltfLoader().load(
    url,
    (gltf) => {
      if (!group.parent) return;
      configureModel(gltf.scene);
      group.add(gltf.scene);
    },
    undefined,
    (error) => console.warn(`No se pudo cargar ${group.name}.`, error),
  );
}

// Los modelos externos vienen en escalas y origenes distintos. Esta envoltura
// los centra, apoya en el piso y les da una medida real sin modificar el GLB.
function loadFittedModelInto(group, url, maxDimension) {
  gltfLoader().load(
    url,
    (gltf) => {
      if (!group.parent) return;
      const model = gltf.scene;
      configureModel(model);
      model.updateMatrixWorld(true);
      const box = new THREE.Box3().setFromObject(model);
      const size = box.getSize(new THREE.Vector3());
      const center = box.getCenter(new THREE.Vector3());
      const largest = Math.max(size.x, size.y, size.z);
      if (!Number.isFinite(largest) || largest <= 0) return;

      model.position.x -= center.x;
      model.position.y -= box.min.y;
      model.position.z -= center.z;
      const fitted = new THREE.Group();
      fitted.name = `${group.name} · modelo ajustado`;
      fitted.scale.setScalar(maxDimension / largest);
      fitted.add(model);
      group.add(fitted);
      // El grupo se registro antes de que llegara el GLB. Registrarlo otra vez
      // marca tambien sus mallas nuevas: asi el click las selecciona como una
      // unidad completa en vez de quedar como geometria fija.
      registerEditableObject({
        id: group.userData.editorId,
        name: group.name,
        type: `destino-${ORIGEN_ID}`,
        object3D: group,
        manageShadows: false,
        collidable: group.userData.destinationCollider === true,
      });
    },
    undefined,
    (error) => console.warn(`No se pudo cargar ${group.name}.`, error),
  );
}

function addOriginLounge(root) {
  const placements = [
    {
      id: 'sofa-lateral',
      name: 'ORIGEN · sofa lateral',
      url: sofaUrl,
      position: [-4.96, 0, 7.18],
      rotationY: Math.PI / 2,
      maxDimension: 3.35,
      collider: true,
    },
    {
      id: 'mesa-vidrio',
      name: 'ORIGEN · mesa de vidrio',
      url: glassTableUrl,
      position: [-3.35, 0, 7.18],
      maxDimension: 2.15,
      collider: true,
    },
    {
      id: 'vinilo-dr-dre',
      name: 'ORIGEN · vinilo Dr. Dre sobre mesa',
      url: drDreVinylUrl,
      position: [-3.35, 0.53, 7.18],
      rotationY: Math.PI / 2,
      maxDimension: 0.72,
      collider: false,
    },
    {
      id: 'mueble-vinilos',
      name: 'ORIGEN · mueble de vinilos',
      url: vinylCabinetUrl,
      position: [5.15, 0, 7.18],
      rotationY: -Math.PI / 2,
      maxDimension: 2.8,
      collider: true,
    },
  ];

  for (const placement of placements) {
    const group = editableUnit(root, placement);
    loadFittedModelInto(group, placement.url, placement.maxDimension);
  }
}

function addSideDisplays(root) {
  const placements = [
    { id: 'display-izquierdo-1', name: 'ORIGEN · exhibidor izquierdo 1', position: [-5.15, 0, -0.85], rotationY: Math.PI / 2, scale: 1.1 },
    { id: 'display-izquierdo-2', name: 'ORIGEN · exhibidor izquierdo 2', position: [-5.15, 0, 1.75], rotationY: Math.PI / 2, scale: 1.1 },
    { id: 'display-derecho-1', name: 'ORIGEN · exhibidor derecho 1', position: [5.15, 0, -0.85], rotationY: -Math.PI / 2, scale: 1.1 },
    { id: 'display-derecho-2', name: 'ORIGEN · exhibidor derecho 2', position: [5.15, 0, 1.75], rotationY: -Math.PI / 2, scale: 1.1 },
  ];

  gltfLoader().load(
    displayUrl,
    (gltf) => {
      if (!root.parent) return;
      for (const placement of placements) {
        const group = editableUnit(root, { ...placement, collider: true });
        const model = gltf.scene.clone(true);
        configureModel(model);
        group.add(model);
      }
    },
    undefined,
    (error) => console.warn('No se pudieron cargar los exhibidores de ORIGEN.', error),
  );
}

export function addOriginStoreLayout(root) {
  const plaster = new THREE.MeshPhysicalMaterial({
    color: 0xd7cabc,
    roughness: 0.82,
    metalness: 0,
    clearcoat: 0.05,
    clearcoatRoughness: 0.72,
  });

  addWall(root, plaster, {
    id: 'pared-izquierda',
    name: 'ORIGEN · pared izquierda',
    size: [0.18, 3.7, 12.8],
    position: [-5.72, 1.85, 2.45],
  });
  addWall(root, plaster, {
    id: 'pared-derecha',
    name: 'ORIGEN · pared derecha',
    size: [0.18, 3.7, 12.8],
    position: [5.72, 1.85, 2.45],
  });
  addWall(root, plaster, {
    id: 'pared-fondo',
    name: 'ORIGEN · pared del fondo',
    size: [11.44, 3.7, 0.18],
    position: [0, 1.85, -3.95],
  });

  addSideDisplays(root);

  const island = editableUnit(root, {
    id: 'isla-central',
    name: 'ORIGEN · isla central con cannabis',
    position: [0, 0, 3.35],
    scale: 1.28,
    collider: true,
  });
  loadModelInto(island, centralIslandUrl);

  const rail = editableUnit(root, {
    id: 'barral-fondo',
    name: 'ORIGEN · barral del fondo para 3 hoodies',
    position: [0, 2.18, -3.79],
    rotationY: 0,
    collider: false,
  });
  loadModelInto(rail, backRailUrl);

  // Siempre al final: no altera los indices historicos de los objetos editables.
  addOriginAtmosphere(root);
  addOriginLounge(root);
}
