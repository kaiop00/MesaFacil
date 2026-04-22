import { useMemo } from 'react';
import { useClienteCardapio } from '../context/CardapioClienteContext';

/**
 * Hook personalizado para trabalhar com promoções na visão do cliente
 * @returns {Object} Funções e dados relacionados às promoções
 */
export const usePromocoes = () => {
  const { promocoes, items } = useClienteCardapio();

  const promocoesAtivas = useMemo(() => {
    return promocoes;
  }, [promocoes]);

  const totalItensComPromocao = useMemo(() => {
    return items.filter(item => item.temPromocao).length;
  }, [items]);

  const totalEconomia = useMemo(() => {
    return items
      .filter(item => item.temPromocao)
      .reduce((acc, item) => {
        return acc + (item.valorOriginal - item.valor);
      }, 0);
  }, [items]);

  const getPromocaoPorItem = (itemId) => {
    const item = items.find(i => i.id === itemId);
    return item?.promocao || null;
  };

  const isItemEmPromocao = (itemId) => {
    const item = items.find(i => i.id === itemId);
    return item?.temPromocao || false;
  };

  return {
    promocoesAtivas,
    totalItensComPromocao,
    totalEconomia,
    getPromocaoPorItem,
    isItemEmPromocao
  };
};

export default usePromocoes;