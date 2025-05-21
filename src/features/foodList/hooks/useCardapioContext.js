import { useContext } from "react";
import CardapioContext from "@/features/foodList/context/CardapioContext";

export const useCardapioContext = () => {
  const context = useContext(CardapioContext);
  if (!context) {
    throw new Error("useCardapioContext deve ser usado dentro de CardapioProvider");
  }
  return context;
};
