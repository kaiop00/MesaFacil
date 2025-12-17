import Dexie from 'dexie';

/**
 * IndexedDB configuration using Dexie
 * Database: mesaFacilDB
 * Store: clientes - armazena dados do cliente para auto-preenchimento
 */
export const db = new Dexie('mesaFacilDB');

// Define schema
db.version(1).stores({
  clientes: 'id, nome, cpf, endereco, telefone'
});

/**
 * Interface do cliente
 * @typedef {Object} ClienteData
 * @property {number} id - ID do cliente (use 1 para single-user device)
 * @property {string} nome - Nome completo
 * @property {string} cpf - CPF (apenas números)
 * @property {string} endereco - Endereço completo para entrega
 * @property {string} telefone - Telefone com DDD
 */

/**
 * Salva ou atualiza dados do cliente no IndexedDB
 * @param {ClienteData} clienteData 
 * @returns {Promise<number>} ID do registro salvo
 */
export async function saveClienteData(clienteData) {
  try {
    const id = await db.clientes.put({
      id: 1, // Single user device
      ...clienteData
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
  } catch (error) {
    console.error('Erro ao limpar dados do cliente:', error);
    throw error;
  }
}

export default db;
