import { createContext, useContext, useState, useMemo } from "react";

const CarrinhoContext = createContext(null);

export default function CarrinhoProvider({ children }) {
    const [carrinhoItems, setCarrinhoItems] = useState([]);

    function adicionarItemCarrinho(item) {
        setCarrinhoItems((prev) => {
            const index = prev.findIndex((i) => i.id === item.id);

            if (index !== -1) {
                const atualizados = [...prev];
                atualizados[index] = {
                    ...atualizados[index],
                    quantidade: (atualizados[index].quantidade || 1) + (item.quantidade || 1),
                };
                return atualizados;
            }

            return [...prev, { ...item, quantidade: item.quantidade || 1 }];
        });
    }

    function removerItemCarrinho(id) {
        setCarrinhoItems((prev) => prev.filter((item) => item.id !== id));
    }

    function limparCarrinho() {
        setCarrinhoItems([]);
    }

    const total = useMemo(() => {
        return carrinhoItems.reduce((acc, item) => {
            const preco = item.valor ?? item.price ?? 0;
            return acc + preco * (item.quantidade ?? 1);
        }, 0);
    }, [carrinhoItems]);

    const quantidade = useMemo(() => {
        return carrinhoItems.reduce((acc, item) => acc + (item.quantidade ?? 1), 0);
    }, [carrinhoItems]);

    return (
        <CarrinhoContext.Provider value={{
            carrinhoItems,
            adicionarItemCarrinho,
            removerItemCarrinho,
            limparCarrinho,
            total,
            quantidade,
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
