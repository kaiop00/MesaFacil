import { doc, getDoc, updateDoc, collection, query, where, getDocs } from "firebase/firestore";
import { db } from "@/config/firebaseConfig";

/**
 * Find iFood order ID by MesaFacil order ID
 * @param {string} idRestaurante - Restaurant ID
 * @param {string} mesaFacilOrderId - MesaFacil order ID
 * @returns {Promise<string|null>} - iFood order ID or null
 */
export const findIfoodOrderByMesaFacilId = async (idRestaurante, mesaFacilOrderId) => {
    try {
        const ordersRef = collection(db, 'restaurantes', idRestaurante, 'ifoodOrders');
        const q = query(ordersRef, where('mesaFacilOrderId', '==', mesaFacilOrderId));
        
        const snapshot = await getDocs(q);
        
        if (snapshot.empty) {
            return null;
        }
        
        // Return the first match (should only be one)
        return snapshot.docs[0].id;
    } catch (error) {
        console.error('Error finding iFood order by MesaFacil ID:', error);
        return null;
    }
};

/**
 * Check if an order belongs to iFood (is in the ifood-delivery virtual table)
 * @param {string} mesaId - Table ID
 * @returns {boolean} - True if it's an iFood order
 */
export const isIfoodOrder = (mesaId) => {
    return mesaId === 'ifood-delivery';
};

/**
 * Update iFood order status in Firestore when MesaFacil order is updated
 * @param {string} idRestaurante - Restaurant ID
 * @param {string} mesaFacilOrderId - MesaFacil order ID
 * @param {string} mesaFacilStatus - MesaFacil order status (andamento, entregue, cancelado)
 * @returns {Promise<boolean>} - True if updated successfully
 */
export const updateIfoodOrderStatusFromMesaFacil = async (
    idRestaurante,
    mesaFacilOrderId,
    mesaFacilStatus
) => {
    try {
        // Find the corresponding iFood order
        const ifoodOrderId = await findIfoodOrderByMesaFacilId(idRestaurante, mesaFacilOrderId);
        
        if (!ifoodOrderId) {
            console.log('No iFood order found for MesaFacil order:', mesaFacilOrderId);
            return false;
        }
        
        // Map MesaFacil status to iFood status
        const statusMap = {
            'andamento': 'CONFIRMED',    // Order confirmed and being prepared
            'entregue': 'CONCLUDED',     // Order completed
            'cancelado': 'CANCELLED',    // Order cancelled
        };
        
        const ifoodStatus = statusMap[mesaFacilStatus] || mesaFacilStatus;
        
        // Update iFood order in Firestore
        const ifoodOrderRef = doc(db, 'restaurantes', idRestaurante, 'ifoodOrders', ifoodOrderId);
        
        await updateDoc(ifoodOrderRef, {
            status: ifoodStatus,
            mesaFacilStatus: mesaFacilStatus,
            lastSyncedFromMesaFacil: new Date().toISOString(),
        });
        
        console.log(`Updated iFood order ${ifoodOrderId} status to ${ifoodStatus}`);
        return true;
    } catch (error) {
        console.error('Error updating iFood order status:', error);
        return false;
    }
};

/**
 * Get iFood order details for a MesaFacil order
 * @param {string} idRestaurante - Restaurant ID
 * @param {string} mesaFacilOrderId - MesaFacil order ID
 * @returns {Promise<object|null>} - iFood order details or null
 */
export const getIfoodOrderForMesaFacilOrder = async (idRestaurante, mesaFacilOrderId) => {
    try {
        const ifoodOrderId = await findIfoodOrderByMesaFacilId(idRestaurante, mesaFacilOrderId);
        
        if (!ifoodOrderId) {
            return null;
        }
        
        const ifoodOrderRef = doc(db, 'restaurantes', idRestaurante, 'ifoodOrders', ifoodOrderId);
        const ifoodOrderSnap = await getDoc(ifoodOrderRef);
        
        if (!ifoodOrderSnap.exists()) {
            return null;
        }
        
        return {
            id: ifoodOrderSnap.id,
            ...ifoodOrderSnap.data(),
        };
    } catch (error) {
        console.error('Error getting iFood order for MesaFacil order:', error);
        return null;
    }
};

/**
 * Extract iFood customer information from order
 * @param {object} ifoodOrder - iFood order object
 * @returns {object} - Customer information
 */
export const extractIfoodCustomerInfo = (ifoodOrder) => {
    if (!ifoodOrder) return null;
    
    return {
        name: ifoodOrder.customer?.name || 'Cliente iFood',
        phone: ifoodOrder.customer?.phone || '',
        displayId: ifoodOrder.displayId || ifoodOrder.ifoodOrderId,
        orderType: ifoodOrder.orderType || 'DELIVERY',
        address: ifoodOrder.delivery?.address?.formattedAddress || 
                 ifoodOrder.delivery?.address?.streetName || '',
        observations: ifoodOrder.delivery?.observations || '',
        ifoodStatus: ifoodOrder.ifoodStatus || ifoodOrder.status,
    };
};

/**
 * Map iFood status to user-friendly text
 * @param {string} status - iFood status code
 * @returns {string} - Formatted status text
 */
export const formatIfoodStatus = (status) => {
    const statusMap = {
        'PLACED': 'Pedido Recebido',
        'CONFIRMED': 'Confirmado',
        'READY_TO_PICKUP': 'Pronto para Retirada',
        'DISPATCHED': 'Saiu para Entrega',
        'CONCLUDED': 'Concluído',
        'CANCELLED': 'Cancelado',
    };
    
    return statusMap[status] || status;
};
