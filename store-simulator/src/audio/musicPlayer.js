// Reproductor de música del simulador. Vive FUERA de las escenas 3D (es un
// <audio> del navegador), así que la música que elegís en el auto sigue
// sonando cuando bajás, entrás al local, tomás el ascensor y recorrés los
// pisos. Los autos son solo el dial.
//
// Las playlists se cargan de public/assets/musica/playlists.json, que se genera
// automáticamente mirando las carpetas public/assets/musica/luca y /fer. Si un
// tema no está o falla, se saltea solo y no rompe nada.
//
// ⚠️ Derechos: en la playlist de Fer van artistas locales CON PERMISO. Guardar
// el permiso por escrito de cada uno (ver PLAN MAESTRO en Notion).
import { assetUrl } from '../core/assetUrl.js';

// El manifiesto es un JSON chico y parte del deploy: viaja siempre con el
// sitio. Los MP3/WAV en cambio son el bloque más pesado del proyecto y son los
// primeros candidatos a mudarse a R2 → por eso pasan por assetUrl().
const MANIFEST_URL = 'assets/musica/playlists.json';
const TRACK_BASE = 'assets/musica/';
const DEFAULT_VOLUME = 0.55;
const DUCK_VOLUME = 0.06;

function emptyPlaylist(id) {
  return { id, titulo: id.toUpperCase(), temas: [] };
}

export function createMusicPlayer() {
  const audio = new Audio();
  audio.preload = 'none';
  audio.volume = DEFAULT_VOLUME;

  let playlists = {};
  let ready = false;
  let current = { playlistId: null, index: -1 };
  let ducked = false;
  const listeners = new Set();

  function notify() {
    const state = getState();
    for (const fn of listeners) {
      try { fn(state); } catch (err) { console.warn('[music] listener falló', err); }
    }
  }

  function getPlaylist(id) {
    return playlists[id] ?? emptyPlaylist(id ?? 'sin-playlist');
  }

  function getState() {
    const list = current.playlistId ? getPlaylist(current.playlistId) : null;
    const track = list?.temas?.[current.index] ?? null;
    return {
      ready,
      playing: !audio.paused && !!track,
      playlistId: current.playlistId,
      index: current.index,
      track,
      volume: audio.volume,
      ducked,
    };
  }

  const load = fetch(MANIFEST_URL, { cache: 'no-store' })
    .then((res) => (res.ok ? res.json() : Promise.reject(new Error(`HTTP ${res.status}`))))
    .then((data) => {
      playlists = {};
      for (const [id, value] of Object.entries(data ?? {})) {
        playlists[id] = {
          id,
          titulo: value?.titulo ?? id.toUpperCase(),
          temas: Array.isArray(value?.temas) ? value.temas.filter((t) => t?.archivo) : [],
        };
      }
      ready = true;
      notify();
      return playlists;
    })
    .catch(() => {
      // sin manifest todavía: el juego funciona igual, la radio se ve vacía
      ready = true;
      notify();
      return playlists;
    });

  function play(playlistId, index = 0) {
    const list = getPlaylist(playlistId);
    const track = list.temas[index];
    if (!track) return Promise.resolve(false);
    current = { playlistId, index };
    audio.src = assetUrl(TRACK_BASE + track.archivo);
    audio.preload = 'auto';
    return audio.play()
      .then(() => { notify(); return true; })
      .catch((err) => {
        console.warn(`[music] no se pudo reproducir ${track.archivo}`, err?.message ?? err);
        notify();
        return false;
      });
  }

  function step(delta) {
    if (!current.playlistId) return Promise.resolve(false);
    const list = getPlaylist(current.playlistId);
    if (!list.temas.length) return Promise.resolve(false);
    const next = (current.index + delta + list.temas.length) % list.temas.length;
    return play(current.playlistId, next);
  }

  audio.addEventListener('ended', () => { step(1); });
  audio.addEventListener('error', () => {
    if (current.index >= 0) {
      console.warn('[music] archivo con error, salteando');
      step(1);
    }
  });
  audio.addEventListener('pause', notify);
  audio.addEventListener('play', notify);

  return {
    whenReady: () => load,
    getState,
    getPlaylist,
    play,
    next: () => step(1),
    prev: () => step(-1),
    toggle() {
      if (!current.playlistId) return Promise.resolve(false);
      if (audio.paused) return audio.play().then(() => { notify(); return true; }).catch(() => false);
      audio.pause();
      return Promise.resolve(false);
    },
    stop() {
      audio.pause();
      audio.currentTime = 0;
      notify();
    },
    setVolume(value) {
      audio.volume = Math.max(0, Math.min(1, value));
      notify();
    },
    // Los videos de piso y las intros bajan la música sin cortarla.
    duck(on) {
      if (ducked === on) return;
      ducked = on;
      audio.volume = on ? DUCK_VOLUME : DEFAULT_VOLUME;
      notify();
    },
    subscribe(fn) {
      listeners.add(fn);
      fn(getState());
      return () => listeners.delete(fn);
    },
  };
}
