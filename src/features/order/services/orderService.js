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
export const createPedido = async (idRestaurante, mesaId, items, total) => {
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

    console.log("📌 [createPedido] Verificando pedidos existentes:", {
        idRestaurante,
        mesaId,
        pedidoItems,
        total,
    });

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
        console.log("✅ [createPedido] Pedido em andamento encontrado:", pedidoExistente.id);

        const pedidoRef = doc(pedidosRef, pedidoExistente.id);

        // Garante soma do total com valor atual
        const totalAtual = pedidoExistente.data().total || 0;
        const novoTotal = totalAtual + total;

        await updateDoc(pedidoRef, {
            items: arrayUnion(...pedidoItems), // adiciona sem sobrescrever os existentes
            total: novoTotal,
            atualizadoEm: serverTimestamp(),
        });

    } else {
        // Cria novo pedido se não existir
        console.log("✅ [createPedido] Nenhum pedido em andamento. Criando novo.");

        await addDoc(pedidosRef, {
            items: pedidoItems,
            total,
            status: "andamento",
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
    console.log("📌 [getPedidosDaMesa] Buscando pedidos para:", {
        idRestaurante,
        mesaId,
    });

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

    console.log("✅ [getPedidosDaMesa] Quantidade:", snapshot.size);
    console.log("✅ [getPedidosDaMesa] Pedidos:", pedidos);

    return pedidos;
};
