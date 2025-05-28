import { createContext, useContext, useState, useEffect, useMemo } from "react";
import { useFoodService } from "@/features/foodList/hooks/useFoodService";
import { useAuth } from "@/contexts/AuthContext";

const CardapioContext = createContext();

export const CardapioProvider = ({ children }) => {
  const { idRestaurante } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const { listarItensCardapio } = useFoodService();

  const carregarItens = async () => {
    try {
      const dados = await listarItensCardapio();
      setItems(dados);
    } catch (err) {
      console.error("Erro ao carregar itens do cardápio:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregarItens();
  }, [listarItensCardapio]);

  const value = useMemo(() => ({ items, loading, carregarItens }), [items, loading, carregarItens]);

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
