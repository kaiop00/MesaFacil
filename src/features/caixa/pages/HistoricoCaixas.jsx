import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import * as firestore from '@/services/firebase/firestoreService';

const HistoricoCaixas = () => {
  const navigate = useNavigate();
  const { idRestaurante } = useAuth();
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        if (!idRestaurante) return;
        const all = await firestore.getAll(idRestaurante, 'caixaSessions', { orderByField: 'dataAbertura', order: 'desc' });
        setSessions(all || []);
      } finally {
        setLoading(false);
      }
    })();
  }, [idRestaurante]);

  const getStatusColor = (status) => {
    switch (status) {
      case 'ABERTO':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'FECHADO':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'DIFERENCA':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getDiferencaColor = (diferenca) => {
    const diff = parseFloat(diferenca || 0);
    if (Math.abs(diff) < 0.01) return 'text-green-700 font-bold';
    if (diff > 0) return 'text-blue-700 font-bold';
    return 'text-red-700 font-bold';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin inline-block text-4xl mb-4">⏳</div>
          <p className="text-gray-600">Carregando histórico...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/home/caixa')}
          className="p-2 hover:bg-gray-100 rounded-lg transition-all text-gray-600 text-2xl"
        >
          ←
        </button>
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Histórico de Caixas</h1>
          <p className="text-gray-600 mt-1">Sessões abertas e fechadas</p>
        </div>
      </div>

      {/* Tabela */}
      {sessions.length === 0 ? (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 text-center">
          <p className="text-lg font-semibold text-blue-900">Nenhuma sessão encontrada</p>
          <p className="text-sm text-blue-700 mt-2">Abra um caixa para começar</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Data/Hora</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Status</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-gray-700 uppercase">Valor Inicial</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-gray-700 uppercase">Valor Contado</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-gray-700 uppercase">Diferença</th>
                </tr>
              </thead>
              <tbody>
                {sessions.map((s, idx) => (
                  <tr key={s.id} className={`border-b border-gray-200 ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                    <td className="px-6 py-4 text-sm">
                      <div className="font-medium text-gray-900">
                        {new Date(s.dataAbertura).toLocaleString('pt-BR')}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold border ${getStatusColor(s.status)}`}>
                        <span className="text-lg">
                          {s.status === 'FECHADO' ? '✅' : s.status === 'ABERTO' ? '🟢' : '❌'}
                        </span>
                        {s.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-right text-gray-900">
                      R$ {Number(s.valorInicial || 0).toFixed(2)}
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-right text-gray-900">
                      R$ {Number(s.valorInformadoFechamento || 0).toFixed(2)}
                    </td>
                    <td className={`px-6 py-4 text-sm text-right ${getDiferencaColor(s.diferenca)}`}>
                      {parseFloat(s.diferenca || 0) > 0 ? '+' : ''}
                      R$ {Number(s.diferenca || 0).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Resumo */}
      {sessions.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-700 font-semibold">Total de Sessões</p>
            <p className="text-3xl font-bold text-blue-900">{sessions.length}</p>
          </div>
          <div className="bg-gradient-to-br from-green-50 to-green-100 border border-green-200 rounded-lg p-4">
            <p className="text-sm text-green-700 font-semibold">Fechadas</p>
            <p className="text-3xl font-bold text-green-900">{sessions.filter(s => s.status === 'FECHADO').length}</p>
          </div>
          <div className="bg-gradient-to-br from-red-50 to-red-100 border border-red-200 rounded-lg p-4">
            <p className="text-sm text-red-700 font-semibold">Abertas</p>
            <p className="text-3xl font-bold text-red-900">{sessions.filter(s => s.status === 'ABERTO').length}</p>
          </div>
        </div>
      )}

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

export default HistoricoCaixas;
