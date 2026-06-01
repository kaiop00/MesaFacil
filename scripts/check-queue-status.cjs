const admin = require('firebase-admin');
const path = process.env.GOOGLE_APPLICATION_CREDENTIALS;
if (!path) { console.error('Set GOOGLE_APPLICATION_CREDENTIALS env var'); process.exit(1); }
admin.initializeApp({ credential: admin.credential.cert(require(path)) });
const db = admin.firestore();

async function main() {
  const docId = process.env.DOC_ID;
  const restId = '0GQHxX4auzwrfFIcVWqR';
  if (!docId) { console.error('Set DOC_ID'); process.exit(1); }
  const snap = await db.collection('restaurantes').doc(restId).collection('printQueue').doc(docId).get();
  if (!snap.exists) {
    console.error('Queue doc not found');
    process.exit(1);
  }
  const data = snap.data();
  console.log(JSON.stringify({ id: snap.id, status: data.status, tentativas: data.tentativas, ultimoErro: data.ultimoErro || null, printerSystemName: data.printerSystemName || null, printJobId: data.printJobId || null, impressoEm: data.impressoEm || null }, null, 2));
}
main().catch(e => { console.error(e); process.exit(1); });
