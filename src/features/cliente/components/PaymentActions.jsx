const getPrimaryLabel = ({ garcomSolicitado, chamarGarcomLoading }) => {
    if (garcomSolicitado) {
        return "Garçom a caminho";
    }

    if (chamarGarcomLoading) {
        return "Chamando...";
    }

    return "Chamar garçom para pagamento";
};

const PaymentActions = ({
    onContinuar,
    onVoltar,
    garcomSolicitado,
    chamarGarcomLoading,
}) => {
    const disabledPrimary = garcomSolicitado || chamarGarcomLoading;

    return (
        <div className="flex flex-col gap-3">
            <button
                type="button"
                className="w-full bg-[#D9A23B] text-white font-semibold py-3 rounded-xl shadow-sm hover:bg-[#c48f32] transition disabled:bg-[#D9A23B]/60"
                onClick={onContinuar}
                disabled={disabledPrimary}
            >
                {getPrimaryLabel({ garcomSolicitado, chamarGarcomLoading })}
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
