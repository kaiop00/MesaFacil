import { useEffect, useRef, useState } from "react";
import { House02, MoreHorizontal } from "react-coolicons";
import TableOptionsMenu from "@/features/order/components/TableOptionsMenu";
import DetailOrderModal from "@/features/order/components/modals/DetailOrderModal";
// import { finalizarPedido } from "@/features/order/services/orderService";
import ConfirmModal from "@/components/ConfirmModal";
import { useToast } from "@/hooks/useToast";

const TableCard = ({
  numero,
  status,
  timeAgo,
  total,
  mesa,          // ✅ objeto real
  idRestaurante
}) => {
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [modalConfig, setModalConfig] = useState({ title: "", message: "" });
  const [showOptions, setShowOptions] = useState(false);
  const showOptionsRef = useRef(null);
  const { notify } = useToast();

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
    entregue: {
      iconBg: "bg-red-50",
      iconTxt: "text-red-500",
      priceTxt: "text-red-600 font-medium",
    },
  };

  const currentStyle = statusStyleMap[status] || statusStyleMap["livre"];

  const handleConfirm = async () => {
    // Mantido apenas para o fluxo "entregue" (pagamento futuramente)
    if (mesa?.status === "entregue") {
      console.log('redirecionar para tela de pagamento!!!');
      setIsConfirmModalOpen(false);
    }
  }

  const handleFinalize = () => {
    if (mesa?.status === "andamento") {
      // Em andamento: abrir detalhes para escolher qual pedido finalizar
      setIsDetailModalOpen(true);
      setShowOptions(false);
      return;
    } else if (mesa?.status === "entregue") {
      setModalConfig({
        title: "Finalizar Pedido",
        message: "Você tem certeza que deseja finalizar esse pedido? Esta é uma ação irreversível e vai levar para tela de pagamento do pedido"
      });
    }
    setIsConfirmModalOpen(true);
    setShowOptions(false);
  }

  return (
    <>
      <div className="bg-white rounded-lg shadow p-4 flex flex-col">
        {/* ícone + menu */}
        <div className="flex justify-between items-start">
          <div className={`p-2 rounded ${currentStyle.iconBg}`}>
            <House02 className={`w-6 h-6 ${currentStyle.iconTxt}`} />
          </div>
          {mesa?.status !== "livre" && (
            <div ref={showOptionsRef} className="relative">
              <button
                onClick={() => setShowOptions((prev) => !prev)}
                className="p-1 bg-gray-100 rounded hover:bg-gray-200 cursor-pointer"
              >
                <MoreHorizontal className="w-5 h-5 text-gray-500" />
              </button>
              {showOptions && (
                <TableOptionsMenu
                  onDetail={() => {
                    setIsDetailModalOpen(true);
                    setShowOptions(false);
                  }}
                  onFinalize={handleFinalize}
                />
              )}
            </div>
          )}
        </div>

        {/* conteúdo */}
        <div className="mt-4">
          <h3 className="text-lg font-semibold text-gray-900">Mesa {numero}</h3>

          {status !== "livre" && (
            <>
              <p className="mt-1 text-sm text-gray-500">{timeAgo}</p>
              <p className={`mt-2 text-lg ${currentStyle.priceTxt}`}>
                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(total)}
              </p>

            </>
          )}
        </div>

      </div>

      <DetailOrderModal
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        mesaSelecionada={mesa}
        idRestaurante={idRestaurante}
      />

      <ConfirmModal
        isOpen={isConfirmModalOpen}
        title={modalConfig.title}
        message={modalConfig.message}
        onCancel={() => setIsConfirmModalOpen(false)}
        onConfirm={handleConfirm}
      />

    </>
  );
};

export default TableCard;
