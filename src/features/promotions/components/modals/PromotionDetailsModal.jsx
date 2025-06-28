import { Gift } from "react-coolicons";
import BaseModalWithHeader from "@/components/BaseModalWithHeader";

const PromotionDetailsModal = ({ isOpen, onClose, promotion }) => {
  if (!promotion) return null;

  const calcularPorcentagemDesconto = () => {
    if (!promotion.precoOriginal || promotion.precoOriginal === 0) return 0;
    return (((promotion.precoOriginal - promotion.precoDesconto) / promotion.precoOriginal) * 100).toFixed(0);
  };

  return (
    <BaseModalWithHeader
      isOpen={isOpen}
      onClose={onClose}
      title={promotion.nome}
      subTitle="Detalhes da promoção"
      icon={Gift}
      iconClassName="text-yellow-500"
    >
      <div className="space-y-6">
        {/* Promotion Image */}
        <div className="relative rounded-lg overflow-hidden bg-gray-100 h-48">
          {promotion.imagemUrl ? (
            <img
              src={promotion.imagemUrl}
              alt={promotion.nome}
              className="w-full h-full object-cover"
              onError={(e) => {
                e.target.onerror = null;
                e.target.src = '/placeholder-promo.jpg';
              }}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gray-200">
              <Gift className="h-16 w-16 text-gray-400" />
            </div>
          )}
        </div>

        {/* Price Information */}
        <div className="bg-yellow-50 p-4 rounded-lg">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">Valor Original:</span>
            <span className="text-gray-500 line-through">
              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(promotion.precoOriginal)}
            </span>
          </div>
          <div className="flex items-center justify-between mt-2">
            <span className="text-sm font-medium text-gray-700">Valor com Desconto:</span>
            <div className="flex items-center">
              <span className="text-lg font-bold text-yellow-600">
                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(promotion.precoDesconto)}
              </span>
              <span className="ml-2 bg-green-500 text-white text-xs px-2 py-1 rounded-full">
                {calcularPorcentagemDesconto()}% OFF
              </span>
            </div>
          </div>
        </div>

        {/* Items List */}
        <div>
          <h3 className="text-sm font-medium text-gray-700 mb-3">Itens incluídos:</h3>
          <div className="space-y-2">
            {promotion.itens?.length > 0 ? (
              promotion.itens.map((item, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
                  <div className="flex items-center space-x-3">
                    <div className="flex-shrink-0 h-12 w-12 rounded-md overflow-hidden bg-gray-200">
                      {item.imagemUrl ? (
                        <img
                          src={item.imagemUrl}
                          alt={item.nome || `Item ${index + 1}`}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="h-full w-full flex items-center justify-center text-gray-400">
                          <Gift className="h-6 w-6" />
                        </div>
                      )}
                    </div>
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {item.nome || `Item ${index + 1}`}
                      </div>
                      {item.quantity > 1 && (
                        <div className="text-xs text-gray-500">
                          Quantidade: {item.quantity}
                        </div>
                      )}
                    </div>
                  </div>
                  {item.valor && (
                    <div className="text-sm font-medium text-gray-900">
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.valor * (item.quantity || 1))}
                    </div>
                  )}
                </div>
              ))
            ) : (
              <div className="text-center py-4 text-gray-500">
                Nenhum item adicionado a esta promoção.
              </div>
            )}
          </div>
        </div>
      </div>
    </BaseModalWithHeader>
  );
};

export default PromotionDetailsModal;
