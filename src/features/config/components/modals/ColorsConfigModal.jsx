import { useState } from "react";
import { Settings } from "react-coolicons";
import BaseModalWithHeader from "@/components/BaseModalWithHeader";
import LoadingSpinner from "@/components/LoadingSpinner";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/useToast";
import { updateRestauranteInfo } from "@/features/config/services/ConfigRestauranteService";
import ModalIntro from "@/features/config/components/coresConfig/ModalIntro";
import RestauranteImageUpload from "@/features/config/components/coresConfig/RestauranteImageUpload";
import CorInput from "@/features/config/components/coresConfig/CorInput";

const ColorsConfigModal = ({ isOpen, onClose }) => {
    const [color, setColor] = useState("#F1C322");
    const [imagemUrl, setImagemUrl] = useState(null);
    const { idRestaurante } = useAuth();
    const { notify } = useToast();
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            setLoading(true);

            await updateRestauranteInfo(idRestaurante, {
                cor_base: color,
                imagem_restaurante: imagemUrl || null,
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

            notify("Salvo com sucesso", "success");
            onClose();
        } catch {
            notify("Erro ao salvar", "error");
        } finally {
            setLoading(false);
        }
    };


    return (
        <BaseModalWithHeader
            isOpen={isOpen}
            onClose={onClose}
            title="Cores"
            subTitle="Gerencie as configurações de cores"
            icon={Settings}
        >
            <form onSubmit={handleSubmit}>
                <div className="flex flex-col md:flex-row gap-6 mt-6">
                    <ModalIntro />
                    <div className="w-full md:w-2/3 flex flex-col h-full">
                        <div className="space-y-6 flex-grow">
                            <RestauranteImageUpload
                                imagemUrl={imagemUrl}
                                setImagemUrl={setImagemUrl}
                            />
                            <CorInput color={color} setColor={setColor} />
                        </div>
                        <div className="pt-6 flex justify-end">
                            <button
                                type="submit"
                                disabled={loading}
                                className="bg-primary-dynamic cursor-pointer text-white text-sm font-medium px-6 py-2 rounded transition min-w-[120px] flex items-center justify-center"
                            >
                                {loading ? <LoadingSpinner /> : "Continuar"}
                            </button>
                        </div>
                    </div>
                </div>
            </form>
        </BaseModalWithHeader>
    );
};

export default ColorsConfigModal;
