import React, { useState } from 'react';

export default function CloseCaixaModal({ isOpen, onClose, onSubmit, loading, valorEsperado }) {
  const [valorContado, setValorContado] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!valorContado || parseFloat(valorContado) < 0) {
      alert('Digite um valor válido');
      return;
    }

    await onSubmit(parseFloat(valorContado));
    setValorContado('');
  };

  if (!isOpen) return null;

  const diferenca = (parseFloat(valorContado || 0) - parseFloat(valorEsperado || 0)).toFixed(2);
  const isDiferenca = Math.abs(diferenca) > 0.01;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-lg max-w-md w-full">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-bold">Fechar Caixa</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl">
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-700">
              <strong>Valor esperado em gaveta:</strong>
              <br />
              R$ {Number(valorEsperado || 0).toFixed(2)}
            </p>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Valor Contado em Gaveta (R$)
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={valorContado}
              onChange={(e) => setValorContado(e.target.value)}
              placeholder="0.00"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent text-lg font-semibold"
              disabled={loading}
              autoFocus
            />
          </div>

          {valorContado && (
            <div
              className={`rounded-lg p-4 border ${
                isDiferenca
                  ? 'bg-yellow-50 border-yellow-200'
                  : 'bg-green-50 border-green-200'
              }`}
            >
              <p className="text-sm text-gray-600">Diferença:</p>
              <p
                className={`text-2xl font-bold ${
                  isDiferenca ? 'text-yellow-700' : 'text-green-700'
                }`}
              >
                {diferenca > 0 ? '+' : ''} R$ {diferenca}
              </p>
              {isDiferenca && (
                <p className="text-xs text-yellow-600 mt-2">
                  ⚠️ Diferença detectada. Verifique o cálculo.
                </p>
              )}
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-semibold transition-all disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading || !valorContado}
              className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-semibold transition-all disabled:opacity-50"
            >
              {loading ? 'Fechando...' : 'Confirmar Fechamento'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
