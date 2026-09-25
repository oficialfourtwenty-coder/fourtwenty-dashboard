import { existsSync, readdirSync, writeFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

const AUDIO_EXTENSIONS = new Set(['.mp3', '.m4a', '.ogg', '.wav']);

const PLAYLISTS = [
  {
    id: 'luca',
    folder: 'luca',
    titulo: 'BEATS DE LUCA',
    artista: 'Luca',
  },
  {
    id: 'fer',
    folder: 'fer',
    titulo: 'ARTISTAS FOURTWENTY',
    artista: 'Fer',
  },
];

function titleFromFile(fileName) {
  const base = fileName.replace(/\.[^.]+$/, '');
  return base
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function walkAudioFiles(dir, rootDir = dir) {
  if (!existsSync(dir)) return [];
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith('.')) continue;
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...walkAudioFiles(fullPath, rootDir));
      continue;
    }
    const ext = entry.name.slice(entry.name.lastIndexOf('.')).toLowerCase();
    if (!AUDIO_EXTENSIONS.has(ext)) continue;
    out.push(relative(rootDir, fullPath).split('\\').join('/'));
  }
  return out.sort((a, b) => a.localeCompare(b, 'es', { sensitivity: 'base', numeric: true }));
}

export function buildMusicManifest({ rootDir = process.cwd(), write = true } = {}) {
  const musicDir = resolve(rootDir, 'public/assets/musica');
  const playlists = {};

  for (const playlist of PLAYLISTS) {
    const files = walkAudioFiles(join(musicDir, playlist.folder));
    playlists[playlist.id] = {
      titulo: playlist.titulo,
      temas: files.map((file) => ({
        archivo: `${playlist.folder}/${file}`,
        titulo: titleFromFile(file),
        artista: playlist.artista,
        link: '',
      })),
    };
  }

  if (write) {
    writeFileSync(
      join(musicDir, 'playlists.json'),
      `${JSON.stringify(playlists, null, 2)}\n`,
    );
  }

  return playlists;
}
