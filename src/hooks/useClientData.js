import { useState, useEffect } from 'react';
import { getClienteData, saveClienteData } from '@/config/dexieConfig';

/**
 * Hook para gerenciar dados do cliente no IndexedDB
 * @returns {Object} { clientData, loadClientData, saveClient, loading, error }
 */
export function useClientData() {
  const [clientData, setClientData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Carrega dados do cliente ao montar o componente
  useEffect(() => {
    loadClientData();
  }, []);

  /**
   * Carrega dados do cliente do IndexedDB
   */
  const loadClientData = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getClienteData();
      setClientData(data);
    } catch (err) {
      console.error('Erro ao carregar dados do cliente:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Salva dados do cliente no IndexedDB
   * @param {Object} data - { nome, cpf, endereco, telefone }
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

  return {
    clientData,
    loadClientData,
    saveClient,
    loading,
    error
  };
}

export default useClientData;
