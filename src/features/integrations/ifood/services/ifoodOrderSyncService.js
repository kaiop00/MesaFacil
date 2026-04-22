import { createPedido } from "@/features/order/services/orderService";
import { getIfoodOrderFromFirestore, updateIfoodOrderStatus } from "./ifoodService";
import { getIfoodItemMappings } from "./ifoodItemMappingService";
import { getAll } from "@/services/firebase/firestoreService";

/**
 * Create a unified virtual table for all iFood orders
 * All order types (DELIVERY, TAKEOUT) share a single table
 * @param {string} idRestaurante - Restaurant ID
 * @returns {Promise<string>} - Table ID
 */
export const getOrCreateIfoodTable = async (idRestaurante) => {
    const { doc, getDoc, setDoc, serverTimestamp } = await import("firebase/firestore");
    const { db } = await import("@/config/firebaseConfig");
    
    const ifoodTableId = "ifood";
    const tableName = "iFood";
    const tableDescription = "Mesa virtual para pedidos do iFood";
    
    const tableRef = doc(db, "restaurantes", idRestaurante, "mesas", ifoodTableId);
    
    // Check if table exists
    const tableSnap = await getDoc(tableRef);
    
    if (!tableSnap.exists()) {
        // Create the virtual table
        await setDoc(tableRef, {
            numero: tableName,
            nome: tableName,
            capacidade: 999,
            status: "ocupada",
            tipo: "virtual",
            descricao: tableDescription,
            createdAt: serverTimestamp(),
            isVirtual: true,
            source: "ifood",
        });
        console.log("Created unified virtual table for iFood orders:", ifoodTableId);
    }
    
    return ifoodTableId;
};

/**
 * Transform iFood order items to MesaFacil format
 * Now supports item mapping to match MesaFacil cardapio items
 */
const transformIfoodItems = async (ifoodItems, idRestaurante) => {
    // Get item mappings
    const mappings = await getIfoodItemMappings(idRestaurante);
    
    // Get cardapio items to get full details
    const cardapioItems = await getAll(idRestaurante, "cardapio");
    const cardapioMap = new Map(cardapioItems.map(item => [item.id, item]));
    
    return ifoodItems.map(item => {
        const ifoodItemId = item.externalCode || item.id;
        const mappedItemId = mappings[ifoodItemId];
        
        // If mapped, use MesaFacil item data
        if (mappedItemId && cardapioMap.has(mappedItemId)) {
            const mesaFacilItem = cardapioMap.get(mappedItemId);
            
            return {
                id: mesaFacilItem.id,
                nome: mesaFacilItem.nome,
                price: item.totalPrice || (item.unitPrice * item.quantity) || 0, // Use iFood price for billing
                quantity: item.quantity || 1,
                categorias: mesaFacilItem.categorias || [],
                alergias: mesaFacilItem.alergias || [],
                descricao: mesaFacilItem.descricao || "",
                imagemUrl: mesaFacilItem.imagemUrl || "",
                preco: mesaFacilItem.preco || 0, // Original MesaFacil price
                ingredientes: mesaFacilItem.ingredientes || [], // For stock control
                // Store mapping info
                isMapped: true,
                mesaFacilItemId: mappedItemId,
                // Store iFood-specific data
                ifoodData: {
                    id: item.id,
                    name: item.name, // Original iFood name
                    externalCode: item.externalCode,
                    totalPrice: item.totalPrice,
                    unitPrice: item.unitPrice,
                    options: item.options || [],
                }
            };
        }
        
        // If not mapped, use iFood data as-is (no stock control)
        return {
            id: item.externalCode || item.id,
            nome: item.name,
            price: item.unitPrice || item.price || 0,
            quantity: item.quantity || 1,
            categorias: [],
            alergias: [],
            descricao: item.observations || "",
            imagemUrl: "",
            isMapped: false,
            // Store iFood-specific data
            ifoodData: {
                id: item.id,
                externalCode: item.externalCode,
                totalPrice: item.totalPrice,
                options: item.options || [],
            }
        };
    });
};

/**
 * Create MesaFacil order from iFood order
 * This function syncs an iFood order to the MesaFacil order system
 */
export const syncIfoodOrderToMesaFacil = async (idRestaurante, ifoodOrderId) => {
    try {
        // Get iFood order from Firestore
        const ifoodOrder = await getIfoodOrderFromFirestore(idRestaurante, ifoodOrderId);
        
        if (!ifoodOrder) {
            throw new Error(`iFood order ${ifoodOrderId} not found`);
        }
        
        // Check if already synced to MesaFacil
        if (ifoodOrder.mesaFacilOrderId) {
            console.log(`iFood order ${ifoodOrderId} already synced to MesaFacil`);
            return {
                success: true,
                alreadySynced: true,
                mesaFacilOrderId: ifoodOrder.mesaFacilOrderId,
            };
        }
        
        // Get or create virtual table for iFood orders based on order type
        const orderType = ifoodOrder.orderType || "DELIVERY";
        const mesaId = await getOrCreateIfoodTable(idRestaurante, orderType);
        
        // Transform items with mapping support
        const items = await transformIfoodItems(ifoodOrder.items || [], idRestaurante);
        
        // Calculate total (use iFood's orderAmount)
        const total = ifoodOrder.total?.orderAmount || 0;
        
        // Create observations with customer and delivery info
        const isTakeout = orderType === "TAKEOUT";
        const isScheduled = ifoodOrder.orderTiming === "SCHEDULED" || ifoodOrder.isScheduled;
        const observationParts = [
            `Cliente iFood: ${ifoodOrder.customer?.name || "N/A"}`,
            ifoodOrder.customer?.phone ? `Tel: ${ifoodOrder.customer.phone}` : "",
        ];
        
        // Only add delivery address for DELIVERY orders
        if (!isTakeout && ifoodOrder.delivery?.address) {
            observationParts.push(
                `Endereço: ${ifoodOrder.delivery.address.formattedAddress || ifoodOrder.delivery.address.streetName || ""}`
            );
        }
        
        if (ifoodOrder.delivery?.observations) {
            observationParts.push(`Obs: ${ifoodOrder.delivery.observations}`);
        }
        
        // Add order type indicator
        if (isTakeout) {
            observationParts.push("🏪 PEDIDO PARA RETIRADA");
        }
        
        // Add scheduled time indicator
        if (isScheduled) {
            let scheduledText = "📅 PEDIDO AGENDADO";
            if (ifoodOrder.scheduledFor) {
                // Handle both Firestore Timestamp and ISO string
                const scheduledDate = ifoodOrder.scheduledFor.toDate 
                    ? ifoodOrder.scheduledFor.toDate() 
                    : new Date(ifoodOrder.scheduledFor);
                scheduledText += ` para ${scheduledDate.toLocaleString('pt-BR', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                })}`;
            } else if (ifoodOrder.schedule?.deliveryDateTimeStart) {
                const scheduledDate = new Date(ifoodOrder.schedule.deliveryDateTimeStart);
                scheduledText += ` para ${scheduledDate.toLocaleString('pt-BR', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                })}`;
            }
            observationParts.push(scheduledText);
        }
        
        observationParts.push(`Pedido iFood #${ifoodOrder.displayId || ifoodOrderId}`);
        
        const observations = observationParts.filter(Boolean).join("\n");
        
        // Create order in MesaFacil system
        // Note: We skip stock verification for iFood orders since they're already confirmed
        const result = await createPedido(
            idRestaurante,
            mesaId,
            items,
            total,
            observations
        );
        
        // Update iFood order with MesaFacil order reference
        await updateIfoodOrderStatus(idRestaurante, ifoodOrderId, ifoodOrder.status, {
            mesaFacilOrderId: result.pedidoId,
            syncedToMesaFacil: true,
            syncedToMesaFacilAt: new Date().toISOString(),
        });
        
        return {
            success: true,
            mesaFacilOrderId: result.pedidoId,
            ifoodOrderId,
        };
        
    } catch (error) {
        console.error("Error syncing iFood order to MesaFacil:", error);
        
        // Update iFood order with sync error
        try {
            await updateIfoodOrderStatus(idRestaurante, ifoodOrderId, "sync_error", {
                syncError: error.message,
                lastSyncAttempt: new Date().toISOString(),
            });
        } catch (updateError) {
            console.error("Error updating sync status:", updateError);
        }
        
        throw error;
    }
};

/**
 * Auto-sync all pending iFood orders
 * This is called by the polling system (every 2 minutes via Cloud Scheduler)
 */
export const autoSyncPendingIfoodOrders = async (idRestaurante) => {
    try {
        const { getAllIfoodOrders } = await import("./ifoodService");
        
        // Get all iFood orders that haven't been synced yet
        const allOrders = await getAllIfoodOrders(idRestaurante);
        const pendingOrders = allOrders.filter(order => 
            !order.mesaFacilOrderId && 
            !order.syncError &&
            order.status !== "CANCELLED"
        );
        
        const results = {
            total: pendingOrders.length,
            synced: 0,
            failed: 0,
            errors: [],
        };
        
        for (const order of pendingOrders) {
            try {
                await syncIfoodOrderToMesaFacil(idRestaurante, order.id);
                results.synced++;
            } catch (error) {
                results.failed++;
                results.errors.push({
                    orderId: order.id,
                    error: error.message,
                });
            }
        }
        
        return results;
        
    } catch (error) {
        console.error("Error in auto-sync:", error);
        throw error;
    }
};

/**
 * Get iFood order statistics for a restaurant
 */
export const getIfoodOrderStats = async (idRestaurante) => {
    try {
        const { getAllIfoodOrders } = await import("./ifoodService");
        const orders = await getAllIfoodOrders(idRestaurante);
        
        return {
            total: orders.length,
            synced: orders.filter(o => o.mesaFacilOrderId).length,
            pending: orders.filter(o => !o.mesaFacilOrderId && !o.syncError).length,
            errors: orders.filter(o => o.syncError).length,
            cancelled: orders.filter(o => o.status === "CANCELLED").length,
            byStatus: orders.reduce((acc, order) => {
                acc[order.status] = (acc[order.status] || 0) + 1;
                return acc;
            }, {}),
        };
    } catch (error) {
        console.error("Error getting iFood stats:", error);
        throw error;
    }
};
