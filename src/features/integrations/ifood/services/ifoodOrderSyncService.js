import { createPedido } from "@/features/order/services/orderService";
import { getIfoodOrderFromFirestore, updateIfoodOrderStatus } from "./ifoodService";

/**
 * Create a virtual table for iFood orders
 * Returns a table ID specifically for iFood orders
 */
export const getOrCreateIfoodTable = async (idRestaurante) => {
    const { doc, getDoc, setDoc, serverTimestamp } = await import("firebase/firestore");
    const { db } = await import("@/config/firebaseConfig");
    
    // iFood orders use a special virtual table
    const ifoodTableId = "ifood-delivery";
    const tableRef = doc(db, "restaurantes", idRestaurante, "mesas", ifoodTableId);
    
    // Check if table exists
    const tableSnap = await getDoc(tableRef);
    
    if (!tableSnap.exists()) {
        // Create the virtual table
        await setDoc(tableRef, {
            numero: "iFood",
            capacidade: 999,
            status: "ocupada",
            tipo: "virtual",
            descricao: "Mesa virtual para pedidos do iFood",
            createdAt: serverTimestamp(),
            isVirtual: true,
            source: "ifood",
        });
        console.log("Created virtual table for iFood orders");
    }
    
    return ifoodTableId;
};

/**
 * Transform iFood order items to MesaFacil format
 */
const transformIfoodItems = (ifoodItems) => {
    return ifoodItems.map(item => ({
        id: item.externalCode || item.id,
        nome: item.name,
        price: item.unitPrice || item.price || 0,
        quantity: item.quantity || 1,
        categorias: [],
        alergias: [],
        descricao: item.observations || "",
        imagemUrl: "",
        // Store iFood-specific data
        ifoodData: {
            id: item.id,
            externalCode: item.externalCode,
            totalPrice: item.totalPrice,
            options: item.options || [],
        }
    }));
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
        
        // Get or create virtual table for iFood orders
        const mesaId = await getOrCreateIfoodTable(idRestaurante);
        
        // Transform items
        const items = transformIfoodItems(ifoodOrder.items || []);
        
        // Calculate total (use iFood's orderAmount)
        const total = ifoodOrder.total?.orderAmount || 0;
        
        // Create observations with customer and delivery info
        const observations = [
            `Cliente iFood: ${ifoodOrder.customer?.name || "N/A"}`,
            ifoodOrder.customer?.phone ? `Tel: ${ifoodOrder.customer.phone}` : "",
            ifoodOrder.delivery?.address ? 
                `Endereço: ${ifoodOrder.delivery.address.formattedAddress || ifoodOrder.delivery.address.streetName || ""}` : "",
            ifoodOrder.delivery?.observations ? `Obs: ${ifoodOrder.delivery.observations}` : "",
            `Pedido iFood #${ifoodOrder.displayId || ifoodOrderId}`,
        ].filter(Boolean).join("\n");
        
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
