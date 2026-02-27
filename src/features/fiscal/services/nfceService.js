import { httpsCallable } from "firebase/functions";
import { functions } from "@/config/firebaseConfig";

/**
 * Registra a empresa do restaurante na Nuvem Fiscal.
 * Chama a Firebase Function `nfceRegistrarEmpresa`.
 * @param {{ idRestaurante: string }} params
 * @returns {Promise<object>}
 */
export async function registrarEmpresa({ idRestaurante }) {
  const fn = httpsCallable(functions, "nfceRegistrarEmpresa");
  const result = await fn({ idRestaurante });
  return result.data;
}

/**
 * Emite uma NFC-e para um pedido.
 * Chama a Firebase Function `nfceEmitir`.
 * @param {{ idRestaurante: string, mesaId: string, pedidoId: string, cpfConsumidor?: string }} params
 * @returns {Promise<object>} { success, nfceId, chaveAcesso, status }
 */
export async function emitirNfce({ idRestaurante, mesaId, pedidoId, cpfConsumidor }) {
  const fn = httpsCallable(functions, "nfceEmitir");
  const result = await fn({ idRestaurante, mesaId, pedidoId, cpfConsumidor: cpfConsumidor || null });
  return result.data;
}

/**
 * Consulta o status de uma NFC-e emitida.
 * Chama a Firebase Function `nfceConsultar`.
 * @param {{ idRestaurante: string, nfceId: string }} params
 * @returns {Promise<object>}
 */
export async function consultarNfce({ idRestaurante, nfceId }) {
  const fn = httpsCallable(functions, "nfceConsultar");
  const result = await fn({ idRestaurante, nfceId });
  return result.data;
}
