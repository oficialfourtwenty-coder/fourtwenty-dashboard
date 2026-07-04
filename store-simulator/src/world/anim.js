// Animaciones de ambiente: objetos que giran lento (plataformas de
// exhibición, prenda de la vitrina — como los displays de tienda de GTA V).
const spinners = [];

export function registerSpinner(obj, speed = 0.6) {
  spinners.push({ obj, speed });
}

export function tickAmbient(dt) {
  for (const s of spinners) s.obj.rotation.y += s.speed * dt;
}
