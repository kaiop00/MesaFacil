const admin = require('firebase-admin');
const path = process.env.GOOGLE_APPLICATION_CREDENTIALS;
if (!path) { console.error('Set GOOGLE_APPLICATION_CREDENTIALS env var'); process.exit(1); }
admin.initializeApp({ credential: admin.credential.cert(require(path)) });
const db = admin.firestore();

async function main() {
  const restId = '0GQHxX4auzwrfFIcVWqR';
  const setorId = 'sem-setor';
  const printerName = 'Canon_G3010_series';

  await db.collection('restaurantes').doc(restId).collection('setoresProducao').doc(setorId).set({
    nome: 'Sem setor',
    categorias: [],
    criadoEm: admin.firestore.FieldValue.serverTimestamp(),
  }, { merge: true });

  await db.collection('restaurantes').doc(restId).collection('impressorasSetor').doc('test-printer-link').set({
    setorId,
    nome: 'Impressora teste Canon',
    printerSystemName: printerName,
    ativa: true,
    criadoEm: admin.firestore.FieldValue.serverTimestamp(),
  }, { merge: true });

  await db.collection('restaurantes').doc(restId).collection('mesas').doc('test-mesa-001').collection('pedidos').doc('test-pedido-001').set({
    status: 'PENDENTE',
    mesaNumero: 99,
    items: [
      { id: 'item1', nome: 'Café Americano', quantity: 2, price: 5.00, descricao: 'Sem açúcar', categorias: ['Bebidas'], setorId },
      { id: 'item2', nome: 'Bolo de Chocolate', quantity: 1, price: 15.00, descricao: 'Com cobertura', categorias: ['Sobremesas'], setorId }
    ],
    observacoes: 'Teste do worker de impressão QR',
    origem: 'cliente',
    criadoEm: admin.firestore.FieldValue.serverTimestamp(),
  }, { merge: true });

  console.log('✓ Configuração de teste criada');
  console.log(`REST_ID=${restId}`);
  console.log(`SETOR_ID=${setorId}`);
  console.log(`IMPRESSORA=${printerName}`);
}

main().catch(e => { console.error(e); process.exit(1); });
