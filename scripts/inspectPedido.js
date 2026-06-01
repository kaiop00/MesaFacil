const admin = require('firebase-admin');
const path = process.env.GOOGLE_APPLICATION_CREDENTIALS;
if (!path) {
  console.error('Set GOOGLE_APPLICATION_CREDENTIALS env var');
  process.exit(1);
}
admin.initializeApp({ credential: admin.credential.cert(require(path)) });
const db = admin.firestore();
(async () => {
  try {
    const pedidoId = 'PrhzNcONlGh1To7vk8eX';
    const restaurants = await db.collection('restaurantes').get();
    for (const r of restaurants.docs) {
      const restId = r.id;
      const mesasSnap = await db.collection('restaurantes').doc(restId).collection('mesas').get();
      for (const m of mesasSnap.docs) {
        const mesaId = m.id;
        const pedidoRef = db.collection('restaurantes').doc(restId).collection('mesas').doc(mesaId).collection('pedidos').doc(pedidoId);
        const pedidoSnap = await pedidoRef.get();
        if (pedidoSnap.exists) {
          console.log('Found at:', `restaurantes/${restId}/mesas/${mesaId}/pedidos/${pedidoId}`);
          const data = pedidoSnap.data();
          const items = data.items || [];
          console.log('items.length=', items.length);

          const setoresSnap = await db.collection('restaurantes').doc(restId).collection('setoresProducao').get();
          const setores = setoresSnap.docs.map(s => ({ id: s.id, nome: s.data().nome, categorias: Array.isArray(s.data().categorias) ? s.data().categorias.map(c => String(c).trim().toLowerCase('pt-BR')) : [] }));
          console.log('setores (normalized):', JSON.stringify(setores, null, 2));

          const normalize = (v) => String(v || '').trim().toLowerCase('pt-BR');
          const groups = new Map();

          items.forEach((item, idx) => {
            const categorias = Array.isArray(item.categorias) ? item.categorias.map(normalize).filter(Boolean) : [];
            let matched = null;
            if (categorias.length > 0) {
              for (const setor of setores) {
                for (const cat of setor.categorias) {
                  if (categorias.includes(cat)) {
                    matched = { setorId: setor.id, setorNome: setor.nome };
                    break;
                  }
                }
                if (matched) break;
              }
            }

            if (!matched) {
              matched = { setorId: (item.setorId || 'sem-setor'), setorNome: item.setorNome || item.setor || 'Sem setor' };
            }

            const key = `${matched.setorId}::${matched.setorNome}`;
            if (!groups.has(key)) groups.set(key, { ...matched, items: [] });
            groups.get(key).items.push({ ...item, __index: idx });
          });

          const result = Array.from(groups.values());
          console.log('Grouping result:', JSON.stringify(result.map(g => ({ setorId: g.setorId, setorNome: g.setorNome, count: g.items.length, categories: g.items.map(it => it.categorias) })), null, 2));
          process.exit(0);
        }
      }
    }
    console.log('Pedido não encontrado');
  } catch (e) {
    console.error(e);
  } finally {
    process.exit(0);
  }
})();
