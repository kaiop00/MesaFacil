import { useMemo, useState } from "react";
import TableYellowImg from "@/assets/images/order/TableYellow.png";
import { useCliente } from "../context/ClienteContext";
import { formatCurrency } from "../utils/pedidos";

export default function PagamentoResumo({ pedidos = [], loading = false, error = null, totalPedidos = 0, onVoltar }) {
    const { numero } = useCliente();
    const [selectedOption, setSelectedOption] = useState(null);

    const itensResumo = useMemo(() => {
        return pedidos.flatMap((pedido) => {
            return (pedido.items || []).map((item, index) => {
                const price = item.price ?? item.valor ?? 0;
                const quantity = item.quantity ?? item.quantidade ?? 1;
                return {
                    id: `${pedido.id}-${index}`,
                    nome: item.nome || item.name || "Item",
                    quantity,
                    total: price * quantity,
                };
            });
        });
    }, [pedidos]);

    return (
        <div className="flex flex-col items-center mt-6 px-4 pb-6">
            <div className="bg-white rounded-xl shadow-md w-full max-w-md overflow-hidden">
                <div className="px-6 py-6 space-y-6 text-gray-700 text-sm">
                    <section className="space-y-3">
                        <div className="flex items-center gap-3">
                            <span className="flex-1 h-px bg-[#D9A23B]/30" />
                            <span className="text-xs font-semibold text-[#D9A23B] tracking-widest uppercase">
                                Resumo da Compra
                            </span>
                            <span className="flex-1 h-px bg-[#D9A23B]/30" />
                        </div>

                        <div className="border border-gray-200 rounded-xl p-4 space-y-3">
                            {loading && <p>Carregando pedidos...</p>}
                            {!loading && error && <p className="text-red-500">{error}</p>}

                            {!loading && !error && itensResumo.length === 0 && (
                                <p className="text-sm text-gray-500">Nenhum item disponível para pagamento no momento.</p>
                            )}

                            {!loading && !error && itensResumo.length > 0 && (
                                <ul className="space-y-2">
                                    {itensResumo.map((item) => (
                                        <li key={item.id} className="flex justify-between text-sm text-gray-700">
                                            <span>
                                                {item.quantity > 1 ? `${item.quantity}x ` : ""}
                                                {item.nome}
                                            </span>
                                            <span>{formatCurrency(item.total)}</span>
                                        </li>
                                    ))}
                                </ul>
                            )}

                            {!loading && !error && (
                                <div className="flex justify-between items-center border-t border-gray-100 pt-3 font-semibold text-gray-900">
                                    <span>Subtotal</span>
                                    <span>{formatCurrency(totalPedidos)}</span>
                                </div>
                            )}
                        </div>
                    </section>

                    <section className="space-y-3">
                        <h3 className="text-sm font-semibold text-gray-900">Escolha uma das opções</h3>

                        <div className="space-y-3">
                            {[{
                                id: "pix",
                                title: "Pagar com Pix",
                                description: "",
                                accent: "border-[#10B981]",
                                badge: "Pix",
                            }, {
                                id: "garcom",
                                title: "Chamar Garçom",
                                description: "O garçom irá até sua mesa auxiliar no pagamento",
                                accent: "border-[#D9A23B]",
                                badge: "Garçom",
                            }].map((option) => {
                                const isSelected = selectedOption === option.id;
                                const baseClasses = [
                                    "w-full",
                                    "border",
                                    "rounded-xl",
                                    "p-4",
                                    "flex",
                                    "items-center",
                                    "gap-3",
                                    "transition",
                                    "text-left",
                                ];

                                if (isSelected) {
                                    baseClasses.push(option.id === "garcom" ? "bg-[#FDF0D8]" : "bg-[#ECFDF5]");
                                    baseClasses.push(option.accent);
                                    baseClasses.push("border-2");
                                } else {
                                    baseClasses.push("border-gray-200");
                                    baseClasses.push("hover:border-[#D9A23B]/60");
                                }

                                return (
                                    <button
                                        type="button"
                                        key={option.id}
                                        className={baseClasses.join(" ")}
                                        onClick={() => setSelectedOption(option.id)}
                                    >
                                        <span
                                            className={`h-5 w-5 rounded-full border ${isSelected ? option.accent : "border-gray-300"
                                                } flex items-center justify-center text-[10px] uppercase font-semibold`}
                                        >
                                            {isSelected ? "•" : ""}
                                        </span>
                                        <div className="flex-1">
                                            <p className="font-semibold text-gray-900 text-sm">{option.title}</p>
                                            {option.description && (
                                                <p className="text-xs text-gray-600 mt-1">{option.description}</p>
                                            )}
                                        </div>
                                        <span className="text-xs font-semibold text-gray-500 uppercase tracking-widest">
                                            {option.badge}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    </section>

                    <div className="flex flex-col gap-3">
                        <button
                            type="button"
                            className="w-full bg-[#D9A23B] text-white font-semibold py-3 rounded-xl shadow-sm hover:bg-[#c48f32] transition"
                        >
                            Continuar
                        </button>
                        <button
                            type="button"
                            className="w-full text-sm text-gray-500 underline"
                            onClick={onVoltar}
                        >
                            Voltar para pedidos
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
