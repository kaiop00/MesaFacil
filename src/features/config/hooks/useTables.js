import { useContext, useEffect, useState } from "react";
import { TablesContext } from "@/features/config/context/TablesContext";
import { getPedidosDaMesa } from "@/features/order/services/orderService";

/**
 * Calcula 'há x minutos' ou 'há x horas'
 */
function timeAgoString(date) {
  const now = new Date();
  const diff = Math.floor((now - date) / 60000); // minutos

  if (diff < 1) return "agora mesmo";
  if (diff < 60) return `há ${diff} min`;
  const hours = Math.floor(diff / 60);
  return `há ${hours}h`;
}

/**
 * Hook para acessar as mesas com informações de pedidos
 * - mesasLivres: status "livre"
 * - mesasAndamento: traz pedido em andamento com total + timeAgo
 * - mesasEntregues: idem para entregues
 */
export const useTables = (idRestaurante) => {
  const tables = useContext(TablesContext) || []; // fallback seguro
  console.log("[useTables] TablesContext:", tables);

  const [mesasLivres, setMesasLivres] = useState([]);
  const [mesasAndamento, setMesasAndamento] = useState([]);
  const [mesasEntregues, setMesasEntregues] = useState([]);

  useEffect(() => {
    if (!idRestaurante || tables.length === 0) return;

    const enrichTables = async () => {
      const livres = tables.filter(t => t.status === "livre");
      const andamento = tables.filter(t => t.status === "andamento");
      const entregues = tables.filter(t => t.status === "entregue");

      const andamentoEnriched = await Promise.all(
        andamento.map(async (mesa) => {
          const pedidos = await getPedidosDaMesa(idRestaurante, mesa.id);
          const pedido = pedidos.find(p => p.status === "andamento");
          return {
            ...mesa,
            total: pedido?.total ?? 0,
            timeAgo: pedido?.criadoEm?.toDate
              ? timeAgoString(pedido.criadoEm.toDate())
              : "-",
          };
        })
      );

      const entreguesEnriched = await Promise.all(
        entregues.map(async (mesa) => {
          const pedidos = await getPedidosDaMesa(idRestaurante, mesa.id);
          const pedido = pedidos.find(p => p.status === "entregue");
          return {
            ...mesa,
            total: pedido?.total ?? 0,
            timeAgo: pedido?.criadoEm?.toDate
              ? timeAgoString(pedido.criadoEm.toDate())
              : "-",
          };
        })
      );

      setMesasLivres(livres);
      setMesasAndamento(andamentoEnriched);
      setMesasEntregues(entreguesEnriched);
    };

    enrichTables();
  }, [tables, idRestaurante]);


  return {
    tables,
    mesas: tables, // todas
    mesasLivres: mesasLivres || [],
    mesasAndamento: mesasAndamento || [],
    mesasEntregues: mesasEntregues || [],
  };
};
