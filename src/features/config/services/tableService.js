import { getAll, create } from "@/services/firebase/firestoreService";
import { serverTimestamp } from "firebase/firestore";

/**
 * Cria várias mesas automaticamente com numeração sequencial
 * @param {string} idRestaurante 
 * @param {number} tipo 
 * @param {number} quantidade 
 */
export const criarMesas = async (idRestaurante, tipo, quantidade) => {
  const todasMesas = await getAll(idRestaurante, "mesas");
  const maiorNumero = todasMesas.length
    ? Math.max(...todasMesas.map((m) => m.numero))
    : 0;

  const novasMesas = Array.from({ length: quantidade }, (_, i) => ({
    numero: maiorNumero + i + 1,
    tipo,
    status: "livre",
    criadoEm: serverTimestamp(),
  }));

  for (const mesa of novasMesas) {
    await create(idRestaurante, "mesas", mesa);
  }
};

/**
 * Retorna todas as mesas do restaurante
 * @param {string} idRestaurante
 */
export const getAllTables = async (idRestaurante) => {
  return await getAll(idRestaurante, "mesas");
}
