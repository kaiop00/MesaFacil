const admin = require('firebase-admin');
const path = process.env.GOOGLE_APPLICATION_CREDENTIALS;
if (!path) { console.error('Set GOOGLE_APPLICATION_CREDENTIALS env var'); process.exit(1); }
admin.initializeApp({ credential: admin.credential.cert(require(path)) });
const db = admin.firestore();

async function main() {
  const restaurantes = await db.collection('restaurantes').limit(5).get();
  for (const restDoc of restaurantes.docs) {
    const restId = restDoc.id;
    const mesas = await db.collection('restaurantes').doc(restId).collection('mesas').limit(20).get();
    for (const mesaDoc of mesas.docs) {
      const mesaId = mesaDoc.id;
      const pedidos = await db.collection('restaurantes').doc(restId).collection('mesas').doc(mesaId).collection('pedidos').limit(1).get();
      if (!pedidos.empty) {
        const pedidoId = pedidos.docs[0].id;
        const pedido = pedidos.docs[0].data();
        console.log(`\n✓ Encontrado!`);
        console.log(`REST_ID=${restId}`);
        console.log(`MESA_ID=${mesaId}`);
        console.log(`PEDIDO_ID=${pedidoId}`);
        console.log(`Número da mesa: ${mesaDoc.data().numero}`);
        console.log(`Status: ${pedido.status}`);
        console.log(`Items: ${pedido.items?.length || 0}`);
        console.log(`\nExecute:`);
        console.log(`REST_ID=${restId} MESA_ID=${mesaId} PEDIDO_ID=${pedidoId} node scripts/enqueueSpecificPedido.cjs`);
        process.exit(0);
      }
    }
  }
  console.error('Nenhum pedido encontrado');
  process.exit(1);
}
main().catch(e => { console.error(e); process.exit(1); });
