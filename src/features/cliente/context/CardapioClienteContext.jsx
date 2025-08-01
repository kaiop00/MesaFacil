import { useCliente } from "./ClienteContext";
import { createContext, useContext, useState, useEffect } from "react";
import { getAll } from '@/services/firebase/firestoreService';

const CardapioClienteContext = createContext();

export default function CardapioClienteProvider({ children }) {

    const { idRestaurante } = useCliente()
    const [loadingCardapio, setLoadingCardapio] = useState(true);
    const [items, setItems] = useState([]);

    const carregarCardapio = async () => {
        try {
            const dados = await getAll(idRestaurante, 'cardapio', { orderByField: 'criadoEm', order: 'desc' });

            const normalizados = dados.map((item) => ({
                ...item,
                price: Number(item.price ?? item.preco ?? item.valor ?? 0),
            }));

            setItems(normalizados);
        } catch (err) {
            console.error("Erro ao carregar itens do cardápio:", err);
        } finally {
            setLoadingCardapio(false);
        }
    };

    useEffect(() => {
        if (idRestaurante) {
            carregarCardapio();
        }
    }, [idRestaurante]);

    return (
        <CardapioClienteContext.Provider value={{ items, loadingCardapio }}>
            {children}
        </CardapioClienteContext.Provider>
    )
}

export function useClienteCardapio() {
    const context = useContext(CardapioClienteContext);
    if (!context) throw new Error("useClienteCardapio deve ser usado dentro do ClienteProvider");
    return context;
}