import { create, getAll } from '@/services/firebase/firestoreService';
import { useAuth } from '@/contexts/AuthContext';

export function useFoodService() {
  const { idRestaurante } = useAuth();

  const listarItensCardapio = async () => {
    return await getAll(idRestaurante, 'cardapio', { orderByField: 'criadoEm', order: 'desc' });
  };

  const salvarNovoItem = async (formData) => {
    const { nome, categorias, valor, descricao, imagemUrl, alergias } = formData;

    if (!nome || !valor || !imagemUrl || categorias.length === 0) {
      throw new Error('Preencha todos os campos obrigatórios.');
    }

    const data = {
      nome,
      descricao,
      valor: parseFloat(valor),
      categorias: categorias.map((c) => c.value),
      imagemUrl,
      alergias: alergias || []
    };

    return await create(idRestaurante, 'cardapio', data);
  };

  return { listarItensCardapio, salvarNovoItem };
}
