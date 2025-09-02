import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import logo from '../assets/mesafacil.png';

export const generatePDF = async (reportData, startDate, endDate) => {
  const doc = new jsPDF();

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
  doc.text(getReportTitle(reportData.type), 70, 20);

  // Subtitle with period
  doc.setFontSize(12);
  doc.setTextColor(100, 100, 100);
  const periodText = `Período: ${formatDateBR(startDate)} até ${formatDateBR(endDate)}`;
  doc.text(periodText, 70, 28);

  // Add generation date
  doc.setFontSize(10);
  doc.text(`Gerado em: ${new Date().toLocaleString('pt-BR')}`, 15, 40);

  // Add separator line
  doc.setDrawColor(...primaryColor);
  doc.setLineWidth(0.5);
  doc.line(15, 45, 195, 45);

  let startY = 55;

  // Generate table based on report type
  switch (reportData.type) {
    case 'vendas':
      generateSalesTable(doc, reportData.orders, startY);
      break;
    case 'periodo':
      generatePeriodTable(doc, reportData.data, startY);
      break;
    case 'produto':
      generateProductTable(doc, reportData.products, startY);
      break;
    case 'garcom':
      generateWaiterTable(doc, reportData.waiters, startY);
      break;
  }

  // Add footer
  addFooter(doc);

  // Generate filename
  const reportTypeName = getReportTitle(reportData.type).replace(/\s+/g, '_');
  const filename = `${reportTypeName}_${formatDateFile(startDate)}_${formatDateFile(endDate)}.pdf`;

  doc.save(filename);
};

const getReportTitle = (type) => {
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

const generateSalesTable = (doc, orders, startY) => {
  const tableColumns = ['Nº Pedido', 'Mesa', 'Data', 'Valor', 'Status'];
  const tableRows = orders.map(order => [
    order.numero.slice(-8),
    `Mesa ${order.mesa}`,
    order.data,
    formatCurrency(order.valor),
    order.status
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
  doc.text(`Total de Pedidos: ${orders.length}`, 15, finalY);
  doc.text(`Valor Total: ${formatCurrency(totalValue)}`, 15, finalY + 8);
};

const generatePeriodTable = (doc, data, startY) => {
  const tableColumns = ['Data', 'Total de Pedidos', 'Valor Total'];
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
  doc.text(`Total de Pedidos no Período: ${totalOrders}`, 15, finalY);
  doc.text(`Valor Total do Período: ${formatCurrency(totalValue)}`, 15, finalY + 8);
};

const generateProductTable = (doc, products, startY) => {
  const tableColumns = ['Produto', 'Quantidade Vendida', 'Valor Total'];
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
  doc.text(`Total de Produtos Vendidos: ${totalQuantity}`, 15, finalY);
  doc.text(`Valor Total em Produtos: ${formatCurrency(totalValue)}`, 15, finalY + 8);
};

const generateWaiterTable = (doc, waiters, startY) => {
  const tableColumns = ['Garçom', 'Nº de Pedidos Atendidos', 'Valor Total Gerado'];
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
  doc.text(`Total de Pedidos Atendidos: ${totalOrders}`, 15, finalY);
  doc.text(`Valor Total Gerado pelos Garçons: ${formatCurrency(totalValue)}`, 15, finalY + 8);
};

const addFooter = (doc) => {
  const pageHeight = doc.internal.pageSize.height;

  doc.setFontSize(8);
  doc.setTextColor(100, 100, 100);
  doc.text('Gerado por MesaFácil - Sistema de Gestão de Restaurantes', 15, pageHeight - 10);

  // Add page number
  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.text(`Página ${i} de ${pageCount}`, 180, pageHeight - 10);
  }
};
