import React from 'react';

const FORMA_ICONS = {
  DINHEIRO: '💵',
  PIX: '📱',
  CREDITO: '💳',
  DEBITO: '💳',
  VOUCHER: '🎫',
  IFOOD: '🛵',
};

const FORMA_COLORS = {
  DINHEIRO: 'bg-green-50 border-green-200 text-green-700',
  PIX: 'bg-purple-50 border-purple-200 text-purple-700',
  CREDITO: 'bg-blue-50 border-blue-200 text-blue-700',
  DEBITO: 'bg-orange-50 border-orange-200 text-orange-700',
  VOUCHER: 'bg-gray-50 border-gray-200 text-gray-700',
  IFOOD: 'bg-slate-50 border-slate-200 text-slate-700',
};

export default function TotaisPorForma({ totais }) {
  if (!totais) return null;

  return (
    <div>
      <h3 className="text-lg font-bold text-gray-800 mb-4">Resumo por Forma de Pagamento</h3>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {Object.entries(totais.porForma).map(([forma, valor]) => (
          <div
            key={forma}
            className={`rounded-lg p-4 border ${FORMA_COLORS[forma] || 'bg-gray-50 border-gray-200'}`}
          >
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xl">{FORMA_ICONS[forma]}</span>
              <span className="text-xs font-semibold uppercase">{forma}</span>
            </div>
            <p className="text-lg font-bold">R$ {Number(valor || 0).toFixed(2)}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
