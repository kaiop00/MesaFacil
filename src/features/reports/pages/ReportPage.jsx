import { useState } from "react";
import CardHeader from "@/components/CardHeader";
import ReportFilter from "@/features/reports/components/ReportFilter";
import ReportTable from "@/features/reports/components/ReportTable";
import { useAuth } from "@/contexts/AuthContext";
import { useTables } from "@/features/config/hooks/useTables";
import { useReports } from "@/features/reports/hooks/useReports";

const ReportPage = () => {
  const { idRestaurante } = useAuth();
  const { tables, loading: tablesLoading } = useTables(idRestaurante);
  const { reportData, loading, generateReport, hasValidTables } = useReports(
    idRestaurante,
    tables,
  );

  const [reportType, setReportType] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const handleSubmit = async () => {
    if (tablesLoading) {
      alert("Aguarde o carregamento das mesas...");
      return;
    }

    if (!hasValidTables) {
      alert("Nenhuma mesa disponível para gerar relatórios.");
      return;
    }

    try {
      await generateReport(reportType, startDate, endDate);
    } catch (error) {
      alert(error.message || "Erro ao gerar relatório. Tente novamente.");
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 mt-24 space-y-12">
      {/* Cabeçalho de Relatórios */}
      <CardHeader
        title="Relatórios"
        subtitle="Preencha as informações para gerar o relatório"
        showButton={false}
      />

      {/* Status das Mesas */}
      {tablesLoading && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-blue-800 text-sm">
            Carregando mesas... Por favor, aguarde.
          </p>
        </div>
      )}

      <ReportFilter
        reportType={reportType}
        setReportType={setReportType}
        startDate={startDate}
        setStartDate={setStartDate}
        endDate={endDate}
        setEndDate={setEndDate}
        onSubmit={handleSubmit}
        loading={loading || tablesLoading}
        disabled={tablesLoading || !hasValidTables}
      />

      {reportData && (
        <ReportTable
          reportData={reportData}
          startDate={startDate}
          endDate={endDate}
        />
      )}
    </div>
  );
};

export default ReportPage;
