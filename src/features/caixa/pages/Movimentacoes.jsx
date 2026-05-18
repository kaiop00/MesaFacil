import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import caixaService from '@/services/caixa/caixaService';

const Movimentacoes = () => {
  const navigate = useNavigate();
  const { idRestaurante } = useAuth();
  const [session, setSession] = useState(null);
  const [totais, setTotais] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      if (!idRestaurante) {
        setLoading(false);
        return;
      }
      try {
        const aberto = await caixaService.getOpenSession(idRestaurante);
        setSession(aberto);
        if (aberto) {
          const t = await caixaService.calcularTotaisSessao(idRestaurante, aberto.id);
          setTotais(t);
        }
      } finally {
        setLoading(false);
      }
    })();
  }, [idRestaurante]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin inline-block text-4xl mb-4">⏳</div>
          <p className="text-gray-600">Carregando movimentações...</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/home/caixa')}
            className="p-2 hover:bg-gray-100 rounded-lg transition-all text-gray-600"
          >
            <ArrowLeft size={24} />
          </button>
          <h1 className="text-3xl font-bold text-gray-800">Movimentações</h1>
        </div>
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
          <p className="text-lg font-semibold text-yellow-900">Nenhum caixa aberto</p>
          <p className="text-sm text-yellow-700 mt-2">Abra um caixa para registrar movimentações</p>
        </div>
      </div>
    );
  }

  const movimentacoes = [
    { label: 'Suprimentos', valor: totais?.suprimentos || 0, icon: '📈', color: 'bg-green-50 border-green-200' },
    { label: 'Sangrias', valor: totais?.sangrias || 0, icon: '📉', color: 'bg-red-50 border-red-200' },
    { label: 'Entradas Extras', valor: totais?.entradasExtras || 0, icon: '➕', color: 'bg-blue-50 border-blue-200' },
  ];

  const saldoLiquido = (Number(totais?.suprimentos || 0) - Number(totais?.sangrias || 0) + Number(totais?.entradasExtras || 0)).toFixed(2);

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/home/caixa')}
          className="p-2 hover:bg-gray-100 rounded-lg transition-all text-gray-600 text-2xl"
        >
          ←
        </button>
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Movimentações</h1>
          <p className="text-gray-600 mt-1">Resumo de suprimentos, sangrias e entradas</p>
        </div>
      </div>

      {/* Cards de Movimentações */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {movimentacoes.map((mov, idx) => (
          <div
            key={idx}
            className={`rounded-lg p-6 border ${mov.color}`}
          >
            <div className="flex items-center gap-3 mb-4">
              <span className="text-2xl">{mov.icon}</span>
              <span className="font-semibold text-gray-800">{mov.label}</span>
            </div>
            <p className="text-3xl font-bold text-gray-800">
              R$ {Number(mov.valor).toFixed(2)}
            </p>
          </div>
        ))}
      </div>

      {/* Saldo Líquido */}
      <div className="bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200 rounded-lg p-6">
        <p className="text-sm text-purple-700 font-semibold mb-2">Saldo Líquido de Movimentações</p>
        <p className="text-4xl font-bold text-purple-900">R$ {saldoLiquido}</p>
        <p className="text-xs text-purple-600 mt-2">
          (Suprimentos - Sangrias + Entradas Extras)
        </p>
      </div>

      {/* Info Box */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-800">
          <strong>💡 Dica:</strong> Use a tela principal "Caixa Atual" para registrar novas movimentações.
        </p>
      </div>

      {/* Botão voltar */}
      <button
        onClick={() => navigate('/home/caixa')}
        className="w-full px-4 py-3 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 font-semibold transition-all"
      >
        Voltar ao Caixa
      </button>
    </div>
  );
};

export default Movimentacoes;
