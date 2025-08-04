import { db } from "@/config/firebaseConfig";
import { doc, getDoc } from "firebase/firestore";

export const getMesaById = async (idRestaurante, mesaId) => {
    const ref = doc(db, `restaurantes/${idRestaurante}/mesas/${mesaId}`);
    const snap = await getDoc(ref);
    return snap.exists() ? { id: mesaId, ...snap.data() } : null;
};