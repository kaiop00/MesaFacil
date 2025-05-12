import { House02, MoreHorizontal } from "react-coolicons";

const TableCard = ({
  table,
  timeAgo, // ex: "12 minutos"
  price, // ex: "220,20"
  occupied, // boolean: true = pedido em andamento, false = mesa livre
  onMenuClick,
}) => {
  // classes de cor
  const iconBg = occupied ? "bg-yellow-50" : "bg-green-50";
  const iconTxt = occupied ? "text-yellow-500" : "text-green-500";
  const priceTxt = "text-yellow-600 font-medium";

  return (
    <div className="bg-white rounded-lg shadow p-4 flex flex-col">
      {/* ícone + menu */}
      <div className="flex justify-between items-start">
        <div className={`p-2 rounded ${iconBg}`}>
          <House02 className={`w-6 h-6 ${iconTxt}`} />
        </div>
        <button
          onClick={onMenuClick}
          className="p-1 bg-gray-100 rounded hover:bg-gray-200"
        >
          <MoreHorizontal  className="w-5 h-5 text-gray-500" />
        </button>
      </div>

      {/* conteúdo */}
      <div className="mt-4">
        <h3 className="text-lg font-semibold text-gray-900">{table}</h3>
        {occupied && (
          <>
            <p className="mt-1 text-sm text-gray-500">Pedido há {timeAgo}</p>
            <p className={`mt-2 text-lg ${priceTxt}`}>R$ {price}</p>
          </>
        )}
      </div>
    </div>
  );
};

export default TableCard