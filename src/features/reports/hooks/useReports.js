import { useState, useEffect, useRef } from "react";
import { showAllOrdersFromTable } from "@/features/dashboard/services/mesas";

const toDate = (timestamp) => {
  if (!timestamp) return null;
  if (typeof timestamp.toDate === "function") {
    return timestamp.toDate();
  }
  if (typeof timestamp.seconds === "number") {
    const millis =
      timestamp.seconds * 1000 + (timestamp.nanoseconds || 0) / 1000000;
    return new Date(millis);
  }
  if (timestamp instanceof Date) {
    return timestamp;
  }
  return null;
};

/**
 * Hook para geração de relatórios otimizado com filtragem no banco de dados
 * @param {string} idRestaurante - ID do restaurante
 * @param {Array} tables - Array de mesas do restaurante
 * @returns {Object} Objeto com dados do relatório e funções de controle
 */
export const useReports = (idRestaurante, tables) => {
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(false);
  const currentRequestRef = useRef(null);

  // Clear report data when tables or restaurant change
  useEffect(() => {
    setReportData(null);
    // Cancel any ongoing requests when dependencies change
    if (currentRequestRef.current) {
      currentRequestRef.current.cancelled = true;
    }
  }, [tables, idRestaurante]);

  /**
   * Gera relatório de vendas com filtragem otimizada no banco
   * @param {string} startDate - Data de início (ISO string)
   * @param {string} endDate - Data de fim (ISO string)
   * @returns {Object} Relatório de vendas formatado
   */
  const generateSalesReport = async (startDate, endDate) => {
    // Get all orders from all tables in the date range (filtered at database level)
    const ordersPromises = tables.map(async (table) => {
      const orders = await showAllOrdersFromTable(
        idRestaurante,
        table.id,
        null,
        startDate,
        endDate,
      );
      return orders.map((order) => ({
        ...order,
        mesaNumero: order.mesaNumero ?? table.numero,
      }));
    });

    const ordersArrays = await Promise.all(ordersPromises);
    const allOrders = ordersArrays.flat();

    return {
      type: "vendas",
      orders: allOrders.map((order) => ({
        numero: order.id,
        data: (() => {
          const createdAt = toDate(order.criadoEm);
          return createdAt ? createdAt.toLocaleDateString("pt-BR") : "-";
        })(),
        valor: order.total,
        status:
          order.status ||
          (order.finalizadoEm ? "Finalizado" : "Em andamento"),
        mesa: order.mesaNumero,
      })),
    };
  };

  /**
   * Gera relatório por período com otimização máxima de consultas ao Firestore
   * @param {string} startDate - Data de início
   * @param {string} endDate - Data de fim
   * @returns {Object} Dados agrupados por período
   */
  const generatePeriodReport = async (startDate, endDate) => {
    const start = new Date(startDate + "T00:00:00");
    const end = new Date(endDate + "T23:59:59");
    console.log(start);

    // Execute all table queries in parallel for the entire period (ONE REQUEST PER TABLE)
    const tablesOrdersPromises = tables.map(async (table) => {
      const orders = await showAllOrdersFromTable(
        idRestaurante,
        table.id,
        null,
        startDate,
        endDate,
      );
      return orders;
    });

    const allTablesOrders = await Promise.all(tablesOrdersPromises);
    const allOrders = allTablesOrders.flat();

    // 🚀 OTIMIZAÇÃO: Group orders by day in memory instead of multiple DB queries
    // This is 100x faster than querying each day separately
    const ordersByDay = {};

    allOrders.forEach((order) => {
      if ((order.status || "").toLowerCase() !== "entregue") {
        return;
      }

      const orderDate = toDate(order.criadoEm);
      if (!orderDate) return;
      const dayKey = orderDate.toLocaleDateString("pt-BR");

      if (!ordersByDay[dayKey]) {
        ordersByDay[dayKey] = {
          orders: [],
          total: 0,
        };
      }

      ordersByDay[dayKey].orders.push(order);
      ordersByDay[dayKey].total += order.total;
    });

    // Generate period data for each day in the range (using grouped data)
    const periodData = [];
    const currentDate = new Date(start);

    while (currentDate <= end) {
      const dayKey = currentDate.toLocaleDateString("pt-BR");
      const dayData = ordersByDay[dayKey] || { orders: [], total: 0 };

      periodData.push({
        data: dayKey,
        totalPedidos: dayData.orders.length,
        valorTotal: dayData.total,
      });

      currentDate.setDate(currentDate.getDate() + 1);
    }

    return {
      type: "periodo",
      data: periodData,
    };
  };

  /**
   * Gera relatório de produtos com consultas paralelas otimizadas
   * @param {string} startDate - Data de início
   * @param {string} endDate - Data de fim
   * @returns {Object} Relatório de produtos mais vendidos
   */
  const generateProductReport = async (startDate, endDate) => {
    const productSales = {};

    // Execute all table queries in parallel
    const ordersPromises = tables.map(async (table) => {
      return await showAllOrdersFromTable(
        idRestaurante,
        table.id,
        null,
        startDate,
        endDate,
      );
    });

    const allOrdersArrays = await Promise.all(ordersPromises);
    const allOrders = allOrdersArrays.flat();

    allOrders.forEach((order) => {
      if (
        (order.status || "").toLowerCase() === "entregue" &&
        order.items &&
        Array.isArray(order.items)
      ) {
        order.items.forEach((item) => {
          const productName = item.nome || "Produto Desconhecido";
          const quantity = item.quantity || 0;
          const value = (item.price || 0) * quantity;

          if (productSales[productName]) {
            productSales[productName].quantidade += quantity;
            productSales[productName].valorTotal += value;
          } else {
            productSales[productName] = {
              quantidade: quantity,
              valorTotal: value,
            };
          }
        });
      }
    });

    const products = Object.entries(productSales)
      .map(([nome, data]) => ({
        produto: nome,
        quantidadeVendida: data.quantidade,
        valorTotal: data.valorTotal,
      }))
      .sort((a, b) => b.quantidadeVendida - a.quantidadeVendida);

    return {
      type: "produto",
      products,
    };
  };

  /**
   * Gera relatório de garçons com performance otimizada
   * @param {string} startDate - Data de início
   * @param {string} endDate - Data de fim
   * @returns {Object} Estatísticas por garçom ordenadas por valor total
   */
  const generateWaiterReport = async (startDate, endDate) => {
    const waiterStats = {};

    // Execute all table queries in parallel
    const ordersPromises = tables.map(async (table) => {
      return await showAllOrdersFromTable(
        idRestaurante,
        table.id,
        null,
        startDate,
        endDate,
      );
    });

    const allOrdersArrays = await Promise.all(ordersPromises);
    const allOrders = allOrdersArrays.flat();

    allOrders.forEach((order) => {
      if ((order.status || "").toLowerCase() !== "entregue") {
        return;
      }

      const waiterName = order.garcom || "Não informado";

      if (waiterStats[waiterName]) {
        waiterStats[waiterName].pedidos += 1;
        waiterStats[waiterName].valorTotal += order.total;
      } else {
        waiterStats[waiterName] = {
          pedidos: 1,
          valorTotal: order.total,
        };
      }
    });

    const waiters = Object.entries(waiterStats)
      .map(([nome, data]) => ({
        garcom: nome,
        numeroPedidos: data.pedidos,
        valorTotal: data.valorTotal,
      }))
      .sort((a, b) => b.valorTotal - a.valorTotal);

    return {
      type: "garcom",
      waiters,
    };
  };

  /**
   * Função principal para geração de relatórios com controle de cancelamento
   * @param {string} reportType - Tipo do relatório: 'vendas', 'periodo', 'produto', 'garcom'
   * @param {string} startDate - Data de início
   * @param {string} endDate - Data de fim
   * @returns {Promise<Object>} Dados do relatório gerado
   */
  const generateReport = async (reportType, startDate, endDate) => {
    if (!reportType || !startDate || !endDate) {
      throw new Error("Por favor, preencha todos os campos");
    }

    if (!idRestaurante) {
      throw new Error("Restaurante não identificado");
    }

    if (!tables || tables.length === 0) {
      throw new Error("Nenhuma mesa disponível para gerar o relatório");
    }

    // Cancel any previous request
    if (currentRequestRef.current) {
      currentRequestRef.current.cancelled = true;
    }

    // Create new request object
    const requestId = { cancelled: false };
    currentRequestRef.current = requestId;

    setLoading(true);
    try {
      let data = null;

      switch (reportType) {
        case "vendas":
          data = await generateSalesReport(startDate, endDate);
          break;
        case "periodo":
          data = await generatePeriodReport(startDate, endDate);
          break;
        case "produto":
          data = await generateProductReport(startDate, endDate);
          break;
        case "garcom":
          data = await generateWaiterReport(startDate, endDate);
          break;
        default:
          throw new Error("Tipo de relatório não suportado");
      }

      // Only update state if this request hasn't been cancelled
      if (!requestId.cancelled) {
        setReportData(data);
      }
      return data;
    } catch (error) {
      console.error("Erro ao gerar relatório:", error);
      // Only throw if this request hasn't been cancelled
      if (!requestId.cancelled) {
        throw error;
      }
    } finally {
      // Only update loading state if this request hasn't been cancelled
      if (!requestId.cancelled) {
        setLoading(false);
      }
    }
  };

  const clearReport = () => {
    // Cancel any ongoing requests
    if (currentRequestRef.current) {
      currentRequestRef.current.cancelled = true;
    }
    setReportData(null);
  };

  return {
    reportData,
    loading,
    generateReport,
    clearReport,
    hasValidTables: tables && tables.length > 0,
  };
};
