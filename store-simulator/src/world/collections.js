// Una colección por piso (pedido del dueño). Nombres y paletas son
// placeholder editables; en Fase 5 cada colección se mapea a una categoría
// de TiendaNube y los productos reales reemplazan los volúmenes greybox.
export const COLLECTIONS = [
  {
    piso: 1,
    name: 'FT ESSENTIALS',
    // paleta '92: verde cazador, bordó, crema, marrón, negro
    colors: [0x1f4d2e, 0x6d1f2c, 0xe8dfc9, 0x6b4a2f, 0x1c1c1c],
    titles: ['FT POLO', 'FT RUGBY', 'FT CREW', 'FT CHINO', 'FT FIELD'],
  },
  {
    piso: 2,
    name: 'FT STREET',
    // referencia foto del dueño: naranja, negro, cuadros, gris, crema
    colors: [0xd96b2f, 0x1c1c1c, 0x7a2e2e, 0x9aa0a3, 0xe8dfc9],
    titles: ['FT CLASSIC', 'FT CORE', 'FT CHECK', 'FT TECH', 'FT HEAVY'],
  },
  {
    piso: 3,
    name: 'FT EXCLUSIVE',
    // exclusivas del juego (se compran con FT$): dorado, negro, blanco
    colors: [0xd4af37, 0x141414, 0xf5f2ea, 0x8a6d1f, 0x2e2a24],
    titles: ['FT GOLD', 'FT ONYX', 'FT GHOST', 'FT 420', 'FT ONE'],
  },
];
