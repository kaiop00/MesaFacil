import { useState } from "react";
import { useTranslation } from "react-i18next";
import BaseModalWithHeader from "@/components/BaseModalWithHeader";
import { CreditCard01, Handbag, QrCode, ShoppingBag02, Gift } from "react-coolicons";
import LoadingSpinnerDynamic from "@/components/LoadingSpinnerDynamic";

const PAYMENT_METHODS = [
  { id: "dinheiro", label: "payment.methods.cash", icon: Handbag, color: "bg-green-50 text-green-600 border-green-200" },
  { id: "debito", label: "payment.methods.debit", icon: CreditCard01, color: "bg-blue-50 text-blue-600 border-blue-200" },
  { id: "credito", label: "payment.methods.credit", icon: CreditCard01, color: "bg-purple-50 text-purple-600 border-purple-200" },
  { id: "pix", label: "payment.methods.pix", icon: QrCode, color: "bg-teal-50 text-teal-600 border-teal-200" },
  { id: "ifood", label: "payment.methods.ifood", icon: ShoppingBag02, color: "bg-orange-50 text-orange-600 border-orange-200" },
  { id: "voucher", label: "payment.methods.voucher", icon: Gift, color: "bg-pink-50 text-pink-600 border-pink-200" },
];

const PaymentMethodModal = ({ isOpen, onClose, onConfirm, mesaNumero, totalValue, loading = false }) => {
  const { t } = useTranslation('order');
  const [selectedMethod, setSelectedMethod] = useState(null);
  const [observacoes, setObservacoes] = useState("");

  const handleConfirm = () => {
    if (!selectedMethod) return;
    
    onConfirm({
      formaPagamento: selectedMethod,
      observacoesPagamento: observacoes.trim(),
    });
  };

  const handleClose = () => {
    setSelectedMethod(null);
    setObservacoes("");
    onClose();
  };

  return (
    <BaseModalWithHeader
      isOpen={isOpen}
      onClose={handleClose}
      title={t('payment.modal.title')}
      subTitle={t('payment.modal.subtitle')}
      icon={CreditCard01}
    >
      <div className="space-y-6">
        {/* Mesa e Valor */}
        <div className="bg-gray-50 rounded-lg p-4 space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium text-gray-600">
              {t('payment.modal.table')}:
            </span>
            <span className="text-lg font-semibold text-gray-900">
              {t('tables.tableLetter', { letter: mesaNumero })}
            </span>
          </div>
          <div className="flex justify-between items-center pt-2 border-t border-gray-200">
            <span className="text-sm font-medium text-gray-600">
              {t('payment.modal.total')}:
            </span>
            <span className="text-2xl font-bold text-primary-dynamic">
              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalValue || 0)}
            </span>
          </div>
        </div>

        {/* Formas de Pagamento */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-3">
            {t('payment.modal.selectMethod')}
          </label>
          <div className="grid grid-cols-2 gap-3">
            {PAYMENT_METHODS.map((method) => {
              const Icon = method.icon;
              const isSelected = selectedMethod === method.id;
              
              return (
                <button
                  key={method.id}
                  type="button"
                  onClick={() => setSelectedMethod(method.id)}
                  className={`
                    flex flex-col items-center justify-center gap-2 p-4 rounded-lg border-2 
                    transition-all duration-200 cursor-pointer
                    ${isSelected 
                      ? 'border-primary-dynamic bg-primary-dynamic/5 shadow-md' 
                      : `${method.color} border hover:shadow-md`
                    }
                  `}
                >
                  <Icon className={`w-8 h-8 ${isSelected ? 'text-primary-dynamic' : ''}`} />
                  <span className={`text-sm font-medium ${isSelected ? 'text-primary-dynamic' : 'text-gray-700'}`}>
                    {t(method.label)}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Campo de Observações */}
        <div>
          <label htmlFor="observacoes-pagamento" className="block text-sm font-medium text-gray-700 mb-2">
            {t('payment.modal.observations')}
            <span className="text-gray-400 ml-1">({t('payment.modal.optional')})</span>
          </label>
          <textarea
            id="observacoes-pagamento"
            value={observacoes}
            onChange={(e) => setObservacoes(e.target.value)}
            rows={3}
            placeholder={t('payment.modal.observationsPlaceholder')}
            className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-primary-dynamic focus:border-transparent"
          />
        </div>

        {/* Botões de Ação */}
        <div className="flex gap-3 pt-4 border-t border-gray-200">
          <button
            type="button"
            onClick={handleClose}
            disabled={loading}
            className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-colors cursor-pointer"
          >
            {t('payment.modal.buttons.cancel')}
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={!selectedMethod || loading}
            className="flex-1 px-4 py-3 bg-primary-dynamic text-white rounded-lg hover:opacity-90 disabled:bg-gray-300 disabled:cursor-not-allowed font-medium transition-colors cursor-pointer flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <LoadingSpinnerDynamic />
                <span>{t('payment.modal.buttons.processing')}</span>
              </>
            ) : (
              t('payment.modal.buttons.confirm')
            )}
          </button>
        </div>

        {/* Aviso se não selecionou método */}
        {!selectedMethod && (
          <div className="flex items-center gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <span className="text-sm text-yellow-800">
              {t('payment.modal.warning')}
            </span>
          </div>
        )}
      </div>
    </BaseModalWithHeader>
  );
};

export default PaymentMethodModal;
