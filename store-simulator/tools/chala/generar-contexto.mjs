import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, extname, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
export const PROJECT_ROOT = resolve(HERE, '../..');
const MANUAL_PATH = resolve(PROJECT_ROOT, '../CLAUDE.md');
const WORKSPACE_RULES_PATH = resolve(PROJECT_ROOT, '../../AGENTS.md');

const TEXT_EXTENSIONS = new Set(['.js', '.mjs', '.json', '.md', '.html', '.css', '.txt']);
const ASSET_EXTENSIONS = new Set([
  '.glb', '.gltf', '.png', '.jpg', '.jpeg', '.webp', '.avif', '.hdr', '.mp3', '.m4a', '.wav', '.ogg', '.mp4', '.webm',
]);
const SKIP_DIRS = new Set(['.git', 'node_modules', 'dist', '.vite', '.cache']);
const MAX_TEXT_BYTES = 180_000;
const CHUNK_SIZE = 1_300;
const CHUNK_OVERLAP = 180;

function git(args, fallback = '') {
  try {
    return execFileSync('git', args, { cwd: PROJECT_ROOT, encoding: 'utf8' }).trim();
  } catch {
    return fallback;
  }
}

function walk(root, visitor) {
  if (!existsSync(root)) return;
  for (const entry of readdirSync(root, { withFileTypes: true })) {
    if (entry.name.startsWith('.') || SKIP_DIRS.has(entry.name)) continue;
    const absolute = resolve(root, entry.name);
    if (entry.isDirectory()) walk(absolute, visitor);
    else if (entry.isFile()) visitor(absolute);
  }
}

function safeProjectPath(path) {
  if (path === MANUAL_PATH) return '../CLAUDE.md';
  if (path === WORKSPACE_RULES_PATH) return '../../AGENTS.md';
  return relative(PROJECT_ROOT, path).replaceAll('\\', '/');
}

function cleanText(raw) {
  return raw
    .split('\n')
    .map((line) => (line.length > 700 ? '[linea extensa omitida del indice]' : line))
    .join('\n')
    .replace(/data:[^\s"']+;base64,[A-Za-z0-9+/=]+/g, '[data URL omitida]');
}

function chunkText(path, raw) {
  const text = cleanText(raw);
  const chunks = [];
  let offset = 0;
  while (offset < text.length) {
    const end = Math.min(text.length, offset + CHUNK_SIZE);
    const before = text.slice(0, offset);
    const lineStart = before.split('\n').length;
    const chunk = text.slice(offset, end).trim();
    if (chunk) {
      chunks.push({
        path,
        lineStart,
        lineEnd: lineStart + chunk.split('\n').length - 1,
        text: chunk,
      });
    }
    if (end >= text.length) break;
    offset = Math.max(offset + 1, end - CHUNK_OVERLAP);
  }
  return chunks;
}

function collectDocuments() {
  const paths = [
    resolve(PROJECT_ROOT, 'src'),
    resolve(PROJECT_ROOT, 'tools'),
    resolve(PROJECT_ROOT, 'package.json'),
    resolve(PROJECT_ROOT, 'vite.config.js'),
    MANUAL_PATH,
    WORKSPACE_RULES_PATH,
  ];
  const files = [];
  const add = (absolute) => {
    const extension = extname(absolute).toLowerCase();
    if (!TEXT_EXTENSIONS.has(extension)) return;
    const size = statSync(absolute).size;
    if (size > MAX_TEXT_BYTES) return;
    const projectPath = safeProjectPath(absolute);
    if (projectPath.startsWith('tools/chala/')) return;
    files.push({ path: projectPath, size, absolute });
  };

  for (const path of paths) {
    if (!existsSync(path)) continue;
    if (statSync(path).isDirectory()) walk(path, add);
    else add(path);
  }

  const chunks = [];
  for (const file of files) {
    try {
      chunks.push(...chunkText(file.path, readFileSync(file.absolute, 'utf8')));
    } catch {
      // Un archivo ilegible no debe impedir que la Chala abra durante el vuelo.
    }
  }
  return { files: files.map(({ path, size }) => ({ path, size })), chunks };
}

function collectAssets() {
  const assetsRoot = resolve(PROJECT_ROOT, 'public/assets');
  const assets = [];
  walk(assetsRoot, (absolute) => {
    const extension = extname(absolute).toLowerCase();
    if (!ASSET_EXTENSIONS.has(extension)) return;
    const stat = statSync(absolute);
    assets.push({
      path: safeProjectPath(absolute),
      extension: extension.slice(1),
      bytes: stat.size,
    });
  });
  return assets.sort((a, b) => a.path.localeCompare(b.path));
}

function collectProducts() {
  const path = resolve(PROJECT_ROOT, 'public/assets/data/productos.json');
  if (!existsSync(path)) return [];
  try {
    const data = JSON.parse(readFileSync(path, 'utf8'));
    return (data.colecciones ?? []).map((collection) => ({
      id: collection.id,
      nombre: collection.nombre,
      piso: collection.piso,
      cantidad: collection.productos?.length ?? 0,
      productos: (collection.productos ?? []).map((product) => ({
        id: product.id,
        nombre: product.nombre,
        productId: product.productId,
        imagen: product.imagen,
        activo: product.activo !== false,
      })),
    }));
  } catch {
    return [];
  }
}

export function generateChalaContext() {
  const documents = collectDocuments();
  const branch = git(['branch', '--show-current'], 'sin-rama');
  const commit = {
    hash: git(['rev-parse', 'HEAD']),
    short: git(['rev-parse', '--short', 'HEAD']),
    subject: git(['show', '-s', '--format=%s', 'HEAD']),
    date: git(['show', '-s', '--date=iso-strict', '--format=%cd', 'HEAD']),
  };

  const recentCommits = git([
    'log', '-20', '--date=short', '--pretty=format:%h%x09%ad%x09%an%x09%s',
  ]).split('\n').filter(Boolean).map((line) => {
    const [short, date, author, ...subject] = line.split('\t');
    return { short, date, author, subject: subject.join('\t') };
  });

  return {
    generatedAt: new Date().toISOString(),
    projectRoot: PROJECT_ROOT,
    branch,
    upstream: git(['rev-parse', '--abbrev-ref', '--symbolic-full-name', '@{upstream}'], 'sin-upstream'),
    commit,
    status: git(['status', '--short']).split('\n').filter(Boolean),
    recentCommits,
    assets: collectAssets(),
    products: collectProducts(),
    documents: documents.files,
    chunks: documents.chunks,
    limits: {
      offline: true,
      generativeModel: false,
      readOnly: true,
      explanation: 'Buscador tecnico local. No usa una API ni modifica codigo.',
    },
  };
}
