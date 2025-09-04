import { FileDocument, DownloadPackage, TrendingDown, Note } from "react-coolicons";
import BaseModalWithHeader from "@/components/BaseModalWithHeader";

const MovementDetailsModal = ({
  isOpen,
  onClose,
  onEdit,
  movement = null,
  loading = false,
}) => {
  const handleEdit = () => {
    onEdit?.(movement);
  };

  const handleCancel = () => {
    onClose?.();
  };

  if (!movement) return null;

  const isMovimentoPedido = movement.pedidoReferencia && !movement.pedidoReferencia.startsWith('CANCELAMENTO');
  const isMovimentoCancelamento = movement.pedidoReferencia && movement.pedidoReferencia.startsWith('CANCELAMENTO');

  return (
    <BaseModalWithHeader
      isOpen={isOpen}
      onClose={handleCancel}
      title="Detalhes da Movimentação"
      subTitle={isMovimentoPedido ? "Consumo automatico por pedido" : isMovimentoCancelamento ? "Reversão por cancelamento" : "Movimentação manual"}
      icon={isMovimentoPedido ? Note : FileDocument}
    >
      <div className="space-y-6">
        {/* Alert para movimentos de pedido */}
        {(isMovimentoPedido || isMovimentoCancelamento) && (
          <div className={`p-3 rounded-lg border ${isMovimentoCancelamento ? 'bg-red-50 border-red-200' : 'bg-blue-50 border-blue-200'}`}>
            <div className="flex items-center space-x-2">
              <DownloadPackage className={`w-4 h-4 ${isMovimentoCancelamento ? 'text-red-600' : 'text-blue-600'}`} />
              <span className={`text-sm font-medium ${isMovimentoCancelamento ? 'text-red-800' : 'text-blue-800'}`}>
                {isMovimentoCancelamento ? 'Estorno por Cancelamento' : 'Consumo Automático'}
              </span>
            </div>
            <p className={`text-xs mt-1 ${isMovimentoCancelamento ? 'text-red-700' : 'text-blue-700'}`}>
              {isMovimentoCancelamento
                ? 'Esta movimentação foi gerada pelo cancelamento de um pedido'
                : 'Esta movimentação foi gerada automaticamente quando um pedido foi confirmado'
              }
            </p>
          </div>
        )}

        {/* Name */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Item
          </label>
          <div className="text-gray-900 font-medium">
            {movement.itemNome || "N/A"}
          </div>
          {movement.marca && (
            <div className="text-sm text-gray-500 mt-1">
              Marca: {movement.marca}
            </div>
          )}
        </div>

        {/* Movement Type and Reference */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tipo de Movimentação
            </label>
            <div className="flex items-center space-x-2">
              <span
                className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                  movement.tipoMovimentacao?.includes('Pedido')
                    ? 'bg-orange-100 text-orange-800'
                    : movement.tipoMovimentacao?.includes('CANCELAMENTO')
                    ? 'bg-red-100 text-red-800'
                    : movement.tipoMovimentacao?.includes('Entrada')
                    ? 'bg-green-100 text-green-800'
                    : 'bg-gray-100 text-gray-800'
                }`}
              >
                {movement.tipoMovimentacao || "Entrada"}
              </span>
            </div>
          </div>

          {movement.pedidoReferencia && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Referência do Pedido
              </label>
              <div className="text-gray-900 font-mono text-sm">
                {movement.pedidoReferencia.replace('CANCELAMENTO-', '')}
              </div>
            </div>
          )}
        </div>

        {/* Quantity and Balance */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Quantidade
            </label>
            <div className={`text-lg font-semibold flex items-center space-x-1`}>
              <span>
                {movement.quantidade} {movement.unidadeArmazenamento || 'un'}
              </span>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Saldo Anterior
            </label>
            <div className="text-gray-900 font-medium">
              {movement.saldoAtual || "0"} {movement.unidadeArmazenamento || 'un'}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Novo Saldo
            </label>
            <div className="text-gray-900 font-semibold">
              {movement.novoSaldo || "0"} {movement.unidadeArmazenamento || 'un'}
            </div>
          </div>
        </div>

        {/* Detalhes de consumo por prato (apenas para movimentos de pedido) */}
        {movement.detalhesConsumo && movement.detalhesConsumo.length > 0 && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Detalhamento do Consumo
            </label>
            <div className="bg-gray-50 rounded-lg p-3 space-y-2">
              {movement.detalhesConsumo.map((detalhe, index) => (
                <div key={index} className="flex justify-between items-center text-sm">
                  <div className="flex items-center space-x-2">
                    <Note className="w-3 h-3 text-gray-500" />
                    <span className="text-gray-700">{detalhe.cardapioItem}</span>
                    <span className="text-gray-500">(x{detalhe.quantidade})</span>
                  </div>
                  <div className="text-right">
                    <div className="text-gray-600">
                      {detalhe.consumoPorPorcao.toFixed(2)} × {detalhe.quantidade} = {detalhe.consumoTotal.toFixed(2)}
                    </div>
                  </div>
                </div>
              ))}
              <div className="border-t border-gray-200 pt-2 mt-2">
                <div className="flex justify-between items-center font-medium">
                  <span>Total Consumido:</span>
                  <span className="text-orange-600">
                    {movement.detalhesConsumo.reduce((acc, det) => acc + det.consumoTotal, 0).toFixed(2)} {movement.unidadeArmazenamento || 'un'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Data da movimentação */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Data da Movimentação
          </label>
          <div className="text-gray-900">
            {movement.data ? new Date(movement.data).toLocaleString('pt-BR') : 'Não informada'}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200 mt-6">
          <button
            type="button"
            onClick={handleCancel}
            className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleEdit}
            disabled={loading}
            className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-dynamic hover:bg-yellow-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Carregando..." : "Editar"}
          </button>
        </div>
      </div>
    </BaseModalWithHeader>
  );
};

export default MovementDetailsModal;
