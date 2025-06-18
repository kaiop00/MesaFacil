import { useState, useEffect } from "react";
import { Coffee } from "react-coolicons";
import BaseModalWithHeader from "@/components/BaseModalWithHeader";
import NewFoodForm from "../forms/NewFoodForm";
import { useFoodService } from "@/features/foodList/hooks/useFoodService";
import { useCardapioContext } from "@/features/foodList/context/CardapioContext";
import { useToast } from "@/hooks/useToast";

const initialFormData = {
    nome: "",
    categorias: [],
    valor: "",
    descricao: "",
    imagemUrl: "",   
    alergias: [],    
};


const NewFoodModal = ({ isOpen, onClose }) => {
    const [formData, setFormData] = useState(initialFormData);
    const [loading, setLoading] = useState(false);
    const { carregarItens } = useCardapioContext();
    const { notify } = useToast();
    const { salvarNovoItem } = useFoodService()

    useEffect(() => {
        if (isOpen) {
            setFormData(initialFormData);  
        }
    }, [isOpen]);

    const handleSalvar = async () => {
        setLoading(true);
        try {
            await salvarNovoItem(formData);
            notify("Item adicionado com sucesso!", "success");
            onClose();
            carregarItens(); 
        } catch (err) {
            console.error("Erro ao salvar item:", err);
            notify(err.message || "Erro ao salvar item.", "error");
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
                    className="cursor-pointer font-bold text-[#334155] px-4 py-2 rounded bg-[#F1F5F9] hover:bg-gray-100"
                >
                    Cancelar
                </button>
                <button
                    onClick={handleSalvar}
                    className="cursor-pointer font-bold bg-primary-dynamic text-white px-6 py-2 rounded hover:bg-yellow-600"
                >
                    {loading ? (
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                        <span>Salvar</span>
                    )}
                </button>
            </div>
        </BaseModalWithHeader>
    );
};

export default NewFoodModal;
