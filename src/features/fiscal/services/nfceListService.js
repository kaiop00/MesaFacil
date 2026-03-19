import { getFunctions, httpsCallable } from "firebase/functions";

const functions = getFunctions();

/**
 * List emitted NFC-es for a restaurant with pagination
 * @param {string} idRestaurante - Restaurant ID
 * @param {number} limit - Number of results per page (default: 50)
 * @param {number} offset - Number of results to skip (default: 0)
 * @returns {Promise<object>} { nfces, total, limit, offset }
 */
export const listarNfces = async (idRestaurante, top = 50, skip = 0) => {
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
