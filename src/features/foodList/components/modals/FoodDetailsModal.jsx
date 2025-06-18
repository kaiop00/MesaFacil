import { Coffee } from "react-coolicons";
import BaseModalWithHeader from "@/components/BaseModalWithHeader";

const FoodDetailsModal = ({ isOpen, onClose, food }) => {
    return (
        <BaseModalWithHeader
            isOpen={isOpen}
            onClose={onClose}
            title="Detalhes do Item"
            subTitle={`Visualizando item`}
            icon={Coffee}
        >
            <div className="font-inter space-y-3 text-sm p-6">
                <img src={food.imagemUrl} alt={food.nome} className="w-32 rounded-md" />
                <p><strong>Nome:</strong> {food.nome}</p>
                <p><strong>Preço:</strong> {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(food.valor)}</p>
                <p><strong>Categorias:</strong> {food.categorias.join(", ")}</p>
            </div>
            <div className="font-inter flex justify-between items-center px-6 py-4">
                <button onClick={onClose} className="cursor-pointer font-bold text-[#334155] px-4 py-2 rounded bg-[#F1F5F9] hover:bg-gray-100">
                    Cancelar
                </button>
                <button className="cursor-pointer font-bold bg-primary-dynamic text-white px-6 py-2 rounded hover:bg-yellow-600">
                    Opções
                </button>
            </div>
        </BaseModalWithHeader>
    );
}

export default FoodDetailsModal;