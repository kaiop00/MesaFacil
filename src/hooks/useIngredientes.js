import { useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import * as ingredientesService from '@/services/ingredientes/ingredientesService';
import { useToast } from '@/hooks/useToast';

export const useIngredientes = () => {
  const { idRestaurante } = useAuth();
  const { notify } = useToast();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const adicionarIngredientes = useCallback(async (cardapioId, ingredientes) => {
    if (!idRestaurante) throw new Error('ID do restaurante não encontrado');
    
    setLoading(true);
    setError(null);
    
    try {
      await ingredientesService.adicionarIngredientes(idRestaurante, cardapioId, ingredientes);
      notify('Ingredientes adicionados com sucesso!', 'success');
      return true;
    } catch (err) {
      console.error('Erro ao adicionar ingredientes:', err);
      setError(err.message);
      notify('Erro ao adicionar ingredientes', 'error');
      return false;
    } finally {
      setLoading(false);
    }
  }, [idRestaurante, notify]);

  const buscarIngredientes = useCallback(async (cardapioId) => {
    if (!idRestaurante) throw new Error('ID do restaurante não encontrado');
    
    setLoading(true);
    setError(null);
    
    try {
      const ingredientes = await ingredientesService.buscarIngredientes(idRestaurante, cardapioId);
      return ingredientes;
    } catch (err) {
      console.error('Erro ao buscar ingredientes:', err);
      setError(err.message);
      notify('Erro ao buscar ingredientes', 'error');
      return [];
    } finally {
      setLoading(false);
    }
  }, [idRestaurante, notify]);

  const removerIngredientes = useCallback(async (cardapioId) => {
    if (!idRestaurante) throw new Error('ID do restaurante não encontrado');
    
    setLoading(true);
    setError(null);
    
    try {
      await ingredientesService.removerIngredientes(idRestaurante, cardapioId);
      notify('Ingredientes removidos com sucesso!', 'success');
      return true;
    } catch (err) {
      console.error('Erro ao remover ingredientes:', err);
      setError(err.message);
      notify('Erro ao remover ingredientes', 'error');
      return false;
    } finally {
      setLoading(false);
    }
  }, [idRestaurante, notify]);

  const calcularConsumoIngredientes = useCallback(async (itensPedido) => {
    if (!idRestaurante) throw new Error('ID do restaurante não encontrado');
    
    setLoading(true);
    setError(null);
    
    try {
      const consumo = await ingredientesService.calcularConsumoIngredientes(idRestaurante, itensPedido);
      return consumo;
    } catch (err) {
      console.error('Erro ao calcular consumo:', err);
      setError(err.message);
      return [];
    } finally {
      setLoading(false);
    }
  }, [idRestaurante]);

  const verificarEstoqueDisponivel = useCallback(async (itensPedido) => {
    if (!idRestaurante) throw new Error('ID do restaurante não encontrado');
    
    setLoading(true);
    setError(null);
    
    try {
      const verificacao = await ingredientesService.verificarEstoqueDisponivel(idRestaurante, itensPedido);
      return verificacao;
    } catch (err) {
      console.error('Erro ao verificar estoque:', err);
      setError(err.message);
      return { podeProcessar: false, verificacoes: [] };
    } finally {
      setLoading(false);
    }
  }, [idRestaurante]);

  const processarBaixaEstoque = useCallback(async (consumoIngredientes, pedidoId) => {
    if (!idRestaurante) throw new Error('ID do restaurante não encontrado');
    
    setLoading(true);
    setError(null);
    
    try {
      const resultado = await ingredientesService.processarBaixaEstoque(
        idRestaurante, 
        consumoIngredientes, 
        pedidoId
      );
      notify('Baixa no estoque processada com sucesso!', 'success');
      return resultado;
    } catch (err) {
      console.error('Erro ao processar baixa no estoque:', err);
      setError(err.message);
      notify(`Erro ao processar baixa no estoque: ${err.message}`, 'error');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [idRestaurante, notify]);

  return {
    loading,
    error,
    adicionarIngredientes,
    buscarIngredientes,
    removerIngredientes,
    calcularConsumoIngredientes,
    verificarEstoqueDisponivel,
    processarBaixaEstoque
  };
};