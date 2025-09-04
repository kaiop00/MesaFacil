import { useState, useEffect } from "react";
import { Coffee } from "react-coolicons";
import BaseModalWithHeader from "@/components/BaseModalWithHeader";
import NewFoodForm from "../forms/NewFoodForm";
import { useFoodService } from "@/features/foodList/hooks/useFoodService";
import { useCardapioContext } from "@/features/foodList/context/CardapioContext";
import { useToast } from "@/hooks/useToast";
import LoadingSpinner from "@/components/LoadingSpinner";

const initialFormData = {
    nome: "",
    categorias: [],
    valor: "",
    descricao: "",
    file: null,
    previewUrl: "",
    alergias: [],
    ingredientes: [],
};

const NewFoodModal = ({ isOpen, onClose }) => {
    const [formData, setFormData] = useState(initialFormData);
    const [loading, setLoading] = useState(false);
    const { carregarItens } = useCardapioContext();
    const { notify } = useToast();
    const { salvarNovoItem } = useFoodService();

    useEffect(() => {
        if (isOpen) setFormData(initialFormData);
    }, [isOpen]);

    // --- validação local com mensagens específicas
    const validarFormulario = () => {
        const faltando = [];

        if (!formData.nome?.trim()) faltando.push("nome");
        if (!Array.isArray(formData.categorias) || formData.categorias.length === 0)
            faltando.push("categoria");
        const v = Number(formData.valor);
        if (!Number.isFinite(v) || v <= 0) faltando.push("valor");
        if (!formData.file && !formData.previewUrl) faltando.push("imagem"); // se imagem for obrigatória

        if (faltando.length > 0) {
            if (faltando.length === 1 && faltando[0] === "categoria") {
                notify("Selecione pelo menos uma categoria.", "error");
            } else if (faltando.length === 1 && faltando[0] === "imagem") {
                notify("Inclua uma imagem do item.", "error");
            } else {
                const labels = {
                    nome: "nome",
                    categoria: "categoria",
                    valor: "valor",
                    imagem: "imagem",
                };
                notify(
                    `Preencha os campos obrigatórios: ${faltando
                        .map((k) => labels[k])
                        .join(", ")}.`,
                    "error"
                );
            }
            return false;
        }
        return true;
    };

    const handleSalvar = async () => {
        if (!validarFormulario()) return;

        setLoading(true);
        try {
            await salvarNovoItem(formData);
            notify("Item adicionado com sucesso!", "success");
            onClose();
            carregarItens();
        } catch (err) {
            console.error("Erro ao salvar item:", err);
            notify(err?.message || "Erro ao salvar item.", "error");
        } finally {
            setLoading(false);
        }
    };

    return (
        <BaseModalWithHeader
            isOpen={isOpen}
            onClose={onClose}
            title="Novo Item do Cardapio"
            subTitle="Preencha as informações para adicionar"
            icon={Coffee}
        >
            <div className="p-6">
                <NewFoodForm formData={formData} setFormData={setFormData} />
            </div>

            <div className="font-inter flex justify-between items-center px-6 py-4">
                <button
                    onClick={onClose}
                    className="font-bold text-[#334155] px-4 py-2 rounded bg-[#F1F5F9] hover:bg-gray-100"
                >
                    Cancelar
                </button>
                <button
                    onClick={handleSalvar}
                    className="font-bold bg-primary-dynamic text-white px-6 py-2 rounded"
                    disabled={loading}
                >
                    {loading ? <LoadingSpinner /> : <span>Salvar</span>}
                </button>
            </div>
        </BaseModalWithHeader>
    );
};

export default NewFoodModal;
