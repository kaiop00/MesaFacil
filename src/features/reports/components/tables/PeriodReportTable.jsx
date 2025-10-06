import { useTranslation } from "react-i18next";

const PeriodReportTable = ({ data, formatCurrency }) => {
  const { t } = useTranslation('reports');
  return (
    <table className="min-w-full divide-y divide-gray-200">
      <thead className="bg-gray-50">
        <tr>
          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
            {t('tables.period.columns.date')}
          </th>
          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
            {t('tables.period.columns.totalOrders')}
          </th>
          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
            {t('tables.period.columns.totalValue')}
          </th>
        </tr>
      </thead>
      <tbody className="bg-white divide-y divide-gray-200">
        {data.map((day, index) => (
          <tr key={index}>
            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
              {day.data}
            </td>
            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
              {day.totalPedidos}
            </td>
            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
              {formatCurrency(day.valorTotal)}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};

export default PeriodReportTable;