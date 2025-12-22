import Dexie from 'dexie';

/**
 * IndexedDB configuration using Dexie
 * Database: mesaFacilDB
 * Stores:
 *   - clientes: dados básicos do cliente (nome, cpf, telefone)
 *   - enderecos: múltiplos endereços salvos com apelidos
 */
export const db = new Dexie('mesaFacilDB');

// Define schema - versão 2 adiciona store de endereços
db.version(1).stores({
  clientes: 'id, nome, cpf, endereco, telefone'
});

db.version(2).stores({
  clientes: 'id, nome, cpf, telefone',
  enderecos: '++id, clienteId, apelido, endereco, isDefault'
}).upgrade(tx => {
  // Migração: move o endereço antigo para a nova store
  return tx.table('clientes').toCollection().modify(async (cliente) => {
    if (cliente.endereco) {
      await tx.table('enderecos').add({
        clienteId: 1,
        apelido: 'Casa',
        endereco: cliente.endereco,
        isDefault: true
      });
      delete cliente.endereco;
    }
  });
});

/**
 * Interface do cliente
 * @typedef {Object} ClienteData
 * @property {number} id - ID do cliente (use 1 para single-user device)
 * @property {string} nome - Nome completo
 * @property {string} cpf - CPF (apenas números)
 * @property {string} telefone - Telefone com DDD
 */

/**
 * Interface do endereço
 * @typedef {Object} EnderecoData
 * @property {number} id - ID auto-incrementado
 * @property {number} clienteId - ID do cliente (sempre 1)
 * @property {string} apelido - Nome do endereço (Casa, Trabalho, etc.)
 * @property {string} endereco - Endereço completo para entrega
 * @property {boolean} isDefault - Se é o endereço padrão
 */

/**
 * Salva ou atualiza dados do cliente no IndexedDB
 * @param {ClienteData} clienteData 
 * @returns {Promise<number>} ID do registro salvo
 */
export async function saveClienteData(clienteData) {
  try {
    // Remove endereco do objeto se existir (agora vai para outra store)
    const { endereco, ...clienteWithoutEndereco } = clienteData;
    const id = await db.clientes.put({
      id: 1, // Single user device
      ...clienteWithoutEndereco
    });
    return id;
  } catch (error) {
    console.error('Erro ao salvar dados do cliente:', error);
    throw error;
  }
}

/**
 * Recupera dados do cliente do IndexedDB
 * @returns {Promise<ClienteData|null>}
 */
export async function getClienteData() {
  try {
    const cliente = await db.clientes.get(1);
    return cliente || null;
  } catch (error) {
    console.error('Erro ao recuperar dados do cliente:', error);
    return null;
  }
}

/**
 * Limpa dados do cliente (útil para logout/reset)
 * @returns {Promise<void>}
 */
export async function clearClienteData() {
  try {
    await db.clientes.clear();
    await db.enderecos.clear();
  } catch (error) {
    console.error('Erro ao limpar dados do cliente:', error);
    throw error;
  }
}

// ============================================
// FUNÇÕES PARA GERENCIAR ENDEREÇOS
// ============================================

/**
 * Adiciona um novo endereço para o cliente
 * @param {Object} enderecoData - { apelido, endereco, isDefault }
 * @returns {Promise<number>} ID do endereço criado
 */
export async function addEndereco(enderecoData) {
  try {
    // Se for definido como padrão, remove o padrão dos outros
    if (enderecoData.isDefault) {
      await db.enderecos
        .where('clienteId')
        .equals(1)
        .modify({ isDefault: false });
    }
    
    const id = await db.enderecos.add({
      clienteId: 1,
      apelido: enderecoData.apelido || 'Novo Endereço',
      endereco: enderecoData.endereco,
      isDefault: enderecoData.isDefault || false
    });
    return id;
  } catch (error) {
    console.error('Erro ao adicionar endereço:', error);
    throw error;
  }
}

/**
 * Atualiza um endereço existente
 * @param {number} id - ID do endereço
 * @param {Object} enderecoData - { apelido, endereco, isDefault }
 * @returns {Promise<number>} Número de registros atualizados
 */
export async function updateEndereco(id, enderecoData) {
  try {
    // Se for definido como padrão, remove o padrão dos outros
    if (enderecoData.isDefault) {
      await db.enderecos
        .where('clienteId')
        .equals(1)
        .modify({ isDefault: false });
    }
    
    const updated = await db.enderecos.update(id, enderecoData);
    return updated;
  } catch (error) {
    console.error('Erro ao atualizar endereço:', error);
    throw error;
  }
}

/**
 * Remove um endereço
 * @param {number} id - ID do endereço
 * @returns {Promise<void>}
 */
export async function deleteEndereco(id) {
  try {
    await db.enderecos.delete(id);
  } catch (error) {
    console.error('Erro ao remover endereço:', error);
    throw error;
  }
}

/**
 * Lista todos os endereços do cliente
 * @returns {Promise<EnderecoData[]>}
 */
export async function getEnderecos() {
  try {
    const enderecos = await db.enderecos
      .where('clienteId')
      .equals(1)
      .toArray();
    return enderecos;
  } catch (error) {
    console.error('Erro ao listar endereços:', error);
    return [];
  }
}

/**
 * Obtém o endereço padrão do cliente
 * @returns {Promise<EnderecoData|null>}
 */
export async function getEnderecoDefault() {
  try {
    const endereco = await db.enderecos
      .where({ clienteId: 1, isDefault: true })
      .first();
    return endereco || null;
  } catch (error) {
    console.error('Erro ao obter endereço padrão:', error);
    return null;
  }
}

/**
 * Define um endereço como padrão
 * @param {number} id - ID do endereço
 * @returns {Promise<void>}
 */
export async function setEnderecoDefault(id) {
  try {
    // Remove padrão de todos
    await db.enderecos
      .where('clienteId')
      .equals(1)
      .modify({ isDefault: false });
    
    // Define o novo padrão
    await db.enderecos.update(id, { isDefault: true });
  } catch (error) {
    console.error('Erro ao definir endereço padrão:', error);
    throw error;
  }
}

export default db;
