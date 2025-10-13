import { useMemo } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { useCliente } from "../context/ClienteContext";
import { useMesa } from "../hooks/useMesa";
import {
    formatCurrency,
    formatTimestamp,
    computeServiceFeeAmount,
    computeTotalWithService,
    normalizeServicePercentage,
    DEFAULT_SERVICE_FEE_PERCENT,
} from "../utils/pedidos";

export default function TotalPedidos({
    pedidos = [],
    loading = false,
    error = null,
    totalPedidos = 0,
    serviceFeePercent = DEFAULT_SERVICE_FEE_PERCENT,
    serviceFeeLoading = false,
    mesaId,
    idRestaurante,
    onRealizarPagamento,
}) {
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
    const totalComServico = useMemo(
        () => computeTotalWithService(totalResumo, percentNormalized, DEFAULT_SERVICE_FEE_PERCENT),
        [totalResumo, percentNormalized]
    );
    const formattedPercent = percentNormalized.toLocaleString("pt-BR", {
        minimumFractionDigits: percentNormalized % 1 === 0 ? 0 : 2,
        maximumFractionDigits: 2,
    });
    const serviceLabel = percentNormalized > 0
        ? `Taxa de serviço (${formattedPercent}%)`
        : "Taxa de serviço";
    const serviceValueLabel = serviceFeeLoading
        ? "Carregando..."
        : percentNormalized > 0
            ? formatCurrency(valorServico)
            : "Isento";
    const totalComServicoLabel = serviceFeeLoading
        ? "Carregando..."
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
                <p className="font-bold text-gray-900 mb-1">Resumo dos Pedidos</p>
                <p>
                    <span className="font-medium">Mesa</span> {numero || mesa?.numero || "-"}
                </p>
                <p>
                    <span className="font-medium">Pedidos registrados</span> {pedidos.length}
                </p>
            </div>

            {loading && <p>Carregando pedidos...</p>}

            {!loading && error && <p className="text-red-500">{error}</p>}

            {!loading && !error && pedidos.length === 0 && (
                <p>Nenhum pedido encontrado para esta mesa.</p>
            )}

            {!loading && !error && pedidos.length > 0 && (
                <div className="space-y-4">
                    {pedidos.map((pedido, idx) => {
                        const criadoEmLabel = formatTimestamp(pedido.criadoEm);

                        return (
                            <div key={pedido.id} className="border border-gray-200 rounded-lg p-4 space-y-3">
                                <div className="flex flex-col gap-1 text-gray-900">
                                    <span className="font-semibold">Pedido {idx + 1}</span>
                                    {pedido.status && (
                                        <span className="text-xs uppercase tracking-wide text-gray-500">
                                            Status: {pedido.status}
                                        </span>
                                    )}
                                    {criadoEmLabel && (
                                        <span className="text-xs text-gray-500">Criado em {criadoEmLabel}</span>
                                    )}
                                </div>

                                <ul className="space-y-1">
                                    {pedido.items.map((item, itemIdx) => {
                                        const price = item.price ?? item.valor ?? 0;
                                        const quantity = item.quantity ?? item.quantidade ?? 1;
                                        const subtotal = price * quantity;
                                        return (
                                            <li key={`${pedido.id}-${itemIdx}`} className="flex justify-between">
                                                <span>
                                                    {quantity > 1 ? `${quantity}x ` : ""}
                                                    {item.nome || item.name || "Item"}
                                                </span>
                                                <span>{formatCurrency(subtotal)}</span>
                                            </li>
                                        );
                                    })}
                                </ul>

                                {pedido.observacoes && pedido.observacoes.trim() && (
                                    <div className="pt-2 border-t border-gray-200 text-xs text-gray-600">
                                        <span className="font-medium text-gray-700">Observações: </span>
                                        {pedido.observacoes}
                                    </div>
                                )}

                                <div className="flex justify-between border-t border-gray-200 pt-2 font-semibold text-gray-900">
                                    <span>Total</span>
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
                            <span>Valor sem taxa</span>
                            <span>{formatCurrency(totalResumo)}</span>
                        </div>
                        <div className="flex justify-between text-sm font-medium">
                            <span>{serviceLabel}</span>
                            <span>{serviceValueLabel}</span>
                        </div>
                        <div className="flex justify-between font-semibold">
                            <span>Total com taxa</span>
                            <span>{totalComServicoLabel}</span>
                        </div>
                    </div>
                    <div className="flex flex-col gap-3">
                        <button
                            className="w-full bg-[#10B981] text-white p-2 rounded-lg"
                            onClick={handleGoToMenu}
                        >
                            Pedir mais
                        </button>
                        <button
                            className="w-full bg-[#D9A23B] text-white p-2 rounded-lg"
                            onClick={handleGoToPayment}
                        >
                            Realizar pagamento
                        </button>
                    </div>
                </>
            )}
        </div>
    );
}
