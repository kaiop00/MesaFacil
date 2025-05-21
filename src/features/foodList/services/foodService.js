import { create, getAll } from '@/services/firebase/firestoreService';

/**
 * Lista os itens do cardápio, ordenados por data de criação (mais recente primeiro)
 */
export async function listarItensCardapio() {
  return await getAll('cardapio', { orderByField: 'criadoEm', order: 'desc' });
}

/**
 * Salva um novo item no cardápio
 * @param {object} formData
 */
export async function salvarNovoItem(formData) {
  const { nome, categorias, valor, descricao, imagemUrl } = formData;

  if (!nome || !valor || !imagemUrl || categorias.length === 0) {
    throw new Error('Preencha todos os campos obrigatórios.');
  }

  const data = {
    nome,
    descricao,
    valor: parseFloat(valor),
    categorias: categorias.map((c) => c.value),
    imagemUrl
  };

  return await create('cardapio', data);  
}
