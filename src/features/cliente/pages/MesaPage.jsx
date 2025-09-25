import { useMemo, useState } from "react";
import CardCardapio from "../components/CardCardapio";
import { useClienteCardapio } from "../context/CardapioClienteContext";
import { useMesa } from "../hooks/useMesa";
import ItemModal from "../components/ItemModal";
import { useCarrinho } from "../context/CarrinhoContext";
import { SearchMagnifyingGlass } from "react-coolicons";
import useCategoriasCliente from "@/features/cliente/hooks/useCategoriasCliente";
import CategoryTabs from "@/features/cliente/components/CategoryTabs";
import { useCliente } from "../context/ClienteContext";
import { solicitarGarcom } from "../services/garcomService";
import { useToast } from "@/hooks/useToast";

export default function MesaPage() {
    const { mesa, loading, error } = useMesa();
    const { items, loadingCardapio } = useClienteCardapio();
    const [itemSelecionado, setItemSelecionado] = useState(null);
    const { adicionarItemCarrinho } = useCarrinho();
    const [searchItem, setSearchItem] = useState("");
    const { idRestaurante, mesaId: mesaIdContext, numero: numeroMesaContext } = useCliente();
    const { notify } = useToast();
    const [garcomLoading, setGarcomLoading] = useState(false);
    const [garcomSolicitado, setGarcomSolicitado] = useState(false);

    const {
        tabs,
        activeCategory,
        setActiveCategory,
        filterByCategory,
        loading: loadingCategorias,
    } = useCategoriasCliente({ idRestaurante });

    const filteredItems = useMemo(() => {
        const q = searchItem.toLowerCase().trim();
        const byCat = filterByCategory(items || []);
        return byCat.filter((it) => (it?.nome || "").toLowerCase().includes(q));
    }, [items, searchItem, filterByCategory]);

    if (loading || loadingCardapio || loadingCategorias) return <p>Carregando...</p>;
    if (error) return <p>{error}</p>;
    if (!mesa) return <p>Mesa nao encontrada</p>;

    const mesaId = mesa?.id || mesaIdContext;
    const mesaNumero = mesa?.numero ?? numeroMesaContext ?? mesaId ?? "-";

    const handleChamarGarcom = async () => {
        if (!idRestaurante || !mesaId) {
            notify("Não foi possível identificar a mesa.", "error");
            return;
        }

        if (garcomLoading || garcomSolicitado) {
            return;
        }

        setGarcomLoading(true);

        try {
            await solicitarGarcom({
                idRestaurante,
                mesaId,
                mesaNumero,
                motivo: "Solicitação de atendimento",
                registrarNotificacao: false,
                registrarPedidoEvento: true,
                evento: "assistencia",
            });
            setGarcomSolicitado(true);
            notify("Chamado enviado. O garçom vem até a sua mesa em instantes.", "success");
        } catch (err) {
            console.error("Erro ao solicitar garçom", err);
            notify("Não foi possível chamar o garçom. Tente novamente.", "error");
        } finally {
            setGarcomLoading(false);
        }
    };

    return (
        <div className="p-4 mb-20 md:pb-28 md:px-6 lg:px-8 max-w-6xl mx-auto">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <h1 className="text-2xl font-semibold md:text-3xl">Mesa {mesaNumero}</h1>
                <button
                    type="button"
                    onClick={handleChamarGarcom}
                    disabled={garcomLoading || garcomSolicitado}
                    className="inline-flex items-center justify-center rounded-md bg-amber-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-amber-600 disabled:cursor-not-allowed disabled:bg-amber-300 disabled:text-white"
                >
                    {garcomLoading ? "Chamando..." : garcomSolicitado ? "Chamado enviado" : "Chamar garçom"}
                </button>
            </div>

            <div className="relative mb-4 md:mb-6">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <SearchMagnifyingGlass className="w-5 h-5 text-gray-400" />
                </div>
                <input
                    onChange={(e) => setSearchItem(e.target.value)}
                    type="text"
                    placeholder="Buscar"
                    className="w-full pl-10 pr-4 py-2 border rounded-md text-sm border-gray-300 focus:outline-none focus:border-amber-600
                     md:text-base md:py-2.5"
                />
            </div>

            <CategoryTabs
                categories={tabs}
                activeId={activeCategory}
                onChange={(id) => {
                    setActiveCategory(id);
                    // opcional: window.scrollTo({ top: 0, behavior: "smooth" });
                }}
                className="sticky top-0 z-10 bg-white mb-2 md:mb-4"
            />

            {/* LISTA -> GRID RESPONSIVO */}
            <div className="
  space-y-2 
  md:space-y-0 md:grid md:grid-cols-2 md:gap-4 
  lg:grid-cols-4 lg:gap-6
">
                {filteredItems.map((item) => (
                    <CardCardapio
                        key={item.id}
                        item={item}
                        onClick={() => setItemSelecionado(item)}
                        onAddCarrinho={adicionarItemCarrinho}
                    />
                ))}
            </div>

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
