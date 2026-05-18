import React, { useState } from 'react';

export default function MovimentacaoModal({ isOpen, onClose, onSubmit, tipoMovimentacao, loading }) {
  const [valor, setValor] = useState('');
  const [descricao, setDescricao] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!valor || parseFloat(valor) <= 0) {
      alert('Digite um valor válido');
      return;
    }
    onSubmit(parseFloat(valor), descricao);
    setValor('');
    setDescricao('');
  };

  if (!isOpen) return null;

  const tiposLabels = {
    SANGRIA: 'Sangria de Caixa',
    SUPRIMENTO: 'Suprimento de Caixa',
    ENTRADA_EXTRA: 'Entrada Extra',
  };

  const tiposDescriptions = {
    SANGRIA: 'Retirada de dinheiro do caixa',
    SUPRIMENTO: 'Adição de dinheiro ao caixa',
    ENTRADA_EXTRA: 'Entrada de dinheiro externa',
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-lg max-w-md w-full">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-bold">{tiposLabels[tipoMovimentacao]}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl">
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <p className="text-sm text-gray-600 mb-4">
            {tiposDescriptions[tipoMovimentacao]}
          </p>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Valor (R$)
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={valor}
              onChange={(e) => setValor(e.target.value)}
              placeholder="0.00"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={loading}
              autoFocus
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Descrição (Opcional)
            </label>
            <textarea
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              placeholder="Digite uma descrição..."
              rows="3"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              disabled={loading}
            />
          </div>

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
              disabled={loading}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold transition-all disabled:opacity-50"
            >
              {loading ? 'Registrando...' : 'Registrar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
