import { useEffect, useRef, useState } from "react";
import { House02, MoreHorizontal } from "react-coolicons";
import TableOptionsMenu from "@/features/order/components/TableOptionsMenu";
import DetailOrderModal from "@/features/order/components/modals/DetailOrderModal";

const TableCard = ({
  numero,   // número da mesa
  status,   // livre, andamento, pendente
  timeAgo,  // opcional
  price,    // opcional
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

  // define as classes de cor com base no status
  const statusStyleMap = {
    livre: {
      iconBg: "bg-green-50",
      iconTxt: "text-green-500",
      priceTxt: "text-green-600 font-medium",
    },
    andamento: {
      iconBg: "bg-yellow-50",
      iconTxt: "text-yellow-500",
      priceTxt: "text-yellow-600 font-medium",
    },
    pendente: {
      iconBg: "bg-red-50",
      iconTxt: "text-red-500",
      priceTxt: "text-red-600 font-medium",
    },
  };

  const currentStyle = statusStyleMap[status] || statusStyleMap["livre"];

  return (
    <>
      <div className="bg-white rounded-lg shadow p-4 flex flex-col">
        {/* ícone + menu */}
        <div className="flex justify-between items-start">
          <div className={`p-2 rounded ${currentStyle.iconBg}`}>
            <House02 className={`w-6 h-6 ${currentStyle.iconTxt}`} />
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
          <h3 className="text-lg font-semibold text-gray-900">Mesa {numero}</h3>

          {status !== "livre" && (
            <>
              <p className="mt-1 text-sm text-gray-500">{timeAgo}</p>
              <p className={`mt-2 text-lg ${currentStyle.priceTxt}`}>R$ {price}</p>
            </>
          )}
        </div>

      </div>

      <DetailOrderModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        order={{
          id: 1231,
          items: [
            {
              name: "Carne de Gado",
              quantity: 1,
              price: "100,00",
              image:
                "https://images.unsplash.com/photo-1550547660-d9450f859349?auto=format&fit=crop&w=100&q=80",
            },
            {
              name: "Encanto da Serra",
              quantity: 1,
              price: "120,20",
              image:
                "https://images.unsplash.com/photo-1550547660-d9450f859349?auto=format&fit=crop&w=100&q=80",
            },
          ],
          observations: "Exemplo de observações",
        }}
      />
    </>
  );
};

export default TableCard;
