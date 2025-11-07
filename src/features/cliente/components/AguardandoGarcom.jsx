import { useCliente } from "../context/ClienteContext";
import {
    computeSubtotal,
    formatCurrency,
    computeServiceFeeAmount,
    computeTotalWithService,
    computeCoverChargeAmount,
    normalizeServicePercentage,
    DEFAULT_SERVICE_FEE_PERCENT,
} from "../utils/pedidos";
import { useTranslation } from "react-i18next";

export default function AguardandoGarcom({
    pedidos = [],
    totalPedidos = 0,
    serviceFeePercent = DEFAULT_SERVICE_FEE_PERCENT,
    serviceFeeLoading = false,
    coverChargeEnabled = false,
    coverChargeAmount = 0,
    coverChargeLoading = false,
    mesaNumero,
}) {
    const { t } = useTranslation("cliente");
    const { numero } = useCliente();
    const mesaNumeroExibicao = mesaNumero || numero;
    const percentNormalized = normalizeServicePercentage(serviceFeePercent, DEFAULT_SERVICE_FEE_PERCENT);
    const valorServico = computeServiceFeeAmount(totalPedidos, percentNormalized, DEFAULT_SERVICE_FEE_PERCENT);
    const valorCouvert = computeCoverChargeAmount(coverChargeEnabled, coverChargeAmount);
    const totalComServico = computeTotalWithService(
        totalPedidos,
        percentNormalized,
        DEFAULT_SERVICE_FEE_PERCENT,
        valorCouvert
    );
    const formattedPercent = percentNormalized.toLocaleString("pt-BR", {
        minimumFractionDigits: percentNormalized % 1 === 0 ? 0 : 2,
        maximumFractionDigits: 2,
    });
    const serviceLabel = percentNormalized > 0
        ? `${t("payment.summary.serviceFee")} (${formattedPercent}%)`
        : t("payment.summary.serviceFee");
    const serviceValueLabel = serviceFeeLoading
        ? t("common.loading")
        : percentNormalized > 0
            ? formatCurrency(valorServico)
            : t("totalPedidos.serviceFeeExempt");
    const coverValueLabel = coverChargeLoading
        ? t("common.loading")
        : valorCouvert > 0
            ? formatCurrency(valorCouvert)
            : t("payment.summary.coverChargeNotApplied");
    const totalComServicoLabel = serviceFeeLoading
        ? t("common.loading")
        : formatCurrency(totalComServico);

    return (
        <div className="flex flex-col items-center mt-6 px-4 pb-6">
            <div className="bg-white rounded-xl shadow-md w-full max-w-md overflow-hidden">
                <div className="px-6 py-6 space-y-6 text-gray-700 text-sm">
                    <div className="space-y-2 text-center">
                        <p className="text-xs text-[#D9A23B] font-semibold uppercase tracking-[0.2em]">{t("common.table")} {mesaNumeroExibicao || "-"}</p>
                        <h2 className="text-xl font-semibold text-gray-900">{t("pedido.waiterOnWay")}</h2>
                        <p className="text-sm text-gray-500">
                            {t("pedido.waiterHelp")}
                        </p>
                    </div>

                    <section className="space-y-3">
                        <div className="flex items-center gap-3">
                            <span className="flex-1 h-px bg-[#D9A23B]/30" />
                            <span className="text-xs font-semibold text-[#D9A23B] tracking-widest uppercase">
                                {t("payment.orderDetails.title")}
                            </span>
                            <span className="flex-1 h-px bg-[#D9A23B]/30" />
                        </div>

                        <div className="border border-gray-200 rounded-xl p-4 space-y-3">
                            <div className="flex justify-between text-sm text-gray-600">
                                <span>{t("payment.orderDetails.table")}</span>
                                <span className="font-medium text-gray-900">{mesaNumeroExibicao || "-"}</span>
                            </div>

                            <div className="space-y-4 pt-1">
                                {pedidos.map((pedido, index) => {
                                    const itensPedido = pedido.items || [];
                                    const totalPedido = typeof pedido.total === "number" ? pedido.total : computeSubtotal(itensPedido);

                                    return (
                                        <div key={pedido.id || index} className="space-y-2">
                                            <div className="flex justify-between text-sm text-gray-600">
                                                <span>{t("payment.orderDetails.order")} {index + 1}</span>
                                                <span className="font-medium text-gray-900">Nº {pedido.id || "-"}</span>
                                            </div>

                                            {itensPedido.length > 0 && (
                                                <ul className="space-y-1">
                                                    {itensPedido.map((item, itemIndex) => {
                                                        const price = item.price ?? item.valor ?? 0;
                                                        const quantity = item.quantity ?? item.quantidade ?? 1;
                                                        const subtotal = price * quantity;

                                                        return (
                                                            <li
                                                                key={`${pedido.id || "pedido"}-${itemIndex}`}
                                                                className="flex justify-between text-sm text-gray-700"
                                                            >
                                                                <span>
                                                                    {quantity > 1 ? `${quantity}x ` : ""}
                                                                    {item.nome || item.name || "Item"}
                                                                </span>
                                                                <span>{formatCurrency(subtotal)}</span>
                                                            </li>
                                                        );
                                                    })}
                                                </ul>
                                            )}

                                            <div className="flex justify-between text-sm font-semibold text-gray-900">
                                                <span>{t("payment.orderDetails.orderTotal")}</span>
                                                <span>{formatCurrency(totalPedido)}</span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            <div className="space-y-2 border-t border-gray-100 pt-3 text-gray-900">
                                <div className="flex justify-between font-semibold">
                                    <span>{t("payment.summary.subtotal")}</span>
                                    <span>{formatCurrency(totalPedidos)}</span>
                                </div>
                                <div className="flex justify-between text-sm font-medium">
                                    <span>{serviceLabel}</span>
                                    <span>{serviceValueLabel}</span>
                                </div>
                                <div className="flex justify-between text-sm font-medium">
                                    <span>{t("payment.summary.coverCharge")}</span>
                                    <span>{coverValueLabel}</span>
                                </div>
                                <div className="flex justify-between font-semibold">
                                    <span>{t("payment.summary.totalWithFee")}</span>
                                    <span>{totalComServicoLabel}</span>
                                </div>
                            </div>
                        </div>
                    </section>
                </div>
            </div>
        </div>
    );
}
