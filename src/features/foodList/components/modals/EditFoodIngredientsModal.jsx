import { useState, useEffect } from 'react';
import { Coffee, Save, CloseLg } from 'react-coolicons';
import BaseModalWithHeader from '@/components/BaseModalWithHeader';
import IngredientesSelector from '@/features/foodList/components/ingredientes/IngredientesSelector';
import { useIngredientes } from '@/hooks/useIngredientes';
import { useAuth } from '@/contexts/AuthContext';
import LoadingSpinner from '@/components/LoadingSpinner';

const EditFoodIngredientsModal = ({ isOpen, onClose, item }) => {
  const { idRestaurante } = useAuth();
  const [ingredientes, setIngredientes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingIngredientes, setLoadingIngredientes] = useState(false);
  const { buscarIngredientes, adicionarIngredientes } = useIngredientes();

  useEffect(() => {
    if (isOpen && item && idRestaurante) {
      carregarIngredientes();
    }
  }, [isOpen, item, idRestaurante]);

  const carregarIngredientes = async () => {
    setLoadingIngredientes(true);
    try {
      const ingredientesExistentes = await buscarIngredientes(item.id);
      setIngredientes(ingredientesExistentes);
    } catch (error) {
      console.error('Erro ao carregar ingredientes:', error);
      setIngredientes([]);
    } finally {
      setLoadingIngredientes(false);
    }
  };

  const handleSave = async () => {
    if (!item || !idRestaurante) return;

    // Validar ingredientes
    if (ingredientes.length > 0) {
      const ingredientesInvalidos = ingredientes.filter(ing =>
        !ing.itemId || !ing.quantidade || parseFloat(ing.quantidade) <= 0
      );

      if (ingredientesInvalidos.length > 0) {
        alert('Todos os ingredientes devem ter um item do estoque selecionado e quantidade válida.');
        return;
      }
    }

    setLoading(true);
    try {
      await adicionarIngredientes(item.id, ingredientes);
      onClose();
    } catch (error) {
      console.error('Erro ao salvar ingredientes:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setIngredientes([]);
    onClose();
  };

  if (!item) return null;

  return (
    <BaseModalWithHeader
      isOpen={isOpen}
      onClose={handleClose}
      title={`Ingredientes - ${item.nome}`}
      subTitle="Configure os ingredientes necessários para este item"
      icon={Coffee}
    >
      <div className="p-6">
        {loadingIngredientes ? (
          <div className="flex items-center justify-center py-12">
            <div className="flex items-center space-x-3">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900"></div>
              <span className="text-gray-600">Carregando ingredientes...</span>
            </div>
          </div>
        ) : (
          <>
            <div className="mb-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex items-start space-x-3">
                <Coffee className="w-5 h-5 text-blue-600 mt-0.5" />
                <div>
                  <h3 className="text-sm font-medium text-blue-800">
                    {item.nome}
                  </h3>
                  <p className="text-sm text-blue-700 mt-1">
                    Valor: R$ {typeof item.valor === 'number' ? item.valor.toFixed(2) : item.valor}
                  </p>
                  {item.descricao && (
                    <p className="text-xs text-blue-600 mt-1">
                      {item.descricao}
                    </p>
                  )}
                </div>
              </div>
            </div>

            <IngredientesSelector
              value={ingredientes}
              onChange={setIngredientes}
              disabled={loading}
            />

            {ingredientes.length > 0 && (
              <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <h4 className="text-sm font-medium text-yellow-800 mb-2">
                  Resumo dos Ingredientes
                </h4>
                <div className="space-y-1">
                  {ingredientes.map((ingrediente, index) => (
                    <div key={index} className="flex justify-between items-center text-xs text-yellow-700">
                      <span>
                        {ingrediente.itemNome || 'Item não selecionado'}
                      </span>
                      <span>
                        {ingrediente.quantidade || '0'} {ingrediente.unidade.toLowerCase() + (ingrediente.quantidade > 1 ? 's' : '')} por porção
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-6 p-3 bg-gray-50 rounded-lg text-xs text-gray-600">
              <p className="font-medium mb-1">Importante:</p>
              <ul className="space-y-1 list-disc list-inside">
                <li>As quantidades devem ser especificadas por porção individual</li>
                <li>O sistema calculará automaticamente o consumo baseado no número de pedidos</li>
                <li>Apenas itens cadastrados no estoque podem ser utilizados como ingredientes</li>
                <li>As movimentações de estoque serão registradas automaticamente quando pedidos forem confirmados</li>
              </ul>
            </div>
          </>
        )}
      </div>

      <div className="flex justify-between items-center px-6 py-4 bg-gray-50 border-t border-gray-200">
        <button
          onClick={handleClose}
          disabled={loading}
          className="flex items-center px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
        >
          <CloseLg className="w-4 h-4 mr-2" />
          Cancelar
        </button>

        <button
          onClick={handleSave}
          disabled={loading || loadingIngredientes}
          className="flex items-center px-6 py-2 bg-primary-dynamic text-white rounded-md hover:bg-yellow-600 disabled:opacity-50"
        >
          {loading ? (
            <LoadingSpinner />
          ) : (
            <>
              <Save className="w-4 h-4 mr-2" />
              Salvar Ingredientes
            </>
          )}
        </button>
      </div>
    </BaseModalWithHeader>
  );
};

export default EditFoodIngredientsModal;
