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

    const url = mesa.qrCodeUrl

    return (
        <BaseModalWithHeader
            isOpen={isOpen}
            onClose={onClose}
            title={t("config:modals.qrCode.title")}
            subTitle={t("config:modals.qrCode.subtitle", { number: mesa.numero })}
            icon={Coffee}
        >
            <div className="flex justify-center items-center py-10">
                <QRCodeSVG value={url} size={400} />
            </div>
        </BaseModalWithHeader>
    );
}