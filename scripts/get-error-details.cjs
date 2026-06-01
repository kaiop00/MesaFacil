const admin = require('firebase-admin');
const path = process.env.GOOGLE_APPLICATION_CREDENTIALS;
if (!path) { console.error('Set GOOGLE_APPLICATION_CREDENTIALS env var'); process.exit(1); }
admin.initializeApp({ credential: admin.credential.cert(require(path)) });
const db = admin.firestore();

async function main() {
  const doc = await db.collection('restaurantes').doc('0GQHxX4auzwrfFIcVWqR').collection('printQueue').doc('nG45R5jq5zfIyf0K8Fll').get();
  
  console.log('\n=== Detalhes do Job ===');
  console.log(JSON.stringify(doc.data(), null, 2));
  
  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
