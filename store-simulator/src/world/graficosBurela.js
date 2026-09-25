// SALTO GRAFICO DE BURELA (prueba del 25/09/2026) — luz, sombra y reflejos.
//
// Kusher pidio "un salto grafico potente, sin perder rendimiento ni fluidez".
// Antes de tocar nada se midio por que Burela se veia plana, y salieron cuatro
// causas concretas. Ninguna se arregla subiendo poligonos: todas son de luz.
//
//   1. LA SOMBRA DEL SOL ESTABA ORIENTADA AL REVES. El recuadro de sombra media
//      176 m a lo ancho de la VEREDA (eje Z, donde el mundo mide ~55 m) y 72 m a
//      lo largo de la calle. Medido con `tools/smoke/fotos-burela.mjs`: 11,6
//      pixeles por metro en un eje, y mas alla de x≈±50 m no habia sombra. Se
//      escribio cuando la calle media 56 m y los dos numeros daban parecido; al
//      estirar el campo x3 (10/09) el error se agrando.
//   2. LOS REFLEJOS ERAN DE UN CUARTO DE ESTUDIO. `RoomEnvironment` es una caja
//      gris con paneles de luz: sirve para mostrar un producto, no para una
//      calle. Por eso el auto blanco se veia de yeso y todo tenia la misma luz
//      gris de relleno. Aca el reflejo se pinta con el CIELO de la hora: azul
//      arriba, la bruma en el horizonte y el rebote tibio del piso abajo.
//   3. LA LUZ DE RELLENO PESABA CASI LO MISMO QUE EL SOL. La hemisferica iba a
//      ~1 contra un sol de ~2,5: lo iluminado y lo sombreado casi no se
//      distinguian. Un dia de sol de verdad tiene una sombra mucho mas marcada
//      y teñida del azul del cielo. Se baja la hemisferica y el cielo toma su
//      lugar, que ademas trae direccion (lo que mira arriba recibe cielo, lo
//      que mira abajo recibe piso).
//   4. EL ASFALTO NO RECIBIA SOMBRA. Faltaba `receiveShadow`: los autos
//      proyectaban sombra, pero sobre la calle no se dibujaba y flotaban.
//
// Todo esto es SOLO de Burela: los pisos del ascensor son de Fer y la Terraza
// esta aprobada como esta. Se engancha desde `street.js` (en `outdoorLighting`)
// y lo llama `dayNightCycle` cada vez que cambia la hora, igual que el cielo.
//
// Se apaga con `?graficos=antes`, que deja el juego exactamente como estaba:
// sirve para comparar en la misma sesion y para descartar la prueba sin tocar
// codigo.
import * as THREE from 'three';

export const GRAFICOS_NUEVOS = typeof location === 'undefined'
  || new URLSearchParams(location.search).get('graficos') !== 'antes';

// ---- Proporcion de luces --------------------------------------------------
// Multiplican la paleta de `dayNightCycle` en vez de reemplazarla: asi el
// amanecer, el atardecer y la noche que ya estan afinados siguen igual, solo
// cambia CUANTO pesa cada luz respecto de las otras.
// Medido en la foto de la vereda (`fotos-burela.mjs`, 15 hs): con los numeros
// de antes la vereda al sol quedaba 1,5 veces mas clara que la vereda a la
// sombra. En un dia de sol de verdad —y en GTA V— es mas del doble. Esa
// diferencia es casi todo lo que hace que una escena "se vea de dia".
const SOL = 1.55;            // el sol pega mas fuerte...
const HEMISFERICA = 0.25;    // ...el relleno plano casi desaparece...
const CIELO = 2.8;           // ...y lo reemplaza el reflejo del cielo, que tiene direccion.

// Cuanto se inclina el recorrido del sol hacia la calle (+Z). Antes iba casi
// pegado al plano de la vereda (z=6 sobre un radio de 85) y las sombras corrian
// siempre a lo largo de la calle, nunca cruzandola.
// ⚠️ SE PROBO CON 34 Y ERA DEMASIADO: las casas de enfrente —que miran al
// local, o sea en contra del sol— quedaban a la sombra todo el dia, y sus fotos
// reales se veian barrosas. Ademas la fachada del local casi no ganaba luz,
// porque la tapa el alero de la galeria. Con 14 las sombras cruzan un poco la
// vereda y las dos veredas siguen recibiendo luz de refilon.
const INCLINACION_SOL = 14;

// ---- Sombra ---------------------------------------------------------------
// Caja del mundo que RECIBE sombra y le importa al jugador: la calle entera a
// lo largo (el campo caminable va de x=-84 a 84), desde el fondo del local
// hasta la vereda de enfrente, y hasta el alto de los techos. Lo que proyecta
// sombra desde afuera de esta caja no llega a caer adentro con luz paralela,
// asi que no hace falta cubrirlo.
const RECEPTORES = new THREE.Box3(
  new THREE.Vector3(-90, -0.5, -34),
  new THREE.Vector3(90, 26, 24),
);
// Pixeles del mapa de sombra: el lado largo va a lo largo de la calle. Son 32 MB
// de memoria de video contra 16 del de antes; a cambio cubre la calle entera,
// que antes se cortaba a los 50 m.
const MAPA_LARGO = 4096;
const MAPA_CORTO = 2048;

// ---- Reflejo del cielo -----------------------------------------------------
const ENV_ANCHO = 256;
const ENV_ALTO = 128;

// ---- Perspectiva aerea -----------------------------------------------------
// La niebla de antes era una rampa recta de 45 a 220 m: hasta los 45 m no
// hacia nada y los edificios de media distancia (60-100 m) quedaban casi igual
// de nitidos que la vereda. Una niebla EXPONENCIAL es como se ve el aire de
// verdad —y como lo hace GTA V—: limpio cerca y cada vez mas azulado y claro a
// medida que se aleja, que es lo que le da profundidad a una calle.
// Con 0,007: a 30 m 4%, a 60 m 16%, a 100 m 39%, a 150 m 67%, a 220 m 90%.
// A los 280 m (el alcance de la camara) llega al 98%: lo del fondo se disuelve
// en el horizonte en vez de cortarse.
const DENSIDAD_NIEBLA = 0.007;

// ⚠️ LOS VIDRIOS DE LOS AUTOS TIENEN QUE ESCRIBIR PROFUNDIDAD.
// La oclusion ambiental trabaja con la PROFUNDIDAD de la escena, y los vidrios
// de un GLB vienen con `depthWrite = false` (GLTFLoader se lo pone a todo lo
// transparente). Entonces la oclusion "veia" los asientos a traves de la
// ventanilla y oscurecia el vidrio con manchas que parecian barro: en el auto
// blanco se ven clarito. Se detecto sacando la misma foto con y sin oclusion
// (`?ao=0`) y ampliando: las manchas estaban SOLO con oclusion y SOLO en los
// vidrios. Escribiendo profundidad, la oclusion ve el vidrio y no lo de atras.
// No cambia como se dibuja el auto: lo de adentro es opaco y se dibuja antes.
// Se llama desde cars.js cuando termina de cargar cada modelo.
export function vidriosEscribenProfundidad(modelo) {
  if (!GRAFICOS_NUEVOS) return 0;
  let n = 0;
  modelo.traverse((o) => {
    if (!o.isMesh) return;
    for (const m of Array.isArray(o.material) ? o.material : [o.material]) {
      if (m?.transparent && !m.depthWrite) { m.depthWrite = true; n++; }
    }
  });
  return n;
}

export function crearGraficosBurela({ renderer, scene, lighting, sombras = true }) {
  if (!GRAFICOS_NUEVOS) return null;
  const { sun, hemisphere } = lighting;

  // ── 4. el asfalto (y cualquier piso grande del codigo) recibe sombra ──────
  // Solo se prende `receiveShadow`: no se agrega ni se mueve nada. El piso de
  // la vereda lo acomodo Kusher a mano y no se toca.
  let receptoresNuevos = 0;
  scene.traverse((o) => {
    if (!o.isMesh || o.receiveShadow) return;
    if (o.userData?.skipShadow || o.material?.transparent) return;
    if (!/asfalto|cordon|calzada|vereda|baldosa|escalon/i.test(o.name ?? '')) return;
    o.receiveShadow = true;
    receptoresNuevos++;
  });

  // ── perspectiva aerea ─────────────────────────────────────────────────────
  // Se reemplaza ANTES del primer cuadro: cambiar el tipo de niebla obliga a
  // recompilar los materiales, y asi pasa una sola vez durante la carga en vez
  // de trabar el juego andando. El color lo sigue poniendo `dayNightCycle`.
  const nieblaAnterior = scene.fog;
  scene.fog = new THREE.FogExp2(nieblaAnterior?.color?.getHex() ?? 0xb9d3ec, DENSIDAD_NIEBLA);

  // ── 2. reflejo pintado con el cielo de la hora ─────────────────────────────
  const pmrem = new THREE.PMREMGenerator(renderer);
  const lienzo = document.createElement('canvas');
  lienzo.width = ENV_ANCHO;
  lienzo.height = ENV_ALTO;
  const ctx = lienzo.getContext('2d');
  const texturaCielo = new THREE.CanvasTexture(lienzo);
  // ⚠️ El canvas habla sRGB y `getStyle()` devuelve sRGB: coinciden, no se
  // convierte nada a mano. Es la trampa del cielo de Burela del 09/09 al reves.
  texturaCielo.colorSpace = THREE.SRGBColorSpace;
  texturaCielo.mapping = THREE.EquirectangularReflectionMapping;
  let envActual = null;
  const envAnterior = scene.environment;

  function pintarCielo(sample) {
    const { palette } = sample;
    const cenit = palette.sky.clone().lerp(new THREE.Color(0x000000), 0.18);
    const horizonte = palette.fog.clone();
    // El rebote del piso: la vereda y el asfalto al sol devuelven luz tibia y
    // bastante apagada. Sale del color de piso de la hemisferica, que ya sigue
    // la hora.
    const piso = palette.hemisphereGround.clone().multiplyScalar(0.55);
    const pisoLejos = horizonte.clone().lerp(piso, 0.5);

    const g = ctx.createLinearGradient(0, 0, 0, ENV_ALTO);
    g.addColorStop(0.0, cenit.getStyle());
    g.addColorStop(0.42, palette.sky.getStyle());
    g.addColorStop(0.5, horizonte.getStyle());
    g.addColorStop(0.53, pisoLejos.getStyle());
    g.addColorStop(1.0, piso.getStyle());
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, ENV_ANCHO, ENV_ALTO);

    // Resplandor alrededor del sol, en la convencion de three para mapas
    // equirectangulares: u = atan2(z, x) / 2pi + 0,5 ; v = asin(y) / pi + 0,5.
    // ⚠️ NO es la misma convencion que la cupula de `burelaCielo.js` (esa sale
    // espejada, porque SphereGeometry pone x = -cos(phi)). Por eso el reflejo
    // se pinta aca desde la posicion del sol y no copiando el canvas de la
    // cupula: copiado, el brillo caia del lado opuesto del cielo.
    const astro = (sample.sunVisible ? sample.sunPosition : sample.moonPosition).clone().normalize();
    const u = Math.atan2(astro.z, astro.x) / (Math.PI * 2) + 0.5;
    const v = Math.asin(THREE.MathUtils.clamp(astro.y, -1, 1)) / Math.PI + 0.5;
    const cx = u * ENV_ANCHO;
    const cy = (1 - v) * ENV_ALTO;
    const radio = ENV_ALTO * (sample.sunVisible ? 0.34 : 0.14);
    const luz = palette.light.clone().lerp(new THREE.Color(1, 1, 1), 0.35);
    const fuerza = sample.sunVisible ? 0.5 : 0.18;
    // `getHex()` ya devuelve sRGB, que es lo que entiende el canvas.
    const hex = luz.getHex();
    const rgb = `${(hex >> 16) & 255},${(hex >> 8) & 255},${hex & 255}`;
    for (const dx of [-ENV_ANCHO, 0, ENV_ANCHO]) {   // sin corte en la costura
      const halo = ctx.createRadialGradient(cx + dx, cy, 0, cx + dx, cy, radio);
      halo.addColorStop(0, `rgba(${rgb},${fuerza})`);
      halo.addColorStop(1, `rgba(${rgb},0)`);
      ctx.fillStyle = halo;
      ctx.fillRect(cx + dx - radio, cy - radio, radio * 2, radio * 2);
    }

    texturaCielo.needsUpdate = true;
    const nuevo = pmrem.fromEquirectangular(texturaCielo);
    scene.environment = nuevo.texture;
    envActual?.dispose();
    envActual = nuevo;
  }

  // ── 1. la sombra, ajustada a la calle y orientada bien ────────────────────
  const esquinas = [];
  for (const x of [RECEPTORES.min.x, RECEPTORES.max.x]) {
    for (const y of [RECEPTORES.min.y, RECEPTORES.max.y]) {
      for (const z of [RECEPTORES.min.z, RECEPTORES.max.z]) esquinas.push(new THREE.Vector3(x, y, z));
    }
  }
  const centro = RECEPTORES.getCenter(new THREE.Vector3());
  const radioCaja = RECEPTORES.getSize(new THREE.Vector3()).length() / 2;
  const enLuz = new THREE.Vector3();
  const vista = new THREE.Matrix4();
  const desdeCentro = esquinas.map((p) => p.clone().sub(centro));
  const EJE_X = new THREE.Vector3(1, 0, 0);

  // Prueba giros del recuadro alrededor del rayo de sol y devuelve el que da
  // mas pixeles por metro en el eje PEOR (el que manda cuanto se ve la sombra
  // serruchada). Cuenta las dos formas de acostar el mapa de 4096 x 2048.
  function mejorGiro(dir) {
    const e1 = EJE_X.clone().addScaledVector(dir, -EJE_X.dot(dir)).normalize();
    const e2 = new THREE.Vector3().crossVectors(dir, e1);
    const derecha = new THREE.Vector3();
    let mejor = null;
    for (let grados = 0; grados < 180; grados += 3) {
      const a = (grados * Math.PI) / 180;
      derecha.copy(e1).multiplyScalar(Math.cos(a)).addScaledVector(e2, Math.sin(a));
      const arriba = new THREE.Vector3().crossVectors(dir, derecha);
      let rMin = Infinity, rMax = -Infinity, uMin = Infinity, uMax = -Infinity;
      for (const q of desdeCentro) {
        const r = q.dot(derecha); const u = q.dot(arriba);
        if (r < rMin) rMin = r; if (r > rMax) rMax = r;
        if (u < uMin) uMin = u; if (u > uMax) uMax = u;
      }
      const ancho = rMax - rMin, alto = uMax - uMin;
      const acostado = Math.min(MAPA_LARGO / ancho, MAPA_CORTO / alto);
      const parado = Math.min(MAPA_CORTO / ancho, MAPA_LARGO / alto);
      const densidad = Math.max(acostado, parado);
      if (!mejor || densidad > mejor.densidad) {
        mejor = { densidad, arriba, largoEnAncho: acostado >= parado };
      }
    }
    return mejor;
  }

  const ultimaDireccion = new THREE.Vector3();
  function ajustarSombra(direccion) {
    if (!sombras) return;
    // `dayNightCycle` llama cada 30 s y en ese lapso el sol se mueve un octavo
    // de grado: no vale la pena rehacer la sombra por eso. Se rehace cuando se
    // movio de verdad (unos 0,3°) o cuando Kusher cambia la hora a mano.
    if (ultimaDireccion.lengthSq() > 0 && ultimaDireccion.angleTo(direccion) < 0.005) return;
    ultimaDireccion.copy(direccion);
    // El sol se para lejos, en la direccion de la luz, mirando al centro de la
    // calle. `target` NO se agrega a la escena: el editor arma los ids por
    // posicion en el arbol y cualquier hijo nuevo corre los de todos los que
    // vienen despues. Se actualiza su matriz a mano.
    sun.target.position.copy(centro);
    sun.target.updateMatrixWorld();
    sun.position.copy(centro).addScaledVector(direccion, radioCaja + 40);
    sun.updateMatrixWorld();

    const cam = sun.shadow.camera;
    // Se elige como GIRAR el recuadro alrededor del rayo de sol para que la
    // calle entre con la mayor cantidad de pixeles por metro. Con el `up` de
    // siempre (Y) el lado largo del mapa caia a lo ancho de la vereda: ese era
    // el error de origen. Se prueban 60 giros y se queda el mejor; se hace una
    // vez cada 30 s (cuando cambia la hora), no por cuadro.
    const mejor = mejorGiro(direccion);
    cam.up.copy(mejor.arriba);
    cam.position.copy(sun.position);
    cam.lookAt(centro);
    cam.updateMatrixWorld();
    vista.copy(cam.matrixWorld).invert();

    let izq = Infinity, der = -Infinity, abajo = Infinity, arriba = -Infinity;
    let cerca = Infinity, lejos = -Infinity;
    for (const p of esquinas) {
      enLuz.copy(p).applyMatrix4(vista);
      izq = Math.min(izq, enLuz.x); der = Math.max(der, enLuz.x);
      abajo = Math.min(abajo, enLuz.y); arriba = Math.max(arriba, enLuz.y);
      cerca = Math.min(cerca, -enLuz.z); lejos = Math.max(lejos, -enLuz.z);
    }
    cam.left = izq; cam.right = der; cam.bottom = abajo; cam.top = arriba;
    // Se deja margen para atras: un edificio alto fuera de la caja igual puede
    // tapar el sol a algo que esta adentro.
    cam.near = Math.max(0.5, cerca - 40);
    cam.far = lejos + 2;
    cam.updateProjectionMatrix();

    // El lado largo del mapa va donde convenga segun el giro elegido.
    const quiero = mejor.largoEnAncho ? [MAPA_LARGO, MAPA_CORTO] : [MAPA_CORTO, MAPA_LARGO];
    if (sun.shadow.mapSize.x !== quiero[0] || sun.shadow.mapSize.y !== quiero[1]) {
      sun.shadow.mapSize.set(quiero[0], quiero[1]);
      // ⚠️ Cambiar el tamaño no alcanza: el mapa ya creado conserva el suyo.
      sun.shadow.map?.dispose();
      sun.shadow.map = null;
    }
    // Borde de sombra suave, como el de un sol real a esta distancia. El
    // filtro de three (disco de Vogel) mide el radio en pixeles del mapa.
    sun.shadow.radius = 2.2;
    // Corre la comparacion un poco hacia afuera de la superficie: sin esto la
    // vereda, que es enorme y casi paralela al sol de la tarde, se llena de
    // rayitas ("acne" de sombra).
    sun.shadow.normalBias = 0.035;
    sun.shadow.bias = -0.0002;
    // ⚠️ Hay que volver a dibujar la sombra YA. Las sombras estan congeladas
    // (`autoUpdate = false` en main.js) y si se cambia el recuadro o el tamaño
    // del mapa sin redibujar, el mapa viejo queda sin recuadro que le
    // corresponda —o directamente vacio— hasta la proxima actualizacion, que
    // puede tardar dos minutos.
    renderer.shadowMap.needsUpdate = true;
  }

  // ── adentro del local, la luz de antes ────────────────────────────────────
  // ⚠️ El interior del local esta APROBADO por Kusher. Con el relleno bajo y el
  // cielo como reflejo, adentro quedaba un poco mas frio y azulado (se ve en la
  // foto `local` de fotos-burela.mjs). Afuera eso es correcto —la sombra de la
  // calle la ilumina el cielo—, pero un local cerrado no tiene cielo arriba.
  // Entrando, las proporciones vuelven a las de siempre; saliendo, a las nuevas.
  // Se MEZCLA en ~0,6 s en vez de cambiar de golpe: cuando BOB cruza la puerta
  // la camara todavia esta afuera mirando la calle, y un salto de luz ahi se ve.
  let paletaActual = null;
  let adentro = 0;              // 0 = calle, 1 = adentro del local

  function intensidades() {
    if (!paletaActual) return;
    const p = paletaActual;
    hemisphere.intensity = p.hemisphereIntensity * THREE.MathUtils.lerp(HEMISFERICA, 1, adentro);
    scene.environmentIntensity = p.environmentIntensity * THREE.MathUtils.lerp(CIELO, 1, adentro);
  }

  /** Se llama cada cuadro. Devuelve cuanto se esta "adentro" (0..1) para el grade. */
  function seguirInterior(estaAdentro, dt) {
    const meta = estaAdentro ? 1 : 0;
    if (adentro === meta) return adentro;
    const paso = Math.min(1, dt / 0.6);
    adentro = Math.abs(meta - adentro) <= paso ? meta : adentro + Math.sign(meta - adentro) * paso;
    intensidades();
    return adentro;
  }

  const direccion = new THREE.Vector3();
  function aplicar(sample) {
    const { palette } = sample;
    paletaActual = palette;
    sun.intensity = palette.lightIntensity * SOL;
    intensidades();
    // La luz de relleno de enfrente (`burelaFrente.js`) imita el REBOTE de la
    // vereda soleada sobre las fachadas que miran en contra del sol. Si el sol
    // pega mas fuerte, el rebote tambien: se vuelve a aplicar con el sol nuevo.
    // Sin esto, esas casas perdian la hemisferica y no ganaban nada a cambio, y
    // sus fotos se veian barrosas.
    lighting.rellenoFrente?.aplicar({ ...palette, lightIntensity: palette.lightIntensity * SOL });
    pintarCielo(sample);
    direccion.copy(sample.activePosition).normalize();
    // Con la luna o el sol pegados al horizonte la luz llegaria desde abajo del
    // piso. Mismo tope que ya usaba `dayNightCycle` (y minimo de 3 sobre 45).
    if (direccion.y < 0.07) { direccion.y = 0.07; direccion.normalize(); }
    ajustarSombra(direccion);
  }

  // Inclina el recorrido del sol y la luna hacia la calle. Se aplica a la
  // MUESTRA completa, antes de pintar nada, para que el disco del sol, el
  // resplandor de la cupula y la direccion de la luz sigan coincidiendo.
  function ajustarMuestra(sample) {
    const inclinar = (v) => {
      const r = v.length();
      const w = v.clone();
      w.z = INCLINACION_SOL;
      return w.setLength(r);
    };
    const sunPosition = inclinar(sample.sunPosition);
    const moonPosition = inclinar(sample.moonPosition);
    return {
      ...sample,
      sunPosition,
      moonPosition,
      activePosition: sample.sunVisible ? sunPosition : moonPosition,
    };
  }

  function dispose() {
    envActual?.dispose();
    texturaCielo.dispose();
    pmrem.dispose();
    scene.environment = envAnterior;
    scene.fog = nieblaAnterior;
  }

  console.info(`FOURTWENTY: graficos nuevos de Burela activos (${receptoresNuevos} piso(s) ahora reciben sombra). Para ver los de antes: ?graficos=antes`);
  return { aplicar, ajustarMuestra, seguirInterior, dispose };
}
