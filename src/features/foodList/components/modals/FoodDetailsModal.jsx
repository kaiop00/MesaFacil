import { Coffee, DownloadPackage, EditPencil01, TrashFull } from "react-coolicons";
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import BaseModalWithHeader from "@/components/BaseModalWithHeader";
import EditFoodIngredientsModal from "./EditFoodIngredientsModal";
import EditFoodModal from "./EditFoodModal";
import { useIngredientes } from "@/hooks/useIngredientes";
import { usePermissions } from "@/hooks/usePermissions";
import { useFoodService } from "@/features/foodList/hooks/useFoodService";
import { useCardapioContext } from "@/features/foodList/context/CardapioContext";
import { useToast } from "@/hooks/useToast";
import { pluralizeUnit } from "@/services/utils/unitConversionService";

const FoodDetailsModal = ({ isOpen, onClose, food }) => {
    const { t } = useTranslation('foodList');
    const { hasPermission } = usePermissions();
    const [isIngredientsModalOpen, setIsIngredientsModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [savingItem, setSavingItem] = useState(false);
    const [deletingItem, setDeletingItem] = useState(false);
    const [ingredientes, setIngredientes] = useState([]);
    const [loadingIngredientes, setLoadingIngredientes] = useState(false);
    const { buscarIngredientes } = useIngredientes();
    const { atualizarItemCardapio, removerItemCardapio } = useFoodService();
    const { carregarItens } = useCardapioContext();
    const { notify } = useToast();
    const [foodData, setFoodData] = useState(food);

    const carregarIngredientes = useCallback(
        async (itemId) => {
            if (!itemId) return;

            setLoadingIngredientes(true);
            try {
                const ingredientesItem = await buscarIngredientes(itemId);
                setIngredientes(ingredientesItem);
            } catch (error) {
                console.error('Erro ao carregar ingredientes:', error);
                setIngredientes([]);
            } finally {
                setLoadingIngredientes(false);
            }
        },
        [buscarIngredientes]
    );

    useEffect(() => {
        if (!food) {
            setFoodData(food);
            return;
        }

        const categoriasSanitizadas = Array.isArray(food.categorias)
            ? food.categorias.map((cat) => {
                  if (typeof cat === "string") return cat;
                  if (cat?.value) return cat.value;
                  if (cat?.label) return cat.label;
                  return String(cat);
              })
            : [];

        setFoodData({
            ...food,
            categorias: categoriasSanitizadas,
        });
    }, [food]);

    useEffect(() => {
        if (isOpen && foodData?.id) {
            carregarIngredientes(foodData.id);
        }
    }, [isOpen, foodData?.id, carregarIngredientes]);

    const handleEditIngredients = () => {
        setIsIngredientsModalOpen(true);
    };

    const handleIngredientsModalClose = () => {
        setIsIngredientsModalOpen(false);
        if (foodData?.id) {
            carregarIngredientes(foodData.id);
        }
    };

    const handleItemUpdate = async ({ nome, categorias, valor, descricao }) => {
        if (!foodData?.id) return;
        setSavingItem(true);
        try {
            await atualizarItemCardapio(foodData.id, {
                nome,
                categorias,
                valor,
                descricao,
            });
            notify(t('success.itemUpdated'), "success");
            setFoodData((prev) => ({
                ...prev,
                nome,
                categorias,
                valor,
                descricao,
            }));
            await carregarItens();
        } catch (error) {
            console.error("Erro ao atualizar item", error);
            notify(error?.message || t('errors.updateItem'), "error");
            throw error;
        } finally {
            setSavingItem(false);
        }
    };

    const handleDeleteItem = async () => {
        if (!foodData?.id) return;
        const confirmar = window.confirm(
            t('modals.itemDetails.deleteConfirmation', { itemName: foodData.nome })
        );
        if (!confirmar) return;

        setDeletingItem(true);
        try {
            await removerItemCardapio(foodData.id, foodData.storagePath);
            notify(t('success.itemDeleted'), "success");
            await carregarItens();
            setIsEditModalOpen(false);
            setIsIngredientsModalOpen(false);
            onClose();
        } catch (error) {
            console.error("Erro ao remover item", error);
            notify(error?.message || t('errors.deleteItem'), "error");
        } finally {
            setDeletingItem(false);
        }
    };

    if (!foodData) {
        return null;
    }

    return (
        <BaseModalWithHeader
            isOpen={isOpen}
            onClose={onClose}
            title={t('modals.itemDetails.title')}
            subTitle={t('modals.itemDetails.subtitle')}
            icon={Coffee}
        >
            <div className="font-inter space-y-4 text-sm p-6">
                <div className="flex items-start space-x-4">
                    {foodData.imagemUrl ? (
                        <img src={foodData.imagemUrl} alt={foodData.nome} className="w-32 h-32 rounded-md object-cover" />
                    ) : (
                        <div className="w-32 h-32 rounded-md bg-gray-100 border border-dashed border-gray-300 flex items-center justify-center text-xs text-gray-500">
                            {t('grid.noImage')}
                        </div>
                    )}
                    <div className="flex-1 space-y-2">
                        <div className="flex justify-between items-start">
                            <div className="space-y-2">
                                <p><strong>{t('modals.itemDetails.fields.name')}:</strong> {foodData.nome}</p>
                                <p><strong>{t('modals.itemDetails.fields.price')}:</strong> {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(foodData.valor)}</p>
                                <p><strong>{t('modals.itemDetails.fields.categories')}:</strong> {Array.isArray(foodData.categorias) && foodData.categorias.length > 0 ? foodData.categorias.join(", ") : "-"}</p>
                                {foodData.descricao && (
                                    <p><strong>{t('modals.itemDetails.fields.description')}:</strong> {foodData.descricao}</p>
                                )}
                                {foodData.alergias && foodData.alergias.length > 0 && (
                                    <p><strong>{t('modals.itemDetails.fields.allergies')}:</strong> {foodData.alergias.join(", ")}</p>
                                )}
                            </div>
                            {hasPermission('edit_menu_items') && (
                              <button
                                  onClick={() => setIsEditModalOpen(true)}
                                  className="flex items-center px-3 py-1 text-sm text-blue-600 hover:text-blue-800 border border-blue-200 rounded-md hover:bg-blue-50"
                              >
                                  <EditPencil01 className="w-3 h-3 mr-1" />
                                  {t('modals.itemDetails.editItemButton')}
                              </button>
                            )}
                        </div>
                        {(!foodData.descricao || foodData.descricao.trim() === "") && (
                            <p className="text-xs text-gray-500">{t('modals.itemDetails.noDescription')}</p>
                        )}
                    </div>
                </div>

                {/* Seção de Ingredientes */}
                <div className="border-t border-gray-200 pt-4">
                    <div className="flex items-center justify-between mb-3">
                        <h3 className="font-medium text-gray-900 flex items-center">
                            <DownloadPackage className="w-4 h-4 mr-2 text-blue-600" />
                            {t('modals.itemDetails.fields.ingredients')}
                        </h3>
                        {hasPermission('edit_menu_items') && (
                          <button
                              onClick={handleEditIngredients}
                              className="flex items-center px-3 py-1 text-sm text-blue-600 hover:text-blue-800 border border-blue-200 rounded-md hover:bg-blue-50"
                          >
                              <EditPencil01 className="w-3 h-3 mr-1" />
                              {t('modals.itemDetails.editIngredientsButton')}
                          </button>
                        )}
                    </div>

                    {loadingIngredientes ? (
                        <div className="flex items-center space-x-2 text-gray-500">
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-400"></div>
                            <span className="text-sm">{t('modals.itemDetails.loadingIngredients')}</span>
                        </div>
                    ) : ingredientes.length === 0 ? (
                        <div className="text-sm text-gray-500 bg-gray-50 p-3 rounded-md">
                            <DownloadPackage className="w-4 h-4 inline mr-2 opacity-50" />
                            {t('modals.itemDetails.noIngredients')}
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {ingredientes.map((ingrediente, index) => (
                                <div key={index} className="flex justify-between items-center text-sm bg-gray-50 p-2 rounded">
                                    <span className="font-medium text-gray-700">
                                        {ingrediente.itemNome}
                                    </span>
                                    <span className="text-gray-600">
                                        {ingrediente.quantidade} {pluralizeUnit(ingrediente.unidade, ingrediente.quantidade) || 'un'} {t('modals.itemDetails.perPortion')}
                                    </span>
                                </div>
                            ))}
                            <div className="text-xs text-gray-500 mt-2">
                                <strong>{t('modals.itemDetails.totalIngredients')}:</strong> {ingredientes.length} {ingredientes.length === 1 ? t('modals.itemDetails.ingredient') : t('modals.itemDetails.ingredients')}
                            </div>
                        </div>
                    )}
                </div>
            </div>
            <div className="font-inter flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-center px-6 py-4 bg-gray-50 border-t border-gray-200">
                {hasPermission('delete_menu_items') && (
                  <button
                      onClick={handleDeleteItem}
                      disabled={deletingItem || savingItem}
                      className="flex items-center gap-2 px-4 py-2 rounded border border-red-200 text-red-600 font-semibold hover:bg-red-50 disabled:opacity-60"
                  >
                      <TrashFull className="w-4 h-4" />
                      {deletingItem ? t('modals.itemDetails.deleting') : t('modals.itemDetails.deleteButton')}
                  </button>
                )}
                <button
                    onClick={onClose}
                    disabled={deletingItem}
                    className="cursor-pointer font-bold text-[#334155] px-4 py-2 rounded bg-white border border-gray-300 hover:bg-gray-50 disabled:opacity-60"
                >
                    {t('modals.itemDetails.close')}
                </button>
            </div>

            {/* Modal de Edição de Ingredientes */}
            <EditFoodIngredientsModal
                isOpen={isIngredientsModalOpen}
                onClose={handleIngredientsModalClose}
                item={foodData}
            />

            <EditFoodModal
                isOpen={isEditModalOpen}
                onClose={() => setIsEditModalOpen(false)}
                food={foodData}
                onSubmit={handleItemUpdate}
                saving={savingItem}
            />
        </BaseModalWithHeader>
    );
}

export default FoodDetailsModal;
