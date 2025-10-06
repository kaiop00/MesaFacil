import {
    getFirestore,
    collection,
    doc,
    addDoc,
    setDoc,
    updateDoc,
    deleteDoc,
    onSnapshot,
    getDocs,
    query,
    orderBy,
    serverTimestamp,
} from "firebase/firestore";
import { db } from "@/config/firebaseConfig";


/**
 * Retorna a referência da subcoleção de categorias de um restaurante
 */
function categoriasColRef(idRestaurante) {
    return collection(db, "restaurantes", idRestaurante, "categorias");
}

/**
 * Busca única (não reativa) das categorias
 */
export async function getCategorias(idRestaurante) {
    const q = query(categoriasColRef(idRestaurante), orderBy("nome"));
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

/**
 * Listener reativo de categorias (ordena por nome)
 * Retorna a função de unsubscribe.
 */
export function listenCategorias(idRestaurante, callback) {
    const q = query(categoriasColRef(idRestaurante), orderBy("nome"));
    return onSnapshot(q, (snap) => {
        const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        callback(list);
    });
}

/**
 * Cria uma nova categoria
 * @param {{ nome: string }} data
 * @returns {Promise<{ id: string }>}
 */
export async function addCategoria(idRestaurante, data) {
    const now = serverTimestamp();
    const payload = {
        nome: data.nome?.trim(),
        createdAt: now,
        updatedAt: now,
    };
    const ref = await addDoc(categoriasColRef(idRestaurante), payload);
    return { id: ref.id };
}

/**
 * Atualiza uma categoria existente (merge total)
 * @param {string} idCategoria
 * @param {{ nome?: string }} data
 */
export async function updateCategoria(idRestaurante, idCategoria, data) {
    const ref = doc(db, "restaurantes", idRestaurante, "categorias", idCategoria);
    await updateDoc(ref, {
        ...data,
        updatedAt: serverTimestamp(),
    });
}

/**
 * Cria ou atualiza com base na presença do id
 * - Sem id: cria
 * - Com id: faz set com merge (upsert)
 */
export async function addOrUpdateCategoria(idRestaurante, data) {
    if (data.id) {
        const ref = doc(db, "restaurantes", idRestaurante, "categorias", data.id);
        await setDoc(
            ref,
            {
                nome: data.nome?.trim(),
                updatedAt: serverTimestamp(),
                createdAt: serverTimestamp(),
            },
            { merge: true }
        );
        return { id: data.id, updated: true };
    } else {
        return addCategoria(idRestaurante, data);
    }
}

/**
 * Exclui a categoria pelo id
 */
export async function deleteCategoria(idRestaurante, idCategoria) {
    const ref = doc(db, "restaurantes", idRestaurante, "categorias", idCategoria);
    await deleteDoc(ref);
}

/**
 * Retorna um array com os nomes das categorias do restaurante.
 * - Remove nomes vazios/indefinidos
 * - (Opcional) Remove duplicados (case-insensitive)
 * - (Opcional) Ordena pelo nome (locale pt-BR, ignorando acentos/maiúsculas)
 *
 * @param {string} idRestaurante
 * @param {{ unique?: boolean, sort?: boolean }} [opts]
 * @returns {Promise<string[]>}
 */
export async function getCategoriaNomes(idRestaurante, opts = {}) {
    const { unique = true, sort = true } = opts;

    const q = query(categoriasColRef(idRestaurante), orderBy("nome"));
    const snap = await getDocs(q);

    // coleta nomes válidos
    let nomes = snap.docs
        .map((d) => (d.data()?.nome ?? ""))
        .map((n) => (typeof n === "string" ? n.trim() : ""))
        .filter(Boolean);

    // unicidade (case-insensitive)
    if (unique) {
        const seen = new Set();
        const dedup = [];
        for (const n of nomes) {
            const key = n.toLocaleLowerCase("pt-BR");
            if (!seen.has(key)) {
                seen.add(key);
                dedup.push(n);
            }
        }
        nomes = dedup;
    }

    // ordenação locale (ignora acentos/maiúsculas)
    if (sort) {
        nomes.sort((a, b) =>
            a.localeCompare(b, "pt-BR", { sensitivity: "base" })
        );
    }

    return nomes;
}