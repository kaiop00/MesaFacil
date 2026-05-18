import {
    collection,
    getDocs,
    getDoc,
    setDoc,
    updateDoc,
    deleteDoc,
    doc,
    serverTimestamp,
    runTransaction,
    writeBatch,
} from "firebase/firestore";
import { db } from "@/config/firebaseConfig";
import * as caixaService from '@/services/caixa/caixaService';
import { 
    calcularConsumoIngredientes, 
    processarBaixaEstoque, 
    verificarEstoqueDisponivel 
} from "@/services/ingredientes/ingredientesService";
import { 
    isIfoodOrder, 
    updateIfoodOrderStatusFromMesaFacil 
} from "@/features/integrations/ifood/services/ifoodStatusSyncService";

const historicoCollection = (idRestaurante) =>
    collection(db, "restaurantes", idRestaurante, "historicoPedidos");

const calcularTotalPedido = (pedidoData = {}) => {
    if (typeof pedidoData.total === "number") {
        return pedidoData.total;
    }

    return (pedidoData.items || []).reduce((acc, item) => {
        const quantity = Number(item?.quantity || 0);
        const price = Number(item?.price || 0);
        return acc + quantity * price;
    }, 0);
};

const sanitizeMesaNumero = (mesa = {}, mesaId) => {
    if (!mesa) return mesaId;
    return mesa.numero ?? mesa.nome ?? mesaId;
};

const salvarPedidoNoHistorico = async ({
    idRestaurante,
    mesaId,
    mesaNumero,
    pedidoId,
    pedidoData,
    finalizadoEm,
    status = "entregue",
    formaPagamento = null,
    observacoesPagamento = null,
    troco = null,
    pagamentos = null,
    pagamentoCartao = null,
    gorjeta = null,
    motivoCancelamento = null,
    canceladoPor = null,
    canceladoEm = null,
    itensCancelados = [],
}) => {
    if (!idRestaurante || !mesaId || !pedidoId || !pedidoData) {
        return;
    }

    const historicoRef = doc(historicoCollection(idRestaurante), pedidoId);

    const payload = {
        pedidoId,
        mesaId,
        mesaNumero: mesaNumero ?? mesaId,
        status,
        total: calcularTotalPedido(pedidoData),
        observacoes: pedidoData.observacoes || "",
        items: pedidoData.items || [],
        criadoEm: pedidoData.criadoEm || serverTimestamp(),
        finalizadoEm: finalizadoEm || pedidoData.finalizadoEm || null,
        archivedAt: serverTimestamp(),
        formaPagamento: formaPagamento || pedidoData.formaPagamento || null,
        observacoesPagamento: observacoesPagamento || pedidoData.observacoesPagamento || null,
        troco: troco?.precisaTroco ? troco : (pedidoData.troco || null),
        pagamentos: Array.isArray(pagamentos) && pagamentos.length > 0 ? pagamentos : (pedidoData.pagamentos || null),
        pagamentoCartao: pagamentoCartao || pedidoData.pagamentoCartao || null,
        gorjeta: Number(gorjeta || pedidoData.gorjeta || 0) > 0 ? Number(gorjeta || pedidoData.gorjeta || 0) : null,
        adiantamentos: Array.isArray(pedidoData.adiantamentos) ? pedidoData.adiantamentos : [],
        motivoCancelamento: motivoCancelamento || pedidoData.motivoCancelamento || null,
        canceladoPor: canceladoPor || pedidoData.canceladoPor || null,
        canceladoEm: canceladoEm || pedidoData.canceladoEm || null,
        itensCancelados: Array.isArray(itensCancelados) && itensCancelados.length > 0
            ? itensCancelados
            : (Array.isArray(pedidoData.itensCancelados) ? pedidoData.itensCancelados : []),
    };

    await setDoc(historicoRef, payload, { merge: true });
};

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
export const createPedido = async (idRestaurante, mesaId, items, total, observacoes = "", extraData = {}) => {
    const pedidoItems = items.map((item) => ({
        id: item.id,
        nome: item.nome,
        price: item.price,
        quantity: item.quantity,
        categorias: item.categorias || [],
        alergias: item.alergias || [],
        descricao: item.descricao || "",
        imagemUrl: item.imagemUrl || "",
        ncm: item.ncm || null,
        tipoTributacao: item.tipoTributacao || (item.monofasico ? "monofasico" : "normal"),
        monofasico: Boolean(item.monofasico || item.isMonofasico || item.tipoTributacao === "monofasico"),
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
        
        // Monta o payload do pedido com dados extras (origem, cliente, etc)
        const pedidoPayload = {
            items: pedidoItems,
            total,
            status: "andamento",
            observacoes,
            read: false,
            criadoEm: serverTimestamp(),
            // Campos adicionais para WhatsApp e outras origens
            orderOrigin: extraData.orderOrigin || 'mesaconvencional',
            ...(extraData.tipoEntrega && { tipoEntrega: extraData.tipoEntrega }),
            ...(extraData.cliente && { cliente: extraData.cliente }),
            ...(extraData.formaPagamento && { formaPagamento: extraData.formaPagamento }),
            ...(extraData.troco && { troco: extraData.troco }),
            ...(extraData.taxaEntrega && { taxaEntrega: extraData.taxaEntrega }),
        };
        
        transaction.set(newPedidoRef, pedidoPayload);

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
export const finalizarPedido = async (idRestaurante, mesaId, dadosPagamento = {}) => {
    const { formaPagamento = null, observacoesPagamento = null, troco = null, pagamentos = null, pagamentoCartao = null, gorjeta = null } = dadosPagamento;
    const gorjetaTotal = Number(gorjeta || 0);

    console.debug('[orderService.finalizarPedido] payload recebido', {
        idRestaurante,
        mesaId,
        formaPagamento,
        observacoesPagamento,
        hasTroco: Boolean(troco),
        pagamentos,
        pagamentoCartao,
        gorjeta: gorjetaTotal,
    });
    
    const pedidosRef = collection(db, "restaurantes", idRestaurante, "mesas", mesaId, "pedidos");
    const snapshot = await getDocs(pedidosRef);

    const pedidosAndamento = snapshot.docs.filter(
        (doc) => doc.data().status === "andamento"
    );

    const total = pedidosAndamento.reduce(
        (acc, doc) => acc + (doc.data().total || 0),
        0
    );

    const mesaDocRef = doc(db, "restaurantes", idRestaurante, "mesas", mesaId);
    const mesaSnapshot = await getDoc(mesaDocRef);
    const mesaData = mesaSnapshot.exists() ? mesaSnapshot.data() : {};

    await Promise.all(
        pedidosAndamento.map(async (docSnap, index) => {
            const pedidoDocRef = doc(pedidosRef, docSnap.id);
            const finalizadoEm = serverTimestamp();
            const gorjetaDoPedido = index === 0 ? gorjetaTotal : 0;
            
            const updateData = {
                status: "entregue",
                finalizadoEm,
            };
            
            // Adiciona forma de pagamento se fornecida
            if (formaPagamento) {
                updateData.formaPagamento = formaPagamento;
            }
            if (observacoesPagamento) {
                updateData.observacoesPagamento = observacoesPagamento;
            }
            if (troco?.precisaTroco) {
                updateData.troco = troco;
            }
            if (Array.isArray(pagamentos) && pagamentos.length > 0) {
                updateData.pagamentos = pagamentos;
            }
            if (pagamentoCartao && typeof pagamentoCartao === "object") {
                updateData.pagamentoCartao = pagamentoCartao;
            }
            
            await updateDoc(pedidoDocRef, updateData);

            console.debug('[orderService.finalizarPedido] pedido atualizado', {
                pedidoId: docSnap.id,
                updateData,
            });
            
            await salvarPedidoNoHistorico({
                idRestaurante,
                mesaId,
                mesaNumero: sanitizeMesaNumero(mesaData, mesaId),
                pedidoId: docSnap.id,
                pedidoData: docSnap.data(),
                finalizadoEm,
                status: "entregue",
                formaPagamento,
                observacoesPagamento,
                troco,
                pagamentos,
                pagamentoCartao,
                ...(gorjetaDoPedido > 0 ? { gorjeta: gorjetaDoPedido } : {}),
            });
            // Registrar pagamento automático no Caixa (não bloqueia o fluxo)
            try {
                const valorPago = (docSnap.data().total || 0);
                const forma = formaPagamento || (docSnap.data().formaPagamento || null);
                if (forma) {
                    await caixaService.registrarPagamentoPedido({
                        empresaId: idRestaurante,
                        pedidoId: docSnap.id,
                        formaPagamento: forma,
                        valor: valorPago,
                        taxaCartao: pagamentoCartao ? pagamentoCartao.taxa : 0,
                        gorjeta: gorjetaDoPedido,
                    });
                }
            } catch (err) {
                console.warn('Não foi possível registrar pagamento no caixa:', err.message || err);
            }
        })
    );

    await updateDoc(mesaDocRef, {
        status: "entregue",
        entregueEm: serverTimestamp(),
        total,
    });
};

/**
 * Finaliza um pedido específico (usado no DetailOrderModal)
 * Remove o pedido da subcoleção e mantém apenas no histórico
 */
export const finalizarPedidoEspecifico = async (
    idRestaurante,
    mesaId,
    pedidoId,
    dadosPagamento = {},
    removerDaLista = true,
    options = {}
) => {
    const { formaPagamento = null, observacoesPagamento = null, troco = null, pagamentos = null, pagamentoCartao = null, gorjeta = null } = dadosPagamento;
    const { statusFinal = "entregue", syncIfoodStatus = true } = options;
    const gorjetaTotal = Number(gorjeta || 0);
    
    const pedidoDocRef = doc(db, "restaurantes", idRestaurante, "mesas", mesaId, "pedidos", pedidoId);
    const pedidoSnapshot = await getDoc(pedidoDocRef);

    if (!pedidoSnapshot.exists()) {
        throw new Error("Pedido não encontrado");
    }

    const pedidoData = pedidoSnapshot.data();

    const mesaDocRef = doc(db, "restaurantes", idRestaurante, "mesas", mesaId);
    const mesaSnapshot = await getDoc(mesaDocRef);
    const mesaData = mesaSnapshot.exists() ? mesaSnapshot.data() : {};

    const finalizadoEm = serverTimestamp();

    // Salva no histórico se removerDaLista for true
    if (removerDaLista) {
        await salvarPedidoNoHistorico({
            idRestaurante,
            mesaId,
            mesaNumero: sanitizeMesaNumero(mesaData, mesaId),
            pedidoId,
            pedidoData: {
                ...pedidoData,
                formaPagamento,
                observacoesPagamento,
                troco,
                pagamentos,
                pagamentoCartao,
                ...(gorjeta !== null && gorjeta > 0 ? { gorjeta } : {}),
            },
            finalizadoEm,
            status: statusFinal,
            formaPagamento,
            observacoesPagamento,
            troco,
            pagamentos,
            pagamentoCartao,
                ...(gorjetaTotal > 0 ? { gorjeta: gorjetaTotal } : {}),
            itensCancelados: pedidoData.itensCancelados || [],
        });
        // Registrar pagamento automático no Caixa (não bloqueia o fluxo)
        try {
            const valorPago = Number(pedidoData.total || 0);
            const forma = formaPagamento || (pedidoData.formaPagamento || null);
            if (forma) {
                    await caixaService.registrarPagamentoPedido({
                        empresaId: idRestaurante,
                        pedidoId,
                        formaPagamento: forma,
                        valor: valorPago,
                        taxaCartao: pagamentoCartao ? pagamentoCartao.taxa : 0,
                        gorjeta: gorjetaTotal,
                    });
            }
        } catch (err) {
            console.warn('Não foi possível registrar pagamento no caixa (pedido específico):', err.message || err);
        }
    }

    // Update iFood order status if this is an iFood order
    if (isIfoodOrder(mesaId) && syncIfoodStatus) {
        try {
            await updateIfoodOrderStatusFromMesaFacil(idRestaurante, pedidoId, statusFinal);
        } catch (error) {
            console.error('Error updating iFood order status:', error);
            // Don't fail the entire operation if iFood update fails
        }
    }

    // Apenas atualiza o status do pedido se não for remover da lista
    if (removerDaLista) {
        // Delete o pedido da subcoleção da mesa
        await deleteDoc(pedidoDocRef);
    } else {
        // Apenas atualiza o status para entregue
        await updateDoc(pedidoDocRef, {
            status: statusFinal,
            finalizadoEm,
            ...(formaPagamento ? { formaPagamento } : {}),
            ...(observacoesPagamento ? { observacoesPagamento } : {}),
            ...(troco?.precisaTroco ? { troco } : {}),
            ...(Array.isArray(pagamentos) && pagamentos.length > 0 ? { pagamentos } : {}),
            ...(pagamentoCartao && typeof pagamentoCartao === "object" ? { pagamentoCartao } : {}),
            ...(gorjetaTotal > 0 ? { gorjeta: gorjetaTotal } : {}),
        });
    }

    // Busca todos os pedidos restantes da mesa para decidir o status da mesa
    const pedidosRef = collection(db, "restaurantes", idRestaurante, "mesas", mesaId, "pedidos");
    const snapshot = await getDocs(pedidosRef);
    const pedidos = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));

    const temAndamento = pedidos.some(p => p.status === "andamento");
    const temEntregue = pedidos.some(p => p.status === "entregue");
    const temPedidosAtivos = pedidos.some(p => p.status !== "cancelado");

    if (removerDaLista && !temPedidosAtivos) {
        // Se não há mais pedidos, libera a mesa
        await updateDoc(mesaDocRef, {
            status: "livre",
            entregueEm: serverTimestamp(),
            total: 0,
        });
    } else if (!temAndamento && temEntregue) {
        // Se ainda há pedidos mas nenhum em andamento, marca como entregue
        const totalEntregue = pedidos
            .filter(p => p.status === "entregue")
            .reduce((acc, p) => acc + (p.total || 0), 0);

        await updateDoc(mesaDocRef, {
            status: "entregue",
            entregueEm: serverTimestamp(),
            total: totalEntregue,
        });
    } else {
        // Garante que a mesa continua em andamento ou volta a livre se só houver cancelados
        await updateDoc(mesaDocRef, {
            status: temAndamento ? "andamento" : "livre",
            ...(temAndamento ? {} : { total: 0, entregueEm: serverTimestamp() }),
        });
    }
};

export const cancelarItemPedido = async (
    idRestaurante,
    mesaId,
    pedidoId,
    {
        itemIndex,
        quantidade = 1,
        motivoCancelamento = null,
        canceladoPor = null,
    } = {}
) => {
    return await runTransaction(db, async (transaction) => {
        const pedidoRef = doc(db, "restaurantes", idRestaurante, "mesas", mesaId, "pedidos", pedidoId);
        const mesaDocRef = doc(db, "restaurantes", idRestaurante, "mesas", mesaId);
        const pedidoDoc = await transaction.get(pedidoRef);
        const mesaSnapshot = await transaction.get(mesaDocRef);

        if (!pedidoDoc.exists()) {
            throw new Error("Pedido não encontrado");
        }

        const pedidoData = pedidoDoc.data();
        if (pedidoData.status !== "andamento") {
            throw new Error("Apenas pedidos em andamento podem ter itens cancelados");
        }

        const pedidoItems = Array.isArray(pedidoData.items) ? [...pedidoData.items] : [];
        const targetIndex = Number(itemIndex);

        if (!Number.isInteger(targetIndex) || targetIndex < 0 || targetIndex >= pedidoItems.length) {
            throw new Error("Item não encontrado");
        }

        const targetItem = pedidoItems[targetIndex];
        const quantidadeAtual = Math.max(1, Number(targetItem.quantity || 1));
        const quantidadeCancelada = Math.max(1, Math.min(Number(quantidade || 1), quantidadeAtual));
        const remainingQuantity = quantidadeAtual - quantidadeCancelada;
        const price = Number(targetItem.price || 0);
        const totalCancelado = Number((price * quantidadeCancelada).toFixed(2));

        if (remainingQuantity > 0) {
            pedidoItems[targetIndex] = {
                ...targetItem,
                quantity: remainingQuantity,
            };
        } else {
            pedidoItems.splice(targetIndex, 1);
        }

        const novoTotal = Number(
            pedidoItems.reduce((acc, item) => {
                const itemQuantity = Number(item.quantity || 0);
                const itemPrice = Number(item.price || 0);
                return acc + itemQuantity * itemPrice;
            }, 0).toFixed(2)
        );

        const cancelamentoRegistro = {
            itemIndex: targetIndex,
            itemId: targetItem.id,
            nome: targetItem.nome,
            quantidade: quantidadeCancelada,
            price,
            total: totalCancelado,
            motivoCancelamento,
            canceladoPor,
            canceladoEm: new Date().toISOString(),
        };

        const itensCanceladosAtuais = Array.isArray(pedidoData.itensCancelados) ? pedidoData.itensCancelados : [];

        const pedidoAtualizado = {
            ...pedidoData,
            items: pedidoItems,
            total: novoTotal,
            itensCancelados: [...itensCanceladosAtuais, cancelamentoRegistro],
            status: pedidoItems.length === 0 ? "cancelado" : pedidoData.status,
            ...(pedidoItems.length === 0 ? {
                canceladoEm: serverTimestamp(),
                motivoCancelamento: motivoCancelamento || pedidoData.motivoCancelamento || null,
                canceladoPor: canceladoPor || pedidoData.canceladoPor || null,
            } : {}),
        };

        transaction.update(pedidoRef, {
            items: pedidoItems,
            total: novoTotal,
            itensCancelados: [...itensCanceladosAtuais, cancelamentoRegistro],
            status: pedidoItems.length === 0 ? "cancelado" : pedidoData.status,
            ...(pedidoItems.length === 0 ? {
                canceladoEm: serverTimestamp(),
                motivoCancelamento: motivoCancelamento || pedidoData.motivoCancelamento || null,
                canceladoPor: canceladoPor || pedidoData.canceladoPor || null,
            } : {}),
        });

        const pedidosRef = collection(db, "restaurantes", idRestaurante, "mesas", mesaId, "pedidos");
        const snapshot = await getDocs(pedidosRef);
        const pedidos = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

        const pedidoAtualAtivo = pedidoItems.length > 0;
        const temAndamento = pedidoAtualAtivo || pedidos.some((p) => p.id !== pedidoId && p.status === "andamento");
        const temEntregue = pedidos.some((p) => p.id !== pedidoId && p.status === "entregue");
        const temPedidosAtivos = pedidoAtualAtivo || pedidos.some((p) => p.id !== pedidoId && p.status !== "cancelado");

        if (!temPedidosAtivos) {
            transaction.update(mesaDocRef, {
                status: "livre",
                total: 0,
                entregueEm: serverTimestamp(),
            });
        } else if (temAndamento) {
            transaction.update(mesaDocRef, { status: "andamento" });
        } else if (temEntregue) {
            const totalEntregue = pedidos
                .filter((p) => p.status === "entregue")
                .reduce((acc, p) => acc + (p.total || 0), 0);

            transaction.update(mesaDocRef, {
                status: "entregue",
                entregueEm: serverTimestamp(),
                total: totalEntregue,
            });
        } else {
            transaction.update(mesaDocRef, { status: "andamento" });
        }

        return {
            sucesso: true,
            totalCancelado,
            quantidadeCancelada,
            remainingItems: pedidoItems.length,
            cancelamentoRegistro,
            pedidoAtualizado,
            mesaNumero: mesaSnapshot.exists() ? sanitizeMesaNumero(mesaSnapshot.data(), mesaId) : mesaId,
        };
    }).then(async ({ totalCancelado, quantidadeCancelada, remainingItems, pedidoAtualizado, mesaNumero }) => {
        if (remainingItems === 0 && pedidoAtualizado) {
            await salvarPedidoNoHistorico({
                idRestaurante,
                mesaId,
                mesaNumero,
                pedidoId,
                pedidoData: pedidoAtualizado,
                status: "cancelado",
                canceladoEm: new Date(),
                motivoCancelamento: pedidoAtualizado.motivoCancelamento || null,
                canceladoPor: pedidoAtualizado.canceladoPor || null,
                itensCancelados: pedidoAtualizado.itensCancelados || [],
            });
        }

        return {
            sucesso: true,
            totalCancelado,
            quantidadeCancelada,
            remainingItems,
        };
    });
};
/**
 * Cancela um pedido e reverte o estoque se necessário
 */
export const cancelarPedido = async (
    idRestaurante,
    mesaId,
    pedidoId,
    { motivoCancelamento = null, canceladoPor = null } = {}
) => {
    return await runTransaction(db, async (transaction) => {
        // 1. Buscar o pedido
        const pedidoRef = doc(db, "restaurantes", idRestaurante, "mesas", mesaId, "pedidos", pedidoId);
        const mesaDocRef = doc(db, "restaurantes", idRestaurante, "mesas", mesaId);
        const pedidoDoc = await transaction.get(pedidoRef);
        const mesaSnapshot = await transaction.get(mesaDocRef);
        
        if (!pedidoDoc.exists()) {
            throw new Error("Pedido não encontrado");
        }
        
        const pedidoData = pedidoDoc.data();
        
        if (pedidoData.status !== "andamento") {
            throw new Error("Apenas pedidos em andamento podem ser cancelados");
        }

        const mesaData = mesaSnapshot.exists() ? mesaSnapshot.data() : {};
        
        // 2. Atualizar status do pedido
        transaction.update(pedidoRef, {
            status: "cancelado",
            canceladoEm: serverTimestamp(),
            motivoCancelamento: motivoCancelamento || null,
            canceladoPor: canceladoPor || null,
        });
        
        // 3. Verificar se há outros pedidos em andamento na mesa
        const pedidosRef = collection(db, "restaurantes", idRestaurante, "mesas", mesaId, "pedidos");
        const allPedidosSnapshot = await getDocs(pedidosRef);
        
        const outrosPedidosAndamento = allPedidosSnapshot.docs.filter(
            doc => doc.id !== pedidoId && doc.data().status === "andamento"
        );
        
        // 4. Atualizar status da mesa se não há outros pedidos em andamento
        if (outrosPedidosAndamento.length === 0) {
            transaction.update(mesaDocRef, {
                status: "livre",
                total: 0,
            });
        }
        
        return {
            itensCancelados: pedidoData.items || [],
            pedidoData,
            mesaNumero: sanitizeMesaNumero(mesaData, mesaId),
        };
    }).then(async ({ itensCancelados, pedidoData, mesaNumero }) => {
        const canceladoEmDate = new Date();

        await salvarPedidoNoHistorico({
            idRestaurante,
            mesaId,
            mesaNumero,
            pedidoId,
            pedidoData: {
                ...pedidoData,
                status: "cancelado",
                canceladoEm: canceladoEmDate,
                motivoCancelamento,
                canceladoPor,
            },
            status: "cancelado",
            canceladoEm: canceladoEmDate,
            motivoCancelamento,
            canceladoPor,
        });

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
            
            // Update iFood order status if this is an iFood order
            if (isIfoodOrder(mesaId)) {
                try {
                    await updateIfoodOrderStatusFromMesaFacil(idRestaurante, pedidoId, 'cancelado');
                } catch (error) {
                    console.error('Error updating iFood order status on cancellation:', error);
                    // Don't fail the operation if iFood update fails
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
