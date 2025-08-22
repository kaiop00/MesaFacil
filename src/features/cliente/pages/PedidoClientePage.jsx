import PedidoInicialImg from "@/assets/images/order/g1.svg"
import StepBars from "../components/StepBars"
import { useState } from "react"

export default function PedidoClientePage({ }) {
    const [step, setStep] = useState(0);

    return (
        <div className="flex flex-col justify-center items-center gap-3 mt-10">
            <img src={PedidoInicialImg} />
            <StepBars currentStep={step} />
            <p>Nenhum Pedido em Andamento</p>
        </div>
    )
}