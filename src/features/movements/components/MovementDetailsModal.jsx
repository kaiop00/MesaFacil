import { FileDocument } from "react-coolicons";
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

  return (
    <BaseModalWithHeader
      isOpen={isOpen}
      onClose={handleCancel}
      title="Detalhes da Movimentação"
      subTitle="Relação de dados cadastrados do Item"
      icon={FileDocument}
    >
      <div className="space-y-6">
        {/* Name */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Nome
          </label>
          <div className="text-gray-900 font-medium">
            {movement.itemNome || "N/A"}
          </div>
        </div>

        {/* Storage and Purchase Units */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Unidade de Armazenamento
            </label>
            <div className="text-gray-900">
              {movement.unidadeArmazenamento || "Unidade"}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Unidade de Compra
            </label>
            <div className="text-gray-900">
              {movement.unidadeCompra || "Unidade"}
            </div>
          </div>
        </div>

        {/* Brand */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Marca
          </label>
          <div className="text-gray-900">{movement.marca || "Friboi"}</div>
        </div>

        {/* Movement Type */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Tipo de Movimentação
          </label>
          <div className="text-gray-900 capitalize">
            {movement.tipo || movement.tipoMovimentacao || "Entrada"}
          </div>
        </div>

        {/* Quantity and Balance */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Qtd
            </label>
            <div className="text-gray-900">
              {movement.quantidade || movement.qtd || "10"}
            </div>
          </div>
          {movement.unidadeArmazenamento !== movement.unidadeCompra && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Fator de Transformação
              </label>
              <div className="text-gray-900">
                {movement.fatorTransformacao || '1.00'}
              </div>
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Saldo
            </label>
            <div className="text-gray-900">
              {movement.saldo || movement.novoSaldo || "30"}
            </div>
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
