import { execFile, spawn } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const children = [
  spawn(npm, ['run', 'avion'], { cwd: ROOT, stdio: 'inherit' }),
  spawn(process.execPath, ['tools/chala/server.mjs'], { cwd: ROOT, stdio: 'inherit' }),
];

let stopping = false;
function stop(code = 0) {
  if (stopping) return;
  stopping = true;
  for (const child of children) child.kill('SIGTERM');
  setTimeout(() => process.exit(code), 250);
}

for (const child of children) {
  child.on('exit', (code, signal) => {
    if (!stopping && code && signal !== 'SIGTERM') stop(code);
  });
}
process.on('SIGINT', () => stop(0));
process.on('SIGTERM', () => stop(0));

async function waitFor(url) {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    try {
      const response = await fetch(url);
      if (response.ok) return true;
    } catch {
      // Los servidores todavia estan arrancando.
    }
    await new Promise((resolveWait) => setTimeout(resolveWait, 250));
  }
  return false;
}

const [simulatorReady, chalaReady] = await Promise.all([
  waitFor('http://127.0.0.1:5202/'),
  waitFor('http://127.0.0.1:5203/'),
]);

if (process.platform === 'darwin') {
  if (simulatorReady) execFile('open', ['http://127.0.0.1:5202/']);
  if (chalaReady) execFile('open', ['http://127.0.0.1:5203/']);
}

console.log('');
console.log('VUELO listo:');
console.log('  Simulador  http://127.0.0.1:5202/');
console.log('  Chala      http://127.0.0.1:5203/');
console.log('  Ctrl+C cierra ambos.');
