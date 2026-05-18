import { useMemo, useState } from "react";
import BaseModalWithHeader from "@/components/BaseModalWithHeader";
import { formatCurrency } from "@/features/cliente/utils/pedidos";

const CancelOrderModal = ({
  isOpen,
  onClose,
  pedido,
  onConfirm,
  loading = false,
}) => {
  const [motivo, setMotivo] = useState("");

  const isDisabled = useMemo(
    () => !motivo.trim() || loading || !pedido,
    [motivo, loading, pedido]
  );

  const handleConfirm = () => {
    if (isDisabled) return;
    onConfirm(motivo.trim());
    setMotivo("");
  };

  const handleClose = () => {
    setMotivo("");
    onClose();
  };

  return (
    <BaseModalWithHeader
      isOpen={isOpen}
      onClose={handleClose}
      title="Cancelar pedido"
      subTitle="Esta ação ficará registrada no histórico"
    >
      <div className="space-y-4">
        {pedido && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="font-semibold text-red-900">Pedido #{pedido.numeroPedido}</p>
            <p className="text-sm text-red-700">Cliente: {pedido.nomeCliente}</p>
            <p className="text-sm text-red-700">Total: {formatCurrency(pedido.total || 0)}</p>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Motivo do cancelamento
          </label>
          <textarea
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            placeholder="Descreva o motivo do cancelamento"
            rows={4}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
          />
        </div>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={handleClose}
            className="flex-1 px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 cursor-pointer"
          >
            Voltar
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={isDisabled}
            className="flex-1 px-4 py-2 rounded-lg bg-red-600 text-white font-semibold disabled:bg-gray-300 cursor-pointer"
          >
            {loading ? "Cancelando..." : "Confirmar cancelamento"}
          </button>
        </div>
      </div>
    </BaseModalWithHeader>
  );
};

export default CancelOrderModal;
