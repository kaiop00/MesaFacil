import { useState } from "react";
import CardCardapio from "../components/CardCardapio";
import { useClienteCardapio } from "../context/CardapioClienteContext";
import { useMesa } from "../hooks/useMesa";
import ItemModal from "../components/ItemModal";
import { useCarrinho } from "../context/CarrinhoContext";

export default function MesaPage() {
    const { mesa, loading, error } = useMesa();
    const { items, loadingCardapio } = useClienteCardapio();
    const [itemSelecionado, setItemSelecionado] = useState(null);
    const { adicionarItemCarrinho } = useCarrinho();

    if (loading || loadingCardapio) return <p>Carregando...</p>
    if (error) return <p>{error}</p>
    if (!mesa) return <p>Mesa nao encontrada</p>

    return (
        <div className="p-4 mb-20">
            <h1 className="text-2xl font-semibold">Mesa {mesa.numero}</h1>
            {items.map((item) => {
                return <CardCardapio
                    key={item.id}
                    item={item}
                    onClick={() => setItemSelecionado(item)}
                    onAddCarrinho={adicionarItemCarrinho}
                />
            })}
            {itemSelecionado && (
                <ItemModal
                    item={itemSelecionado}
                    onClose={() => setItemSelecionado(null)}
                    onAdicionar={(itemComQuantidade) => {
                        adicionarItemCarrinho(itemComQuantidade);
                        setItemSelecionado(null);
                    }}
                />
            )}
        </div>
    );
}