import { useTranslation } from "react-i18next";

const TipsReportTable = ({ tips, formatCurrency }) => {
  const { t } = useTranslation("reports");

  return (
    <table className="min-w-full divide-y divide-gray-200">
      <thead className="bg-gray-50">
        <tr>
          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
            {t("tables.tips.columns.orderNumber", { defaultValue: "Pedido" })}
          </th>
          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
            {t("tables.tips.columns.table", { defaultValue: "Mesa" })}
          </th>
          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
            {t("tables.tips.columns.orderValue", { defaultValue: "Valor Pedido" })}
          </th>
          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
            {t("tables.tips.columns.tipValue", { defaultValue: "Gorjeta" })}
          </th>
          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
            {t("tables.tips.columns.paymentMethod", { defaultValue: "Forma de Pagamento" })}
          </th>
          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
            {t("tables.tips.columns.finishDate", { defaultValue: "Data de Finalização" })}
          </th>
        </tr>
      </thead>
      <tbody className="bg-white divide-y divide-gray-200">
        {tips.map((item, index) => (
          <tr key={`${item.pedidoId}-${index}`}>
            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
              {String(item.pedidoId || "-").slice(-8)}
            </td>
            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
              {item.mesa}
            </td>
            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
              {formatCurrency(item.valorPedido || 0)}
            </td>
            <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-emerald-700">
              {formatCurrency(item.gorjeta || 0)}
            </td>
            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
              {item.formaPagamento}
            </td>
            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
              {item.dataFinalizacao}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};

export default TipsReportTable;
