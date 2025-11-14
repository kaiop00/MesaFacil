import { 
    confirmIfoodOrder, 
    markIfoodOrderReady, 
    dispatchIfoodOrder,
    cancelIfoodOrder,
    getIfoodAccessToken 
} from "./ifoodService";
import { 
    findIfoodOrderByMesaFacilId,
    getIfoodOrderForMesaFacilOrder 
} from "./ifoodStatusSyncService";

/**
 * Confirm an iFood order via API
 * This should be called when the restaurant accepts the order
 * @param {string} idRestaurante - Restaurant ID
 * @param {string} mesaFacilOrderId - MesaFacil order ID
 * @returns {Promise<boolean>} - Success status
 */
export const confirmIfoodOrderFromMesaFacil = async (idRestaurante, mesaFacilOrderId) => {
    try {
        // Get access token
        const accessToken = await getIfoodAccessToken(idRestaurante);
        
        // Find corresponding iFood order
        const ifoodOrderId = await findIfoodOrderByMesaFacilId(idRestaurante, mesaFacilOrderId);
        
        if (!ifoodOrderId) {
            console.error('iFood order not found for MesaFacil order:', mesaFacilOrderId);
            return false;
        }
        
        // Confirm order via API
        await confirmIfoodOrder(ifoodOrderId, accessToken);
        
        console.log(`iFood order ${ifoodOrderId} confirmed successfully`);
        return true;
    } catch (error) {
        console.error('Error confirming iFood order:', error);
        throw error;
    }
};

/**
 * Mark iFood order as ready for pickup
 * This should be called when the order is prepared and ready
 * @param {string} idRestaurante - Restaurant ID
 * @param {string} mesaFacilOrderId - MesaFacil order ID
 * @returns {Promise<boolean>} - Success status
 */
export const markIfoodOrderReadyFromMesaFacil = async (idRestaurante, mesaFacilOrderId) => {
    try {
        const accessToken = await getIfoodAccessToken(idRestaurante);
        const ifoodOrderId = await findIfoodOrderByMesaFacilId(idRestaurante, mesaFacilOrderId);
        
        if (!ifoodOrderId) {
            console.error('iFood order not found for MesaFacil order:', mesaFacilOrderId);
            return false;
        }
        
        await markIfoodOrderReady(ifoodOrderId, accessToken);
        
        console.log(`iFood order ${ifoodOrderId} marked as ready`);
        return true;
    } catch (error) {
        console.error('Error marking iFood order as ready:', error);
        throw error;
    }
};

/**
 * Dispatch iFood order (mark as picked up)
 * This should be called when the delivery person picks up the order
 * @param {string} idRestaurante - Restaurant ID
 * @param {string} mesaFacilOrderId - MesaFacil order ID
 * @returns {Promise<boolean>} - Success status
 */
export const dispatchIfoodOrderFromMesaFacil = async (idRestaurante, mesaFacilOrderId) => {
    try {
        const accessToken = await getIfoodAccessToken(idRestaurante);
        const ifoodOrderId = await findIfoodOrderByMesaFacilId(idRestaurante, mesaFacilOrderId);
        
        if (!ifoodOrderId) {
            console.error('iFood order not found for MesaFacil order:', mesaFacilOrderId);
            return false;
        }
        
        await dispatchIfoodOrder(ifoodOrderId, accessToken);
        
        console.log(`iFood order ${ifoodOrderId} dispatched`);
        return true;
    } catch (error) {
        console.error('Error dispatching iFood order:', error);
        throw error;
    }
};

/**
 * Cancel an iFood order via API
 * @param {string} idRestaurante - Restaurant ID
 * @param {string} mesaFacilOrderId - MesaFacil order ID
 * @param {string} cancellationCode - Cancellation reason code
 * @returns {Promise<boolean>} - Success status
 */
export const cancelIfoodOrderFromMesaFacil = async (
    idRestaurante, 
    mesaFacilOrderId, 
    cancellationCode = '501' // Default: Restaurant request
) => {
    try {
        const accessToken = await getIfoodAccessToken(idRestaurante);
        const ifoodOrderId = await findIfoodOrderByMesaFacilId(idRestaurante, mesaFacilOrderId);
        
        if (!ifoodOrderId) {
            console.error('iFood order not found for MesaFacil order:', mesaFacilOrderId);
            return false;
        }
        
        await cancelIfoodOrder(ifoodOrderId, cancellationCode, accessToken);
        
        console.log(`iFood order ${ifoodOrderId} cancelled`);
        return true;
    } catch (error) {
        console.error('Error cancelling iFood order:', error);
        throw error;
    }
};

/**
 * Get available actions for an iFood order based on its current status
 * @param {string} idRestaurante - Restaurant ID
 * @param {string} mesaFacilOrderId - MesaFacil order ID
 * @returns {Promise<object>} - Available actions
 */
export const getAvailableIfoodActions = async (idRestaurante, mesaFacilOrderId) => {
    try {
        const ifoodOrder = await getIfoodOrderForMesaFacilOrder(idRestaurante, mesaFacilOrderId);
        
        if (!ifoodOrder) {
            return {
                canConfirm: false,
                canMarkReady: false,
                canDispatch: false,
                canCancel: false,
            };
        }
        
        const status = ifoodOrder.status || ifoodOrder.ifoodStatus;
        
        return {
            canConfirm: status === 'PLACED',
            canMarkReady: status === 'CONFIRMED',
            canDispatch: status === 'READY_TO_PICKUP',
            canCancel: ['PLACED', 'CONFIRMED'].includes(status),
            currentStatus: status,
        };
    } catch (error) {
        console.error('Error getting available iFood actions:', error);
        return {
            canConfirm: false,
            canMarkReady: false,
            canDispatch: false,
            canCancel: false,
        };
    }
};

/**
 * Execute the next logical action for an iFood order
 * Based on the current status, this will:
 * - PLACED -> Confirm
 * - CONFIRMED -> Mark Ready
 * - READY_TO_PICKUP -> Dispatch
 * @param {string} idRestaurante - Restaurant ID
 * @param {string} mesaFacilOrderId - MesaFacil order ID
 * @returns {Promise<{success: boolean, action: string}>}
 */
export const executeNextIfoodAction = async (idRestaurante, mesaFacilOrderId) => {
    try {
        const actions = await getAvailableIfoodActions(idRestaurante, mesaFacilOrderId);
        
        if (actions.canConfirm) {
            await confirmIfoodOrderFromMesaFacil(idRestaurante, mesaFacilOrderId);
            return { success: true, action: 'confirmed' };
        }
        
        if (actions.canMarkReady) {
            await markIfoodOrderReadyFromMesaFacil(idRestaurante, mesaFacilOrderId);
            return { success: true, action: 'marked_ready' };
        }
        
        if (actions.canDispatch) {
            await dispatchIfoodOrderFromMesaFacil(idRestaurante, mesaFacilOrderId);
            return { success: true, action: 'dispatched' };
        }
        
        return { success: false, action: 'no_action_available' };
    } catch (error) {
        console.error('Error executing next iFood action:', error);
        throw error;
    }
};
