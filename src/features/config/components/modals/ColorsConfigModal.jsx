import { useEffect, useState } from "react";
import { Settings } from "react-coolicons";
import BaseModalWithHeader from "@/components/BaseModalWithHeader";
import LoadingSpinner from "@/components/LoadingSpinner";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/useToast";
import { getRestauranteInfo, updateRestauranteInfo } from "@/features/config/services/ConfigRestauranteService";
import ModalIntro from "@/features/config/components/coresConfig/ModalIntro";
import RestauranteImageUpload from "@/features/config/components/coresConfig/RestauranteImageUpload";
import CorInput from "@/features/config/components/coresConfig/CorInput";
import { useTranslation } from "react-i18next";
import { deleteRestaurantImage, uploadRestaurantImage } from "@/services/firebase/storageUpload";

const ColorsConfigModal = ({ isOpen, onClose }) => {
    const { t } = useTranslation();
    const [color, setColor] = useState("#F8912E");
    const [previewUrl, setPreviewUrl] = useState(null);
    const [storedImageUrl, setStoredImageUrl] = useState(null);
    const [storedImagePath, setStoredImagePath] = useState(null);
    const [selectedFile, setSelectedFile] = useState(null);
    const [removedImage, setRemovedImage] = useState(false);
    const { idRestaurante } = useAuth();
    const { notify } = useToast();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isLoadingData, setIsLoadingData] = useState(false);

    useEffect(() => {
        if (!isOpen || !idRestaurante) return;

        let isMounted = true;
        const loadData = async () => {
            setIsLoadingData(true);
            try {
                const data = (await getRestauranteInfo(idRestaurante)) || {};
                if (!isMounted) {
                    return;
                }

                setColor(data.cor_base || "#F8912E");

                const imageUrl = data.imagem_restaurante || null;
                setStoredImageUrl(imageUrl);
                setPreviewUrl(imageUrl);
                setStoredImagePath(data.imagem_restaurante_storage || null);
                setSelectedFile(null);
                setRemovedImage(false);

            } catch (error) {
                console.error("[ColorsConfigModal] erro ao carregar dados:", error);
                notify(t("config:modals.colors.error"), "error");
            } finally {
                if (isMounted) setIsLoadingData(false);
            }
        };

        loadData();
        return () => {
            isMounted = false;
        };
    }, [idRestaurante, isOpen, notify, t]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!idRestaurante) return;

        try {
            setIsSubmitting(true);
            let finalImageUrl = storedImageUrl;
            let finalImagePath = storedImagePath;

            if (selectedFile) {
                if (storedImagePath) {
                    await deleteRestaurantImage(storedImagePath);
                }
                const { downloadURL, storagePath } = await uploadRestaurantImage(selectedFile, idRestaurante);
                finalImageUrl = downloadURL;
                finalImagePath = storagePath;
            } else if (removedImage) {
                if (storedImagePath) {
                    await deleteRestaurantImage(storedImagePath);
                }
                finalImageUrl = null;
                finalImagePath = null;
            }

            await updateRestauranteInfo(idRestaurante, {
                cor_base: color,
                imagem_restaurante: finalImageUrl || null,
                imagem_restaurante_storage: finalImagePath || null,
            });

            // Aplica cor imediatamente no sistema
            const hexToRgb = (hex) => {
                const cleanHex = hex.replace("#", "");
                const bigint = parseInt(cleanHex, 16);
                const r = (bigint >> 16) & 255;
                const g = (bigint >> 8) & 255;
                const b = bigint & 255;
                return `${r}, ${g}, ${b}`;
            };
            const corFinal = color.startsWith("#") ? hexToRgb(color) : color;
            document.documentElement.style.setProperty("--color-primary", corFinal);
            localStorage.setItem("cor-primary", corFinal);

            setStoredImageUrl(finalImageUrl || null);
            setStoredImagePath(finalImagePath || null);
            setSelectedFile(null);
            setRemovedImage(false);
            setPreviewUrl(finalImageUrl || null);

            notify(t("config:modals.colors.success"), "success");
            onClose();
        } catch (error) {
            console.error("[ColorsConfigModal] erro ao salvar:", error);
            notify(t("config:modals.colors.error"), "error");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <BaseModalWithHeader
            isOpen={isOpen}
            onClose={onClose}
            title={t("config:modals.colors.title")}
            subTitle={t("config:modals.colors.subtitle")}
            icon={Settings}
        >
            <form onSubmit={handleSubmit}>
                <div className="flex flex-col md:flex-row gap-6 mt-6">
                    <ModalIntro />
                    <div className="w-full md:w-2/3 flex flex-col h-full">
                        {isLoadingData ? (
                            <div className="flex items-center justify-center py-12">
                                <LoadingSpinner />
                            </div>
                        ) : (
                            <>
                                <div className="space-y-6 flex-grow">
                                    <RestauranteImageUpload
                                        previewUrl={previewUrl}
                                        setPreviewUrl={setPreviewUrl}
                                        setFile={(file) => {
                                            setSelectedFile(file);
                                            if (file) {
                                                setRemovedImage(false);
                                            }
                                        }}
                                        onRemove={() => setRemovedImage(true)}
                                    />
                                    <CorInput color={color} setColor={setColor} />
                                </div>
                                <div className="pt-6 flex justify-end">
                                    <button
                                        type="submit"
                                        disabled={isSubmitting}
                                        className="bg-primary-dynamic cursor-pointer text-white text-sm font-medium px-6 py-2 rounded transition min-w-[120px] flex items-center justify-center"
                                    >
                                        {isSubmitting ? (
                                            <LoadingSpinner />
                                        ) : (
                                            t("config:modals.colors.buttons.continue")
                                        )}
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </form>
        </BaseModalWithHeader>
    );
};

export default ColorsConfigModal;
