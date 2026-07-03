// HUD retro (DOM plano, sin frameworks). Fase 3 suma acá FT$ y bolsa.
export class Hud {
  constructor() {
    this.floorEl = document.getElementById('hud-floor');
    this.overlay = document.getElementById('start-overlay');
    this._lastFloor = 0;
  }

  setFloor(n) {
    if (n === this._lastFloor) return;
    this._lastFloor = n;
    this.floorEl.textContent = `PISO ${n}`;
  }

  showOverlay(show) {
    this.overlay.style.display = show ? 'flex' : 'none';
  }

  onStart(cb) {
    this.overlay.addEventListener('click', cb);
  }
}
