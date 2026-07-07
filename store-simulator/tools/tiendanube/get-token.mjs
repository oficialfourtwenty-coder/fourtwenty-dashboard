// Canjea el authorization code de Tiendanube por el access_token definitivo.
// Uso:  npm run tn:token -- EL_CODE_DE_LA_URL
// El code aparece en la URL a la que te redirige Tiendanube al autorizar la
// app (?code=...) y vence a los 5 minutos. El token que devuelve NO vence.
import { loadEnv, exchangeCodeForToken } from './api.mjs';

const code = process.argv[2];
if (!code) {
  console.error('Uso: npm run tn:token -- EL_CODE');
  console.error('(el code sale de la URL de redirección al instalar la app: ?code=...)');
  process.exit(1);
}

exchangeCodeForToken(loadEnv(), code)
  .then((data) => {
    console.log('✔ Token obtenido. Pegá estas dos líneas en tu .env:');
    console.log('');
    console.log(`TN_ACCESS_TOKEN=${data.access_token}`);
    console.log(`TN_STORE_ID=${data.user_id}`);
    console.log('');
    console.log(`(scope autorizado: ${data.scope ?? '—'})`);
    console.log('Después corré: npm run tn:sync');
  })
  .catch((e) => {
    console.error(`✖ ${e.message}`);
    process.exit(1);
  });
