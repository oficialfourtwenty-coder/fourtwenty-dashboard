// MESA DE EXHIBICION + PILAS DE REMERAS PLANCHADAS
//
// Es el mueble central de un local de ropa real: una mesa cuadrada de madera
// con las prendas dobladas encima, apiladas por diseño, y la de arriba mostrando
// la estampa. En las capturas de Binco que paso Kusher son justamente esas mesas
// —dos niveles, prendas apiladas— las que hacen que el local se lea como tienda
// y no como galeria vacia.
//
// COMO SE VE UNA PRENDA DOBLADA
// De cerca no es un ladrillo: tiene el borde del doblez redondeado de un lado,
// las mangas marcadas por debajo y el cuello asomando. Pero de lejos —que es
// como se mira una pila— lo unico que se lee son las CAPAS: la linea de sombra
// entre prenda y prenda. Por eso cada pieza es una caja con las esquinas
// suavizadas y una separacion visible, y no una malla de tela cara.
//
// COSTO: ~180 triangulos por prenda doblada, y la geometria se cachea por
// tamaño. Una pila de 3 son ~540. La estampa de la de arriba es un plano de 2.

import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { getProductoForSlot, onProductosChange } from '../data/productosStore.js';

const geoCache = new Map();

function cajaRedondeada(ancho, alto, fondo, radio = 0.012, segmentos = 2) {
  const clave = `${ancho}:${alto}:${fondo}:${radio}`;
  const cacheada = geoCache.get(clave);
  if (cacheada) return cacheada;

  // Caja con los cantos suavizados: se arma con una caja central y cilindros en
  // las aristas verticales. Es mas barato que un bevel real y a la distancia a
  // la que se mira una pila no se distingue.
  const partes = [new THREE.BoxGeometry(ancho - radio * 2, alto, fondo)];
  const lateral = new THREE.BoxGeometry(radio * 2, alto, fondo - radio * 2);
  for (const sx of [-1, 1]) {
    const g = lateral.clone();
    g.translate(sx * (ancho / 2 - radio), 0, 0);
    partes.push(g);
  }
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      const esquina = new THREE.CylinderGeometry(radio, radio, alto, 6, 1);
      esquina.translate(sx * (ancho / 2 - radio), 0, sz * (fondo / 2 - radio));
      partes.push(esquina);
    }
  }
  const geometry = mergeGeometries(partes, false);
  for (const p of partes) p.dispose();
  geoCache.set(clave, geometry);
  return geometry;
}

/**
 * Pila de prendas dobladas.
 *
 * `estampa` es la textura que se apoya sobre la de arriba — es lo que Kusher
 * pidio: "la de arriba le pones el diseño". Va como un plano separado y no
 * pintada en la tela porque asi puede cambiarse sola, y porque la textura de
 * la prenda se comparte entre todas las de la pila.
 */
export function createFoldedStack({
  color = 0xf2efe6,
  cantidad = 3,
  lado = 0.30,          // el doblez de una remera de hombre mide ~30 cm
  altoPrenda = 0.032,   // una remera planchada tiene ~3 cm de alto
  estampa = null,
  material,
  nombre = 'Pila de remeras',
} = {}) {
  const group = new THREE.Group();
  group.name = nombre;

  const base = material?.clone?.() ?? new THREE.MeshStandardMaterial({ roughness: 0.9, metalness: 0 });
  base.color = new THREE.Color(color);

  let y = 0;
  let ultima = null;
  for (let i = 0; i < cantidad; i++) {
    // Las prendas de abajo aguantan el peso: se aplastan un poco.
    const alto = altoPrenda * (1 - i * 0.04);
    const pieza = new THREE.Mesh(cajaRedondeada(lado, alto, lado * 0.86), base);
    pieza.castShadow = true;
    pieza.receiveShadow = true;
    // Una pila real nunca esta perfectamente alineada. Sin este desfasaje se
    // lee como un bloque solido y se pierde el efecto de capas.
    pieza.position.set(Math.sin(i * 3.1) * 0.008, y + alto / 2, Math.cos(i * 2.3) * 0.007);
    pieza.rotation.y = Math.sin(i * 7.7) * 0.045;
    group.add(pieza);
    y += alto + 0.002;   // el aire entre prendas es lo que dibuja la sombra
    ultima = pieza;
  }

  // El plano de la estampa se crea SIEMPRE, aunque todavia no haya diseño: si
  // solo se creara cuando ya hay textura, `bindStackToProduct` no tendria donde
  // ponerla y cargar el producto desde el panel no cambiaria nada en pantalla.
  // Nace escondido y se enciende cuando el producto trae estampa.
  if (ultima) {
    const plano = new THREE.Mesh(
      new THREE.PlaneGeometry(lado * 0.62, lado * 0.62),
      new THREE.MeshStandardMaterial({
        map: estampa,
        transparent: false,
        // Recorta el fondo del PNG sin entrar en la cola de transparentes.
        alphaTest: 0.02,
        roughness: 0.85,
        metalness: 0,
      }),
    );
    plano.name = `${nombre} · estampa`;
    plano.rotation.x = -Math.PI / 2;
    // 1 mm sobre la prenda de arriba: la serigrafia no flota.
    plano.position.set(ultima.position.x, y + 0.001, ultima.position.z);
    plano.rotation.z = -ultima.rotation.y;
    plano.receiveShadow = true;
    plano.visible = Boolean(estampa);
    group.add(plano);
  }

  group.userData.foldedStack = { color, cantidad, lado };
  return group;
}

/**
 * Mesa cuadrada de exhibicion, estilo tienda de ropa clasica (Polo Ralph
 * Lauren): tapa de madera maciza, faldon perimetral, patas cuadradas y un
 * estante inferior. Dos niveles, como las de Binco.
 *
 * Devuelve el grupo y las alturas de cada nivel, para que quien la use sepa
 * donde apoyar las pilas sin tener que adivinar el numero.
 */
export function createDisplayTable({
  lado = 1.5,
  alto = 0.78,          // altura de mesa de exhibicion: se mira desde arriba
  maderaMaterial,
  metalMaterial,
  nombre = 'Mesa de exhibicion',
} = {}) {
  const group = new THREE.Group();
  group.name = nombre;
  group.userData.editorCollider = true;

  const madera = maderaMaterial?.clone?.() ?? new THREE.MeshStandardMaterial({
    color: 0x6b4a2f, roughness: 0.7, metalness: 0,
  });
  const metal = metalMaterial?.clone?.() ?? new THREE.MeshStandardMaterial({
    color: 0x2b2b2e, roughness: 0.4, metalness: 0.7,
  });

  const grosorTapa = 0.045;
  const pata = 0.075;

  const tapa = new THREE.Mesh(cajaRedondeada(lado, grosorTapa, lado, 0.014), madera);
  tapa.name = `${nombre} · tapa`;
  tapa.position.y = alto - grosorTapa / 2;
  tapa.castShadow = true;
  tapa.receiveShadow = true;
  group.add(tapa);

  // Faldon: la moldura que corre bajo la tapa. Es el detalle que separa una
  // mesa de tienda de una tabla sobre cuatro palos.
  for (const [dx, dz, ancho, fondo] of [
    [0, lado / 2 - 0.03, lado - 0.1, 0.05],
    [0, -(lado / 2 - 0.03), lado - 0.1, 0.05],
    [lado / 2 - 0.03, 0, 0.05, lado - 0.1],
    [-(lado / 2 - 0.03), 0, 0.05, lado - 0.1],
  ]) {
    const faldon = new THREE.Mesh(new THREE.BoxGeometry(ancho, 0.07, fondo), madera);
    faldon.position.set(dx, alto - grosorTapa - 0.035, dz);
    faldon.castShadow = true;
    faldon.receiveShadow = true;
    group.add(faldon);
  }

  const alturaEstante = 0.24;
  const estante = new THREE.Mesh(cajaRedondeada(lado - 0.22, 0.03, lado - 0.22, 0.01), madera);
  estante.name = `${nombre} · estante inferior`;
  estante.position.y = alturaEstante;
  estante.castShadow = true;
  estante.receiveShadow = true;
  group.add(estante);

  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      const p = new THREE.Mesh(new THREE.BoxGeometry(pata, alto - grosorTapa, pata), madera);
      p.position.set(
        sx * (lado / 2 - pata / 2 - 0.02),
        (alto - grosorTapa) / 2,
        sz * (lado / 2 - pata / 2 - 0.02),
      );
      p.castShadow = true;
      p.receiveShadow = true;
      group.add(p);
      // regaton metalico
      const pie = new THREE.Mesh(new THREE.CylinderGeometry(pata * 0.45, pata * 0.5, 0.02, 8), metal);
      pie.position.set(p.position.x, 0.01, p.position.z);
      group.add(pie);
    }
  }

  return {
    group,
    // Alturas donde apoyar las pilas. Se devuelven en vez de que quien la use
    // las recalcule: si maña se cambia el grosor de la tapa, las prendas
    // siguen apoyadas y no quedan flotando ni hundidas.
    alturaTapa: alto,
    alturaEstante: alturaEstante + 0.015,
    lado,
  };
}

// ---------------------------------------------------------------------------
// Las pilas toman su diseño del catalogo de productos
// ---------------------------------------------------------------------------
//
// Mismo criterio que las prendas colgadas (world/garmentPrints.js): la estampa
// sale del producto, se carga desde el panel de administracion (tecla P) y se
// guarda como archivo del repo. Asi cargar un producto viste la pila Y la deja
// clickeable para comprar, en vez de ser dos trabajos separados.

const pilasConProducto = new Set();
const texturasEstampa = new Map();

function texturaEstampa(ruta) {
  if (!ruta) return null;
  const cacheada = texturasEstampa.get(ruta);
  if (cacheada) return cacheada;
  const t = new THREE.TextureLoader().load(ruta);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  texturasEstampa.set(ruta, t);
  return t;
}

function refrescarPila(pila) {
  const slot = pila.userData?.productSlot;
  if (!slot) return;
  const ruta = getProductoForSlot(slot.piso, slot.index)?.producto?.estampa;
  const limpia = typeof ruta === 'string' && ruta.trim() ? ruta.trim() : '';
  if (limpia === pila.userData.estampaActual) return;
  pila.userData.estampaActual = limpia;

  const plano = pila.getObjectByName(`${pila.name} · estampa`);
  if (!plano) return;
  plano.material.map = texturaEstampa(limpia);
  plano.material.needsUpdate = true;
  // Sin diseño el plano se esconde: si no queda un cuadrado gris sobre la
  // prenda de arriba, que se ve peor que no tener nada.
  plano.visible = Boolean(limpia);
}

/** Engancha una pila al catalogo y la deja clickeable como producto. */
export function bindStackToProduct(pila, slot) {
  if (!pila || !slot) return pila;
  pila.userData.productSlot = slot;
  // productClicks sube por los padres buscando productSlot, asi que clickear
  // cualquier prenda de la pila abre el producto.
  pilasConProducto.add(pila);
  refrescarPila(pila);
  return pila;
}

export function unbindStacksFromProducts(raiz) {
  raiz?.traverse?.((o) => pilasConProducto.delete(o));
}

let pendiente = 0;
onProductosChange(() => {
  if (pendiente) return;
  pendiente = requestAnimationFrame(() => {
    pendiente = 0;
    for (const pila of pilasConProducto) {
      if (!pila.parent) { pilasConProducto.delete(pila); continue; }
      refrescarPila(pila);
    }
  });
});
