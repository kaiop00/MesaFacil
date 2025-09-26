import { useTranslation } from "react-i18next";

const WaiterReportTable = ({ waiters, formatCurrency }) => {
  const { t } = useTranslation('reports');
  return (
    <table className="min-w-full divide-y divide-gray-200">
      <thead className="bg-gray-50">
        <tr>
          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
            {t('tables.waiter.columns.waiter')}
          </th>
          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
            {t('tables.waiter.columns.ordersAttended')}
          </th>
          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
            {t('tables.waiter.columns.totalValueGenerated')}
          </th>
        </tr>
      </thead>
      <tbody className="bg-white divide-y divide-gray-200">
        {waiters.map((waiter, index) => (
          <tr key={index}>
            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
              {waiter.garcom}
            </td>
            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
              {waiter.numeroPedidos}
            </td>
            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
              {formatCurrency(waiter.valorTotal)}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};

export default WaiterReportTable;