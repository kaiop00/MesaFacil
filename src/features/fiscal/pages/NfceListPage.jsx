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
  buscarPedidoHistoricoDaNfce,
  cancelarNfce,
  consultarCancelamentoNfce,
  isUsingNfceMocks,
  listarNfces,
  sincronizarDocumentosNfce,
} from "@/features/fiscal/services/nfceListService";
import { baixarPdfDanfce } from "@/features/fiscal/services/nfceService";
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

const isCanceledStatus = (status) => {
  const normalized = normalizeStatus(status);
  return normalized === "cancelado" || normalized === "cancelada";
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

const base64ToBlob = (base64Value, mimeType = "application/pdf") => {
  const cleanBase64 = String(base64Value || "").replace(/\s/g, "");
  const binaryString = atob(cleanBase64);
  const bytes = new Uint8Array(binaryString.length);

  for (let i = 0; i < binaryString.length; i += 1) {
    bytes[i] = binaryString.charCodeAt(i);
  }

  return new Blob([bytes], { type: mimeType });
};

const triggerBlobDownload = (blob, fileName = "danfce.pdf") => {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  setTimeout(() => URL.revokeObjectURL(url), 120000);
};

const getStatusBadgeClasses = (status) => {
  const normalized = normalizeStatus(status);
  if (isAuthorizedStatus(normalized)) {
    return "bg-emerald-50 text-emerald-700 border border-emerald-200";
  }
  if (isCanceledStatus(normalized)) {
    return "bg-slate-100 text-slate-700 border border-slate-200";
  }
  if (isRejectedStatus(normalized)) {
    return "bg-red-50 text-red-700 border border-red-200";
  }
  return "bg-amber-50 text-amber-700 border border-amber-200";
};

const getCancelamentoStatusBadgeClasses = (status) => {
  const normalized = normalizeStatus(status);
  if (normalized === "registrado") {
    return "bg-emerald-50 text-emerald-700 border border-emerald-200";
  }
  if (normalized === "rejeitado" || normalized === "erro") {
    return "bg-red-50 text-red-700 border border-red-200";
  }
  return "bg-amber-50 text-amber-700 border border-amber-200";
};

const mergePedidoHistoricoIntoNfce = (nfce, pedidoHistorico) => {
  if (!nfce || !pedidoHistorico) return nfce;

  const pedidoMapped = {
    id: pedidoHistorico.id || pedidoHistorico.pedidoId || nfce?.pedido?.id || null,
    mesa: pedidoHistorico.mesaNumero || pedidoHistorico.mesaId || nfce?.pedido?.mesa || null,
    cliente: pedidoHistorico.cliente || nfce?.pedido?.cliente || null,
    itens: Array.isArray(pedidoHistorico.items) ? pedidoHistorico.items : nfce?.pedido?.itens || [],
  };

  return {
    ...nfce,
    pedidoId: nfce?.pedidoId || pedidoMapped.id || null,
    pedido_id: nfce?.pedido_id || pedidoMapped.id || null,
    referencia: nfce?.referencia || pedidoMapped.id || null,
    numero_pedido: nfce?.numero_pedido || pedidoMapped.id || null,
    mesa: nfce?.mesa || pedidoMapped.mesa || "-",
    cliente: nfce?.cliente || pedidoMapped.cliente || null,
    itens: Array.isArray(nfce?.itens) && nfce.itens.length > 0 ? nfce.itens : pedidoMapped.itens,
    pedido: {
      ...(nfce?.pedido || {}),
      ...pedidoMapped,
    },
  };
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
  const [downloadingDanfce, setDownloadingDanfce] = useState(false);
  const [loadingPedidoHistorico, setLoadingPedidoHistorico] = useState(false);
  const [cancelamentoData, setCancelamentoData] = useState(null);
  const notifyRef = useRef(notify);
  const lastLoadErrorRef = useRef("");
  const lastPedidoFetchRef = useRef(0);

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
    setCancelamentoData(null);
    setShowDetailsModal(true);
  };

  useEffect(() => {
    if (!showDetailsModal || !selectedNfce?.id || !idRestaurante) return;

    let isCancelled = false;
    const requestId = Date.now();
    lastPedidoFetchRef.current = requestId;

    const carregarPedidoHistorico = async () => {
      setLoadingPedidoHistorico(true);
      try {
        const pedidoHistorico = await buscarPedidoHistoricoDaNfce(idRestaurante, selectedNfce);
        if (isCancelled || lastPedidoFetchRef.current !== requestId || !pedidoHistorico) return;

        setSelectedNfce((prev) => {
          if (!prev || prev.id !== selectedNfce.id) return prev;
          return mergePedidoHistoricoIntoNfce(prev, pedidoHistorico);
        });
      } catch (error) {
        console.error("Erro ao carregar pedido em historicoPedidos:", error);
      } finally {
        if (!isCancelled && lastPedidoFetchRef.current === requestId) {
          setLoadingPedidoHistorico(false);
        }
      }
    };

    carregarPedidoHistorico();

    return () => {
      isCancelled = true;
    };
  }, [showDetailsModal, selectedNfce, idRestaurante]);

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
        "Informe a justificativa do cancelamento da NFC-e (opcional):",
    );

    if (justificativa === null) return;

    setActionLoading(true);
    try {
      await cancelarNfce(idRestaurante, selectedNfce.id, justificativa.trim());
      setSelectedNfce((prev) => ({ ...prev, status: "cancelado" }));
      setCancelamentoData((prev) => ({
        ...(prev || {}),
        justificativa: justificativa.trim() || prev?.justificativa || null,
        status: prev?.status || "pendente",
      }));
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

  const handleConsultarCancelamento = async () => {
    if (!selectedNfce?.id || !idRestaurante || actionLoading) return;

    setActionLoading(true);
    try {
      const result = await consultarCancelamentoNfce(idRestaurante, selectedNfce.id);
      const cancelamento = result?.data || null;

      setCancelamentoData(cancelamento);

      if (cancelamento?.status === "registrado") {
        setSelectedNfce((prev) => ({
          ...prev,
          status: "cancelado",
        }));
      }

      notify(
        t("nfceList.actions.consultCancelSuccess") || "Consulta de cancelamento realizada com sucesso",
        "success",
      );
      await refreshList();
    } catch (error) {
      console.error("Erro ao consultar cancelamento NFC-e:", error);
      notify(
        getFriendlyNfceError(
          error,
          t("nfceList.actions.consultCancelError") || "Erro ao consultar cancelamento",
        ),
        "error",
      );
    } finally {
      setActionLoading(false);
    }
  };

  const handleDownloadDanfce = async () => {
    if (!selectedNfce?.id || !idRestaurante || downloadingDanfce) return;

    setDownloadingDanfce(true);
    try {
      const result = await baixarPdfDanfce({
        idRestaurante,
        nfceId: selectedNfce.id,
      });

      if (result?.pdfBase64) {
        const blob = base64ToBlob(result.pdfBase64, result.contentType || "application/pdf");
        triggerBlobDownload(blob, result.fileName || `danfce-${selectedNfce.id}.pdf`);
        notify(t("nfceList.actions.downloadDanfceSuccess") || "DANFC-e baixado com sucesso", "success");
        return;
      }

      const fallbackUrl = result?.mockUrl || selectedNfce.url_pdf || selectedNfce.url_danfce || selectedNfce.url;
      if (fallbackUrl) {
        const anchor = document.createElement("a");
        anchor.href = fallbackUrl;
        anchor.target = "_blank";
        anchor.rel = "noopener noreferrer";
        anchor.download = "";
        document.body.appendChild(anchor);
        anchor.click();
        document.body.removeChild(anchor);
        notify(t("nfceList.actions.downloadDanfceSuccess") || "DANFC-e baixado com sucesso", "success");
        return;
      }

      throw new Error(t("nfceList.actions.downloadDanfceError") || "Nao foi possivel baixar o DANFC-e");
    } catch (error) {
      console.error("Erro ao baixar DANFC-e:", error);
      notify(
        getFriendlyNfceError(
          error,
          t("nfceList.actions.downloadDanfceError") || "Erro ao baixar DANFC-e",
        ),
        "error",
      );
    } finally {
      setDownloadingDanfce(false);
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
          onClose={() => {
            setShowDetailsModal(false);
            setCancelamentoData(null);
          }}
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

            {cancelamentoData && (
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs font-semibold text-slate-800">
                    {t("nfceList.modal.cancelation.title") || "Evento de cancelamento"}
                  </p>
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold capitalize ${getCancelamentoStatusBadgeClasses(cancelamentoData.status)}`}>
                    <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />
                    {cancelamentoData.status || "-"}
                  </span>
                </div>

                <p className="text-xs text-slate-700">
                  <span className="font-medium">{t("nfceList.modal.cancelation.reason") || "Justificativa"}:</span>{" "}
                  {cancelamentoData.justificativa || (t("nfceList.modal.rejection.notInformed") || "Nao informado")}
                </p>

                {cancelamentoData.codigo_status && (
                  <p className="text-xs text-slate-700">
                    <span className="font-medium">{t("nfceList.modal.cancelation.code") || "Código"}:</span>{" "}
                    {cancelamentoData.codigo_status}
                  </p>
                )}

                {cancelamentoData.motivo_status && (
                  <p className="text-xs text-slate-700">
                    <span className="font-medium">{t("nfceList.modal.cancelation.statusReason") || "Motivo"}:</span>{" "}
                    {cancelamentoData.motivo_status}
                  </p>
                )}

                {cancelamentoData.numero_protocolo && (
                  <p className="text-xs text-slate-700 break-all">
                    <span className="font-medium">{t("nfceList.modal.cancelation.protocol") || "Protocolo"}:</span>{" "}
                    {cancelamentoData.numero_protocolo}
                  </p>
                )}

                {cancelamentoData.data_evento && (
                  <p className="text-xs text-slate-700">
                    <span className="font-medium">{t("nfceList.modal.cancelation.eventDate") || "Data do evento"}:</span>{" "}
                    {formatDateTime(cancelamentoData.data_evento)}
                  </p>
                )}

                {cancelamentoData.data_recebimento && (
                  <p className="text-xs text-slate-700">
                    <span className="font-medium">{t("nfceList.modal.cancelation.receiptDate") || "Recebimento"}:</span>{" "}
                    {formatDateTime(cancelamentoData.data_recebimento)}
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
                {loadingPedidoHistorico && getPedidoItens(selectedNfce).length === 0 && (
                  <p className="mt-1 text-xs text-gray-500">
                    {t("nfceList.modal.order.loading") || "Buscando pedido no historico..."}
                  </p>
                )}
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
                onClick={handleConsultarCancelamento}
                disabled={actionLoading}
                className="px-3 py-2 text-xs bg-slate-50 text-slate-700 border border-slate-200 rounded-md hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {actionLoading
                  ? (t("nfceList.actions.consultingCancel") || "Consultando cancelamento...")
                  : (t("nfceList.actions.consultCancel") || "Consultar cancelamento")}
              </button>

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

              <button
                onClick={handleDownloadDanfce}
                disabled={downloadingDanfce}
                className="px-3 py-2 text-xs bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-md hover:bg-indigo-100 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {downloadingDanfce
                  ? (t("nfceList.actions.downloadingDanfce") || "Baixando DANFC-e...")
                  : (t("nfceList.actions.downloadDanfce") || "Baixar DANFC-e")}
              </button>

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
