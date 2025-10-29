import BaseModalWithHeader from "@/components/BaseModalWithHeader";
import { Coffee } from "react-coolicons";
import { QRCodeSVG } from "qrcode.react";
import { useTranslation } from "react-i18next";

export function QrCodeModal({
    isOpen,
    onClose,
    mesa,
}) {
    const { t } = useTranslation();
    if (!isOpen || !mesa) return null;

    const url = mesa.qrCodeUrl;
    const tableNumber = mesa?.numero ?? "-";

    return (
        <BaseModalWithHeader
            isOpen={isOpen}
            onClose={onClose}
            title={t("config:modals.qrCode.title")}
            subTitle={t("config:modals.qrCode.subtitle", { number: tableNumber })}
            icon={Coffee}
        >
            <div className="flex justify-center py-6 px-4">
                <div className="w-full max-w-lg overflow-hidden rounded-3xl bg-gradient-to-br from-amber-50 via-white to-white p-[1px] shadow-xl">
                    <div className="flex h-full flex-col items-center gap-8 rounded-3xl bg-white/90 px-10 py-9 text-center backdrop-blur-sm">
                        <div className="flex flex-col items-center gap-4">
                            <span className="inline-flex items-center gap-2 rounded-full bg-amber-100 px-5 py-1.5 text-sm font-semibold uppercase tracking-wide text-amber-700 shadow-sm">
                                {t("config:modals.qrCode.tableLabel", { number: tableNumber })}
                            </span>
                            <h2 className="text-2xl font-semibold text-gray-800">
                                {t("config:modals.qrCode.scanTitle")}
                            </h2>
                            <p className="max-w-md text-sm leading-relaxed text-gray-600">
                                {t("config:modals.qrCode.instructions")}
                            </p>
                        </div>
                        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm transition-transform duration-200 hover:scale-[1.01]">
                        <QRCodeSVG value={url} size={320} />
                        </div>
                    </div>
                </div>
            </div>
        </BaseModalWithHeader>
    );
}
