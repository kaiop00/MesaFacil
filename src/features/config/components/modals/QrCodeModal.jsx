import BaseModalWithHeader from "@/components/BaseModalWithHeader";
import { Coffee } from "react-coolicons";
import { QRCodeSVG } from "qrcode.react";
import { useTranslation } from "react-i18next";
import { resolveQrCodeUrl } from "@/features/config/utils/qrCodeUrl";

export function QrCodeModal({
    isOpen,
    onClose,
    mesa,
}) {
    const { t } = useTranslation();
    if (!isOpen || !mesa) return null;

    const url = resolveQrCodeUrl(
        mesa.qrCodeUrl,
        mesa?.id ? `/mesa/${mesa?.numero ?? "-"}-${mesa.id}?restaurante=${mesa?.idRestaurante || ""}` : ""
    );
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
                <div className="w-full max-w-lg overflow-hidden rounded-3xl border border-gray-200 bg-white p-[1px] shadow-xl">
                    <div className="flex h-full flex-col items-center gap-8 rounded-3xl bg-white px-10 py-9 text-center">
                        <div className="flex flex-col items-center gap-4">
                            <span className="inline-flex items-center gap-2 rounded-full bg-gray-100 px-5 py-1.5 text-sm font-semibold uppercase tracking-wide text-gray-700">
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
