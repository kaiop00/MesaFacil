import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import logo from '../assets/mesafacil.png';

export const generatePDF = async (reportData, startDate, endDate, t = null) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth
    ? doc.internal.pageSize.getWidth()
    : doc.internal.pageSize.width;
  const centerX = pageWidth / 2;

  // Colors
  const primaryColor = [239, 158, 67]; // Orange color from logo
  const secondaryColor = [51, 51, 51]; // Dark gray

  // Add logo with better error handling
  try {
    doc.addImage(logo, 'PNG', 15, 15, 50, 10);
  } catch (error) {
    console.warn('Could not load logo for PDF:', error);
    // Continue without logo if it fails to load
  }

  // Title
  doc.setFontSize(20);
  doc.setTextColor(...secondaryColor);
  doc.text(getReportTitle(reportData.type, t), centerX, 20, { align: 'center' });

  // Subtitle with period
  doc.setFontSize(12);
  doc.setTextColor(100, 100, 100);
  const periodText = t 
    ? `${t('table.period')}: ${formatDateBR(startDate)} ${t('table.from')} ${formatDateBR(endDate)}`
    : `Período: ${formatDateBR(startDate)} até ${formatDateBR(endDate)}`;
  doc.text(periodText, centerX, 28, { align: 'center' });

  // Add generation date
  doc.setFontSize(10);
  const generatedText = t 
    ? `${t('pdf.generatedAt')}: ${new Date().toLocaleString('pt-BR')}`
    : `Gerado em: ${new Date().toLocaleString('pt-BR')}`;
  doc.text(generatedText, centerX, 40, { align: 'center' });

  // Add separator line
  doc.setDrawColor(...primaryColor);
  doc.setLineWidth(0.5);
  doc.line(15, 45, 195, 45);

  let startY = 55;

  // Generate table based on report type
  switch (reportData.type) {
    case 'vendas':
      generateSalesTable(doc, reportData.orders, startY, t);
      break;
    case 'periodo':
      generatePeriodTable(doc, reportData.data, startY, t);
      break;
    case 'produto':
      generateProductTable(doc, reportData.products, startY, t);
      break;
    case 'garcom':
      generateWaiterTable(doc, reportData.waiters, startY, t);
      break;
  }

  // Add footer
  addFooter(doc, t);

  // Generate filename
  const reportTypeName = getReportTitle(reportData.type).replace(/\s+/g, '_');
  const filename = `${reportTypeName}_${formatDateFile(startDate)}_${formatDateFile(endDate)}.pdf`;

  doc.save(filename);
};

const getReportTitle = (type, t = null) => {
  if (!t) {
    // Fallback to Portuguese if no translation function provided
    switch (type) {
      case "vendas":
        return "Relatório de Vendas";
      case "periodo":
        return "Relatório por Período";
      case "produto":
        return "Relatório por Produto";
      case "garcom":
        return "Relatório por Garçom";
      default:
        return "Relatório";
    }
  }

  switch (type) {
    case "vendas":
      return t('table.titles.sales');
    case "periodo":
      return t('table.titles.period');
    case "produto":
      return t('table.titles.product');
    case "garcom":
      return t('table.titles.waiter');
    default:
      return t('table.titles.sales');
  }
};

const formatCurrency = (value) => {
  return `R$ ${value.toFixed(2).replace(".", ",")}`;
};

const formatDateBR = (dateString) => {
  return new Date(dateString).toLocaleDateString('pt-BR');
};

const formatDateFile = (dateString) => {
  return new Date(dateString).toISOString().split('T')[0];
};

const checkPageSpace = (doc, currentY, requiredSpace = 30) => {
  const pageHeight = doc.internal.pageSize.height;
  const footerSpace = 25; // Reserve space for footer
  const availableSpace = pageHeight - footerSpace - currentY;
  
  if (availableSpace < requiredSpace) {
    doc.addPage();
    return 20; // Return new starting Y position on new page
  }
  
  return currentY;
};

const getPaymentMethodLabel = (method, t = null) => {
  if (!method) return t ? t('tables.sales.noPaymentMethod') : 'Não informado';
  
  const methodMapPt = {
    'dinheiro': 'Dinheiro',
    'debito': 'Débito',
    'credito': 'Crédito',
    'pix': 'PIX',
    'ifood': 'iFood',
    'voucher': 'Voucher/Cortesia'
  };
  
  if (!t) {
    return methodMapPt[method] || method;
  }
  
  const methodMap = {
    'dinheiro': t('tables.sales.paymentMethods.cash'),
    'debito': t('tables.sales.paymentMethods.debit'),
    'credito': t('tables.sales.paymentMethods.credit'),
    'pix': t('tables.sales.paymentMethods.pix'),
    'ifood': t('tables.sales.paymentMethods.ifood'),
    'voucher': t('tables.sales.paymentMethods.voucher')
  };
  
  return methodMap[method] || method;
};

const generateSalesTable = (doc, orders, startY, t = null) => {
  const tableColumns = t ? [
    t('tables.sales.columns.orderNumber'),
    t('tables.sales.columns.table'),
    t('tables.sales.columns.date'),
    t('tables.sales.columns.value'),
    t('tables.sales.columns.paymentMethod')
  ] : ['Nº Pedido', 'Mesa', 'Data', 'Valor', 'Método de Pagamento'];

  const tablePrefix = t ? t('tables.sales.tablePrefix') : 'Mesa';

  const tableRows = orders.map(order => [
    order.numero.slice(-8),
    `${tablePrefix} ${order.mesa}`,
    order.data,
    formatCurrency(order.valor),
    getPaymentMethodLabel(order.formaPagamento, t)
  ]);

  autoTable(doc, {
    head: [tableColumns],
    body: tableRows,
    startY: startY,
    theme: 'grid',
    headStyles: {
      fillColor: [239, 158, 67],
      textColor: [255, 255, 255],
      fontSize: 10,
      fontStyle: 'bold',
      halign: 'center'
    },
    bodyStyles: {
      fontSize: 9,
      textColor: [51, 51, 51],
      halign: 'left'
    },
    alternateRowStyles: {
      fillColor: [245, 245, 245]
    },
    margin: { left: 15, right: 15 },
    tableWidth: 'auto'
  });

  // Add summary
  const totalValue = orders.reduce((sum, order) => sum + order.valor, 0);
  let finalY = doc.lastAutoTable.finalY + 10;

  // Check if we have enough space for summary (2 lines + margin)
  finalY = checkPageSpace(doc, finalY, 20);

  doc.setFontSize(12);
  doc.setTextColor(51, 51, 51);
  const totalOrdersText = t ? t('pdf.summary.totalOrders') : 'Total de Pedidos';
  const totalValueText = t ? t('pdf.summary.totalValue') : 'Valor Total';
  doc.text(`${totalOrdersText}: ${orders.length}`, 15, finalY);
  doc.text(`${totalValueText}: ${formatCurrency(totalValue)}`, 15, finalY + 8);
};

const generatePeriodTable = (doc, data, startY, t = null) => {
  const tableColumns = t ? [
    t('tables.period.columns.date'),
    t('tables.period.columns.totalOrders'),
    t('tables.period.columns.totalValue')
  ] : ['Data', 'Total de Pedidos', 'Valor Total'];

  const tableRows = data.map(day => [
    day.data,
    day.totalPedidos.toString(),
    formatCurrency(day.valorTotal)
  ]);

  autoTable(doc, {
    head: [tableColumns],
    body: tableRows,
    startY: startY,
    theme: 'grid',
    headStyles: {
      fillColor: [239, 158, 67],
      textColor: [255, 255, 255],
      fontSize: 10,
      fontStyle: 'bold',
      halign: 'center'
    },
    bodyStyles: {
      fontSize: 9,
      textColor: [51, 51, 51],
      halign: 'left'
    },
    alternateRowStyles: {
      fillColor: [245, 245, 245]
    },
    margin: { left: 15, right: 15 },
    tableWidth: 'auto'
  });

  // Add summary
  const totalOrders = data.reduce((sum, day) => sum + day.totalPedidos, 0);
  const totalValue = data.reduce((sum, day) => sum + day.valorTotal, 0);
  let finalY = doc.lastAutoTable.finalY + 10;

  // Check if we have enough space for summary (2 lines + margin)
  finalY = checkPageSpace(doc, finalY, 20);

  doc.setFontSize(12);
  doc.setTextColor(51, 51, 51);
  const totalOrdersPeriodText = t ? t('pdf.summary.totalOrdersPeriod') : 'Total de Pedidos no Período';
  const totalValuePeriodText = t ? t('pdf.summary.totalValuePeriod') : 'Valor Total do Período';
  doc.text(`${totalOrdersPeriodText}: ${totalOrders}`, 15, finalY);
  doc.text(`${totalValuePeriodText}: ${formatCurrency(totalValue)}`, 15, finalY + 8);
};

const generateProductTable = (doc, products, startY, t = null) => {
  const tableColumns = t ? [
    t('tables.product.columns.product'),
    t('tables.product.columns.quantitySold'),
    t('tables.product.columns.totalValue')
  ] : ['Produto', 'Quantidade Vendida', 'Valor Total'];

  const tableRows = products.map(product => [
    product.produto,
    product.quantidadeVendida.toString(),
    formatCurrency(product.valorTotal)
  ]);

  autoTable(doc, {
    head: [tableColumns],
    body: tableRows,
    startY: startY,
    theme: 'grid',
    headStyles: {
      fillColor: [239, 158, 67],
      textColor: [255, 255, 255],
      fontSize: 10,
      fontStyle: 'bold',
      halign: 'center'
    },
    bodyStyles: {
      fontSize: 9,
      textColor: [51, 51, 51],
      halign: 'left'
    },
    alternateRowStyles: {
      fillColor: [245, 245, 245]
    },
    margin: { left: 15, right: 15 },
    tableWidth: 'auto'
  });

  // Add summary
  const totalQuantity = products.reduce((sum, product) => sum + product.quantidadeVendida, 0);
  const totalValue = products.reduce((sum, product) => sum + product.valorTotal, 0);
  let finalY = doc.lastAutoTable.finalY + 10;

  // Check if we have enough space for summary (2 lines + margin)
  finalY = checkPageSpace(doc, finalY, 20);

  doc.setFontSize(12);
  doc.setTextColor(51, 51, 51);
  const totalProductsSoldText = t ? t('pdf.summary.totalProductsSold') : 'Total de Produtos Vendidos';
  const totalValueProductsText = t ? t('pdf.summary.totalValueProducts') : 'Valor Total em Produtos';
  doc.text(`${totalProductsSoldText}: ${totalQuantity}`, 15, finalY);
  doc.text(`${totalValueProductsText}: ${formatCurrency(totalValue)}`, 15, finalY + 8);
};

const generateWaiterTable = (doc, waiters, startY, t = null) => {
  const tableColumns = t ? [
    t('tables.waiter.columns.waiter'),
    t('tables.waiter.columns.ordersAttended'),
    t('tables.waiter.columns.totalValueGenerated')
  ] : ['Garçom', 'Nº de Pedidos Atendidos', 'Valor Total Gerado'];

  const tableRows = waiters.map(waiter => [
    waiter.garcom,
    waiter.numeroPedidos.toString(),
    formatCurrency(waiter.valorTotal)
  ]);

  autoTable(doc, {
    head: [tableColumns],
    body: tableRows,
    startY: startY,
    theme: 'grid',
    headStyles: {
      fillColor: [239, 158, 67],
      textColor: [255, 255, 255],
      fontSize: 10,
      fontStyle: 'bold',
      halign: 'center'
    },
    bodyStyles: {
      fontSize: 9,
      textColor: [51, 51, 51],
      halign: 'left'
    },
    alternateRowStyles: {
      fillColor: [245, 245, 245]
    },
    margin: { left: 15, right: 15 },
    tableWidth: 'auto'
  });

  // Add summary
  const totalOrders = waiters.reduce((sum, waiter) => sum + waiter.numeroPedidos, 0);
  const totalValue = waiters.reduce((sum, waiter) => sum + waiter.valorTotal, 0);
  let finalY = doc.lastAutoTable.finalY + 10;

  // Check if we have enough space for summary (2 lines + margin)
  finalY = checkPageSpace(doc, finalY, 20);

  doc.setFontSize(12);
  doc.setTextColor(51, 51, 51);
  const totalOrdersAttendedText = t ? t('pdf.summary.totalOrdersAttended') : 'Total de Pedidos Atendidos';
  const totalValueWaitersText = t ? t('pdf.summary.totalValueWaiters') : 'Valor Total Gerado pelos Garçons';
  doc.text(`${totalOrdersAttendedText}: ${totalOrders}`, 15, finalY);
  doc.text(`${totalValueWaitersText}: ${formatCurrency(totalValue)}`, 15, finalY + 8);
};

const addFooter = (doc, t = null) => {
  const pageHeight = doc.internal.pageSize.height;

  doc.setFontSize(8);
  doc.setTextColor(100, 100, 100);
  const generatedByText = t ? t('pdf.generatedBy') : 'Gerado por MesaFácil - Sistema de Gestão de Restaurantes';
  doc.text(generatedByText, 15, pageHeight - 10);

  // Add page number
  const pageCount = doc.internal.getNumberOfPages();
  const pageText = t ? t('pdf.page') : 'Página';
  const ofText = t ? t('pdf.of') : 'de';
  
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.text(`${pageText} ${i} ${ofText} ${pageCount}`, 180, pageHeight - 10);
  }
};
