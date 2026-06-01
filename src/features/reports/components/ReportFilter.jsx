import { Printer, Lock } from "react-coolicons";
import { useTranslation } from "react-i18next";
import LoadingSpinnerDynamic from "@/components/LoadingSpinnerDynamic";
import { usePlan } from "@/contexts/PlanContext";
import { PLAN_NAMES } from "@/constants/planFeatures";
import { useState } from "react";
import UpgradePrompt from "@/components/UpgradePrompt";

const ReportFilter = ({
  reportType,
  setReportType,
  startDate,
  setStartDate,
  endDate,
  setEndDate,
  onSubmit,
  loading,
  disabled = false
}) => {
  const { t } = useTranslation('reports');
  const { canGenerateReport } = usePlan();
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [selectedLockedFeature, setSelectedLockedFeature] = useState(null);

  // Define report types with their required features
  const reportTypes = [
    { value: 'vendas', label: t('filter.types.sales'), feature: 'daily_reports', plan: 'free' },
    { value: 'periodo', label: t('filter.types.period'), feature: 'monthly_reports', plan: 'monthly' },
    { value: 'produto', label: t('filter.types.product'), feature: 'monthly_reports', plan: 'monthly' },
    { value: 'cancelamentos', label: t('filter.types.cancellations', { defaultValue: 'Relatório de Cancelamentos' }), feature: 'monthly_reports', plan: 'monthly' },
    { value: 'gorjetas', label: t('filter.types.tips', { defaultValue: 'Gorjetas' }), feature: 'monthly_reports', plan: 'monthly' },
  ];

  const handleReportTypeChange = (e) => {
    const value = e.target.value;
    const selectedReport = reportTypes.find(r => r.value === value);
    
    if (selectedReport && !canGenerateReport(selectedReport.feature)) {
      setSelectedLockedFeature(selectedReport.feature);
      setShowUpgradeModal(true);
      return;
    }
    
    setReportType(value);
  };

  return (
    <div className="bg-white rounded-lg p-6 shadow-md w-full">
      <div className="space-y-6">
        {/* Tipo de Relatório */}
        <div>
          <label
            htmlFor="reportType"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            {t('filter.reportType')}
          </label>
          <div className="relative">
            <select
              id="reportType"
              value={reportType}
              onChange={handleReportTypeChange}
              disabled={disabled}
              className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <option value="" disabled>
                {t('filter.selectReport')}
              </option>
              {reportTypes.map((report) => {
                const canAccess = canGenerateReport(report.feature);
                return (
                  <option 
                    key={report.value}
                    value={report.value}
                    disabled={!canAccess}
                  >
                    {report.label} {!canAccess ? `🔒 (${PLAN_NAMES[report.plan]})` : ''}
                  </option>
                );
              })}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
          </div>
        </div>

        {/* Data Fields Container */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Data Início */}
          <div>
            <label
              htmlFor="startDate"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              {t('filter.startDate')}
            </label>
            <div className="relative">
              <input
                type="date"
                id="startDate"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                disabled={disabled}
                className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                style={{
                  colorScheme: "light",
                }}
              />
            </div>
          </div>

          {/* Data Fim */}
          <div>
            <label
              htmlFor="endDate"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              {t('filter.endDate')}
            </label>
            <div className="relative">
              <input
                type="date"
                id="endDate"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                disabled={disabled}
                className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                style={{
                  colorScheme: "light",
                }}
              />
            </div>
          </div>
        </div>

        {/* Submit Button aligned to the right */}
        <div className="flex justify-end">
          <button
            onClick={onSubmit}
            disabled={loading || disabled}
            className="inline-flex items-center px-4 py-2 bg-primary-dynamic text-white font-medium rounded-md cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                {t('filter.generating')}
                <div className="ml-2">
                  <LoadingSpinnerDynamic size={4} />
                </div>
              </>
            ) : (
              <>
                {t('filter.generateButton')}
                <Printer className="ml-2 h-5 w-5" />
              </>
            )}
          </button>
        </div>
      </div>

      {/* Upgrade Prompt Modal */}
      {showUpgradeModal && (
        <UpgradePrompt
          isOpen={showUpgradeModal}
          onClose={() => setShowUpgradeModal(false)}
          requiredFeature={selectedLockedFeature}
        />
      )}
    </div>
  );
};

export default ReportFilter;
