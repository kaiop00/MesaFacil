import { getAll } from '@/services/firebase/firestoreService';

/**
 * Busca todas as promoções ativas do restaurante
 * @param {string} idRestaurante - ID do restaurante
 * @returns {Promise<Array>} Lista de promoções ativas
 */
export const getPromocoesAtivas = async (idRestaurante) => {
  try {
    const promocoes = await getAll(idRestaurante, 'promocoes', {
      orderByField: 'criadoEm',
      order: 'desc'
    });

    // Filtrar apenas promoções que ainda estão válidas
    return promocoes || [];
  } catch (error) {
    console.error('Erro ao buscar promoções:', error);
    return [];
  }
};

/**
 * Verifica se um item tem promoção ativa e retorna os dados promocionais
 * @param {Object} item - Item do cardápio
 * @param {Array} promocoes - Lista de promoções ativas
 * @returns {Object|null} Dados da promoção aplicável ou null
 */
export const verificarPromocaoItem = (item, promocoes) => {
  if (!item || !promocoes || promocoes.length === 0) {
    return null;
  }

  // Procurar por promoções que contenham este item
  for (const promocao of promocoes) {
    if (promocao.itens && promocao.itens.length > 0) {
      // Verificar se é uma promoção de item único
      if (promocao.itens.length === 1 && promocao.itens[0].id === item.id) {
        return {
          id: promocao.id,
          nome: promocao.nome,
          precoOriginal: item.valor,
          precoPromocional: promocao.precoDesconto,
          porcentagemDesconto: calcularPorcentagemDesconto(item.valor, promocao.precoDesconto),
          tipo: 'item-unico'
        };
      }
    }
  }

  return null;
};

/**
 * Aplica promoções aos itens do cardápio
 * @param {Array} items - Itens do cardápio
 * @param {Array} promocoes - Lista de promoções ativas
 * @returns {Array} Itens com promoções aplicadas
 */
export const aplicarPromocoesAosItens = (items, promocoes) => {
  if (!items || !promocoes || promocoes.length === 0) {
    return items;
  }

  return items.map(item => {
    const promocao = verificarPromocaoItem(item, promocoes);
    
    if (promocao) {
      return {
        ...item,
        promocao,
        valorOriginal: item.valor,
        valor: promocao.precoPromocional,
        price: promocao.precoPromocional, // Para compatibilidade com carrinho
        temPromocao: true
      };
    }

    return {
      ...item,
      temPromocao: false
    };
  });
};

/**
 * Busca promoções combo que podem ser aplicadas a uma combinação de itens
 * @param {Array} itensCarrinho - Itens no carrinho
 * @param {Array} promocoes - Lista de promoções ativas
 * @returns {Array} Promoções de combo aplicáveis
 */
export const verificarPromocoesCombo = (itensCarrinho, promocoes) => {
  if (!itensCarrinho || !promocoes || promocoes.length === 0) {
    return [];
  }

  const combosAplicaveis = [];

  for (const promocao of promocoes) {
    if (promocao.itens && promocao.itens.length > 1) {
      // Verificar se todos os itens do combo estão no carrinho
      const todosItensPresentes = promocao.itens.every(itemCombo => {
        return itensCarrinho.some(itemCarrinho => 
          itemCarrinho.id === itemCombo.id && 
          itemCarrinho.quantity >= itemCombo.quantity
        );
      });

      if (todosItensPresentes) {
        combosAplicaveis.push({
          ...promocao,
          tipo: 'combo',
          economiaTotal: promocao.precoOriginal - promocao.precoDesconto
        });
      }
    }
  }

  return combosAplicaveis;
};

/**
 * Calcula a porcentagem de desconto
 * @param {number} precoOriginal - Preço original
 * @param {number} precoPromocional - Preço promocional
 * @returns {number} Porcentagem de desconto
 */
export const calcularPorcentagemDesconto = (precoOriginal, precoPromocional) => {
  if (!precoOriginal || precoOriginal === 0) return 0;
  return Math.round(((precoOriginal - precoPromocional) / precoOriginal) * 100);
};

/**
 * Formata preço para exibição
 * @param {number} valor - Valor a ser formatado
 * @returns {string} Valor formatado
 */
export const formatarPreco = (valor) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(valor || 0);
};