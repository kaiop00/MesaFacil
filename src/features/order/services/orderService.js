import {
    collection,
    getDocs,
    addDoc,
    updateDoc,
    doc,
    serverTimestamp,
    arrayUnion,
} from "firebase/firestore";
import { db } from "@/config/firebaseConfig";
import { runTransaction } from "firebase/firestore";

/**
 * Lista mesas separadas por status
 */
export const getMesasPorStatus = async (idRestaurante) => {
    const mesasRef = collection(db, "restaurantes", idRestaurante, "mesas");
    const snapshot = await getDocs(mesasRef);

    const mesas = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

    const andamento = mesas.filter(
        (m) => m.status?.trim().toLowerCase() === "andamento"
    );
    const livres = mesas.filter(
        (m) => m.status?.trim().toLowerCase() === "livre"
    );
    const entregues = mesas.filter(
        (m) => m.status?.trim().toLowerCase() === "entregue"
    );

    return { andamento, livres, entregues };
};

/**
 * Cria ou atualiza um pedido de uma mesa.
 * Mantém um único pedido em andamento por mesa.
 */
export const createPedido = async (idRestaurante, mesaId, items, total, observacoes = "") => {
    const pedidoItems = items.map((item) => ({
        id: item.id,
        nome: item.nome,
        price: item.price,
        quantity: item.quantity,
        categorias: item.categorias || [],
        alergias: item.alergias || [],
        descricao: item.descricao || "",
        imagemUrl: item.imagemUrl || "",
    }));

    const pedidosRef = collection(
        db,
        "restaurantes",
        idRestaurante,
        "mesas",
        mesaId,
        "pedidos"
    );

    const snapshot = await getDocs(pedidosRef);

    // Tenta encontrar pedido em andamento
    const pedidoExistente = snapshot.docs.find(
        (doc) => doc.data().status === "andamento"
    );

    if (pedidoExistente) {
        // Atualiza pedido existente
        const pedidoRef = doc(pedidosRef, pedidoExistente.id);

        // Garante soma do total com valor atual
        const totalAtual = pedidoExistente.data().total || 0;
        const novoTotal = totalAtual + total;

        await updateDoc(pedidoRef, {
            items: arrayUnion(...pedidoItems), // adiciona sem sobrescrever os existentes
            total: novoTotal,
            atualizadoEm: serverTimestamp(),
            observacoes: observacoes, 
        });

    } else {
        await addDoc(pedidosRef, {
            items: pedidoItems,
            total,
            status: "andamento",
            observacoes,
            criadoEm: serverTimestamp(),
        });
    }

    // Atualiza status da mesa
    const mesaDocRef = doc(db, "restaurantes", idRestaurante, "mesas", mesaId);
    await updateDoc(mesaDocRef, {
        status: "andamento",
    });
};

/**
 * Lista pedidos de uma mesa
 */
export const getPedidosDaMesa = async (idRestaurante, mesaId) => {
    const pedidosRef = collection(
        db,
        "restaurantes",
        idRestaurante,
        "mesas",
        mesaId,
        "pedidos"
    );
    const snapshot = await getDocs(pedidosRef);
    const pedidos = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    return pedidos;
};


/**
 * finalize o pedido e atualiza o stauts da mesa para 'entregue'
 */
export const finalizarPedido = async (idRestaurante, mesaId) => {
    const pedidosRef = collection(db, "restaurantes", idRestaurante, "mesas", mesaId, "pedidos");
    const snapshot = await getDocs(pedidosRef);

    const pedidosAndamento = snapshot.docs.filter(
        (doc) => doc.data().status === "andamento"
    );

    const total = pedidosAndamento.reduce(
        (acc, doc) => acc + (doc.data().total || 0),
        0
    );

    await Promise.all(
        pedidosAndamento.map((docSnap) => {
            const pedidoDocRef = doc(pedidosRef, docSnap.id);
            return updateDoc(pedidoDocRef, {
                status: "entregue",
                finalizadoEm: serverTimestamp(),
            });
        })
    );

    const mesaDocRef = doc(db, "restaurantes", idRestaurante, "mesas", mesaId);
    await updateDoc(mesaDocRef, {
        status: "entregue",
        entregueEm: serverTimestamp(),
        total,
    });
};
