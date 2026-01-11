import { useCallback, useContext, useEffect, useState } from "react";
import { TablesContext } from "@/features/config/context/TablesContext";
import { getPedidosDaMesa } from "@/features/order/services/orderService";

const normalizeStatus = (status) => (status || "").toLowerCase().trim();

const shouldKeepPedido = (status) => {
  const normalized = normalizeStatus(status);
  return normalized !== "entregue" && normalized !== "cancelado";
};

const computePedidoTotal = (pedido) => {
  if (typeof pedido?.total === "number") {
    return pedido.total;
  }

  return (pedido?.items || []).reduce((acc, item) => {
    const quantity = Number(item?.quantity || 0);
    const price = Number(item?.price || 0);
    return acc + quantity * price;
  }, 0);
};

export const useKitchenOrders = (idRestaurante) => {
  const tablesContext = useContext(TablesContext);
  const tables = Array.isArray(tablesContext) ? tablesContext : [];
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchOrders = useCallback(async () => {
    if (!idRestaurante) {
      setOrders([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const mesasComPedidos = tables.filter(
        (mesa) => normalizeStatus(mesa?.status) !== "livre"
      );

      const pedidosPorMesa = await Promise.all(
        mesasComPedidos.map(async (mesa) => {
          const pedidos = await getPedidosDaMesa(idRestaurante, mesa.id);

          return pedidos
            .filter((pedido) => shouldKeepPedido(pedido?.status))
            .map((pedido) => ({
              id: pedido.id,
              mesaId: mesa.id,
              mesaNumero: mesa.numero ?? mesa?.nome ?? mesa.id,
              criadoEm: pedido?.criadoEm?.toDate
                ? pedido.criadoEm.toDate()
                : null,
              total: computePedidoTotal(pedido),
              observacoes: pedido?.observacoes || "",
              status: pedido?.status || "",
              items: pedido?.items || [],
              // Campos para pedidos WhatsApp
              orderOrigin: pedido?.orderOrigin || "",
              cliente: pedido?.cliente || null,
              formaPagamento: pedido?.formaPagamento || "",
              troco: pedido?.troco || null,
            }));
        })
      );

      const pedidos = pedidosPorMesa.flat();
      pedidos.sort((a, b) => {
        const aTime = a.criadoEm ? a.criadoEm.getTime() : 0;
        const bTime = b.criadoEm ? b.criadoEm.getTime() : 0;
        return bTime - aTime;
      });

      setOrders(pedidos);
    } catch (err) {
      console.error("[useKitchenOrders] Erro ao carregar pedidos:", err);
      setError(err);
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }, [idRestaurante, tables]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  return {
    orders,
    loading,
    error,
    refetch: fetchOrders,
  };
};
