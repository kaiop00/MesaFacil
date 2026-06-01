import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { AddPlus, TrashFull } from 'react-coolicons';
import { getAll } from '@/services/firebase/firestoreService';
import { useAuth } from '@/contexts/AuthContext';
import { getCompatibleUnits, convertUnit, formatQuantityWithUnit } from '@/services/utils/unitConversionService';

const IngredientesSelector = ({ value = [], onChange, disabled = false }) => {
  const { t } = useTranslation('foodList');
  const { idRestaurante } = useAuth();
  const [itensEstoque, setItensEstoque] = useState([]);
  const [loading, setLoading] = useState(true);
  const [ingredientes, setIngredientes] = useState(value);

  const loadItensEstoque = useCallback(async () => {
    if (!idRestaurante) return;

    try {
      setLoading(true);
      const itens = await getAll(idRestaurante, 'itens', {
        orderByField: 'nome',
        order: 'asc'
      });
      setItensEstoque(itens);
    } catch (error) {
      console.error('Erro ao carregar itens do estoque:', error);
    } finally {
      setLoading(false);
    }
  }, [idRestaurante]);

  useEffect(() => {
    loadItensEstoque();
  }, [loadItensEstoque]);

  useEffect(() => {
    setIngredientes(value);
  }, [value]);

  

  const adicionarIngrediente = () => {
    const novoIngrediente = {
      itemId: '',
      itemNome: '',
      quantidade: '',
      unidade: 'Grama'
    };
    const novosIngredientes = [...ingredientes, novoIngrediente];
    setIngredientes(novosIngredientes);
    onChange(novosIngredientes);
  };

  const removerIngrediente = (index) => {
    const novosIngredientes = ingredientes.filter((_, i) => i !== index);
    setIngredientes(novosIngredientes);
    onChange(novosIngredientes);
  };

  const atualizarIngrediente = (index, campo, valor) => {
    const novosIngredientes = [...ingredientes];

    if (campo === 'itemId') {
      const itemSelecionado = itensEstoque.find(item => item.id === valor);
      novosIngredientes[index] = {
        ...novosIngredientes[index],
        itemId: valor,
        itemNome: itemSelecionado ? itemSelecionado.nome : '',
        unidade: itemSelecionado ? itemSelecionado.unidadeArmazenamento : 'Grama'
      };
    } else {
      novosIngredientes[index] = {
        ...novosIngredientes[index],
        [campo]: valor
      };
    }

    setIngredientes(novosIngredientes);
    onChange(novosIngredientes);
  };

  const getUnidadesCompativeis = (ingrediente) => {
    if (!ingrediente.itemId) return unidadesDisponiveis;
    
    const itemEstoque = itensEstoque.find(item => item.id === ingrediente.itemId);
    if (!itemEstoque) return unidadesDisponiveis;
    
    return getCompatibleUnits(itemEstoque.unidadeArmazenamento);
  };

  const getConversaoInfo = (ingrediente) => {
    if (!ingrediente.itemId || !ingrediente.quantidade) return null;
    
    const itemEstoque = itensEstoque.find(item => item.id === ingrediente.itemId);
    if (!itemEstoque) return null;
    
    if (ingrediente.unidade === itemEstoque.unidadeArmazenamento) {
      return {
        textoConversao: t('ingredients.sameUnit', { unit: itemEstoque.unidadeArmazenamento }),
        quantidadeConvertida: ingrediente.quantidade
      };
    }
    
    const quantidadeConvertida = convertUnit(
      parseFloat(ingrediente.quantidade),
      ingrediente.unidade,
      itemEstoque.unidadeArmazenamento
    );
    
    if (quantidadeConvertida === null) {
      return {
        textoConversao: t('ingredients.cannotConvert', { from: ingrediente.unidade, to: itemEstoque.unidadeArmazenamento }),
        quantidadeConvertida: 0,
        erro: true
      };
    }
    
    return {
      textoConversao: `${formatQuantityWithUnit(ingrediente.quantidade, ingrediente.unidade)} = ${formatQuantityWithUnit(quantidadeConvertida, itemEstoque.unidadeArmazenamento)}`,
      quantidadeConvertida: quantidadeConvertida
    };
  };

  const unidadesDisponiveis = [
    'Grama',
    'Quilograma',
    'Mililitro',
    'Litro',
    'Unidade'
  ];

  if (loading) {
    return (
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">
          {t('ingredients.title')}
        </label>
        <div className="text-sm text-gray-500">{t('ingredients.loading')}</div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center">
        <label className="block text-sm font-medium text-gray-700">
          {t('ingredients.title')}
        </label>
        <button
          type="button"
          onClick={adicionarIngrediente}
          disabled={disabled}
          className="inline-flex items-center px-2 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
        >
          <AddPlus className="w-4 h-4 mr-1" />
          {t('ingredients.addButton')}
        </button>
      </div>

      {ingredientes.length === 0 ? (
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
          <p className="text-sm text-gray-500">
            {t('ingredients.noIngredients')}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {ingredientes.map((ingrediente, index) => (
            <div key={index} className="border border-gray-200 rounded-lg p-4 space-y-3">
              <div className="flex justify-between items-start">
                <h4 className="text-sm font-medium text-gray-700">
                  {t('ingredients.ingredientNumber', { number: index + 1 })}
                </h4>
                <button
                  type="button"
                  onClick={() => removerIngrediente(index)}
                  disabled={disabled}
                  className="text-red-500 hover:text-red-700 disabled:opacity-50"
                >
                  <TrashFull className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    {t('ingredients.labels.stockItem')} {t('ingredients.required')}
                  </label>
                  <select
                    value={ingrediente.itemId}
                    onChange={(e) => atualizarIngrediente(index, 'itemId', e.target.value)}
                    disabled={disabled}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  >
                    <option value="">{t('ingredients.placeholders.selectItem')}</option>
                    {itensEstoque.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.nome} {item.marca && `(${item.marca})`}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    {t('ingredients.labels.quantityPerPortion')} {t('ingredients.required')}
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={ingrediente.quantidade}
                    onChange={(e) => atualizarIngrediente(index, 'quantidade', e.target.value)}
                    disabled={disabled}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder={t('ingredients.placeholders.quantity')}
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    {t('ingredients.labels.unit')}
                  </label>
                  <select
                    value={ingrediente.unidade}
                    onChange={(e) => atualizarIngrediente(index, 'unidade', e.target.value)}
                    disabled={disabled}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    {getUnidadesCompativeis(ingrediente).map((unidade) => (
                      <option key={unidade} value={unidade}>
                        {unidade}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {ingrediente.itemId && (
                <div className="space-y-2">
                  {(() => {
                    const conversaoInfo = getConversaoInfo(ingrediente);
                    const itemEstoque = itensEstoque.find(item => item.id === ingrediente.itemId);
                    
                    return (
                      <>
                        {conversaoInfo && (
                          <div className={`text-xs p-2 rounded ${conversaoInfo.erro ? 'bg-red-50 text-red-700' : 'bg-blue-50 text-blue-700'}`}>
                            <strong>{t('ingredients.conversion')}:</strong> {conversaoInfo.textoConversao}
                          </div>
                        )}
                        
                        {itemEstoque && conversaoInfo && !conversaoInfo.erro && (
                          <div className="text-xs text-gray-500 bg-gray-50 p-2 rounded">
                            <strong>{t('ingredients.example')}:</strong> {t('ingredients.exampleText', {
                              times: 10,
                              amount: formatQuantityWithUnit(conversaoInfo.quantidadeConvertida * 10, itemEstoque.unidadeArmazenamento),
                              item: ingrediente.itemNome
                            })}
                            {conversaoInfo.quantidadeConvertida !== parseFloat(ingrediente.quantidade || 0) && (
                              <span className="block mt-1 text-gray-400">
                                {t('ingredients.originalAmount', { amount: formatQuantityWithUnit(parseFloat(ingrediente.quantidade || 0) * 10, ingrediente.unidade) })}
                              </span>
                            )}
                          </div>
                        )}
                      </>
                    );
                  })()}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {ingredientes.length > 0 && (
        <div className="text-xs text-gray-500 mt-2">
          <strong>{t('ingredients.tip')}</strong>
        </div>
      )}
    </div>
  );
};

export default IngredientesSelector;
