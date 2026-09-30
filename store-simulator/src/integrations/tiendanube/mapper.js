// Traducción producto de la API de Tiendanube → producto del catálogo local
// (public/assets/data/productos.json). Funciones PURAS, sin fetch ni DOM:
// las usa tanto el sync de node (tools/tiendanube/sync.mjs) como cualquier
// código del navegador que lo necesite.
//
// Formato TN (docs oficiales, resources/product): los campos de texto son
// objetos multi-idioma ({ "es": "Remera", "pt": ... }), el precio vive en
// las variantes y la imagen en products.images[].src. El link de compra es
// canonical_url (la página real del producto en la tienda — NUNCA procesamos
// pagos nosotros, solo redirigimos ahí).

// "Remera" | { es: "Remera" } | { pt: ... } → string plano (prioriza español).
export function textoTN(value) {
  if (value == null) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'object') {
    return value.es ?? value.pt ?? value.en ?? Object.values(value)[0] ?? '';
  }
  return String(value);
}

// La descripción de TN viene en HTML: la pasamos a texto plano para el panel.
export function sinHtml(html) {
  return textoTN(html)
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

// El talle de una variante. En TN los atributos vienen como `values: [{es:'M'}]`
// y el nombre del atributo ("Talle", "Tamanho") vive aparte, en el producto.
// Se toma el PRIMER valor: en esta marca la unica variacion es el talle. Si
// algun dia hay color ademas de talle, hay que combinar los dos.
function talleDeVariante(v) {
  const vals = Array.isArray(v?.values) ? v.values : [];
  return vals.map((x) => textoTN(x)).filter(Boolean).join(' / ') || 'Unico';
}

// ⚠️ TRAER TODAS LAS VARIANTES, NO SOLO LA PRIMERA. Hasta el 14/09 esto se
// quedaba con `p.variants[0]`: el catalogo tenia un solo precio y NINGUN talle.
// Sin talle no se puede armar un pedido —Tiendanube cobra por variante, no por
// producto— asi que la compra era imposible por diseño y no se notaba, porque
// el boton COMPRAR solo redirigia a la tienda.
//
// ⚠️ El `stock` puede venir en null, y en TN eso significa "sin limite", NO
// cero. Tratarlo como cero deja toda la tienda marcada como agotada.
export function mapProductoTN(p, { moneda = 'ARS' } = {}) {
  const variantes = (Array.isArray(p.variants) ? p.variants : []).map((v) => ({
    variantId: v.id,
    talle: talleDeVariante(v),
    precio: v.promotional_price ?? v.price ?? '',
    // null = sin control de stock en TN. Se guarda como null, no como 0.
    stock: v.stock === null || v.stock === undefined ? null : Number(v.stock),
  }));
  const primera = variantes[0] ?? null;
  return {
    id: `tn-${p.id}`,
    productId: p.id,
    nombre: textoTN(p.name),
    descripcion: sinHtml(p.description),
    // El precio de arriba queda como referencia para mostrar "desde $X". El
    // precio que vale es el de la variante elegida, y el definitivo lo calcula
    // el servidor (regla de la seccion 7: nunca confiar en el navegador).
    precio: primera?.precio ?? '',
    moneda,
    imagen: Array.isArray(p.images) && p.images[0]?.src ? p.images[0].src : '',
    imagenes: (Array.isArray(p.images) ? p.images : []).map((i) => i.src).filter(Boolean),
    link: p.canonical_url ?? '',
    activo: p.published !== false,
    variantes,
  };
}

// ¿El producto TN pertenece a alguna de las categorías configuradas?
// `categoriaTN` acepta el ID numérico, parte del nombre sin distinguir
// mayúsculas ("hoop" matchea "Hoop Season"), y VARIAS separadas por coma o en
// una lista.
//
// ⚠️ Lo de varias hizo falta el 14/09: el piso ORIGEN lleva las dos categorías
// de la tienda, `Remeras "Origen"` (12 prendas) y `Hoodies "Origen"` (3). Con
// una sola por piso había que elegir, y quedaban tres prendas afuera.
//
// ⚠️ Ojo con el nombre parcial: "origen" matchea las DOS categorías de arriba,
// que acá viene bien, pero en otro caso puede arrastrar de más. Por ID no pasa.
export function productoEnCategoria(p, categoriaTN) {
  const lista = (Array.isArray(categoriaTN) ? categoriaTN : String(categoriaTN ?? '').split(','))
    .map((x) => String(x).trim().toLowerCase())
    .filter(Boolean);
  if (!lista.length) return false;
  const cats = Array.isArray(p.categories) ? p.categories : [];
  return cats.some((c) => lista.some((wanted) => {
    if (String(c.id) === wanted) return true;
    return textoTN(c.name).toLowerCase().includes(wanted);
  }));
}

// Reparte los productos TN en las colecciones del catálogo local:
// - colección con categoriaTN y ≥1 producto que matchee → se REEMPLAZAN sus
//   productos por los de TN (el catálogo pasa a ser espejo de la tienda).
// - colección sin categoriaTN o sin matches → queda como está (lo cargado a
//   mano sobrevive).
// Devuelve { data, resumen } sin mutar la entrada.
export function aplicarSyncTN(catalogo, productosTN, { moneda = 'ARS' } = {}) {
  const data = JSON.parse(JSON.stringify(catalogo));
  const resumen = [];
  for (const col of data.colecciones) {
    const tieneCategoria = Array.isArray(col.categoriaTN)
      ? col.categoriaTN.length > 0
      : !!String(col.categoriaTN ?? '').trim();
    if (!tieneCategoria) {
      resumen.push({ coleccion: col.id, estado: 'sin categoriaTN — se mantiene manual', cantidad: col.productos.length });
      continue;
    }
    const matches = productosTN.filter((p) => productoEnCategoria(p, col.categoriaTN));
    if (!matches.length) {
      const comoSeLlama = Array.isArray(col.categoriaTN) ? col.categoriaTN.join(', ') : col.categoriaTN;
      resumen.push({ coleccion: col.id, estado: `categoriaTN "${comoSeLlama}" sin productos en la tienda — se mantiene manual`, cantidad: col.productos.length });
      continue;
    }
    col.productos = matches.map((p) => mapProductoTN(p, { moneda }));
    resumen.push({ coleccion: col.id, estado: 'sincronizada desde Tiendanube', cantidad: col.productos.length });
  }
  data.origen = 'tiendanube';
  data.actualizado = new Date().toISOString();
  return { data, resumen };
}
