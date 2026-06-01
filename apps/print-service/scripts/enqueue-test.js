/* Script de teste: cria/enfileira um item em restaurantes/{restId}/printQueue */
async function main() {
  const path = require('path');
  const admin = require('firebase-admin');
  const fs = require('fs');

  const credPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH || process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (!credPath) {
    console.error('FIREBASE_SERVICE_ACCOUNT_PATH não definido');
    process.exit(2);
  }

  let serviceAccount;
  try {
    serviceAccount = require(credPath);
  } catch (e) {
    // try read as raw
    const raw = fs.readFileSync(credPath, 'utf8');
    serviceAccount = JSON.parse(raw);
  }

  admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
  const firestore = admin.firestore();

  // Ensure at least one restaurante exists
  const restSnap = await firestore.collection('restaurantes').limit(1).get();
  let restId;
  if (restSnap.empty) {
    const r = await firestore.collection('restaurantes').add({ nome: 'Restaurante Teste (local)', createdAt: admin.firestore.FieldValue.serverTimestamp() });
    restId = r.id;
    console.log('Criado restaurante de teste:', restId);
  } else {
    restId = restSnap.docs[0].id;
    console.log('Usando restaurante existente:', restId);
  }

  const payload = {
    tipo: 'TEST',
    ticketText: '--- TESTE DE IMPRESSAO ---\nLinha 1\nLinha 2',
    content: 'TESTE',
  };

  const docRef = await firestore.collection('restaurantes').doc(restId).collection('printQueue').add({
    tipo: 'TEST',
    status: 'PENDENTE',
    tentativas: 0,
    payload,
    criadoEm: admin.firestore.FieldValue.serverTimestamp(),
    printerSystemName: 'TEST_PRINTER',
  });

  console.log('Documento de fila criado:', docRef.id);
  process.exit(0);
}

main().catch((e) => { console.error('Erro:', e); process.exit(1); });
