import { getFunctions, httpsCallable } from "firebase/functions";
import { collection, doc, documentId, getDoc, getDocs, limit, query, where } from "firebase/firestore";
import { db } from "@/config/firebaseConfig";
import {
  getMockNfceList,
  getMockNfceById,
  simulateCancelNfce,
  simulateConsultarCancelamento,
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

const firstNonEmpty = (...values) => values.find((value) => value !== undefined && value !== null && value !== "");

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
 * Fetch historical order details from restaurantes/{idRestaurante}/historicoPedidos
 * to enrich NFC-e details modal (items, customer and table).
 * @param {string} idRestaurante
 * @param {object} nfce
 * @returns {Promise<object|null>}
 */
export const buscarPedidoHistoricoDaNfce = async (idRestaurante, nfce = {}) => {
  if (!idRestaurante || !nfce || typeof nfce !== "object") return null;

  if (shouldUseNfceMocks()) {
    return nfce?.pedido || null;
  }

  const historicoRef = collection(db, "restaurantes", idRestaurante, "historicoPedidos");

  const docIdCandidates = [
    nfce?.pedidoId,
    nfce?.pedido_id,
    nfce?.referencia,
    nfce?.numero_pedido,
    nfce?.pedido?.id,
  ]
    .map((value) => String(value || "").trim())
    .filter(Boolean);

  for (const pedidoId of docIdCandidates) {
    const snap = await getDoc(doc(historicoRef, pedidoId));
    if (snap.exists()) {
      return { id: snap.id, ...snap.data() };
    }
  }

  const nfceId = String(firstNonEmpty(nfce?.id, nfce?.nfceId) || "").trim();
  if (nfceId) {
    const byNfceId = await getDocs(query(historicoRef, where("nfceId", "==", nfceId), limit(1)));
    if (!byNfceId.empty) {
      const found = byNfceId.docs[0];
      return { id: found.id, ...found.data() };
    }
  }

  if (docIdCandidates.length > 0) {
    const byDocId = await getDocs(
      query(historicoRef, where(documentId(), "in", docIdCandidates.slice(0, 10)), limit(1)),
    );
    if (!byDocId.empty) {
      const found = byDocId.docs[0];
      return { id: found.id, ...found.data() };
    }
  }

  return null;
};

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
  const result = await fn({
    idRestaurante,
    nfceId,
    justificativa: typeof justificativa === "string" ? justificativa : "",
  });
  return result.data;
};

/**
 * Consult cancellation status/details for an NFC-e.
 * @param {string} idRestaurante
 * @param {string} nfceId
 * @returns {Promise<object>}
 */
export const consultarCancelamentoNfce = async (idRestaurante, nfceId) => {
  if (shouldUseNfceMocks()) {
    ensureMockState();
    await sleep(250);

    const found = mockState.nfces.find((nfce) => nfce.id === nfceId) || getMockNfceById(nfceId);
    if (!found) {
      throw new Error("NFC-e nao encontrada");
    }

    return {
      success: true,
      nfceId,
      status: found.status,
      data: simulateConsultarCancelamento(found),
    };
  }

  const fn = httpsCallable(functions, "nfceConsultarCancelamento");
  const result = await fn({idRestaurante, nfceId});
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
