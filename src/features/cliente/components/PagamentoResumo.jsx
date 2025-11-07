import { useMemo } from "react";
import { useCliente } from "../context/ClienteContext";
import { DEFAULT_SERVICE_FEE_PERCENT } from "../utils/pedidos";
import PaymentSummary from "./PaymentSummary";
import PaymentOptionSelector from "./PaymentOptionSelector";
import PaymentActions from "./PaymentActions";
import { useTranslation } from "react-i18next";

export default function PagamentoResumo({
    pedidos = [],
    loading = false,
    error = null,
    totalPedidos = 0,
    serviceFeePercent = DEFAULT_SERVICE_FEE_PERCENT,
    serviceFeeLoading = false,
    onVoltar,
    onChamarGarcom,
    chamarGarcomLoading = false,
    garcomSolicitado = false,
    mesaNumero,
}) {
    const { t } = useTranslation("cliente");
    const { numero } = useCliente();
    const mesaNumeroExibicao = mesaNumero || numero;

    const itensResumo = useMemo(() => {
        return pedidos.flatMap((pedido) => {
            return (pedido.items || []).map((item, index) => {
                const price = item.price ?? item.valor ?? 0;
                const quantity = item.quantity ?? item.quantidade ?? 1;
                return {
                    id: `${pedido.id}-${index}`,
                    nome: item.nome || item.name || "Item",
                    quantity,
                    total: price * quantity,
                };
            });
        });
    }, [pedidos]);

    const handleContinuar = async () => {
        if (typeof onChamarGarcom === "function") {
            await onChamarGarcom();
            return;
        }
    };

    const garcomDisabled = chamarGarcomLoading || garcomSolicitado;

    return (
        <div className="flex flex-col items-center mt-6 px-4 pb-6">
            <div className="bg-white rounded-xl shadow-md w-full max-w-md overflow-hidden">
                <div className="px-6 py-6 space-y-6 text-gray-700 text-sm">
                    <div className="space-y-1 text-center">
                        <p className="text-xs text-[#D9A23B] font-semibold uppercase tracking-[0.2em]">{t("common.table")} {mesaNumeroExibicao || "-"}</p>
                        <h2 className="text-2xl font-semibold text-gray-900">{t("payment.title")}</h2>
                        <p className="text-sm text-gray-500">{t("payment.subtitle")}</p>
                    </div>

                    <PaymentSummary
                        items={itensResumo}
                        loading={loading}
                        error={error}
                        subtotal={totalPedidos}
                        serviceFeePercent={serviceFeePercent}
                        serviceFeeLoading={serviceFeeLoading}
                    />

                    <PaymentOptionSelector
                        garcomDisabled={garcomDisabled}
                        garcomSolicitado={garcomSolicitado}
                    />

                    <PaymentActions
                        onContinuar={handleContinuar}
                        onVoltar={onVoltar}
                        garcomSolicitado={garcomSolicitado}
                        chamarGarcomLoading={chamarGarcomLoading}
                    />
                </div>
            </div>
        </div>
    );
}
