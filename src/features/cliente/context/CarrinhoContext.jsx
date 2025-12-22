import { createContext, useContext, useState, useMemo, useEffect } from "react";
import { useOrderOrigin } from '@/hooks/useOrderOrigin';

const CarrinhoContext = createContext(null);

export default function CarrinhoProvider({ children }) {
    const [carrinhoItems, setCarrinhoItems] = useState([]);
    const { origin } = useOrderOrigin();
    const [orderOrigin, setOrderOrigin] = useState(origin);
    const [clientData, setClientData] = useState(null);

    // Atualiza origem quando detectada
    useEffect(() => {
        setOrderOrigin(origin);
    }, [origin]);

    function adicionarItemCarrinho(item) {
        setCarrinhoItems((prev) => {
            const index = prev.findIndex((i) => i.id === item.id);

            if (index !== -1) {
                const atualizados = [...prev];
                atualizados[index] = {
                    ...atualizados[index],
                    quantity: (atualizados[index].quantity || 1) + (item.quantity || 1),
                };
                return atualizados;
            }

            // Garante que o preço promocional seja usado se houver promoção
            const priceToUse = item.temPromocao ? item.valor : (item.price ?? item.valor ?? 0);

            return [...prev, {
                ...item,
                price: priceToUse,
                quantity: item.quantity ?? 1,
                // Preserva informações de promoção no carrinho
                temPromocao: item.temPromocao || false,
                promocao: item.promocao || null,
                valorOriginal: item.valorOriginal || item.valor || item.price
            }];
        });
    }

    function removerItemCarrinho(id) {
        setCarrinhoItems((prev) => prev.filter((item) => item.id !== id));
    }

    function atualizarQuantidadeCarrinho(id, updater) {
        setCarrinhoItems((prev) => {
            let itemEncontrado = false;

            const atualizados = prev.reduce((acc, item) => {
                if (item.id !== id) {
                    acc.push(item);
                    return acc;
                }

                itemEncontrado = true;
                const quantidadeAtual = item.quantity ?? 1;
                const novaQuantidade = typeof updater === "function"
                    ? updater(quantidadeAtual)
                    : updater;

                if (novaQuantidade == null || Number.isNaN(novaQuantidade)) {
                    return acc;
                }

                if (novaQuantidade <= 0) {
                    return acc;
                }

                acc.push({ ...item, quantity: novaQuantidade });
                return acc;
            }, []);

            if (!itemEncontrado) {
                return prev;
            }

            return atualizados;
        });
    }

    function incrementarQuantidadeCarrinho(id) {
        atualizarQuantidadeCarrinho(id, (quantidadeAtual) => quantidadeAtual + 1);
    }

    function decrementarQuantidadeCarrinho(id) {
        atualizarQuantidadeCarrinho(id, (quantidadeAtual) => quantidadeAtual - 1);
    }

    function limparCarrinho() {
        setCarrinhoItems([]);
    }

    const total = useMemo(() => {
        return carrinhoItems.reduce((acc, item) => {
            return acc + (item.price ?? 0) * (item.quantity ?? 1);
        }, 0);
    }, [carrinhoItems]);

    const quantidade = useMemo(() => {
        return carrinhoItems.reduce((acc, item) => acc + (item.quantity ?? 1), 0);
    }, [carrinhoItems]);

    return (
        <CarrinhoContext.Provider value={{
            carrinhoItems,
            adicionarItemCarrinho,
            removerItemCarrinho,
            limparCarrinho,
            atualizarQuantidadeCarrinho,
            incrementarQuantidadeCarrinho,
            decrementarQuantidadeCarrinho,
            total,
            quantidade,
            orderOrigin,
            setOrderOrigin,
            clientData,
            setClientData,
        }}>
            {children}
        </CarrinhoContext.Provider>
    );
}

export function useCarrinho() {
    const context = useContext(CarrinhoContext);
    if (!context) throw new Error("useCarrinho deve ser usado dentro do CarrinhoProvider");
    return context;
}
