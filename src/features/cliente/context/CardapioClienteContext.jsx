import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { getAll } from '@/services/firebase/firestoreService';
import { getPromocoesAtivas, aplicarPromocoesAosItens } from '../services/promocoesService';
import { ClienteContext } from './ClienteContext';

const CardapioClienteContext = createContext();

export default function CardapioClienteProvider({ children }) {
    const cliente = useContext(ClienteContext);
    const idRestaurante = cliente?.idRestaurante;
    const [loadingCardapio, setLoadingCardapio] = useState(true);
    const [items, setItems] = useState([]);
    const [promocoes, setPromocoes] = useState([]);

    const carregarCardapio = useCallback(async () => {
        try {
            console.debug('DEBUG CardapioCliente: carregando cardapio, idRestaurante=', idRestaurante);
            const dados = await getAll(idRestaurante, 'cardapio', {
                orderByField: 'criadoEm',
                order: 'desc'
            });

            console.debug('DEBUG CardapioCliente: itens raw count=', Array.isArray(dados)?dados.length:0);

            const normalizados = dados.map((item) => ({
                ...item,
                price: Number(item.valor ?? 0), // compatível com carrinho e service
                quantity: 1, // default para controle no carrinho
            }));
            setItems(normalizados);
            console.debug('DEBUG CardapioCliente: itens normalizados count=', normalizados.length);
        } catch (err) {
            console.error("Erro ao carregar itens do cardápio:", err);
        }
    }, [idRestaurante]);

    const carregarPromocoes = useCallback(async () => {
        try {
            console.debug('DEBUG CardapioCliente: carregando promocoes, idRestaurante=', idRestaurante);
            const promocoesAtivas = await getPromocoesAtivas(idRestaurante);
            console.debug('DEBUG CardapioCliente: promocoes count=', Array.isArray(promocoesAtivas)?promocoesAtivas.length:0);
            setPromocoes(promocoesAtivas);
        } catch (err) {
            console.error("Erro ao carregar promoções:", err);
        }
    }, [idRestaurante]);

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
    }, [idRestaurante, carregarCardapio, carregarPromocoes]);

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
