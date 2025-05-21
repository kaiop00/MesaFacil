import { MoreHorizontal } from "react-coolicons";
import { useState } from "react";
import FoodDetailsModal from "./modals/FoodDetailsModal";
import { useCardapioContext } from "@/hooks/useCardapioContext";

const FoodGrid = () => {
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
        <div className="w-12 h-12 border-4 border-[#D9A23B] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <>
      <div className="font-inter grid gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
        {items.map((item) => (
          <div
            key={item.id}
            className="bg-white rounded-xl shadow-md overflow-hidden border border-gray-100"
          >
            <div className="relative">
              <img
                src={item.imagemUrl}
                alt={item.nome}
                className="h-40 w-full object-cover"
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
              <p className="text-sm font-bold text-[#D9A23B]">
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
