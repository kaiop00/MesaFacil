import React from 'react';

export default function SessionHeader({ session, totais }) {
  if (!session) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
        <p className="text-lg font-semibold text-yellow-900">Nenhum caixa aberto</p>
        <p className="text-sm text-yellow-700 mt-2">Abra um novo caixa para começar</p>
      </div>
    );
  }

  const valorEsperado = (
    (Number(session.valorInicial || 0) +
      Number(totais?.vendasDinheiro || 0) +
      Number(totais?.suprimentos || 0) +
      Number(totais?.entradasExtras || 0) -
      Number(totais?.sangrias || 0)) || 0
  ).toFixed(2);

  return (
    <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold text-gray-800">Caixa Aberto</h2>
        <span className="px-3 py-1 bg-green-100 text-green-800 text-sm font-semibold rounded-full">
          Ativo
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg p-4 border border-green-100">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-2xl">🕐</span>
            <span className="text-sm text-gray-600">Data/Hora</span>
          </div>
          <p className="text-lg font-semibold text-gray-800">
            {new Date(session.dataAbertura).toLocaleString('pt-BR')}
          </p>
        </div>

        <div className="bg-white rounded-lg p-4 border border-green-100">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-2xl">💵</span>
            <span className="text-sm text-gray-600">Valor Inicial</span>
          </div>
          <p className="text-lg font-semibold text-gray-800">
            R$ {Number(session.valorInicial || 0).toFixed(2)}
          </p>
        </div>

        <div className="bg-white rounded-lg p-4 border border-green-100">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-2xl">💰</span>
            <span className="text-sm text-gray-600">Esperado em Gaveta</span>
          </div>
          <p className="text-lg font-semibold text-gray-800">R$ {valorEsperado}</p>
        </div>
      </div>

      {session.observacoes && (
        <div className="mt-4 p-3 bg-white border border-green-100 rounded text-sm text-gray-700">
          <strong>Obs:</strong> {session.observacoes}
        </div>
      )}
    </div>
  );
}
