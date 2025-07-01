import { useState, useMemo, useEffect } from 'react';
import { ArrowDownMd, CloseSm, AddPlus, RemoveMinus } from 'react-coolicons';
import { useToast } from '@/hooks/useToast';
import { useAuth } from '@/contexts/AuthContext';
import { getAll } from '@/services/firebase/firestoreService';

const EditPromotionForm = ({
  promotion,
  formData,
  setFormData,
  onSubmit,
  onCancel,
}) => {
  const [selectedFoods, setSelectedFoods] = useState(promotion?.itens || []);
  const [displayValue, setDisplayValue] = useState('');
  const [menuItems, setMenuItems] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const { idRestaurante } = useAuth();
  const { notify } = useToast();

  // Initialize form with promotion data
  useEffect(() => {
    if (promotion) {
      setFormData({
        nome: promotion.nome || '',
        descricao: promotion.descricao || '',
        valor: promotion.precoDesconto || 0,
      });
      setSelectedFoods(promotion.itens || []);
    }
  }, [promotion, setFormData]);

  // Format display value when formData.valor changes
  useEffect(() => {
    if (formData.valor !== undefined) {
      setDisplayValue(
        new Intl.NumberFormat('pt-BR', {
          style: 'currency',
          currency: 'BRL',
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        }).format(formData.valor)
      );
    }
  }, [formData.valor]);

  // Fetch menu items
  useEffect(() => {
    getAll(idRestaurante, 'cardapio', { orderByField: 'criadoEm', order: 'desc' }).then((items) => {
      setMenuItems(items);
    });
  }, [idRestaurante]);

  // Filter foods based on search term
  const filteredFoods = useMemo(() => {
    if (!searchTerm) return menuItems;
    const term = searchTerm.toLowerCase();
    return menuItems.filter(
      (item) =>
        item.nome.toLowerCase().includes(term) ||
        item.descricao?.toLowerCase().includes(term)
    );
  }, [menuItems, searchTerm]);

  // Calculate total value of selected items
  const totalValue = useMemo(() => {
    return selectedFoods.reduce((sum, item) => sum + (item.valor * item.quantity), 0);
  }, [selectedFoods]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleValueChange = (e) => {
    const input = e.target.value;
    const numericValue = input.replace(/\D/g, '');
    const floatValue = Number(numericValue) / 100;

    setDisplayValue(
      new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(floatValue)
    );

    setFormData(prev => ({
      ...prev,
      valor: floatValue
    }));
  };

  const handleFoodSelect = (food) => {
    setSelectedFoods(prev => [
      ...prev,
      { ...food, quantity: 1 }
    ]);
  };

  const updateQuantity = (id, increment) => {
    setSelectedFoods(prev =>
      prev.map(item =>
        item.id === id
          ? { ...item, quantity: Math.max(1, item.quantity + (increment ? 1 : -1)) }
          : item
      )
    );
  };

  const removeFood = (id) => {
    setSelectedFoods(prev => prev.filter(item => item.id !== id));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (selectedFoods.length === 0) {
      notify('Selecione pelo menos um item do cardápio', 'error');
      return;
    }

    if (!formData.valor || formData.valor <= 0) {
      notify('O valor da promoção deve ser maior que zero', 'error');
      return;
    }

    onSubmit({
      ...formData,
      itens: selectedFoods,
      precoOriginal: totalValue,
      precoDesconto: parseFloat(formData.valor),
      imagemUrl: selectedFoods[0]?.imagemUrl || promotion?.imagemUrl || null,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="font-inter space-y-6">
      <div>
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
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Itens <span className="text-red-500">*</span>
        </label>

        {/* Search and select food items */}
        <div className="relative">
          <div className="flex rounded-md shadow-sm">
            <input
              type="text"
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
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

          {/* Dropdown with filtered food items */}
          {isDropdownOpen && (
            <div className="absolute z-10 mt-1 w-full bg-white shadow-lg max-h-60 rounded-md py-1 text-base ring-1 ring-black ring-opacity-5 overflow-auto focus:outline-none sm:text-sm">
              {filteredFoods.length === 0
                ? (<div className="px-4 py-2 text-gray-500">Nenhum item encontrado</div>)
                : (filteredFoods.map((food) => (
                  <div
                    key={food.id}
                    className="flex items-center px-4 py-2 hover:bg-gray-100 cursor-pointer"
                    onClick={() => {
                      handleFoodSelect(food);
                      setSearchTerm('');
                      setIsDropdownOpen(false);
                    }}
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
                )))}
            </div>
          )}
        </div>

        {/* Selected items */}
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
                <button
                  type="button"
                  onClick={() => updateQuantity(item.id, -1)}
                  className="p-1 text-gray-500 hover:text-gray-700"
                  disabled={item.quantity <= 1}
                >
                  <RemoveMinus className="w-4 h-4" />
                </button>
                <span className="text-sm w-6 text-center">{item.quantity}</span>
                <button
                  type="button"
                  onClick={() => updateQuantity(item.id, 1)}
                  className="p-1 text-gray-500 hover:text-gray-700"
                >
                  <AddPlus className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => removeFood(item.id)}
                  className="p-1 text-red-500 hover:text-red-700"
                >
                  <CloseSm className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Valor Total dos Itens
          </label>
          <div className="relative rounded-md shadow-sm mt-1 h-12">
            <input
              type="text"
              readOnly
              value={new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalValue)}
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
              onInput={handleValueChange}
              className="block w-full h-12 rounded-md border-gray-300 pl-3 pr-12 focus:border-yellow-500 focus:ring-yellow-500 sm:text-sm"
              placeholder="0,00"
              required
            />
          </div>
        </div>
      </div>

      <div className="flex justify-end space-x-3 pt-4">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
        >
          Cancelar
        </button>
        <button
          type="submit"
          className="inline-flex justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-yellow-600 focus:outline-none disabled:opacity-50"
          disabled={selectedFoods.length === 0}
        >
          Atualizar Promoção
        </button>
      </div>
    </form>
  );
};

export default EditPromotionForm;
