import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import BaseModalWithHeader from "@/components/BaseModalWithHeader";
import { CreditCard01, Handbag, QrCode, ShoppingBag02, Gift } from "react-coolicons";
import LoadingSpinnerDynamic from "@/components/LoadingSpinnerDynamic";

const createEmptySplitPayment = () => ({
  method: "",
  amount: "",
  cardBrand: "",
});

const CARD_BRANDS = [
  { id: "VISA", label: "Visa" },
  { id: "MASTERCARD", label: "Mastercard" },
  { id: "ELO", label: "Elo" },
  { id: "AMEX", label: "American Express" },
  { id: "HIPERCARD", label: "Hipercard" },
  { id: "DINERS", label: "Diners Club" },
  { id: "CABAL", label: "Cabal" },
  { id: "AURA", label: "Aura" },
];

const isCardMethod = (methodId) => methodId === "credito" || methodId === "debito";

const PAYMENT_METHODS = [
  { id: "dinheiro", label: "payment.methods.cash", icon: Handbag, color: "bg-green-50 text-green-600 border-green-200" },
  { id: "debito", label: "payment.methods.debit", icon: CreditCard01, color: "bg-blue-50 text-blue-600 border-blue-200" },
  { id: "credito", label: "payment.methods.credit", icon: CreditCard01, color: "bg-purple-50 text-purple-600 border-purple-200" },
  { id: "pix", label: "payment.methods.pix", icon: QrCode, color: "bg-teal-50 text-teal-600 border-teal-200" },
  { id: "ifood", label: "payment.methods.ifood", icon: ShoppingBag02, color: "bg-orange-50 text-orange-600 border-orange-200" },
  { id: "voucher", label: "payment.methods.voucher", icon: Gift, color: "bg-pink-50 text-pink-600 border-pink-200" },
];

const PaymentMethodModal = ({
  isOpen,
  onClose,
  onConfirm,
  mesaNumero,
  totalValue,
  loading = false,
  nfceDisponivel = false,
  isFinalizacaoMesa = false,
}) => {
  const { t } = useTranslation('order');
  const [selectedMethod, setSelectedMethod] = useState(null);
  const [observacoes, setObservacoes] = useState("");
  const [precisaTroco, setPrecisaTroco] = useState(false);
  const [valorPago, setValorPago] = useState("");
  const [selectedCardBrand, setSelectedCardBrand] = useState("");
  const [splitPaymentEnabled, setSplitPaymentEnabled] = useState(false);
  const [splitPayments, setSplitPayments] = useState([createEmptySplitPayment()]);
  const [gorjeta, setGorjeta] = useState("");
  const [emitirRecibo, setEmitirRecibo] = useState(false);

  const totalPedido = Number(totalValue || 0);

  const gorjetaNumerico = useMemo(() => {
    const valorNormalizado = String(gorjeta || "")
      .trim()
      .replace(/\./g, "")
      .replace(/,/g, ".");

    if (!valorNormalizado) return 0;
    const parsed = Number(valorNormalizado);
    return Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
  }, [gorjeta]);

  const totalComGorjeta = useMemo(() => {
    return Math.round((totalPedido + gorjetaNumerico) * 100) / 100;
  }, [totalPedido, gorjetaNumerico]);

  const valorPagoNumerico = useMemo(() => {
    const valorNormalizado = String(valorPago || "")
      .trim()
      .replace(/\./g, "")
      .replace(/,/g, ".");

    if (!valorNormalizado) return null;
    const parsed = Number(valorNormalizado);
    return Number.isFinite(parsed) ? parsed : null;
  }, [valorPago]);

  const valorTroco = useMemo(() => {
    if (valorPagoNumerico == null || valorPagoNumerico <= totalComGorjeta) return 0;
    return Math.round((valorPagoNumerico - totalComGorjeta) * 100) / 100;
  }, [valorPagoNumerico, totalComGorjeta]);

  const trocoInvalido =
    selectedMethod === "dinheiro" &&
    precisaTroco &&
    (valorPagoNumerico == null || valorPagoNumerico < totalComGorjeta);

  const trocoPayload =
    selectedMethod === "dinheiro" && precisaTroco && !trocoInvalido
      ? {
          precisaTroco: true,
          valorPagamento: valorPagoNumerico,
          valorTroco,
        }
      : null;

  const splitPaymentsNormalized = useMemo(() => {
    if (!splitPaymentEnabled) return [];

    return splitPayments
      .map((entry) => {
        const normalizedAmount = String(entry.amount || "")
          .trim()
          .replace(/\./g, "")
          .replace(/,/g, ".");
        const amountParsed = Number(normalizedAmount);
        return {
          method: String(entry.method || "").trim(),
          amount: Number.isFinite(amountParsed) ? amountParsed : null,
          cardBrand: String(entry.cardBrand || "").trim().toUpperCase(),
        };
      })
      .filter((entry) => entry.method && entry.amount != null);
  }, [splitPaymentEnabled, splitPayments]);

  const splitTotal = useMemo(() => {
    return Math.round(
      splitPaymentsNormalized.reduce((acc, entry) => acc + Number(entry.amount || 0), 0) * 100,
    ) / 100;
  }, [splitPaymentsNormalized]);

  const splitDifference = useMemo(() => {
    return Math.round((totalPedido - splitTotal) * 100) / 100;
  }, [totalPedido, splitTotal]);

  const splitHasIncompleteEntry = useMemo(() => {
    if (!splitPaymentEnabled) return false;
    return splitPayments.some((entry) => {
      const hasMethod = String(entry.method || "").trim().length > 0;
      const hasAmount = String(entry.amount || "").trim().length > 0;
      return hasMethod !== hasAmount;
    });
  }, [splitPaymentEnabled, splitPayments]);

  const splitHasMissingCardBrand = useMemo(() => {
    if (!splitPaymentEnabled) return false;
    return splitPayments.some((entry) => {
      const method = String(entry.method || "").trim();
      const hasAmount = String(entry.amount || "").trim().length > 0;
      const isCard = isCardMethod(method);
      if (!isCard || !hasAmount) return false;
      return String(entry.cardBrand || "").trim().length === 0;
    });
  }, [splitPaymentEnabled, splitPayments]);

  const singleCardBrandMissing =
    !splitPaymentEnabled && isCardMethod(selectedMethod) && !selectedCardBrand;

  const splitInvalid =
    splitPaymentEnabled && (
      splitPaymentsNormalized.length === 0 ||
      splitHasIncompleteEntry ||
      splitHasMissingCardBrand ||
      Math.abs(splitDifference) > 0.01
    );

  const handleConfirm = () => {
    if (splitPaymentEnabled) {
      if (splitInvalid) return;

      onConfirm({
        formaPagamento: splitPaymentsNormalized[0]?.method || null,
        observacoesPagamento: observacoes.trim(),
        pagamentos: splitPaymentsNormalized.map((entry) => ({
          formaPagamento: entry.method,
          valor: Math.round(Number(entry.amount || 0) * 100) / 100,
          ...(isCardMethod(entry.method) && entry.cardBrand
            ? { card: { brand: entry.cardBrand } }
            : {}),
        })),
        ...(gorjetaNumerico > 0 ? { gorjeta: Math.round(gorjetaNumerico * 100) / 100 } : {}),
        ...(isFinalizacaoMesa && nfceDisponivel ? { emitirRecibo } : {}),
      });
      return;
    }

    if (!selectedMethod || trocoInvalido || singleCardBrandMissing) return;
    
    onConfirm({
      formaPagamento: selectedMethod,
      observacoesPagamento: observacoes.trim(),
      troco: trocoPayload,
      ...(isCardMethod(selectedMethod) && selectedCardBrand
        ? { pagamentoCartao: { brand: selectedCardBrand } }
        : {}),
      ...(gorjetaNumerico > 0 ? { gorjeta: Math.round(gorjetaNumerico * 100) / 100 } : {}),
      ...(isFinalizacaoMesa && nfceDisponivel ? { emitirRecibo } : {}),
    });
  };

  const handleClose = () => {
    setSelectedMethod(null);
    setObservacoes("");
    setPrecisaTroco(false);
    setValorPago("");
    setSelectedCardBrand("");
    setSplitPaymentEnabled(false);
    setSplitPayments([createEmptySplitPayment()]);
    setGorjeta("");
    onClose();
  };

  const handleSelectMethod = (methodId) => {
    setSelectedMethod(methodId);
    if (methodId !== "dinheiro") {
      setPrecisaTroco(false);
      setValorPago("");
    }
    if (!isCardMethod(methodId)) {
      setSelectedCardBrand("");
    }
  };

  const handleToggleSplitPayment = (enabled) => {
    setSplitPaymentEnabled(enabled);
    if (enabled) {
      setSelectedMethod(null);
      setPrecisaTroco(false);
      setValorPago("");
      setSelectedCardBrand("");
      if (!splitPayments.length) {
        setSplitPayments([createEmptySplitPayment()]);
      }
      return;
    }
    setSplitPayments([createEmptySplitPayment()]);
  };

  const updateSplitPayment = (index, field, value) => {
    setSplitPayments((prev) =>
      prev.map((entry, i) => (i === index ? { ...entry, [field]: value } : entry)),
    );
  };

  const addSplitPaymentEntry = () => {
    setSplitPayments((prev) => [...prev, createEmptySplitPayment()]);
  };

  const removeSplitPaymentEntry = (index) => {
    setSplitPayments((prev) => {
      const next = prev.filter((_, i) => i !== index);
      return next.length > 0 ? next : [createEmptySplitPayment()];
    });
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
              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalComGorjeta)}
            </span>
          </div>
          {gorjetaNumerico > 0 && (
            <div className="flex justify-between items-center text-xs text-gray-500 pt-2">
              <span>({new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalPedido)} + {t('payment.modal.tip', { defaultValue: 'gorjeta' })}: {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(gorjetaNumerico)})</span>
            </div>
          )}
          {/* Opcao de emitir recibo só para finalização de mesa */}
          {isFinalizacaoMesa && nfceDisponivel && (
            <div className="mt-3 p-3 bg-slate-50 border border-slate-200 rounded-lg flex items-center gap-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={emitirRecibo}
                  onChange={(e) => setEmitirRecibo(e.target.checked)}
                  className="w-4 h-4 text-primary-dynamic focus:ring-primary-dynamic rounded"
                />
                <span className="text-sm font-medium text-gray-700">{t('modals.orderDetail.buttons.emitNfce')}</span>
              </label>
            </div>
          )}
        </div>

        {/* Formas de Pagamento */}
        <div>
          <div className="mb-3 p-3 bg-slate-50 border border-slate-200 rounded-lg">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={splitPaymentEnabled}
                onChange={(e) => handleToggleSplitPayment(e.target.checked)}
                className="w-4 h-4 text-primary-dynamic focus:ring-primary-dynamic rounded"
              />
              <span className="text-sm font-medium text-gray-700">
                {t('payment.modal.split.enable', { defaultValue: 'Dividir pagamento em mais de um método' })}
              </span>
            </label>
          </div>

          <label className="block text-sm font-semibold text-gray-700 mb-3">
            {t('payment.modal.selectMethod')}
          </label>
          {!splitPaymentEnabled && (
            <div className="grid grid-cols-2 gap-3">
              {PAYMENT_METHODS.map((method) => {
                const Icon = method.icon;
                const isSelected = selectedMethod === method.id;

                return (
                  <button
                    key={method.id}
                    type="button"
                    onClick={() => handleSelectMethod(method.id)}
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
          )}

          {splitPaymentEnabled && (
            <div className="space-y-3">
              {splitPayments.map((entry, index) => (
                <div key={`split-${index}`} className="p-2 border border-gray-200 rounded-lg space-y-2">
                  <div className="grid grid-cols-12 gap-2 items-center">
                    <select
                      value={entry.method}
                      onChange={(e) => updateSplitPayment(index, "method", e.target.value)}
                      className="col-span-7 border border-gray-300 rounded-md px-2 py-2 text-sm"
                    >
                      <option value="">{t('payment.modal.split.methodPlaceholder', { defaultValue: 'Forma de pagamento' })}</option>
                      {PAYMENT_METHODS.map((method) => (
                        <option key={`option-${method.id}`} value={method.id}>
                          {t(method.label)}
                        </option>
                      ))}
                    </select>
                    <div className="col-span-4 relative">
                      <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-500 text-xs">R$</span>
                      <input
                        type="text"
                        inputMode="decimal"
                        value={entry.amount}
                        onChange={(e) => updateSplitPayment(index, "amount", e.target.value.replace(/[^0-9,.]/g, ""))}
                        placeholder={t('payment.modal.split.amountPlaceholder', { defaultValue: '0,00' })}
                        className="w-full pl-7 pr-2 py-2 border border-gray-300 rounded-md text-sm"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => removeSplitPaymentEntry(index)}
                      className="col-span-1 text-red-600 font-bold"
                      aria-label={t('payment.modal.split.remove', { defaultValue: 'Remover' })}
                    >
                      −
                    </button>
                  </div>

                  {isCardMethod(entry.method) && (
                    <div className="grid grid-cols-12 gap-2 items-center">
                      <label className="col-span-4 text-xs text-gray-600">
                        {t('payment.modal.cardBrandLabel', { defaultValue: 'Bandeira do cartão' })}
                      </label>
                      <select
                        value={entry.cardBrand || ""}
                        onChange={(e) => updateSplitPayment(index, "cardBrand", e.target.value)}
                        className="col-span-8 border border-gray-300 rounded-md px-2 py-2 text-sm"
                      >
                        <option value="">{t('payment.modal.cardBrandPlaceholder', { defaultValue: 'Selecione a bandeira' })}</option>
                        {CARD_BRANDS.map((brand) => (
                          <option key={`brand-${brand.id}`} value={brand.id}>{brand.label}</option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              ))}

              <button
                type="button"
                onClick={addSplitPaymentEntry}
                className="text-sm px-3 py-2 border border-primary-dynamic text-primary-dynamic rounded-md hover:bg-primary-dynamic/5"
              >
                {t('payment.modal.split.add', { defaultValue: 'Adicionar forma de pagamento' })}
              </button>

              <div className="text-sm bg-slate-50 border border-slate-200 rounded-lg p-3 space-y-1">
                <div className="flex justify-between">
                  <span>{t('payment.modal.split.totalTyped', { defaultValue: 'Total informado' })}:</span>
                  <span className="font-semibold">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(splitTotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span>{t('payment.modal.split.remaining', { defaultValue: 'Diferença para o total' })}:</span>
                  <span className={`font-semibold ${Math.abs(splitDifference) <= 0.01 ? 'text-emerald-700' : 'text-red-700'}`}>
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(splitDifference)}
                  </span>
                </div>
                {splitHasIncompleteEntry && (
                  <p className="text-red-700 text-xs">
                    {t('payment.modal.split.incomplete', { defaultValue: 'Preencha método e valor em cada linha ou remova linhas vazias.' })}
                  </p>
                )}
                {splitHasMissingCardBrand && !splitHasIncompleteEntry && (
                  <p className="text-red-700 text-xs">
                    {t('payment.modal.split.missingCardBrand', { defaultValue: 'Informe a bandeira para pagamentos em cartão.' })}
                  </p>
                )}
                {Math.abs(splitDifference) > 0.01 && !splitHasIncompleteEntry && (
                  <p className="text-red-700 text-xs">
                    {t('payment.modal.split.invalidTotal', { defaultValue: 'A soma dos pagamentos deve ser igual ao total do pedido.' })}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        {!splitPaymentEnabled && isCardMethod(selectedMethod) && (
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg space-y-2">
            <label htmlFor="card-brand" className="block text-xs text-gray-700 font-medium">
              {t('payment.modal.cardBrandLabel', { defaultValue: 'Bandeira do cartão' })}
            </label>
            <select
              id="card-brand"
              value={selectedCardBrand}
              onChange={(e) => setSelectedCardBrand(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
            >
              <option value="">{t('payment.modal.cardBrandPlaceholder', { defaultValue: 'Selecione a bandeira' })}</option>
              {CARD_BRANDS.map((brand) => (
                <option key={`single-brand-${brand.id}`} value={brand.id}>{brand.label}</option>
              ))}
            </select>
            {!selectedCardBrand && (
              <p className="text-red-700 text-xs">
                {t('payment.modal.cardBrandRequired', { defaultValue: 'A bandeira do cartão é obrigatória para emissão fiscal.' })}
              </p>
            )}
          </div>
        )}

        {!splitPaymentEnabled && selectedMethod === "dinheiro" && (
          <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg space-y-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={precisaTroco}
                onChange={(e) => {
                  const checked = e.target.checked;
                  setPrecisaTroco(checked);
                  if (!checked) {
                    setValorPago("");
                  }
                }}
                className="w-4 h-4 text-primary-dynamic focus:ring-primary-dynamic rounded"
              />
              <span className="text-sm font-medium text-gray-700">
                {t('payment.modal.cashChange.needChange')}
              </span>
            </label>

            {precisaTroco && (
              <div className="space-y-2">
                <label htmlFor="valor-pago" className="block text-xs text-gray-600">
                  {t('payment.modal.cashChange.amountPaidLabel')}
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">R$</span>
                  <input
                    id="valor-pago"
                    type="text"
                    inputMode="decimal"
                    value={valorPago}
                    onChange={(e) => {
                      const value = e.target.value.replace(/[^0-9,.]/g, "");
                      setValorPago(value);
                    }}
                    placeholder={t('payment.modal.cashChange.amountPaidPlaceholder')}
                    className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-md text-sm focus:border-primary-dynamic focus:ring-primary-dynamic focus:outline-none focus:ring-2 focus:ring-opacity-20"
                  />
                </div>

                {!trocoInvalido && valorPagoNumerico != null && (
                  <div className="flex justify-between items-center p-2 bg-green-100 border border-green-300 rounded text-sm">
                    <span className="text-green-800 font-medium">
                      {t('payment.modal.cashChange.changeLabel')}:
                    </span>
                    <span className="text-green-800 font-bold">
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valorTroco)}
                    </span>
                  </div>
                )}

                {trocoInvalido && (
                  <div className="p-2 bg-red-100 border border-red-300 rounded text-sm text-red-700">
                    {t('payment.modal.cashChange.invalidAmount')}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Campo de Gorjeta */}
        <div>
          <label htmlFor="gorjeta-pagamento" className="block text-sm font-medium text-gray-700 mb-2">
            {t('payment.modal.tip', { defaultValue: 'Gorjeta' })}
            <span className="text-gray-400 ml-1">({t('payment.modal.optional')})</span>
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">R$</span>
            <input
              id="gorjeta-pagamento"
              type="text"
              inputMode="decimal"
              value={gorjeta}
              onChange={(e) => {
                const value = e.target.value.replace(/[^0-9,.]/g, "");
                setGorjeta(value);
              }}
              placeholder={t('payment.modal.tipPlaceholder', { defaultValue: '0,00' })}
              className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-dynamic focus:border-transparent"
            />
          </div>
          {gorjetaNumerico > 0 && (
            <p className="text-xs text-gray-600 mt-1">
              {t('payment.modal.tipInfo', { defaultValue: 'Gorjeta a ser adicionada ao valor total' })}
            </p>
          )}
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
            disabled={splitPaymentEnabled ? (loading || splitInvalid) : (!selectedMethod || loading || trocoInvalido || singleCardBrandMissing)}
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

        {/* Aviso fiscal no ponto real da finalização */}
        <div
          className={`flex items-center gap-2 p-3 rounded-lg border ${
            nfceDisponivel
              ? 'bg-emerald-50 border-emerald-200'
              : 'bg-amber-50 border-amber-200'
          }`}
        >
          <span className={`text-sm ${nfceDisponivel ? 'text-emerald-800' : 'text-amber-800'}`}>
            {nfceDisponivel
              ? t('nfce.hints.availableAfterFinish')
              : t('nfce.hints.configRequiredAfterFinish')}
          </span>
        </div>

        {/* Aviso se não selecionou método */}
        {!splitPaymentEnabled && !selectedMethod && (
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
