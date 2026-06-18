import { createContext, useContext, useState, useMemo, useEffect } from "react";
import { useOrderOrigin } from '@/hooks/useOrderOrigin';

const CarrinhoContext = createContext(null);

function toNumber(value, fallback = 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
}

function buildCartItemKey(item) {
    return `${item.cartItemId || item.id}`;
}

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
        console.debug('[Carrinho] adicionarItemCarrinho chamada', {
            id: item.id,
            cartItemId: item.cartItemId,
            descricao: item.descricao,
            observacao: item.observacao,
            quantity: item.quantity ?? item.quantidade ?? 1,
        });
        setCarrinhoItems((prev) => {
            const itemKey = buildCartItemKey(item);
            const index = prev.findIndex((i) => (i.cartItemKey || buildCartItemKey(i)) === itemKey);
            const quantityToAdd = item.quantity ?? item.quantidade ?? 1;

            if (index !== -1) {
                console.debug('[Carrinho] item já existe no carrinho, incrementando quantidade', { index, itemKey, quantityToAdd });
                const atualizados = [...prev];
                atualizados[index] = {
                    ...atualizados[index],
                    quantity: (atualizados[index].quantity || 1) + quantityToAdd,
                };
                return atualizados;
            }

            // Garante que o preço promocional seja usado se houver promoção
            const priceToUse = item.temPromocao
                ? toNumber(item.valor)
                : toNumber(item.price ?? item.valor ?? 0);

            const newItem = {
                ...item,
                cartItemId: item.cartItemId || `${item.id}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
                cartItemKey: itemKey,
                price: priceToUse,
                quantity: quantityToAdd,
                // Preserva informações de promoção no carrinho
                temPromocao: item.temPromocao || false,
                promocao: item.promocao || null,
                valorOriginal: toNumber(item.valorOriginal ?? item.valor ?? item.price ?? 0),
                descricao: (item.descricao || "").trim(),
                observacao: (item.observacao || item.observacoes || "").trim(),
                itemObservation: (item.itemObservation || item.observacao || item.observacoes || "").trim(),
            };
            console.debug('[Carrinho] adicionando novo item ao carrinho', { cartItemId: newItem.cartItemId, id: newItem.id, descricao: newItem.descricao, quantity: newItem.quantity });

            return [...prev, newItem];
        });
    }

    function removerItemCarrinho(id) {
        setCarrinhoItems((prev) => prev.filter((item) => (item.cartItemId || item.id) !== id));
    }

    function atualizarQuantidadeCarrinho(id, updater) {
        setCarrinhoItems((prev) => {
            let itemEncontrado = false;

            const atualizados = prev.reduce((acc, item) => {
                if ((item.cartItemId || item.id) !== id) {
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

    function atualizarObservacaoCarrinho(id, observation) {
        const descricao = String(observation || "");

        setCarrinhoItems((prev) =>
            prev.map((item) => {
                if ((item.cartItemId || item.id) !== id) {
                    return item;
                }

                const updatedItem = {
                    ...item,
                    descricao: item.descricao || "",
                    observacao: descricao,
                    itemObservation: descricao,
                };

                updatedItem.cartItemKey = buildCartItemKey(updatedItem);
                return updatedItem;
            })
        );
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
            atualizarObservacaoCarrinho,
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
