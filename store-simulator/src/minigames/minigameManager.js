import './minigame.css';

export function createMinigameManager({ onOpenChange = () => {} } = {}) {
  const root = document.createElement('section');
  root.id = 'minigame-overlay';
  root.setAttribute('aria-hidden', 'true');
  root.innerHTML = `
    <div class="minigame-frame">
      <div class="minigame-stage"></div>
      <div class="minigame-result" hidden>
        <p class="minigame-result-kicker"></p>
        <h2 class="minigame-result-title"></h2>
        <strong class="minigame-discount" hidden>20% OFF</strong>
        <code class="minigame-code" hidden>DEMO-BOB20</code>
        <p class="minigame-note" hidden>Codigo de demostracion, todavia no valido.</p>
        <div class="minigame-result-actions">
          <button type="button" data-action="retry">REINTENTAR</button>
          <button type="button" data-action="exit">SALIR</button>
        </div>
      </div>
    </div>
  `;
  document.body.append(root);

  const stage = root.querySelector('.minigame-stage');
  const result = root.querySelector('.minigame-result');
  const kicker = root.querySelector('.minigame-result-kicker');
  const title = root.querySelector('.minigame-result-title');
  const discount = root.querySelector('.minigame-discount');
  const code = root.querySelector('.minigame-code');
  const note = root.querySelector('.minigame-note');
  const retry = root.querySelector('[data-action="retry"]');
  let activeGame = null;
  let gameFactory = null;
  let open = false;

  function destroyGame() {
    activeGame?.destroy?.();
    activeGame = null;
    stage.replaceChildren();
  }

  function showResult(gameResult) {
    activeGame?.pause?.();
    const won = gameResult === 'win';
    kicker.textContent = won ? 'PARTIDA COMPLETADA' : 'FIN DE LA PARTIDA';
    title.textContent = won ? 'Ganaste un descuento!' : 'Te atraparon';
    discount.hidden = !won;
    code.hidden = !won;
    note.hidden = !won;
    retry.textContent = won ? 'JUGAR DE NUEVO' : 'REINTENTAR';
    result.hidden = false;
  }

  function startGame() {
    destroyGame();
    result.hidden = true;
    activeGame = gameFactory?.();
    if (!activeGame?.mount || !activeGame?.destroy) {
      throw new Error('El minijuego debe implementar mount() y destroy().');
    }
    activeGame.mount({ container: stage, onResult: showResult });
    activeGame.start?.();
  }

  function show(factory) {
    if (open || typeof factory !== 'function') return false;
    open = true;
    gameFactory = factory;
    root.classList.add('show');
    root.setAttribute('aria-hidden', 'false');
    onOpenChange(true);
    startGame();
    return true;
  }

  function hide() {
    if (!open) return false;
    open = false;
    destroyGame();
    root.classList.remove('show');
    root.setAttribute('aria-hidden', 'true');
    result.hidden = true;
    gameFactory = null;
    onOpenChange(false);
    return true;
  }

  root.addEventListener('click', (event) => {
    const action = event.target.closest('button')?.dataset.action;
    if (action === 'retry') startGame();
    if (action === 'exit') hide();
  });
  window.addEventListener('keydown', (event) => {
    if (open && event.key === 'Escape') {
      event.preventDefault();
      hide();
    }
  });
  window.addEventListener('resize', () => activeGame?.resize?.());

  return { show, hide, isOpen: () => open };
}
