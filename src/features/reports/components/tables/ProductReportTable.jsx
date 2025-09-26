import { useTranslation } from "react-i18next";

const ProductReportTable = ({ products, formatCurrency }) => {
  const { t } = useTranslation('reports');
  return (
    <table className="min-w-full divide-y divide-gray-200">
      <thead className="bg-gray-50">
        <tr>
          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
            {t('tables.product.columns.product')}
          </th>
          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
            {t('tables.product.columns.quantitySold')}
          </th>
          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
            {t('tables.product.columns.totalValue')}
          </th>
        </tr>
      </thead>
      <tbody className="bg-white divide-y divide-gray-200">
        {products.map((product, index) => (
          <tr key={index}>
            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
              {product.produto}
            </td>
            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
              {product.quantidadeVendida}
            </td>
            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
              {formatCurrency(product.valorTotal)}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};

export default ProductReportTable;