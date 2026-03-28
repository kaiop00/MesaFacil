import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import { usePermissions } from "@/hooks/usePermissions";
import { useToast } from "@/hooks/useToast";
import CardHeader from "@/components/CardHeader";
import PermissionDeniedPage from "@/components/PermissionDeniedPage";
import NfceTable from "@/features/fiscal/components/NfceTable";
import {
  cancelarNfce,
  isUsingNfceMocks,
  listarNfces,
  sincronizarDocumentosNfce,
} from "@/features/fiscal/services/nfceListService";
import { ChevronLeft, ChevronRight } from "react-coolicons";
import { getFriendlyNfceError } from "@/features/fiscal/utils/nfceErrorParser";

const ITEMS_PER_PAGE = 50;

const NfceListPage = () => {
  const { t } = useTranslation("fiscal");
  const { idRestaurante } = useAuth();
  const { hasPermission } = usePermissions();
  const { notify } = useToast();
  const canViewFiscal = hasPermission("view_fiscal");
  const usingMocks = isUsingNfceMocks();

  const [nfces, setNfces] = useState([]);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const [total, setTotal] = useState(0);
  const [selectedNfce, setSelectedNfce] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const notifyRef = useRef(notify);
  const lastLoadErrorRef = useRef("");

  useEffect(() => {
    notifyRef.current = notify;
  }, [notify]);

  // Load NFC-es when component mounts or page changes
  useEffect(() => {
    if (!idRestaurante || !canViewFiscal) return;

    const loadFailedMessage = t("nfceList.errors.loadFailed") || "Erro ao carregar NFC-es";

    const carregarNfces = async () => {
      setLoading(true);
      try {
        const skip = currentPage * ITEMS_PER_PAGE;
        const result = await listarNfces(idRestaurante, ITEMS_PER_PAGE, skip);

        setNfces(result.nfces || []);
        setTotal(result.total || 0);
        lastLoadErrorRef.current = "";
      } catch (error) {
        console.error("Erro ao carregar NFC-es:", error);
        const errorMessage = getFriendlyNfceError(error, loadFailedMessage);

        // Avoid firing the same toast repeatedly when backend is failing.
        if (errorMessage !== lastLoadErrorRef.current) {
          lastLoadErrorRef.current = errorMessage;
          notifyRef.current(errorMessage, "error");
        }
      } finally {
        setLoading(false);
      }
    };

    carregarNfces();
  }, [idRestaurante, currentPage, canViewFiscal, t]);

  const handleViewDetails = (nfce) => {
    setSelectedNfce(nfce);
    setShowDetailsModal(true);
  };

  const refreshList = async () => {
    const skip = currentPage * ITEMS_PER_PAGE;
    const result = await listarNfces(idRestaurante, ITEMS_PER_PAGE, skip);
    setNfces(result.nfces || []);
    setTotal(result.total || 0);
  };

  const handleSyncDocuments = async () => {
    if (!selectedNfce?.id || !idRestaurante || actionLoading) return;

    setActionLoading(true);
    try {
      const result = await sincronizarDocumentosNfce(idRestaurante, selectedNfce.id);
      setSelectedNfce((prev) => ({
        ...prev,
        status: result?.documentos?.status || prev.status,
        chave: result?.documentos?.chaveAcesso || prev.chave,
        url_danfce: result?.documentos?.danfceUrl || prev.url_danfce,
        url_xml: result?.documentos?.xmlUrl || prev.url_xml,
        url_pdf: result?.documentos?.pdfUrl || prev.url_pdf,
      }));
      notify(t("nfceList.actions.syncSuccess") || "Documentos sincronizados com sucesso", "success");
      await refreshList();
    } catch (error) {
      console.error("Erro ao sincronizar documentos NFC-e:", error);
      notify(
        getFriendlyNfceError(
          error,
          t("nfceList.actions.syncError") || "Erro ao sincronizar documentos",
        ),
        "error",
      );
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancelNfce = async () => {
    if (!selectedNfce?.id || !idRestaurante || actionLoading) return;

    const justificativa = window.prompt(
      t("nfceList.actions.cancelPrompt") ||
        "Informe a justificativa do cancelamento da NFC-e:",
    );

    if (!justificativa || !justificativa.trim()) return;

    setActionLoading(true);
    try {
      await cancelarNfce(idRestaurante, selectedNfce.id, justificativa.trim());
      setSelectedNfce((prev) => ({...prev, status: "cancelado"}));
      notify(t("nfceList.actions.cancelSuccess") || "NFC-e cancelada com sucesso", "success");
      await refreshList();
    } catch (error) {
      console.error("Erro ao cancelar NFC-e:", error);
      notify(
        getFriendlyNfceError(error, t("nfceList.actions.cancelError") || "Erro ao cancelar NFC-e"),
        "error",
      );
    } finally {
      setActionLoading(false);
    }
  };

  const totalPages = Math.ceil(total / ITEMS_PER_PAGE);
  const canGoPrevious = currentPage > 0;
  const canGoNext = currentPage < totalPages - 1;

  const getPedidoReferencia = (nfce) => (
    nfce?.numero_pedido ||
    nfce?.referencia ||
    nfce?.pedidoId ||
    nfce?.pedido_id ||
    nfce?.pedido?.id ||
    "-"
  );

  const getPedidoMesa = (nfce) => nfce?.mesa || nfce?.pedido?.mesa || "-";

  const getPedidoCliente = (nfce) => (
    nfce?.cliente?.nome ||
    nfce?.pedido?.cliente?.nome ||
    "-"
  );

  const getPedidoItens = (nfce) => {
    if (Array.isArray(nfce?.itens)) return nfce.itens;
    if (Array.isArray(nfce?.pedido?.itens)) return nfce.pedido.itens;
    if (Array.isArray(nfce?.pedido?.items)) return nfce.pedido.items;
    return [];
  };

  if (!canViewFiscal) {
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

      {usingMocks && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Modo demonstracao ativo: exibindo NFC-es mockadas (VITE_USE_NFCE_MOCKS=true ou ?mockNfce=1).
        </div>
      )}

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
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[85vh] overflow-y-auto">
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

                <div className="pt-3 mt-2 border-t border-gray-200 space-y-2">
                  <h3 className="font-semibold text-gray-800">
                    {t("nfceList.modal.order.title") || "Detalhes do Pedido"}
                  </h3>

                  <div className="flex justify-between">
                    <span className="text-gray-600">{t("nfceList.modal.order.reference") || "Pedido"}:</span>
                    <span className="font-mono">{getPedidoReferencia(selectedNfce)}</span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-gray-600">{t("nfceList.modal.order.table") || "Mesa"}:</span>
                    <span>{getPedidoMesa(selectedNfce)}</span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-gray-600">{t("nfceList.modal.order.customer") || "Cliente"}:</span>
                    <span>{getPedidoCliente(selectedNfce)}</span>
                  </div>

                  <div>
                    <span className="text-gray-600">{t("nfceList.modal.order.items") || "Itens"}:</span>
                    {getPedidoItens(selectedNfce).length > 0 ? (
                      <div className="mt-2 space-y-2">
                        {getPedidoItens(selectedNfce).map((item, index) => (
                          <div
                            key={item.id || item.codigo || `${item.nome || item.descricao || "item"}-${index}`}
                            className="rounded-md border border-gray-200 bg-gray-50 px-3 py-2"
                          >
                            <div className="text-sm font-medium text-gray-900">
                              {item.nome || item.descricao || t("nfceList.modal.order.unnamedItem") || "Item"}
                            </div>
                            <div className="text-xs text-gray-600">
                              {(item.quantidade || item.quantity || 1)}x
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="mt-1 text-xs text-gray-500">
                        {t("nfceList.modal.order.notAvailable") || "Detalhes do pedido nao disponiveis para esta NFC-e."}
                      </p>
                    )}
                  </div>
                </div>

                <div className="pt-3 mt-2 border-t border-gray-200 flex flex-wrap gap-2">
                  <button
                    onClick={handleSyncDocuments}
                    disabled={actionLoading}
                    className="px-3 py-2 text-xs bg-blue-50 text-blue-700 border border-blue-200 rounded-md hover:bg-blue-100 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {t("nfceList.actions.sync") || "Sincronizar documentos"}
                  </button>

                  {(selectedNfce.url_danfce || selectedNfce.url) && (
                    <a
                      href={selectedNfce.url_danfce || selectedNfce.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-2 text-xs bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-md hover:bg-emerald-100"
                    >
                      {t("nfceList.actions.openDanfce") || "Abrir DANFC-e"}
                    </a>
                  )}

                  {selectedNfce.url_xml && (
                    <a
                      href={selectedNfce.url_xml}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-2 text-xs bg-violet-50 text-violet-700 border border-violet-200 rounded-md hover:bg-violet-100"
                    >
                      {t("nfceList.actions.openXml") || "Abrir XML"}
                    </a>
                  )}

                  {selectedNfce.status === "autorizado" && (
                    <button
                      onClick={handleCancelNfce}
                      disabled={actionLoading}
                      className="px-3 py-2 text-xs bg-red-50 text-red-700 border border-red-200 rounded-md hover:bg-red-100 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {t("nfceList.actions.cancel") || "Cancelar NFC-e"}
                    </button>
                  )}
                </div>
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
