import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import BaseModalWithHeader from "@/components/BaseModalWithHeader";
import OrderItemsList from "@/features/order/components/OrderItemsList";
import { getPedidosDaMesa, finalizarPedidoEspecifico } from "@/features/order/services/orderService";
import LoadingSpinnerDynamic from "@/components/LoadingSpinnerDynamic";
import { useToast } from "@/hooks/useToast";

const DetailOrderModal = ({ isOpen, onClose, mesaSelecionada, idRestaurante }) => {
    const { t } = useTranslation('order');
    const [pedidos, setPedidos] = useState([]);
    const [loading, setLoading] = useState(false);
    const [finalizando, setFinalizando] = useState({}); // { [pedidoId]: boolean }
    const { notify } = useToast();

    useEffect(() => {
        const fetchPedidos = async () => {
            if (isOpen && mesaSelecionada?.id && idRestaurante) {
                setLoading(true);
                try {
                    const dados = await getPedidosDaMesa(idRestaurante, mesaSelecionada.id);
                    setPedidos(dados || []);
                } catch (error) {
                    console.error("❌ Erro ao buscar pedidos:", error);
                    setPedidos([]);
                } finally {
                    setLoading(false);
                }
            } else {
                setPedidos([]);
            }
        };

        fetchPedidos();
    }, [isOpen, mesaSelecionada, idRestaurante]);

    const handleFinalizarPedido = async (pedidoId) => {
        if (!idRestaurante || !mesaSelecionada?.id || !pedidoId) return;
        setFinalizando(prev => ({ ...prev, [pedidoId]: true }));
        try {
            await finalizarPedidoEspecifico(idRestaurante, mesaSelecionada.id, pedidoId);
            notify(t('messages.success.orderFinished'), "success");
            // Recarregar a lista
            const dados = await getPedidosDaMesa(idRestaurante, mesaSelecionada.id);
            setPedidos(dados || []);
        } catch (error) {
            console.error("Erro ao finalizar pedido:", error);
            notify(t('messages.error.finishOrder'), "error");
        } finally {
            setFinalizando(prev => ({ ...prev, [pedidoId]: false }));
        }
    };

    return (
        <BaseModalWithHeader
            isOpen={!!isOpen}
            onClose={onClose}
            title={`${t('modals.orderDetail.title')} ${t('tables.tableLetter', { letter: mesaSelecionada?.numero || "-" })}`}
            subTitle="Relação de pedidos dessa mesa"
        >
            <div className="space-y-6 font-inter">
                {loading && (
                    <div className="flex flex-col justify-center items-center gap-2 py-4">
                        <p className="text-center text-gray-500">{t('page.loading')}</p>
                        <LoadingSpinnerDynamic size={10}/>
                    </div>
                )}

                {!loading && pedidos.length === 0 && (
                    <p className="text-center text-gray-500">{t('modals.orderDetail.noItems')}</p>
                )}

                {!loading && pedidos.map((pedido) => (
                    <div
                        key={pedido.id}
                        className="border border-gray-200 rounded-lg p-4 space-y-4"
                    >
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="font-bold text-sm text-gray-800">
                                    {t('modals.orderDetail.title')} Nº {pedido.id}
                                </p>
                                <p className="text-sm text-gray-600">
                                    Criado em:{" "}
                                    {pedido.criadoEm?.toDate
                                        ? pedido.criadoEm.toDate().toLocaleString()
                                        : "-"}
                                </p>
                                <p className="text-xs text-gray-500 italic">
                                    {t('modals.orderDetail.status')}: {pedido.status || "-"}
                                </p>
                            </div>
                        </div>

                        <OrderItemsList
                            items={pedido.items || []}
                            updateItemQuantity={() => { }} // Desativado
                            removeItem={() => { }}         // Desativado
                            readOnly                       // Flag de só leitura
                        />

                        <div>
                            <p className="font-semibold text-sm">{t('modals.orderDetail.total')}</p>
                            <p className="text-gray-800 font-bold">
                                R$
                                {
                                    Number(
                                        pedido.total ??
                                        (
                                            pedido.items?.reduce(
                                                (sum, item) =>
                                                    sum + (item.price || 0) * (item.quantity || 1),
                                                0
                                            )
                                        )
                                    ).toFixed(2)
                                }
                            </p>
                        </div>
                        <p>{t('modals.orderDetail.observations')}: {pedido.observacoes}</p>

                        {pedido.status === 'andamento' && (
                            <div className="flex justify-end">
                                <button
                                    onClick={() => handleFinalizarPedido(pedido.id)}
                                    disabled={!!finalizando[pedido.id]}
                                    className="px-4 py-2 bg-primary-dynamic text-white rounded disabled:bg-gray-300 cursor-pointer"
                                >
                                    {finalizando[pedido.id] ? t('page.loading') : t('modals.orderDetail.buttons.finishOrder')}
                                </button>
                            </div>
                        )}
                    </div>
                ))}
            </div>

            <div className="flex justify-end gap-2 mt-6">
                <button
                    onClick={onClose}
                    className="px-4 py-2 bg-gray-100 rounded hover:bg-gray-200 text-[#334155] font-semibold cursor-pointer"
                >
                    {t('modals.orderDetail.buttons.close')}
                </button>
            </div>
        </BaseModalWithHeader>
    );
};

export default DetailOrderModal;
