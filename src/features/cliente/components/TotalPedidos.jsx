import { useMemo } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { useCliente } from "../context/ClienteContext";
import { useMesa } from "../hooks/useMesa";
import {
    formatCurrency,
    formatTimestamp,
    computeServiceFeeAmount,
    computeTotalWithService,
    computeCoverChargeAmount,
    normalizeServicePercentage,
    DEFAULT_SERVICE_FEE_PERCENT,
} from "../utils/pedidos";
import { useTranslation } from "react-i18next";

export default function TotalPedidos({
    pedidos = [],
    loading = false,
    error = null,
    totalPedidos = 0,
    serviceFeePercent = DEFAULT_SERVICE_FEE_PERCENT,
    serviceFeeLoading = false,
    serviceFeeExempt = false,
    coverChargeEnabled = false,
    coverChargeAmount = 0,
    coverChargeLoading = false,
    numeroPessoas = 1,
    mesaId,
    idRestaurante,
    onRealizarPagamento,
}) {
    const { t } = useTranslation("cliente");
    const navigate = useNavigate();
    const location = useLocation();
    const { slug } = useParams();
    const { mesa } = useMesa();
    const { numero } = useCliente();

    const totalGeral = totalPedidos;

    const totalResumo = useMemo(() => {
        if (pedidos.length > 0) {
            return totalGeral;
        }
        return typeof mesa?.total === "number" ? mesa.total : 0;
    }, [pedidos.length, totalGeral, mesa?.total]);

    const percentNormalized = useMemo(
        () => normalizeServicePercentage(serviceFeePercent, DEFAULT_SERVICE_FEE_PERCENT),
        [serviceFeePercent]
    );
    const valorServico = useMemo(
        () => computeServiceFeeAmount(totalResumo, percentNormalized, DEFAULT_SERVICE_FEE_PERCENT),
        [totalResumo, percentNormalized]
    );
    const valorCouvert = useMemo(
        () => computeCoverChargeAmount(coverChargeEnabled, coverChargeAmount, numeroPessoas),
        [coverChargeEnabled, coverChargeAmount, numeroPessoas]
    );
    const totalComServico = useMemo(
        () => computeTotalWithService(
            totalResumo,
            percentNormalized,
            DEFAULT_SERVICE_FEE_PERCENT,
            valorCouvert
        ),
        [totalResumo, percentNormalized, valorCouvert]
    );
    const formattedPercent = percentNormalized.toLocaleString("pt-BR", {
        minimumFractionDigits: percentNormalized % 1 === 0 ? 0 : 2,
        maximumFractionDigits: 2,
    });
    const serviceLabel = serviceFeeExempt
        ? t("totalPedidos.serviceFee")
        : percentNormalized > 0
        ? `${t("totalPedidos.serviceFee")} (${formattedPercent}%)`
        : t("totalPedidos.serviceFee");
    const serviceValueLabel = serviceFeeLoading
        ? t("common.loading")
        : serviceFeeExempt
            ? t("totalPedidos.serviceFeeExempt")
            : percentNormalized > 0
            ? formatCurrency(valorServico)
            : t("totalPedidos.serviceFeeExempt");
    const couvertValueLabel = coverChargeLoading
        ? t("common.loading")
        : valorCouvert > 0
            ? formatCurrency(valorCouvert)
            : t("totalPedidos.coverChargeNotApplied");
    const totalComServicoLabel = serviceFeeLoading
        ? t("common.loading")
        : formatCurrency(totalComServico);

    const search = location.search || "";

    const handleGoToMenu = () => {
        if (slug) {
            navigate(`/mesa/${slug}${search}`);
            return;
        }
        navigate(-1);
    };

    const handleGoToPayment = () => {
        if (typeof onRealizarPagamento === "function") {
            onRealizarPagamento();
        }
    };

    if (!mesaId || !idRestaurante) {
        return null;
    }

    return (
        <div className="bg-white rounded-xl shadow-md mt-6 px-6 py-4 w-full max-w-md text-sm text-gray-700 space-y-4">
            <div>
                <p className="font-bold text-gray-900 mb-1">{t("totalPedidos.title")}</p>
                <p>
                    <span className="font-medium">{t("totalPedidos.table")}</span> {numero || mesa?.numero || "-"}
                </p>
                <p>
                    <span className="font-medium">{t("totalPedidos.ordersRegistered")}</span> {pedidos.length}
                </p>
            </div>

            {loading && <p>{t("totalPedidos.loading")}</p>}

            {!loading && error && <p className="text-red-500">{error}</p>}

            {!loading && !error && pedidos.length === 0 && (
                <p>{t("totalPedidos.noOrders")}</p>
            )}

            {!loading && !error && pedidos.length > 0 && (
                <div className="space-y-4">
                    {pedidos.map((pedido, idx) => {
                        const criadoEmLabel = formatTimestamp(pedido.criadoEm);

                        return (
                            <div key={pedido.id} className="border border-gray-200 rounded-lg p-4 space-y-3">
                                <div className="flex flex-col gap-1 text-gray-900">
                                    <span className="font-semibold">{t("totalPedidos.order")} {idx + 1}</span>
                                    {pedido.status && (
                                        <span className="text-xs uppercase tracking-wide text-gray-500">
                                            {t("totalPedidos.status")}: {pedido.status}
                                        </span>
                                    )}
                                    {criadoEmLabel && (
                                        <span className="text-xs text-gray-500">{t("totalPedidos.createdAt")} {criadoEmLabel}</span>
                                    )}
                                </div>

                                <ul className="space-y-1">
                                    {pedido.items.map((item, itemIdx) => {
                                        const price = item.price ?? item.valor ?? 0;
                                        const quantity = item.quantity ?? item.quantidade ?? 1;
                                        const subtotal = price * quantity;
                                        const itemObservation = String(item.itemObservation || item.observacao || item.descricao || '').trim();
                                        return (
                                            <li key={`${pedido.id}-${itemIdx}`} className="space-y-0.5">
                                                <div className="flex justify-between gap-3">
                                                    <span>
                                                        {quantity > 1 ? `${quantity}x ` : ""}
                                                        {item.nome || item.name || "Item"}
                                                    </span>
                                                    <span>{formatCurrency(subtotal)}</span>
                                                </div>
                                                {itemObservation && (
                                                    <p className="text-xs text-gray-600 pl-2 border-l border-gray-200">
                                                        Obs: {itemObservation}
                                                    </p>
                                                )}
                                            </li>
                                        );
                                    })}
                                </ul>

                                {pedido.observacoes && pedido.observacoes.trim() && (
                                    <div className="pt-2 border-t border-gray-200 text-xs text-gray-600">
                                        <span className="font-medium text-gray-700">{t("totalPedidos.observations")}: </span>
                                        {pedido.observacoes}
                                    </div>
                                )}

                                <div className="flex justify-between border-t border-gray-200 pt-2 font-semibold text-gray-900">
                                    <span>{t("totalPedidos.total")}</span>
                                    <span>{formatCurrency(pedido.total)}</span>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {!loading && !error && (
                <>
                    <div className="space-y-2 pt-2 border-t border-gray-300 text-gray-900">
                        <div className="flex justify-between font-semibold">
                            <span>{t("totalPedidos.subtotal")}</span>
                            <span>{formatCurrency(totalResumo)}</span>
                        </div>
                        <div className="flex justify-between text-sm font-medium">
                            <span>{serviceLabel}</span>
                            <span>{serviceValueLabel}</span>
                        </div>
                        <div className="flex justify-between text-sm font-medium">
                            <span>{t("totalPedidos.coverCharge")}</span>
                            <span>{couvertValueLabel}</span>
                        </div>
                        <div className="flex justify-between font-semibold">
                            <span>{t("totalPedidos.totalWithFee")}</span>
                            <span>{totalComServicoLabel}</span>
                        </div>
                    </div>
                    <div className="flex flex-col gap-3">
                        <button
                            className="w-full bg-[#10B981] text-white p-2 rounded-lg"
                            onClick={handleGoToMenu}
                        >
                            {t("totalPedidos.orderMore")}
                        </button>
                        <button
                            className="w-full bg-[#D9A23B] text-white p-2 rounded-lg"
                            onClick={handleGoToPayment}
                        >
                            {t("totalPedidos.makePayment")}
                        </button>
                    </div>
                </>
            )}
        </div>
    );
}
