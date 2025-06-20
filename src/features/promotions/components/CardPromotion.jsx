import { MoreHorizontal } from "react-coolicons";

// Componente de Promoção
const PromotionCard = ({
  id,
  nome,
  imagemUrl,
  precoOriginal,
  precoDesconto,
  abrirOpcoes,
}) => {
  // Handler para o menu de opções
  const handleOptionsClick = () => {
    if (abrirOpcoes) {
      abrirOpcoes(id);
    }
  };

  const calcularPorcentagemDesconto = () => {
    if (!precoOriginal || precoOriginal === 0) return 0;
    return (((precoOriginal - precoDesconto) / precoOriginal) * 100).toFixed(0);
  };

  return (
    <div className="w-full bg-white rounded-lg overflow-hidden shadow-md">
      {/* Container da imagem com menu de opções */}
      <div className="relative">
        <img src={imagemUrl} alt={nome} className="w-full h-32 object-cover" />
        <button
          onClick={handleOptionsClick}
          className="absolute top-2 right-2 p-1 bg-gray-200 bg-opacity-50 rounded-lg hover:bg-opacity-70"
        >
          <MoreHorizontal className="text-gray-800" size={20} />
        </button>
      </div>

      {/* Informações do produto */}
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
