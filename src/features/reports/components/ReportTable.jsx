import {
  SalesReportTable,
  PeriodReportTable,
  ProductReportTable,
  WaiterReportTable,
  CancellationsReportTable,
  TipsReportTable
} from "./tables";
import { generatePDF } from "@/utils/pdfGenerator";
import { useState } from "react";
import { Download } from "react-coolicons";
import { useTranslation } from "react-i18next";
import LoadingSpinnerDynamic from "@/components/LoadingSpinnerDynamic";
import { useToast } from "@/hooks/useToast";
import { exportReportToExcel } from "@/utils/reportExport";

const ReportTable = ({ reportData, startDate, endDate }) => {
  const { t } = useTranslation('reports');
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const { notify } = useToast();

  const formatCurrency = (value) => {
    return `R$ ${value.toFixed(2).replace(".", ",")}`;
  };

  const getReportTitle = () => {
    switch (reportData.type) {
      case "vendas":
        return t('table.titles.sales');
      case "periodo":
        return t('table.titles.period');
      case "produto":
        return t('table.titles.product');
      case "garcom":
        return t('table.titles.waiter');
      case "cancelamentos":
        return t('table.titles.cancellations', { defaultValue: 'Cancelamentos' });
      case "gorjetas":
        return t('table.titles.tips', { defaultValue: 'Gorjetas' });
      default:
        return t('table.titles.sales');
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
      case "cancelamentos":
        return reportData.cancellations && reportData.cancellations.length > 0;
      case "gorjetas":
        return reportData.tips && reportData.tips.length > 0;
      default:
        return false;
    }
  };

  const handleExportPDF = async () => {
    try {
      setIsGeneratingPDF(true);
      await generatePDF(reportData, startDate, endDate, t);
      notify(t('table.pdfSuccess'), 'success');
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      notify(t('table.pdfError'), 'error');
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  const handleExportExcel = () => {
    try {
      exportReportToExcel({ reportData, startDate, endDate });
      notify(t('table.xlsxSuccess', { defaultValue: 'Excel gerado com sucesso' }), 'success');
    } catch (error) {
      console.error('Erro ao gerar Excel:', error);
      notify(t('table.xlsxError', { defaultValue: 'Erro ao gerar Excel' }), 'error');
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
            {t('table.period')}: {new Date(startDate + "T00:00:00").toLocaleDateString('pt-BR')} {t('table.from')} {new Date(endDate + "T23:59:59").toLocaleDateString('pt-BR')}
          </p>
        </div>
        {hasData() && (
          <div className="flex flex-wrap justify-end gap-2 sm:justify-start">
            <button
              onClick={handleExportPDF}
              disabled={isGeneratingPDF}
              className="inline-flex items-center px-3 py-2 sm:px-4 sm:py-2 bg-primary-dynamic text-white font-medium rounded-md cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base whitespace-nowrap"
            >
              {isGeneratingPDF ? (
                <>
                  <span className="hidden sm:inline">{t('table.generatingPDF')}</span>
                  <span className="sm:hidden">{t('table.generatingPDFShort')}</span>
                  <div className="ml-2">
                    <LoadingSpinnerDynamic size={4} />
                  </div>
                </>
              ) : (
                <>
                  <span className="hidden sm:inline">{t('table.exportPDF')}</span>
                  <span className="sm:hidden">{t('table.exportPDFShort')}</span>
                  <Download className="ml-1 sm:ml-2 h-4 w-4 sm:h-5 sm:w-5" />
                </>
              )}
            </button>
            <button
              onClick={handleExportExcel}
              className="inline-flex items-center px-3 py-2 sm:px-4 sm:py-2 bg-emerald-600 text-white font-medium rounded-md cursor-pointer hover:bg-emerald-700 text-sm sm:text-base whitespace-nowrap"
            >
              <span className="hidden sm:inline">Excel</span>
              <span className="sm:hidden">XLSX</span>
              <Download className="ml-1 sm:ml-2 h-4 w-4 sm:h-5 sm:w-5" />
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

        {reportData.type === "cancelamentos" && (
          <CancellationsReportTable
            cancellations={reportData.cancellations}
            formatCurrency={formatCurrency}
          />
        )}

        {reportData.type === "gorjetas" && (
          <TipsReportTable
            tips={reportData.tips}
            formatCurrency={formatCurrency}
          />
        )}
      </div>

      {!hasData() && (
        <div className="text-center py-8 text-gray-500">
          {t('table.noData')}
        </div>
      )}
    </div>
  );
};

export default ReportTable;
