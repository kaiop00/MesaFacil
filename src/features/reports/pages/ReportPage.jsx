import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import CardHeader from "@/components/CardHeader";
import { useAuth } from "@/contexts/AuthContext";
import { useTables } from "@/features/config/hooks/useTables";
import { useReports } from "@/features/reports/hooks/useReports";
import ReportFilter from "../components/ReportFilter";
import ReportTable from "../components/ReportTable";

const ReportPage = () => {
  const { t } = useTranslation('reports');
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
      alert(t('page.waitingTables'));
      return;
    }

    if (!hasValidTables) {
      alert(t('page.noTables'));
      return;
    }

    try {
      await generateReport(reportType, startDate, endDate);
    } catch (error) {
      alert(error.message || t('page.errorGenerate'));
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 mt-24 space-y-12">
      {/* Cabeçalho de Relatórios */}
      <CardHeader
        title={t('page.title')}
        subtitle={t('page.subtitle')}
        showButton={false}
      />

      {/* Status das Mesas */}
      {tablesLoading && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-blue-800 text-sm">
            {t('page.loading')}
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
