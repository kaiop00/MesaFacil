import { MoreHorizontal, Gift } from "react-coolicons";

// Componente de Combo
const ComboCard = ({ id, name, ingredients, price, onOpenOptions }) => {
  // Handler para o menu de opções
  const handleOptionsClick = () => {
    if (onOpenOptions) {
      onOpenOptions(id);
    }
  };

  return (
    <div className="w-full bg-white rounded-lg overflow-hidden shadow-md">
      {/* Placeholder com ícone */}
      <div className="relative bg-yellow-500 h-32 flex items-center justify-center">
        <Gift size={48} className="text-white" />
        <button
          onClick={handleOptionsClick}
          className="absolute top-2 right-2 p-1 bg-white bg-opacity-50 rounded-lg hover:bg-opacity-70"
        >
          <MoreHorizontal className="text-gray-800" size={20} />
        </button>
      </div>

      {/* Informações do combo */}
      <div className="p-4">
        <h3 className="font-medium text-lg mb-1">{name}</h3>
        <p className="text-gray-500 text-sm mb-2">{ingredients}</p>
        <div className="flex items-center">
          <span className="text-yellow-500 font-semibold text-base">
            R$ {price.toFixed(2)}
          </span>
        </div>
      </div>
    </div>
  );
};
export default ComboCard;
