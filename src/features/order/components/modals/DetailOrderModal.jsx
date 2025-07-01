import { useEffect, useState } from "react";
import BaseModalWithHeader from "@/components/BaseModalWithHeader";
import { ChevronDown } from "react-coolicons";
import { getPedidosDaMesa } from "@/features/order/services/orderService";

const DetailOrderModal = ({ isOpen, onClose, mesaSelecionada, idRestaurante }) => {
    const [pedidos, setPedidos] = useState([]);

    useEffect(() => {
        const fetchPedidos = async () => {
            console.log("📌 [DetailOrderModal] Abertura modal:", isOpen);
            console.log("📌 [DetailOrderModal] Mesa selecionada:", mesaSelecionada);
            console.log("📌 [DetailOrderModal] Restaurante:", idRestaurante);

            if (isOpen && mesaSelecionada?.id && idRestaurante) {
                try {
                    const dados = await getPedidosDaMesa(idRestaurante, mesaSelecionada.id);
                    console.log("✅ [DetailOrderModal] Pedidos retornados:", dados);
                    setPedidos(dados);
                } catch (error) {
                    console.error("❌ [DetailOrderModal] Erro ao buscar pedidos:", error);
                }
            } else {
                console.log("⚠️ [DetailOrderModal] Condições insuficientes para buscar pedidos");
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
            <div className="space-y-6">
                {pedidos.length === 0 && (
                    <p className="text-center text-gray-500">Nenhum pedido encontrado.</p>
                )}

                {pedidos.map((pedido) => (
                    <div
                        key={pedido.id}
                        className="border border-gray-200 rounded-lg p-4 space-y-4"
                    >
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
                        </div>

                        <div>
                            <p className="font-semibold text-sm mb-2">Itens</p>
                            {pedido.items?.map((item) => (
                                <div
                                    key={`${item.id}-${item.nome}-${item.price}`}
                                    className="flex items-center justify-between p-2 border rounded mb-2"
                                >
                                    <div>
                                        <p className="text-sm font-bold">
                                            {item.quantity}x - {item.nome}
                                        </p>
                                        <p className="text-sm text-gray-600">
                                            R$ {Number(item.price).toFixed(2)}
                                        </p>

                                        {item.categorias?.length > 0 && (
                                            <p className="text-xs text-gray-500">
                                                Categorias: {item.categorias.join(", ")}
                                            </p>
                                        )}
                                        {item.alergias?.length > 0 && (
                                            <p className="text-xs text-gray-500">
                                                Alergias: {item.alergias.join(", ")}
                                            </p>
                                        )}
                                        {item.descricao && (
                                            <p className="text-xs text-gray-500">
                                                Descrição: {item.descricao}
                                            </p>
                                        )}
                                    </div>
                                    <ChevronDown className="w-4 h-4 text-gray-400" />
                                </div>
                            ))}
                        </div>

                        <div>
                            <p className="font-semibold text-sm">Total</p>
                            <p className="text-gray-800 font-bold">
                                R$ {Number(pedido.total).toFixed(2)}
                            </p>
                        </div>
                    </div>
                ))}
            </div>

            <div className="flex justify-end gap-2 mt-6">
                <button
                    onClick={onClose}
                    className="px-4 py-2 bg-gray-100 rounded hover:bg-gray-200 text-[#334155] font-semibold"
                >
                    Fechar
                </button>
            </div>
        </BaseModalWithHeader>
    );
};

export default DetailOrderModal;
