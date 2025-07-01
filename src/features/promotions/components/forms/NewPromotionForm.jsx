import { useState, useMemo, useEffect } from 'react';
import { useToast } from '@/hooks/useToast';
import { useAuth } from '@/contexts/AuthContext';
import { getAll } from '@/services/firebase/firestoreService';
import { ArrowDownMd, CloseSm, AddPlus, RemoveMinus } from 'react-coolicons';

const NewPromotionForm = ({
  formData,
  setFormData,
  onSubmit,
  onCancel,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [foodItems, setFoodItems] = useState([]);
  const [selectedFoods, setSelectedFoods] = useState([]);
  const [isSending, setIsSending] = useState(false);
  const [displayValue, setDisplayValue] = useState('');
  const { idRestaurante } = useAuth();
  const { notify } = useToast();

  useEffect(() => {
    getAll(idRestaurante, 'cardapio', { orderByField: 'criadoEm', order: 'desc' }).then((items) => {
      setFoodItems(items);
    });
  }, [idRestaurante]);

  const itemsTotalValue = useMemo(() => {
    return selectedFoods.reduce((sum, item) => sum + (item.valor * item.quantity), 0);
  }, [selectedFoods]);

  const filteredFoods = useMemo(() => {
    const selectedIds = new Set(selectedFoods.map(item => item.id));

    return foodItems.filter(item =>
      !selectedIds.has(item.id) &&
      item.nome.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [foodItems, searchTerm, selectedFoods]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;

    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handlePromotionValueChange = (e) => {
    const { value } = e.target;
    const numericValue = value.replace(/\D/g, '');
    const floatValue = Number(numericValue) / 100;

    setDisplayValue(new Intl.NumberFormat('pt-BR', {
      currency: 'BRL',
      style: 'currency'
    }).format(floatValue));

    setFormData(prev => ({
      ...prev,
      valor: floatValue
    }));
  };

  const handleItemSelected = (food) => {
    setSelectedFoods(prev => [
      ...prev,
      { ...food, quantity: 1 }
    ]);

    setSearchTerm('');

    setIsDropdownOpen(false);
  };

  const handleItemQuantityChange = (id, newQuantity) => {
    const quantity = Math.max(1, parseInt(newQuantity) || 1);

    setSelectedFoods(prev =>
      prev.map(item =>
        item.id === id ? { ...item, quantity } : item
      )
    );
  };

  const handleRemoveItem = (id) => {
    setSelectedFoods(prev => prev.filter(item => item.id !== id));
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (selectedFoods.length === 0) {
      notify('Adicione pelo menos um item à promoção', 'error');
      return;
    }

    if (!formData.valor || formData.valor <= 0) {
      notify('Defina um valor de promoção válido', 'error');
      return;
    }

    setIsSending(true);

    onSubmit({
      ...formData,
      itens: selectedFoods,
      precoOriginal: itemsTotalValue,
      precoDesconto: parseFloat(formData.valor),
      imagemUrl: selectedFoods[0]?.imagemUrl || null,
    });

    setIsSending(false);
  };

  return (
    <form onSubmit={handleSubmit} className="font-inter space-y-6">
      <section>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Nome da Promoção <span className="text-gray-400">(Opcional)</span>
        </label>

        <input
          type="text"
          name="nome"
          value={formData.nome || ''}
          onChange={handleInputChange}
          className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
          placeholder="Ex: Promoção Especial"
        />
      </section>

      <section>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Itens <span className="text-red-500">*</span>
        </label>

        <div className="relative">
          <div className="flex rounded-md shadow-sm">
            <input
              type="text"
              className="w-full border border-gray-300 border-r-0 rounded-l-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
              placeholder="Buscar itens..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setIsDropdownOpen(true);
              }}
              onFocus={() => setIsDropdownOpen(true)}
            />

            <button
              type="button"
              className="inline-flex items-center px-4 rounded-r-md border border-l-0 border-gray-300 bg-gray-50 text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-1 focus:ring-yellow-500 focus:border-yellow-500"
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            >
              <ArrowDownMd className={`h-4 w-4 transition-transform ${isDropdownOpen ? 'transform rotate-180' : ''}`} />
            </button>
          </div>

          {isDropdownOpen && (
            <div className="absolute z-10 mt-1 w-full bg-white shadow-lg max-h-60 rounded-md py-1 text-base ring-1 ring-black ring-opacity-5 overflow-auto focus:outline-none sm:text-sm">
              {filteredFoods.length === 0
                ? (<div className="px-4 py-2 text-gray-500">Nenhum item encontrado</div>)
                : (filteredFoods.map((food) => (
                  <div
                    key={food.id}
                    className="flex items-center px-4 py-2 hover:bg-gray-100 cursor-pointer"
                    onClick={() => handleItemSelected(food)}
                  >
                    <div className="flex-shrink-0 h-10 w-10 rounded-md overflow-hidden mr-3">
                      <img
                        className="h-full w-full object-cover"
                        src={food.imagemUrl || '/placeholder-food.jpg'}
                        alt={food.nome}
                      />
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-gray-900 truncate">{food.nome}</p>
                      <p className="text-sm text-gray-500 truncate">
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(food.valor)}
                      </p>
                    </div>
                  </div>
                ))
                )}
            </div>
          )}
        </div>

        <div className="mt-4 space-y-2">
          {selectedFoods.map((item) => (
            <div key={item.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
              <div className="flex items-center space-x-3">
                <div className="flex-shrink-0 h-12 w-12 rounded-md overflow-hidden">
                  <img
                    className="h-full w-full object-cover"
                    src={item.imagemUrl || '/placeholder-food.jpg'}
                    alt={item.nome}
                  />
                </div>

                <div>
                  <div className="text-sm font-medium text-gray-900">{item.nome}</div>
                  <div className="text-xs text-gray-500">
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.valor)}
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <div className="flex items-center border rounded-md">
                  <button
                    type="button"
                    className="px-2 py-1 text-gray-600 hover:bg-gray-100"
                    onClick={() => handleItemQuantityChange(item.id, item.quantity - 1)}
                  >
                    <RemoveMinus className="h-3 w-3" />
                  </button>

                  <input
                    type="number"
                    min="1"
                    value={item.quantity}
                    onChange={(e) => handleItemQuantityChange(item.id, e.target.value)}
                    className="w-10 text-center border-l border-r border-gray-300 py-1 text-sm"
                  />

                  <button
                    type="button"
                    className="px-2 py-1 text-gray-600 hover:bg-gray-100"
                    onClick={() => handleItemQuantityChange(item.id, item.quantity + 1)}
                  >
                    <AddPlus className="h-3 w-3" />
                  </button>
                </div>
                <div className="text-sm font-medium text-gray-900 w-20 text-right">
                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.valor * item.quantity)}
                </div>
                <button
                  type="button"
                  className="text-gray-400 hover:text-red-500"
                  onClick={() => handleRemoveItem(item.id)}
                >
                  <CloseSm className="h-5 w-5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Valor Total dos Itens
          </label>
          <div className="relative rounded-md shadow-sm mt-1 h-12">
            <input
              type="text"
              readOnly
              value={new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(itemsTotalValue)}
              className="w-full h-12 rounded-md border-gray-300 pl-3 pr-12 focus:border-yellow-500 focus:ring-yellow-500 sm:text-sm bg-gray-100"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Valor da Promoção <span className="text-red-500">*</span>
          </label>
          <div className="mt-1 relative rounded-md shadow-sm h-12">
            <input
              type="text"
              name="valor"
              value={displayValue}
              onInput={handlePromotionValueChange}
              className="block w-full h-12 rounded-md border-gray-300 pl-3 pr-12 focus:border-yellow-500 focus:ring-yellow-500 sm:text-sm"
              placeholder="0,00"
              required
            />
          </div>
        </div>
      </section>

      <section className="flex justify-end space-x-3 pt-4">
        <button
          type="button"
          onClick={onCancel}
          disabled={isSending}
          className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
        >
          Cancelar
        </button>
        <button
          type="submit"
          className="inline-flex justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-yellow-600 focus:outline-none disabled:opacity-50"
          disabled={selectedFoods.length === 0 || isSending}
        >
          {isSending ? 'Salvando...' : 'Salvar Promoção'}
        </button>
      </section>
    </form>
  );
};

export default NewPromotionForm;
