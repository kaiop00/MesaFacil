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
import { computeServiceFeeAmount, computeTotalWithService } from "../utils/pedidos";

export default function PedidoClientePage() {
    const [step, setStep] = useState(0);
    const { mesaId, idRestaurante, numero } = useCliente();
    const { pedidos, loading, error, totalPedidos } = usePedidosCliente();
    const { notify } = useToast();
    const [garcomState, setGarcomState] = useState({ loading: false, solicitado: false });
    const {
        percent: serviceFeePercent,
        loading: serviceFeeLoading,
    } = useServiceFee(idRestaurante, { enabled: Boolean(idRestaurante) });

    const valorServico = computeServiceFeeAmount(totalPedidos, serviceFeePercent);
    const totalComServico = computeTotalWithService(totalPedidos, serviceFeePercent);

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
        0: "Nenhum pedido em andamento",
        1: "Pedido Confirmado, seu pedido foi enviado para a cozinha e será preparado dentro de alguns minutos", //imagem g1
        2: "Pedido entregue", // imagem g2
        3: "Realize o pagamento para finalizar", //imagem g3
        4: "O garçom está a caminho", // imagem g4
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

    const handleChamarGarcom = async () => {
        if (!mesaId || !idRestaurante) {
            notify("Não foi possível identificar a mesa.", "error");
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
                totalComServico,
            });

            setGarcomState({ loading: false, solicitado: true });
            setStep(4);
            notify("O garçom foi acionado. Aguarde um instante.", "success");
        } catch (err) {
            console.error("Erro ao chamar garçom", err);
            setGarcomState({ loading: false, solicitado: false });
            notify("Não foi possível chamar o garçom. Tente novamente.", "error");
        }
    };

    return (
        <div className="flex flex-col justify-center items-center gap-3 mt-10">
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

            {step === 2 && (
                <div className="text-sm mt-5 text-center text-gray-700 px-7">
                    <p>quando terminar de comer clique em realizar pagamento</p>
                    <div className="flex flex-col gap-3">
                        <p>Pedido entregue</p>
                        <TotalPedidos
                            pedidos={pedidos}
                            loading={loading}
                            error={error}
                            totalPedidos={totalPedidos}
                            serviceFeePercent={serviceFeePercent}
                            serviceFeeLoading={serviceFeeLoading}
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
                    mesaNumero={mesaNumeroExibicao}
                />
            )}
        </div>
    );
}
