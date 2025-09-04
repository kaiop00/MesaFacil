import { Coffee, DownloadPackage, EditPencil01 } from "react-coolicons";
import { useState, useEffect } from "react";
import BaseModalWithHeader from "@/components/BaseModalWithHeader";
import EditFoodIngredientsModal from "./EditFoodIngredientsModal";
import { useIngredientes } from "@/hooks/useIngredientes";

const FoodDetailsModal = ({ isOpen, onClose, food }) => {
    const [isIngredientsModalOpen, setIsIngredientsModalOpen] = useState(false);
    const [ingredientes, setIngredientes] = useState([]);
    const [loadingIngredientes, setLoadingIngredientes] = useState(false);
    const { buscarIngredientes } = useIngredientes();

    useEffect(() => {
        if (isOpen && food) {
            carregarIngredientes();
        }
    }, [isOpen, food]);

    const carregarIngredientes = async () => {
        if (!food) return;

        setLoadingIngredientes(true);
        try {
            const ingredientesItem = await buscarIngredientes(food.id);
            setIngredientes(ingredientesItem);
        } catch (error) {
            console.error('Erro ao carregar ingredientes:', error);
            setIngredientes([]);
        } finally {
            setLoadingIngredientes(false);
        }
    };

    const handleEditIngredients = () => {
        setIsIngredientsModalOpen(true);
    };

    const handleIngredientsModalClose = () => {
        setIsIngredientsModalOpen(false);
        // Recarregar ingredientes após fechar o modal de edição
        carregarIngredientes();
    };
    return (
        <BaseModalWithHeader
            isOpen={isOpen}
            onClose={onClose}
            title="Detalhes do Item"
            subTitle={`Visualizando item`}
            icon={Coffee}
        >
            <div className="font-inter space-y-4 text-sm p-6">
                <div className="flex items-start space-x-4">
                    <img src={food.imagemUrl} alt={food.nome} className="w-32 h-32 rounded-md object-cover" />
                    <div className="flex-1 space-y-2">
                        <p><strong>Nome:</strong> {food.nome}</p>
                        <p><strong>Preço:</strong> {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(food.valor)}</p>
                        <p><strong>Categorias:</strong> {food.categorias.join(", ")}</p>
                        {food.descricao && (
                            <p><strong>Descrição:</strong> {food.descricao}</p>
                        )}
                        {food.alergias && food.alergias.length > 0 && (
                            <p><strong>Alergias:</strong> {food.alergias.join(", ")}</p>
                        )}
                    </div>
                </div>

                {/* Seção de Ingredientes */}
                <div className="border-t border-gray-200 pt-4">
                    <div className="flex items-center justify-between mb-3">
                        <h3 className="font-medium text-gray-900 flex items-center">
                            <DownloadPackage className="w-4 h-4 mr-2 text-blue-600" />
                            Ingredientes
                        </h3>
                        <button
                            onClick={handleEditIngredients}
                            className="flex items-center px-3 py-1 text-sm text-blue-600 hover:text-blue-800 border border-blue-200 rounded-md hover:bg-blue-50"
                        >
                            <EditPencil01 className="w-3 h-3 mr-1" />
                            Editar
                        </button>
                    </div>

                    {loadingIngredientes ? (
                        <div className="flex items-center space-x-2 text-gray-500">
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-400"></div>
                            <span className="text-sm">Carregando ingredientes...</span>
                        </div>
                    ) : ingredientes.length === 0 ? (
                        <div className="text-sm text-gray-500 bg-gray-50 p-3 rounded-md">
                            <DownloadPackage className="w-4 h-4 inline mr-2 opacity-50" />
                            Nenhum ingrediente configurado. Clique em "Editar" para adicionar ingredientes.
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {ingredientes.map((ingrediente, index) => (
                                <div key={index} className="flex justify-between items-center text-sm bg-gray-50 p-2 rounded">
                                    <span className="font-medium text-gray-700">
                                        {ingrediente.itemNome}
                                    </span>
                                    <span className="text-gray-600">
                                        {ingrediente.quantidade} {ingrediente.unidade?.toLowerCase() || 'un'} por porção
                                    </span>
                                </div>
                            ))}
                            <div className="text-xs text-gray-500 mt-2">
                                <strong>Total:</strong> {ingredientes.length} {ingredientes.length === 1 ? 'ingrediente' : 'ingredientes'}
                            </div>
                        </div>
                    )}
                </div>
            </div>
            <div className="font-inter flex justify-between items-center px-6 py-4 bg-gray-50 border-t border-gray-200">
                <button
                    onClick={onClose}
                    className="cursor-pointer font-bold text-[#334155] px-4 py-2 rounded bg-white border border-gray-300 hover:bg-gray-50"
                >
                    Fechar
                </button>
            </div>

            {/* Modal de Edição de Ingredientes */}
            <EditFoodIngredientsModal
                isOpen={isIngredientsModalOpen}
                onClose={handleIngredientsModalClose}
                item={food}
            />
        </BaseModalWithHeader>
    );
}

export default FoodDetailsModal;
