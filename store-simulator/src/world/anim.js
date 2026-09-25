// Animaciones de ambiente: objetos que giran lento (plataformas de
// exhibición, prenda de la vitrina — como los displays de tienda de GTA V).
const spinners = [];

export function registerSpinner(obj, speed = 0.6) {
  spinners.push({ obj, speed });
}

export function tickAmbient(dt) {
  for (let i = spinners.length - 1; i >= 0; i--) {
    const spinner = spinners[i];
    if (!spinner.obj.parent) {
      spinners.splice(i, 1);
      continue;
    }
    spinner.obj.rotation.y += spinner.speed * dt;
  }
}
