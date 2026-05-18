import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import caixaService from '@/services/caixa/caixaService';

const AbrirCaixa = () => {
  const navigate = useNavigate();
  const { idRestaurante, user } = useAuth();
  const [valorInicial, setValorInicial] = useState('0.00');
  const [observacoes, setObservacoes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const valor = parseFloat(valorInicial || 0);
      if (isNaN(valor) || valor < 0) {
        setError('Digite um valor inicial válido');
        setLoading(false);
        return;
      }

      await caixaService.abrirCaixa({
        empresaId: idRestaurante,
        usuarioId: user?.uid,
        valorInicial: valor,
        observacoes,
      });

      setValorInicial('0.00');
      setObservacoes('');
      navigate('/home/caixa');
    } catch (err) {
      setError(err.message || 'Erro ao abrir caixa');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/home/caixa')}
          className="p-2 hover:bg-gray-100 rounded-lg transition-all text-gray-600 text-2xl"
        >
          ←
        </button>
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Abrir Caixa</h1>
          <p className="text-gray-600 mt-1">Configure o valor inicial e as observações</p>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-800">
          <p className="font-semibold">Erro</p>
          <p className="text-sm">{error}</p>
        </div>
      )}

      {/* Form Card */}
      <form onSubmit={handleSubmit} className="bg-white rounded-lg border border-gray-200 shadow-sm p-8">
        {/* Valor Inicial */}
        <div className="mb-6">
          <label className="block text-sm font-semibold text-gray-700 mb-3">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xl">💵</span>
              Valor Inicial (R$)
            </div>
          </label>
          <input
            type="number"
            step="0.01"
            min="0"
            value={valorInicial}
            onChange={(e) => setValorInicial(e.target.value)}
            placeholder="0.00"
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-lg font-semibold"
            disabled={loading}
            autoFocus
          />
          <p className="text-xs text-gray-500 mt-2">
            Digite o valor inicial que está na gaveta (dinheiro físico)
          </p>
        </div>

        {/* Observações */}
        <div className="mb-8">
          <label className="block text-sm font-semibold text-gray-700 mb-3">
            Observações (Opcional)
          </label>
          <textarea
            value={observacoes}
            onChange={(e) => setObservacoes(e.target.value)}
            placeholder="Ex: Caixa aberto após reposição, mudança de operador..."
            rows="4"
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent resize-none"
            disabled={loading}
          />
          <p className="text-xs text-gray-500 mt-2">
            Adicione observações relevantes sobre a abertura do caixa
          </p>
        </div>

        {/* Buttons */}
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => navigate('/home/caixa')}
            disabled={loading}
            className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-semibold transition-all disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={loading}
            className="flex-1 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold transition-all disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <span className="animate-spin">⏳</span>
                Abrindo...
              </>
            ) : (
              <>
                ✅ Abrir Caixa
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default AbrirCaixa;
