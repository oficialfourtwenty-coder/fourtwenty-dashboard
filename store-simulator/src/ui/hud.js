// HUD retro (DOM plano, sin frameworks). Fase 3 suma acá FT$ y bolsa.
export class Hud {
  constructor() {
    this.floorEl = document.getElementById('hud-floor');
    this.overlay = document.getElementById('start-overlay');
    this._lastFloor = 0;
  }

  setFloor(n, label) {
    if (n === this._lastFloor) return;
    this._lastFloor = n;
    this.floorEl.textContent = label ? `PISO ${n} · ${label}` : `PISO ${n}`;
  }

  showOverlay(show) {
    this.overlay.style.display = show ? 'flex' : 'none';
  }

  // Cartel de zona estilo GTA V: aparece al entrar a un piso y se desvanece.
  showZoneTitle(text) {
    const el = document.getElementById('zone-title');
    document.getElementById('zone-name').textContent = text;
    el.classList.add('show');
    clearTimeout(this._zoneTimer);
    this._zoneTimer = setTimeout(() => el.classList.remove('show'), 2600);
  }

  onStart(cb) {
    this.overlay.addEventListener('click', cb);
  }
}
