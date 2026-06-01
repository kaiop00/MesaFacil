/* Usage: node check-doc.js <restId> <docId> */
async function main() {
  const admin = require('firebase-admin');
  const fs = require('fs');
  const credPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH || process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (!credPath) { console.error('FIREBASE_SERVICE_ACCOUNT_PATH não definido'); process.exit(2); }

  let serviceAccount;
  try { serviceAccount = require(credPath); } catch (e) { serviceAccount = JSON.parse(fs.readFileSync(credPath,'utf8')); }
  admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
  const firestore = admin.firestore();

  const restId = process.argv[2];
  const docId = process.argv[3];
  if (!restId || !docId) { console.error('Usage: node check-doc.js <restId> <docId>'); process.exit(2); }

  const ref = firestore.collection('restaurantes').doc(restId).collection('printQueue').doc(docId);
  const snap = await ref.get();
  if (!snap.exists) { console.log('Documento não encontrado'); process.exit(0); }
  console.log('Documento:', snap.id, snap.data());
  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
