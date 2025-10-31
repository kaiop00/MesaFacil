import { useTranslation } from "react-i18next";

const PaymentOptionSelector = ({ garcomDisabled, garcomSolicitado }) => {
    const { t } = useTranslation("cliente");
    const showStatus = garcomSolicitado || garcomDisabled;
    const statusLabel = garcomSolicitado ? t("payment.options.waiterCalled") : t("payment.actions.waiterCalling");
    const statusColor = garcomSolicitado ? "text-[#B7791F]" : "text-[#D97706]";

    return (
        <section className="space-y-3">
            <h3 className="text-sm font-semibold text-gray-900">{t("payment.options.waiter")}</h3>

            <div
                className={`w-full border rounded-xl p-4 transition bg-white shadow-sm ${
                    garcomSolicitado ? "border-[#D9A23B] bg-[#FDF0D8]" : "border-gray-200"
                }`}
            >
                <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                        <p className="font-semibold text-gray-900 text-sm">{t("payment.options.waiter")}</p>
                        <p className="text-xs text-gray-600 mt-1 leading-relaxed">
                            {t("payment.options.waiterDescription")}
                        </p>
                    </div>
                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-widest">{t("payment.options.waiter")}</span>
                </div>

                {showStatus && (
                    <div className="mt-3 rounded-lg bg-gray-50 border border-dashed border-gray-200 p-3 text-xs text-gray-600">
                        <p className={`font-semibold ${statusColor}`}>Status: {statusLabel}</p>
                        {garcomSolicitado ? (
                            <p className="mt-1">
                                {t("pedido.waiterHelp")}
                            </p>
                        ) : (
                            <p className="mt-1">
                                {t("payment.actions.waiterCalling")}
                            </p>
                        )}
                    </div>
                )}
            </div>
        </section>
    );
};

export default PaymentOptionSelector;
