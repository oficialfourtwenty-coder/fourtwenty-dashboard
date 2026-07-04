// ═══════════════════════════════════════════════════════════════════════════
// PLANO DE LA TIENDA — editable por el dueño, sin saber programar.
// ═══════════════════════════════════════════════════════════════════════════
//
// Cada piso tiene una lista de muebles. Cambiá números, borrá líneas o
// duplicalas para agregar muebles. Guardá el archivo y el juego se
// actualiza solo (con npm run dev corriendo).
//
// COORDENADAS (el piso es de 12 x 9 metros):
//   x: de -6 (pared izquierda/oeste) a 6 (pared derecha/este)
//   z: de -4.5 (pared del frente/vidriera) a 4.5 (fondo, donde está la escalera)
//   ⚠️ la banda z > 2.3 es de las escaleras: no pongas muebles ahí
//   ⚠️ la pared oeste (x < -3) la usa la galería de cada colección
//   rot: rotación en grados (0 = mirando al fondo, 90 = mirando a la derecha)
//
// TIPOS DE MUEBLE y sus opciones:
//   { tipo: 'perchero',   x, z, ropa: 'tee'|'hoodie'|'jersey'|'bobTee' }
//   { tipo: 'estanteria', pared: 'frente'|'este', pos: <x si frente, z si este> }
//   { tipo: 'mesa',       x, z }                          (mesa con pilas dobladas)
//   { tipo: 'maniqui',    x, z, rot, remera: 0xRRGGBB, pantalon: 0xRRGGBB }
//   { tipo: 'espejo',     x, z, rot }
//   { tipo: 'probador',   z0, z1 }                        (cabina en la pared este)
//   { tipo: 'caja',       x, z }                          (mostrador con posnet)
//   { tipo: 'vendedor',   x, z, remera: 0xRRGGBB }
//   { tipo: 'cartel',     texto: '...', pared: 'frente'|'este', pos }
//   { tipo: 'riel',       pared: 'frente'|'este', pos, largo }   (riel de luces)
//   { tipo: 'display',    x, z, color: 0xRRGGBB, ropa }   (plataforma giratoria)
//
// COLORES: en formato 0xRRGGBB (como HTML pero con 0x). Ejemplos de la marca:
//   verde cazador 0x1f4d2e · bordó 0x6d1f2c · crema 0xe8dfc9 · negro 0x1c1c1c
//   naranja 0xd96b2f · dorado 0xd4af37 · marrón BOB 0x6b4a2f
// Si un mueble no dice color, usa la paleta de la colección del piso.
//
// Lo que NO está acá (y se edita en otros archivos):
//   · prendas colgadas de las paredes y ambientación temática → collections.js
//   · cancha, estatua de BOB, vitrina CULTURA, mural → world/gallery.js
//   · neones FOURTWENTY → world/signage.js

export const LAYOUT = {
  // ── PISO 1 · LOBBY ──────────────────────────────────────────────────────
  1: [
    { tipo: 'caja', x: 3.6, z: -3.3 },
    { tipo: 'vendedor', x: 3.6, z: -3.9, remera: 0x1f4d2e },
    { tipo: 'display', x: 0, z: -0.8, color: 0x1f4d2e, ropa: 'hoodie' },
    { tipo: 'perchero', x: -2.8, z: -0.3, ropa: 'tee' },
    { tipo: 'maniqui', x: -1.8, z: -3.7, rot: 0, remera: 0x1f4d2e, pantalon: 0xe8dfc9 },
    { tipo: 'maniqui', x: 1.6, z: -3.7, rot: 0, remera: 0x6d1f2c, pantalon: 0x1c1c1c },
    { tipo: 'espejo', x: -5.7, z: 0.8, rot: 90 },
  ],

  // ── PISO 2 · ORIGEN ─────────────────────────────────────────────────────
  2: [
    { tipo: 'probador', z0: 0.3, z1: 2.1 },
    { tipo: 'espejo', x: 5.7, z: -0.8, rot: -90 },
    { tipo: 'caja', x: 3.6, z: -3.3 },
    { tipo: 'vendedor', x: 3.6, z: -3.9, remera: 0x1f4d2e },
    { tipo: 'maniqui', x: 1.5, z: 1.5, rot: 180, remera: 0x1f4d2e, pantalon: 0xe8dfc9 },
    { tipo: 'riel', pared: 'frente', pos: 0.5, largo: 2.6 },
    { tipo: 'perchero', x: -0.3, z: -1.6, ropa: 'tee' },
    { tipo: 'perchero', x: 1.9, z: 0.4, ropa: 'hoodie' },
    { tipo: 'estanteria', pared: 'frente', pos: 0.4 },
    { tipo: 'estanteria', pared: 'este', pos: -3 },
    { tipo: 'cartel', texto: 'BASICS', pared: 'frente', pos: 0.4 },
    { tipo: 'riel', pared: 'este', pos: -3, largo: 1.8 },
  ],

  // ── PISO 3 · HOOP SEASON ────────────────────────────────────────────────
  3: [
    { tipo: 'probador', z0: 0.3, z1: 2.1 },
    { tipo: 'espejo', x: 5.7, z: -0.8, rot: -90 },
    { tipo: 'caja', x: 3.6, z: -3.3 },
    { tipo: 'vendedor', x: 3.6, z: -3.9, remera: 0xd96b2f },
    { tipo: 'maniqui', x: -1.5, z: 1.5, rot: 180, remera: 0xd96b2f, pantalon: 0x1c1c1c },
    { tipo: 'riel', pared: 'frente', pos: 0.5, largo: 2.6 },
    { tipo: 'perchero', x: 0.4, z: -1.6, ropa: 'jersey' },
    { tipo: 'perchero', x: 2.2, z: 0.4, ropa: 'tee' },
    { tipo: 'estanteria', pared: 'frente', pos: 0.4 },
    { tipo: 'estanteria', pared: 'este', pos: -3 },
    { tipo: 'cartel', texto: 'SNEAKERS', pared: 'frente', pos: 0.4 },
    { tipo: 'riel', pared: 'este', pos: -3, largo: 1.8 },
  ],

  // ── PISO 4 · BOB ────────────────────────────────────────────────────────
  4: [
    { tipo: 'probador', z0: 0.3, z1: 2.1 },
    { tipo: 'espejo', x: 5.7, z: -0.8, rot: -90 },
    { tipo: 'caja', x: 3.6, z: -3.3 },
    { tipo: 'vendedor', x: 3.6, z: -3.9, remera: 0xd96b2f },
    { tipo: 'maniqui', x: 1.5, z: 1.5, rot: 180, remera: 0xd96b2f, pantalon: 0x6b4a2f },
    { tipo: 'riel', pared: 'frente', pos: 0.5, largo: 2.6 },
    { tipo: 'perchero', x: 0, z: -1.6, ropa: 'bobTee' },
    { tipo: 'perchero', x: 1.9, z: 0.4, ropa: 'bobTee' },
    { tipo: 'estanteria', pared: 'frente', pos: 0.4 },
    { tipo: 'cartel', texto: 'BOB SHOP', pared: 'frente', pos: 0.4 },
    { tipo: 'riel', pared: 'este', pos: -3, largo: 1.8 },
  ],

  // ── PISO 5 · CULTURA (boutique minimalista a propósito) ─────────────────
  5: [
    { tipo: 'probador', z0: 0.3, z1: 2.1 },
    { tipo: 'espejo', x: 5.7, z: -0.8, rot: -90 },
    { tipo: 'caja', x: 3.6, z: -3.3 },
    { tipo: 'vendedor', x: 3.6, z: -3.9, remera: 0x141414 },
    { tipo: 'perchero', x: 1.2, z: -0.8, ropa: 'hoodie' },
    { tipo: 'estanteria', pared: 'este', pos: -3 },
    { tipo: 'cartel', texto: 'ARCHIVE', pared: 'este', pos: -3 },
    { tipo: 'maniqui', x: -1.5, z: 1.5, rot: 180, remera: 0xd4af37, pantalon: 0x141414 },
    { tipo: 'riel', pared: 'este', pos: -3, largo: 1.8 },
  ],
};
