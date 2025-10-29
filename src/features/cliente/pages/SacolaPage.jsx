import { useRef, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { useCarrinho } from "../context/CarrinhoContext";
import CardCarrinho from "../components/CardCarrinho";
import CarrinhoFooter from "../layout/CarrinhoFooter";
import { createPedido } from "@/features/order/services/orderService";
import { useCliente } from "../context/ClienteContext";
import { useToast } from "@/hooks/useToast";
import LoadingSpinner from "@/components/LoadingSpinner";
import { useTranslation } from "react-i18next";

export default function SacolaPage() {
    const { t } = useTranslation("cliente");
    const { notify } = useToast();
    const { mesaId, idRestaurante } = useCliente();
    const navigate = useNavigate();
    const location = useLocation();
    const { slug } = useParams();
    const {
        carrinhoItems,
        limparCarrinho,
        total,
        incrementarQuantidadeCarrinho,
        decrementarQuantidadeCarrinho,
    } = useCarrinho();
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
            notify(t("sacola.orderSent"), "success");
            limparCarrinho();
            const search = location.search || "";
            const target = slug ? `/mesa/${slug}/pedido${search}` : `../pedido${search}`;
            navigate(target, { replace: true });
        } catch (error) {
            console.error("Erro ao enviar pedido: ", error);
            notify(t("sacola.orderError"), "error");
        } finally {
            setLoading(false);
        }
    }

    const vazio = carrinhoItems.length === 0;

    return (
        <div className="flex flex-col p-4 gap-4 pb-48 md:px-6 lg:px-8 max-w-6xl mx-auto">
            <h1 className="text-lg font-semibold md:text-xl">{t("sacola.title")}</h1>

            {vazio ? (
                <p className="text-sm text-gray-600">
                    {t("sacola.empty")}
                </p>
            ) : (
                <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                    {/* GRID RESPONSIVO: 1 (mobile), 2 (tablet e desktop) */}
                    <div className="space-y-2 md:space-y-0 md:grid md:grid-cols-2 md:gap-4">
                        {carrinhoItems.map((item) => (
                            <CardCarrinho
                                key={item.id}
                                item={item}
                                onIncrement={() => incrementarQuantidadeCarrinho(item.id)}
                                onDecrement={() => decrementarQuantidadeCarrinho(item.id)}
                            />
                        ))}
                    </div>

                    <div className="flex flex-col gap-2">
                        <label
                            htmlFor="observacoes"
                            className="text-sm font-medium text-gray-700"
                        >
                            {t("sacola.observations")}
                        </label>
                        <textarea
                            id="observacoes"
                            ref={observacoesRef}
                            rows={3}
                            placeholder={t("sacola.observationsPlaceholder")}
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
                        {loading ? <LoadingSpinner /> : t("sacola.confirmOrder")}
                    </button>
                </form>
            )}

            <CarrinhoFooter />
        </div>
    );
}
