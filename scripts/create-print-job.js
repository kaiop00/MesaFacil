import process from 'node:process';
import { createRequire } from 'module';
import path from 'node:path';
import fs from 'node:fs';

const require = createRequire(import.meta.url);

async function main() {
  const [, , serviceAccountPath, restaurantId, mesaId = 'mesa-qrcode', pedidoId = `pedido-${Date.now()}`] = process.argv;
  if (!serviceAccountPath || !restaurantId) {
    console.error('Usage: node scripts/create-print-job.js /path/to/service-account.json RESTAURANTE_ID [MESA_ID] [PEDIDO_ID]');
    process.exit(2);
  }

  const admin = require('firebase-admin');

  if (serviceAccountPath !== 'ADC' && !fs.existsSync(serviceAccountPath)) {
    console.error('Service account file not found:', serviceAccountPath);
    console.error('Or pass "ADC" as first arg to use Application Default Credentials.');
    process.exit(3);
  }

  if (serviceAccountPath === 'ADC') {
    admin.initializeApp();
  } else {
    const serviceAccount = require(path.resolve(serviceAccountPath));
    admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
  }
  const db = admin.firestore();

  const payload = {
    tipo: 'PEDIDO',
    pedidoId,
    mesaId,
    mesaNumero: String(mesaId),
    setorId: 'sem-setor',
    setorNome: 'Sem setor',
    printerSystemName: '',
    total: 0,
    observacoes: '',
    items: [],
    ticketText: `TESTE DE IMPRESSAO - PEDIDO ${pedidoId} - MESA ${mesaId}`,
  };

  try {
    const ref = await db.collection('restaurantes').doc(restaurantId).collection('printQueue').add({
      pedidoId,
      mesaId,
      mesaNumero: String(mesaId),
      setorId: 'sem-setor',
      setorNome: 'Sem setor',
      printerSystemName: '',
      tipo: 'PEDIDO',
      status: 'PENDENTE',
      tentativas: 0,
      payload,
      criadoEm: admin.firestore.FieldValue.serverTimestamp(),
    });

    console.log('PrintQueue document created:', ref.id);
    process.exit(0);
  } catch (err) {
    console.error('Failed to create printQueue document:', err);
    process.exit(4);
  }
}

main();
