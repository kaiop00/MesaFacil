import {
  collection,
  doc,
  getDocs,
  query,
  where,
  writeBatch,
  runTransaction
} from 'firebase/firestore';
import { db } from '@/config/firebaseConfig';
import { convertIngredientToStorage } from '@/services/utils/unitConversionService';

/**
 * Serviço para gerenciar ingredientes dos itens do cardápio
 */

/**
 * Adiciona ingredientes a um item do cardápio
 * @param {string} idRestaurante 
 * @param {string} cardapioId 
 * @param {Array} ingredientes - Array com {itemId, quantidade, unidade}
 */
export const adicionarIngredientes = async (idRestaurante, cardapioId, ingredientes) => {
  const ingredientesRef = collection(db, 'restaurantes', idRestaurante, 'cardapio_ingredientes');
  
  const batch = writeBatch(db);
  
  // Remove ingredientes existentes do item
  await removerIngredientes(idRestaurante, cardapioId);
  
  // Adiciona novos ingredientes
  for (const ingrediente of ingredientes) {
    const docRef = doc(ingredientesRef);
    batch.set(docRef, {
      cardapioId,
      itemId: ingrediente.itemId,
      itemNome: ingrediente.itemNome,
      quantidade: parseFloat(ingrediente.quantidade),
      unidade: ingrediente.unidade,
      criadoEm: new Date().toISOString()
    });
  }
  
  await batch.commit();
};

/**
 * Remove todos os ingredientes de um item do cardápio
 * @param {string} idRestaurante 
 * @param {string} cardapioId 
 */
export const removerIngredientes = async (idRestaurante, cardapioId) => {
  const ingredientesRef = collection(db, 'restaurantes', idRestaurante, 'cardapio_ingredientes');
  const q = query(ingredientesRef, where('cardapioId', '==', cardapioId));
  const snapshot = await getDocs(q);
  
  const batch = writeBatch(db);
  snapshot.docs.forEach((docSnap) => {
    batch.delete(docSnap.ref);
  });
  
  await batch.commit();
};

/**
 * Busca ingredientes de um item do cardápio
 * @param {string} idRestaurante 
 * @param {string} cardapioId 
 */
export const buscarIngredientes = async (idRestaurante, cardapioId) => {
  const ingredientesRef = collection(db, 'restaurantes', idRestaurante, 'cardapio_ingredientes');
  const q = query(ingredientesRef, where('cardapioId', '==', cardapioId));
  const snapshot = await getDocs(q);
  
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

/**
 * Busca todos os ingredientes de múltiplos itens do cardápio
 * @param {string} idRestaurante 
 * @param {Array} cardapioIds 
 */
export const buscarIngredientesMultiplos = async (idRestaurante, cardapioIds) => {
  if (!cardapioIds || cardapioIds.length === 0) return {};
  
  const ingredientesRef = collection(db, 'restaurantes', idRestaurante, 'cardapio_ingredientes');
  const q = query(ingredientesRef, where('cardapioId', 'in', cardapioIds));
  const snapshot = await getDocs(q);
  
  const ingredientesPorItem = {};
  snapshot.docs.forEach(doc => {
    const data = { id: doc.id, ...doc.data() };
    if (!ingredientesPorItem[data.cardapioId]) {
      ingredientesPorItem[data.cardapioId] = [];
    }
    ingredientesPorItem[data.cardapioId].push(data);
  });
  
  return ingredientesPorItem;
};

/**
 * Calcula o consumo total de ingredientes baseado nos itens do pedido
 * @param {string} idRestaurante 
 * @param {Array} itensPedido - Array com {id, quantity}
 */
export const calcularConsumoIngredientes = async (idRestaurante, itensPedido) => {
  const cardapioIds = itensPedido.map(item => item.id);
  const ingredientesPorItem = await buscarIngredientesMultiplos(idRestaurante, cardapioIds);
  
  // Buscar informações dos itens do estoque para obter unidades de armazenamento
  const itensEstoqueRef = collection(db, 'restaurantes', idRestaurante, 'itens');
  const itensSnapshot = await getDocs(itensEstoqueRef);
  const itensEstoque = {};
  itensSnapshot.docs.forEach(doc => {
    itensEstoque[doc.id] = { id: doc.id, ...doc.data() };
  });
  
  const consumoTotal = {};
  const errosConversao = [];
  
  itensPedido.forEach(itemPedido => {
    const ingredientes = ingredientesPorItem[itemPedido.id] || [];
    
    ingredientes.forEach(ingrediente => {
      const itemEstoque = itensEstoque[ingrediente.itemId];
      
      if (!itemEstoque) {
        errosConversao.push(`Item ${ingrediente.itemNome} não encontrado no estoque`);
        return;
      }
      
      // Converter a quantidade do ingrediente para a unidade de armazenamento
      const conversao = convertIngredientToStorage(
        ingrediente.quantidade,
        ingrediente.unidade,
        itemEstoque.unidadeArmazenamento
      );
      
      if (!conversao.success) {
        errosConversao.push(`Erro na conversão para ${ingrediente.itemNome}: ${conversao.errorMessage}`);
        return;
      }
      
      const consumoConvertido = conversao.convertedQuantity * itemPedido.quantity;
      
      if (!consumoTotal[ingrediente.itemId]) {
        consumoTotal[ingrediente.itemId] = {
          itemId: ingrediente.itemId,
          itemNome: ingrediente.itemNome,
          consumoTotal: 0,
          unidade: itemEstoque.unidadeArmazenamento, // Usar unidade de armazenamento
          detalhes: []
        };
      }
      
      consumoTotal[ingrediente.itemId].consumoTotal += consumoConvertido;
      consumoTotal[ingrediente.itemId].detalhes.push({
        cardapioItem: itemPedido.nome,
        quantidade: itemPedido.quantity,
        consumoPorPorcao: ingrediente.quantidade,
        unidadeOriginal: ingrediente.unidade,
        consumoPorPorcaoConvertido: conversao.convertedQuantity,
        consumoTotal: consumoConvertido
      });
    });
  });
  
  // Se há erros de conversão, lançar exceção
  if (errosConversao.length > 0) {
    throw new Error(`Erros de conversão de unidades:\n${errosConversao.join('\n')}`);
  }
  
  return Object.values(consumoTotal);
};

/**
 * Processa baixa no estoque baseado no consumo de ingredientes
 * @param {string} idRestaurante 
 * @param {Array} consumoIngredientes 
 * @param {string} pedidoId - ID do pedido para referência
 */
export const processarBaixaEstoque = async (idRestaurante, consumoIngredientes, pedidoId) => {
  return await runTransaction(db, async (transaction) => {
    const resultados = [];
    const itensParaAtualizar = [];
    
    // FASE 1: Fazer todas as leituras primeiro
    for (const consumo of consumoIngredientes) {
      const itemRef = doc(db, 'restaurantes', idRestaurante, 'itens', consumo.itemId);
      const itemDoc = await transaction.get(itemRef);
      
      if (!itemDoc.exists()) {
        throw new Error(`Item ${consumo.itemNome} não encontrado no estoque`);
      }
      
      const itemData = itemDoc.data();
      const estoqueAtual = itemData.estoqueAtual || 0;
      const novoEstoque = estoqueAtual - consumo.consumoTotal;
      
      if (novoEstoque < 0) {
        throw new Error(`Estoque insuficiente para ${consumo.itemNome}. Disponível: ${estoqueAtual}, Necessário: ${consumo.consumoTotal}`);
      }
      
      // Armazenar dados para as escritas
      itensParaAtualizar.push({
        itemRef,
        consumo,
        estoqueAtual,
        novoEstoque
      });
    }
    
    // FASE 2: Fazer todas as escritas após todas as leituras
    for (const item of itensParaAtualizar) {
      // Atualizar estoque
      transaction.update(item.itemRef, {
        estoqueAtual: item.novoEstoque
      });
      
      // Registrar movimento de saída
      const movimentoRef = doc(collection(db, 'restaurantes', idRestaurante, 'movimentos'));
      transaction.set(movimentoRef, {
        itemId: item.consumo.itemId,
        itemNome: item.consumo.itemNome,
        tipoMovimentacao: 'Saída - Pedido',
        quantidade: item.consumo.consumoTotal,
        saldoAtual: item.estoqueAtual,
        novoSaldo: item.novoEstoque,
        unidadeArmazenamento: item.consumo.unidade,
        pedidoReferencia: pedidoId,
        detalhesConsumo: item.consumo.detalhes,
        data: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
      
      resultados.push({
        itemId: item.consumo.itemId,
        itemNome: item.consumo.itemNome,
        estoqueAnterior: item.estoqueAtual,
        consumo: item.consumo.consumoTotal,
        novoEstoque: item.novoEstoque,
        detalhes: item.consumo.detalhes
      });
    }
    
    return resultados;
  });
};

/**
 * Verifica se há estoque suficiente para um pedido
 * @param {string} idRestaurante 
 * @param {Array} itensPedido 
 */
export const verificarEstoqueDisponivel = async (idRestaurante, itensPedido) => {
  const consumoIngredientes = await calcularConsumoIngredientes(idRestaurante, itensPedido);
  
  if (consumoIngredientes.length === 0) {
    return { podeProcessar: true, verificacoes: [] };
  }
  
  // Buscar todos os itens necessários de uma vez
  const itemIds = consumoIngredientes.map(consumo => consumo.itemId);
  const itensRef = collection(db, 'restaurantes', idRestaurante, 'itens');
  const itensSnapshot = await getDocs(itensRef);
  
  // Criar mapa dos itens do estoque
  const itensEstoque = {};
  itensSnapshot.docs.forEach(doc => {
    itensEstoque[doc.id] = { id: doc.id, ...doc.data() };
  });
  
  const verificacoes = [];
  
  consumoIngredientes.forEach(consumo => {
    const itemEstoque = itensEstoque[consumo.itemId];
    
    if (!itemEstoque) {
      verificacoes.push({
        itemId: consumo.itemId,
        itemNome: consumo.itemNome,
        disponivel: false,
        motivo: 'Item não encontrado no estoque'
      });
      return;
    }
    
    const estoqueAtual = itemEstoque.estoqueAtual || 0;
    
    verificacoes.push({
      itemId: consumo.itemId,
      itemNome: consumo.itemNome,
      estoqueAtual: estoqueAtual,
      necessario: consumo.consumoTotal,
      disponivel: estoqueAtual >= consumo.consumoTotal,
      motivo: estoqueAtual >= consumo.consumoTotal ? 'OK' : `Estoque insuficiente (disponível: ${estoqueAtual}, necessário: ${consumo.consumoTotal})`
    });
  });
  
  return {
    podeProcessar: verificacoes.every(v => v.disponivel),
    verificacoes: verificacoes
  };
};