import { v4 as uuidv4 } from 'uuid';
import * as firestore from '@/services/firebase/firestoreService';
import { getRestaurant } from '@/services/firebase/restaurantService';

const SESSIONS_COLL = 'caixaSessions';
const PAGAMENTOS_COLL = 'caixaPagamentos';
const LANCAMENTOS_COLL = 'caixaLancamentos';
const MOVIMENTOS_COLL = 'caixaMovimentacoes';

/**
 * Verifica se existe sessão de caixa aberta para a empresa
 */
export async function getOpenSession(empresaId) {
  const sessions = await firestore.getAll(empresaId, SESSIONS_COLL, { orderByField: 'dataAbertura', order: 'desc' });
  return sessions.find(s => s.status === 'ABERTO') || null;
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
    formaPagamento,
    valor: Number((valorBase + gorjetaNumerica).toFixed(2)),
    gorjeta: gorjetaNumerica,
    taxaCartao: taxaCartao ? Number(taxaCartao) : 0,
    dataHora: new Date().toISOString()
  };

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
    formaPagamento,
    valor: Number(valor) || 0,
    descricao: descricao || '',
    origem: origem || 'OUTROS',
    dataHora: new Date().toISOString()
  };

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

  await firestore.create(empresaId, MOVIMENTOS_COLL, payload);
  return payload;
}

/**
 * Calcula totais por forma de pagamento e valores para conferência de gaveta
 */
export async function calcularTotaisSessao(empresaId, caixaSessionId) {
  const pagamentos = await firestore.getAll(empresaId, PAGAMENTOS_COLL);
  const lancamentos = await firestore.getAll(empresaId, LANCAMENTOS_COLL);
  const movimentos = await firestore.getAll(empresaId, MOVIMENTOS_COLL);

  const pagamentosSessao = pagamentos.filter(p => p.caixaSessionId === caixaSessionId);
  const lancamentosSessao = lancamentos.filter(l => l.caixaSessionId === caixaSessionId);
  const movimentosSessao = movimentos.filter(m => m.caixaSessionId === caixaSessionId);

  const formas = ['DINHEIRO','PIX','CREDITO','DEBITO','VR','VA'];
  const porForma = {};
  formas.forEach(f => { porForma[f] = 0; });

  pagamentosSessao.forEach(p => { porForma[p.formaPagamento] = (porForma[p.formaPagamento]||0) + Number(p.valor || 0); });
  lancamentosSessao.forEach(l => { porForma[l.formaPagamento] = (porForma[l.formaPagamento]||0) + Number(l.valor || 0); });

  const suprimentos = movimentosSessao.filter(m => m.tipo === 'SUPRIMENTO').reduce((s, m) => s + Number(m.valor||0), 0);
  const entradasExtras = movimentosSessao.filter(m => m.tipo === 'ENTRADA_EXTRA').reduce((s, m) => s + Number(m.valor||0), 0);
  const sangrias = movimentosSessao.filter(m => m.tipo === 'SANGRIA').reduce((s, m) => s + Number(m.valor||0), 0);

  const vendasDinheiro = porForma['DINHEIRO'] || 0;

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
  const session = await firestore.getById(empresaId, SESSIONS_COLL, caixaSessionId);
  if (!session) throw new Error('Sessão não encontrada');
  if (session.status === 'FECHADO') throw new Error('Caixa já está fechado');

  const totais = await calcularTotaisSessao(empresaId, caixaSessionId);

  const esperado = (Number(session.valorInicial||0) + Number(totais.vendasDinheiro||0) + Number(totais.suprimentos||0) + Number(totais.entradasExtras||0) - Number(totais.sangrias||0));
  const informado = Number(valorInformadoFechamento||0);
  const diferenca = informado - esperado;

  const updatePayload = {
    status: 'FECHADO',
    usuarioFechamentoId: usuarioId,
    dataFechamento: new Date().toISOString(),
    valorInformadoFechamento: informado,
    diferenca
  };

  await firestore.update(empresaId, SESSIONS_COLL, caixaSessionId, updatePayload);
  return { esperado, informado, diferenca, updatePayload };
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
  body.push(padRight('Operador abertura:', session.usuarioAberturaId || '-'));
  body.push(padRight('Operador fechamento:', session.usuarioFechamentoId || '-'));
  body.push(padRight('Abertura:', session.dataAbertura || '-'));
  body.push(padRight('Fechamento:', session.dataFechamento || '-'));
  body.push(line());
  body.push(padRight('VALOR INICIAL', Number(session.valorInicial || 0)));
  body.push(line());
  body.push(padCenter('VENDAS POR FORMA'));
  Object.keys(totais.porForma).forEach(fp => {
    body.push(padRight(fp, Number(totais.porForma[fp] || 0)));
  });
  body.push(line());
  const totalFinanceiro = Object.values(totais.porForma).reduce((s, v) => s + Number(v || 0), 0);
  body.push(padRight('TOTAL FINANCEIRO', totalFinanceiro));
  body.push(line());
  body.push(padCenter('MOVIMENTAÇÕES'));
  body.push(padRight('Suprimentos', Number(totais.suprimentos || 0)));
  body.push(padRight('Sangrias', Number(totais.sangrias || 0)));
  body.push(padRight('Entradas extras', Number(totais.entradasExtras || 0)));
  body.push(line());

  const esperado = (Number(session.valorInicial || 0) + Number(totais.vendasDinheiro || 0) + Number(totais.suprimentos || 0) + Number(totais.entradasExtras || 0) - Number(totais.sangrias || 0));
  const informado = Number(session.valorInformadoFechamento || 0);
  const diff = Number(session.diferenca || (informado - esperado));

  body.push(padCenter('CONFERÊNCIA DO DINHEIRO'));
  body.push(padRight('Esperado', esperado));
  body.push(padRight('Informado', informado));
  body.push(padRight('Diferença', diff));
  const status = diff === 0 ? 'OK' : (diff > 0 ? 'SOBRA' : 'QUEBRA');
  body.push(padRight('Status', status));
  body.push(line());
  if (restaurant?.observacao) body.push(padCenter(restaurant.observacao));
  body.push(padCenter('Obrigado pela preferência'));

  return [...header, ...body].join('\n');
}

export default {
  abrirCaixa,
  getOpenSession,
  registrarPagamentoPedido,
  criarLancamentoManual,
  criarMovimentacao,
  fecharCaixa,
  gerarRelatorioFechamento,
  calcularTotaisSessao
};
