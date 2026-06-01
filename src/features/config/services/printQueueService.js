import { create, getAll, update } from "@/services/firebase/firestoreService";
import { db } from "@/config/firebaseConfig";
import { doc, getDoc } from "firebase/firestore";
import {
  getImpressorasSetor,
  getSetoresProducao,
} from "@/features/config/services/producaoService";
import { fetchAvailablePrinters } from "@/services/printService";

const PRINT_QUEUE_COLL = "printQueue";
const SYSTEM_NAME = "MesaFacil";

const safeText = (value) => String(value ?? "").replace(/[<>]/g, "").trim();
const line = (char = "-") => char.repeat(48);
const centerText = (value, width = 48) => {
  const text = safeText(value);
  if (!text) return "";
  if (text.length >= width) return text;
  const totalPadding = width - text.length;
  const leftPadding = Math.floor(totalPadding / 2);
  const rightPadding = totalPadding - leftPadding;
  return `${" ".repeat(leftPadding)}${text}${" ".repeat(rightPadding)}`;
};

// Wraps a long text into multiple lines and centers each line to the given width.
const centerMultiLine = (value, width = 48) => {
  const text = safeText(value);
  if (!text) return "";

  // Simple word-wrap
  const words = text.split(/\s+/);
  const lines = [];
  let current = "";
  for (const w of words) {
    if ((current + " " + w).trim().length <= width) {
      current = (current + " " + w).trim();
    } else {
      if (current) lines.push(current);
      current = w;
    }
  }
  if (current) lines.push(current);

  return lines.map((ln) => centerText(ln, width)).join("\n");
};
const normalizeCategory = (value) => safeText(value).toLocaleLowerCase("pt-BR");

const resolveSetorFromItem = (item, setores = []) => {
  const setorId = item?.setorId || item?.setor?.id || "";
  const setorNome = safeText(item?.setorNome || item?.setor?.nome || item?.setor || "Sem setor");

  if (setorId) {
    const setorPorId = setores.find((setor) => setor.id === setorId);
    if (setorPorId) {
      return {
        setorId: setorPorId.id,
        setorNome: setorPorId.nome || setorNome,
      };
    }
  }

  const categoriasItem = Array.isArray(item?.categorias)
    ? item.categorias.map(normalizeCategory).filter(Boolean)
    : [];

  if (categoriasItem.length > 0) {
    const setorEncontrado = setores.find((setor) => {
      const categoriasSetor = Array.isArray(setor?.categorias)
        ? setor.categorias.map(normalizeCategory).filter(Boolean)
        : [];
      return categoriasSetor.some((categoria) => categoriasItem.includes(categoria));
    });

    if (setorEncontrado) {
      return {
        setorId: setorEncontrado.id,
        setorNome: setorEncontrado.nome || setorNome,
      };
    }
  }

  return {
    setorId: setorId || "sem-setor",
    setorNome,
  };
};

const normalizePrinterName = (value) => String(value || "").trim();

const resolveFallbackPrinterName = async (impressoras = []) => {
  const linkedPrinter = (impressoras || []).find((item) => item?.ativa !== false && normalizePrinterName(item?.printerSystemName || item?.systemPrinter));
  const linkedName = normalizePrinterName(linkedPrinter?.printerSystemName || linkedPrinter?.systemPrinter);
  if (linkedName) {
    return linkedName;
  }

  try {
    const printers = await fetchAvailablePrinters();
    const defaultPrinter = printers.find((item) => item?.default && item?.connected !== false) || printers.find((item) => item?.connected !== false) || printers[0];
    return normalizePrinterName(defaultPrinter?.name);
  } catch (error) {
    console.debug("DEBUG resolveFallbackPrinterName: failed to read printers", error?.message || error);
    return "";
  }
};

const formatItemLabel = (item, index) => {
  const quantity = Number(item?.quantity || 0);
  const name = safeText(item?.nome || "Item").toUpperCase();
  const observation = safeText(item?.itemObservation || item?.descricao || item?.observacao || item?.observacoes || "");
  const lines = [`${String(index + 1).padStart(2, "0")}. ${quantity}X ${name}`];

  if (observation) {
    lines.push(`   OBS: ${observation.toUpperCase()}`);
  }

  return lines.join("\n");
};

const groupItemsBySetor = (items = [], setores = []) => {
  const grupos = new Map();

  items.forEach((item, index) => {
    const { setorId, setorNome } = resolveSetorFromItem(item, setores);
    const key = `${setorId}::${setorNome}`;

    if (!grupos.has(key)) {
      grupos.set(key, {
        setorId,
        setorNome,
        items: [],
      });
    }

    grupos.get(key).items.push({ ...item, __index: index, setorId, setorNome });
  });

  return Array.from(grupos.values());
};

const buildTicketText = ({
  tipo,
  mesaNumero,
  setorNome,
  estabelecimentoNome,
  items,
  observacoes,
  motivoCancelamento,
}) => {
  const header = [
    line(),
    // Center both system name and establishment name; wrap long names if needed
    centerMultiLine(SYSTEM_NAME.toUpperCase()),
    centerMultiLine(estabelecimentoNome || "-"),
    `TIPO: ${safeText(tipo).toUpperCase()}`,
    `MESA: ${safeText(mesaNumero || "-").toUpperCase()}`,
    `SETOR: ${safeText(setorNome || "-").toUpperCase()}`,
    line(),
  ];

  const itemLines = (items || []).map((item, index) => formatItemLabel(item, index));

  const footer = [
    line(),
  ];

  if (observacoes) footer.push(line(), `OBS: ${safeText(observacoes).toUpperCase()}`);
  if (motivoCancelamento) footer.push(line(), `MOTIVO: ${safeText(motivoCancelamento).toUpperCase()}`);

  footer.push(line());
  return [...header, ...itemLines, ...footer].join("\n");
};

const buildTicketHtml = (title, ticketText) => `
  <!doctype html>
  <html lang="pt-BR">
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width,initial-scale=1" />
      <title>${safeText(title)}</title>
      <style>
        body { margin: 0; padding: 0; font-family: Arial, sans-serif; }
        pre { margin: 0; padding: 12px; white-space: pre-wrap; font-size: 12px; line-height: 1.3; }
      </style>
    </head>
    <body><pre>${safeText(ticketText)}</pre></body>
  </html>
`;

const buildQueuePayload = ({
  tipo,
  pedidoId,
  mesaId,
  mesaNumero,
  setorId,
  setorNome,
  estabelecimentoNome,
  printerSystemName,
  items,
  total,
  observacoes,
  motivoCancelamento,
}) => {
  const ticketText = buildTicketText({
    tipo,
    pedidoId,
    mesaNumero,
    setorNome,
    estabelecimentoNome,
    items,
    observacoes,
    motivoCancelamento,
  });

  return {
    tipo,
    pedidoId,
    mesaId,
    mesaNumero: mesaNumero || mesaId || "-",
    setorId,
    setorNome,
    printerSystemName: printerSystemName || "",
    total: Number(total || 0),
    observacoes: observacoes || "",
    motivoCancelamento: motivoCancelamento || "",
    items: (items || []).map((item) => ({
      id: item.id,
      nome: item.nome,
      price: Number(item.price || 0),
      quantity: Number(item.quantity || 0),
      descricao: item.descricao || item.observacao || item.observacoes || "",
      itemObservation: item.itemObservation || item.observacao || item.observacoes || "",
      setorId: item.setorId || "",
      setorNome: item.setorNome || "",
    })),
    ticketText,
    ticketHtml: buildTicketHtml(`${tipo} - ${setorNome || "Setor"}`, ticketText),
  };
};

const fetchEstabelecimentoNome = async (idRestaurante) => {
  const restauranteSnapshot = await getDoc(doc(db, "restaurantes", idRestaurante));
  return restauranteSnapshot.exists()
    ? safeText(restauranteSnapshot.data()?.nome || "")
    : "";
};

export const getPrintQueue = async (idRestaurante) => {
  return await getAll(idRestaurante, PRINT_QUEUE_COLL, {
    orderByField: "criadoEm",
    order: "desc",
  });
};

export const debugResolveSetoresForItems = async (idRestaurante, items = []) => {
  const setores = await getSetoresProducao(idRestaurante);
  return (items || []).map((item) => ({
    item,
    resolved: resolveSetorFromItem(item, setores || []),
  }));
};

export const enqueuePrintJobsForPedido = async ({
  idRestaurante,
  pedidoId,
  mesaId,
  mesaNumero,
  pedidoData = {},
}) => {
  const items = Array.isArray(pedidoData.items) ? pedidoData.items : [];
  const [setores, impressoras] = await Promise.all([
    getSetoresProducao(idRestaurante),
    getImpressorasSetor(idRestaurante),
  ]);
  const estabelecimentoNome = await fetchEstabelecimentoNome(idRestaurante);
  console.debug("DEBUG enqueuePrintJobsForPedido: fetched setores/impressoras", {
    idRestaurante,
    pedidoId,
    itemsCount: items.length,
    setoresCount: (setores || []).length,
    impressorasCount: (impressoras || []).length,
  });

  // Observações agora devem ser tratadas por item no momento da criação do pedido.
  // Não tentar atribuir observações gerais do pedido aos items aqui —
  // o frontend / serviço que cria o pedido deve preencher `item.descricao` corretamente.

  const grupos = groupItemsBySetor(items, setores || []);
  if (grupos.length === 0) {
    try {
      const diagnostic = await debugResolveSetoresForItems(idRestaurante, items || []);
      console.debug("DEBUG enqueuePrintJobsForPedido: no groups found; item->setor mapping:", diagnostic);
    } catch (dE) {
      console.debug("DEBUG enqueuePrintJobsForPedido: failed diagnostic", dE);
    }
  }
  if (grupos.length === 0) return [];

  const fallbackPrinterName = await resolveFallbackPrinterName(impressoras);

  const jobs = [];

  for (const grupo of grupos) {
    console.debug("DEBUG enqueuePrintJobsForPedido: processing grupo", { grupo });
    const setor = (setores || []).find((item) => item.id === grupo.setorId);
    const impressora = (impressoras || []).find(
      (item) => item.setorId === grupo.setorId && item.ativa !== false
    );
    const printerSystemName = normalizePrinterName(
      impressora?.printerSystemName || impressora?.systemPrinter || fallbackPrinterName
    );

    const payload = buildQueuePayload({
      tipo: "PEDIDO",
      pedidoId,
      mesaId,
      mesaNumero,
      setorId: grupo.setorId,
      setorNome: setor?.nome || grupo.setorNome || "Sem setor",
      estabelecimentoNome,
      printerSystemName,
      items: grupo.items,
      total: grupo.items.reduce(
        (acc, item) => acc + Number(item.price || 0) * Number(item.quantity || 0),
        0
      ),
      observacoes: pedidoData.observacoes || "",
    });

    // DEBUG: log payload and item descriptions to help trace lost observations
    try {
      console.debug("DEBUG enqueuePrintJobsForPedido payload", {
        pedidoId,
        setorId: grupo.setorId,
        itemsPreview: (grupo.items || []).map((it) => ({ id: it.id, nome: it.nome, descricao: it.descricao || it.observacao || "" })),
        payloadPreview: {
          observacoes: payload.observacoes,
          itemsCount: (payload.items || []).length,
        },
      });
    } catch {
      // ignore logging errors
    }

    const docRef = await create(idRestaurante, PRINT_QUEUE_COLL, {
      pedidoId,
      mesaId,
      mesaNumero: mesaNumero || mesaId || "-",
      setorId: grupo.setorId,
      setorNome: setor?.nome || grupo.setorNome || "Sem setor",
      printerSystemName,
      impressoraId: impressora?.id || null,
      impressoraNome: impressora?.nome || null,
      tipo: "PEDIDO",
      status: "PENDENTE",
      tentativas: 0,
      payload,
    });

    console.debug("DEBUG enqueuePrintJobsForPedido: created queue item", { queueId: docRef.id, setorId: grupo.setorId, impressoraId: impressora?.id || null });

    jobs.push({ id: docRef.id, ...payload });
  }

  return jobs;
};

export const enqueueCancelamentoPedido = async ({
  idRestaurante,
  pedidoId,
  mesaId,
  mesaNumero,
  pedidoData = {},
  motivoCancelamento = "",
}) => {
  const items = Array.isArray(pedidoData.items) ? pedidoData.items : [];
  const [setores, impressoras] = await Promise.all([
    getSetoresProducao(idRestaurante),
    getImpressorasSetor(idRestaurante),
  ]);
  const estabelecimentoNome = await fetchEstabelecimentoNome(idRestaurante);

  const grupos = groupItemsBySetor(items, setores || []);
  if (grupos.length === 0) return [];

  const jobs = [];

  for (const grupo of grupos) {
    const setor = (setores || []).find((item) => item.id === grupo.setorId);
    const impressora = (impressoras || []).find(
      (item) => item.setorId === grupo.setorId && item.ativa !== false
    );
    const printerSystemName = String(
      impressora?.printerSystemName || impressora?.systemPrinter || ""
    ).trim();

    const payload = buildQueuePayload({
      tipo: "CANCELAMENTO",
      pedidoId,
      mesaId,
      mesaNumero,
      setorId: grupo.setorId,
      setorNome: setor?.nome || grupo.setorNome || "Sem setor",
      estabelecimentoNome,
      printerSystemName,
      items: grupo.items,
      total: grupo.items.reduce(
        (acc, item) => acc + Number(item.price || 0) * Number(item.quantity || 0),
        0
      ),
      observacoes: pedidoData.observacoes || "",
      motivoCancelamento,
    });

    const docRef = await create(idRestaurante, PRINT_QUEUE_COLL, {
      pedidoId,
      mesaId,
      mesaNumero: mesaNumero || mesaId || "-",
      setorId: grupo.setorId,
      setorNome: setor?.nome || grupo.setorNome || "Sem setor",
      printerSystemName,
      impressoraId: impressora?.id || null,
      impressoraNome: impressora?.nome || null,
      tipo: "CANCELAMENTO",
      status: "PENDENTE",
      tentativas: 0,
      payload,
    });

    jobs.push({ id: docRef.id, ...payload });
  }

  return jobs;
};

export const enqueueCancelamentoItemPedido = async ({
  idRestaurante,
  pedidoId,
  mesaId,
  mesaNumero,
  item,
  quantidade,
  motivoCancelamento = "",
}) => {
  const itemCancelado = {
    ...item,
    quantity: Number(quantidade || 0),
  };

  return await enqueueCancelamentoPedido({
    idRestaurante,
    pedidoId,
    mesaId,
    mesaNumero,
    pedidoData: {
      observacoes: `Item cancelado: ${safeText(item?.nome || "")}`,
      items: [itemCancelado],
    },
    motivoCancelamento,
  });
};

export const getPrintQueueByPedido = async (idRestaurante, pedidoId) => {
  const queue = await getPrintQueue(idRestaurante);
  return queue.filter((item) => item.pedidoId === pedidoId);
};

export const updatePrintQueueItem = async (idRestaurante, queueId, data) => {
  await update(idRestaurante, PRINT_QUEUE_COLL, queueId, data);
};

export const markPrintQueueAsPrinted = async (idRestaurante, queueId, extraData = {}) => {
  await updatePrintQueueItem(idRestaurante, queueId, {
    status: "IMPRESSO",
    impressoEm: new Date().toISOString(),
    tentativas: Number(extraData.tentativas || 0),
    ...extraData,
  });
};

export const markPrintQueueAsError = async (idRestaurante, queueId, errorMessage = "") => {
  await updatePrintQueueItem(idRestaurante, queueId, {
    status: "ERRO",
    ultimoErro: safeText(errorMessage),
    tentativas: undefined,
  });
};

export const retryPrintQueueItem = async (idRestaurante, queueItem) => {
  const nextTentativas = Number(queueItem?.tentativas || 0) + 1;
  await updatePrintQueueItem(idRestaurante, queueItem.id, {
    status: "PENDENTE",
    tentativas: nextTentativas,
    ultimoErro: null,
  });
};

export const buildQueueItemPreview = (queueItem) => {
  const payload = queueItem?.payload || {};
  return buildTicketHtml(
    `${safeText(payload.tipo || queueItem?.tipo || "Pedido")}`,
    payload.ticketText || ""
  );
};
