import BaseModalWithHeader from "@/components/BaseModalWithHeader";
import { FileDocument } from "react-coolicons";

const ItemDetailsModal = ({ 
  isOpen, 
  onClose, 
  item 
}) => {
  if (!item) return null;

  const formatValue = (value) => {
    if (value === undefined || value === null) return "-";
    return value;
  };

  return (
    <BaseModalWithHeader
      isOpen={isOpen}
      onClose={onClose}
      title={item.nome || "Detalhes do Item"}
      subTitle="Relação de dados cadastrados do Item"
      icon={FileDocument}
    >
      <div className="space-y-4 mt-4">
        <div className="border-b border-gray-200 pb-4">
          <h3 className="text-lg font-medium text-gray-900 mb-2">Informações Básicas</h3>
          <div className="grid grid-cols-1 gap-4">
            <div>
              <p className="text-sm font-medium text-gray-500">Nome</p>
              <p className="mt-1 text-sm text-gray-900">{formatValue(item.nome)}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Marca</p>
              <p className="mt-1 text-sm text-gray-900">{formatValue(item.marca)}</p>
            </div>
          </div>
        </div>

        <div className="border-b border-gray-200 pb-4">
          <h3 className="text-lg font-medium text-gray-900 mb-2">Unidades</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-medium text-gray-500">Unidade de Armazenamento</p>
              <p className="mt-1 text-sm text-gray-900">{formatValue(item.unidadeArmazenamento || 'Unidade')}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Unidade de Compra</p>
              <p className="mt-1 text-sm text-gray-900">{formatValue(item.unidadeCompra || 'Unidade')}</p>
            </div>
          </div>
        </div>

        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Estoque</h3>
          <div className="grid grid-cols-1 gap-4">
            <div>
              <p className="text-sm font-medium text-gray-500">Estoque Atual</p>
              <p className="mt-1 text-sm text-gray-900">{formatValue(item.estoque?.atual)}</p>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <p className="text-sm font-medium text-gray-500">Estoque Baixo</p>
                <p className="mt-1 text-sm text-gray-900">{formatValue(item.estoque?.baixo)}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Estoque Médio</p>
                <p className="mt-1 text-sm text-gray-900">{formatValue(item.estoque?.medio)}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Estoque Alto</p>
                <p className="mt-1 text-sm text-gray-900">{formatValue(item.estoque?.alto)}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500"
          >
            Fechar
          </button>
        </div>
      </div>
    </BaseModalWithHeader>
  );
};

export default ItemDetailsModal;
