import { MoreHorizontal } from "react-coolicons";
import { useState } from "react";
import FoodDetailsModal from "./modals/FoodDetailsModal";
import { useCardapioContext } from "@/features/foodList/context/CardapioContext";
import LoadingSpinnerDynamic from "@/components/LoadingSpinnerDynamic";

const FoodGrid = ({ search, filter }) => {
  const { items, loading } = useCardapioContext();
  const [selectedItem, setSelectedItem] = useState(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  const handleOpenModal = (item) => {
    setSelectedItem(item);
    setIsDetailOpen(true);
  };

  const handleCloseModal = () => {
    setIsDetailOpen(false);
    setSelectedItem(null);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <LoadingSpinnerDynamic/>
        <p className="mt-4 text-[#D9A23B] font-semibold">Carregando...</p>
      </div>
    );
  }

  const filteredItems = items.filter((item) => {
    const matchesSearch = item.nome.toLowerCase().includes(search.toLowerCase());
    const matchesFilter = filter ? item.categorias.includes(filter) : true;
    return matchesSearch && matchesFilter;
  });

  return (
    <>
      <div className="font-inter grid gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
        {filteredItems.map((item) => (
          <div
            key={item.id}
            className="bg-white rounded-xl shadow-md overflow-hidden border border-gray-100"
          >
            <div className="relative">
              <img
                src={item.imagemUrl}
                alt={item.nome}
                className="h-40 w-full object-cover"
                loading="lazy"
              />
              <button
                onClick={() => handleOpenModal(item)}
                className="absolute top-2 right-2 bg-white p-1 rounded-md shadow cursor-pointer"
              >
                <MoreHorizontal />
              </button>
            </div>

            <div className="p-4">
              <h3 className="font-semibold text-sm text-gray-900">{item.nome}</h3>
              <p className="text-sm font-bold text-primary-dynamic">
                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.valor)}
              </p>
              <div className="flex flex-wrap mt-2 gap-1">
                {item.categorias.map((cat, i) => (
                  <span
                    key={i}
                    className="text-xs bg-gray-100 border border-gray-200 rounded-full px-2 py-0.5 text-gray-600"
                  >
                    {cat}
                  </span>
                ))}
              </div>
              {item.alergias && item.alergias.length > 0 && (
                <div className="flex flex-wrap mt-2 gap-1">
                  {item.alergias.map((alg, i) => (
                    <span
                      key={i}
                      className="text-xs bg-red-100 border border-red-200 rounded-full px-2 py-0.5 text-red-600"
                    >
                      {alg}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {isDetailOpen && selectedItem && (
        <FoodDetailsModal
          isOpen={isDetailOpen}
          onClose={handleCloseModal}
          food={selectedItem}
        />
      )}
    </>
  );
};

export default FoodGrid;
