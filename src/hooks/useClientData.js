import { useState, useEffect } from 'react';
import { 
  getClienteData, 
  saveClienteData,
  getEnderecos,
  addEndereco,
  updateEndereco,
  deleteEndereco,
  setEnderecoDefault,
  getEnderecoDefault
} from '@/config/dexieConfig';

/**
 * Hook para gerenciar dados do cliente e endereços no IndexedDB
 * @returns {Object} { clientData, enderecos, selectedEndereco, loading, error, ... }
 */
export function useClientData() {
  const [clientData, setClientData] = useState(null);
  const [enderecos, setEnderecos] = useState([]);
  const [selectedEnderecoId, setSelectedEnderecoId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Carrega dados do cliente ao montar o componente
  useEffect(() => {
    loadClientData();
  }, []);

  /**
   * Carrega dados do cliente e endereços do IndexedDB
   */
  const loadClientData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const [data, enderecosData, enderecoDefault] = await Promise.all([
        getClienteData(),
        getEnderecos(),
        getEnderecoDefault()
      ]);
      
      setClientData(data);
      setEnderecos(enderecosData);
      
      // Seleciona o endereço padrão ou o primeiro da lista
      if (enderecoDefault) {
        setSelectedEnderecoId(enderecoDefault.id);
      } else if (enderecosData.length > 0) {
        setSelectedEnderecoId(enderecosData[0].id);
      }
    } catch (err) {
      console.error('Erro ao carregar dados do cliente:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Salva dados do cliente no IndexedDB
   * @param {Object} data - { nome, cpf, telefone }
   */
  const saveClient = async (data) => {
    try {
      setError(null);
      await saveClienteData(data);
      setClientData(data);
      return true;
    } catch (err) {
      console.error('Erro ao salvar dados do cliente:', err);
      setError(err.message);
      return false;
    }
  };

  /**
   * Adiciona um novo endereço
   * @param {Object} enderecoData - { apelido, endereco, isDefault }
   */
  const addNewEndereco = async (enderecoData) => {
    try {
      setError(null);
      const id = await addEndereco(enderecoData);
      await loadClientData(); // Recarrega lista
      setSelectedEnderecoId(id);
      return id;
    } catch (err) {
      console.error('Erro ao adicionar endereço:', err);
      setError(err.message);
      return null;
    }
  };

  /**
   * Atualiza um endereço existente
   * @param {number} id - ID do endereço
   * @param {Object} enderecoData - { apelido, endereco, isDefault }
   */
  const updateEnderecoData = async (id, enderecoData) => {
    try {
      setError(null);
      await updateEndereco(id, enderecoData);
      await loadClientData(); // Recarrega lista
      return true;
    } catch (err) {
      console.error('Erro ao atualizar endereço:', err);
      setError(err.message);
      return false;
    }
  };

  /**
   * Remove um endereço
   * @param {number} id - ID do endereço
   */
  const removeEndereco = async (id) => {
    try {
      setError(null);
      await deleteEndereco(id);
      
      // Se estava selecionado, seleciona outro
      if (selectedEnderecoId === id) {
        const remaining = enderecos.filter(e => e.id !== id);
        if (remaining.length > 0) {
          setSelectedEnderecoId(remaining[0].id);
        } else {
          setSelectedEnderecoId(null);
        }
      }
      
      await loadClientData(); // Recarrega lista
      return true;
    } catch (err) {
      console.error('Erro ao remover endereço:', err);
      setError(err.message);
      return false;
    }
  };

  /**
   * Define um endereço como padrão
   * @param {number} id - ID do endereço
   */
  const setDefault = async (id) => {
    try {
      setError(null);
      await setEnderecoDefault(id);
      await loadClientData(); // Recarrega lista
      return true;
    } catch (err) {
      console.error('Erro ao definir endereço padrão:', err);
      setError(err.message);
      return false;
    }
  };

  /**
   * Seleciona um endereço para uso
   * @param {number} id - ID do endereço
   */
  const selectEndereco = (id) => {
    setSelectedEnderecoId(id);
  };

  // Endereço atualmente selecionado
  const selectedEndereco = enderecos.find(e => e.id === selectedEnderecoId) || null;

  return {
    clientData,
    enderecos,
    selectedEndereco,
    selectedEnderecoId,
    loadClientData,
    saveClient,
    addNewEndereco,
    updateEnderecoData,
    removeEndereco,
    setDefault,
    selectEndereco,
    loading,
    error
  };
}

export default useClientData;
