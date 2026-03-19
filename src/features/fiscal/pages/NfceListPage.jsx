import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import { usePermissions } from "@/hooks/usePermissions";
import { useToast } from "@/hooks/useToast";
import CardHeader from "@/components/CardHeader";
import PermissionDeniedPage from "@/components/PermissionDeniedPage";
import NfceTable from "@/features/fiscal/components/NfceTable";
import { listarNfces } from "@/features/fiscal/services/nfceListService";
import { ChevronLeft, ChevronRight } from "react-coolicons";

const ITEMS_PER_PAGE = 50;

const NfceListPage = () => {
  const { t } = useTranslation("fiscal");
  const { idRestaurante } = useAuth();
  const { hasPermission } = usePermissions();
  const { notify } = useToast();

  const [nfces, setNfces] = useState([]);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const [total, setTotal] = useState(0);
  const [selectedNfce, setSelectedNfce] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  // Load NFC-es when component mounts or page changes
  useEffect(() => {
    if (!idRestaurante || !hasPermission("view_fiscal")) return;

    const carregarNfces = async () => {
      setLoading(true);
      try {
        const skip = currentPage * ITEMS_PER_PAGE;
        const result = await listarNfces(idRestaurante, ITEMS_PER_PAGE, skip);

        setNfces(result.nfces || []);
        setTotal(result.total || 0);
      } catch (error) {
        console.error("Erro ao carregar NFC-es:", error);
        notify(t("nfceList.errors.loadFailed") || "Erro ao carregar NFC-es", "error");
      } finally {
        setLoading(false);
      }
    };

    carregarNfces();
  }, [idRestaurante, currentPage]);

  const handleViewDetails = (nfce) => {
    setSelectedNfce(nfce);
    setShowDetailsModal(true);
  };

  const totalPages = Math.ceil(total / ITEMS_PER_PAGE);
  const canGoPrevious = currentPage > 0;
  const canGoNext = currentPage < totalPages - 1;

  if (!hasPermission("view_fiscal")) {
    return (
      <PermissionDeniedPage
        message={t("page.noPermissionMessage") || "Voce nao tem permissao para acessar notas fiscais."}
        description={t("page.contactAdmin") || "Entre em contato com o administrador do sistema."}
      />
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 mt-24 space-y-6">
      {/* Cabeçalho */}
      <CardHeader
        title={t("nfceList.page.title") || "NFC-e Emitidas"}
        subtitle={t("nfceList.page.subtitle") || "Listagem de todas as notas fiscais eletrônicas emitidas"}
        showButton={false}
      />

      {/* Card de Tabela */}
      <div className="bg-white rounded-lg p-6 shadow-md">
        {/* Informações de paginação */}
        <div className="mb-4 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
          <div className="text-sm text-gray-600">
            {total > 0 ? (
              <>
                {t("nfceList.pagination.showing") || "Mostrando"}{" "}
                <span className="font-semibold">
                  {currentPage * ITEMS_PER_PAGE + 1}
                </span>
                {" "}{t("nfceList.pagination.to") || "a"}{" "}
                <span className="font-semibold">
                  {Math.min((currentPage + 1) * ITEMS_PER_PAGE, total)}
                </span>
                {" "}{t("nfceList.pagination.of") || "de"}{" "}
                <span className="font-semibold">{total}</span>
              </>
            ) : (
              <span>{t("nfceList.pagination.noItems") || "Nenhuma NFC-e encontrada"}</span>
            )}
          </div>

          {/* Botões de paginação */}
          {total > ITEMS_PER_PAGE && (
            <div className="flex gap-2">
              <button
                onClick={() => setCurrentPage(currentPage - 1)}
                disabled={!canGoPrevious || loading}
                className="inline-flex items-center gap-2 px-3 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
              >
                <ChevronLeft size={16} />
                <span className="text-sm">{t("nfceList.pagination.previous") || "Anterior"}</span>
              </button>

              <div className="flex items-center px-4 py-2 bg-gray-50 rounded-md text-sm text-gray-600">
                {t("nfceList.pagination.page") || "Página"}{" "}
                <span className="font-semibold ml-1 mr-1">{currentPage + 1}</span>
                {t("nfceList.pagination.of") || "de"} <span className="font-semibold ml-1">{totalPages}</span>
              </div>

              <button
                onClick={() => setCurrentPage(currentPage + 1)}
                disabled={!canGoNext || loading}
                className="inline-flex items-center gap-2 px-3 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
              >
                <span className="text-sm">{t("nfceList.pagination.next") || "Próxima"}</span>
                <ChevronRight size={16} />
              </button>
            </div>
          )}
        </div>

        {/* Tabela */}
        <div className="border border-gray-200 rounded-lg overflow-hidden">
          <NfceTable
            nfces={nfces}
            loading={loading}
            onViewDetails={handleViewDetails}
          />
        </div>
      </div>

      {/* Modal de detalhes (opcional - pode ser expandido depois) */}
      {showDetailsModal && selectedNfce && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-96 overflow-y-auto">
            <div className="p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                {t("nfceList.modal.title") || "Detalhes da NFC-e"}
              </h2>

              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">{t("nfceList.modal.id") || "ID"}:</span>
                  <span className="font-mono">{selectedNfce.id || "-"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">{t("nfceList.modal.numero") || "Número"}:</span>
                  <span className="font-semibold">{selectedNfce.numero || "-"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">{t("nfceList.modal.chave") || "Chave de Acesso"}:</span>
                  <span className="font-mono text-xs break-all">{selectedNfce.chave || "-"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">{t("nfceList.modal.status") || "Status"}:</span>
                  <span className="font-medium">{selectedNfce.status || "-"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">{t("nfceList.modal.valor") || "Valor"} (R$):</span>
                  <span className="font-semibold">{(selectedNfce.valor || selectedNfce.vNF || 0).toFixed(2)}</span>
                </div>
                {selectedNfce.referencia && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">{t("nfceList.modal.referencia") || "Referência do Pedido"}:</span>
                    <span className="font-mono">{selectedNfce.referencia}</span>
                  </div>
                )}
              </div>

              <div className="mt-6">
                <button
                  onClick={() => setShowDetailsModal(false)}
                  className="w-full px-4 py-2 bg-primary-dynamic text-white rounded-lg hover:opacity-90 transition-colors cursor-pointer"
                >
                  {t("nfceList.modal.close") || "Fechar"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default NfceListPage;
