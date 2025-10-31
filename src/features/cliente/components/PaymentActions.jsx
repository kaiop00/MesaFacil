import { useTranslation } from "react-i18next";

const getPrimaryLabel = ({ garcomSolicitado, chamarGarcomLoading, t }) => {
    if (garcomSolicitado) {
        return t("payment.actions.waiterCalled");
    }

    if (chamarGarcomLoading) {
        return t("payment.actions.waiterCalling");
    }

    return t("payment.actions.callWaiter");
};

const PaymentActions = ({
    onContinuar,
    onVoltar,
    garcomSolicitado,
    chamarGarcomLoading,
}) => {
    const { t } = useTranslation("cliente");
    const disabledPrimary = garcomSolicitado || chamarGarcomLoading;

    return (
        <div className="flex flex-col gap-3">
            <button
                type="button"
                className="w-full bg-[#D9A23B] text-white font-semibold py-3 rounded-xl shadow-sm hover:bg-[#c48f32] transition disabled:bg-[#D9A23B]/60"
                onClick={onContinuar}
                disabled={disabledPrimary}
            >
                {getPrimaryLabel({ garcomSolicitado, chamarGarcomLoading, t })}
            </button>
            <button
                type="button"
                className="w-full text-sm text-gray-500 underline"
                onClick={onVoltar}
            >
                {t("payment.actions.back")}
            </button>
        </div>
    );
};

export default PaymentActions;
