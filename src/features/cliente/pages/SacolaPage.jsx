import { useRef } from "react";
import { useCarrinho } from "../context/CarrinhoContext";
import CardCarrinho from "../components/CardCarrinho";
import CarrinhoFooter from "../layout/CarrinhoFooter";
import { createPedido } from "@/features/order/services/orderService";
import { useCliente } from "../context/ClienteContext";
import { useToast } from "@/hooks/useToast";

export default function SacolaPage() {
    const { notify } = useToast()
    const { mesaId, idRestaurante } = useCliente()
    const { carrinhoItems, limparCarrinho, total } = useCarrinho();
    const observacoesRef = useRef();

    async function handleSubmit(e) {
        e.preventDefault();

        if (carrinhoItems.length === 0) {
            console.warn("Carrinho vazio. Nada foi enviado.");
            return;
        }
        
        try{
            const observacoes = (observacoesRef.current?.value || "").trim();
            await createPedido(idRestaurante, mesaId, carrinhoItems, total, observacoes);
            notify("Pedido Enviado Com sucesso", "success");
            limparCarrinho();
        }catch(error){
            console.error("Erro ao enviar pedido: ", error);
            notify("Erro ao enviar pedido", "error");
        }

        
    }

    const vazio = carrinhoItems.length === 0;

    return (
        <div className="flex flex-col p-4 gap-4 pb-48">
            <h1 className="text-lg font-semibold">Itens</h1>

            {vazio ? (
                <p className="text-sm text-gray-600">
                    Sua sacola está vazia. Adicione itens pelo cardápio.
                </p>
            ) : (
                <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                    {carrinhoItems.map((item) => (
                        <CardCarrinho key={item.id} item={item} />
                    ))}

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
                        disabled={vazio}
                        className="
              w-full bg-[#D9A23B] text-white rounded p-3 text-center font-medium
              hover:opacity-90 transition disabled:opacity-60 disabled:cursor-not-allowed
            "
                    >
                        Confirmar Pedido
                    </button>
                </form>
            )}

            <CarrinhoFooter />
        </div>
    );
}
