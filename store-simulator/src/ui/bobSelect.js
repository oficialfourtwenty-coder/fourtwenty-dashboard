// PANTALLA DE ELECCION DE BOB — "cargar la partida y elegir con cual jugás".
//
// COMO SE HACEN LAS 10 FOTOS
// No son imagenes guardadas: se dibujan con el modelo de verdad, en el momento.
// Un renderer chiquito aparte (256x256) carga `bob.glb` UNA vez y saca las diez
// fotos cambiandole la textura entre foto y foto. Es el mismo truco de las
// miniaturas del editor (`world/editor/thumbnails.js`), que ya estaba probado.
//
// Por que importa que sea el modelo real y no diez PNG: si mañana Fer cambia a
// BOB, las diez fotos cambian solas. Un PNG guardado quedaria mintiendo.
//
// ⚠️ `preserveDrawingBuffer: true` es obligatorio para que `toDataURL` no salga
// en negro — el navegador limpia el buffer apenas termina de dibujar. Ya nos
// paso con las miniaturas del editor.
//
// ⚠️ El GLB no se vuelve a descargar: el navegador lo tiene en su cache de la
// primera carga. Lo que se paga es decodificarlo una segunda vez, y eso ocurre
// mientras la persona esta leyendo la pantalla, no durante el juego.
//
// PLATA Y MEMORIA
// Al terminar se sueltan renderer, escena, geometrias y texturas
// (`renderer.dispose()` + `forceContextLoss()`), porque un contexto WebGL que
// queda abierto cuenta contra el limite del navegador (~16) y despues el juego
// se queda sin poder crear el suyo.
import * as THREE from 'three';
import { gltfLoader } from '../world/gltfLoaders.js';
import { normalizeGLTFHeight } from '../world/gltfUtils.js';
import { BOB_SKINS, aplicarSkin, bobElegido, guardarBobElegido, mallaDeBob } from '../player/bobSkins.js';
import { cuentaTiendanube, guardarCuentaTiendanube } from '../data/cuentaTiendanube.js';

const LADO_FOTO = 256;     // se muestra a ~150 px; 256 alcanza y sobra
const LADO_TEXTURA = 256;  // textura repintada solo para la foto

const CSS = `
#bob-select {
  position: fixed; inset: 0; z-index: 60; display: none;
  flex-direction: column; align-items: center; justify-content: center; gap: 14px;
  background: radial-gradient(ellipse at 50% 35%, #17140f 0%, #000 70%);
  color: #f2e8c9; font-family: 'Courier New', monospace; text-align: center;
  padding: 18px; overflow-y: auto;
}
#bob-select.show { display: flex; }
#bob-select h2 { margin: 0; font-size: 26px; letter-spacing: 8px; color: #d4af37; }
#bob-select .bs-hint { margin: 0; font-size: 11px; letter-spacing: 2px; color: #93887a; }
#bob-select .bs-grid {
  display: grid; grid-template-columns: repeat(5, 1fr); gap: 10px;
  max-width: 860px; width: 100%;
}
#bob-select .bs-card {
  background: #0e0d0b; border: 2px solid #2a2620; border-radius: 8px;
  padding: 8px 6px 10px; cursor: pointer; transition: border-color .12s, transform .12s, background .12s;
}
#bob-select .bs-card:hover { border-color: #6b5c33; transform: translateY(-2px); }
#bob-select .bs-card.sel { border-color: #d4af37; background: #1a1509; }
#bob-select .bs-card img, #bob-select .bs-card .bs-ph {
  width: 100%; aspect-ratio: 1; display: block; border-radius: 5px;
  background: #131110; object-fit: cover;
}
#bob-select .bs-card .bs-nom { margin-top: 6px; font-size: 10px; letter-spacing: 1.5px; color: #cbbfa6; }
#bob-select .bs-card.sel .bs-nom { color: #d4af37; }
#bob-select .bs-desc { font-size: 11px; color: #9a8f7e; min-height: 15px; letter-spacing: 1px; }
#bob-select .bs-cuenta {
  width: 100%; max-width: 560px; border-top: 1px solid #2a2620; padding-top: 12px;
  display: flex; flex-direction: column; gap: 6px; align-items: center;
}
#bob-select .bs-cuenta label { font-size: 10px; letter-spacing: 2px; color: #8d8272; }
#bob-select .bs-cuenta input {
  width: 100%; background: #0b0a09; border: 1px solid #34302a; border-radius: 5px;
  color: #f2e8c9; font-family: inherit; font-size: 12px; padding: 8px 10px; text-align: center;
}
#bob-select .bs-cuenta input:focus { outline: none; border-color: #6b5c33; }
#bob-select .bs-aclara { font-size: 10px; color: #6f675c; letter-spacing: .5px; line-height: 1.5; max-width: 520px; }
#bob-select .bs-aclara b { color: #9a8f7e; }
#bob-select .bs-error { font-size: 10px; color: #d2694a; letter-spacing: 1px; min-height: 13px; }
#bob-select .bs-go {
  margin-top: 2px; background: #d4af37; color: #14110a; border: 0; border-radius: 6px;
  font-family: inherit; font-weight: bold; font-size: 14px; letter-spacing: 4px;
  padding: 12px 34px; cursor: pointer;
}
#bob-select .bs-go:hover { background: #e8c451; }
@media (max-width: 720px) {
  #bob-select .bs-grid { grid-template-columns: repeat(3, 1fr); }
  #bob-select h2 { font-size: 20px; letter-spacing: 5px; }
}
`;

// ---- Las diez fotos --------------------------------------------------------

async function sacarLasFotos() {
  const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, preserveDrawingBuffer: true });
  renderer.setSize(LADO_FOTO, LADO_FOTO);
  renderer.setPixelRatio(1);
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const escena = new THREE.Scene();
  escena.add(new THREE.HemisphereLight(0xffffff, 0x35302a, 2.1));
  const foco = new THREE.DirectionalLight(0xfff0d0, 2.4);
  foco.position.set(2, 3, 4);
  escena.add(foco);

  const camara = new THREE.PerspectiveCamera(30, 1, 0.05, 40);

  let fotos = [];
  try {
    const gltf = await gltfLoader().loadAsync('assets/bob/bob.glb');
    const modelo = gltf.scene;
    modelo.rotation.y = -Math.PI / 2;         // el frente del GLB es +x
    normalizeGLTFHeight(modelo, 1.7);
    escena.add(modelo);

    // Pose de reposo: sin esto sale en T-pose, que se ve rota.
    if (gltf.animations?.length) {
      const mixer = new THREE.AnimationMixer(modelo);
      const idle = gltf.animations.find((c) => /idle/i.test(c.name)) ?? gltf.animations[0];
      mixer.clipAction(idle).play();
      mixer.setTime(0);
    }
    modelo.updateMatrixWorld(true);

    // Encuadre de medio cuerpo para arriba: la cara es lo que distingue un
    // pelaje de otro; de cuerpo entero los diez se ven casi iguales.
    const caja = new THREE.Box3().setFromObject(modelo);
    const alto = caja.max.y - caja.min.y;
    const centro = new THREE.Vector3(0, caja.min.y + alto * 0.78, 0);
    camara.position.set(alto * 0.34, centro.y + alto * 0.06, alto * 1.15);
    camara.lookAt(centro);

    const malla = mallaDeBob(modelo);
    const texturaBase = malla?.material?.map ?? null;

    for (const skin of BOB_SKINS) {
      aplicarSkin(modelo, skin, { lado: LADO_TEXTURA });
      renderer.render(escena, camara);
      fotos.push({ skin, url: renderer.domElement.toDataURL('image/png') });
    }
    // Dejar el material como estaba antes de soltar todo.
    if (malla && texturaBase) malla.material.map = texturaBase;
  } catch (e) {
    console.warn('BOB select: no se pudieron generar las fotos —', e?.message ?? e);
    fotos = BOB_SKINS.map((skin) => ({ skin, url: null }));
  } finally {
    // Soltar el contexto WebGL. Si queda abierto, el navegador puede negarle
    // el suyo al juego (limite de ~16 contextos por pestaña).
    escena.traverse((o) => {
      if (o.isMesh) {
        o.geometry?.dispose?.();
        for (const m of [].concat(o.material ?? [])) {
          m.map?.dispose?.(); m.normalMap?.dispose?.(); m.dispose?.();
        }
      }
    });
    renderer.dispose();
    renderer.forceContextLoss?.();
  }
  return fotos;
}

// ---- La pantalla -----------------------------------------------------------

export function initBobSelect() {
  const estilo = document.createElement('style');
  estilo.textContent = CSS;
  document.head.appendChild(estilo);

  const el = document.createElement('div');
  el.id = 'bob-select';
  el.innerHTML = `
    <h2>ELEGÍ TU BOB</h2>
    <p class="bs-hint">EL QUE ELIJAS QUEDA GUARDADO EN ESTA COMPUTADORA</p>
    <div class="bs-grid"></div>
    <p class="bs-desc"></p>
    <div class="bs-cuenta">
      <label for="bs-tn">TU CUENTA DE FOURTWENTY EN TIENDANUBE (OPCIONAL)</label>
      <input id="bs-tn" type="url" inputmode="url" spellcheck="false"
             placeholder="https://fourtwenty.mitiendanube.com" autocomplete="off">
      <p class="bs-error"></p>
      <p class="bs-aclara">
        Es solo un <b>link guardado</b>: cuando una prenda todavía no tiene su
        link de compra cargado, el botón COMPRAR te lleva acá en vez de no hacer
        nada. <b>No es un inicio de sesión</b> y no tiene nada que ver con el
        cobro — nunca pongas acá una contraseña.
      </p>
    </div>
    <button type="button" class="bs-go">EMPEZAR</button>
  `;
  document.body.appendChild(el);

  const grid = el.querySelector('.bs-grid');
  const desc = el.querySelector('.bs-desc');
  const input = el.querySelector('#bs-tn');
  const error = el.querySelector('.bs-error');
  const boton = el.querySelector('.bs-go');

  let elegido = bobElegido() ?? BOB_SKINS[0];
  let resolver = null;
  let fotosListas = null;

  // Las tarjetas se dibujan de una, con un hueco donde va a ir la foto. Así la
  // pantalla se ve completa al instante y las fotos aparecen cuando salen, en
  // vez de dejar el fondo negro mientras se renderiza.
  const tarjetas = BOB_SKINS.map((skin) => {
    const card = document.createElement('div');
    card.className = 'bs-card';
    card.innerHTML = `<div class="bs-ph"></div><div class="bs-nom">${skin.nombre}</div>`;
    card.addEventListener('click', () => seleccionar(skin));
    card.addEventListener('mouseenter', () => { desc.textContent = skin.descripcion; });
    grid.appendChild(card);
    return { skin, card };
  });
  grid.addEventListener('mouseleave', () => { desc.textContent = elegido.descripcion; });

  function seleccionar(skin) {
    elegido = skin;
    for (const t of tarjetas) t.card.classList.toggle('sel', t.skin.id === skin.id);
    desc.textContent = skin.descripcion;
    boton.textContent = skin.original ? 'EMPEZAR' : `EMPEZAR CON ${skin.nombre}`;
  }

  function ponerFotos(fotos) {
    for (const { skin, url } of fotos) {
      if (!url) continue;
      const t = tarjetas.find((x) => x.skin.id === skin.id);
      const hueco = t?.card.querySelector('.bs-ph');
      if (!hueco) continue;
      const img = document.createElement('img');
      img.src = url;
      img.alt = skin.nombre;
      hueco.replaceWith(img);
    }
  }

  function cerrar() {
    // Guardar el link recién acá: si lo guardáramos en cada tecla, un link a
    // medio escribir quedaría persistido.
    const texto = input.value.trim();
    if (texto && guardarCuentaTiendanube(texto) === null) {
      error.textContent = 'Ese link no se entiende. Tiene que empezar con https://';
      input.focus();
      return;                     // no se sale con un link roto: se avisa
    }
    guardarCuentaTiendanube(texto);
    guardarBobElegido(elegido.id);
    el.classList.remove('show');
    const r = resolver; resolver = null;
    r?.(elegido);
  }

  boton.addEventListener('click', cerrar);
  input.addEventListener('input', () => { error.textContent = ''; });
  input.addEventListener('keydown', (e) => { if (e.key === 'Enter') cerrar(); });

  return {
    // Muestra la pantalla y devuelve una promesa con el BOB elegido.
    async abrir() {
      input.value = cuentaTiendanube();
      error.textContent = '';
      seleccionar(elegido);
      el.classList.add('show');
      // Las fotos se generan una sola vez por sesión.
      if (!fotosListas) fotosListas = sacarLasFotos();
      fotosListas.then(ponerFotos).catch(() => {});
      return new Promise((r) => { resolver = r; });
    },
    isOpen: () => el.classList.contains('show'),
  };
}
