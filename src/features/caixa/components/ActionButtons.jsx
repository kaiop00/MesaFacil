import React from 'react';
import { Link } from 'react-router-dom';

export default function ActionButtons({ 
  sessionOpen, 
  onMovimentacao, 
  onFechar,
  onPrintReport,
  closureReport,
  loading 
}) {
  const buttonClasses = 'flex items-center gap-2 px-4 py-2 rounded-lg font-semibold transition-all text-sm md:text-base';
  const primaryClass = 'bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50';
  const successClass = 'bg-green-600 text-white hover:bg-green-700 disabled:opacity-50';
  const warningClass = 'bg-orange-600 text-white hover:bg-orange-700 disabled:opacity-50';
  const dangerClass = 'bg-red-600 text-white hover:bg-red-700 disabled:opacity-50';

  return (
    <div className="space-y-6">
      {/* Ações Principais */}
      <div>
        <h3 className="text-lg font-bold text-gray-800 mb-4">Ações Principais</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {!sessionOpen ? (
            <>
              <Link to="/home/caixa/abrir" className="w-full">
                <button className={`w-full ${buttonClasses} ${successClass}`}>
                  ➕ Abrir Caixa
                </button>
              </Link>
              {closureReport?.report && (
                <button
                  type="button"
                  onClick={onPrintReport}
                  className={`w-full ${buttonClasses} bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-50`}
                >
                  🖨️ Imprimir Relatório
                </button>
              )}
            </>
          ) : (
            <button 
              onClick={onFechar} 
              disabled={loading}
              className={`w-full ${buttonClasses} ${dangerClass}`}
            >
              🚪 Fechar Caixa
            </button>
          )}
        </div>
      </div>

      {/* Movimentações */}
      {sessionOpen && (
        <div>
          <h3 className="text-lg font-bold text-gray-800 mb-4">Movimentações</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <button
              onClick={() => onMovimentacao('SANGRIA')}
              disabled={loading}
              className={`${buttonClasses} ${dangerClass}`}
            >
              📉 Sangria
            </button>
            <button
              onClick={() => onMovimentacao('SUPRIMENTO')}
              disabled={loading}
              className={`${buttonClasses} ${warningClass}`}
            >
              📈 Suprimento
            </button>
            <button
              onClick={() => onMovimentacao('ENTRADA_EXTRA')}
              disabled={loading}
              className={`${buttonClasses} ${successClass}`}
            >
              ➕ Entrada Extra
            </button>
          </div>
        </div>
      )}

      {/* Consultas e Relatórios */}
      {sessionOpen && (
        <div>
          <h3 className="text-lg font-bold text-gray-800 mb-4">Consultas e Relatórios</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Link to="/home/caixa/lancamento" className="w-full">
              <button className={`w-full ${buttonClasses} ${primaryClass}`}>
                📝 Lançamento Manual
              </button>
            </Link>
            <Link to="/home/caixa/movimentacoes" className="w-full">
              <button className={`w-full ${buttonClasses} ${primaryClass}`}>
                🔄 Ver Movimentações
              </button>
            </Link>
            <Link to="/home/caixa/historico" className="w-full">
              <button className={`w-full ${buttonClasses} ${primaryClass}`}>
                📋 Histórico de Caixas
              </button>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
