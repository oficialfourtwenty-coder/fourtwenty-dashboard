// Canjea el authorization code de Tiendanube por el access_token definitivo.
// Uso:  npm run tn:token -- EL_CODE_DE_LA_URL
// El code aparece en la URL a la que te redirige Tiendanube al autorizar la
// app (?code=...) y vence a los 5 minutos. El token que devuelve NO vence.
import { loadEnv, exchangeCodeForToken, upsertEnv } from './api.mjs';

const code = process.argv[2];
if (!code) {
  console.error('Uso: npm run tn:token -- EL_CODE');
  console.error('(el code sale de la URL de redirección al instalar la app: ?code=...)');
  process.exit(1);
}

exchangeCodeForToken(loadEnv(), code)
  .then((data) => {
    // El token y el store id se escriben SOLOS en el .env — no editás nada.
    const file = upsertEnv({
      TN_ACCESS_TOKEN: data.access_token,
      TN_STORE_ID: data.user_id,
    });
    console.log('✔ Token obtenido y guardado en el .env automáticamente.');
    console.log(`  tienda #${data.user_id} · scope: ${data.scope ?? '—'}`);
    console.log(`  (${file})`);
    console.log('');
    console.log('Último paso: cargá la categoría de cada piso en el admin (tecla P)');
    console.log('y corré:  npm run tn:sync');
  })
  .catch((e) => {
    console.error(`✖ ${e.message}`);
    process.exit(1);
  });
