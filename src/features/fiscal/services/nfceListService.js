import { getFunctions, httpsCallable } from "firebase/functions";
import {
  getMockNfceList,
  simulateCancelNfce,
  simulateSyncNfceDocuments,
} from "@/features/fiscal/mocks/nfceMocks";

const functions = getFunctions();
const USE_NFCE_MOCKS = import.meta.env.VITE_USE_NFCE_MOCKS === "true";

const isMockByQueryParam = () => {
  if (typeof window === "undefined") return false;
  return new URLSearchParams(window.location.search).get("mockNfce") === "1";
};

const shouldUseNfceMocks = () => USE_NFCE_MOCKS || isMockByQueryParam();

const mockState = {
  initialized: false,
  nfces: [],
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const ensureMockState = () => {
  if (mockState.initialized) return;
  const { nfces } = getMockNfceList(120, 0);
  mockState.nfces = nfces;
  mockState.initialized = true;
};

const getMockPagination = (top = 50, skip = 0) => {
  ensureMockState();
  const nfces = mockState.nfces.slice(skip, skip + top);
  return {
    nfces,
    total: mockState.nfces.length,
    limit: top,
    offset: skip,
  };
};

export const isUsingNfceMocks = () => shouldUseNfceMocks();

/**
 * List emitted NFC-es for a restaurant with pagination
 * @param {string} idRestaurante - Restaurant ID
 * @param {number} limit - Number of results per page (default: 50)
 * @param {number} offset - Number of results to skip (default: 0)
 * @returns {Promise<object>} { nfces, total, limit, offset }
 */
export const listarNfces = async (idRestaurante, top = 50, skip = 0) => {
  if (shouldUseNfceMocks()) {
    await sleep(250);
    return getMockPagination(top, skip);
  }

  const nfceListar = httpsCallable(functions, "nfceListar");

  const result = await nfceListar({
    idRestaurante,
    top,
    skip,
  });

  if (result.data.success) {
    return result.data.data;
  }

  throw new Error(result.data.error || "Erro ao listar NFC-es");
};

/**
 * Cancel an issued NFC-e.
 * @param {string} idRestaurante
 * @param {string} nfceId
 * @param {string} justificativa
 * @returns {Promise<object>}
 */
export const cancelarNfce = async (idRestaurante, nfceId, justificativa) => {
  if (shouldUseNfceMocks()) {
    ensureMockState();
    await sleep(250);
    const found = mockState.nfces.find((nfce) => nfce.id === nfceId);
    if (!found) {
      throw new Error("NFC-e nao encontrada");
    }

    const updated = simulateCancelNfce(nfceId, justificativa) || {
      ...found,
      status: "cancelado",
      motivo_cancelamento: justificativa,
      cancelado_em: new Date().toISOString(),
      documentos: {
        ...found.documentos,
        status: "cancelado",
      },
    };

    mockState.nfces = mockState.nfces.map((nfce) => (nfce.id === nfceId ? updated : nfce));
    return { success: true, data: updated };
  }

  const fn = httpsCallable(functions, "nfceCancelar");
  const result = await fn({idRestaurante, nfceId, justificativa});
  return result.data;
};

/**
 * Sync XML/DANFE links and status from Nuvem Fiscal.
 * @param {string} idRestaurante
 * @param {string} nfceId
 * @returns {Promise<object>}
 */
export const sincronizarDocumentosNfce = async (idRestaurante, nfceId) => {
  if (shouldUseNfceMocks()) {
    ensureMockState();
    await sleep(350);

    const current = mockState.nfces.find((nfce) => nfce.id === nfceId);
    if (!current) {
      throw new Error("NFC-e nao encontrada");
    }

    const simulated = simulateSyncNfceDocuments(nfceId);
    const updated = simulated?.nfces || {
      ...current,
      status: current.status === "pendente" || current.status === "processando" ? "autorizado" : current.status,
      documentos: {
        ...current.documentos,
        status: "completo",
        chaveAcesso: current.chave || current.documentos?.chaveAcesso,
        danfceUrl: current.url_danfce || current.documentos?.danfceUrl,
        xmlUrl: current.url_xml || current.documentos?.xmlUrl,
        pdfUrl: current.url_pdf || current.documentos?.pdfUrl,
      },
    };

    mockState.nfces = mockState.nfces.map((nfce) => (nfce.id === nfceId ? updated : nfce));
    return {
      success: true,
      documentos: updated.documentos,
      nfce: updated,
    };
  }

  const fn = httpsCallable(functions, "nfceSincronizarDocumentos");
  const result = await fn({idRestaurante, nfceId});
  return result.data;
};
