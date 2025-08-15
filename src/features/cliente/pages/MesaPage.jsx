import { useMemo, useState } from "react";
import CardCardapio from "../components/CardCardapio";
import { useClienteCardapio } from "../context/CardapioClienteContext";
import { useMesa } from "../hooks/useMesa";
import ItemModal from "../components/ItemModal";
import { useCarrinho } from "../context/CarrinhoContext";
import { SearchMagnifyingGlass } from "react-coolicons"

export default function MesaPage() {
    const { mesa, loading, error } = useMesa();
    const { items, loadingCardapio } = useClienteCardapio();
    const [itemSelecionado, setItemSelecionado] = useState(null);
    const { adicionarItemCarrinho } = useCarrinho();
    const [searchItem, setSearchItem] = useState("");

    const filteredItems = useMemo(() => {
        if (!searchItem) return items || [];
        const q = searchItem.toLocaleLowerCase();
        return (items || []).filter((item) => (item.nome || '').toLocaleLowerCase().includes(q));
    }, [items, searchItem]);


    if (loading || loadingCardapio) return <p>Carregando...</p>
    if (error) return <p>{error}</p>
    if (!mesa) return <p>Mesa nao encontrada</p>

    return (
        <div className="p-4 mb-20">
            <h1 className="text-2xl font-semibold">Mesa {mesa.numero}</h1>

            <div className="relative mb-4">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <SearchMagnifyingGlass className="w-5 h-5 text-gray-400" />
                </div>
                <input
                    onChange={(e) => setSearchItem(e.target.value)}
                    type="text"
                    placeholder="Buscar"
                    className="w-full pl-10 pr-4 py-2 border rounded-md text-sm border-gray-300 focus:outline-none focus:border-primary-dynamic"
                />
            </div>

            {filteredItems.map((item) => {
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