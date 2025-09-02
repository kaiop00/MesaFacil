import { collection, getDocs, query, where, Timestamp } from "firebase/firestore";
import { db } from "@/config/firebaseConfig";

/**
 * Lista pedidos de uma mesa com filtro de data usando queries do Firestore
 * @param {string} idRestaurante - ID do restaurante
 * @param {string} mesaId - ID da mesa
 * @param {string|null} dateFilter - Filtro predefinido: 'Hoje', 'Semanal', 'Mensal'
 * @param {string|null} startDate - Data de início personalizada (ISO string)
 * @param {string|null} endDate - Data de fim personalizada (ISO string)
 * @returns {Promise<Array>} Array de pedidos filtrados
 */
export const showAllOrdersFromTable = async (idRestaurante, mesaId, dateFilter = null, startDate = null, endDate = null) => {
  const pedidosRef = collection(
    db,
    "restaurantes",
    idRestaurante,
    "mesas",
    mesaId,
    "pedidos",
  );

  let pedidosQuery = pedidosRef;

  // OTIMIZAÇÃO: Apply custom date range filter directly in Firestore query
  // This reduces data transfer and improves performance significantly
  if (startDate && endDate) {
    const startTimestamp = Timestamp.fromDate(new Date(startDate + "T00:00:00"));
    const endTimestamp = Timestamp.fromDate(new Date(endDate + "T23:59:59"));
    pedidosQuery = query(
      pedidosRef,
      where("criadoEm", ">=", startTimestamp),
      where("criadoEm", "<=", endTimestamp)
    );
  }
  // Apply predefined period filter if no custom range provided
  else if (dateFilter) {
    const filterStartDate = getFilterStartDate(dateFilter);
    if (filterStartDate) {
      const startTimestamp = Timestamp.fromDate(filterStartDate);
      pedidosQuery = query(pedidosRef, where("criadoEm", ">=", startTimestamp));
    }
  }

  const snapshot = await getDocs(pedidosQuery);
  const pedidos = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

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

  // Execute all queries in parallel but with the same filter
  const promises = tables.map(async (table) => {
    const orders = await showAllOrdersFromTable(idRestaurante, table.id, dateFilter, startDate, endDate);
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

/**
 * Busca dados de vendas para o gráfico do dashboard
 * @param {string} idRestaurante - ID do restaurante
 * @param {Array} tables - Lista de mesas
 * @param {string} filter - Filtro de período: "Mensal" ou "Anual"
 * @param {string} category - Filtro de categoria: "Todas", "Guarnição", "Sobremesa", "Carne", "Acompanhamento"
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
  const monthlyData = [];

  // Get data for each of the last 12 months
  for (let i = 11; i >= 0; i--) {
    const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthStart = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
    const monthEnd = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0);

    // Get sales for this specific month
    const monthlySales = await getMonthlySalesForPeriod(idRestaurante, tables, monthStart, monthEnd, category);

    monthlyData.push({
      month: monthNames[monthDate.getMonth()],
      value: monthlySales
    });
  }

  return monthlyData;
};

/**
 * Busca dados de vendas anuais (últimos anos)
 */
const getYearlySalesData = async (idRestaurante, tables, category = "Todas") => {
  const now = new Date();
  const yearlyData = [];

  // Get data for the last 5 years
  for (let i = 4; i >= 0; i--) {
    const year = now.getFullYear() - i;
    const yearStart = new Date(year, 0, 1);
    const yearEnd = new Date(year, 11, 31);

    // Get sales for this specific year
    const yearlySales = await getMonthlySalesForPeriod(idRestaurante, tables, yearStart, yearEnd, category);

    yearlyData.push({
      month: year.toString(),
      value: yearlySales
    });
  }

  return yearlyData;
};

/**
 * Busca vendas para um período específico (usado internamente por getMonthlySalesData)
 */
const getMonthlySalesForPeriod = async (idRestaurante, tables, startDate, endDate, category = "Todas") => {
  const promises = tables.map(async (table) => {
    const pedidosRef = collection(
      db,
      "restaurantes",
      idRestaurante,
      "mesas",
      table.id,
      "pedidos",
    );

    const startTimestamp = Timestamp.fromDate(startDate);
    const endTimestamp = Timestamp.fromDate(endDate);

    const pedidosQuery = query(
      pedidosRef,
      where("criadoEm", ">=", startTimestamp),
      where("criadoEm", "<=", endTimestamp)
    );

    const snapshot = await getDocs(pedidosQuery);
    const pedidos = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

    // Calculate total sales for this table in this period with category filter
    return pedidos.reduce((total, order) => {
      if (category === "Todas") {
        return total + (order.total || 0);
      }

      // Filter by category
      const categoryTotal = (order.items || []).reduce((itemTotal, item) => {
        if (item.categorias && item.categorias.includes(category)) {
          return itemTotal + (item.price * item.quantity || 0);
        }
        return itemTotal;
      }, 0);

      return total + categoryTotal;
    }, 0);
  });

  const tablesSales = await Promise.all(promises);
  return tablesSales.reduce((total, sales) => total + sales, 0);
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

  const promises = tables.map(async (table) => {
    const pedidosRef = collection(
      db,
      "restaurantes",
      idRestaurante,
      "mesas",
      table.id,
      "pedidos",
    );

    const startTimestamp = Timestamp.fromDate(startDate);
    const endTimestamp = Timestamp.fromDate(endDate);

    const pedidosQuery = query(
      pedidosRef,
      where("criadoEm", ">=", startTimestamp),
      where("criadoEm", "<=", endTimestamp)
    );

    const snapshot = await getDocs(pedidosQuery);
    const pedidos = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    // Process each order's items
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
  });

  await Promise.all(promises);

  // Convert to array and sort by sales value
  const sortedProducts = Object.entries(productSales)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 10); // Get top 10 products

  return sortedProducts;
};
