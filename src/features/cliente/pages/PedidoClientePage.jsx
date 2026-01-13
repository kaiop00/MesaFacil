import PedidoConfirmadoImg from "@/assets/images/order/g1.svg";
import PedidoEntregueImg from "@/assets/images/order/g2.svg";
import RealizarPagamentoImg from "@/assets/images/order/g3.svg";
import AguardandoGarcomImg from "@/assets/images/order/g4.svg";
import StepBars from "../components/StepBars";
import PedidoAndamentoInfo from "../components/PedidoAndamentoInfo";
import { useEffect, useMemo, useState } from "react";
import { useCliente } from "../context/ClienteContext";
import TotalPedidos from "../components/TotalPedidos";
import PagamentoResumo from "../components/PagamentoResumo";
import AguardandoGarcom from "../components/AguardandoGarcom";
import { usePedidosCliente } from "../hooks/usePedidosCliente";
import { solicitarGarcom } from "../services/garcomService";
import { useToast } from "@/hooks/useToast";
import { useServiceFee } from "../hooks/useServiceFee";
import { useCoverCharge } from "../hooks/useCoverCharge";
import { useOrderOrigin } from "@/hooks/useOrderOrigin";
import { useMesa } from "../hooks/useMesa";
import { finalizarPedidoEspecifico } from "@/features/order/services/orderService";
import {
    computeServiceFeeAmount,
    computeTotalWithService,
    computeCoverChargeAmount,
    DEFAULT_SERVICE_FEE_PERCENT,
} from "../utils/pedidos";
import { useTranslation } from "react-i18next";

export default function PedidoClientePage() {
    const { t } = useTranslation("cliente");
    const [step, setStep] = useState(0);
    const { mesaId, idRestaurante, numero } = useCliente();
    const { pedidos, loading, error, totalPedidos } = usePedidosCliente();
    const { notify } = useToast();
    const [garcomState, setGarcomState] = useState({ loading: false, solicitado: false });
    const { isWhatsApp } = useOrderOrigin();
    const [confirmandoRecebimento, setConfirmandoRecebimento] = useState(false);
    const { origin: orderOrigin } = useOrderOrigin();
    const { mesa } = useMesa();
    const numeroPessoas = mesa?.numeroPessoas || 1;
    const {
        percent: serviceFeePercent,
        loading: serviceFeeLoading,
        isExempt: serviceFeeExempt,
    } = useServiceFee(idRestaurante, { enabled: Boolean(idRestaurante), orderOrigin });
    const {
        enabled: coverChargeEnabled,
        value: coverChargeValue,
        loading: coverChargeLoading,
        isExempt: coverChargeExempt,
    } = useCoverCharge(idRestaurante, { enabled: Boolean(idRestaurante), orderOrigin });

    const valorServico = computeServiceFeeAmount(totalPedidos, serviceFeePercent);
    const valorCouvert = computeCoverChargeAmount(coverChargeEnabled, coverChargeValue, numeroPessoas);
    const totalComServico = computeTotalWithService(
        totalPedidos,
        serviceFeePercent,
        DEFAULT_SERVICE_FEE_PERCENT,
        valorCouvert
    );

    const pedidoAtual = useMemo(() => {
        if (!pedidos || pedidos.length === 0) return null;
        const reversed = [...pedidos].reverse();
        return reversed.find((p) => p.status === "andamento") || reversed.find((p) => p.status === "entregue") || null;
    }, [pedidos]);

    const mesaNumeroExibicao = useMemo(() => {
        return numero || pedidoAtual?.mesaNumero || mesaId;
    }, [numero, pedidoAtual, mesaId]);

    const baseStep = useMemo(() => {
        if (!pedidoAtual) return 0;
        if (pedidoAtual.status === "andamento") return 1;
        if (pedidoAtual.status === "entregue") return 2;
        return 0;
    }, [pedidoAtual]);

    useEffect(() => {
        setStep((prev) => {
            if (baseStep <= 1) {
                return baseStep;
            }

            if (garcomState.solicitado) {
                return 4;
            }

            if (prev === 3 && baseStep >= 2) {
                return prev;
            }

            return baseStep;
        });
    }, [baseStep, garcomState.solicitado]);

    useEffect(() => {
        if (baseStep <= 1 && garcomState.solicitado) {
            setGarcomState({ loading: false, solicitado: false });
        }
    }, [baseStep, garcomState.solicitado]);

    const statusText = {
        0: t("pedido.status.none"),
        1: t("pedido.status.confirmed"),
        2: t("pedido.status.delivered"),
        3: t("pedido.status.payment"),
        4: t("pedido.status.waiterComing"),
    };

    const stepImageMap = {
        1: PedidoConfirmadoImg,
        2: PedidoEntregueImg,
        3: RealizarPagamentoImg,
        4: AguardandoGarcomImg,
    };

    const handleVoltarParaPedidos = () => {
        setGarcomState((prev) => ({ ...prev, solicitado: false }));
        setStep(2);
    };

    const handleConfirmarRecebimento = async () => {
        if (!mesaId || !idRestaurante || !pedidoAtual?.id) {
            notify(t("pedido.delivery.confirmError"), "error");
            return;
        }

        if (confirmandoRecebimento) {
            return;
        }

        setConfirmandoRecebimento(true);

        try {
            await finalizarPedidoEspecifico(idRestaurante, mesaId, pedidoAtual.id, {}, false);
            notify(t("pedido.delivery.confirmSuccess"), "success");
            setStep(0);
        } catch (err) {
            console.error("Erro ao confirmar recebimento", err);
            notify(t("pedido.delivery.confirmError"), "error");
        } finally {
            setConfirmandoRecebimento(false);
        }
    };

    const handleChamarGarcom = async () => {
        if (!mesaId || !idRestaurante) {
            notify(t("pedido.waiterError"), "error");
            return;
        }

        if (garcomState.loading || garcomState.solicitado) {
            return;
        }

        setGarcomState({ loading: true, solicitado: false });

        try {
            const ultimoPedido = pedidos[pedidos.length - 1];
            const mesaNumeroFormatado = numero || ultimoPedido?.mesaNumero || mesaId;
            const itensResumo = (ultimoPedido?.items || []).map((item) => {
                const price = item.price ?? item.valor ?? 0;
                const quantity = item.quantity ?? item.quantidade ?? 1;
                return {
                    nome: item.nome || item.name || "Item",
                    quantity,
                    total: price * quantity,
                };
            });

            await solicitarGarcom({
                idRestaurante,
                mesaId,
                mesaNumero: mesaNumeroFormatado,
                motivo: "Realizar pagamento",
                pedidoId: ultimoPedido?.id || null,
                itens: itensResumo,
                total: totalPedidos,
                taxaServicoPercentual: serviceFeePercent,
                valorServico,
                couvertAtivo: coverChargeEnabled,
                valorCouvert,
                totalComServico,
            });

            setGarcomState({ loading: false, solicitado: true });
            setStep(4);
            notify(t("pedido.waiterSuccess"), "success");
        } catch (err) {
            console.error("Erro ao chamar garçom", err);
            setGarcomState({ loading: false, solicitado: false });
            notify(t("pedido.waiterError"), "error");
        }
    };

    return (
        <div className="flex flex-col justify-center items-center gap-3 mt-10">
            {loading ? (
                <div className="text-center">
                    <p className="text-gray-600">{t("common.loading") || "Carregando..."}</p>
                </div>
            ) : !pedidoAtual && pedidos.length === 0 ? (
                <div className="text-center px-7">
                    <div className="mb-4 text-4xl">📋</div>
                    <p className="text-gray-600 text-lg">
                        {isWhatsApp 
                            ? t("pedido.noPedidosWhatsApp") || "Você ainda não tem pedidos. Faça seu primeiro pedido!"
                            : t("pedido.noPedidos") || "Nenhum pedido encontrado"
                        }
                    </p>
                    {isWhatsApp && (
                        <a 
                            href="/mesa/WA-whatsapp" 
                            className="mt-4 inline-block bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-6 rounded-lg transition-colors"
                        >
                            {t("common.viewMenu") || "Ver Cardápio"}
                        </a>
                    )}
                </div>
            ) : (
                <>
                    <img
                        src={stepImageMap[step] || PedidoConfirmadoImg}
                        loading="lazy"
                        alt="Status do pedido"
                    />
                    <StepBars currentStep={step} total={4} />
                    <div className="px-7 mt-5 text-center">
                        <p>{statusText[step]}</p>
                    </div>

            {step === 1 && pedidoAtual && (
                <PedidoAndamentoInfo pedido={pedidoAtual} numeroMesa={numero} />
            )}

            {step === 2 && isWhatsApp && (
                <div className="text-sm mt-5 text-center text-gray-700 px-7">
                    <div className="flex flex-col gap-4">
                        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                            <p className="text-green-800 font-medium text-base">
                                🚴 {t("pedido.delivery.outForDelivery")}
                            </p>
                            <p className="text-green-600 text-sm mt-2">
                                {t("pedido.delivery.outForDeliveryMessage")}
                            </p>
                        </div>
                        
                        {pedidoAtual && (
                            <div className="bg-gray-50 rounded-lg p-3">
                                <p className="text-gray-600 text-xs mb-2">
                                    {t("pedido.delivery.orderSummary")}
                                </p>
                                <p className="font-semibold text-gray-800">
                                    {t("common.total")}: R$ {totalPedidos.toFixed(2)}
                                </p>
                            </div>
                        )}
                        
                        <button
                            onClick={handleConfirmarRecebimento}
                            disabled={confirmandoRecebimento}
                            className="w-full bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white font-medium py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
                        >
                            {confirmandoRecebimento ? (
                                <>
                                    <span className="animate-spin">⏳</span>
                                    {t("pedido.delivery.confirming")}
                                </>
                            ) : (
                                <>
                                    {t("pedido.delivery.confirmReceipt")}
                                </>
                            )}
                        </button>
                    </div>
                </div>
            )}

            {step === 2 && !isWhatsApp && (
                <div className="text-sm mt-5 text-center text-gray-700 px-7">
                    <p>{t("pedido.deliveredMessage")}</p>
                    <div className="flex flex-col gap-3">
                        <p>{t("pedido.status.delivered")}</p>
                        <TotalPedidos
                            pedidos={pedidos}
                            loading={loading}
                            error={error}
                            totalPedidos={totalPedidos}
                            serviceFeePercent={serviceFeePercent}
                            serviceFeeLoading={serviceFeeLoading}
                            serviceFeeExempt={serviceFeeExempt}
                            coverChargeEnabled={coverChargeEnabled}
                            coverChargeAmount={coverChargeValue}
                            coverChargeLoading={coverChargeLoading}
                            numeroPessoas={numeroPessoas}
                            mesaId={mesaId}
                            idRestaurante={idRestaurante}
                            onRealizarPagamento={() => {
                                setGarcomState((prev) => ({ ...prev, solicitado: false }));
                                setStep(3);
                            }}
                        />
                    </div>
                </div>
            )}

            {step === 3 && (
                <PagamentoResumo
                    pedidos={pedidos}
                    loading={loading}
                    error={error}
                    totalPedidos={totalPedidos}
                    serviceFeePercent={serviceFeePercent}
                    serviceFeeLoading={serviceFeeLoading}
                    serviceFeeExempt={serviceFeeExempt}
                    coverChargeEnabled={coverChargeEnabled}
                    coverChargeAmount={coverChargeValue}
                    coverChargeLoading={coverChargeLoading}
                    numeroPessoas={numeroPessoas}
                    onVoltar={handleVoltarParaPedidos}
                    onChamarGarcom={handleChamarGarcom}
                    chamarGarcomLoading={garcomState.loading}
                    garcomSolicitado={garcomState.solicitado}
                    mesaNumero={mesaNumeroExibicao}
                />
            )}

            {step === 4 && (
                <AguardandoGarcom
                    pedidos={pedidos}
                    totalPedidos={totalPedidos}
                    serviceFeePercent={serviceFeePercent}
                    serviceFeeLoading={serviceFeeLoading}
                    serviceFeeExempt={serviceFeeExempt}
                    coverChargeEnabled={coverChargeEnabled}
                    coverChargeAmount={coverChargeValue}
                    coverChargeLoading={coverChargeLoading}
                    numeroPessoas={numeroPessoas}
                    mesaNumero={mesaNumeroExibicao}
                />
            )}
                </>
            )}
        </div>
    );
}
