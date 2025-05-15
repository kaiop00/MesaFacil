import { useEffect, useRef, useState } from "react";
import { House02, MoreHorizontal, NoteSearch, CheckBig } from "react-coolicons";
import TableOptionsMenu from "./TableOptionsMenu";
import DetailOrderModal from "./modals/DetailOrderModal"

const TableCard = ({
  table,
  timeAgo, // ex: "12 minutos"
  price, // ex: "220,20"
  occupied, // boolean: true = pedido em andamento, false = mesa livre
  onMenuClick,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showOptions, setShowOptions] = useState(false);
  const showOptionsRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (showOptionsRef.current && !showOptionsRef.current.contains(e.target)) {
        setShowOptions(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // classes de cor
  const iconBg = occupied ? "bg-yellow-50" : "bg-green-50";
  const iconTxt = occupied ? "text-yellow-500" : "text-green-500";
  const priceTxt = "text-yellow-600 font-medium";

  return (
    <>
      <div className="bg-white rounded-lg shadow p-4 flex flex-col">
        {/* ícone + menu */}
        <div className="flex justify-between items-start">
          <div className={`p-2 rounded ${iconBg}`}>
            <House02 className={`w-6 h-6 ${iconTxt}`} />
          </div>
          <div ref={showOptionsRef} className="relative">
            <button
              onClick={() => setShowOptions((prev) => !prev)}
              className="p-1 bg-gray-100 rounded hover:bg-gray-200"
            >
              <MoreHorizontal className="w-5 h-5 text-gray-500" />
            </button>
            {showOptions && (
              <TableOptionsMenu
                onDetail={() => {
                  setIsModalOpen(true);
                  setShowOptions(false);
                }}
                onFinalize={() => {
                  setShowOptions(false);
                }}
              />
            )}
          </div>


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


      <DetailOrderModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        
      />
    </>
  );
};

export default TableCard