import PedidoInicialImg from "@/assets/images/order/g1.svg";
import StepBars from "../components/StepBars";
import PedidoAndamentoInfo from "../components/PedidoAndamentoInfo";
import { useEffect, useMemo, useState } from "react";
import { useCliente } from "../context/ClienteContext";
import TotalPedidos from "../components/TotalPedidos";
import PagamentoResumo from "../components/PagamentoResumo";
import { usePedidosCliente } from "../hooks/usePedidosCliente";

export default function PedidoClientePage() {
    const [step, setStep] = useState(0);
    const { mesaId, idRestaurante, numero } = useCliente();
    const { pedidos, loading, error, totalPedidos } = usePedidosCliente();

    const pedidoAtual = useMemo(() => {
        if (!pedidos || pedidos.length === 0) return null;
        const reversed = [...pedidos].reverse();
        return reversed.find((p) => p.status === "andamento") || reversed.find((p) => p.status === "entregue") || null;
    }, [pedidos]);

    const baseStep = useMemo(() => {
        if (!pedidoAtual) return 0;
        if (pedidoAtual.status === "andamento") return 1;
        if (pedidoAtual.status === "entregue") return 2;
        return 0;
    }, [pedidoAtual]);

    useEffect(() => {
        setStep((prev) => {
            if (prev === 3 && baseStep >= 2) {
                return prev;
            }
            return baseStep;
        });
    }, [baseStep]);

    const statusText = {
        0: "Nenhum pedido em andamento",
        1: "Pedido Confirmado, seu pedido foi enviado para a cozinha e será preparado dentro de alguns minutos",
        2: "Pedido entregue",
        3: "Realize o pagamento para finalizar",
    };

    const handleVoltarParaPedidos = () => {
        setStep(2);
    };

    return (
        <div className="flex flex-col justify-center items-center gap-3 mt-10">
            <img src={PedidoInicialImg} loading="lazy" alt="Status do pedido" />
            <StepBars currentStep={step} />
            <div className="px-7 mt-5 text-center">
                <p>{statusText[step]}</p>
            </div>

            {step === 1 && pedidoAtual && (
                <PedidoAndamentoInfo pedido={pedidoAtual} numeroMesa={numero} />
            )}

            {step === 2 && (
                <div className="text-sm mt-5 text-center text-gray-700 px-7">
                    <p>quando terminar de comer clique em finalizar e o garçom irá até sua mesa</p>
                    <div className="flex flex-col gap-3">
                        <p>Pedido entregue</p>
                        <TotalPedidos
                            pedidos={pedidos}
                            loading={loading}
                            error={error}
                            totalPedidos={totalPedidos}
                            mesaId={mesaId}
                            idRestaurante={idRestaurante}
                            onRealizarPagamento={() => setStep(3)}
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
                    onVoltar={handleVoltarParaPedidos}
                />
            )}
        </div>
    );
}
