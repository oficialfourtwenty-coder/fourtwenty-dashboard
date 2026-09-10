// Crea/actualiza el .env con las credenciales base de tu app de Tiendanube,
// sin que edites el archivo a mano.
//   npm run tn:setup -- APP_ID CLIENT_SECRET
// (el App ID y el Secret salen de tu app en partners.tiendanube.com)
// Después: npm run tn:token -- CODE  → agrega el token · npm run tn:sync
import { upsertEnv } from './api.mjs';

const [appId, secret] = process.argv.slice(2);
if (!appId || !secret) {
  console.error('Uso: npm run tn:setup -- APP_ID CLIENT_SECRET');
  console.error('(los dos valores salen de tu app en https://partners.tiendanube.com)');
  process.exit(1);
}

const file = upsertEnv({
  TN_CLIENT_ID: appId,
  TN_CLIENT_SECRET: secret,
  // si ya había un User-Agent no se pisa; si no, dejamos uno por defecto
  ...(process.env.TN_USER_AGENT ? { TN_USER_AGENT: process.env.TN_USER_AGENT } : {}),
});
console.log(`✔ Credenciales guardadas en ${file}`);
console.log('  (.env está en .gitignore: nunca se sube al repo)');
console.log('');
console.log('Ahora instalá la app en tu tienda para obtener el CODE:');
console.log(`  https://www.tiendanube.com/apps/${appId}/authorize`);
console.log('Al autorizar te redirige con ?code=XXXX (vence en 5 minutos). Después:');
console.log('  npm run tn:token -- XXXX');
