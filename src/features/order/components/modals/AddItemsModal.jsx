import { useState, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useCardapioContext } from "@/features/foodList/context/CardapioContext";
import { useOrderContext } from "@/features/order/context/OrderContext";
import BaseModalWithHeader from "@/components/BaseModalWithHeader";
import { useAuth } from "@/contexts/AuthContext";
import { createPedido, verificarEstoquePedido } from "@/features/order/services/orderService";
import CardapioItemSelect from "@/features/order/components/CardapioItemSelect";
import OrderItemsList from "@/features/order/components/OrderItemsList";
import { useToast } from "@/hooks/useToast";
import LoadingSpinner from "@/components/LoadingSpinner";
import EstoqueInfo from "@/components/EstoqueInfo";
import { TriangleWarning, CheckboxCheck } from "react-coolicons";

const AddItemsModal = ({ isOpen, onClose, selectedTable }) => {
    const { t } = useTranslation('order');
    const { items: cardapioItems } = useCardapioContext();
    const { items, addItem, updateItemQuantity, removeItem, clearOrder } = useOrderContext();
    const [selectedItemId, setSelectedItemId] = useState("");
    const { idRestaurante } = useAuth();
    const { notify } = useToast();
    const [loading, setLoading] = useState(false);
    const [verificacaoEstoque, setVerificacaoEstoque] = useState(null);
    const [loadingEstoque, setLoadingEstoque] = useState(false);

    const handleAdd = () => {
        const item = cardapioItems.find((i) => i.id === selectedItemId);
        if (item) {
            addItem(item);
            setSelectedItemId("");
        }
    };

    useEffect(() => {
        if (!isOpen) {
            setSelectedItemId("");
            clearOrder();
        }
    }, [isOpen])


    const total = useMemo(() => {
        return items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    }, [items]);

    // Verificar estoque sempre que os itens mudarem
    useEffect(() => {
        if (items.length > 0) {
            verificarEstoque();
        } else {
            setVerificacaoEstoque(null);
        }
    }, [items, idRestaurante]);

    const verificarEstoque = async () => {
        setLoadingEstoque(true);
        try {
            const verificacao = await verificarEstoquePedido(idRestaurante, items);
            setVerificacaoEstoque(verificacao);
        } catch (error) {
            console.error('Erro ao verificar estoque:', error);
            setVerificacaoEstoque({ podeProcessar: false, verificacoes: [] });
        } finally {
            setLoadingEstoque(false);
        }
    };

    const handleSubmit = async () => {
        if (!selectedTable) {
            notify("Selecione uma mesa primeiro", "error");
            return;
        }

        // Verificar estoque antes de confirmar
        if (verificacaoEstoque && !verificacaoEstoque.podeProcessar) {
            notify("Não é possível processar o pedido devido a problemas no estoque", "error");
            return;
        }

        setLoading(true);
        try {
            const resultado = await createPedido(idRestaurante, selectedTable.id, items, total);
            clearOrder();
            onClose();

            if (resultado.estoqueProcessado) {
                notify("Pedido adicionado e estoque atualizado com sucesso!", "success");
            } else {
                notify("Pedido adicionado com sucesso!", "success");
            }
        } catch (error) {
            notify(error.message || "Erro ao processar pedido", "error");
        } finally {
            setLoading(false);
        }
    }

    return (
        <BaseModalWithHeader
            isOpen={!!isOpen}
            onClose={onClose}
            title={t('modals.addItems.title')}
            subTitle="Escolha os itens para adicionar à mesa"
        >
            <div className="font-inter">
                <p className="font-bold">{t('modals.addItems.title')}</p>
                <p className="pb-2 pt-2">{t('orderItems.item')}</p>

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
                        {t('modals.addItems.buttons.add')}
                    </button>
                </div>

                <OrderItemsList
                    items={items}
                    updateItemQuantity={updateItemQuantity}
                    removeItem={removeItem}
                />

                {/* Informações de Estoque */}
                {items.length > 0 && (
                    <div className="mt-4">
                        {loadingEstoque ? (
                            <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                                <div className="flex items-center space-x-2">
                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-900"></div>
                                    <span className="text-sm text-gray-600">{t('page.loading')}</span>
                                </div>
                            </div>
                        ) : verificacaoEstoque ? (
                            <div className={`border rounded-lg p-3 ${
                                verificacaoEstoque.podeProcessar
                                    ? 'bg-green-50 border-green-200'
                                    : 'bg-red-50 border-red-200'
                            }`}>
                                <div className="flex items-center space-x-2">
                                    {verificacaoEstoque.podeProcessar ? (
                                        <CheckboxCheck className="w-4 h-4 text-green-600" />
                                    ) : (
                                        <TriangleWarning className="w-4 h-4 text-red-600" />
                                    )}
                                    <span className={`text-sm font-medium ${
                                        verificacaoEstoque.podeProcessar
                                            ? 'text-green-800'
                                            : 'text-red-800'
                                    }`}>
                                        {verificacaoEstoque.podeProcessar
                                            ? t('cardapio.availableStock')
                                            : t('messages.error.stockNotAvailable')
                                        }
                                    </span>
                                </div>

                                {!verificacaoEstoque.podeProcessar && (
                                    <div className="space-y-1">
                                        {verificacaoEstoque.verificacoes
                                            .filter(v => !v.disponivel)
                                            .map((verificacao, index) => (
                                            <div key={index} className="text-xs text-red-700">
                                                • {verificacao.itemNome}: {verificacao.motivo}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ) : null}

                        <EstoqueInfo itensPedido={items} className="mt-2" />
                    </div>
                )}

                <div className="mt-4 font-bold">{t('orderItems.total')}: R$ {total.toFixed(2)}</div>

                <div className="flex justify-between gap-2 mt-4">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 bg-gray-100 rounded hover:bg-gray-200 cursor-pointer"
                    >
                        {t('modals.addItems.buttons.close')}
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={items.length === 0 || loading || (verificacaoEstoque && !verificacaoEstoque.podeProcessar)}
                        className="px-4 py-2 bg-primary-dynamic text-white rounded disabled:bg-gray-300 cursor-pointer"
                        title={verificacaoEstoque && !verificacaoEstoque.podeProcessar ? t('messages.error.stockNotAvailable') : ""}
                    >
                        {loading ? <LoadingSpinner /> : t('modals.addItems.buttons.addToOrder')}
                    </button>
                </div>
            </div>
        </BaseModalWithHeader>
    );
};

export default AddItemsModal;
