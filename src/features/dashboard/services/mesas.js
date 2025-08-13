import { collection, getDocs, query, where, Timestamp } from "firebase/firestore";
import { db } from "@/config/firebaseConfig";

/**
 * Lista pedidos de uma mesa com filtro de data usando queries do Firestore
 */
export const showAllOrdersFromTable = async (idRestaurante, mesaId, dateFilter = null) => {
  const pedidosRef = collection(
    db,
    "restaurantes",
    idRestaurante,
    "mesas",
    mesaId,
    "pedidos",
  );
  
  let pedidosQuery = pedidosRef;
  
  // Apply date filter directly in Firestore query
  if (dateFilter) {
    const startDate = getFilterStartDate(dateFilter);
    if (startDate) {
      const startTimestamp = Timestamp.fromDate(startDate);
      pedidosQuery = query(pedidosRef, where("criadoEm", ">=", startTimestamp));
    }
  }
  
  const snapshot = await getDocs(pedidosQuery);
  const pedidos = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  
  console.log('[pedidos]', pedidos);
  return pedidos;
};

/**
 * Calcula a data de início baseada no período especificado
 */
const getFilterStartDate = (period) => {
  const now = new Date();
  
  switch (period) {
    case 'Hoje':
      return new Date(now.getFullYear(), now.getMonth(), now.getDate());
    case 'Semanal': {
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() - 7);
      return weekStart;
    }
    case 'Mensal': {
      const monthStart = new Date(now);
      monthStart.setMonth(now.getMonth() - 1);
      return monthStart;
    }
    default:
      return null;
  }
};

/**
 * Versão otimizada para buscar estatísticas de múltiplas mesas com o mesmo filtro
 * Útil quando você precisa das mesmas estatísticas para todas as mesas
 */
export const getTableStatsOptimized = async (idRestaurante, tables, dateFilter = null) => {
  if (!tables || tables.length === 0) {
    return {
      totalSales: 0,
      totalOrders: 0,
      totalServiceTime: 0,
      completedOrders: 0,
      averageServiceTime: 0
    };
  }

  // Execute all queries in parallel but with the same filter
  const promises = tables.map(async (table) => {
    const orders = await showAllOrdersFromTable(idRestaurante, table.id, dateFilter);
    return calculateStats(orders);
  });

  const allStats = await Promise.all(promises);

  // Aggregate results
  let totalSales = 0;
  let totalOrders = 0;
  let totalServiceTime = 0;
  let totalCompletedOrders = 0;

  allStats.forEach((stat) => {
    totalSales += stat.totalSales;
    totalOrders += stat.totalOrders;
    totalServiceTime += stat.averageServiceTime * stat.completedOrders;
    totalCompletedOrders += stat.completedOrders;
  });

  const averageServiceTime = totalCompletedOrders > 0 ? totalServiceTime / totalCompletedOrders : 0;

  return {
    totalSales,
    totalOrders,
    totalServiceTime,
    completedOrders: totalCompletedOrders,
    averageServiceTime: Math.round(averageServiceTime)
  };
};

/**
 * Calcula estatísticas de uma lista de pedidos
 */
const calculateStats = (orders) => {
  let totalSales = 0;
  let totalOrders = 0;
  let totalServiceTime = 0;
  let completedOrders = 0;

  orders.forEach((order) => {
    totalSales += order.total;
    totalOrders += 1;

    // Calculate service time for completed orders
    if (order.finalizadoEm && order.criadoEm) {
      const createdTime =
        order.criadoEm.seconds * 1000 + (order.criadoEm.nanoseconds || 0) / 1000000;
      const finishedTime =
        order.finalizadoEm.seconds * 1000 + (order.finalizadoEm.nanoseconds || 0) / 1000000;

      const serviceTimeMs = finishedTime - createdTime;
      const serviceTimeMinutes = serviceTimeMs / (1000 * 60); // Convert to minutes

      totalServiceTime += serviceTimeMinutes;
      completedOrders += 1;
    }
  });

  const averageOrderValue = totalOrders > 0 ? totalSales / totalOrders : 0;
  const averageServiceTime = completedOrders > 0 ? totalServiceTime / completedOrders : 0;

  return {
    totalSales,
    totalOrders,
    averageOrderValue,
    averageServiceTime,
    completedOrders,
  };
};