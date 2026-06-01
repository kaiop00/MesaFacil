const admin = require('firebase-admin');
const path = process.env.GOOGLE_APPLICATION_CREDENTIALS;
if (!path) { console.error('Set GOOGLE_APPLICATION_CREDENTIALS env var'); process.exit(1); }
admin.initializeApp({ credential: admin.credential.cert(require(path)) });
const db = admin.firestore();

async function main() {
  const restId = '0GQHxX4auzwrfFIcVWqR';
  const rest = await db.collection('restaurantes').doc(restId).get();
  
  console.log('\n=== Configuração do Restaurante ===');
  console.log(JSON.stringify(rest.data(), null, 2));
  
  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
