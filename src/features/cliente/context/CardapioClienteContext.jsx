import { useCliente } from "./ClienteContext";
import { createContext, useContext, useState, useEffect } from "react";
import { getAll } from '@/services/firebase/firestoreService';
import { getPromocoesAtivas, aplicarPromocoesAosItens } from '../services/promocoesService';

const CardapioClienteContext = createContext();

export default function CardapioClienteProvider({ children }) {
    const { idRestaurante } = useCliente();
    const [loadingCardapio, setLoadingCardapio] = useState(true);
    const [items, setItems] = useState([]);
    const [promocoes, setPromocoes] = useState([]);

    const carregarCardapio = async () => {
        try {
            const dados = await getAll(idRestaurante, 'cardapio', {
                orderByField: 'criadoEm',
                order: 'desc'
            });

            const normalizados = dados.map((item) => ({
                ...item,
                price: Number(item.valor ?? 0), // compatível com carrinho e service
                quantity: 1, // default para controle no carrinho
            }));

            setItems(normalizados);
        } catch (err) {
            console.error("Erro ao carregar itens do cardápio:", err);
        }
    };

    const carregarPromocoes = async () => {
        try {
            const promocoesAtivas = await getPromocoesAtivas(idRestaurante);
            setPromocoes(promocoesAtivas);
        } catch (err) {
            console.error("Erro ao carregar promoções:", err);
        }
    };

    useEffect(() => {
        if (idRestaurante) {
            const carregarDados = async () => {
                setLoadingCardapio(true);
                await Promise.all([
                    carregarCardapio(),
                    carregarPromocoes()
                ]);
                setLoadingCardapio(false);
            };
            
            carregarDados();
        }
    }, [idRestaurante]);

    // Aplicar promoções aos itens sempre que houver mudança
    const itemsComPromocoes = aplicarPromocoesAosItens(items, promocoes);

    return (
        <CardapioClienteContext.Provider value={{ 
            items: itemsComPromocoes, 
            loadingCardapio,
            promocoes 
        }}>
            {children}
        </CardapioClienteContext.Provider>
    );
}

export function useClienteCardapio() {
    const context = useContext(CardapioClienteContext);
    if (!context) throw new Error("useClienteCardapio deve ser usado dentro do ClienteProvider");
    return context;
}
