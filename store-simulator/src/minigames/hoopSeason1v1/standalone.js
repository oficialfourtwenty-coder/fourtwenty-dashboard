import { createHoopSeasonGame } from './game.js';

const game = createHoopSeasonGame();
game.mount({ container: document.getElementById('hoop-root'), onResult: () => {} });
game.start();
window.__hoopSeasonGame = game;
window.addEventListener('beforeunload', () => game.destroy(), { once: true });
