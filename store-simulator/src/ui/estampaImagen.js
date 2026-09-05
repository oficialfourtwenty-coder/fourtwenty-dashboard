// Procesado de la imagen de una estampa. Lo comparten el EDITOR DE PRENDA
// (click derecho sobre una prenda) y el PANEL DE ADMINISTRACION (tecla P), asi
// una estampa se ve igual venga de donde venga.
//
// Hace dos cosas, en este orden:
//   1. Le quita el fondo plano (el blanco tipico de un archivo de diseño).
//   2. Recorta el margen vacio que queda alrededor.
// El paso 2 es el que hace que la estampa se vea GRANDE: un archivo de diseño
// trae el logo chico en medio de un lienzo grande, y sin recortar lo que se
// estira es el margen, no el dibujo.

// QUITAR EL FONDO
//
// Se rellena desde los BORDES hacia adentro, no se borra "todo lo que sea
// blanco". La diferencia importa: un logo negro con letras blancas adentro
// perderia las letras con la version simple. Partiendo del borde solo se come
// el fondo que rodea al diseño, y cualquier blanco encerrado por tinta queda.
//
// El color de fondo se toma de las cuatro esquinas. Si las esquinas no
// coinciden entre si, la imagen no tiene un fondo plano (es una foto) y no se
// toca nada: mejor dejarla entera que agujerearla.
export function quitarFondoPlano(ctx, W, H, tolerancia) {
  const imagen = ctx.getImageData(0, 0, W, H);
  const d = imagen.data;
  const parecido = (a, b) => Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) + Math.abs(a[2] - b[2]);

  // Color de fondo = el MAS REPETIDO de todo el marco de la imagen, no el de
  // una esquina. Un JPG comprimido tiene la esquina con artefactos y el diseño
  // puede tocar un borde; mirando el marco entero eso deja de importar.
  const marco = [];
  const paso = Math.max(1, Math.round(Math.min(W, H) / 120));
  for (let x = 0; x < W; x += paso) { marco.push((0 * W + x) * 4, ((H - 1) * W + x) * 4); }
  for (let y = 0; y < H; y += paso) { marco.push((y * W + 0) * 4, (y * W + (W - 1)) * 4); }

  if (marco.every((i) => d[i + 3] < 8)) {
    return { quitado: false, motivo: 'ya tenia el fondo recortado' };
  }

  // Se agrupan los colores del marco en cubos de 16 y gana el cubo mas poblado.
  const cubos = new Map();
  for (const i of marco) {
    if (d[i + 3] < 8) continue;
    const clave = `${d[i] >> 4}_${d[i + 1] >> 4}_${d[i + 2] >> 4}`;
    const c = cubos.get(clave) ?? { n: 0, r: 0, g: 0, b: 0 };
    c.n++; c.r += d[i]; c.g += d[i + 1]; c.b += d[i + 2];
    cubos.set(clave, c);
  }
  let ganador = null;
  for (const c of cubos.values()) if (!ganador || c.n > ganador.n) ganador = c;
  if (!ganador) return { quitado: false, motivo: 'no se pudo leer el borde' };
  const base = [ganador.r / ganador.n, ganador.g / ganador.n, ganador.b / ganador.n];

  // Si el color dominante no cubre ni la mitad del marco, no hay fondo plano:
  // es una foto y recortarla la dejaria agujereada.
  const validos = marco.filter((i) => d[i + 3] >= 8);
  const cerca = validos.filter((i) => parecido([d[i], d[i + 1], d[i + 2]], base) <= tolerancia * 3).length;
  if (cerca / Math.max(1, validos.length) < 0.5) {
    return { quitado: false, motivo: 'la imagen no tiene un fondo plano (parece una foto)' };
  }

  const umbral = tolerancia * 3; // suma de las 3 diferencias de canal
  const visto = new Uint8Array(W * H);
  const pila = [];
  for (let x = 0; x < W; x++) { pila.push(x, 0, x, H - 1); }
  for (let y = 0; y < H; y++) { pila.push(0, y, W - 1, y); }

  let borrados = 0;
  while (pila.length) {
    const y = pila.pop();
    const x = pila.pop();
    if (x < 0 || y < 0 || x >= W || y >= H) continue;
    const p = y * W + x;
    if (visto[p]) continue;
    visto[p] = 1;
    const i = p * 4;
    if (d[i + 3] < 8) continue; // ya transparente
    if (parecido([d[i], d[i + 1], d[i + 2]], base) > umbral) continue;
    d[i + 3] = 0;
    borrados++;
    pila.push(x + 1, y, x - 1, y, x, y + 1, x, y - 1);
  }

  // Se come 1 pixel del borde en vez de suavizarlo. El material de la estampa
  // usa alphaTest sin mezcla alfa (ver garmentPrints.js): un pixel a medio alfa
  // ahi se dibuja OPACO, o sea que un borde suavizado dejaba justamente un halo
  // blanco alrededor del diseño. Erosionar no deja halo.
  const copiaAlfa = new Uint8ClampedArray(W * H);
  for (let p = 0; p < W * H; p++) copiaAlfa[p] = d[p * 4 + 3];
  for (let y = 1; y < H - 1; y++) {
    for (let x = 1; x < W - 1; x++) {
      const p = y * W + x;
      if (copiaAlfa[p] < 8) continue;
      const vecinoVacio = copiaAlfa[p - 1] < 8 || copiaAlfa[p + 1] < 8
        || copiaAlfa[p - W] < 8 || copiaAlfa[p + W] < 8;
      if (vecinoVacio) d[p * 4 + 3] = 0;
    }
  }

  ctx.putImageData(imagen, 0, 0);
  return { quitado: borrados > 0, borrados, motivo: '' };
}

/**
 * Caja que ocupa realmente el diseño, ignorando el margen vacio.
 *
 * ESTO ES LO QUE HACE QUE LA ESTAMPA SE VEA GRANDE. Un archivo de diseño suele
 * venir con el logo chico en el medio de un lienzo grande: si se apoya tal cual,
 * la estampa entra entera pero el dibujo ocupa un cuarto del pecho y no hay
 * control que lo agrande, porque lo que se estira es el margen vacio.
 */
function cajaDelDiseño(ctx, W, H) {
  const d = ctx.getImageData(0, 0, W, H).data;
  let x0 = W, y0 = H, x1 = -1, y1 = -1;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (d[(y * W + x) * 4 + 3] < 8) continue;
      if (x < x0) x0 = x;
      if (x > x1) x1 = x;
      if (y < y0) y0 = y;
      if (y > y1) y1 = y;
    }
  }
  if (x1 < 0) return null;             // no quedo nada visible
  // 1% de aire alrededor para que el recorte no muerda el trazo del borde
  const aire = Math.round(Math.max(W, H) * 0.01);
  return {
    x: Math.max(0, x0 - aire),
    y: Math.max(0, y0 - aire),
    w: Math.min(W, x1 + aire) - Math.max(0, x0 - aire) + 1,
    h: Math.min(H, y1 + aire) - Math.max(0, y0 - aire) + 1,
  };
}

// PNG y no JPEG: una estampa necesita fondo transparente, y el JPEG no tiene
// canal alfa — el logo llegaria con un rectangulo blanco atras. El precio es
// que pesa mas, por eso se limita a 1024 px.
/**
 * Mide cuanta transparencia REAL trae la imagen.
 * Sirve para decidir sola si hay que quitarle el fondo: un PNG exportado con
 * fondo transparente ya viene recortado y pasarle el quitador solo puede
 * arruinarlo.
 */
function proporcionTransparente(ctx, W, H) {
  const d = ctx.getImageData(0, 0, W, H).data;
  let transparentes = 0;
  let total = 0;
  // De a saltos: contar 4 millones de pixeles uno por uno no aporta precision.
  const paso = Math.max(1, Math.round(Math.sqrt((W * H) / 40000)));
  for (let y = 0; y < H; y += paso) {
    for (let x = 0; x < W; x += paso) {
      total++;
      if (d[(y * W + x) * 4 + 3] < 16) transparentes++;
    }
  }
  return total ? transparentes / total : 0;
}

/**
 * `quitarFondo` acepta:
 *   'auto'  (por defecto) — lo decide sola: si la imagen ya trae transparencia
 *                           NO la toca; si es opaca, le saca el fondo plano.
 *   true    — forzar el quitado
 *   false   — no tocar nada
 *
 * ⚠️ El default era `true`, y ese era el bug que reporto Kusher: sus logos son
 * PNG con fondo ya transparente, y el quitador les buscaba igual un "color de
 * fondo" en el marco. Si el diseño tocaba un borde, o tenia sombra suave, el
 * relleno se metia adentro del logo y se lo comia. Un PNG recortado no necesita
 * que nadie le recorte nada.
 */
export function leerImagen(file, { maxLado = 1024, quitarFondo = 'auto', tolerancia = 45 } = {}) {
  return new Promise((resolve, reject) => {
    const lector = new FileReader();
    lector.onerror = () => reject(new Error('no se pudo leer el archivo'));
    lector.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('el archivo no es una imagen valida'));
      img.onload = () => {
        const escala = Math.min(1, maxLado / Math.max(img.width, img.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(img.width * escala));
        canvas.height = Math.max(1, Math.round(img.height * escala));
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        const transparencia = proporcionTransparente(ctx, canvas.width, canvas.height);
        // 3% ya alcanza: un logo recortado siempre deja mas margen vacio que eso,
        // y una foto opaca no llega ni cerca.
        const yaRecortada = transparencia > 0.03;
        const hayQueQuitar = quitarFondo === 'auto' ? !yaRecortada : quitarFondo === true;
        const recorte = hayQueQuitar
          ? quitarFondoPlano(ctx, canvas.width, canvas.height, tolerancia)
          : { quitado: false, motivo: yaRecortada ? 'el PNG ya venia recortado' : '' };
        recorte.yaRecortada = yaRecortada;

        // Recorte del margen vacio. Solo tiene sentido si algo quedo
        // transparente: en una imagen opaca de punta a punta la caja es la
        // imagen entera y no cambia nada.
        let salida = canvas;
        let margen = null;
        const caja = cajaDelDiseño(ctx, canvas.width, canvas.height);
        if (caja && (caja.w < canvas.width * 0.98 || caja.h < canvas.height * 0.98)) {
          const recortada = document.createElement('canvas');
          recortada.width = caja.w;
          recortada.height = caja.h;
          recortada.getContext('2d')
            .drawImage(canvas, caja.x, caja.y, caja.w, caja.h, 0, 0, caja.w, caja.h);
          salida = recortada;
          margen = Math.round((1 - (caja.w * caja.h) / (canvas.width * canvas.height)) * 100);
        }

        resolve({
          url: salida.toDataURL('image/png'),
          // La proporcion que importa es la de lo RECORTADO, no la del archivo:
          // es la que hace que la estampa no entre deformada.
          ancho: salida.width,
          alto: salida.height,
          recorte,
          margen,
        });
      };
      img.src = lector.result;
    };
    lector.readAsDataURL(file);
  });
}

