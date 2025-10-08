import { useEffect, useMemo, useState } from "react";
import BaseModalWithHeader from "@/components/BaseModalWithHeader";
import LoadingSpinner from "@/components/LoadingSpinner";
import { Coffee } from "react-coolicons";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/useToast";
import { getRestauranteInfo, updateRestauranteInfo } from "@/features/config/services/ConfigRestauranteService";

const initialState = {
    chavePix: "",
    nomeTitular: "",
    cidadeTitular: "",
};

export default function PixConfigModal({ isOpen, onClose }) {
    const { idRestaurante } = useAuth();
    const { notify } = useToast();
    const [formData, setFormData] = useState(initialState);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);

    const isFormDisabled = useMemo(() => saving || loading, [saving, loading]);

    useEffect(() => {
        if (!isOpen || !idRestaurante) {
            return;
        }

        let isMounted = true;

        const loadPixConfig = async () => {
            try {
                setLoading(true);
                const info = await getRestauranteInfo(idRestaurante);

                if (!isMounted) {
                    return;
                }

                const pixInfo = info?.pix ?? {};

                setFormData({
                    chavePix: pixInfo.chave || pixInfo.chavePix || "",
                    nomeTitular: pixInfo.nome || pixInfo.nomeTitular || "",
                    cidadeTitular: pixInfo.cidade || pixInfo.cidadeTitular || "",
                });
            } catch (error) {
                console.error("Erro ao carregar dados do Pix", error);
                if (isMounted) {
                    notify("Erro ao carregar dados do Pix", "error");
                }
            } finally {
                if (isMounted) {
                    setLoading(false);
                }
            }
        };

        loadPixConfig();

        return () => {
            isMounted = false;
        };
    }, [idRestaurante, isOpen, notify]);

    const handleChange = (field) => (event) => {
        const { value } = event.target;
        setFormData((prev) => ({
            ...prev,
            [field]: value,
        }));
    };

    const handleSubmit = async (event) => {
        event.preventDefault();

        if (!idRestaurante) {
            notify("Restaurante não encontrado", "error");
            return;
        }

        try {
            setSaving(true);

            await updateRestauranteInfo(idRestaurante, {
                pix: {
                    chave: formData.chavePix.trim(),
                    nome: formData.nomeTitular.trim(),
                    cidade: formData.cidadeTitular.trim(),
                },
            });

            notify("Dados do Pix salvos com sucesso", "success");
            onClose?.();
        } catch (error) {
            console.error("Erro ao salvar dados do Pix", error);
            notify("Erro ao salvar dados do Pix", "error");
        } finally {
            setSaving(false);
        }
    };

    return (
        <BaseModalWithHeader
            isOpen={isOpen}
            onClose={onClose}
            title="Configurações de Pix"
            subTitle="Defina como aparecerá o pagamento via Pix para seus clientes"
            icon={Coffee}
        >
            <div className="font-inter">
                <form className="space-y-5" onSubmit={handleSubmit}>
                    <div className="space-y-3">
                        <div>
                            <label className="block mb-1 font-medium text-gray-700">Sua chave Pix</label>
                            <input
                                type="text"
                                value={formData.chavePix}
                                onChange={handleChange("chavePix")}
                                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-dynamic focus:border-primary-dynamic"
                                placeholder="Digite a chave Pix"
                                disabled={isFormDisabled}
                            />
                        </div>

                        <div>
                            <label className="block mb-1 font-medium text-gray-700">Nome do titular</label>
                            <input
                                type="text"
                                value={formData.nomeTitular}
                                onChange={handleChange("nomeTitular")}
                                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-dynamic focus:border-primary-dynamic"
                                placeholder="Como aparece no banco"
                                disabled={isFormDisabled}
                            />
                        </div>

                        <div>
                            <label className="block mb-1 font-medium text-gray-700">Cidade do titular</label>
                            <input
                                type="text"
                                value={formData.cidadeTitular}
                                onChange={handleChange("cidadeTitular")}
                                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-dynamic focus:border-primary-dynamic"
                                placeholder="Cidade onde a conta foi aberta"
                                disabled={isFormDisabled}
                            />
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="cursor-pointer px-4 py-2 rounded-md border border-gray-300 text-sm font-medium text-gray-600 hover:bg-gray-100 disabled:opacity-50"
                            disabled={isFormDisabled}
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={isFormDisabled}
                            className="cursor-pointer px-5 py-2 rounded-md bg-primary-dynamic text-white text-sm font-semibold hover:opacity-90 disabled:opacity-70 min-w-[120px] flex items-center justify-center"
                        >
                            {saving ? <LoadingSpinner size={4} /> : "Salvar"}
                        </button>
                    </div>
                </form>
            </div>
        </BaseModalWithHeader>
    );
}
