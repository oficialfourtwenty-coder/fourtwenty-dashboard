const environmentAssets = import.meta.glob(
  '../assets/environments/pisos/**/*',
  { eager: true, query: '?url', import: 'default' },
);

const DEFAULT_ENVIRONMENT_URL = 'assets/environments/urban-alley-01-4k.exr';
const FLOOR_FOLDERS = Object.freeze({
  1: '1-origen',
  2: '2-hoop-season',
  3: '3-cultura',
  4: '4-bob',
  5: '5-terraza',
});
const SUPPORTED_EXTENSIONS = new Set(['jpg', 'jpeg', 'png', 'webp', 'hdr', 'exr']);

function extension(path) {
  return path.split('.').pop()?.toLowerCase() ?? '';
}

function isHdr(path) {
  return ['hdr', 'exr'].includes(extension(path));
}

function imageForFolder(folder) {
  const marker = `/pisos/${folder}/`;
  const matches = Object.entries(environmentAssets)
    .filter(([path]) => path.includes(marker) && SUPPORTED_EXTENSIONS.has(extension(path)))
    .sort(([left], [right]) => left.localeCompare(right));

  if (matches.length > 1) {
    console.warn(`Esfera ${folder}: hay ${matches.length} imagenes. Se usara ${matches[0][0]}. Deja solo una.`);
  }
  if (!matches.length) return null;
  const [path, url] = matches[0];
  return { path, url, filename: path.split('/').pop() };
}

export function environmentForDestination(destinationId) {
  const folder = FLOOR_FOLDERS[Number(destinationId)];
  const selected = folder ? imageForFolder(folder) : null;
  if (!selected) {
    return {
      backgroundUrl: DEFAULT_ENVIRONMENT_URL,
      lightingUrl: DEFAULT_ENVIRONMENT_URL,
      filename: 'urban-alley-01-4k.exr',
      custom: false,
    };
  }

  return {
    backgroundUrl: selected.url,
    // Las panoramicas JPG/WebP usan la iluminacion HDR que la escena ya tiene.
    // Asi no se descarga ni decodifica un segundo entorno al entrar al piso.
    lightingUrl: isHdr(selected.path) ? selected.url : null,
    filename: selected.filename,
    custom: true,
  };
}
