import { create, getAll, update } from "@/services/firebase/firestoreService";
import {
  getImpressorasSetor,
  getSetoresProducao,
} from "@/features/config/services/producaoService";

const PRINT_QUEUE_COLL = "printQueue";

const moneyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

const safeText = (value) => String(value ?? "").replace(/[<>]/g, "").trim();
const line = (char = "-") => char.repeat(48);
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

const formatItemLabel = (item, index) => {
  const quantity = Number(item?.quantity || 0);
  const name = safeText(item?.nome || "Item");
  const total = Number(item?.price || 0) * quantity;
  return `${String(index + 1).padStart(2, "0")}. ${quantity}x ${name} ${moneyFormatter.format(total)}`;
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
  pedidoId,
  mesaNumero,
  setorNome,
  items,
  total,
  observacoes,
  motivoCancelamento,
}) => {
  const header = [
    line(),
    `TIPO: ${safeText(tipo)}`,
    `MESA: ${safeText(mesaNumero || "-")}`,
    `SETOR: ${safeText(setorNome || "-")}`,
    `PEDIDO: ${safeText(pedidoId || "-")}`,
    line(),
  ];

  const itemLines = (items || []).map((item, index) => formatItemLabel(item, index));

  const footer = [
    line(),
    `TOTAL: ${moneyFormatter.format(Number(total || 0))}`,
  ];

  if (observacoes) footer.push(line(), `OBS: ${safeText(observacoes)}`);
  if (motivoCancelamento) footer.push(line(), `MOTIVO: ${safeText(motivoCancelamento)}`);

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
    items,
    total,
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
    total: Number(total || 0),
    observacoes: observacoes || "",
    motivoCancelamento: motivoCancelamento || "",
    items: (items || []).map((item) => ({
      id: item.id,
      nome: item.nome,
      price: Number(item.price || 0),
      quantity: Number(item.quantity || 0),
      descricao: item.descricao || "",
      setorId: item.setorId || "",
      setorNome: item.setorNome || "",
    })),
    ticketText,
    ticketHtml: buildTicketHtml(`${tipo} - ${setorNome || "Setor"}`, ticketText),
  };
};

export const getPrintQueue = async (idRestaurante) => {
  return await getAll(idRestaurante, PRINT_QUEUE_COLL, {
    orderByField: "criadoEm",
    order: "desc",
  });
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

  const grupos = groupItemsBySetor(items, setores || []);
  if (grupos.length === 0) return [];

  const jobs = [];

  for (const grupo of grupos) {
    const setor = (setores || []).find((item) => item.id === grupo.setorId);
    const impressora = (impressoras || []).find(
      (item) => item.setorId === grupo.setorId && item.ativa !== false
    );

    const payload = buildQueuePayload({
      tipo: "PEDIDO",
      pedidoId,
      mesaId,
      mesaNumero,
      setorId: grupo.setorId,
      setorNome: setor?.nome || grupo.setorNome || "Sem setor",
      items: grupo.items,
      total: grupo.items.reduce(
        (acc, item) => acc + Number(item.price || 0) * Number(item.quantity || 0),
        0
      ),
      observacoes: pedidoData.observacoes || "",
    });

    const docRef = await create(idRestaurante, PRINT_QUEUE_COLL, {
      pedidoId,
      mesaId,
      mesaNumero: mesaNumero || mesaId || "-",
      setorId: grupo.setorId,
      setorNome: setor?.nome || grupo.setorNome || "Sem setor",
      impressoraId: impressora?.id || null,
      impressoraNome: impressora?.nome || null,
      printerSystemName: impressora?.systemPrinter || null,
      tipo: "PEDIDO",
      status: "PENDENTE",
      tentativas: 0,
      payload: {
        ...payload,
        printerSystemName: impressora?.systemPrinter || "",
      },
    });

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

  const grupos = groupItemsBySetor(items, setores || []);
  if (grupos.length === 0) return [];

  const jobs = [];

  for (const grupo of grupos) {
    const setor = (setores || []).find((item) => item.id === grupo.setorId);
    const impressora = (impressoras || []).find(
      (item) => item.setorId === grupo.setorId && item.ativa !== false
    );

    const payload = buildQueuePayload({
      tipo: "CANCELAMENTO",
      pedidoId,
      mesaId,
      mesaNumero,
      setorId: grupo.setorId,
      setorNome: setor?.nome || grupo.setorNome || "Sem setor",
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
      impressoraId: impressora?.id || null,
      impressoraNome: impressora?.nome || null,
      printerSystemName: impressora?.systemPrinter || null,
      tipo: "CANCELAMENTO",
      status: "PENDENTE",
      tentativas: 0,
      payload: {
        ...payload,
        printerSystemName: impressora?.systemPrinter || "",
      },
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
