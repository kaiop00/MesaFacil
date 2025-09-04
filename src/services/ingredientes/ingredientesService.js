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
  
  const consumoTotal = {};
  
  itensPedido.forEach(itemPedido => {
    const ingredientes = ingredientesPorItem[itemPedido.id] || [];
    
    ingredientes.forEach(ingrediente => {
      const consumo = ingrediente.quantidade * itemPedido.quantity;
      
      if (!consumoTotal[ingrediente.itemId]) {
        consumoTotal[ingrediente.itemId] = {
          itemId: ingrediente.itemId,
          itemNome: ingrediente.itemNome,
          consumoTotal: 0,
          unidade: ingrediente.unidade,
          detalhes: []
        };
      }
      
      consumoTotal[ingrediente.itemId].consumoTotal += consumo;
      consumoTotal[ingrediente.itemId].detalhes.push({
        cardapioItem: itemPedido.nome,
        quantidade: itemPedido.quantity,
        consumoPorPorcao: ingrediente.quantidade,
        consumoTotal: consumo
      });
    });
  });
  
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
    
    for (const consumo of consumoIngredientes) {
      // Buscar item atual no estoque
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
      
      // Atualizar estoque
      transaction.update(itemRef, {
        estoqueAtual: novoEstoque
      });
      
      // Registrar movimento de saída
      const movimentoRef = doc(collection(db, 'restaurantes', idRestaurante, 'movimentos'));
      transaction.set(movimentoRef, {
        itemId: consumo.itemId,
        itemNome: consumo.itemNome,
        tipoMovimentacao: 'Saída - Pedido',
        quantidade: consumo.consumoTotal,
        saldoAtual: estoqueAtual,
        novoSaldo: novoEstoque,
        unidadeArmazenamento: consumo.unidade,
        pedidoReferencia: pedidoId,
        detalhesConsumo: consumo.detalhes,
        data: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
      
      resultados.push({
        itemId: consumo.itemId,
        itemNome: consumo.itemNome,
        estoqueAnterior: estoqueAtual,
        consumo: consumo.consumoTotal,
        novoEstoque: novoEstoque,
        detalhes: consumo.detalhes
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
  const verificacoes = [];
  
  for (const consumo of consumoIngredientes) {
    const itemDoc = await getDocs(query(collection(db, 'restaurantes', idRestaurante, 'itens'), where('__name__', '==', consumo.itemId)));
    
    if (itemDoc.empty) {
      verificacoes.push({
        itemId: consumo.itemId,
        itemNome: consumo.itemNome,
        disponivel: false,
        motivo: 'Item não encontrado no estoque'
      });
      continue;
    }
    
    const itemData = itemDoc.docs[0].data();
    const estoqueAtual = itemData.estoqueAtual || 0;
    
    verificacoes.push({
      itemId: consumo.itemId,
      itemNome: consumo.itemNome,
      estoqueAtual: estoqueAtual,
      necessario: consumo.consumoTotal,
      disponivel: estoqueAtual >= consumo.consumoTotal,
      motivo: estoqueAtual >= consumo.consumoTotal ? 'OK' : `Estoque insuficiente (disponível: ${estoqueAtual}, necessário: ${consumo.consumoTotal})`
    });
  }
  
  return {
    podeProcessar: verificacoes.every(v => v.disponivel),
    verificacoes: verificacoes
  };
};