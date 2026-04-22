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

    // Detecta se é pedido de retirada ou delivery
    const isRetirada = useMemo(() => {
        return pedidoAtual?.tipoEntrega === 'retirada';
    }, [pedidoAtual]);

    // Para WhatsApp: apenas 2 steps (0: inicial, 1: preparando, 2: pronto)
    // Para mesa convencional: 4 steps (0: inicial, 1: confirmado, 2: entregue, 3: pagamento, 4: garçom)
    const baseStep = useMemo(() => {
        if (!pedidoAtual) return 0;
        
        if (isWhatsApp) {
            // Para WhatsApp: apenas 2 estados
            if (pedidoAtual.status === "andamento") return 1;
            if (pedidoAtual.status === "entregue") return 2;
            return 0;
        }
        
        // Para mesa convencional: lógica original
        if (pedidoAtual.status === "andamento") return 1;
        if (pedidoAtual.status === "entregue") return 2;
        return 0;
    }, [pedidoAtual, isWhatsApp]);

    useEffect(() => {
        // Para WhatsApp, não permitir steps além de 2
        if (isWhatsApp) {
            setStep(baseStep);
            return;
        }
        
        // Lógica original para mesa convencional
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
    }, [baseStep, garcomState.solicitado, isWhatsApp]);

    useEffect(() => {
        if (baseStep <= 1 && garcomState.solicitado) {
            setGarcomState({ loading: false, solicitado: false });
        }
    }, [baseStep, garcomState.solicitado]);

    // Textos de status diferenciados para WhatsApp
    const statusText = useMemo(() => {
        if (isWhatsApp) {
            return {
                0: t("pedido.status.none"),
                1: t("pedido.status.confirmed"),
                2: isRetirada 
                    ? t("pedido.status.readyForPickup") || "Pedido pronto para retirada!"
                    : t("pedido.status.outForDelivery") || "Pedido saiu para entrega!",
            };
        }
        
        return {
            0: t("pedido.status.none"),
            1: t("pedido.status.confirmed"),
            2: t("pedido.status.delivered"),
            3: t("pedido.status.payment"),
            4: t("pedido.status.waiterComing"),
        };
    }, [t, isWhatsApp, isRetirada]);

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
                    {/* WhatsApp: 2 steps | Mesa convencional: 4 steps */}
                    <StepBars currentStep={step} total={isWhatsApp ? 2 : 4} />
                    <div className="px-7 mt-5 text-center">
                        <p>{statusText[step]}</p>
                    </div>

            {/* Step 1: Pedido em andamento/preparação */}
            {step === 1 && pedidoAtual && (
                <PedidoAndamentoInfo pedido={pedidoAtual} numeroMesa={numero} />
            )}

            {/* Step 2 para WhatsApp: Pedido pronto (delivery ou retirada) */}
            {step === 2 && isWhatsApp && (
                <div className="text-sm mt-5 text-center text-gray-700 px-7">
                    <div className="flex flex-col gap-4">
                        {isRetirada ? (
                            // Retirada no local
                            <>
                                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                    <p className="text-blue-800 font-medium text-base">
                                        🏪 {t("pedido.pickup.ready") || "Pedido pronto para retirada!"}
                                    </p>
                                    <p className="text-blue-600 text-sm mt-2">
                                        {t("pedido.pickup.readyMessage") || "Seu pedido está pronto! Dirija-se ao balcão para retirar."}
                                    </p>
                                </div>
                                
                                {pedidoAtual && (
                                    <div className="bg-gray-50 rounded-lg p-3">
                                        <p className="text-gray-600 text-xs mb-2">
                                            {t("pedido.delivery.orderSummary") || "Resumo do pedido"}
                                        </p>
                                        {pedidoAtual.taxaEntrega?.aplicada && pedidoAtual.taxaEntrega?.valor > 0 ? (
                                            <div className="space-y-1 text-sm">
                                                <div className="flex justify-between text-gray-700">
                                                    <span>Subtotal:</span>
                                                    <span>R$ {(totalPedidos - pedidoAtual.taxaEntrega.valor).toFixed(2)}</span>
                                                </div>
                                                <div className="flex justify-between text-gray-700">
                                                    <span>Taxa de entrega:</span>
                                                    <span>R$ {pedidoAtual.taxaEntrega.valor.toFixed(2)}</span>
                                                </div>
                                                <div className="flex justify-between font-semibold text-gray-800 pt-1 border-t border-gray-300">
                                                    <span>{t("common.total")}:</span>
                                                    <span>R$ {totalPedidos.toFixed(2)}</span>
                                                </div>
                                            </div>
                                        ) : (
                                            <p className="font-semibold text-gray-800">
                                                {t("common.total")}: R$ {totalPedidos.toFixed(2)}
                                            </p>
                                        )}
                                    </div>
                                )}
                                
                                <button
                                    onClick={handleConfirmarRecebimento}
                                    disabled={confirmandoRecebimento}
                                    className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
                                >
                                    {confirmandoRecebimento ? (
                                        <>
                                            <span className="animate-spin">⏳</span>
                                            {t("pedido.pickup.confirming") || "Confirmando..."}
                                        </>
                                    ) : (
                                        <>
                                            {t("pedido.pickup.confirmPickup") || "Confirmar Retirada"}
                                        </>
                                    )}
                                </button>
                            </>
                        ) : (
                            // Delivery
                            <>
                                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                                    <p className="text-green-800 font-medium text-base">
                                        🚴 {t("pedido.delivery.outForDelivery") || "Pedido saiu para entrega!"}
                                    </p>
                                    <p className="text-green-600 text-sm mt-2">
                                        {t("pedido.delivery.outForDeliveryMessage") || "Seu pedido está a caminho!"}
                                    </p>
                                </div>
                                
                                {pedidoAtual && (
                                    <div className="bg-gray-50 rounded-lg p-3">
                                        <p className="text-gray-600 text-xs mb-2">
                                            {t("pedido.delivery.orderSummary") || "Resumo do pedido"}
                                        </p>
                                        {pedidoAtual.taxaEntrega?.aplicada && pedidoAtual.taxaEntrega?.valor > 0 ? (
                                            <div className="space-y-1 text-sm">
                                                <div className="flex justify-between text-gray-700">
                                                    <span>Subtotal:</span>
                                                    <span>R$ {(totalPedidos - pedidoAtual.taxaEntrega.valor).toFixed(2)}</span>
                                                </div>
                                                <div className="flex justify-between text-gray-700">
                                                    <span>Taxa de entrega:</span>
                                                    <span>R$ {pedidoAtual.taxaEntrega.valor.toFixed(2)}</span>
                                                </div>
                                                <div className="flex justify-between font-semibold text-gray-800 pt-1 border-t border-gray-300">
                                                    <span>{t("common.total")}:</span>
                                                    <span>R$ {totalPedidos.toFixed(2)}</span>
                                                </div>
                                            </div>
                                        ) : (
                                            <p className="font-semibold text-gray-800">
                                                {t("common.total")}: R$ {totalPedidos.toFixed(2)}
                                            </p>
                                        )}
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
                                            {t("pedido.delivery.confirming") || "Confirmando..."}
                                        </>
                                    ) : (
                                        <>
                                            {t("pedido.delivery.confirmReceipt") || "Confirmar Recebimento"}
                                        </>
                                    )}
                                </button>
                            </>
                        )}
                    </div>
                </div>
            )}

            {/* Step 2 para mesa convencional: Pedido entregue */}
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

            {/* Step 3: Resumo de pagamento (apenas mesa convencional) */}
            {step === 3 && !isWhatsApp && (
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

            {/* Step 4: Aguardando garçom (apenas mesa convencional) */}
            {step === 4 && !isWhatsApp && (
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
