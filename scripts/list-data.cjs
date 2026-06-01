const admin = require('firebase-admin');
const path = process.env.GOOGLE_APPLICATION_CREDENTIALS;
if (!path) {
  console.error('Set GOOGLE_APPLICATION_CREDENTIALS env var');
  process.exit(1);
}
admin.initializeApp({ credential: admin.credential.cert(require(path)) });
const db = admin.firestore();

async function main() {
  const restaurantes = await db.collection('restaurantes').limit(1).get();
  if (restaurantes.empty) {
    console.error('Nenhum restaurante encontrado');
    process.exit(1);
  }
  
  const rest = restaurantes.docs[0];
  const restId = rest.id;
  console.log(`\n=== Restaurante ===`);
  console.log(`REST_ID: ${restId}`);
  console.log(`Nome: ${rest.data().nome}\n`);

  const mesas = await db.collection('restaurantes').doc(restId).collection('mesas').limit(1).get();
  if (mesas.empty) {
    console.error('Nenhuma mesa encontrada');
    process.exit(1);
  }
  
  const mesa = mesas.docs[0];
  const mesaId = mesa.id;
  console.log(`=== Mesa ===`);
  console.log(`MESA_ID: ${mesaId}`);
  console.log(`Número: ${mesa.data().numero}\n`);

  const pedidos = await db.collection('restaurantes').doc(restId).collection('mesas').doc(mesaId).collection('pedidos').limit(1).get();
  if (pedidos.empty) {
    console.error('Nenhum pedido encontrado nesta mesa');
    process.exit(1);
  }
  
  const pedido = pedidos.docs[0];
  const pedidoId = pedido.id;
  console.log(`=== Pedido ===`);
  console.log(`PEDIDO_ID: ${pedidoId}`);
  console.log(`Status: ${pedido.data().status}`);
  console.log(`Items: ${pedido.data().items?.length || 0}\n`);

  console.log(`\n=== Comando para enfileirar ===`);
  console.log(`REST_ID=${restId} MESA_ID=${mesaId} PEDIDO_ID=${pedidoId} node scripts/enqueueSpecificPedido.cjs`);
  
  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
