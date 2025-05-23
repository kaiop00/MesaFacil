import { createContext, useContext, useState, useEffect } from "react";
import { listarItensCardapio } from "../services/foodService";
import { useMemo } from "react";

const CardapioContext = createContext();

export const CardapioProvider = ({ children }) => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

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
  }, []);

  const value = useMemo(() => ({ items, loading, carregarItens }), [items, loading]);
  return (
    <CardapioContext.Provider value={value}>
      {children}
    </CardapioContext.Provider>
  );
};

export default CardapioContext;
