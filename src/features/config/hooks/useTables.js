import { useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
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
  const summaryCacheRef = useRef(new Map());

  const [mesasLivres, setMesasLivres] = useState([]);
  const [mesasAndamento, setMesasAndamento] = useState([]);
  const [mesasEntregues, setMesasEntregues] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [refreshCounter, setRefreshCounter] = useState(0);

  const refreshTables = useCallback(() => {
    summaryCacheRef.current.clear();
    setRefreshCounter((prev) => prev + 1);
  }, []);

  useEffect(() => {
    if (!idRestaurante) {
      setMesasLivres([]);
      setMesasAndamento([]);
      setMesasEntregues([]);
      setLoading(false);
      setError(null);
      return;
    }

    if (tables.length === 0) {
      setMesasLivres([]);
      setMesasAndamento([]);
      setMesasEntregues([]);
      setLoading(false);
      setError(null);
      return;
    }

    let isMounted = true;
    const CACHE_TTL_MS = 15000;

    const enrichTables = async () => {
      setLoading(true);
      setError(null);

      const livres = tables.filter((t) => t.status === "livre");
      const andamento = tables.filter((t) => t.status === "andamento");
      const entregues = tables.filter((t) => t.status === "entregue");

      const now = Date.now();
      const withCachedSummary = (mesa, fallback = { total: 0, timeAgo: "-" }) => {
        const cached = summaryCacheRef.current.get(mesa.id);
        if (!cached) return { ...mesa, ...fallback };
        return { ...mesa, total: cached.total, timeAgo: cached.timeAgo };
      };

      const mesasParaAtualizarAndamento = andamento.filter((mesa) => {
        const cached = summaryCacheRef.current.get(mesa.id);
        return !cached || (now - cached.updatedAt) > CACHE_TTL_MS;
      });

      const mesasParaAtualizarEntregues = entregues.filter((mesa) => {
        const cached = summaryCacheRef.current.get(mesa.id);
        return !cached || (now - cached.updatedAt) > CACHE_TTL_MS;
      });

      try {
        const andamentoEnrichedResults = await Promise.allSettled(
          mesasParaAtualizarAndamento.map(async (mesa) => {
            const pedidos = await getPedidosDaMesa(idRestaurante, mesa.id);
            const { total, timeAgo } = getPedidosSummary(pedidos, "andamento", "criadoEm");
            summaryCacheRef.current.set(mesa.id, { total, timeAgo, updatedAt: Date.now() });
            return {
              ...mesa,
              total,
              timeAgo,
            };
          })
        );

        const entreguesEnrichedResults = await Promise.allSettled(
          mesasParaAtualizarEntregues.map(async (mesa) => {
            const pedidos = await getPedidosDaMesa(idRestaurante, mesa.id);
            const { total, timeAgo } = getPedidosSummary(pedidos, "entregue", "finalizadoEm");
            summaryCacheRef.current.set(mesa.id, { total, timeAgo, updatedAt: Date.now() });
            return {
              ...mesa,
              total,
              timeAgo,
            };
          })
        );

        const andamentoAtualizado = andamentoEnrichedResults.map((result, index) => {
          if (result.status === "fulfilled") {
            return result.value;
          }

          return {
            ...mesasParaAtualizarAndamento[index],
            total: 0,
            timeAgo: "-",
          };
        });

        const entreguesAtualizado = entreguesEnrichedResults.map((result, index) => {
          if (result.status === "fulfilled") {
            return result.value;
          }

          return {
            ...mesasParaAtualizarEntregues[index],
            total: 0,
            timeAgo: "-",
          };
        });

        const andamentoMap = new Map(andamentoAtualizado.map((mesa) => [mesa.id, mesa]));
        const entreguesMap = new Map(entreguesAtualizado.map((mesa) => [mesa.id, mesa]));

        const andamentoEnriched = andamento.map((mesa) =>
          andamentoMap.get(mesa.id) || withCachedSummary(mesa)
        );
        const entreguesEnriched = entregues.map((mesa) =>
          entreguesMap.get(mesa.id) || withCachedSummary(mesa)
        );

        if (!isMounted) return;
        setMesasLivres(livres);
        setMesasAndamento(andamentoEnriched);
        setMesasEntregues(entreguesEnriched);
      } catch (err) {
        if (!isMounted) return;
        setError(err);
        setMesasLivres(livres);
        setMesasAndamento([]);
        setMesasEntregues([]);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    enrichTables();

    return () => {
      isMounted = false;
    };
  }, [tables, idRestaurante, refreshCounter]);


  return {
    tables,
    mesas: tables, // todas
    mesasLivres: mesasLivres || [],
    mesasAndamento: mesasAndamento || [],
    mesasEntregues: mesasEntregues || [],
    loading,
    error,
    refreshTables,
  };
};
