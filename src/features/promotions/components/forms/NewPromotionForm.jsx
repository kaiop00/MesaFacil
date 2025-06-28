import { useState } from 'react';
import { ArrowDownMd } from 'react-coolicons';

const NewPromotionForm = ({ formData, setFormData, onSubmit, onCancel }) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [selectedItems, setSelectedItems] = useState([]);
  
  // Mock categories
  const categories = [
    { id: 1, name: 'Pizzas' },
    { id: 2, name: 'Bebidas' },
    { id: 3, name: 'Sobremesas' },
  ];

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const toggleDropdown = () => {
    setIsDropdownOpen(!isDropdownOpen);
  };

  const handleItemSelect = (item) => {
    setSelectedItems(prev => [...prev, item]);
    setIsDropdownOpen(false);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({
      ...formData,
      itens: selectedItems
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
          placeholder="Ex: Promoção de Verão"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Itens
        </label>
        <div className="relative">
          <div 
            className="w-full flex items-center justify-between border border-gray-300 rounded-md px-3 py-2 cursor-pointer"
            onClick={toggleDropdown}
          >
            <span className="text-gray-500">
              {selectedItems.length > 0 
                ? selectedItems.map(item => item.name).join(', ')
                : 'Escolha uma ou mais categorias'}
            </span>
            <ArrowDownMd className={`transition-transform ${isDropdownOpen ? 'transform rotate-180' : ''}`} />
          </div>
          
          {isDropdownOpen && (
            <div className="absolute z-10 mt-1 w-full bg-white shadow-lg rounded-md py-1 border border-gray-200">
              {categories.map((category) => (
                <div
                  key={category.id}
                  className="px-4 py-2 hover:bg-gray-100 cursor-pointer"
                  onClick={() => handleItemSelect(category)}
                >
                  {category.name}
                </div>
              ))}
            </div>
          )}
        </div>
        
        {selectedItems.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-2">
            {selectedItems.map((item, index) => (
              <div key={index} className="bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded-full flex items-center">
                {item.name}
                <button
                  type="button"
                  onClick={() => setSelectedItems(prev => prev.filter((_, i) => i !== index))}
                  className="ml-1 text-yellow-600 hover:text-yellow-800"
                >
                  &times;
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Valor da Promoção
        </label>
        <div className="relative rounded-md shadow-sm">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <span className="text-gray-500 sm:text-sm">R$</span>
          </div>
          <input
            type="number"
            name="valor"
            value={formData.valor || ''}
            onChange={handleInputChange}
            className="focus:ring-yellow-500 focus:border-yellow-500 block w-full pl-10 pr-12 sm:text-sm border-gray-300 rounded-md py-2 border"
            placeholder="0,00"
            step="0.01"
            min="0"
            required
          />
        </div>
      </div>

      <div className="flex justify-end space-x-3 pt-4">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-sm"
        >
          Cancelar
        </button>
        <button
          type="submit"
          className="px-4 py-2 text-sm bg-yellow-500 hover:bg-yellow-600 text-white"
        >
          Salvar
        </button>
      </div>
    </form>
  );
};

export default NewPromotionForm;
