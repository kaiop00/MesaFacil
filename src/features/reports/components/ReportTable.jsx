import {
  SalesReportTable,
  PeriodReportTable,
  ProductReportTable,
  WaiterReportTable
} from "./tables";
import { generatePDF } from "@/utils/pdfGenerator";
import { useState } from "react";
import { Download } from "react-coolicons";
import LoadingSpinnerDynamic from "@/components/LoadingSpinnerDynamic";
import { useToast } from "@/hooks/useToast";

const ReportTable = ({ reportData, startDate, endDate }) => {
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const { notify } = useToast();

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

  const handleExportPDF = async () => {
    try {
      setIsGeneratingPDF(true);
      await generatePDF(reportData, startDate, endDate);
      notify('PDF gerado com sucesso!', 'success');
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      notify('Erro ao gerar PDF. Tente novamente.', 'error');
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  return (
    <div className="bg-white rounded-lg p-6 shadow-md w-full">
      <div className="mb-4 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-semibold text-gray-900 truncate">
            {getReportTitle()}
          </h3>
          <p className="text-sm text-gray-500 truncate">
            Período: {new Date(startDate + "T00:00:00").toLocaleDateString('pt-BR')} até {new Date(endDate + "T23:59:59").toLocaleDateString('pt-BR')}
          </p>
        </div>
        {hasData() && (
          <div className="flex justify-end sm:justify-start">
            <button
              onClick={handleExportPDF}
              disabled={isGeneratingPDF}
              className="inline-flex items-center px-3 py-2 sm:px-4 sm:py-2 bg-primary-dynamic text-white font-medium rounded-md cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base whitespace-nowrap"
            >
              {isGeneratingPDF ? (
                <>
                  <span className="hidden sm:inline">Gerando PDF...</span>
                  <span className="sm:hidden">Gerando...</span>
                  <div className="ml-2">
                    <LoadingSpinnerDynamic size={4} />
                  </div>
                </>
              ) : (
                <>
                  <span className="hidden sm:inline">Exportar PDF</span>
                  <span className="sm:hidden">PDF</span>
                  <Download className="ml-1 sm:ml-2 h-4 w-4 sm:h-5 sm:w-5" />
                </>
              )}
            </button>
          </div>
        )}
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
