import { collection, getDocs, query, where, Timestamp, orderBy } from "firebase/firestore";
import { db } from "@/config/firebaseConfig";

const timestampToDate = (value) => {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof value.toDate === "function") {
    return value.toDate();
  }
  if (typeof value.seconds === "number") {
    const millis = value.seconds * 1000 + (value.nanoseconds || 0) / 1_000_000;
    return new Date(millis);
  }
  return null;
};

const normalizeDateInput = (value, endOfDay = false) => {
  if (!value) return null;
  if (value instanceof Date) return value;
  
  // If value is a string in YYYY-MM-DD format, parse it as local time
  // This prevents timezone issues where "2026-02-10" is interpreted as UTC
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [year, month, day] = value.split('-').map(Number);
    const parsed = new Date(year, month - 1, day);
    if (endOfDay) {
      parsed.setHours(23, 59, 59, 999);
    } else {
      parsed.setHours(0, 0, 0, 0);
    }
    return parsed;
  }
  
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  if (endOfDay) {
    parsed.setHours(23, 59, 59, 999);
  } else {
    parsed.setHours(0, 0, 0, 0);
  }
  return parsed;
};

/**
 * Lista pedidos de uma mesa com filtro de data usando queries do Firestore.
 * Consulta sempre a coleção `historicoPedidos` e faz filtros adicionais em memória
 * para evitar dependência de índices compostos.
 */
export const showAllOrdersFromTable = async (
  idRestaurante,
  mesaId,
  dateFilter = null,
  startDate = null,
  endDate = null
) => {
  if (!idRestaurante) return [];

  const pedidosRef = collection(
    db,
    "restaurantes",
    idRestaurante,
    "historicoPedidos"
  );

  const constraints = [];

  if (mesaId) {
    constraints.push(where("mesaId", "==", mesaId));
  }

  let pushDateFiltersInQuery = !mesaId;

  if (pushDateFiltersInQuery) {
    if (startDate && endDate) {
      const startTimestamp = Timestamp.fromDate(
        normalizeDateInput(startDate, false)
      );
      const endTimestamp = Timestamp.fromDate(
        normalizeDateInput(endDate, true)
      );
      constraints.push(where("criadoEm", ">=", startTimestamp));
      constraints.push(where("criadoEm", "<=", endTimestamp));
    } else if (dateFilter) {
      const filterStartDate = getFilterStartDate(dateFilter);
      if (filterStartDate) {
        const startTimestamp = Timestamp.fromDate(filterStartDate);
        constraints.push(where("criadoEm", ">=", startTimestamp));
      }
    }
  }

  const shouldOrderByDate = pushDateFiltersInQuery;
  const queryConstraints = shouldOrderByDate
    ? [...constraints, orderBy("criadoEm", "asc")]
    : constraints;

  const pedidosQuery =
    queryConstraints.length > 0
      ? query(pedidosRef, ...queryConstraints)
      : pedidosRef;

  const snapshot = await getDocs(pedidosQuery);
  const pedidos = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

  // Filtro adicional em memória quando somente uma das datas é informada
  const filtered = pedidos.filter((pedido) => {
    const createdAt = timestampToDate(pedido.criadoEm);
    if (!createdAt) return false;

    const start = normalizeDateInput(startDate, false) || getFilterStartDate(dateFilter);
    const end = normalizeDateInput(endDate, true);

    if (start && createdAt < start) return false;
    if (end && createdAt > end) return false;

    return true;
  });

  filtered.sort((a, b) => {
    const dateA = timestampToDate(a.criadoEm)?.getTime() ?? 0;
    const dateB = timestampToDate(b.criadoEm)?.getTime() ?? 0;
    return dateA - dateB;
  });

  return filtered;
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
 * @param {string} idRestaurante - ID do restaurante
 * @param {Array} tables - Array de mesas
 * @param {string|null} dateFilter - Filtro predefinido
 * @param {string|null} startDate - Data de início personalizada
 * @param {string|null} endDate - Data de fim personalizada
 * @returns {Promise<Object>} Estatísticas agregadas de todas as mesas
 */
export const getTableStatsOptimized = async (idRestaurante, tables, dateFilter = null, startDate = null, endDate = null) => {
  if (!tables || tables.length === 0) {
    return {
      totalSales: 0,
      totalOrders: 0,
      totalServiceTime: 0,
      completedOrders: 0,
      averageServiceTime: 0
    };
  }

  const tableIds = new Set(tables.map((table) => table.id));
  const { start, end } = resolvePeriodRange(dateFilter, startDate, endDate);
  const orders = await getOrdersForPeriod(idRestaurante, start, end);
  const filtered = orders.filter((order) => tableIds.has(order.mesaId));

  const stat = calculateStats(filtered);

  return {
    totalSales: stat.totalSales,
    totalOrders: stat.totalOrders,
    totalServiceTime: stat.averageServiceTime * stat.completedOrders,
    completedOrders: stat.completedOrders,
    averageServiceTime: Math.round(stat.averageServiceTime)
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
    const status = (order.status || "").toLowerCase();
    const isDelivered = status === "entregue";
    if (!isDelivered) {
      return;
    }

    totalSales += order.total || 0;
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

/**
 * Busca dados de vendas para o gráfico do dashboard
 * @param {string} idRestaurante - ID do restaurante
 * @param {Array} tables - Lista de mesas
 * @param {string} filter - Filtro de período: "Mensal" ou "Anual"
 * @param {string} category - Filtro de categoria: "Todas" ou qualquer categoria personalizada do restaurante
 */
export const getMonthlySalesData = async (idRestaurante, tables, filter = "Mensal", category = "Todas") => {
  if (!tables || tables.length === 0) {
    return [];
  }

  if (filter === "Anual") {
    return getYearlySalesData(idRestaurante, tables, category);
  } else {
    return getMonthlySalesDataInternal(idRestaurante, tables, category);
  }
};

/**
 * Busca dados de vendas mensais (últimos 12 meses)
 */
const getMonthlySalesDataInternal = async (idRestaurante, tables, category = "Todas") => {
  const now = new Date();
  const monthNames = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
  const tableIds = new Set(tables.map((table) => table.id));
  const rangeStart = new Date(now.getFullYear(), now.getMonth() - 11, 1);
  const rangeEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

  const deliveredOrders = await getDeliveredOrdersForPeriod(idRestaurante, tableIds, rangeStart, rangeEnd);

  const monthlyTotals = new Map();
  deliveredOrders.forEach((order) => {
    const createdAt = timestampToDate(order.criadoEm);
    if (!createdAt) return;

    const key = `${createdAt.getFullYear()}-${createdAt.getMonth()}`;
    const value = getOrderValueByCategory(order, category);
    monthlyTotals.set(key, (monthlyTotals.get(key) || 0) + value);
  });

  const monthlyData = [];
  for (let i = 11; i >= 0; i--) {
    const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${monthDate.getFullYear()}-${monthDate.getMonth()}`;
    monthlyData.push({
      month: monthNames[monthDate.getMonth()],
      value: monthlyTotals.get(key) || 0,
    });
  }

  return monthlyData;
};

/**
 * Busca dados de vendas anuais (últimos anos)
 */
const getYearlySalesData = async (idRestaurante, tables, category = "Todas") => {
  const now = new Date();
  const tableIds = new Set(tables.map((table) => table.id));
  const rangeStart = new Date(now.getFullYear() - 4, 0, 1);
  const rangeEnd = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);

  const deliveredOrders = await getDeliveredOrdersForPeriod(idRestaurante, tableIds, rangeStart, rangeEnd);

  const yearlyTotals = new Map();
  deliveredOrders.forEach((order) => {
    const createdAt = timestampToDate(order.criadoEm);
    if (!createdAt) return;

    const year = createdAt.getFullYear();
    const value = getOrderValueByCategory(order, category);
    yearlyTotals.set(year, (yearlyTotals.get(year) || 0) + value);
  });

  const yearlyData = [];
  for (let i = 4; i >= 0; i--) {
    const year = now.getFullYear() - i;
    yearlyData.push({
      month: year.toString(),
      value: yearlyTotals.get(year) || 0,
    });
  }

  return yearlyData;
};

/**
 * Busca vendas para um período específico (usado internamente por getMonthlySalesData)
 */
const toISODate = (date) => {
  if (!(date instanceof Date)) return date;
  return date.toISOString().slice(0, 10);
};

const getMonthlySalesForPeriod = async (idRestaurante, tables, startDate, endDate, category = "Todas") => {
  const tableIds = new Set(tables.map((table) => table.id));
  const deliveredOrders = await getDeliveredOrdersForPeriod(idRestaurante, tableIds, startDate, endDate);

  return deliveredOrders.reduce((total, order) => total + getOrderValueByCategory(order, category), 0);
};

/**
 * Busca os produtos mais vendidos para o período especificado
 * @param {string} idRestaurante - ID do restaurante
 * @param {Array} tables - Lista de mesas
 * @param {string} filter - Filtro de período: "Mensal" ou "Anual"
 */
export const getTopSellingProducts = async (idRestaurante, tables, filter = "Mensal") => {
  if (!tables || tables.length === 0) {
    return [];
  }

  let startDate, endDate;
  const now = new Date();

  if (filter === "Mensal") {
    // Current month
    startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  } else if (filter === "Anual") {
    // Current year
    startDate = new Date(now.getFullYear(), 0, 1);
    endDate = new Date(now.getFullYear(), 11, 31);
  }

  return getTopProductsForPeriod(idRestaurante, tables, startDate, endDate);
};

/**
 * Busca os produtos mais vendidos para um período específico
 */
const getTopProductsForPeriod = async (idRestaurante, tables, startDate, endDate) => {
  const productSales = {};
  const tableIds = new Set(tables.map((table) => table.id));
  const pedidos = await getDeliveredOrdersForPeriod(idRestaurante, tableIds, startDate, endDate);

  pedidos.forEach((order) => {
    if (order.items && Array.isArray(order.items)) {
      order.items.forEach((item) => {
        const productName = item.nome || 'Produto Desconhecido';
        const itemTotal = (item.price || 0) * (item.quantity || 0);

        if (productSales[productName]) {
          productSales[productName] += itemTotal;
        } else {
          productSales[productName] = itemTotal;
        }
      });
    }
  });

  // Convert to array and sort by sales value
  const sortedProducts = Object.entries(productSales)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 10); // Get top 10 products

  return sortedProducts;
};

const resolvePeriodRange = (dateFilter = null, startDate = null, endDate = null) => {
  const start = normalizeDateInput(startDate, false) || getFilterStartDate(dateFilter);
  const end = normalizeDateInput(endDate, true);
  return { start, end };
};

const getOrdersForPeriod = async (idRestaurante, startDate = null, endDate = null) => {
  const pedidosRef = collection(db, 'restaurantes', idRestaurante, 'historicoPedidos');
  const constraints = [];

  if (startDate) {
    constraints.push(where('criadoEm', '>=', Timestamp.fromDate(startDate)));
  }

  if (endDate) {
    constraints.push(where('criadoEm', '<=', Timestamp.fromDate(endDate)));
  }

  constraints.push(orderBy('criadoEm', 'asc'));

  const pedidosQuery = query(pedidosRef, ...constraints);
  const snapshot = await getDocs(pedidosQuery);
  return snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }));
};

const getDeliveredOrdersForPeriod = async (idRestaurante, tableIds, startDate, endDate) => {
  const orders = await getOrdersForPeriod(idRestaurante, startDate, endDate);
  return orders.filter((order) => {
    const status = (order.status || '').toLowerCase();
    return status === 'entregue' && tableIds.has(order.mesaId);
  });
};

const getOrderValueByCategory = (order, category) => {
  if (category === 'Todas') {
    return order.total || 0;
  }

  return (order.items || []).reduce((itemTotal, item) => {
    if (item.categorias && item.categorias.includes(category)) {
      return itemTotal + (item.price * item.quantity || 0);
    }
    return itemTotal;
  }, 0);
};
