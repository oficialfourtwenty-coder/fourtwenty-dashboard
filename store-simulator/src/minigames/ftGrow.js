// FT GROW (Express Grow) — minijuego del piso CULTURA.
// Diseño: Luca + Grok · Código: Google AI Studio · Adaptación: Claude Code.
// Cumple el contrato del minigameManager: mount({container, onResult}) y
// destroy() obligatorios; start/pause/resize opcionales. onResult('win'|'lose').
//
// Mecánica: una planta central crece de plantín a cogollo juntando agua, luz y
// nutrientes que caen, mientras arañas rojas drenan la salud (se aplastan con
// ESPACIO o tocándolas). Eventos periódicos (ola de calor, noche, lluvia de
// nutrientes) cambian qué conviene juntar. Gana al llegar a 100% de crecimiento
// antes de los 90 segundos.
//
// Todo el audio es sintetizado con Web Audio en el momento — no hay archivos de
// sonido que descargar. Los gráficos son 10 WebP que suman ~4 KB.
import './ftGrow.css';

const DEFAULT_CONFIG = {
  images: {
    plantStages: [
      '/assets/minigames/ft-grow/plant-1.webp',
      '/assets/minigames/ft-grow/plant-2.webp',
      '/assets/minigames/ft-grow/plant-3.webp',
      '/assets/minigames/ft-grow/bud-ready.webp'
    ],
    water: '/assets/minigames/ft-grow/water.webp',
    light: '/assets/minigames/ft-grow/light.webp',
    nutrient: '/assets/minigames/ft-grow/nutrient.webp',
    pest: '/assets/minigames/ft-grow/pest.webp',
    collector: '/assets/minigames/ft-grow/collector.webp',
    bg: '/assets/minigames/ft-grow/grow-room.webp'
  },
  settings: {
    gameDuration: 90,        // 90 seconds timer
    collectorSpeed: 520,     // pixels per second
    itemSpawnInterval: 0.85, // seconds
    pestSpawnInterval: 4.5   // seconds
  }
};

export function createFtGrowGame(userConfig = {}) {
  // Merge user config with defaults
  const CONFIG = {
    images: { ...DEFAULT_CONFIG.images, ...(userConfig.images || {}) },
    settings: { ...DEFAULT_CONFIG.settings, ...(userConfig.settings || {}) }
  };

  // State Variables
  let containerEl = null;
  let wrapperEl = null;
  let canvas = null;
  let ctx = null;
  let onResultCallback = null;

  // HUD Elements
  let growthBarFill = null;
  let healthBarFill = null;
  let timerText = null;
  let eventBanner = null;

  // Game Logic State
  let isRunning = false;
  let isPaused = false;
  let gameOver = false;
  let animFrameId = null;
  let lastTime = 0;

  let growth = 0;           // 0 to 100
  let health = 100;         // 0 to 100
  let timeLeft = CONFIG.settings.gameDuration;
  let plantStage = 0;       // 0, 1, 2, 3

  // Collector
  let collector = {
    x: 0,
    y: 0,
    width: 120,
    height: 30,
    targetX: 0
  };

  // Keys state
  const keys = { left: false, right: false, space: false };

  // Entities
  let items = [];
  let pests = [];
  let particles = [];

  // Spawners & Timers
  let itemSpawnTimer = 0;
  let pestSpawnTimer = 0;
  let eventTimer = 0;
  let activeEvent = null; // 'HEATWAVE', 'NIGHT', 'NUTRIENT_SURGE'

  // Assets storage
  const loadedImages = {};
  const audioContext = new (window.AudioContext || window.webkitAudioContext)();

  // Synthetic Audio Fallback + Web Audio Generator
  function playSound(type) {
    if (!audioContext) return;
    try {
      if (audioContext.state === 'suspended') {
        audioContext.resume();
      }
      const now = audioContext.currentTime;
      const osc = audioContext.createOscillator();
      const gain = audioContext.createGain();
      osc.connect(gain);
      gain.connect(audioContext.destination);

      if (type === 'collect') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(523, now);
        osc.frequency.exponentialRampToValueAtTime(880, now + 0.12);
        gain.gain.setValueAtTime(0.3, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.12);
        osc.start(now);
        osc.stop(now + 0.12);
      } else if (type === 'pestHit') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(300, now);
        osc.frequency.exponentialRampToValueAtTime(80, now + 0.15);
        gain.gain.setValueAtTime(0.4, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
        osc.start(now);
        osc.stop(now + 0.15);
      } else if (type === 'grow') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(400, now);
        osc.frequency.exponentialRampToValueAtTime(1050, now + 0.35);
        gain.gain.setValueAtTime(0.35, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.35);
        osc.start(now);
        osc.stop(now + 0.35);
      } else if (type === 'win') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(523, now);
        osc.frequency.setValueAtTime(659, now + 0.15);
        osc.frequency.setValueAtTime(783, now + 0.3);
        osc.frequency.setValueAtTime(1046, now + 0.45);
        gain.gain.setValueAtTime(0.4, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.7);
        osc.start(now);
        osc.stop(now + 0.7);
      } else if (type === 'lose') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(400, now);
        osc.frequency.exponentialRampToValueAtTime(100, now + 0.5);
        gain.gain.setValueAtTime(0.4, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.5);
        osc.start(now);
        osc.stop(now + 0.5);
      }
    } catch (e) {
      // Ignore audio context errors if blocked
    }
  }

  // Preload Images
  function preloadAssets() {
    const imgList = [
      ...CONFIG.images.plantStages,
      CONFIG.images.water,
      CONFIG.images.light,
      CONFIG.images.nutrient,
      CONFIG.images.pest,
      CONFIG.images.collector,
      CONFIG.images.bg
    ];

    imgList.forEach((src) => {
      const img = new Image();
      img.src = src;
      loadedImages[src] = img;
    });
  }

  // Event Handlers Setup
  function onKeyDown(e) {
    if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') keys.left = true;
    if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') keys.right = true;
    if (e.key === ' ' || e.key === 'Spacebar') {
      keys.space = true;
      squishNearbyPests();
    }
  }

  function onKeyUp(e) {
    if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') keys.left = false;
    if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') keys.right = false;
    if (e.key === ' ' || e.key === 'Spacebar') keys.space = false;
  }

  function onPointerDown(e) {
    const rect = canvas.getBoundingClientRect();
    const touchX = e.clientX - rect.left;
    const touchY = e.clientY - rect.top;

    // Check if player clicked/tapped directly on a pest
    let pestHit = false;
    for (let i = pests.length - 1; i >= 0; i--) {
      const p = pests[i];
      const dx = touchX - p.x;
      const dy = touchY - p.y;
      if (Math.sqrt(dx * dx + dy * dy) <= p.radius * 2.2) {
        spawnParticles(p.x, p.y, '#e91e63', 12);
        pests.splice(i, 1);
        playSound('pestHit');
        pestHit = true;
        break;
      }
    }

    if (!pestHit) {
      collector.targetX = touchX;
    }
  }

  function onPointerMove(e) {
    if (e.buttons === 1 || e.type === 'touchmove') {
      const rect = canvas.getBoundingClientRect();
      collector.targetX = e.clientX - rect.left;
    }
  }

  function squishNearbyPests() {
    let hitAny = false;
    for (let i = pests.length - 1; i >= 0; i--) {
      const p = pests[i];
      const dist = Math.abs(p.x - collector.x);
      if (dist < collector.width * 1.2) {
        spawnParticles(p.x, p.y, '#e91e63', 12);
        pests.splice(i, 1);
        hitAny = true;
      }
    }
    if (hitAny) playSound('pestHit');
  }

  // Auto-pause handlers
  function handleVisibilityChange() {
    if (document.hidden) {
      pause();
    }
  }

  let intersectionObserver = null;

  // Particle System
  function spawnParticles(x, y, color, count = 8) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 40 + Math.random() * 120;
      particles.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color,
        life: 0.4 + Math.random() * 0.3,
        maxLife: 0.7,
        size: 3 + Math.random() * 4
      });
    }
  }

  // Spawners
  function spawnItem() {
    const types = ['water', 'light', 'nutrient'];
    let chosenType = types[Math.floor(Math.random() * types.length)];

    if (activeEvent === 'HEATWAVE') {
      chosenType = Math.random() < 0.65 ? 'water' : 'light';
    } else if (activeEvent === 'NIGHT') {
      chosenType = Math.random() < 0.7 ? 'light' : 'water';
    } else if (activeEvent === 'NUTRIENT_SURGE') {
      chosenType = Math.random() < 0.6 ? 'nutrient' : 'water';
    }

    items.push({
      x: 30 + Math.random() * (canvas.width - 60),
      y: -30,
      type: chosenType,
      speed: 180 + Math.random() * 100,
      size: 36
    });
  }

  function spawnPest() {
    pests.push({
      x: canvas.width * 0.3 + Math.random() * (canvas.width * 0.4),
      y: canvas.height * 0.35 + Math.random() * (canvas.height * 0.25),
      vx: (Math.random() - 0.5) * 40,
      vy: (Math.random() - 0.5) * 40,
      radius: 20
    });
  }

  function updateEvents(dt) {
    eventTimer += dt;
    if (eventTimer > 18) {
      eventTimer = 0;
      const events = ['HEATWAVE', 'NIGHT', 'NUTRIENT_SURGE'];
      activeEvent = events[Math.floor(Math.random() * events.length)];
      
      let bannerText = '';
      if (activeEvent === 'HEATWAVE') bannerText = '🔥 ¡OLA DE CALOR! ¡AGARRÁ AGUA!';
      if (activeEvent === 'NIGHT') bannerText = '🌙 ¡DE NOCHE! ¡AGARRÁ LUZ!';
      if (activeEvent === 'NUTRIENT_SURGE') bannerText = '🌿 ¡LLUVIA DE NUTRIENTES!';

      eventBanner.textContent = bannerText;
      eventBanner.classList.add('active');

      setTimeout(() => {
        if (eventBanner) eventBanner.classList.remove('active');
        activeEvent = null;
      }, 7000);
    }
  }

  // Core Game Loop
  function update(dt) {
    if (gameOver || isPaused) return;

    // Timer
    timeLeft -= dt;
    if (timeLeft <= 0) {
      timeLeft = 0;
      triggerGameOver(false);
      return;
    }

    // Update Collector Position
    // Mientras se usa el teclado manda el teclado: si no, el easing del puntero
    // arrastraba la bandeja de vuelta al ultimo targetX un 24% por frame y las
    // flechas casi no movian nada.
    if (keys.left || keys.right) {
      if (keys.left) collector.x -= CONFIG.settings.collectorSpeed * dt;
      if (keys.right) collector.x += CONFIG.settings.collectorSpeed * dt;
      collector.targetX = collector.x;
    } else if (collector.targetX !== null) {
      const dx = collector.targetX - collector.x;
      collector.x += dx * Math.min(1.0, dt * 15);
    }

    // Clamp Collector
    collector.x = Math.max(collector.width / 2, Math.min(canvas.width - collector.width / 2, collector.x));

    // Spawning
    itemSpawnTimer += dt;
    const interval = activeEvent ? CONFIG.settings.itemSpawnInterval * 0.6 : CONFIG.settings.itemSpawnInterval;
    if (itemSpawnTimer >= interval) {
      itemSpawnTimer = 0;
      spawnItem();
    }

    pestSpawnTimer += dt;
    if (pestSpawnTimer >= CONFIG.settings.pestSpawnInterval) {
      pestSpawnTimer = 0;
      spawnPest();
    }

    // Update Events
    updateEvents(dt);

    // Update Items
    for (let i = items.length - 1; i >= 0; i--) {
      const item = items[i];
      item.y += item.speed * dt;

      // Check collision with collector
      const collY = collector.y - 15;
      if (
        item.y + item.size / 2 >= collY &&
        item.y - item.size / 2 <= collY + collector.height &&
        Math.abs(item.x - collector.x) < collector.width / 2 + item.size / 2
      ) {
        // Collected!
        if (item.type === 'water') {
          growth += 3.2;
          health = Math.min(100, health + 5);
          spawnParticles(item.x, item.y, '#2196f3', 8);
        } else if (item.type === 'light') {
          growth += 4.0;
          health = Math.min(100, health + 2);
          spawnParticles(item.x, item.y, '#ffeb3b', 8);
        } else if (item.type === 'nutrient') {
          growth += 6.0;
          health = Math.min(100, health + 4);
          spawnParticles(item.x, item.y, '#4caf50', 8);
        }

        playSound('collect');
        items.splice(i, 1);
        continue;
      }

      // Missed item
      if (item.y > canvas.height + 40) {
        items.splice(i, 1);
      }
    }

    // Update Pests
    for (let i = pests.length - 1; i >= 0; i--) {
      const p = pests[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;

      // Bounce around center area
      if (p.x < canvas.width * 0.2 || p.x > canvas.width * 0.8) p.vx *= -1;
      if (p.y < canvas.height * 0.25 || p.y > canvas.height * 0.65) p.vy *= -1;

      // Continuous health drain while pests are active
      health -= dt * 3.8;
    }

    // Check Stage Evolution
    const oldStage = plantStage;
    if (growth >= 75) plantStage = 3;
    else if (growth >= 50) plantStage = 2;
    else if (growth >= 25) plantStage = 1;
    else plantStage = 0;

    if (plantStage > oldStage) {
      playSound('grow');
      spawnParticles(canvas.width / 2, canvas.height * 0.55, '#8bc34a', 20);
    }

    // Clamp values
    health = Math.max(0, Math.min(100, health));
    growth = Math.min(100, growth);

    // Update HUD DOM
    if (growthBarFill) growthBarFill.style.width = `${growth.toFixed(1)}%`;
    if (healthBarFill) healthBarFill.style.width = `${health.toFixed(1)}%`;
    if (timerText) {
      const mins = Math.floor(timeLeft / 60);
      const secs = Math.floor(timeLeft % 60);
      timerText.textContent = `${mins}:${secs < 10 ? '0' : ''}${secs}`;
    }

    // Update Particles
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= dt;
      if (p.life <= 0) particles.splice(i, 1);
    }

    // Win / Lose conditions
    if (growth >= 100) {
      triggerGameOver(true);
    } else if (health <= 0) {
      triggerGameOver(false);
    }
  }

  function triggerGameOver(win) {
    if (gameOver) return;
    gameOver = true;
    isRunning = false;

    if (win) {
      playSound('win');
      spawnParticles(canvas.width / 2, canvas.height / 2, '#4caf50', 40);
      if (typeof onResultCallback === 'function') {
        onResultCallback('win');
      }
    } else {
      playSound('lose');
      if (typeof onResultCallback === 'function') {
        onResultCallback('lose');
      }
    }
  }

  function render() {
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 1. Draw Background
    const bgImg = loadedImages[CONFIG.images.bg];
    if (bgImg && bgImg.complete && bgImg.naturalWidth !== 0) {
      ctx.drawImage(bgImg, 0, 0, canvas.width, canvas.height);
    } else {
      ctx.fillStyle = '#1e182d';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    // 2. Draw Central Plant
    const plantSrc = CONFIG.images.plantStages[plantStage];
    const plantImg = loadedImages[plantSrc];
    const plantSize = Math.min(canvas.width * 0.45, canvas.height * 0.45);
    const plantX = (canvas.width - plantSize) / 2;
    const plantY = canvas.height * 0.58 - plantSize / 2;

    if (plantImg && plantImg.complete && plantImg.naturalWidth !== 0) {
      ctx.drawImage(plantImg, plantX, plantY, plantSize, plantSize);
    }

    // 3. Draw Collector
    const collImg = loadedImages[CONFIG.images.collector];
    if (collImg && collImg.complete && collImg.naturalWidth !== 0) {
      ctx.drawImage(
        collImg,
        collector.x - collector.width / 2,
        collector.y - collector.height / 2,
        collector.width,
        collector.height
      );
    } else {
      ctx.fillStyle = '#2196f3';
      ctx.fillRect(
        collector.x - collector.width / 2,
        collector.y - collector.height / 2,
        collector.width,
        collector.height
      );
    }

    // 4. Draw Items
    items.forEach((item) => {
      const src = CONFIG.images[item.type];
      const img = loadedImages[src];
      if (img && img.complete && img.naturalWidth !== 0) {
        ctx.drawImage(img, item.x - item.size / 2, item.y - item.size / 2, item.size, item.size);
      } else {
        ctx.fillStyle = item.type === 'water' ? '#2196f3' : item.type === 'light' ? '#ffeb3b' : '#4caf50';
        ctx.beginPath();
        ctx.arc(item.x, item.y, item.size / 2, 0, Math.PI * 2);
        ctx.fill();
      }
    });

    // 5. Draw Pests
    pests.forEach((pest) => {
      const pestImg = loadedImages[CONFIG.images.pest];
      if (pestImg && pestImg.complete && pestImg.naturalWidth !== 0) {
        ctx.drawImage(
          pestImg,
          pest.x - pest.radius,
          pest.y - pest.radius,
          pest.radius * 2,
          pest.radius * 2
        );
      } else {
        ctx.fillStyle = '#f44336';
        ctx.beginPath();
        ctx.arc(pest.x, pest.y, pest.radius, 0, Math.PI * 2);
        ctx.fill();
      }
    });

    // 6. Draw Particles
    particles.forEach((p) => {
      ctx.fillStyle = p.color;
      ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1.0;
    });
  }

  function loop(timestamp) {
    if (!lastTime) lastTime = timestamp;
    const dt = Math.min((timestamp - lastTime) / 1000, 0.1); // Clamp dt to max 100ms
    lastTime = timestamp;

    if (isRunning && !isPaused) {
      update(dt);
      render();
    }

    if (!gameOver) {
      animFrameId = requestAnimationFrame(loop);
    }
  }

  // Game Object Instance Methods
  return {
    mount({ container, onResult }) {
      if (!container) throw new Error('FT Grow: falta el container.');

      containerEl = container;
      onResultCallback = onResult;

      preloadAssets();

      // Create DOM Hierarchy
      wrapperEl = document.createElement('div');
      wrapperEl.className = 'ft-grow-wrapper';

      canvas = document.createElement('canvas');
      canvas.className = 'ft-grow-canvas';
      wrapperEl.appendChild(canvas);

      // HUD Overlay
      const hud = document.createElement('div');
      hud.className = 'ft-grow-hud';
      hud.innerHTML = `
        <div class="ft-grow-stat-box">
          <div class="ft-grow-stat-label">GROWTH</div>
          <div class="ft-grow-bar-bg">
            <div class="ft-grow-bar-fill growth" id="ft-growth-fill"></div>
          </div>
        </div>
        <div class="ft-grow-stat-box">
          <div class="ft-grow-timer" id="ft-timer">1:30</div>
        </div>
        <div class="ft-grow-stat-box">
          <div class="ft-grow-stat-label">HEALTH</div>
          <div class="ft-grow-bar-bg">
            <div class="ft-grow-bar-fill health" id="ft-health-fill"></div>
          </div>
        </div>
      `;
      wrapperEl.appendChild(hud);

      // Event Banner
      eventBanner = document.createElement('div');
      eventBanner.className = 'ft-grow-event-banner';
      wrapperEl.appendChild(eventBanner);

      // Controls Hint
      const controlsHint = document.createElement('div');
      controlsHint.className = 'ft-grow-controls-hint';
      controlsHint.textContent = '← → o A/D mueven la bandeja · ESPACIO o tocá la araña para aplastarla';
      wrapperEl.appendChild(controlsHint);

      containerEl.appendChild(wrapperEl);

      ctx = canvas.getContext('2d');

      // Query HUD DOM Elements
      growthBarFill = wrapperEl.querySelector('#ft-growth-fill');
      healthBarFill = wrapperEl.querySelector('#ft-health-fill');
      timerText = wrapperEl.querySelector('#ft-timer');

      // Bind Event Listeners
      window.addEventListener('keydown', onKeyDown);
      window.addEventListener('keyup', onKeyUp);
      canvas.addEventListener('pointerdown', onPointerDown);
      canvas.addEventListener('pointermove', onPointerMove);
      document.addEventListener('visibilitychange', handleVisibilityChange);

      // Intersection Observer for auto-pause when out of viewport
      if ('IntersectionObserver' in window) {
        intersectionObserver = new IntersectionObserver((entries) => {
          entries.forEach((entry) => {
            if (!entry.isIntersecting) {
              pause();
            }
          });
        }, { threshold: 0.1 });
        intersectionObserver.observe(containerEl);
      }

      // Initial Resize
      this.resize();
    },

    start() {
      growth = 0;
      health = 100;
      timeLeft = CONFIG.settings.gameDuration;
      plantStage = 0;
      items = [];
      pests = [];
      particles = [];
      gameOver = false;
      isPaused = false;
      isRunning = true;

      itemSpawnTimer = 0;
      pestSpawnTimer = 0;
      eventTimer = 0;
      activeEvent = null;

      if (eventBanner) eventBanner.classList.remove('active');

      lastTime = performance.now();
      if (animFrameId) cancelAnimationFrame(animFrameId);
      animFrameId = requestAnimationFrame(loop);
    },

    pause() {
      isPaused = true;
    },

    resume() {
      if (gameOver) return;
      isPaused = false;
      lastTime = performance.now();
    },

    resize() {
      if (!containerEl || !canvas) return;
      const width = containerEl.clientWidth || 800;
      const height = containerEl.clientHeight || 600;

      canvas.width = width;
      canvas.height = height;

      collector.width = Math.max(100, width * 0.16);
      collector.height = 28;
      collector.y = height - 45;
      if (collector.x === 0) collector.x = width / 2;
      collector.targetX = collector.x;

      render();
    },

    destroy() {
      gameOver = true;
      isRunning = false;
      isPaused = true;

      if (animFrameId) {
        cancelAnimationFrame(animFrameId);
        animFrameId = null;
      }

      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      if (canvas) {
        canvas.removeEventListener('pointerdown', onPointerDown);
        canvas.removeEventListener('pointermove', onPointerMove);
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange);

      if (intersectionObserver) {
        intersectionObserver.disconnect();
        intersectionObserver = null;
      }

      if (audioContext && audioContext.state !== 'closed') {
        audioContext.close().catch(() => {});
      }

      if (wrapperEl && wrapperEl.parentNode) {
        wrapperEl.parentNode.removeChild(wrapperEl);
      }

      containerEl = null;
      wrapperEl = null;
      canvas = null;
      ctx = null;
      items = [];
      pests = [];
      particles = [];
    }
  };
}
