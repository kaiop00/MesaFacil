import { useState } from "react";
import { useCardapioContext } from "@/features/foodList/context/CardapioContext";
import { useOrderContext } from "@/features/order/context/OrderContext";
import BaseModalWithHeader from "@/components/BaseModalWithHeader";
import { useAuth } from "@/contexts/AuthContext";
import { createPedido } from "@/features/order/services/orderService";

const AddItemsModal = ({ isOpen, onClose }) => {
    const { items: cardapioItems } = useCardapioContext();
    const { selectedTable, items, addItem, updateItemQuantity, removeItem, clearOrder } = useOrderContext();
    const [selectedItemId, setSelectedItemId] = useState("");
    const { idRestaurante } = useAuth();

    const handleAdd = () => {
        const item = cardapioItems.find((i) => i.id === selectedItemId);
        if (item) {
            addItem(item);
            setSelectedItemId("");
        }
    };

    const handleSubmit = async () => {
        if (!selectedTable) return;

        const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0);

        await createPedido(idRestaurante, selectedTable.id, items, total);

        clearOrder();
        onClose();
    }

    const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0);

    return (
        <BaseModalWithHeader
            isOpen={!!isOpen}
            onClose={onClose}
            title="Adicionar Itens"
            subTitle="Escolha os itens para adicionar à mesa"
        >
            <div className="flex gap-2 mb-4">
                <select
                    value={selectedItemId}
                    onChange={(e) => setSelectedItemId(e.target.value)}
                    className="flex-1 border rounded p-2"
                >
                    <option value="">Selecione um item</option>
                    {cardapioItems.map((item) => (
                        <option key={item.id} value={item.id}>
                            {item.nome} - R$ {Number(item.price).toFixed(2)}
                        </option>
                    ))}
                </select>
                <button
                    onClick={handleAdd}
                    disabled={!selectedItemId}
                    className="px-4 py-2 bg-primary-dynamic text-white rounded disabled:bg-gray-300"
                >
                    Incluir
                </button>
            </div>

            <div className="space-y-4">
                {items.map((item) => (
                    <div key={item.id} className="flex justify-between items-center border p-2 rounded">
                        <div>
                            <div>{item.nome}</div>
                            <div className="text-sm text-gray-500">
                                R$ {Number(item.price).toFixed(2)} x {item.quantity}
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <button onClick={() => updateItemQuantity(item.id, -1)} className="px-2 border rounded">-</button>
                            <span>{item.quantity}</span>
                            <button onClick={() => updateItemQuantity(item.id, 1)} className="px-2 border rounded">+</button>
                            <button onClick={() => removeItem(item.id)} className="text-red-600">Remover</button>
                        </div>
                    </div>
                ))}
            </div>

            <div className="mt-4 font-bold">Total: R$ {total.toFixed(2)}</div>

            <div className="flex justify-end gap-2 mt-4">
                <button
                    onClick={handleSubmit}
                    disabled={items.length === 0}
                    className="px-4 py-2 bg-primary-dynamic text-white rounded disabled:bg-gray-300"
                >
                    Finalizar Pedido
                </button>
                <button
                    onClick={onClose}
                    className="px-4 py-2 bg-gray-100 rounded hover:bg-gray-200"
                >
                    Fechar
                </button>
            </div>
        </BaseModalWithHeader>
    );
};

export default AddItemsModal;
