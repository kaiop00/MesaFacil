import { useMemo, useState } from "react";
import BaseModalWithHeader from "@/components/BaseModalWithHeader";
import { transferirPedidosMesa } from "@/features/order/services/orderService";
import { useToast } from "@/hooks/useToast";

const isVirtualTable = (mesa = {}) => {
  const mesaId = String(mesa?.id || "").toLowerCase();
  return mesaId.startsWith("whatsapp") || mesaId.startsWith("ifood");
};

const TransferOrderModal = ({
  isOpen,
  onClose,
  idRestaurante,
  sourceTable,
  tables = [],
  onTransferred,
}) => {
  const { notify } = useToast();
  const [targetTableId, setTargetTableId] = useState("");
  const [loading, setLoading] = useState(false);

  const availableTables = useMemo(() => {
    return (Array.isArray(tables) ? tables : []).filter((mesa) => {
      if (!mesa?.id) return false;
      if (mesa.id === sourceTable?.id) return false;
      return !isVirtualTable(mesa);
    });
  }, [tables, sourceTable?.id]);

  const handleClose = () => {
    setTargetTableId("");
    onClose();
  };

  const handleTransfer = async () => {
    if (!idRestaurante || !sourceTable?.id || !targetTableId) {
      notify("Selecione uma mesa de destino", "warning");
      return;
    }

    setLoading(true);
    try {
      const result = await transferirPedidosMesa(idRestaurante, sourceTable.id, targetTableId);
      notify("Pedido transferido com sucesso", "success");
      onTransferred?.(result);
      handleClose();
    } catch (error) {
      console.error("Erro ao transferir pedido:", error);
      notify(error?.message || "Erro ao transferir pedido", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <BaseModalWithHeader
      isOpen={isOpen}
      onClose={handleClose}
      title="Transferir pedido"
      subTitle={sourceTable ? `Mesa ${sourceTable.numero ?? sourceTable.nome ?? sourceTable.id}` : ""}
    >
      <div className="space-y-4">
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          Selecione a mesa de destino para mover todos os pedidos em aberto desta mesa.
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700">Mesa de destino</label>
          <select
            value={targetTableId}
            onChange={(e) => setTargetTableId(e.target.value)}
            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-primary-dynamic focus:ring-1 focus:ring-primary-dynamic"
          >
            <option value="">Selecione uma mesa</option>
            {availableTables.map((mesa) => {
              const label = `Mesa ${mesa.numero ?? mesa.nome ?? mesa.id}`;
              const statusLabel = mesa.status ? ` - ${mesa.status}` : "";
              return (
                <option key={mesa.id} value={mesa.id}>
                  {label}{statusLabel}
                </option>
              );
            })}
          </select>
        </div>

        {targetTableId && (
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm text-gray-700">
            <strong>Atenção:</strong> se a mesa de destino já tiver pedidos, eles serão somados aos pedidos transferidos.
          </div>
        )}

        <div className="flex gap-3">
          <button
            type="button"
            onClick={handleClose}
            className="flex-1 rounded-lg border border-gray-300 px-4 py-2 font-semibold text-gray-700 hover:bg-gray-50 cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleTransfer}
            disabled={loading || !targetTableId}
            className="flex-1 rounded-lg bg-primary-dynamic px-4 py-2 font-semibold text-white disabled:bg-gray-300 cursor-pointer"
          >
            {loading ? "Transferindo..." : "Transferir"}
          </button>
        </div>
      </div>
    </BaseModalWithHeader>
  );
};

export default TransferOrderModal;