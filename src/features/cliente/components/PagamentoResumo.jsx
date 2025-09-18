import { useEffect, useMemo, useState } from "react";
import { useCliente } from "../context/ClienteContext";
import { formatCurrency } from "../utils/pedidos";

export default function PagamentoResumo({
    pedidos = [],
    loading = false,
    error = null,
    totalPedidos = 0,
    onVoltar,
    onChamarGarcom,
    chamarGarcomLoading = false,
    garcomSolicitado = false,
    mesaNumero,
    onConfirmarPix,
}) {
    const { numero } = useCliente();
    const mesaNumeroExibicao = mesaNumero || numero;
    const [selectedOption, setSelectedOption] = useState(null);
    const [selectionError, setSelectionError] = useState(false);

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

    useEffect(() => {
        if (garcomSolicitado) {
            setSelectedOption("garcom");
        }
    }, [garcomSolicitado]);

    const handleSelectOption = (id) => {
        if (id === "garcom" && (garcomSolicitado || chamarGarcomLoading)) return;
        setSelectedOption(id);
        setSelectionError(false);
    };

    const handleContinuar = async () => {
        if (!selectedOption) {
            setSelectionError(true);
            return;
        }

        if (selectedOption === "garcom") {
            if (typeof onChamarGarcom === "function") {
                await onChamarGarcom();
            }
            return;
        }

        if (selectedOption === "pix" && typeof onConfirmarPix === "function") {
            onConfirmarPix();
        }
    };

    return (
        <div className="flex flex-col items-center mt-6 px-4 pb-6">
            <div className="bg-white rounded-xl shadow-md w-full max-w-md overflow-hidden">
                <div className="px-6 py-6 space-y-6 text-gray-700 text-sm">
                    <div className="space-y-1 text-center">
                        <p className="text-xs text-[#D9A23B] font-semibold uppercase tracking-[0.2em]">Mesa {mesaNumeroExibicao || "-"}</p>
                        <h2 className="text-2xl font-semibold text-gray-900">Realizar o Pagamento</h2>
                        <p className="text-sm text-gray-500">Escolha uma opção para prosseguir</p>
                    </div>

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
                            {[
                                {
                                    id: "pix",
                                    title: "Pagar com Pix",
                                    description: "",
                                    accent: "border-[#10B981]",
                                    badge: "Pix",
                                },
                                {
                                    id: "garcom",
                                    title: "Chamar Garçom",
                                    description: "O garçom irá até sua mesa auxiliar no pagamento",
                                    accent: "border-[#D9A23B]",
                                    badge: "Garçom",
                                },
                            ].map((option) => {
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
                                    option.id === "garcom" && garcomSolicitado ? "opacity-80" : "",
                                ].filter(Boolean);

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
                                        onClick={() => handleSelectOption(option.id)}
                                        disabled={option.id === "garcom" && (chamarGarcomLoading || garcomSolicitado)}
                                    >
                                        <span
                                            className={`h-5 w-5 rounded-full border ${
                                                isSelected ? option.accent : "border-gray-300"
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
                            {selectionError && (
                                <p className="text-xs text-red-500">Selecione uma opção para continuar.</p>
                            )}
                        </div>
                    </section>

                    <div className="flex flex-col gap-3">
                        <button
                            type="button"
                            className="w-full bg-[#D9A23B] text-white font-semibold py-3 rounded-xl shadow-sm hover:bg-[#c48f32] transition disabled:bg-[#D9A23B]/60"
                            onClick={handleContinuar}
                            disabled={(selectedOption === "garcom" && (chamarGarcomLoading || garcomSolicitado)) || chamarGarcomLoading}
                        >
                            {selectedOption === "garcom"
                                ? garcomSolicitado
                                    ? "Garçom a caminho"
                                    : chamarGarcomLoading
                                        ? "Chamando..."
                                        : "Confirmar chamada do garçom"
                                : "Continuar"}
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
