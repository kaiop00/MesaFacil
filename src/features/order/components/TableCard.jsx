import { useEffect, useRef, useState } from "react";
import { House02, MoreHorizontal, ShoppingBag02 } from "react-coolicons";
import { useTranslation } from "react-i18next";
import TableOptionsMenu from "@/features/order/components/TableOptionsMenu";
import DetailOrderModal from "@/features/order/components/modals/DetailOrderModal";
import ConfirmModal from "@/components/ConfirmModal";
import { resetMesaParaNovoCliente } from "@/features/order/services/orderService";
import { useToast } from "@/hooks/useToast";
import { isIfoodOrder } from "@/features/integrations/ifood/services/ifoodStatusSyncService";

const TableCard = ({
  numero,
  status,
  timeAgo,
  total,
  mesa,          // ✅ objeto real
  idRestaurante
}) => {
  const { t } = useTranslation('order');
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
  
  // Check if this is the iFood virtual table
  const isIfoodTable = mesa?.id && isIfoodOrder(mesa.id);

  const handleConfirm = async () => {
    if (mesa?.status === "entregue") {
      try {
        await resetMesaParaNovoCliente(idRestaurante, mesa.id);
        notify(t('messages.success.tableFreed'), "success");
      } catch (error) {
        console.error("Erro ao resetar mesa:", error);
        notify(t('messages.error.freeTable'), "error");
      }
    }
    setIsConfirmModalOpen(false);
  };

  const handleFinalize = () => {
    if (mesa?.status === "andamento") {
      // Em andamento: abrir detalhes para escolher qual pedido finalizar
      setIsDetailModalOpen(true);
      setShowOptions(false);
      return;
    } else if (mesa?.status === "entregue") {
      setModalConfig({
        title: t('messages.confirm.finishOrder'),
        message: t('messages.confirm.finishOrderDescription'),
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
          <div className={`p-2 rounded ${currentStyle.iconBg} relative`}>
            {isIfoodTable ? (
              <ShoppingBag02 className={`w-6 h-6 ${currentStyle.iconTxt}`} />
            ) : (
              <House02 className={`w-6 h-6 ${currentStyle.iconTxt}`} />
            )}
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
          <h3 className="text-lg font-semibold text-gray-900">
            {isIfoodTable ? (
              <span className="flex items-center gap-2">
                <span>iFood</span>
                <span className="px-2 py-0.5 bg-orange-100 text-orange-700 text-xs font-medium rounded-full">
                  Delivery
                </span>
              </span>
            ) : (
              t('tables.tableLetter', { letter: numero })
            )}
          </h3>

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
