import { useEffect, useMemo, useState } from "react";
import { useCliente } from "../context/ClienteContext";
import { DEFAULT_SERVICE_FEE_PERCENT } from "../utils/pedidos";
import PaymentSummary from "./PaymentSummary";
import PaymentOptionSelector from "./PaymentOptionSelector";
import PixPaymentCard from "./PixPaymentCard";
import PaymentActions from "./PaymentActions";
import { usePixPayment } from "../hooks/usePixPayment";
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
    onConfirmarPix,
}) {
    const { t } = useTranslation("cliente");
    const { numero, idRestaurante } = useCliente();
    const mesaNumeroExibicao = mesaNumero || numero;
    const [selectedOption, setSelectedOption] = useState(null);
    const [selectionError, setSelectionError] = useState(false);

    const pix = usePixPayment({
        enabled: selectedOption === "pix",
        total: totalPedidos,
        mesaNumero: mesaNumeroExibicao,
        idRestaurante,
    });

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

    useEffect(() => {
        if (garcomSolicitado) {
            setSelectedOption("garcom");
        }
    }, [garcomSolicitado]);

    const handleSelectOption = (id) => {
        if (id === "garcom" && (garcomSolicitado || chamarGarcomLoading)) return;
        setSelectedOption(id);
        setSelectionError(false);
    };

    const handleContinuar = async () => {
        // if (!selectedOption) {
        //     // setSelectionError(true);
        //     // return;
        // }

        if (!selectedOption || selectedOption === "garcom") {
            if (typeof onChamarGarcom === "function") {
                await onChamarGarcom();
            }
            return;
        }

        if (selectedOption === "pix" && typeof onConfirmarPix === "function") {
            onConfirmarPix();
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
                        selectedOption={selectedOption}
                        onSelect={handleSelectOption}
                        garcomDisabled={garcomDisabled}
                        garcomSolicitado={garcomSolicitado}
                        showSelectionError={selectionError}
                    />

                    <PixPaymentCard
                        visible={selectedOption === "pix"}
                        loading={pix.loading}
                        error={pix.error}
                        qrCode={pix.qrCode}
                        payload={pix.payload}
                        copying={pix.copying}
                        onCopy={pix.handleCopy}
                    />

                    <PaymentActions
                        selectedOption={selectedOption}
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
