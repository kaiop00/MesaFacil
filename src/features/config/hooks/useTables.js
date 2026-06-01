import { useContext, useEffect, useState, useMemo } from "react";
import { TablesContext } from "@/features/config/context/TablesContext";
import { getPedidosDaMesa } from "@/features/order/services/orderService";
import { formatDistanceToNow } from "date-fns";
import {ptBR} from "date-fns/locale";

/**
 * Calcula 'há x minutos' ou 'há x horas'
 */
function timeAgoString(date) {
  return formatDistanceToNow(date, {
    addSuffix:true,
    locale:ptBR,
  });
}

function getPedidoDate(pedido, fieldName) {
  const value = pedido?.[fieldName];

  if (!value) {
    return null;
  }

  if (typeof value.toDate === "function") {
    return value.toDate();
  }

  if (value instanceof Date) {
    return value;
  }

  return null;
}

function getPedidosSummary(pedidos, status, dateField) {
  const pedidosFiltrados = pedidos.filter((pedido) => pedido.status === status);

  const totalBruto = pedidosFiltrados.reduce((acc, pedido) => acc + Number(pedido?.total ?? 0), 0);
  const totalAdiantado = pedidosFiltrados.reduce((acc, pedido) => {
    if (!Array.isArray(pedido?.adiantamentos)) {
      return acc;
    }

    return acc + pedido.adiantamentos.reduce((sum, adv) => sum + Number(adv?.valor ?? 0), 0);
  }, 0);

  const total = Math.max(0, totalBruto - totalAdiantado);

  const latestDate = pedidosFiltrados.reduce((latest, pedido) => {
    const pedidoDate = getPedidoDate(pedido, dateField);

    if (!pedidoDate) {
      return latest;
    }

    if (!latest || pedidoDate > latest) {
      return pedidoDate;
    }

    return latest;
  }, null);

  return {
    total,
    timeAgo: latestDate ? timeAgoString(latestDate) : "-",
  };
}

/**
 * Hook para acessar as mesas com informações de pedidos
 * - mesasLivres: status "livre"
 * - mesasAndamento: traz pedido em andamento com total + timeAgo
 * - mesasEntregues: idem para entregues
 */
export const useTables = (idRestaurante) => {
  const tablesFromCtx = useContext(TablesContext);
  const tables = useMemo(() => tablesFromCtx || [], [tablesFromCtx]);

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
          const { total, timeAgo } = getPedidosSummary(pedidos, "andamento", "criadoEm");
          return {
            ...mesa,
            total,
            timeAgo,
          };
        })
      );

      const entreguesEnriched = await Promise.all(
        entregues.map(async (mesa) => {
          const pedidos = await getPedidosDaMesa(idRestaurante, mesa.id);
          const { total, timeAgo } = getPedidosSummary(pedidos, "entregue", "finalizadoEm");
          return {
            ...mesa,
            total,
            timeAgo,
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
