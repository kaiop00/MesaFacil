import { useTranslation } from "react-i18next";

const CancellationsReportTable = ({ cancellations, formatCurrency }) => {
  const { t } = useTranslation("reports");

  return (
    <table className="min-w-full divide-y divide-gray-200">
      <thead className="bg-gray-50">
        <tr>
          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
            {t("tables.cancellations.columns.orderNumber", { defaultValue: "Pedido" })}
          </th>
          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
            {t("tables.cancellations.columns.table", { defaultValue: "Mesa" })}
          </th>
          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
            {t("tables.cancellations.columns.items", { defaultValue: "Pedido cancelado" })}
          </th>
          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
            {t("tables.cancellations.columns.cancellationDate", { defaultValue: "Data do cancelamento" })}
          </th>
          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
            {t("tables.cancellations.columns.reason", { defaultValue: "Motivo" })}
          </th>
          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
            {t("tables.cancellations.columns.value", { defaultValue: "Valor" })}
          </th>
        </tr>
      </thead>
      <tbody className="bg-white divide-y divide-gray-200">
        {cancellations.map((item, index) => (
          <tr key={`${item.pedidoId}-${index}`}>
            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
              {String(item.pedidoId || "-").slice(-8)}
            </td>
            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
              {item.mesa}
            </td>
            <td className="px-6 py-4 text-sm text-gray-900">
              {item.itensCancelados || "-"}
            </td>
            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
              {item.dataCancelamento}
            </td>
            <td className="px-6 py-4 text-sm text-gray-900">
              {item.motivoCancelamento}
            </td>
            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
              {formatCurrency(item.valor || 0)}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};

export default CancellationsReportTable;
