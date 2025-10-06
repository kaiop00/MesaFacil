import { useTranslation } from "react-i18next";

const SalesReportTable = ({ orders, formatCurrency }) => {
  const { t } = useTranslation('reports');

  const getStatusText = (status) => {
    return status === 'Finalizado' ? t('status.finished') : t('status.pending');
  };
  return (
    <table className="min-w-full divide-y divide-gray-200">
      <thead className="bg-gray-50">
        <tr>
          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
            {t('tables.sales.columns.orderNumber')}
          </th>
          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
            {t('tables.sales.columns.table')}
          </th>
          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
            {t('tables.sales.columns.date')}
          </th>
          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
            {t('tables.sales.columns.value')}
          </th>
          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
            {t('tables.sales.columns.status')}
          </th>
        </tr>
      </thead>
      <tbody className="bg-white divide-y divide-gray-200">
        {orders.map((order, index) => (
          <tr key={index}>
            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
              {order.numero.slice(-8)}
            </td>
            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
              {t('tables.sales.tablePrefix')} {order.mesa}
            </td>
            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
              {order.data}
            </td>
            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
              {formatCurrency(order.valor)}
            </td>
            <td className="px-6 py-4 whitespace-nowrap">
              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                order.status === 'Finalizado' 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-yellow-100 text-yellow-800'
              }`}>
                {getStatusText(order.status)}
              </span>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};

export default SalesReportTable;