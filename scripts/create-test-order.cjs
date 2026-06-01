const admin = require('firebase-admin');
const path = process.env.GOOGLE_APPLICATION_CREDENTIALS;
if (!path) { console.error('Set GOOGLE_APPLICATION_CREDENTIALS env var'); process.exit(1); }
admin.initializeApp({ credential: admin.credential.cert(require(path)) });
const db = admin.firestore();

async function main() {
  const restId = '0GQHxX4auzwrfFIcVWqR';
  const mesaId = 'test-mesa-001';
  const pedidoId = 'test-pedido-001';
  
  // Criar mesa
  await db.collection('restaurantes').doc(restId).collection('mesas').doc(mesaId).set({
    numero: 99,
    criado: admin.firestore.FieldValue.serverTimestamp()
  });
  
  // Criar pedido
  await db.collection('restaurantes').doc(restId).collection('mesas').doc(mesaId).collection('pedidos').doc(pedidoId).set({
    status: 'PENDENTE',
    mesaNumero: 99,
    items: [
      { id: 'item1', nome: 'Café Americano', quantity: 2, price: 5.00, descricao: 'Sem açúcar', categorias: ['Bebidas'] },
      { id: 'item2', nome: 'Bolo de Chocolate', quantity: 1, price: 15.00, descricao: 'Com cobertura', categorias: ['Sobremesas'] }
    ],
    observacoes: 'Teste do worker de impressão QR',
    origem: 'QR',
    criado: admin.firestore.FieldValue.serverTimestamp()
  });

  console.log(`✓ Pedido de teste criado:`);
  console.log(`REST_ID=${restId}`);
  console.log(`MESA_ID=${mesaId}`);
  console.log(`PEDIDO_ID=${pedidoId}`);
  console.log(`\nEnfileirar com:`);
  console.log(`REST_ID=${restId} MESA_ID=${mesaId} PEDIDO_ID=${pedidoId} node scripts/enqueueSpecificPedido.cjs`);
  process.exit(0);
}
main().catch(e => { console.error(e); process.exit(1); });
