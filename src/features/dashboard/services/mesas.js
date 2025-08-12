import { collection, getDocs } from "firebase/firestore";
import { db } from "@/config/firebaseConfig";

/**
 * Lista pedidos de uma mesa
 */
export const showAllOrdersFromTable = async (idRestaurante, mesaId) => {
  const pedidosRef = collection(
    db,
    "restaurantes",
    idRestaurante,
    "mesas",
    mesaId,
    "pedidos",
  );
  const snapshot = await getDocs(pedidosRef);
  const pedidos = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  console.log('[pedidos]', pedidos);
  return pedidos;
};
