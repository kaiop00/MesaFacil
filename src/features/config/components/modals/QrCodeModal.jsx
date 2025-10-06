import BaseModalWithHeader from "@/components/BaseModalWithHeader";
import { Coffee } from "react-coolicons";
import { QRCodeSVG } from "qrcode.react";

export function QrCodeModal({
    isOpen,
    onClose,
    mesa,
}) {
    if (!isOpen || !mesa) return null;

    const url = mesa.qrCodeUrl

    return (
        <BaseModalWithHeader
            isOpen={isOpen}
            onClose={onClose}
            title="QRcode"
            subTitle={`QRcode da mesa ${mesa.numero}`}
            icon={Coffee}
        >
            <div className="flex justify-center items-center py-10">
                <QRCodeSVG value={url} size={400} />
            </div>
        </BaseModalWithHeader>
    );
}