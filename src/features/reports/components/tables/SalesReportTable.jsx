import { useTranslation } from "react-i18next";

const SalesReportTable = ({ orders, formatCurrency }) => {
  const { t } = useTranslation('reports');

  const getPaymentMethodLabel = (method) => {
    if (!method) return t('tables.sales.noPaymentMethod');

    const methodMap = {
      dinheiro: t('tables.sales.paymentMethods.cash'),
      debito: t('tables.sales.paymentMethods.debit'),
      credito: t('tables.sales.paymentMethods.credit'),
      pix: t('tables.sales.paymentMethods.pix'),
      ifood: t('tables.sales.paymentMethods.ifood'),
      voucher: t('tables.sales.paymentMethods.voucher'),
    };

    return methodMap[method] || method;
  };

  const paymentSummary = orders.reduce((accumulator, order) => {
    const method = String(order.formaPagamento || "").toLowerCase();
    const value = Number(order.valor || 0);

    if (!method) return accumulator;

    accumulator[method] = (accumulator[method] || 0) + value;
    accumulator.total = (accumulator.total || 0) + value;

    if (method === "credito" || method === "debito") {
      accumulator.cartao = (accumulator.cartao || 0) + value;
    }

    return accumulator;
  }, {});

  const summaryItems = [
    ["dinheiro", paymentSummary.dinheiro],
    ["pix", paymentSummary.pix],
    ["credito", paymentSummary.credito],
    ["debito", paymentSummary.debito],
    ["cartao", paymentSummary.cartao],
    ["ifood", paymentSummary.ifood],
    ["voucher", paymentSummary.voucher],
  ].filter(([, value]) => Number(value || 0) > 0);

  return (
    <div className="space-y-6">
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

      {summaryItems.length > 0 && (
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
          <h4 className="mb-3 text-sm font-semibold text-gray-700">
            {t('tables.sales.summaryTitle', { defaultValue: 'Resumo por forma de pagamento' })}
          </h4>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {summaryItems.map(([method, value]) => (
              <div key={method} className="flex items-center justify-between rounded-md bg-white px-3 py-2 shadow-sm">
                <span className="text-sm font-medium text-gray-600">
                  {method === 'cartao'
                    ? t('tables.sales.paymentMethods.card', { defaultValue: 'Cartão' })
                    : getPaymentMethodLabel(method)}
                </span>
                <span className="text-sm font-semibold text-gray-900">
                  {formatCurrency(value)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default SalesReportTable;
