import { useEffect, useState } from "react";
import BaseModalWithHeader from "@/components/BaseModalWithHeader";
import OrderItemsList from "@/features/order/components/OrderItemsList";
import { getPedidosDaMesa } from "@/features/order/services/orderService";
import LoadingSpinnerDynamic from "@/components/LoadingSpinnerDynamic";

const DetailOrderModal = ({ isOpen, onClose, mesaSelecionada, idRestaurante }) => {
    const [pedidos, setPedidos] = useState([]);
    const [loading, setLoading] = useState(false);

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

    return (
        <BaseModalWithHeader
            isOpen={!!isOpen}
            onClose={onClose}
            title={`Detalhes da Mesa ${mesaSelecionada?.numero || "-"}`}
            subTitle="Relação de pedidos dessa mesa"
        >
            <div className="space-y-6 font-inter">
                {loading && (
                    <div className="flex flex-col justify-center items-center gap-2 py-4">
                        <p className="text-center text-gray-500">Carregando pedidos...</p>
                        <LoadingSpinnerDynamic size={10}/>
                    </div>
                )}

                {!loading && pedidos.length === 0 && (
                    <p className="text-center text-gray-500">Nenhum pedido encontrado.</p>
                )}

                {!loading && pedidos.map((pedido) => (
                    <div
                        key={pedido.id}
                        className="border border-gray-200 rounded-lg p-4 space-y-4"
                    >
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="font-bold text-sm text-gray-800">
                                    Pedido Nº {pedido.id}
                                </p>
                                <p className="text-sm text-gray-600">
                                    Criado em:{" "}
                                    {pedido.criadoEm?.toDate
                                        ? pedido.criadoEm.toDate().toLocaleString()
                                        : "-"}
                                </p>
                                <p className="text-xs text-gray-500 italic">
                                    Status: {pedido.status || "-"}
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
                            <p className="font-semibold text-sm">Total</p>
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
                        <p>Observações: {pedido.observacoes}</p>
                    </div>
                ))}
            </div>

            <div className="flex justify-end gap-2 mt-6">
                <button
                    onClick={onClose}
                    className="px-4 py-2 bg-gray-100 rounded hover:bg-gray-200 text-[#334155] font-semibold cursor-pointer"
                >
                    Fechar
                </button>
            </div>
        </BaseModalWithHeader>
    );
};

export default DetailOrderModal;
