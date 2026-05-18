import { useMemo, useState } from "react";
import BaseModalWithHeader from "@/components/BaseModalWithHeader";
import { formatCurrency } from "@/features/cliente/utils/pedidos";

const CancelOrderItemModal = ({
  isOpen,
  onClose,
  item,
  onConfirm,
  loading = false,
}) => {
  const [quantidade, setQuantidade] = useState(1);
  const [motivo, setMotivo] = useState("");

  const maxQuantidade = Number(item?.quantity || 1);

  const quantidadeValida = useMemo(() => {
    const value = Number(quantidade || 0);
    return Number.isFinite(value) && value >= 1 && value <= maxQuantidade;
  }, [quantidade, maxQuantidade]);

  const totalCancelado = useMemo(() => {
    const qty = quantidadeValida ? Number(quantidade) : 0;
    return Number(item?.price || 0) * qty;
  }, [item, quantidade, quantidadeValida]);

  const handleConfirm = () => {
    if (!item || !quantidadeValida || loading) return;

    onConfirm({
      quantidade: Number(quantidade),
      motivoCancelamento: motivo.trim(),
    });

    setQuantidade(1);
    setMotivo("");
  };

  const handleClose = () => {
    setQuantidade(1);
    setMotivo("");
    onClose();
  };

  return (
    <BaseModalWithHeader
      isOpen={isOpen}
      onClose={handleClose}
      title="Cancelar item"
      subTitle="Remove um item da comanda e atualiza o total"
    >
      <div className="space-y-4">
        {item && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 space-y-1">
            <p className="font-semibold text-red-900">{item.nome}</p>
            <p className="text-sm text-red-700">Quantidade atual: {maxQuantidade}</p>
            <p className="text-sm text-red-700">Valor unitário: {formatCurrency(Number(item.price || 0))}</p>
            <p className="text-sm text-red-700">Total a cancelar: {formatCurrency(totalCancelado)}</p>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Quantidade para cancelar
          </label>
          <input
            type="number"
            min="1"
            max={maxQuantidade}
            value={quantidade}
            onChange={(e) => setQuantidade(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Motivo do cancelamento
          </label>
          <textarea
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            placeholder="Opcional, mas recomendado"
            rows={3}
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
            disabled={!quantidadeValida || loading}
            className="flex-1 px-4 py-2 rounded-lg bg-red-600 text-white font-semibold disabled:bg-gray-300 cursor-pointer"
          >
            {loading ? "Cancelando..." : "Confirmar cancelamento"}
          </button>
        </div>
      </div>
    </BaseModalWithHeader>
  );
};

export default CancelOrderItemModal;
