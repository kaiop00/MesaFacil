import * as XLSX from "xlsx";

const formatDateForFile = (value) => {
  if (!value) return "sem-data";

  try {
    return new Date(value).toISOString().slice(0, 10);
  } catch (error) {
    return String(value).replaceAll("/", "-");
  }
};

const getReportName = (type) => {
  switch (type) {
    case "vendas":
      return "relatorio-vendas";
    case "gorjetas":
      return "relatorio-gorjetas";
    case "periodo":
      return "relatorio-periodo";
    case "produto":
      return "relatorio-produto";
    case "garcom":
      return "relatorio-garcom";
    case "cancelamentos":
      return "relatorio-cancelamentos";
    default:
      return "relatorio";
  }
};

const getPaymentMethodLabel = (method) => {
  const normalizedMethod = String(method || "").toLowerCase();

  switch (normalizedMethod) {
    case "dinheiro":
      return "Dinheiro";
    case "debito":
      return "Débito";
    case "credito":
      return "Crédito";
    case "pix":
      return "PIX";
    case "ifood":
      return "iFood";
    case "voucher":
      return "Voucher/Cortesia";
    case "cartao":
      return "Cartão";
    default:
      return method || "-";
  }
};

const getSalesPaymentSummary = (orders = []) => {
  const summary = orders.reduce((accumulator, order) => {
    const method = String(order.formaPagamento || "").toLowerCase();
    const value = Number(order.valor || 0);

    if (!method) return accumulator;

    accumulator[method] = (accumulator[method] || 0) + value;
    accumulator.total = (accumulator.total || 0) + value;

    if (method === "credito" || method === "debito") {
      accumulator.cartao = (accumulator.cartao || 0) + value;
    }

    return accumulator;
  }, {});

  return [
    ["Dinheiro", summary.dinheiro],
    ["PIX", summary.pix],
    ["Crédito", summary.credito],
    ["Débito", summary.debito],
    ["Cartão", summary.cartao],
    ["iFood", summary.ifood],
    ["Voucher/Cortesia", summary.voucher],
  ].filter(([, value]) => Number(value || 0) > 0).map(([label, value]) => ({
    "Forma de Pagamento": label,
    Valor: Number(value || 0),
  }));
};

const getRowsByType = (reportData) => {
  switch (reportData.type) {
    case "vendas":
      return (reportData.orders || []).map((order) => ({
        Pedido: order.numero,
        Mesa: order.mesa,
        Data: order.data,
        Valor: Number(order.valor || 0),
        Status: order.status,
        "Forma de Pagamento": getPaymentMethodLabel(order.formaPagamento),
      }));
    case "gorjetas":
      return (reportData.tips || []).map((item) => ({
        Pedido: item.pedidoId,
        Mesa: item.mesa,
        "Valor Pedido": Number(item.valorPedido || 0),
        Gorjeta: Number(item.gorjeta || 0),
        "Forma de Pagamento": getPaymentMethodLabel(item.formaPagamento),
        "Data de Finalização": item.dataFinalizacao,
      }));
    case "periodo":
      return (reportData.data || []).map((item) => ({
        Data: item.data,
        "Total de Pedidos": Number(item.totalPedidos || 0),
        "Valor Total": Number(item.valorTotal || 0),
      }));
    case "produto":
      return (reportData.products || []).map((item) => ({
        Produto: item.produto,
        "Quantidade Vendida": Number(item.quantidadeVendida || 0),
        "Valor Total": Number(item.valorTotal || 0),
      }));
    case "garcom":
      return (reportData.waiters || []).map((item) => ({
        Garcom: item.garcom,
        "Numero de Pedidos": Number(item.numeroPedidos || 0),
        "Valor Total": Number(item.valorTotal || 0),
      }));
    case "cancelamentos":
      return (reportData.cancellations || []).map((item) => ({
        Pedido: item.pedidoId,
        Mesa: item.mesa,
        "Pedido Cancelado": item.itensCancelados || "-",
        "Data do Cancelamento": item.dataCancelamento,
        Motivo: item.motivoCancelamento,
        Valor: Number(item.valor || 0),
      }));
    default:
      return [];
  }
};

export const exportReportToExcel = ({ reportData, startDate, endDate }) => {
  const rows = getRowsByType(reportData);
  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Relatorio");

  if (reportData.type === "vendas") {
    const summaryRows = getSalesPaymentSummary(reportData.orders || []);
    if (summaryRows.length > 0) {
      const summarySheet = XLSX.utils.json_to_sheet(summaryRows);
      XLSX.utils.book_append_sheet(workbook, summarySheet, "Resumo");
    }
  }

  const fileName = `${getReportName(reportData.type)}-${formatDateForFile(startDate)}-ate-${formatDateForFile(endDate)}.xlsx`;
  XLSX.writeFile(workbook, fileName);
};
