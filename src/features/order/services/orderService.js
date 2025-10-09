import {
    collection,
    getDocs,
    updateDoc,
    doc,
    serverTimestamp,
    runTransaction,
    writeBatch,
} from "firebase/firestore";
import { db } from "@/config/firebaseConfig";
import { 
    calcularConsumoIngredientes, 
    processarBaixaEstoque, 
    verificarEstoqueDisponivel 
} from "@/services/ingredientes/ingredientesService";

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
 * Cria um novo pedido para a mesa, mesmo que já exista outro em andamento.
 * Integra com controle de estoque.
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

    // 1. Verificar estoque disponível antes de processar o pedido
    const verificacaoEstoque = await verificarEstoqueDisponivel(idRestaurante, pedidoItems);
    
    if (!verificacaoEstoque.podeProcessar) {
        const itensProblema = verificacaoEstoque.verificacoes
            .filter(v => !v.disponivel)
            .map(v => `${v.itemNome}: ${v.motivo}`)
            .join('\n');
        
        throw new Error(`Estoque insuficiente para processar o pedido:\n\n${itensProblema}`);
    }

    return await runTransaction(db, async (transaction) => {
        const pedidosRef = collection(
            db,
            "restaurantes",
            idRestaurante,
            "mesas",
            mesaId,
            "pedidos"
        );

        // Sempre cria um novo pedido independente de haver outro em andamento
        const newPedidoRef = doc(pedidosRef);
        transaction.set(newPedidoRef, {
            items: pedidoItems,
            total,
            status: "andamento",
            observacoes,
            read: false,
            criadoEm: serverTimestamp(),
        });

        // Atualiza status da mesa
        const mesaDocRef = doc(db, "restaurantes", idRestaurante, "mesas", mesaId);
        transaction.update(mesaDocRef, {
            status: "andamento",
        });

        return newPedidoRef.id;
    }).then(async (pedidoId) => {
        // 2. Processar baixa no estoque após salvar o pedido
        try {
            const consumoIngredientes = await calcularConsumoIngredientes(idRestaurante, pedidoItems);
            
            if (consumoIngredientes.length > 0) {
                await processarBaixaEstoque(idRestaurante, consumoIngredientes, pedidoId);
            }
            
            return { pedidoId, estoqueProcessado: consumoIngredientes.length > 0 };
        } catch (estoqueError) {
            console.error("Erro ao processar baixa no estoque:", estoqueError);
            // O pedido foi salvo, mas houve erro no estoque
            throw new Error(`Pedido criado, mas houve erro ao processar estoque: ${estoqueError.message}`);
        }
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
 * Finaliza o pedido e atualiza o status da mesa para 'entregue'
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

/**
 * Finaliza apenas um pedido específico de uma mesa.
 * Se não restarem pedidos em andamento, marca a mesa como 'entregue' e soma o total dos pedidos entregues.
 */
export const finalizarPedidoEspecifico = async (idRestaurante, mesaId, pedidoId) => {
    // 1) Finaliza o pedido escolhido
    const pedidoDocRef = doc(db, "restaurantes", idRestaurante, "mesas", mesaId, "pedidos", pedidoId);
    await updateDoc(pedidoDocRef, {
        status: "entregue",
        finalizadoEm: serverTimestamp(),
    });

    // 2) Busca todos os pedidos da mesa para decidir o status da mesa
    const pedidosRef = collection(db, "restaurantes", idRestaurante, "mesas", mesaId, "pedidos");
    const snapshot = await getDocs(pedidosRef);
    const pedidos = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));

    const temAndamento = pedidos.some(p => p.status === "andamento");

    const mesaDocRef = doc(db, "restaurantes", idRestaurante, "mesas", mesaId);

    if (!temAndamento) {
        // Soma total dos pedidos entregues
        const totalEntregue = pedidos
            .filter(p => p.status === "entregue")
            .reduce((acc, p) => acc + (p.total || 0), 0);

        await updateDoc(mesaDocRef, {
            status: "entregue",
            entregueEm: serverTimestamp(),
            total: totalEntregue,
        });
    } else {
        // Garante que a mesa continua em andamento
        await updateDoc(mesaDocRef, { status: "andamento" });
    }
};

/**
 * Cancela um pedido e reverte o estoque se necessário
 */
export const cancelarPedido = async (idRestaurante, mesaId, pedidoId) => {
    return await runTransaction(db, async (transaction) => {
        // 1. Buscar o pedido
        const pedidoRef = doc(db, "restaurantes", idRestaurante, "mesas", mesaId, "pedidos", pedidoId);
        const pedidoDoc = await transaction.get(pedidoRef);
        
        if (!pedidoDoc.exists()) {
            throw new Error("Pedido não encontrado");
        }
        
        const pedidoData = pedidoDoc.data();
        
        if (pedidoData.status !== "andamento") {
            throw new Error("Apenas pedidos em andamento podem ser cancelados");
        }
        
        // 2. Atualizar status do pedido
        transaction.update(pedidoRef, {
            status: "cancelado",
            canceladoEm: serverTimestamp(),
        });
        
        // 3. Verificar se há outros pedidos em andamento na mesa
        const pedidosRef = collection(db, "restaurantes", idRestaurante, "mesas", mesaId, "pedidos");
        const allPedidosSnapshot = await getDocs(pedidosRef);
        
        const outrosPedidosAndamento = allPedidosSnapshot.docs.filter(
            doc => doc.id !== pedidoId && doc.data().status === "andamento"
        );
        
        // 4. Atualizar status da mesa se não há outros pedidos em andamento
        if (outrosPedidosAndamento.length === 0) {
            const mesaDocRef = doc(db, "restaurantes", idRestaurante, "mesas", mesaId);
            transaction.update(mesaDocRef, {
                status: "livre",
                total: 0,
            });
        }
        
        return pedidoData.items || [];
    }).then(async (itensCancelados) => {
        // 5. Reverter estoque após a transação
        try {
            if (itensCancelados.length > 0) {
                const consumoIngredientes = await calcularConsumoIngredientes(idRestaurante, itensCancelados);
                
                if (consumoIngredientes.length > 0) {
                    // Reverter = somar de volta ao estoque
                    const reverterIngredientes = consumoIngredientes.map(consumo => ({
                        ...consumo,
                        consumoTotal: -consumo.consumoTotal // Quantidade negativa para reverter
                    }));
                    
                    await processarBaixaEstoque(idRestaurante, reverterIngredientes, `CANCELAMENTO-${pedidoId}`);
                }
            }
            
            return { sucesso: true, itensRevertidos: itensCancelados.length };
        } catch (estoqueError) {
            console.error("Erro ao reverter estoque:", estoqueError);
            // O pedido foi cancelado, mas houve erro na reversão do estoque
            throw new Error(`Pedido cancelado, mas houve erro ao reverter estoque: ${estoqueError.message}`);
        }
    });
};

/**
 * Verifica estoque disponível para itens antes de criar pedido
 */
export const verificarEstoquePedido = async (idRestaurante, items) => {
    return await verificarEstoqueDisponivel(idRestaurante, items);
};

/**
 * Atualiza o status de leitura (read) de um pedido específico.
 */
export const setPedidoReadStatus = async (idRestaurante, mesaId, pedidoId, read) => {
    const pedidoRef = doc(db, "restaurantes", idRestaurante, "mesas", mesaId, "pedidos", pedidoId);
    await updateDoc(pedidoRef, {
        read: !!read,
        lidoEm: read ? serverTimestamp() : null,
    });
};

/** Conveniências para leitura */
export const marcarPedidoComoLido = (idRestaurante, mesaId, pedidoId) =>
    setPedidoReadStatus(idRestaurante, mesaId, pedidoId, true);

export const marcarPedidoComoNaoLido = (idRestaurante, mesaId, pedidoId) =>
    setPedidoReadStatus(idRestaurante, mesaId, pedidoId, false);

/**
 * Reseta a mesa para um novo cliente, limpando pedidos e status.
 */
export const resetMesaParaNovoCliente = async (idRestaurante, mesaId) => {
    if (!idRestaurante || !mesaId) {
        throw new Error("Parâmetros inválidos para resetar mesa");
    }

    const pedidosRef = collection(db, "restaurantes", idRestaurante, "mesas", mesaId, "pedidos");
    const pedidosSnapshot = await getDocs(pedidosRef);
    const batch = writeBatch(db);

    pedidosSnapshot.forEach((pedidoDoc) => {
        const pedidoRef = doc(db, "restaurantes", idRestaurante, "mesas", mesaId, "pedidos", pedidoDoc.id);
        batch.delete(pedidoRef);
    });

    const mesaDocRef = doc(db, "restaurantes", idRestaurante, "mesas", mesaId);
    batch.update(mesaDocRef, {
        status: "livre",
        total: 0,
        entregueEm: null,
        atualizadoEm: serverTimestamp(),
    });

    await batch.commit();
};
