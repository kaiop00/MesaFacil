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
    registrarNotificacao = true,
    registrarPedidoEvento = false,
    evento = "pagamento",
}) {
    if (!idRestaurante || !mesaId) {
        throw new Error("Dados da mesa ou restaurante ausentes para chamar o garçom.");
    }

    const payloadBase = {
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
        evento,
    };

    let notificacaoId = null;

    if (registrarNotificacao) {
        const notificacoesRef = collection(db, "restaurantes", idRestaurante, "notificacoes");
        const docRef = await addDoc(notificacoesRef, payloadBase);
        notificacaoId = docRef.id;
    }

    if (registrarPedidoEvento) {
        const pedidosRef = collection(
            db,
            "restaurantes",
            idRestaurante,
            "mesas",
            mesaId,
            "pedidos"
        );

        const itemsNormalizados = Array.isArray(itens)
            ? itens.map((item) => {
                  const price = item.price ?? item.valor ?? 0;
                  const quantity = item.quantity ?? item.quantidade ?? 1;
                  return {
                      nome: item.nome || item.name || "Item",
                      price,
                      quantity,
                      total: price * quantity,
                  };
              })
            : [];

        const totalNormalizado = typeof total === "number"
            ? total
            : itemsNormalizados.reduce((sum, item) => sum + item.total, 0);

        await addDoc(pedidosRef, {
            items: itemsNormalizados,
            total: totalNormalizado,
            status: "assistencia",
            motivo: motivo || "",
            tipo: "garcom",
            evento,
            origem: "cliente",
            read: false,
            criadoEm: serverTimestamp(),
            pedidoIdOrigem: pedidoId || null,
            notificacaoId: notificacaoId,
            mesaNumero: mesaNumero || mesaId,
            pedidoEvento: true,
        });
    }
}
