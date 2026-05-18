import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import caixaService from '@/services/caixa/caixaService';

const LancamentoManual = () => {
  const navigate = useNavigate();
  const { idRestaurante, user } = useAuth();
  const [valor, setValor] = useState('0.00');
  const [forma, setForma] = useState('DINHEIRO');
  const [origem, setOrigem] = useState('BALCAO');
  const [descricao, setDescricao] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const submit = async (e) => {
    e.preventDefault();
    setError(null);

    const valorNum = parseFloat(valor || 0);
    if (isNaN(valorNum) || valorNum <= 0) {
      setError('Digite um valor válido');
      return;
    }

    setLoading(true);
    try {
      await caixaService.criarLancamentoManual({
        empresaId: idRestaurante,
        usuarioId: user?.uid,
        formaPagamento: forma,
        valor: valorNum,
        descricao,
        origem,
      });
      setValor('0.00');
      setDescricao('');
      navigate('/home/caixa');
    } catch (err) {
      setError(err.message || 'Erro ao registrar lançamento');
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
          <h1 className="text-3xl font-bold text-gray-800">Lançamento Manual</h1>
          <p className="text-gray-600 mt-1">Registre vendas ou pagamentos manuais</p>
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
      <form onSubmit={submit} className="bg-white rounded-lg border border-gray-200 shadow-sm p-8 space-y-6">
        {/* Valor */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-3">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xl">💵</span>
              Valor (R$)
            </div>
          </label>
          <input
            type="number"
            step="0.01"
            min="0"
            value={valor}
            onChange={(e) => setValor(e.target.value)}
            placeholder="0.00"
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg font-semibold"
            disabled={loading}
            autoFocus
            required
          />
        </div>

        {/* Forma de Pagamento */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-3">
            Forma de Pagamento
          </label>
          <select
            value={forma}
            onChange={(e) => setForma(e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            disabled={loading}
          >
            <option value="DINHEIRO">💵 Dinheiro</option>
            <option value="PIX">📱 PIX</option>
            <option value="CREDITO">💳 Crédito</option>
            <option value="DEBITO">💳 Débito</option>
            <option value="VR">🎟️ Vale Refeição</option>
            <option value="VA">🎟️ Vale Alimentação</option>
          </select>
        </div>

        {/* Origem */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-3">
            Origem
          </label>
          <select
            value={origem}
            onChange={(e) => setOrigem(e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            disabled={loading}
          >
            <option value="BALCAO">🏪 Balcão</option>
            <option value="IFOOD">🍔 iFood</option>
            <option value="UBER_EATS">🚗 Uber Eats</option>
            <option value="OUTROS">📌 Outros</option>
          </select>
        </div>

        {/* Descrição */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-3">
            Descrição (Opcional)
          </label>
          <textarea
            value={descricao}
            onChange={(e) => setDescricao(e.target.value)}
            placeholder="Ex: Venda de bebida, comanda extra..."
            rows="3"
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            disabled={loading}
          />
        </div>

        {/* Buttons */}
        <div className="flex gap-3 pt-4">
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
            className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold transition-all disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <span className="animate-spin">⏳</span>
                Registrando...
              </>
            ) : (
              <>
                ✅ Registrar Lançamento
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default LancamentoManual;
