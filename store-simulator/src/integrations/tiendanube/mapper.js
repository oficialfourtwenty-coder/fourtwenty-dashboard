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

export function mapProductoTN(p, { moneda = 'ARS' } = {}) {
  const variante = Array.isArray(p.variants) ? p.variants[0] : null;
  return {
    id: `tn-${p.id}`,
    productId: p.id,
    nombre: textoTN(p.name),
    descripcion: sinHtml(p.description),
    precio: variante?.promotional_price ?? variante?.price ?? '',
    moneda,
    imagen: Array.isArray(p.images) && p.images[0]?.src ? p.images[0].src : '',
    link: p.canonical_url ?? '',
    activo: p.published !== false,
  };
}

// ¿El producto TN pertenece a la categoría configurada en la colección?
// `categoriaTN` acepta el ID numérico de la categoría o (más cómodo para el
// dueño) parte del nombre, sin distinguir mayúsculas: "hoop" matchea
// "Hoop Season".
export function productoEnCategoria(p, categoriaTN) {
  const wanted = String(categoriaTN ?? '').trim().toLowerCase();
  if (!wanted) return false;
  const cats = Array.isArray(p.categories) ? p.categories : [];
  return cats.some((c) => {
    if (String(c.id) === wanted) return true;
    return textoTN(c.name).toLowerCase().includes(wanted);
  });
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
    if (!String(col.categoriaTN ?? '').trim()) {
      resumen.push({ coleccion: col.id, estado: 'sin categoriaTN — se mantiene manual', cantidad: col.productos.length });
      continue;
    }
    const matches = productosTN.filter((p) => productoEnCategoria(p, col.categoriaTN));
    if (!matches.length) {
      resumen.push({ coleccion: col.id, estado: `categoriaTN "${col.categoriaTN}" sin productos en la tienda — se mantiene manual`, cantidad: col.productos.length });
      continue;
    }
    col.productos = matches.map((p) => mapProductoTN(p, { moneda }));
    resumen.push({ coleccion: col.id, estado: 'sincronizada desde Tiendanube', cantidad: col.productos.length });
  }
  data.origen = 'tiendanube';
  data.actualizado = new Date().toISOString();
  return { data, resumen };
}
