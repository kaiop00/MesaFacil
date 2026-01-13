import {
    formatCurrency,
    computeServiceFeeAmount,
    computeTotalWithService,
    computeCoverChargeAmount,
    normalizeServicePercentage,
    DEFAULT_SERVICE_FEE_PERCENT,
} from "../utils/pedidos";
import { useTranslation } from "react-i18next";

const PaymentSummary = ({
    items,
    loading,
    error,
    subtotal,
    serviceFeePercent = DEFAULT_SERVICE_FEE_PERCENT,
    serviceFeeLoading = false,
    serviceFeeExempt = false,
    coverChargeEnabled = false,
    coverChargeAmount = 0,
    coverChargeLoading = false,
    numeroPessoas = 1,
}) => {
    const { t } = useTranslation("cliente");
    const subtotalValue = typeof subtotal === "number" && Number.isFinite(subtotal) ? subtotal : 0;
    const percentNormalized = normalizeServicePercentage(serviceFeePercent, DEFAULT_SERVICE_FEE_PERCENT);
    const serviceAmount = computeServiceFeeAmount(subtotalValue, percentNormalized, DEFAULT_SERVICE_FEE_PERCENT);
    const coverAmount = computeCoverChargeAmount(coverChargeEnabled, coverChargeAmount, numeroPessoas);
    const totalWithService = computeTotalWithService(
        subtotalValue,
        percentNormalized,
        DEFAULT_SERVICE_FEE_PERCENT,
        coverAmount
    );

    const formattedPercent = percentNormalized.toLocaleString("pt-BR", {
        minimumFractionDigits: percentNormalized % 1 === 0 ? 0 : 2,
        maximumFractionDigits: 2,
    });
    const serviceLabel = serviceFeeExempt
        ? t("payment.summary.serviceFee")
        : percentNormalized > 0
        ? `${t("payment.summary.serviceFee")} (${formattedPercent}%)`
        : t("payment.summary.serviceFee");
    const serviceValueLabel = serviceFeeLoading
        ? t("common.loading")
        : serviceFeeExempt
            ? t("totalPedidos.serviceFeeExempt")
            : percentNormalized > 0
            ? formatCurrency(serviceAmount)
            : t("totalPedidos.serviceFeeExempt");
    const coverValueLabel = coverChargeLoading
        ? t("common.loading")
        : coverAmount > 0
            ? formatCurrency(coverAmount)
            : t("payment.summary.coverChargeNotApplied");
    const totalWithServiceLabel = serviceFeeLoading
        ? t("common.loading")
        : formatCurrency(totalWithService);

    return (
        <section className="space-y-3">
            <div className="flex items-center gap-3">
                <span className="flex-1 h-px bg-[#D9A23B]/30" />
                <span className="text-xs font-semibold text-[#D9A23B] tracking-widest uppercase">
                    {t("payment.summary.title")}
                </span>
                <span className="flex-1 h-px bg-[#D9A23B]/30" />
            </div>

            <div className="border border-gray-200 rounded-xl p-4 space-y-3">
                {loading && <p>{t("payment.summary.loading")}</p>}
                {!loading && error && <p className="text-red-500">{error}</p>}

                {!loading && !error && items.length === 0 && (
                    <p className="text-sm text-gray-500">{t("payment.summary.noItems")}</p>
                )}

                {!loading && !error && items.length > 0 && (
                    <ul className="space-y-2">
                        {items.map((item) => (
                            <li key={item.id} className="flex justify-between text-sm text-gray-700">
                                <span>
                                    {item.quantity > 1 ? `${item.quantity}x ` : ""}
                                    {item.nome}
                                </span>
                                <span>{formatCurrency(item.total)}</span>
                            </li>
                        ))}
                    </ul>
                )}

                {!loading && !error && (
                    <div className="flex justify-between items-center border-t border-gray-100 pt-3 font-semibold text-gray-900">
                        <span>{t("payment.summary.subtotal")}</span>
                        <span>{formatCurrency(subtotalValue)}</span>
                    </div>
                )}

                {!loading && !error && (
                    <div className="flex justify-between items-center text-sm font-medium text-gray-900">
                        <span>{serviceLabel}</span>
                        <span>{serviceValueLabel}</span>
                    </div>
                )}

                {!loading && !error && (
                    <div className="flex justify-between items-center text-sm font-medium text-gray-900">
                        <span>{t("payment.summary.coverCharge")}</span>
                        <span>{coverValueLabel}</span>
                    </div>
                )}

                {!loading && !error && (
                    <div className="flex justify-between items-center border-t border-gray-100 pt-3 font-semibold text-gray-900">
                        <span>{t("payment.summary.totalWithFee")}</span>
                        <span>{totalWithServiceLabel}</span>
                    </div>
                )}
            </div>
        </section>
    );
};

export default PaymentSummary;
