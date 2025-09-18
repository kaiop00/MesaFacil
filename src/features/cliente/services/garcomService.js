import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "@/config/firebaseConfig";

export async function solicitarGarcom({
    idRestaurante,
    mesaId,
    mesaNumero,
    motivo,
    pedidoId = null,
    itens = [],
    total = 0,
}) {
    if (!idRestaurante || !mesaId) {
        throw new Error("Dados da mesa ou restaurante ausentes para chamar o garçom.");
    }

    const notificacoesRef = collection(db, "restaurantes", idRestaurante, "notificacoes");

    await addDoc(notificacoesRef, {
        tipo: "garcom",
        categoria: "atendimento",
        mesaId,
        mesaNumero: mesaNumero || mesaId,
        motivo: motivo || "",
        pedidoId,
        itens,
        total,
        read: false,
        criadoEm: serverTimestamp(),
        status: "pendente",
        origem: "cliente",
    });
}

