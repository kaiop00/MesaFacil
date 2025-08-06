import { useRef } from "react";
import { useCarrinho } from "../context/CarrinhoContext";
import CardCarrinho from "../components/CardCarrinho";

export default function SacolaPage() {
    const { carrinhoItems } = useCarrinho();
    const observacoesRef = useRef();

    function handleSubmit(e) {
        e.preventDefault();

        if (carrinhoItems.length === 0) {
            console.warn("Carrinho vazio. Nada foi enviado.");
            return;
        }

        const observacoes = observacoesRef.current.value;

        console.log("Pedido enviado:", {
            itens: carrinhoItems,
            observacoes: observacoes.trim(),
        });

        // Aqui você poderia chamar uma API ou navegar para uma tela de confirmação
    }

    return (
        <div className="flex flex-col p-4 gap-1 mb-28">
            <h1>Items</h1>
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                {carrinhoItems.map((item) => (
                    <CardCarrinho key={item.id} item={item} />
                ))}

                <div className="flex flex-col gap-2">
                    <label htmlFor="observacoes" className="text-sm font-medium text-gray-700">
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
                    className="w-full bg-[#D9A23B] text-white rounded p-3 text-center font-medium hover:opacity-90 transition"
                >
                    Confirmar Pedido
                </button>
            </form>
        </div>
    );
}
