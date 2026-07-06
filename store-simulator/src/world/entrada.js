import * as THREE from 'three';

const loader = new THREE.TextureLoader();

function photoMaterial(path) {
  const texture = loader.load(path);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  return new THREE.MeshStandardMaterial({ map: texture, roughness: 0.78 });
}

export function addEntrada(scene, spawn) {
  const sideA = photoMaterial('/textures/entrada/IMG_0318.PNG');
  const sideB = photoMaterial('/textures/entrada/IMG_0321.PNG');
  const front = photoMaterial('/textures/entrada/IMG_0317.PNG');
  const back = photoMaterial('/textures/entrada/IMG_0327.PNG');
  const neutral = new THREE.MeshStandardMaterial({ color: 0xd8d0c2, roughness: 0.86 });

  const entrada = new THREE.Mesh(
    new THREE.BoxGeometry(3, 3, 0.5),
    [sideA, sideB, neutral, neutral, front, back],
  );
  entrada.name = 'Entrada local fotos';
  entrada.position.set(spawn.x, 1.5, spawn.z - 2.6);
  entrada.castShadow = true;
  entrada.receiveShadow = true;
  scene.add(entrada);

  return entrada;
}
