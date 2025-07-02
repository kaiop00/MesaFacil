import { useState, useRef, useEffect } from 'react';
import { MoreHorizontal, EditPencil01, TrashEmpty } from "react-coolicons";

const PromotionCard = ({
  id,
  nome,
  imagemUrl,
  precoOriginal,
  precoDesconto,
  onEdit,
  onDelete,
}) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef(null);

  const calcularPorcentagemDesconto = () => {
    if (!precoOriginal || precoOriginal === 0) return 0;
    return (((precoOriginal - precoDesconto) / precoOriginal) * 100).toFixed(0);
  };

  const toggleMenu = (e) => {
    e.stopPropagation();
    setIsMenuOpen(!isMenuOpen);
  };

  const handleEdit = (e) => {
    e.stopPropagation();
    onEdit?.(id);
    setIsMenuOpen(false);
  };

  const handleDelete = (e) => {
    e.stopPropagation();
    onDelete?.(id);
    setIsMenuOpen(false);
  };

  useEffect(() => {
    function handleClickOutside(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsMenuOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <div className="w-full bg-white rounded-lg overflow-hidden shadow-md">
      <div className="relative">
        <img 
          src={imagemUrl} 
          alt={nome} 
          className="w-full h-32 object-cover"
          onError={(e) => {
            e.target.onerror = null;
            e.target.src = '/placeholder-promo.jpg';
          }}
        />

        <div className="absolute top-2 right-2" ref={menuRef}>
          <button
            onClick={toggleMenu}
            className="p-1 bg-gray-200 bg-opacity-50 rounded-lg hover:bg-opacity-70"
            aria-label="Ações"
          >
            <MoreHorizontal className="text-gray-800" size={20} />
          </button>
          
          {isMenuOpen && (
            <div className="absolute right-0 mt-1 w-36 bg-white rounded-lg shadow-lg py-1 z-10 border border-gray-100">
              <button
                onClick={handleEdit}
                className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
              >
                <EditPencil01 className="mr-2 text-gray-500" size={16} />
                Editar
              </button>
              <button
                onClick={handleDelete}
                className="flex items-center w-full px-4 py-2 text-sm text-red-600 hover:bg-gray-50"
              >
                <TrashEmpty className="mr-2" size={16} />
                Excluir
              </button>
            </div>
          )}
        </div>
      </div>


      <div className="p-4">
        <h3 className="font-medium text-lg mb-1">{nome}</h3>

        <div className="items-center mb-1">
          <span className="text-gray-400 text-sm line-through mr-2">
            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(precoOriginal)}
          </span>

          <div className="flex items-center">
            <span className="text-yellow-500 font-semibold text-base mr-2">
              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(precoDesconto)}
            </span>

            <span className="bg-green-500 text-white text-xs px-2 py-1 rounded-full">
              {calcularPorcentagemDesconto()}%
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PromotionCard;
