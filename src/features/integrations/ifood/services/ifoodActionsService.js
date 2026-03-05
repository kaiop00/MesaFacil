/**
 * iFood Actions Service
 * Service layer for calling iFood order action Cloud Functions
 */

import { getFunctions, httpsCallable } from "firebase/functions";

const functions = getFunctions();

/**
 * Confirm an iFood order
 * @param {string} idRestaurante - Restaurant ID
 * @param {string} orderId - iFood order ID
 * @returns {Promise<{success: boolean, message: string, orderId: string}>}
 */
export async function confirmIfoodOrder(idRestaurante, orderId) {
    try {
        const confirmOrder = httpsCallable(functions, "ifoodConfirmOrder");
        const result = await confirmOrder({ idRestaurante, orderId });
        return result.data;
    } catch (error) {
        console.error("Error confirming iFood order:", error);
        throw new Error(error.message || "Erro ao confirmar pedido");
    }
}

/**
 * Dispatch an iFood order (mark as dispatched/out for delivery)
 * @param {string} idRestaurante - Restaurant ID
 * @param {string} orderId - iFood order ID
 * @returns {Promise<{success: boolean, message: string, orderId: string}>}
 */
export async function dispatchIfoodOrder(idRestaurante, orderId) {
    try {
        const dispatchOrder = httpsCallable(functions, "ifoodDispatchOrder");
        const result = await dispatchOrder({ idRestaurante, orderId });
        return result.data;
    } catch (error) {
        console.error("Error dispatching iFood order:", error);
        throw new Error(error.message || "Erro ao despachar pedido");
    }
}

/**
 * Mark an iFood order as ready to pickup (for TAKEOUT orders)
 * @param {string} idRestaurante - Restaurant ID
 * @param {string} orderId - iFood order ID
 * @returns {Promise<{success: boolean, message: string, orderId: string}>}
 */
export async function markIfoodOrderReadyToPickup(idRestaurante, orderId) {
    try {
        const markReady = httpsCallable(functions, "ifoodMarkReadyToPickup");
        const result = await markReady({ idRestaurante, orderId });
        return result.data;
    } catch (error) {
        console.error("Error marking iFood order as ready:", error);
        throw new Error(error.message || "Erro ao marcar pedido como pronto");
    }
}

/**
 * Get cancellation reasons available for an iFood order
 * @param {string} idRestaurante - Restaurant ID
 * @param {string} orderId - iFood order ID
 * @returns {Promise<{success: boolean, reasons: Array, orderId: string}>}
 */
export async function getIfoodCancellationReasons(idRestaurante, orderId) {
    try {
        const getReasons = httpsCallable(functions, "ifoodGetCancellationReasons");
        const result = await getReasons({ idRestaurante, orderId });
        return result.data;
    } catch (error) {
        console.error("Error getting cancellation reasons:", error);
        throw new Error(error.message || "Erro ao buscar motivos de cancelamento");
    }
}

/**
 * Request cancellation of an iFood order
 * @param {string} idRestaurante - Restaurant ID
 * @param {string} orderId - iFood order ID
 * @param {string} cancellationCode - Cancellation code from getIfoodCancellationReasons
 * @param {string} [reason] - Optional reason text
 * @returns {Promise<{success: boolean, message: string, orderId: string, cancellationCode: string}>}
 */
export async function requestIfoodOrderCancellation(idRestaurante, orderId, cancellationCode, reason) {
    try {
        const requestCancellation = httpsCallable(functions, "ifoodRequestCancellation");
        const result = await requestCancellation({ 
            idRestaurante, 
            orderId, 
            cancellationCode,
            reason 
        });
        return result.data;
    } catch (error) {
        console.error("Error requesting order cancellation:", error);
        throw new Error(error.message || "Erro ao solicitar cancelamento");
    }
}

/**
 * Accept a cancellation request from the customer
 * @param {string} idRestaurante - Restaurant ID
 * @param {string} orderId - iFood order ID
 * @returns {Promise<{success: boolean, message: string, orderId: string}>}
 */
export async function acceptIfoodOrderCancellation(idRestaurante, orderId) {
    try {
        const acceptCancellation = httpsCallable(functions, "ifoodAcceptCancellation");
        const result = await acceptCancellation({ idRestaurante, orderId });
        return result.data;
    } catch (error) {
        console.error("Error accepting cancellation:", error);
        throw new Error(error.message || "Erro ao aceitar cancelamento");
    }
}

/**
 * Deny a cancellation request from the customer
 * @param {string} idRestaurante - Restaurant ID
 * @param {string} orderId - iFood order ID
 * @param {string} [reason] - Optional reason for denying
 * @returns {Promise<{success: boolean, message: string, orderId: string}>}
 */
export async function denyIfoodOrderCancellation(idRestaurante, orderId, reason) {
    try {
        const denyCancellation = httpsCallable(functions, "ifoodDenyCancellation");
        const result = await denyCancellation({ idRestaurante, orderId, reason });
        return result.data;
    } catch (error) {
        console.error("Error denying cancellation:", error);
        throw new Error(error.message || "Erro ao negar cancelamento");
    }
}

// ===================================================================
// Handshake (Negotiation Platform) Service Calls
// ===================================================================

/**
 * Accept a Handshake dispute (agree with customer's request)
 * @param {string} idRestaurante - Restaurant ID
 * @param {string} disputeId - Dispute ID
 * @param {string} [orderId] - Optional iFood order ID
 * @returns {Promise<{success: boolean, message: string, disputeId: string}>}
 */
export async function acceptIfoodDispute(idRestaurante, disputeId, orderId) {
    try {
        const accept = httpsCallable(functions, "ifoodAcceptDispute");
        const result = await accept({ idRestaurante, disputeId, orderId });
        return result.data;
    } catch (error) {
        console.error("Error accepting dispute:", error);
        throw new Error(error.message || "Erro ao aceitar disputa");
    }
}

/**
 * Reject a Handshake dispute (disagree with customer's request)
 * @param {string} idRestaurante - Restaurant ID
 * @param {string} disputeId - Dispute ID
 * @param {string} [orderId] - Optional iFood order ID
 * @param {string} [reason] - Optional rejection reason
 * @returns {Promise<{success: boolean, message: string, disputeId: string}>}
 */
export async function rejectIfoodDispute(idRestaurante, disputeId, orderId, reason) {
    try {
        const reject = httpsCallable(functions, "ifoodRejectDispute");
        const result = await reject({ idRestaurante, disputeId, orderId, reason });
        return result.data;
    } catch (error) {
        console.error("Error rejecting dispute:", error);
        throw new Error(error.message || "Erro ao rejeitar disputa");
    }
}

/**
 * Select an alternative for a Handshake dispute (counter-offer/partial refund)
 * @param {string} idRestaurante - Restaurant ID
 * @param {string} disputeId - Dispute ID
 * @param {string} alternativeId - Alternative ID to select
 * @param {string} [orderId] - Optional iFood order ID
 * @returns {Promise<{success: boolean, message: string, disputeId: string, alternativeId: string}>}
 */
export async function selectIfoodDisputeAlternative(idRestaurante, disputeId, alternativeId, orderId) {
    try {
        const selectAlt = httpsCallable(functions, "ifoodSelectDisputeAlternative");
        const result = await selectAlt({ idRestaurante, disputeId, alternativeId, orderId });
        return result.data;
    } catch (error) {
        console.error("Error selecting dispute alternative:", error);
        throw new Error(error.message || "Erro ao selecionar alternativa da disputa");
    }
}
