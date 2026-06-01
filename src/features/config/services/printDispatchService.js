import {
  markPrintQueueAsError,
  markPrintQueueAsPrinted,
  retryPrintQueueItem,
} from '@/features/config/services/printQueueService';
import { printToSystemPrinter } from '@/services/printService';

const resolvePrinterName = (queueItem = {}) => {
  return (
    queueItem.printerSystemName ||
    queueItem.systemPrinter ||
    queueItem.impressoraNome ||
    queueItem.payload?.printerSystemName ||
    queueItem.payload?.printerName ||
    queueItem.payload?.systemPrinter ||
    ''
  ).trim();
};

const resolveContent = (queueItem = {}) => {
  return String(
    queueItem.payload?.ticketText ||
      queueItem.ticketText ||
      queueItem.content ||
      queueItem.payload?.ticketHtml ||
      queueItem.ticketHtml ||
      queueItem.payload?.content ||
      ''
  ).trim();
};

const normalizeError = (error) => {
  if (error instanceof Error) return error;
  return new Error(String(error || 'Falha ao conectar impressora'));
};

export const printQueueItemNow = async (idRestaurante, queueItem) => {
  const printerName = resolvePrinterName(queueItem);
  const content = resolveContent(queueItem);

  if (!printerName) {
    throw new Error('Nenhuma impressora do sistema vinculada a este setor');
  }

  if (!content) {
    throw new Error('Conteúdo de impressão vazio');
  }

  try {
    const result = await printToSystemPrinter({
      printerName,
      content,
      jobId: queueItem.id,
    });

    await markPrintQueueAsPrinted(idRestaurante, queueItem.id, {
      printerSystemName: printerName,
      printStrategy: result?.strategy || 'local-service',
      printJobId: result?.jobId || queueItem.id,
    });

    return result;
  } catch (error) {
    const normalizedError = normalizeError(error);
    await markPrintQueueAsError(idRestaurante, queueItem.id, normalizedError.message);
    throw normalizedError;
  }
};

export const printQueueItemsNow = async (idRestaurante, queueItems = []) => {
  const results = [];

  for (const queueItem of queueItems) {
    // Small queues are printed sequentially to preserve the sector order.
    results.push(await printQueueItemNow(idRestaurante, queueItem));
  }

  return results;
};

export const retryAndPrintQueueItem = async (idRestaurante, queueItem) => {
  await retryPrintQueueItem(idRestaurante, queueItem);
  return await printQueueItemNow(idRestaurante, {
    ...queueItem,
    status: 'PENDENTE',
  });
};
