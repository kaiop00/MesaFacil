import { useTranslation } from "react-i18next";
import { MoveVertical, Check, CircleWarning, Clock } from "react-coolicons";

const NfceTable = ({ nfces = [], loading = false, onViewDetails }) => {
  const { t } = useTranslation("fiscal");

  const getStatusBadge = (status) => {
    switch (status) {
      case "autorizado":
        return (
          <div className="flex items-center gap-1 px-2 py-1 bg-emerald-100 text-emerald-800 rounded-full text-xs font-medium">
            <Check size={14} />
            <span>{t("nfceList.table.status.authorized") || "Autorizado"}</span>
          </div>
        );
      case "rejeitado":
        return (
          <div className="flex items-center gap-1 px-2 py-1 bg-red-100 text-red-800 rounded-full text-xs font-medium">
            <CircleWarning size={14} />
            <span>{t("nfceList.table.status.rejected") || "Rejeitado"}</span>
          </div>
        );
      case "pendente":
      case "processando":
        return (
          <div className="flex items-center gap-1 px-2 py-1 bg-amber-100 text-amber-800 rounded-full text-xs font-medium">
            <Clock size={14} />
            <span>{t("nfceList.table.status.pending") || "Pendente"}</span>
          </div>
        );
      case "cancelado":
      case "cancelada":
        return (
          <div className="flex items-center gap-1 px-2 py-1 bg-slate-100 text-slate-700 rounded-full text-xs font-medium">
            <CircleWarning size={14} />
            <span>{t("nfceList.table.status.canceled") || "Cancelado"}</span>
          </div>
        );
      default:
        return (
          <div className="flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-800 rounded-full text-xs font-medium">
            <span>{status}</span>
          </div>
        );
    }
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value || 0);
  };

  const formatDate = (dateString) => {
    if (!dateString) return "-";
    try {
      const date = new Date(dateString);
      return date.toLocaleString("pt-BR");
    } catch {
      return dateString;
    }
  };

  if (loading) {
    return (
      <div className="text-center py-8 text-gray-500">
        {t("page.loading")}
      </div>
    );
  }

  if (!nfces || nfces.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        {t("nfceList.table.noData") || "Nenhuma NFC-e encontrada"}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              {t("nfceList.table.columns.id") || "ID"}
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              {t("nfceList.table.columns.numero") || "Número"}
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              {t("nfceList.table.columns.chave") || "Chave de Acesso"}
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              {t("nfceList.table.columns.valor") || "Valor"}
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              {t("nfceList.table.columns.data") || "Data"}
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              {t("nfceList.table.columns.status") || "Status"}
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              {t("nfceList.table.columns.acoes") || "Ações"}
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {nfces.map((nfce, index) => (
            <tr key={nfce.id || index} className="hover:bg-gray-50">
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                {nfce.id?.slice(-8) || "-"}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                {nfce.numero || "-"}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 font-mono">
                {nfce.chave ? nfce.chave.slice(-8) : "-"}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                {formatCurrency(nfce.valor || nfce.vNF || 0)}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                {formatDate(nfce.criado_em || nfce.data)}
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                {getStatusBadge(nfce.status)}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm">
                {onViewDetails && (
                  <button
                    onClick={() => onViewDetails(nfce)}
                    className="inline-flex items-center gap-2 px-3 py-1 text-primary-dynamic hover:bg-primary-dynamic/10 rounded transition-colors cursor-pointer"
                    title={t("nfceList.table.viewDetails") || "Ver detalhes"}
                  >
                    <MoveVertical size={16} />
                    <span className="text-xs">{t("nfceList.actions.view") || "Ver"}</span>
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default NfceTable;
