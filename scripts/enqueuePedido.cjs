const admin = require('firebase-admin');
const path = process.env.GOOGLE_APPLICATION_CREDENTIALS;
if (!path) {
  console.error('Set GOOGLE_APPLICATION_CREDENTIALS env var');
  process.exit(1);
}
admin.initializeApp({ credential: admin.credential.cert(require(path)) });
const db = admin.firestore();

const safeText = (value) => String(value ?? '').replace(/[<>]/g, '').trim();
const line = (char = '-') => char.repeat(48);
const centerText = (value, width = 48) => {
  const text = safeText(value);
  if (!text) return '';
  if (text.length >= width) return text;
  const totalPadding = width - text.length;
  const leftPadding = Math.floor(totalPadding / 2);
  const rightPadding = totalPadding - leftPadding;
  return `${' '.repeat(leftPadding)}${text}${' '.repeat(rightPadding)}`;
};

const buildTicketText = ({ tipo, mesaNumero, setorNome, estabelecimentoNome, items, observacoes }) => {
  const header = [
    line(),
    centerText('MESAFACIL'),
    centerText(estabelecimentoNome || '-'),
    `TIPO: ${safeText(tipo).toUpperCase()}`,
    `MESA: ${safeText(mesaNumero || '-').toUpperCase()}`,
    `SETOR: ${safeText(setorNome || '-').toUpperCase()}`,
    line(),
  ];

  const itemLines = (items || []).map((item, index) => {
    const quantity = Number(item?.quantity || 0);
    const name = safeText(item?.nome || 'Item').toUpperCase();
    const observation = safeText(item?.descricao || item?.observacao || item?.observacoes || '');
    const lines = [`${String(index + 1).padStart(2, '0')}. ${quantity}X ${name}`];
    if (observation) lines.push(`   OBS: ${observation.toUpperCase()}`);
    return lines.join('\n');
  });

  const footer = [line()];
  if (observacoes) footer.push(line(), `OBS: ${safeText(observacoes).toUpperCase()}`);
  footer.push(line());

  return [...header, ...itemLines, ...footer].join('\n');
};

async function main() {
  const pedidoId = process.env.PEDIDO_ID || 'PrhzNcONlGh1To7vk8eX';
  // find pedido and its restaurant + mesa
  const restaurants = await db.collection('restaurantes').get();
  for (const r of restaurants.docs) {
    const restId = r.id;
    const mesasSnap = await db.collection('restaurantes').doc(restId).collection('mesas').get();
    for (const m of mesasSnap.docs) {
      const mesaId = m.id;
      const pedidoRef = db.collection('restaurantes').doc(restId).collection('mesas').doc(mesaId).collection('pedidos').doc(pedidoId);
      const pedidoSnap = await pedidoRef.get();
      if (!pedidoSnap.exists) continue;

      console.log('Found pedido in', restId, mesaId);
      const pedido = pedidoSnap.data();
      const items = Array.isArray(pedido.items) ? pedido.items : [];

      // load setores and impressoras
      const setoresSnap = await db.collection('restaurantes').doc(restId).collection('setoresProducao').get();
      const setores = setoresSnap.docs.map(s => ({ id: s.id, ...s.data(), categorias: Array.isArray(s.data().categorias) ? s.data().categorias.map(c => String(c).trim().toLowerCase('pt-BR')) : [] }));

      const impressorasSnap = await db.collection('restaurantes').doc(restId).collection('impressorasSetor').get();
      const impressoras = impressorasSnap.docs.map(d => ({ id: d.id, ...d.data() }));

      // group items by setor
      const groups = new Map();
      const normalize = (v) => String(v || '').trim().toLowerCase('pt-BR');

      items.forEach((item, idx) => {
        const categorias = Array.isArray(item.categorias) ? item.categorias.map(normalize).filter(Boolean) : [];
        let matched = null;
        if (categorias.length > 0) {
          for (const setor of setores) {
            for (const cat of setor.categorias) {
              if (categorias.includes(cat)) { matched = { setorId: setor.id, setorNome: setor.nome }; break; }
            }
            if (matched) break;
          }
        }
        if (!matched) matched = { setorId: item.setorId || 'sem-setor', setorNome: item.setorNome || item.setor || 'Sem setor' };

        const key = `${matched.setorId}::${matched.setorNome}`;
        if (!groups.has(key)) groups.set(key, { setorId: matched.setorId, setorNome: matched.setorNome, items: [] });
        groups.get(key).items.push({ ...item, __index: idx, setorId: matched.setorId, setorNome: matched.setorNome });
      });

      const estabelecimentoNome = String(r.data()?.nome || '').trim();

      const jobs = [];
      for (const grupo of Array.from(groups.values())) {
        const impressora = impressoras.find(i => i.setorId === grupo.setorId && i.ativa !== false);
        const printerSystemName = String(impressora?.printerSystemName || impressora?.systemPrinter || '').trim();

        const ticketText = buildTicketText({ tipo: 'PEDIDO', mesaNumero: pedido.mesaNumero || mesaId, setorNome: grupo.setorNome, estabelecimentoNome, items: grupo.items, observacoes: pedido.observacoes || '' });

        const payload = {
          tipo: 'PEDIDO',
          pedidoId,
          mesaId,
          mesaNumero: pedido.mesaNumero || mesaId || '-',
          setorId: grupo.setorId,
          setorNome: grupo.setorNome,
          printerSystemName: printerSystemName || '',
          total: Number(grupo.items.reduce((acc, it) => acc + Number(it.price || 0) * Number(it.quantity || 0), 0)),
          observacoes: pedido.observacoes || '',
          items: (grupo.items || []).map(item => ({ id: item.id, nome: item.nome, price: Number(item.price || 0), quantity: Number(item.quantity || 0), descricao: item.descricao || item.observacao || item.observacoes || '', setorId: item.setorId || '', setorNome: item.setorNome || '' })),
          ticketText,
          ticketHtml: `<pre>${safeText(ticketText)}</pre>`,
        };

        const docRef = await db.collection('restaurantes').doc(restId).collection('printQueue').add({
          pedidoId,
          mesaId,
          mesaNumero: pedido.mesaNumero || mesaId || '-',
          setorId: grupo.setorId,
          setorNome: grupo.setorNome,
          printerSystemName: printerSystemName || '',
          impressoraId: impressora?.id || null,
          impressoraNome: impressora?.nome || null,
          tipo: 'PEDIDO',
          status: 'PENDENTE',
          tentativas: 0,
          payload,
        });

        console.log('Created queue item', docRef.id, 'setor=', grupo.setorNome, 'impressora=', impressora?.nome || null);
        jobs.push({ id: docRef.id, ...payload });
      }

      console.log('Enqueued', jobs.length, 'jobs for pedido', pedidoId);
      process.exit(0);
    }
  }
  console.log('Pedido not found');
  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
