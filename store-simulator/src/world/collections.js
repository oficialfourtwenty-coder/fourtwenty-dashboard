// Una colección por piso (pedido del dueño). La planta baja (piso 1) es el
// lobby FOURTWENTY con cartelería luminosa, sin colección.
// En Fase 5 cada colección se mapea a una categoría de TiendaNube y los
// productos reales reemplazan los placeholders.
//
// FOTOS REALES: para que una prenda colgada use una foto en vez de la
// silueta dibujada, guardá el PNG (fondo transparente) en
// store-simulator/public/assets/prendas/ y anotá el nombre acá, en la
// lista `fotos` de la colección, en orden. Ejemplo:
//   fotos: ['origen_01.png', 'origen_02.png'],
// La prenda 1 usa la primera foto, la 2 la segunda… las que falten siguen
// con placeholder. No hay que tocar nada más.
export const COLLECTIONS = [
  {
    piso: 2,
    name: 'ORIGEN',
    count: 12,
    theme: 'origen',
    // paleta '92: verde cazador, bordó, crema, marrón, negro
    colors: [0x1f4d2e, 0x6d1f2c, 0xe8dfc9, 0x6b4a2f, 0x1c1c1c],
    fotos: [], // nombres de PNG en public/assets/prendas/ (ver README ahí)
  },
  {
    piso: 3,
    name: 'HOOP SEASON',
    count: 4,
    theme: 'basket',
    // cancha: naranja básquet, negro, blanco, violeta/dorado
    colors: [0xd96b2f, 0x1c1c1c, 0xf5f2ea, 0x4b2e83, 0xd4af37],
    fotos: [], // nombres de PNG en public/assets/prendas/ (ver README ahí)
  },
  {
    piso: 4,
    name: 'BOB',
    count: 0, // sin placeholders: se completa cuando subamos las fotos reales
    theme: 'bob',
    // paleta del mono: marrones, naranja, crema, verde gorra
    colors: [0x6b4a2f, 0xd96b2f, 0xe8dfc9, 0x1f4d2e, 0x3a2a1c],
    fotos: [], // nombres de PNG en public/assets/prendas/ (ver README ahí)
  },
  {
    piso: 5,
    name: 'CULTURA',
    count: 1,
    theme: 'hiphop',
    // pieza única: negro y dorado
    colors: [0x141414, 0xd4af37, 0xf5f2ea, 0x2e2a24, 0x8a6d1f],
    fotos: [], // nombres de PNG en public/assets/prendas/ (ver README ahí)
  },
];
