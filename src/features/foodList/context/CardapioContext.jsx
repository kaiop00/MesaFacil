import { createContext, useContext, useState, useEffect, useMemo, useCallback } from "react";
import { useFoodService } from "@/features/foodList/hooks/useFoodService";

const CardapioContext = createContext();

export const CardapioProvider = ({ children }) => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const { listarItensCardapio } = useFoodService();

  const carregarItens = useCallback(async () => {
    try {
      const dados = await listarItensCardapio();

      // ✅ Normaliza cada item para ter o campo `price`
      const normalizados = dados.map((item) => {
        const categoriasSanitizadas = Array.isArray(item.categorias)
          ? item.categorias.map((cat) => {
              if (typeof cat === "string") return cat;
              if (cat?.value) return cat.value;
              if (cat?.label) return cat.label;
              return String(cat);
            })
          : [];

        return {
          ...item,
          categorias: categoriasSanitizadas,
          // Tenta pegar o campo certo, senão usa 0 como fallback
          price: Number(item.price ?? item.preco ?? item.valor ?? 0),
        };
      });

      setItems(normalizados);
    } catch (err) {
      console.error("Erro ao carregar itens do cardápio:", err);
    } finally {
      setLoading(false);
    }
  }, [listarItensCardapio]);

  useEffect(() => {
    carregarItens();
  }, [carregarItens]);

  const value = useMemo(
    () => ({
      items,
      loading,
      carregarItens,
    }),
    [items, loading, carregarItens]
  );

  return (
    <CardapioContext.Provider value={value}>
      {children}
    </CardapioContext.Provider>
  );
};

export const useCardapioContext = () => {
  const context = useContext(CardapioContext);
  if (!context) {
    throw new Error("useCardapioContext deve ser usado dentro de CardapioProvider");
  }
  return context;
};
