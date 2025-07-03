import { useMemo } from "react";
import { useContext } from "react";
import { TablesContext } from "@/features/config/context/TablesContext";

/**
 * Hook para acessar as mesas com filtros prontos
 * Retorna:
 * - tables: todas as mesas
 * - mesasLivres: mesas com status "livre"
 * - mesasOcupadas: mesas com status "ocupada"
 */
export const useTables = () => {
  const tables = useContext(TablesContext);

  //mesas
  const mesas = useMemo(() => tables, [tables]);
  //mesas livres
  const mesasLivres = useMemo(() => tables.filter(t => t.status === "livre"), [tables]);
  //mesas em andamento
  const mesasAndamento = useMemo(() => tables.filter(t => t.status === "andamento"), [tables]);
  //mesas aguardando pagamento
  const mesasEntregues = useMemo(() => tables.filter(t => t.status === "entregue"), [tables]);

  return {
    tables,
    mesas,
    mesasLivres,
    mesasAndamento,
    mesasEntregues,
  };
};