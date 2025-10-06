import { useCallback, useEffect, useMemo, useState } from "react";
import { QrCodePix } from "qrcode-pix";
import { useToast } from "@/hooks/useToast";
import { getRestauranteInfo } from "@/features/config/services/ConfigRestauranteService";

const normalizeText = (value = "", maxLength) => {
    const trimmed = String(value).substring(0, maxLength);
    return trimmed
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toUpperCase();
};

const buildTransactionId = (mesaNumero) => {
    const mesa = (mesaNumero ?? "0")
        .toString()
        .replace(/[^a-zA-Z0-9]/g, "")
        .toUpperCase()
        .slice(-6);

    const timestamp = Date.now().toString(36).toUpperCase();
    return `MF${mesa}${timestamp}`.slice(0, 25);
};

const getErrorMessage = (error) => {
    if (!error) return null;
    if (error.message === "PIX_CONFIG_NOT_FOUND") {
        return "Configurações de Pix não encontradas.";
    }
    if (error.message === "PIX_RESTAURANT_NOT_FOUND") {
        return "Restaurante não identificado para gerar o Pix.";
    }
    return "Não foi possível gerar o QR Code Pix.";
};

export function usePixPayment({ enabled, total = 0, mesaNumero, idRestaurante }) {
    const { notify } = useToast();
    const [config, setConfig] = useState(null);
    const [payload, setPayload] = useState("");
    const [qrCode, setQrCode] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [copying, setCopying] = useState(false);

    const resetPix = useCallback(() => {
        setPayload("");
        setQrCode("");
    }, []);

    const fetchConfig = useCallback(async () => {
        if (!idRestaurante) {
            throw new Error("PIX_RESTAURANT_NOT_FOUND");
        }

        const info = await getRestauranteInfo(idRestaurante);
        const pixInfo = info?.pix;

        if (!pixInfo?.chave) {
            throw new Error("PIX_CONFIG_NOT_FOUND");
        }

        return {
            chave: pixInfo.chave,
            nome: pixInfo.nome || "",
            cidade: pixInfo.cidade || "",
        };
    }, [idRestaurante]);

    useEffect(() => {
        if (!enabled) {
            setError(null);
            resetPix();
            return;
        }

        let cancelled = false;

        const generatePixCode = async () => {
            setLoading(true);
            setError(null);

            try {
                const resolvedConfig = config ?? (await fetchConfig());
                if (!resolvedConfig) {
                    if (!cancelled) {
                        resetPix();
                    }
                    return;
                }

                if (!config) {
                    setConfig(resolvedConfig);
                }

                const sanitizedName = normalizeText(resolvedConfig.nome || "Restaurante", 25) || "RESTAURANTE";
                const sanitizedCity = normalizeText(resolvedConfig.cidade || "SAO PAULO", 15) || "SAO PAULO";
                const valueNumber = Number(total) || 0;

                const qrCodePix = QrCodePix({
                    version: "01",
                    key: resolvedConfig.chave,
                    name: sanitizedName,
                    city: sanitizedCity,
                    transactionId: buildTransactionId(mesaNumero),
                    message: mesaNumero ? `Mesa ${mesaNumero}` : undefined,
                    value: valueNumber > 0 ? Number(valueNumber.toFixed(2)) : undefined,
                });

                const generatedPayload = qrCodePix.payload();
                const base64 = await qrCodePix.base64();

                if (cancelled) return;

                setPayload(generatedPayload);
                setQrCode(base64);
            } catch (caughtError) {
                if (cancelled) return;
                console.error("Erro ao gerar QR Code Pix", caughtError);
                setError(getErrorMessage(caughtError));
                resetPix();
            } finally {
                if (!cancelled) {
                    setLoading(false);
                }
            }
        };

        generatePixCode();

        return () => {
            cancelled = true;
        };
    }, [enabled, total, mesaNumero, config, fetchConfig, resetPix]);

    const handleCopy = useCallback(async () => {
        if (!payload) return;

        setCopying(true);
        try {
            if (navigator?.clipboard?.writeText) {
                await navigator.clipboard.writeText(payload);
            } else {
                const element = document.createElement("textarea");
                element.value = payload;
                element.setAttribute("readonly", "");
                element.style.position = "absolute";
                element.style.left = "-9999px";
                document.body.appendChild(element);
                element.select();
                document.execCommand("copy");
                document.body.removeChild(element);
            }
            notify("Código Pix copiado", "success");
        } catch (copyError) {
            console.error("Erro ao copiar código Pix", copyError);
            notify("Não foi possível copiar o código Pix", "error");
        } finally {
            setCopying(false);
        }
    }, [notify, payload]);

    const hasData = useMemo(() => Boolean(payload && qrCode), [payload, qrCode]);

    return {
        payload,
        qrCode,
        loading,
        error,
        copying,
        hasData,
        handleCopy,
    };
}
