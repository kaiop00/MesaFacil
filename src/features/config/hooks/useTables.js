import { useContext, useEffect, useState, useMemo, useRef } from "react";
import { TablesContext } from "@/features/config/context/TablesContext";
import { getPedidosDaMesa } from "@/features/order/services/orderService";
import { formatDistanceToNow } from "date-fns";
import {ptBR} from "date-fns/locale";
import { useServiceFee } from "@/features/cliente/hooks/useServiceFee";
import { useCoverCharge } from "@/features/cliente/hooks/useCoverCharge";
import {
  computeCoverChargeAmount,
  computeSubtotal,
  computeTotalWithService,
  DEFAULT_SERVICE_FEE_PERCENT,
} from "@/features/cliente/utils/pedidos";
import { isIfoodOrder } from "@/features/integrations/ifood/services/ifoodStatusSyncService";

/**
 * Calcula 'há x minutos' ou 'há x horas'
 */
function timeAgoString(date) {
  return formatDistanceToNow(date, {
    addSuffix:true,
    locale:ptBR,
  });
}

const normalizeStatus = (status) => (status || "").trim().toLowerCase();

const ordersDisplayCache = new Map();

const toMillis = (value) => {
  if (!value) return 0;
  if (typeof value.toDate === "function") return value.toDate().getTime();
  if (value instanceof Date) return value.getTime();
  return 0;
};

const getOrderOrigin = (mesa, pedido) => {
  if (pedido?.orderOrigin) return pedido.orderOrigin;
  if (isIfoodOrder(mesa?.id)) return "ifood";
  if (typeof mesa?.id === "string" && mesa.id.startsWith("whatsapp")) return "whatsapp";
  return "mesaconvencional";
};

/**
 * Hook para acessar as mesas com informações de pedidos
 * - mesasLivres: status "livre"
 * - mesasAndamento: traz pedido em andamento com total + timeAgo
 * - mesasEntregues: idem para entregues
 */
export const useTables = (idRestaurante) => {
  const tablesContext = useContext(TablesContext);
  const tables = useMemo(
    () => (Array.isArray(tablesContext) ? tablesContext : []),
    [tablesContext]
  );

  const [mesasLivres, setMesasLivres] = useState([]);
  const [mesasAndamento, setMesasAndamento] = useState([]);
  const [mesasEntregues, setMesasEntregues] = useState([]);
  const [refreshTick, setRefreshTick] = useState(0);
  const requestSeqRef = useRef(0);
  const lastTablesSignatureRef = useRef("");
  const pedidoCacheRef = useRef(new Map());
  const PEDIDO_CACHE_TTL_MS = 4000;
  const { percent: serviceFeePercent } = useServiceFee(idRestaurante, {
    enabled: Boolean(idRestaurante),
    orderOrigin: "mesaconvencional",
  });
  const { enabled: coverChargeEnabled, value: coverChargeValue } = useCoverCharge(idRestaurante, {
    enabled: Boolean(idRestaurante),
    orderOrigin: "mesaconvencional",
  });

  const tablesSignature = useMemo(() => {
    return tables
      .map((mesa) => `${mesa?.id || ""}:${mesa?.status || ""}:${mesa?.numero || ""}:${mesa?.total ?? ""}`)
      .join("|");
  }, [tables]);

  useEffect(() => {
    if (!idRestaurante) return;

    const cached = ordersDisplayCache.get(idRestaurante);
    if (!cached) return;

    setMesasLivres(cached.mesasLivres || []);
    setMesasAndamento(cached.mesasAndamento || []);
    setMesasEntregues(cached.mesasEntregues || []);
  }, [idRestaurante]);

  useEffect(() => {
    if (!idRestaurante || tables.length === 0) return;

    const intervalId = setInterval(() => {
      setRefreshTick((tick) => tick + 1);
    }, 5000);

    return () => clearInterval(intervalId);
  }, [idRestaurante, tables.length]);

  const calculateDisplayTotal = useMemo(() => {
    return (mesa, pedido) => {
      const persistedTotal = Number(mesa?.total);
      const hasPersistedTotal = Number.isFinite(persistedTotal) && persistedTotal > 0;

      if (normalizeStatus(mesa?.status) === "entregue" && hasPersistedTotal) {
        return Number(persistedTotal.toFixed(2));
      }

      const subtotal = computeSubtotal(pedido?.items || []);
      const origin = getOrderOrigin(mesa, pedido);

      if (origin === "whatsapp" || origin === "ifood") {
        return Number((subtotal + Number(pedido?.taxaEntrega?.valor || 0)).toFixed(2));
      }

      const coverAmount = computeCoverChargeAmount(
        coverChargeEnabled,
        coverChargeValue,
        mesa?.numeroPessoas || 1
      );

      const calculatedTotal = computeTotalWithService(
        subtotal,
        serviceFeePercent,
        DEFAULT_SERVICE_FEE_PERCENT,
        coverAmount,
        0
      );

      if (hasPersistedTotal && normalizeStatus(mesa?.status) !== "andamento") {
        return Number(persistedTotal.toFixed(2));
      }

      return calculatedTotal;
    };
  }, [coverChargeEnabled, coverChargeValue, serviceFeePercent]);

  useEffect(() => {
    if (!idRestaurante || tables.length === 0) return;

    const signatureUnchanged = lastTablesSignatureRef.current === tablesSignature;
    const isRefreshRun = refreshTick > 0;

    if (!signatureUnchanged || !isRefreshRun) {
      lastTablesSignatureRef.current = tablesSignature;
    }

    let cancelled = false;
    const requestId = ++requestSeqRef.current;

    const baseLivres = tables.filter((t) => normalizeStatus(t.status) === "livre");
    const baseAndamento = tables.filter((t) => normalizeStatus(t.status) === "andamento");
    const baseEntregues = tables.filter((t) => normalizeStatus(t.status) === "entregue");

    // Mostra as mesas imediatamente para não prender a tela em loading.
    setMesasLivres(baseLivres);
    setMesasAndamento(baseAndamento.map((mesa) => ({
      ...mesa,
      total: mesa.total ?? 0,
      timeAgo: mesa.timeAgo ?? "-",
    })));
    setMesasEntregues(baseEntregues.map((mesa) => ({
      ...mesa,
      total: mesa.total ?? 0,
      timeAgo: mesa.timeAgo ?? "-",
    })));

    const enrichTables = async () => {
      const andamento = baseAndamento;
      const entregues = baseEntregues;

      const readCachedPedido = (mesa, statusKey) => {
        const cacheKey = `${mesa.id}:${statusKey}:${mesa.numero ?? ""}`;
        const cached = pedidoCacheRef.current.get(cacheKey);

        if (!cached) return null;

        const isFresh = Date.now() - cached.fetchedAt < PEDIDO_CACHE_TTL_MS;
        return isFresh ? cached.data : null;
      };

      const writeCachedPedido = (mesa, statusKey, data) => {
        const cacheKey = `${mesa.id}:${statusKey}:${mesa.numero ?? ""}`;
        pedidoCacheRef.current.set(cacheKey, {
          fetchedAt: Date.now(),
          data,
        });
      };

      const andamentoEnriched = [];
      for (const mesa of andamento) {
        if (cancelled || requestSeqRef.current !== requestId) return;

        const cached = readCachedPedido(mesa, "andamento");
        if (cached) {
          andamentoEnriched.push(cached);
          continue;
        }

        const pedidos = (await getPedidosDaMesa(idRestaurante, mesa.id))
          .slice()
          .sort((a, b) => toMillis(b.criadoEm) - toMillis(a.criadoEm));
        const pedido = pedidos.find((p) => normalizeStatus(p.status) === "andamento")
          || pedidos[0];
        const enriched = {
          ...mesa,
          total: calculateDisplayTotal(mesa, pedido),
          timeAgo: pedido?.criadoEm?.toDate
            ? timeAgoString(pedido.criadoEm.toDate())
            : "-",
        };
        writeCachedPedido(mesa, "andamento", enriched);
        andamentoEnriched.push(enriched);
      }

      const entreguesEnriched = [];
      for (const mesa of entregues) {
        if (cancelled || requestSeqRef.current !== requestId) return;

        const cached = readCachedPedido(mesa, "entregue");
        if (cached) {
          entreguesEnriched.push(cached);
          continue;
        }

        const pedidos = (await getPedidosDaMesa(idRestaurante, mesa.id))
          .slice()
          .sort((a, b) => toMillis(b.criadoEm) - toMillis(a.criadoEm));
        const pedido = pedidos.find((p) => normalizeStatus(p.status) === "entregue")
          || pedidos[0];
        const enriched = {
          ...mesa,
          total: calculateDisplayTotal(mesa, pedido),
          timeAgo: pedido?.finalizadoEm?.toDate
            ? timeAgoString(pedido.finalizadoEm.toDate())
            : "-",
        };
        writeCachedPedido(mesa, "entregue", enriched);
        entreguesEnriched.push(enriched);
      }

      if (cancelled || requestSeqRef.current !== requestId) return;

      setMesasLivres(baseLivres);
      setMesasAndamento(andamentoEnriched);
      setMesasEntregues(entreguesEnriched);

      ordersDisplayCache.set(idRestaurante, {
        mesasLivres: baseLivres,
        mesasAndamento: andamentoEnriched,
        mesasEntregues: entreguesEnriched,
        updatedAt: Date.now(),
      });
    };

    enrichTables().catch((error) => {
      if (!cancelled) {
        console.error("[useTables] Erro ao enriquecer mesas:", error);
        // Mantém a lista básica visível mesmo se a busca dos pedidos falhar.
        setMesasLivres(baseLivres);
        setMesasAndamento(baseAndamento.map((mesa) => ({
          ...mesa,
          total: mesa.total ?? 0,
          timeAgo: mesa.timeAgo ?? "-",
        })));
        setMesasEntregues(baseEntregues.map((mesa) => ({
          ...mesa,
          total: mesa.total ?? 0,
          timeAgo: mesa.timeAgo ?? "-",
        })));
      }
    });

    return () => {
      cancelled = true;
    };
  }, [tables, idRestaurante, tablesSignature, refreshTick, calculateDisplayTotal]);


  return {
    tables,
    mesas: tables, // todas
    mesasLivres: mesasLivres || [],
    mesasAndamento: mesasAndamento || [],
    mesasEntregues: mesasEntregues || [],
  };
};
