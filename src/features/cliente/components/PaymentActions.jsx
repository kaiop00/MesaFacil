const getPrimaryLabel = ({ selectedOption, garcomSolicitado, chamarGarcomLoading }) => {
    if (selectedOption !== "garcom") {
        return "Continuar";
    }

    if (garcomSolicitado) {
        return "Garçom a caminho";
    }

    if (chamarGarcomLoading) {
        return "Chamando...";
    }

    return "Confirmar chamada do garçom";
};

const PaymentActions = ({
    selectedOption,
    onContinuar,
    onVoltar,
    garcomSolicitado,
    chamarGarcomLoading,
}) => {
    const disabledPrimary =
        (selectedOption === "garcom" && (chamarGarcomLoading || garcomSolicitado)) || chamarGarcomLoading;

    return (
        <div className="flex flex-col gap-3">
            <button
                type="button"
                className="w-full bg-[#D9A23B] text-white font-semibold py-3 rounded-xl shadow-sm hover:bg-[#c48f32] transition disabled:bg-[#D9A23B]/60"
                onClick={onContinuar}
                disabled={disabledPrimary}
            >
                {getPrimaryLabel({ selectedOption, garcomSolicitado, chamarGarcomLoading })}
            </button>
            <button
                type="button"
                className="w-full text-sm text-gray-500 underline"
                onClick={onVoltar}
            >
                Voltar para pedidos
            </button>
        </div>
    );
};

export default PaymentActions;
