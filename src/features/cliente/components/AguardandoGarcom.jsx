import { useCliente } from "../context/ClienteContext";
import { computeSubtotal, formatCurrency } from "../utils/pedidos";

export default function AguardandoGarcom({ pedidos = [], totalPedidos = 0, mesaNumero }) {
    const { numero } = useCliente();
    const mesaNumeroExibicao = mesaNumero || numero;

    return (
        <div className="flex flex-col items-center mt-6 px-4 pb-6">
            <div className="bg-white rounded-xl shadow-md w-full max-w-md overflow-hidden">
                <div className="px-6 py-6 space-y-6 text-gray-700 text-sm">
                    <div className="space-y-2 text-center">
                        <p className="text-xs text-[#D9A23B] font-semibold uppercase tracking-[0.2em]">Mesa {mesaNumeroExibicao || "-"}</p>
                        <h2 className="text-xl font-semibold text-gray-900">O garçom está a caminho</h2>
                        <p className="text-sm text-gray-500">
                            O garçom irá até sua mesa para auxiliar com o pagamento, por favor aguarde.
                        </p>
                    </div>

                    <section className="space-y-3">
                        <div className="flex items-center gap-3">
                            <span className="flex-1 h-px bg-[#D9A23B]/30" />
                            <span className="text-xs font-semibold text-[#D9A23B] tracking-widest uppercase">
                                Detalhes do Pedido
                            </span>
                            <span className="flex-1 h-px bg-[#D9A23B]/30" />
                        </div>

                        <div className="border border-gray-200 rounded-xl p-4 space-y-3">
                            <div className="flex justify-between text-sm text-gray-600">
                                <span>Mesa</span>
                                <span className="font-medium text-gray-900">{mesaNumeroExibicao || "-"}</span>
                            </div>

                            <div className="space-y-4 pt-1">
                        {pedidos.map((pedido, index) => {
                            const itensPedido = pedido.items || [];
                            const totalPedido = typeof pedido.total === "number" ? pedido.total : computeSubtotal(itensPedido);

                            return (
                                <div key={pedido.id || index} className="space-y-2">
                                    <div className="flex justify-between text-sm text-gray-600">
                                        <span>Pedido {index + 1}</span>
                                        <span className="font-medium text-gray-900">Nº {pedido.id || "-"}</span>
                                    </div>

                                    {itensPedido.length > 0 && (
                                        <ul className="space-y-1">
                                            {itensPedido.map((item, itemIndex) => {
                                                const price = item.price ?? item.valor ?? 0;
                                                const quantity = item.quantity ?? item.quantidade ?? 1;
                                                const subtotal = price * quantity;

                                                        return (
                                                            <li
                                                                key={`${pedido.id || "pedido"}-${itemIndex}`}
                                                                className="flex justify-between text-sm text-gray-700"
                                                            >
                                                                <span>
                                                                    {quantity > 1 ? `${quantity}x ` : ""}
                                                                    {item.nome || item.name || "Item"}
                                                                </span>
                                                                <span>{formatCurrency(subtotal)}</span>
                                                            </li>
                                                        );
                                            })}
                                        </ul>
                                    )}

                                    <div className="flex justify-between text-sm font-semibold text-gray-900">
                                        <span>Total do pedido</span>
                                        <span>{formatCurrency(totalPedido)}</span>
                                    </div>
                                        </div>
                                    );
                                })}
                            </div>

                            <div className="flex justify-between items-center border-t border-gray-100 pt-3 font-semibold text-gray-900">
                                <span>Subtotal geral</span>
                                <span>{formatCurrency(totalPedidos)}</span>
                            </div>
                        </div>
                    </section>
                </div>
            </div>
        </div>
    );
}
