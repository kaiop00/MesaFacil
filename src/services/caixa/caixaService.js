import { v4 as uuidv4 } from 'uuid';
import * as firestore from '@/services/firebase/firestoreService';
import { getRestaurant } from '@/services/firebase/restaurantService';

const SESSIONS_COLL = 'caixaSessions';
const PAGAMENTOS_COLL = 'caixaPagamentos';
const LANCAMENTOS_COLL = 'caixaLancamentos';
const MOVIMENTOS_COLL = 'caixaMovimentacoes';

const FORMA_PAGAMENTO_CANONICA = {
  dinheiro: 'DINHEIRO',
  pix: 'PIX',
  credito: 'CREDITO',
  débito: 'DEBITO',
  debito: 'DEBITO',
  voucher: 'VOUCHER',
  ifood: 'IFOOD'
};

function normalizarFormaPagamento(formaPagamento) {
  const valor = String(formaPagamento || '').trim();
  if (!valor) return null;

  const chaveNormalizada = valor.toLowerCase();
  return FORMA_PAGAMENTO_CANONICA[chaveNormalizada] || valor.toUpperCase();
}

/**
 * Verifica se existe sessão de caixa aberta para a empresa
 */
export async function getOpenSession(empresaId) {
  const sessions = await firestore.getByField(
    empresaId,
    SESSIONS_COLL,
    'status',
    '==',
    'ABERTO',
    { limit: 1 }
  );

  return sessions[0] || null;
}

/**
 * Abre uma nova sessão de caixa. Garante 1 caixa aberto por empresa.
 */
export async function abrirCaixa({ empresaId, usuarioId, valorInicial = 0, observacoes = '' }) {
  const aberto = await getOpenSession(empresaId);
  if (aberto) throw new Error('Já existe um caixa aberto para esta empresa');

  const payload = {
    id: uuidv4(),
    empresaId,
    usuarioAberturaId: usuarioId,
    dataAbertura: new Date().toISOString(),
    valorInicial: Number(valorInicial) || 0,
    status: 'ABERTO',
    observacoes: observacoes || ''
  };

  const ref = await firestore.create(empresaId, SESSIONS_COLL, payload);
  return { id: ref.id, ...payload };
}

/**
 * Registra pagamento automático de pedido no caixa
 */
export async function registrarPagamentoPedido({ empresaId, pedidoId, formaPagamento, valor, taxaCartao, gorjeta = 0 }) {
  const session = await getOpenSession(empresaId);
  if (!session) throw new Error('Não há caixa aberto');

  const gorjetaNumerica = Number(gorjeta || 0);
  const valorBase = Number(valor) || 0;

  const payload = {
    id: uuidv4(),
    pedidoId,
    caixaSessionId: session.id,
    empresaId,
    formaPagamento: normalizarFormaPagamento(formaPagamento),
    valor: Number((valorBase + gorjetaNumerica).toFixed(2)),
    gorjeta: gorjetaNumerica,
    taxaCartao: taxaCartao ? Number(taxaCartao) : 0,
    dataHora: new Date().toISOString()
  };

  console.log('[caixaService] registrarPagamentoPedido payload', payload);
  await firestore.create(empresaId, PAGAMENTOS_COLL, payload);
  return payload;
}

/**
 * Cria um lançamento manual (venda externa, iFood, balcão etc.)
 */
export async function criarLancamentoManual({ empresaId, usuarioId, formaPagamento, valor, descricao, origem }) {
  const session = await getOpenSession(empresaId);
  if (!session) throw new Error('Não há caixa aberto');

  const payload = {
    id: uuidv4(),
    caixaSessionId: session.id,
    empresaId,
    usuarioId,
    formaPagamento: normalizarFormaPagamento(formaPagamento),
    valor: Number(valor) || 0,
    descricao: descricao || '',
    origem: origem || 'OUTROS',
    dataHora: new Date().toISOString()
  };

  console.log('[caixaService] criarLancamentoManual payload', payload);
  await firestore.create(empresaId, LANCAMENTOS_COLL, payload);
  return payload;
}

/**
 * Cria movimentação física (suprimento, sangria, entrada extra)
 */
export async function criarMovimentacao({ empresaId, usuarioId, tipo, valor, descricao }) {
  const session = await getOpenSession(empresaId);
  if (!session) throw new Error('Não há caixa aberto');

  const payload = {
    id: uuidv4(),
    caixaSessionId: session.id,
    empresaId,
    usuarioId,
    tipo,
    valor: Number(valor) || 0,
    descricao: descricao || '',
    dataHora: new Date().toISOString()
  };

  console.log('[caixaService] criarMovimentacao payload', payload);
  await firestore.create(empresaId, MOVIMENTOS_COLL, payload);
  return payload;
}

/**
 * Calcula totais por forma de pagamento e valores para conferência de gaveta
 */
export async function calcularTotaisSessao(empresaId, caixaSessionId) {
  const [pagamentosSessao, lancamentosSessao, movimentosSessao] = await Promise.all([
    firestore.getByField(empresaId, PAGAMENTOS_COLL, 'caixaSessionId', '==', caixaSessionId),
    firestore.getByField(empresaId, LANCAMENTOS_COLL, 'caixaSessionId', '==', caixaSessionId),
    firestore.getByField(empresaId, MOVIMENTOS_COLL, 'caixaSessionId', '==', caixaSessionId),
  ]);

  const formas = ['DINHEIRO','PIX','CREDITO','DEBITO','VOUCHER','IFOOD'];
  const porForma = {};
  formas.forEach(f => { porForma[f] = 0; });

  const acumularPorForma = (item) => {
    const forma = normalizarFormaPagamento(item?.formaPagamento);
    if (!forma) return;
    if (!Object.prototype.hasOwnProperty.call(porForma, forma)) {
      porForma[forma] = 0;
    }
    porForma[forma] += Number(item?.valor || 0);
  };

  pagamentosSessao.forEach(acumularPorForma);
  lancamentosSessao.forEach(acumularPorForma);

  const suprimentos = movimentosSessao.filter(m => m.tipo === 'SUPRIMENTO').reduce((s, m) => s + Number(m.valor||0), 0);
  const entradasExtras = movimentosSessao.filter(m => m.tipo === 'ENTRADA_EXTRA').reduce((s, m) => s + Number(m.valor||0), 0);
  const sangrias = movimentosSessao.filter(m => m.tipo === 'SANGRIA').reduce((s, m) => s + Number(m.valor||0), 0);

  const vendasDinheiro = porForma['DINHEIRO'] || 0;

  console.log('[caixaService] calcularTotaisSessao', { caixaSessionId, porForma, suprimentos, entradasExtras, sangrias, vendasDinheiro });
  return {
    porForma,
    suprimentos,
    entradasExtras,
    sangrias,
    vendasDinheiro
  };
}

/**
 * Fecha a sessão de caixa calculando diferença e atualizando a sessão
 */
export async function fecharCaixa({ empresaId, usuarioId, caixaSessionId, valorInformadoFechamento }) {
  console.log('[caixaService] fecharCaixa called with', { empresaId, usuarioId, caixaSessionId, valorInformadoFechamento });
  const session = await firestore.getById(empresaId, SESSIONS_COLL, caixaSessionId);
  if (!session) throw new Error('Sessão não encontrada');
  if (session.status === 'FECHADO') throw new Error('Caixa já está fechado');

  const totais = await calcularTotaisSessao(empresaId, caixaSessionId);

  const esperado = (Number(session.valorInicial||0) + Number(totais.vendasDinheiro||0) + Number(totais.suprimentos||0) + Number(totais.entradasExtras||0) - Number(totais.sangrias||0));
  const informado = Number(valorInformadoFechamento||0);
  const diferenca = informado - esperado;

  // atualiza sessão com valores calculados (sem relatorio ainda)
  const updatePayload = {
    status: 'FECHADO',
    usuarioFechamentoId: usuarioId,
    dataFechamento: new Date().toISOString(),
    valorInformadoFechamento: informado,
    diferenca,
    valoresZerados: true
  };

  await firestore.update(empresaId, SESSIONS_COLL, caixaSessionId, updatePayload);
  console.log('[caixaService] fecharCaixa updated session (partial)', { sessionId: caixaSessionId, updatePayload });

  // gera relatório textual agora que a sessão está atualizada (usa os campos persistidos)
  const relatorio = await gerarRelatorioFechamento(empresaId, caixaSessionId);

  // persiste relatório final
  await firestore.update(empresaId, SESSIONS_COLL, caixaSessionId, { relatorioFechamento: relatorio });

  console.log('[caixaService] fecharCaixa updated session (relatorio)', { sessionId: caixaSessionId });
  return { esperado, informado, diferenca, relatorio };
}

/**
 * Força fechamento da sessão (debug)
 * Atualiza o status para FECHADO e persiste relatório sem validar pré-condições
 */
export async function forceCloseSessionDebug({ empresaId, usuarioId, caixaSessionId, valorInformadoFechamento = 0 }) {
  console.log('[caixaService] forceCloseSessionDebug called', { empresaId, usuarioId, caixaSessionId, valorInformadoFechamento });
  const session = await firestore.getById(empresaId, SESSIONS_COLL, caixaSessionId);
  if (!session) throw new Error('Sessão não encontrada (debug)');

  const totais = await calcularTotaisSessao(empresaId, caixaSessionId);
  const esperado = (Number(session.valorInicial||0) + Number(totais.vendasDinheiro||0) + Number(totais.suprimentos||0) + Number(totais.entradasExtras||0) - Number(totais.sangrias||0));
  const informado = Number(valorInformadoFechamento||0);
  const diferenca = informado - esperado;

  const updatePayload = {
    status: 'FECHADO',
    usuarioFechamentoId: usuarioId || session.usuarioAberturaId || 'debug',
    dataFechamento: new Date().toISOString(),
    valorInformadoFechamento: informado,
    diferenca,
    valoresZerados: true
  };

  await firestore.update(empresaId, SESSIONS_COLL, caixaSessionId, updatePayload);
  console.log('[caixaService] forceCloseSessionDebug updated session (partial)', { sessionId: caixaSessionId, updatePayload });

  const relatorio = await gerarRelatorioFechamento(empresaId, caixaSessionId);
  await firestore.update(empresaId, SESSIONS_COLL, caixaSessionId, { relatorioFechamento: relatorio });

  console.log('[caixaService] forceCloseSessionDebug updated session (relatorio)', { sessionId: caixaSessionId });
  return { esperado, informado, diferenca, relatorio };
}

export async function getLastClosedSessionWithReport(empresaId) {
  const sessions = await firestore.getByField(
    empresaId,
    SESSIONS_COLL,
    'status',
    '==',
    'FECHADO',
    { limit: 50 }
  );

  const ordered = [...sessions].sort((a, b) => {
    const dateA = new Date(a.dataFechamento || a.dataAbertura || 0).getTime();
    const dateB = new Date(b.dataFechamento || b.dataAbertura || 0).getTime();
    return dateB - dateA;
  });

  const closed = ordered.find((s) => s.status === 'FECHADO' && s.relatorioFechamento);
  if (!closed) return null;
  return {
    sessionId: closed.id,
    relatorio: closed.relatorioFechamento,
    informado: closed.valorInformadoFechamento,
    diferenca: closed.diferenca
  };
}

/**
 * Remove sessões de caixa mais antigas que `days` dias (por padrão 60 dias).
 * Retorna a quantidade de sessões removidas.
 */
export async function cleanupOldSessions(empresaId, days = 60) {
  if (!empresaId) return 0;
  const sessions = await firestore.getAll(empresaId, SESSIONS_COLL);
  if (!sessions || sessions.length === 0) return 0;

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - Number(days));

  const toDelete = sessions.filter(s => {
    const dateStr = s.dataFechamento || s.dataAbertura || s.criadoEm || null;
    if (!dateStr) return false;
    const d = new Date(dateStr);
    return d < cutoff;
  });

  if (toDelete.length === 0) return 0;

  const ids = toDelete.map(s => s.id);
  await firestore.removeMultiple(empresaId, SESSIONS_COLL, ids);
  console.log(`[caixaService] cleanupOldSessions removed ${ids.length} sessions older than ${days} days`);
  return ids.length;
}

/**
 * Gera relatório textual para impressora térmica para uma sessão de caixa
 */
export async function gerarRelatorioFechamento(empresaId, caixaSessionId, options = {}) {
  const session = await firestore.getById(empresaId, SESSIONS_COLL, caixaSessionId);
  if (!session) throw new Error('Sessão não encontrada');

  const totais = await calcularTotaisSessao(empresaId, caixaSessionId);
  // Tamanho padrão para impressora térmica 82mm (~48 colunas)
  const WIDTH = Number(options.width || 48);

  const padCenter = (text) => {
    text = (text || '').toString();
    if (text.length >= WIDTH) return text.slice(0, WIDTH);
    const left = Math.floor((WIDTH - text.length) / 2);
    const right = WIDTH - text.length - left;
    return ' '.repeat(left) + text + ' '.repeat(right);
  };

  const formatValue = (v) => {
    try {
      return Number(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    } catch (e) { return (v || '').toString(); }
  };

  const padRight = (label, value, valueWidth = 16) => {
    const left = (label || '').toString();
    const val = (typeof value === 'number') ? formatValue(value) : (value || '').toString();
    const maxLabel = WIDTH - valueWidth - 1;
    const labelText = left.length > maxLabel ? left.slice(0, maxLabel - 1) + '…' : left;
    const space = WIDTH - labelText.length - val.length;
    return labelText + ' '.repeat(Math.max(1, space)) + val;
  };

  const line = (ch = '-') => ch.repeat(WIDTH);

  const sectionTitle = (text) => [line('='), padCenter(text), line('=')];

  const kv = (label, value) => padRight(label, value);

  const formatStatus = (diff) => {
    if (Math.abs(diff) < 0.01) return 'OK';
    return diff > 0 ? 'SOBRA' : 'QUEBRA';
  };

  // tenta buscar dados do restaurante para cabeçalho
  let restaurant = null;
  try { restaurant = await getRestaurant(empresaId); } catch (e) { restaurant = null; }

  const header = [];
  header.push(padCenter(restaurant?.nome || ('Restaurante ' + empresaId)));
  if (restaurant?.endereco) header.push(padCenter(restaurant.endereco));
  if (restaurant?.telefone) header.push(padCenter('Tel: ' + restaurant.telefone));
  header.push(padCenter('FECHAMENTO DE CAIXA'));
  header.push(line());

  const body = [];
  body.push(...sectionTitle('DADOS DA SESSAO'));
  body.push(kv('Operador abertura', session.usuarioAberturaId || '-'));
  body.push(kv('Operador fechamento', session.usuarioFechamentoId || '-'));
  body.push(kv('Abertura', session.dataAbertura || '-'));
  body.push(kv('Fechamento', session.dataFechamento || '-'));
  body.push(line());

  body.push(...sectionTitle('RESUMO FINANCEIRO'));
  body.push(kv('Valor inicial', Number(session.valorInicial || 0)));
  body.push(kv('Vendas no dinheiro', Number(totais.vendasDinheiro || 0)));
  body.push(kv('Suprimentos', Number(totais.suprimentos || 0)));
  body.push(kv('Entradas extras', Number(totais.entradasExtras || 0)));
  body.push(kv('Sangrias', Number(totais.sangrias || 0)));
  body.push(line());

  const formasComValor = Object.entries(totais.porForma)
    .filter(([, valor]) => Number(valor || 0) > 0);

  if (formasComValor.length > 0) {
    body.push(...sectionTitle('PAGAMENTOS POR FORMA'));
    formasComValor.forEach(([forma, valor]) => {
      body.push(kv(forma, Number(valor || 0)));
    });
    body.push(line());
  }

  const esperado = (Number(session.valorInicial || 0) + Number(totais.vendasDinheiro || 0) + Number(totais.suprimentos || 0) + Number(totais.entradasExtras || 0) - Number(totais.sangrias || 0));
  const informado = Number(session.valorInformadoFechamento || 0);
  const diff = Number(session.diferenca || (informado - esperado));

  body.push(...sectionTitle('CONFERENCIA DA GAVETA'));
  body.push(kv('Esperado', esperado));
  body.push(kv('Informado', informado));
  body.push(kv('Diferença', diff));
  body.push(kv('Status', formatStatus(diff)));
  body.push(line());
  if (restaurant?.observacao) body.push(padCenter(restaurant.observacao));
  body.push(padCenter('Obrigado pela preferência'));

  return [...header, ...body].join('\n');
}

export default {
  abrirCaixa,
  getOpenSession,
  getLastClosedSessionWithReport,
  registrarPagamentoPedido,
  criarLancamentoManual,
  criarMovimentacao,
  fecharCaixa,
  forceCloseSessionDebug,
  gerarRelatorioFechamento,
  calcularTotaisSessao
};
