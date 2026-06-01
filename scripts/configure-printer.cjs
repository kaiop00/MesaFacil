const admin = require('firebase-admin');
const path = process.env.GOOGLE_APPLICATION_CREDENTIALS;
if (!path) { console.error('Set GOOGLE_APPLICATION_CREDENTIALS env var'); process.exit(1); }
admin.initializeApp({ credential: admin.credential.cert(require(path)) });
const db = admin.firestore();

async function main() {
  const restId = '0GQHxX4auzwrfFIcVWqR';
  
  // Criar/atualizar setor com impressora
  await db.collection('restaurantes').doc(restId).collection('setores').doc('sem-setor').set({
    nome: 'Sem setor',
    impressoraPrincipal: 'Canon_G3010_series'
  }, { merge: true });
  
  // Também adicionar configuração global de impressoras
  await db.collection('restaurantes').doc(restId).update({
    'impressoras.Canon_G3010_series': {
      nome: 'Canon G3010',
      sistema: 'Canon_G3010_series'
    }
  });
  
  console.log('✓ Impressora vinculada ao setor "sem-setor"');
  console.log('  Impressora: Canon_G3010_series');
  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
