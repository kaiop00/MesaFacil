import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import { usePermissions } from "@/hooks/usePermissions";
import { useToast } from "@/hooks/useToast";
import CardHeader from "@/components/CardHeader";
import BaseModalWithHeader from "@/components/BaseModalWithHeader";
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

const normalizeStatus = (status) => String(status || "").trim().toLowerCase();

const isAuthorizedStatus = (status) => {
  const normalized = normalizeStatus(status);
  return normalized === "autorizado" || normalized === "autorizada";
};

const isRejectedStatus = (status) => {
  const normalized = normalizeStatus(status);
  return normalized === "rejeitado" || normalized === "rejeitada" || normalized === "erro";
};

const formatDateTime = (value) => {
  if (!value) return "-";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "-";
  return parsed.toLocaleString("pt-BR");
};

const formatCurrency = (value) => {
  const number = Number(value);
  if (!Number.isFinite(number)) return "0.00";
  return number.toFixed(2);
};

const getStatusBadgeClasses = (status) => {
  const normalized = normalizeStatus(status);
  if (isAuthorizedStatus(normalized)) {
    return "bg-emerald-50 text-emerald-700 border border-emerald-200";
  }
  if (normalized === "cancelado") {
    return "bg-slate-100 text-slate-700 border border-slate-200";
  }
  if (isRejectedStatus(normalized)) {
    return "bg-red-50 text-red-700 border border-red-200";
  }
  return "bg-amber-50 text-amber-700 border border-amber-200";
};

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

  const getNfceCodigoStatus = (nfce) => (
    nfce?.codigoStatus ||
    nfce?.codigo_status ||
    nfce?.autorizacao?.codigo_status ||
    nfce?.data?.codigo_status ||
    nfce?.data?.autorizacao?.codigo_status ||
    nfce?.nfceRejeicaoCodigo ||
    null
  );

  const getNfceMotivoStatus = (nfce) => {
    const mensagens = Array.isArray(nfce?.mensagens)
      ? nfce.mensagens
      : Array.isArray(nfce?.data?.mensagens)
        ? nfce.data.mensagens
        : [];
    const mensagemTexto = mensagens.length > 0
      ? mensagens.map((m) => m?.descricao || m?.mensagem || JSON.stringify(m)).join("; ")
      : "";

    return (
      nfce?.motivoStatus ||
      nfce?.motivo_status ||
      nfce?.autorizacao?.motivo_status ||
      nfce?.data?.motivo_status ||
      nfce?.data?.autorizacao?.motivo_status ||
      nfce?.nfceRejeicaoMotivo ||
      nfce?.nfceErro ||
      mensagemTexto ||
      ""
    );
  };

  const getNfceAmbiente = (nfce) => nfce?.ambiente || nfce?.data?.ambiente || "-";
  const getNfceDataEmissao = (nfce) => nfce?.data_emissao || nfce?.data?.data_emissao || null;
  const getNfceDataRecebimento = (nfce) => (
    nfce?.autorizacao?.data_recebimento ||
    nfce?.data?.autorizacao?.data_recebimento ||
    null
  );

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

      {/* Modal de detalhes */}
      {showDetailsModal && selectedNfce && (
        <BaseModalWithHeader
          isOpen={showDetailsModal}
          onClose={() => setShowDetailsModal(false)}
          title={t("nfceList.modal.title") || "Detalhes da NFC-e"}
          subTitle={`${t("nfceList.modal.numero") || "Número"}: ${selectedNfce.numero || "-"}`}
        >
          <div className="space-y-4 text-sm">
            <div className="rounded-lg border border-gray-200 bg-white p-4 space-y-3">
              <div className="space-y-3">
                <div className="rounded-md border border-gray-200 bg-gray-50 px-3 py-2 flex items-center justify-between gap-3">
                  <span className="text-gray-600 font-medium">{t("nfceList.modal.status") || "Status"}:</span>
                  <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold capitalize ${getStatusBadgeClasses(selectedNfce.status)}`}>
                    <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />
                    {selectedNfce.status || "-"}
                  </span>
                </div>

                <div className="space-y-1">
                  <span className="text-gray-600">{t("nfceList.modal.id") || "ID"}:</span>
                  <p className="font-mono text-gray-900 break-all">{selectedNfce.id || "-"}</p>
                </div>

                <div className="space-y-1">
                  <span className="text-gray-600">{t("nfceList.modal.chave") || "Chave de Acesso"}:</span>
                  <p className="font-mono text-xs text-gray-900 break-all">{selectedNfce.chave || "-"}</p>
                </div>

                <div className="space-y-1">
                  <span className="text-gray-600">{t("nfceList.modal.valor") || "Valor"}:</span>
                  <p className="font-semibold text-gray-900">{formatCurrency(selectedNfce.valor || selectedNfce.vNF || selectedNfce.valor_total || 0)}</p>
                </div>

                <div className="space-y-1">
                  <span className="text-gray-600">{t("nfceList.modal.environment") || "Ambiente"}:</span>
                  <p className="text-gray-900">{getNfceAmbiente(selectedNfce)}</p>
                </div>

                <div className="space-y-1">
                  <span className="text-gray-600">{t("nfceList.modal.emissionDate") || "Emissão"}:</span>
                  <p className="text-gray-900">{formatDateTime(getNfceDataEmissao(selectedNfce))}</p>
                </div>

                <div className="space-y-1">
                  <span className="text-gray-600">{t("nfceList.modal.receiptDate") || "Recebimento"}:</span>
                  <p className="text-gray-900">{formatDateTime(getNfceDataRecebimento(selectedNfce))}</p>
                </div>

                {selectedNfce.referencia && (
                  <div className="space-y-1">
                    <span className="text-gray-600">{t("nfceList.modal.referencia") || "Referência do Pedido"}:</span>
                    <p className="font-mono text-gray-900 break-all">{selectedNfce.referencia}</p>
                  </div>
                )}
              </div>
            </div>

            {isRejectedStatus(selectedNfce.status) && (
              <div className="rounded-lg border border-red-200 bg-red-50 p-3 space-y-1">
                <p className="text-xs font-semibold text-red-800">
                  {t("nfceList.modal.rejection.title") || "Detalhes da rejeição"}
                </p>
                <p className="text-xs text-red-700">
                  <span className="font-medium">{t("nfceList.modal.rejection.reason") || "Motivo"}:</span>{" "}
                  {getNfceMotivoStatus(selectedNfce) || (t("nfceList.modal.rejection.notInformed") || "Nao informado")}
                </p>
                {getNfceCodigoStatus(selectedNfce) && (
                  <p className="text-xs text-red-700">
                    <span className="font-medium">{t("nfceList.modal.rejection.code") || "Código"}:</span>{" "}
                    {getNfceCodigoStatus(selectedNfce)}
                  </p>
                )}
              </div>
            )}

            <div className="rounded-lg border border-gray-200 bg-gray-50/60 p-4 space-y-2">
              <h3 className="font-semibold text-gray-800">
                {t("nfceList.modal.order.title") || "Detalhes do Pedido"}
              </h3>

              <div className="flex justify-between gap-3">
                <span className="text-gray-600">{t("nfceList.modal.order.reference") || "Pedido"}:</span>
                <span className="font-mono text-right break-all">{getPedidoReferencia(selectedNfce)}</span>
              </div>

              <div className="flex justify-between gap-3">
                <span className="text-gray-600">{t("nfceList.modal.order.table") || "Mesa"}:</span>
                <span>{getPedidoMesa(selectedNfce)}</span>
              </div>

              <div className="flex justify-between gap-3">
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
                        className="rounded-md border border-gray-200 bg-white px-3 py-2"
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

            <div className="pt-2 border-t border-gray-200 flex flex-wrap gap-2">
              <button
                onClick={handleSyncDocuments}
                disabled={actionLoading}
                className="px-3 py-2 text-xs bg-blue-50 text-blue-700 border border-blue-200 rounded-md hover:bg-blue-100 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {actionLoading
                  ? (t("nfceList.actions.syncing") || "Sincronizando...")
                  : (t("nfceList.actions.sync") || "Sincronizar documentos")}
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

              {isAuthorizedStatus(selectedNfce.status) && (
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
        </BaseModalWithHeader>
      )}
    </div>
  );
};

export default NfceListPage;
