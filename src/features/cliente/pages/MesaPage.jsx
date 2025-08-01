import { useEffect } from "react";
import CardCardapio from "../components/CardCardapio";
import { useClienteCardapio } from "../context/CardapioClienteContext";
import { useMesa } from "../hooks/useMesa";

export default function MesaPage() {
    const { mesa, loading, error } = useMesa();
    const { items, loadingCardapio } = useClienteCardapio();

    if (loading || loadingCardapio) return <p>Carregando...</p>
    if (error) return <p>{error}</p>
    if (!mesa) return <p>Mesa nao encontrada</p>

    return (
        <div className="p-4">
            <h1 className="text-2xl font-semibold">Mesa {mesa.numero}</h1>
            {items.map((item) => {
                return <CardCardapio
                    key={item.id}
                    item={item}
                />
            })}
        </div>
    );
}