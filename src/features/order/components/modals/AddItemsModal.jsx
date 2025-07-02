import { useState } from "react";
import { useCardapioContext } from "@/features/foodList/context/CardapioContext";
import { useOrderContext } from "@/features/order/context/OrderContext";
import BaseModalWithHeader from "@/components/BaseModalWithHeader";
import { useAuth } from "@/contexts/AuthContext";
import { createPedido } from "@/features/order/services/orderService";
import CardapioItemSelect from "@/features/order/components/CardapioItemSelect";
import OrderItemsList from "@/features/order/components/OrderItemsList";
import { useToast } from "@/hooks/useToast";
import LoadingSpinner from "@/components/LoadingSpinner";

const AddItemsModal = ({ isOpen, onClose }) => {
    const { items: cardapioItems } = useCardapioContext();
    const { selectedTable, items, addItem, updateItemQuantity, removeItem, clearOrder } = useOrderContext();
    const [selectedItemId, setSelectedItemId] = useState("");
    const { idRestaurante } = useAuth();
    const { notify } = useToast();
    const [loading, setLoading] = useState(false);

    const handleAdd = () => {
        const item = cardapioItems.find((i) => i.id === selectedItemId);
        if (item) {
            addItem(item);
            setSelectedItemId("");
        }
    };

    const handleSubmit = async () => {
        if (!selectedTable) {
            notify("Selecione uma mesa primeiro", "error");
            return;
        }
        setLoading(true);
        const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
        try {
            await createPedido(idRestaurante, selectedTable.id, items, total);
            clearOrder();
            onClose();
            notify("Pedido adicionado com sucesso" , "success");
        } catch (error) {
            notify(`${error} , error`);
        } finally {
            setLoading(false);
        }

    }

    const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0);

    return (
        <BaseModalWithHeader
            isOpen={!!isOpen}
            onClose={onClose}
            title="Adicionar Itens"
            subTitle="Escolha os itens para adicionar à mesa"
        >
            <div className="font-inter">
                <p className="font-bold">Selecione os Itens</p>
                <p className="pb-2 pt-2">Itens</p>

                <div className="flex gap-2 mb-4">
                    <CardapioItemSelect
                        items={cardapioItems}
                        selectedItemId={selectedItemId}
                        setSelectedItemId={setSelectedItemId}
                    />
                    <button
                        onClick={handleAdd}
                        disabled={!selectedItemId}
                        className="px-4 py-2 bg-primary-dynamic text-white rounded disabled:bg-gray-300 cursor-pointer"
                    >
                        Incluir
                    </button>
                </div>

                <OrderItemsList
                    items={items}
                    updateItemQuantity={updateItemQuantity}
                    removeItem={removeItem}
                />

                <div className="mt-4 font-bold">Total: R$ {total.toFixed(2)}</div>

                <div className="flex justify-between gap-2 mt-4">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 bg-gray-100 rounded hover:bg-gray-200 cursor-pointer"
                    >
                        Voltar
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={items.length === 0 || loading}
                        className="px-4 py-2 bg-primary-dynamic text-white rounded disabled:bg-gray-300 cursor-pointer"
                    >
                        {loading ? <LoadingSpinner /> : "Continuar"}
                    </button>
                </div>
            </div>
        </BaseModalWithHeader>
    );
};

export default AddItemsModal;