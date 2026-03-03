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
 * Check if an order belongs to iFood virtual table
 * Supports the unified table ID and legacy IDs for backward compatibility
 * @param {string} mesaId - Table ID
 * @returns {boolean} - True if it's an iFood order
 */
export const isIfoodOrder = (mesaId) => {
    return mesaId === 'ifood' || mesaId === 'ifood-delivery' || mesaId === 'ifood-takeout';
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
 * Includes all fields from the iFood Order Details API (customer section)
 * Handles both old format (pre-update) and new format data in Firestore
 * @param {object} ifoodOrder - iFood order object from Firestore (ifoodOrders collection)
 * @returns {object} - Customer information
 */
export const extractIfoodCustomerInfo = (ifoodOrder) => {
    if (!ifoodOrder) return null;
    
    // Customer data: try stored customer, then rawData.customer
    const customer = ifoodOrder.customer || ifoodOrder.rawData?.customer || {};
    const rawCustomer = ifoodOrder.rawData?.customer || {};
    const phone = customer.phone || {};
    
    // Delivery data: try stored delivery, then rawData.delivery
    const delivery = ifoodOrder.delivery || {};
    const rawDelivery = ifoodOrder.rawData?.delivery || {};
    
    // Address: stored as delivery.address in Firestore, or rawData.delivery.deliveryAddress
    const deliveryAddress = delivery.address || rawDelivery.deliveryAddress || null;
    
    return {
        // Basic customer info
        name: customer.name || rawCustomer.name || 'Cliente iFood',
        phone: typeof phone === 'string' ? phone : (phone.number || rawCustomer.phone?.number || ''),
        phoneLocalizer: phone.localizer || customer.phoneLocalizer || rawCustomer.phone?.localizer || '',
        phoneLocalizerExpiration: phone.localizerExpiration || customer.phoneLocalizerExpiration || rawCustomer.phone?.localizerExpiration || '',
        
        // Document info
        documentNumber: customer.documentNumber || rawCustomer.documentNumber || '',
        documentType: customer.documentType || rawCustomer.documentType || '',
        
        // Customer history & segmentation
        ordersCountOnMerchant: customer.ordersCountOnMerchant ?? rawCustomer.ordersCountOnMerchant ?? null,
        segmentation: customer.segmentation || rawCustomer.segmentation || '',
        
        // Order display info
        displayId: ifoodOrder.displayId || ifoodOrder.ifoodOrderId,
        orderType: ifoodOrder.orderType || 'DELIVERY',
        
        // Delivery address (structured)
        address: deliveryAddress?.formattedAddress || deliveryAddress?.streetName || '',
        deliveryAddress: deliveryAddress,
        deliveredBy: delivery.deliveredBy || rawDelivery.deliveredBy || '',
        deliveryMode: delivery.mode || rawDelivery.mode || '',
        deliveryDescription: delivery.description || rawDelivery.description || '',
        pickupCode: delivery.pickupCode || rawDelivery.pickupCode || '',
        observations: delivery.observations || rawDelivery.observations || '',
        
        // Takeout info
        takeout: ifoodOrder.takeout || ifoodOrder.rawData?.takeout || null,
        
        // Status
        ifoodStatus: ifoodOrder.ifoodStatus || ifoodOrder.status,
        
        // General order info
        salesChannel: ifoodOrder.rawData?.salesChannel || '',
        createdAt: ifoodOrder.rawData?.createdAt || ifoodOrder.createdAt || '',
        extraInfo: ifoodOrder.rawData?.extraInfo || '',
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
