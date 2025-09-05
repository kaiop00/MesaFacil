import { useRef, useState } from "react";
import { useCarrinho } from "../context/CarrinhoContext";
import CardCarrinho from "../components/CardCarrinho";
import CarrinhoFooter from "../layout/CarrinhoFooter";
import { createPedido } from "@/features/order/services/orderService";
import { useCliente } from "../context/ClienteContext";
import { useToast } from "@/hooks/useToast";
import LoadingSpinner from "@/components/LoadingSpinner";

export default function SacolaPage() {
    const { notify } = useToast();
    const { mesaId, idRestaurante } = useCliente();
    const { carrinhoItems, limparCarrinho, total } = useCarrinho();
    const observacoesRef = useRef();
    const [loading, setLoading] = useState(false);

    async function handleSubmit(e) {
        e.preventDefault();

        if (carrinhoItems.length === 0) {
            console.warn("Carrinho vazio. Nada foi enviado.");
            return;
        }
        setLoading(true);
        try {
            const observacoes = (observacoesRef.current?.value || "").trim();
            await createPedido(
                idRestaurante,
                mesaId,
                carrinhoItems,
                total,
                observacoes
            );
            notify("Pedido Enviado Com sucesso", "success");
            limparCarrinho();
        } catch (error) {
            console.error("Erro ao enviar pedido: ", error);
            notify("Erro ao enviar pedido", "error");
        } finally {
            setLoading(false);
        }
    }

    const vazio = carrinhoItems.length === 0;

    return (
        <div className="flex flex-col p-4 gap-4 pb-48 md:px-6 lg:px-8 max-w-6xl mx-auto">
            <h1 className="text-lg font-semibold md:text-xl">Itens</h1>

            {vazio ? (
                <p className="text-sm text-gray-600">
                    Sua sacola está vazia. Adicione itens pelo cardápio.
                </p>
            ) : (
                <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                    {/* GRID RESPONSIVO: 1 (mobile), 2 (tablet e desktop) */}
                    <div className="space-y-2 md:space-y-0 md:grid md:grid-cols-2 md:gap-4">
                        {carrinhoItems.map((item) => (
                            <CardCarrinho key={item.id} item={item} />
                        ))}
                    </div>

                    <div className="flex flex-col gap-2">
                        <label
                            htmlFor="observacoes"
                            className="text-sm font-medium text-gray-700"
                        >
                            Observações
                        </label>
                        <textarea
                            id="observacoes"
                            ref={observacoesRef}
                            rows={3}
                            placeholder="Ex: sem cebola, ponto da carne..."
                            className="w-full border border-gray-300 rounded-md p-2 text-sm"
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={vazio || loading}
                        className="
              w-full bg-[#D9A23B] text-white rounded p-3 text-center font-medium
              hover:opacity-90 transition disabled:opacity-60 disabled:cursor-not-allowed
              flex items-center justify-center
            "
                    >
                        {loading ? <LoadingSpinner /> : "Confirmar Pedido"}
                    </button>
                </form>
            )}

            <CarrinhoFooter />
        </div>
    );
}
