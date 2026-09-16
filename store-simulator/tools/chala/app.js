const MEMORY_KEY = 'fourtwenty-chala-memories-v1';
const STOP_WORDS = new Set([
  'a', 'al', 'algo', 'como', 'con', 'cual', 'cuando', 'de', 'del', 'donde', 'el', 'en', 'es', 'esta', 'este', 'la', 'las',
  'lo', 'los', 'me', 'para', 'por', 'que', 'se', 'sobre', 'un', 'una', 'y', 'ya', 'hay', 'quiero', 'podes', 'podria',
]);

const elements = {
  branch: document.querySelector('#branch'),
  commit: document.querySelector('#commit'),
  generated: document.querySelector('#generated'),
  messages: document.querySelector('#messages'),
  form: document.querySelector('#ask-form'),
  question: document.querySelector('#question'),
  memoryList: document.querySelector('#memory-list'),
  refresh: document.querySelector('#refresh'),
  exportMemories: document.querySelector('#export-memories'),
  clearMemories: document.querySelector('#clear-memories'),
};

let context = null;
let memories = loadMemories();

function normalize(value) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function tokens(value) {
  return [...new Set(normalize(value).split(/[^a-z0-9_.:/-]+/).filter((token) => token.length > 1 && !STOP_WORDS.has(token)))];
}

function loadMemories() {
  try {
    const parsed = JSON.parse(localStorage.getItem(MEMORY_KEY) || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveMemories() {
  localStorage.setItem(MEMORY_KEY, JSON.stringify(memories));
  renderMemories();
}

function renderMemories() {
  elements.memoryList.replaceChildren();
  if (!memories.length) {
    const empty = document.createElement('p');
    empty.className = 'memory-empty';
    empty.textContent = 'Todavía no guardé nada. Escribí “recordá que…” para crear el primer apunte.';
    elements.memoryList.append(empty);
    return;
  }
  for (const memory of [...memories].reverse()) {
    const item = document.createElement('article');
    item.className = 'memory-item';
    const text = document.createElement('p');
    text.textContent = memory.text;
    const time = document.createElement('time');
    time.dateTime = memory.createdAt;
    time.textContent = new Date(memory.createdAt).toLocaleString('es-AR');
    const remove = document.createElement('button');
    remove.type = 'button';
    remove.title = 'Borrar recuerdo';
    remove.textContent = '×';
    remove.addEventListener('click', () => {
      memories = memories.filter((entry) => entry.id !== memory.id);
      saveMemories();
    });
    item.append(text, time, remove);
    elements.memoryList.append(item);
  }
}

function addMessage(role, text, sources = []) {
  const article = document.createElement('article');
  article.className = `message ${role}`;
  const speaker = document.createElement('div');
  speaker.className = 'speaker';
  speaker.textContent = role === 'user' ? 'Kusher / Fer' : 'Chala';
  const bubble = document.createElement('div');
  bubble.className = 'bubble';
  const paragraph = document.createElement('p');
  paragraph.textContent = text;
  bubble.append(paragraph);
  if (sources.length) {
    const list = document.createElement('ul');
    list.className = 'sources';
    for (const source of sources) {
      const item = document.createElement('li');
      item.textContent = source;
      list.append(item);
    }
    bubble.append(list);
  }
  article.append(speaker, bubble);
  elements.messages.append(article);
  elements.messages.scrollTop = elements.messages.scrollHeight;
}

function scoreText(queryTokens, text, path = '') {
  const normalizedText = normalize(text);
  const normalizedPath = normalize(path);
  let score = 0;
  for (const token of queryTokens) {
    if (normalizedPath.includes(token)) score += 8;
    if (normalizedText.includes(token)) score += 2;
  }
  if (queryTokens.length && queryTokens.every((token) => normalizedText.includes(token) || normalizedPath.includes(token))) score += 6;
  return score;
}

function searchDocuments(query, limit = 6) {
  const queryTokens = tokens(query);
  if (!queryTokens.length) return [];
  return context.chunks
    .map((chunk) => ({ ...chunk, score: scoreText(queryTokens, chunk.text, chunk.path) }))
    .filter((chunk) => chunk.score > 0)
    .sort((a, b) => b.score - a.score || a.path.localeCompare(b.path))
    .slice(0, limit);
}

function searchAssets(query, extension = null, limit = 12) {
  const queryTokens = tokens(query);
  return context.assets
    .filter((asset) => !extension || asset.extension === extension)
    .map((asset) => ({ ...asset, score: scoreText(queryTokens, '', asset.path) }))
    .filter((asset) => asset.score > 0 || (!queryTokens.length && extension))
    .sort((a, b) => b.score - a.score || a.path.localeCompare(b.path))
    .slice(0, limit);
}

function formatBytes(bytes) {
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function answerVersion() {
  const dirty = context.status.length
    ? `\n\nHay ${context.status.length} cambio(s) local(es) sin integrar:\n${context.status.slice(0, 10).map((line) => `• ${line}`).join('\n')}`
    : '\n\nLa copia local no tiene cambios pendientes.';
  return {
    text: `Estamos en la rama ${context.branch}.\nCommit actual: ${context.commit.short} - ${context.commit.subject}.\nSeguimiento remoto: ${context.upstream}.${dirty}`,
    sources: ['Git local: branch, HEAD y status'],
  };
}

function answerChanges() {
  const commits = context.recentCommits.slice(0, 10).map((commit) => `• ${commit.short} · ${commit.date} · ${commit.subject}`).join('\n');
  const pending = context.status.length ? `\n\nCambios locales:\n${context.status.map((line) => `• ${line}`).join('\n')}` : '';
  return { text: `Últimas modificaciones registradas:\n${commits}${pending}`, sources: ['git log -10', 'git status --short'] };
}

function answerMemories() {
  if (!memories.length) return { text: 'No tengo recuerdos guardados todavía. Escribí “recordá que…” seguido del apunte.' };
  return {
    text: `Tengo ${memories.length} recuerdo(s):\n${memories.map((memory, index) => `${index + 1}. ${memory.text}`).join('\n')}`,
    sources: ['Memoria local de este navegador'],
  };
}

function answerAssets(query) {
  const normalized = normalize(query);
  const extension = normalized.includes('glb') || normalized.includes('modelo') ? 'glb' : null;
  const cleaned = query.replace(/\b(busca|buscame|archivo|archivos|modelo|modelos|glb|donde|esta|estan|de|del)\b/gi, ' ');
  const matches = searchAssets(cleaned, extension, 14);
  if (!matches.length) {
    const count = extension ? context.assets.filter((asset) => asset.extension === extension).length : context.assets.length;
    return { text: `No encontré una coincidencia clara. El índice local contiene ${count} ${extension ? 'modelos GLB' : 'assets'}. Probá usando parte del nombre del archivo.` };
  }
  return {
    text: `Encontré ${matches.length} coincidencia(s):\n${matches.map((asset) => `• ${asset.path} (${formatBytes(asset.bytes)})`).join('\n')}`,
    sources: matches.map((asset) => asset.path),
  };
}

function answerSearch(query) {
  const matches = searchDocuments(query);
  const relatedMemories = memories
    .map((memory) => ({ ...memory, score: scoreText(tokens(query), memory.text) }))
    .filter((memory) => memory.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);

  if (!matches.length && !relatedMemories.length) {
    return {
      text: 'No encontré evidencia suficiente en la copia local. No voy a inventar la respuesta. Probá con el nombre exacto del piso, archivo, GLB o función.',
    };
  }

  const parts = [];
  if (matches.length) {
    parts.push('Esto es lo más relevante que encontré:');
    for (const match of matches) {
      const compact = match.text.replace(/\s+/g, ' ').trim().slice(0, 420);
      parts.push(`\n• ${compact}${match.text.length > 420 ? '…' : ''}`);
    }
  }
  if (relatedMemories.length) {
    parts.push(`\nRecuerdos relacionados:\n${relatedMemories.map((memory) => `• ${memory.text}`).join('\n')}`);
  }
  return {
    text: parts.join('\n'),
    sources: matches.map((match) => `${match.path}:${match.lineStart}`),
  };
}

function answerQuestion(question) {
  const normalized = normalize(question).trim();
  const rememberMatch = question.match(/^\s*(?:recorda|recordá|recuerda|anota|anotá|guarda|guardá)(?:\s+que)?\s+(.+)/i);
  if (rememberMatch) {
    const text = rememberMatch[1].trim();
    memories.push({ id: crypto.randomUUID(), text, createdAt: new Date().toISOString() });
    saveMemories();
    return { text: `Quedó guardado en esta Mac: “${text}”. Podés pedirme que liste los recuerdos o exportarlos desde la columna izquierda.` };
  }
  if (/\b(rama|version|versión|commit actual|donde estamos)\b/.test(normalized)) return answerVersion();
  if (/\b(ultim[oa]s?|cambios|modificaciones|commits|que hizo)\b/.test(normalized)) return answerChanges();
  if (/\b(recuerd|memoria|apuntes|pendientes)\b/.test(normalized)) return answerMemories();
  if (/\b(glb|gltf|modelo|asset|textura|imagen|audio)\b/.test(normalized)) return answerAssets(question);
  if (/\b(ayuda|que podes|que sabes|comandos)\b/.test(normalized)) {
    return {
      text: 'Puedo consultar rama y commit, listar cambios, encontrar archivos o GLB, buscar reglas y decisiones en el código y CLAUDE.md, y guardar recuerdos. Soy una herramienta offline de búsqueda: no uso un modelo generativo y no modifico el proyecto.',
    };
  }
  return answerSearch(question);
}

async function loadContext() {
  const response = await fetch('/api/contexto', { cache: 'no-store' });
  if (!response.ok) throw new Error('No se pudo leer el contexto local.');
  context = await response.json();
  elements.branch.textContent = context.branch;
  elements.commit.textContent = `${context.commit.short} · ${context.commit.subject}`;
  elements.generated.textContent = new Date(context.generatedAt).toLocaleString('es-AR');
}

elements.form.addEventListener('submit', (event) => {
  event.preventDefault();
  const question = elements.question.value.trim();
  if (!question || !context) return;
  addMessage('user', question);
  elements.question.value = '';
  const answer = answerQuestion(question);
  window.setTimeout(() => addMessage('chala', answer.text, answer.sources), 80);
});

elements.question.addEventListener('keydown', (event) => {
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault();
    elements.form.requestSubmit();
  }
});

document.querySelectorAll('[data-prompt]').forEach((button) => {
  button.addEventListener('click', () => {
    elements.question.value = button.dataset.prompt;
    elements.form.requestSubmit();
  });
});

elements.refresh.addEventListener('click', async () => {
  elements.refresh.disabled = true;
  try {
    await fetch('/api/actualizar', { method: 'POST' });
    await loadContext();
    addMessage('chala', `Contexto actualizado: ${context.branch} @ ${context.commit.short}.`);
  } catch (error) {
    addMessage('chala', `No pude actualizar el contexto: ${error.message}`);
  } finally {
    elements.refresh.disabled = false;
  }
});

elements.exportMemories.addEventListener('click', () => {
  const blob = new Blob([JSON.stringify({ exportedAt: new Date().toISOString(), memories }, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'recuerdos-chala.json';
  link.click();
  URL.revokeObjectURL(url);
});

elements.clearMemories.addEventListener('click', () => {
  if (!memories.length || !window.confirm('¿Borrar todos los recuerdos locales de la Chala?')) return;
  memories = [];
  saveMemories();
});

renderMemories();
try {
  await loadContext();
  addMessage(
    'chala',
    `Estoy lista y funcionando sin Internet. Leí la rama ${context.branch}, ${context.recentCommits.length} commits recientes, ${context.assets.length} assets y ${context.chunks.length} fragmentos técnicos.\n\nNo soy todavía un modelo como ChatGPT: busco evidencia local, cito archivos y no invento cuando no encuentro algo.`,
    ['Git local', '../CLAUDE.md', 'src/', 'tools/', 'public/assets/'],
  );
} catch (error) {
  addMessage('chala', `No pude iniciar: ${error.message}`);
}
