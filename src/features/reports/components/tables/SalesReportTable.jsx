import { useTranslation } from "react-i18next";

const SalesReportTable = ({ orders, formatCurrency }) => {
  const { t } = useTranslation('reports');
  
  const getPaymentMethodLabel = (method) => {
    if (!method) return t('tables.sales.noPaymentMethod');
    
    const methodMap = {
      'dinheiro': t('tables.sales.paymentMethods.cash'),
      'debito': t('tables.sales.paymentMethods.debit'),
      'credito': t('tables.sales.paymentMethods.credit'),
      'pix': t('tables.sales.paymentMethods.pix'),
      'ifood': t('tables.sales.paymentMethods.ifood'),
      'voucher': t('tables.sales.paymentMethods.voucher')
    };
    
    return methodMap[method] || method;
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
            {t('tables.sales.columns.paymentMethod')}
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
            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
              {getPaymentMethodLabel(order.formaPagamento)}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};

export default SalesReportTable;
