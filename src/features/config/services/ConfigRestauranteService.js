import { doc, getDoc, setDoc, updateDoc } from "firebase/firestore";
import { db } from "@/config/firebaseConfig";

/**
 * atualiza u cria os campos cor_base e imagem no documento do restaurante
 * @param {string} idRestaurante
 * @param {{cor_base?: string, imagem_restaurante?: string}}
 */
export const updateRestauranteInfo = async (idRestaurante, data) => {
    const ref = doc(db, "restaurantes", idRestaurante);
    const snapshot = await getDoc(ref);

    if (snapshot.exists()) {
        await updateDoc(ref, data);
    } else {
        await setDoc(ref, {
            ...data,
        });
    }
};