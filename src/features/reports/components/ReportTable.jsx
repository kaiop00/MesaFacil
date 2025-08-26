import {
  SalesReportTable,
  PeriodReportTable,
  ProductReportTable,
  WaiterReportTable
} from "./tables";

const ReportTable = ({ reportData, startDate, endDate }) => {
  const formatCurrency = (value) => {
    return `R$ ${value.toFixed(2).replace(".", ",")}`;
  };

  const getReportTitle = () => {
    switch (reportData.type) {
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

  const hasData = () => {
    switch (reportData.type) {
      case "vendas":
        return reportData.orders && reportData.orders.length > 0;
      case "periodo":
        return reportData.data && reportData.data.length > 0;
      case "produto":
        return reportData.products && reportData.products.length > 0;
      case "garcom":
        return reportData.waiters && reportData.waiters.length > 0;
      default:
        return false;
    }
  };

  return (
    <div className="bg-white rounded-lg p-6 shadow-md w-full">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-900">
          {getReportTitle()}
        </h3>
        <p className="text-sm text-gray-500">
          Período: {new Date(startDate).toLocaleDateString('pt-BR')} até {new Date(endDate).toLocaleDateString('pt-BR')}
        </p>
      </div>

      <div className="overflow-x-auto">
        {reportData.type === "vendas" && (
          <SalesReportTable 
            orders={reportData.orders} 
            formatCurrency={formatCurrency} 
          />
        )}

        {reportData.type === "periodo" && (
          <PeriodReportTable 
            data={reportData.data} 
            formatCurrency={formatCurrency} 
          />
        )}

        {reportData.type === "produto" && (
          <ProductReportTable 
            products={reportData.products} 
            formatCurrency={formatCurrency} 
          />
        )}

        {reportData.type === "garcom" && (
          <WaiterReportTable 
            waiters={reportData.waiters} 
            formatCurrency={formatCurrency} 
          />
        )}
      </div>

      {!hasData() && (
        <div className="text-center py-8 text-gray-500">
          Nenhum dado encontrado para o período selecionado
        </div>
      )}
    </div>
  );
};

export default ReportTable;