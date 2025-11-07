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

/**
 * Recupera as informações do restaurante.
 * @param {string} idRestaurante
 * @returns {Promise<object|null>}
 */
export const getRestauranteInfo = async (idRestaurante) => {
    if (!idRestaurante) {
        throw new Error("idRestaurante é obrigatório");
    }

    const ref = doc(db, "restaurantes", idRestaurante);
    const snapshot = await getDoc(ref);

    if (!snapshot.exists()) {
        return null;
    }

    const data = snapshot.data() || {};

    const coverData = data?.couvert_artistico || {};

    return {
        id: snapshot.id,
        ...data,
        taxa_servico:
            typeof data.taxa_servico === "number" && Number.isFinite(data.taxa_servico)
                ? data.taxa_servico
                : 10,
        couvert_artistico: {
            ativo: Boolean(coverData?.ativo),
            valor:
                typeof coverData?.valor === "number" && Number.isFinite(coverData.valor)
                    ? Math.max(0, Number(coverData.valor))
                    : 0,
        },
    };
};
