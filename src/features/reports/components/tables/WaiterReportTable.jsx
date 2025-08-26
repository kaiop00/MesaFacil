const WaiterReportTable = ({ waiters, formatCurrency }) => {
  return (
    <table className="min-w-full divide-y divide-gray-200">
      <thead className="bg-gray-50">
        <tr>
          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
            Garçom
          </th>
          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
            Nº de Pedidos Atendidos
          </th>
          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
            Valor Total Gerado
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