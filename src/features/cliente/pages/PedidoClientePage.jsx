import PedidoInicialImg from "@/assets/images/order/g1.svg";
import StepBars from "../components/StepBars";
import PedidoAndamentoInfo from "../components/PedidoAndamentoInfo";
import { useState, useEffect } from "react";
import { useCliente } from "../context/ClienteContext";
import { collection, onSnapshot, query, orderBy } from "firebase/firestore";
import { db } from "@/config/firebaseConfig";

export default function PedidoClientePage() {
    const [step, setStep] = useState(0);
    const [pedidoAtual, setPedidoAtual] = useState(null);
    const { mesaId, idRestaurante, numero } = useCliente();

    useEffect(() => {
        if (!mesaId || !idRestaurante) return;

        const pedidosRef = collection(
            db,
            "restaurantes",
            idRestaurante,
            "mesas",
            mesaId,
            "pedidos"
        );

        const q = query(pedidosRef, orderBy("criadoEm", "desc"));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            if (snapshot.empty) {
                setStep(0);
                setPedidoAtual(null);
                return;
            }

            const pedidos = snapshot.docs.map((doc) => ({
                id: doc.id,
                ...doc.data(),
            }));

            const atual = pedidos.find((p) => p.status === "andamento") || pedidos.find((p) => p.status === "entregue");

            if (!atual) {
                setStep(0);
                setPedidoAtual(null);
                return;
            }

            setPedidoAtual(atual);
            setStep(atual.status === "entregue" ? 2 : 1);
        });

        return () => unsubscribe();
    }, [mesaId, idRestaurante]);

    const statusText = {
        0: "Nenhum pedido em andamento",
        1: "Pedido Confirmado, seu pedido foi enviado para a cozinha e será preparado dentro de alguns minutos",
        2: "Pedido entregue",
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
                </div>
            )}
        </div>
    );
}
