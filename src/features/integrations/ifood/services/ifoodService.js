import { doc, getDoc, setDoc, collection, query, where, getDocs, serverTimestamp } from "firebase/firestore";
import { db } from "@/config/firebaseConfig";

const IFOOD_API_BASE_URL = "https://merchant-api.ifood.com.br";

/**
 * Get iFood integration data for a restaurant
 * Now stores: merchantId, accessToken, refreshToken, tokenExpiry
 * Each restaurant authorizes individually (distributed app model)
 */
export const getIfoodCredentials = async (idRestaurante) => {
    const docRef = doc(db, "restaurantes", idRestaurante, "integrations", "ifood");
    const docSnap = await getDoc(docRef);
    
    if (!docSnap.exists()) {
        return null;
    }
    
    return docSnap.data();
};

/**
 * Save iFood integration settings
 * For distributed apps: merchantId is fetched automatically during OAuth
 * Tokens are saved by the OAuth callback function
 */
export const saveIfoodCredentials = async (idRestaurante, credentials) => {
    const docRef = doc(db, "restaurantes", idRestaurante, "integrations", "ifood");
    
    await setDoc(docRef, {
        merchantId: credentials.merchantId || "",
        enabled: credentials.enabled ?? true,
        updatedAt: serverTimestamp(),
    }, { merge: true });
};

/**
 * Get valid access token (used internally, tokens managed by Cloud Functions)
 * This is kept for backward compatibility but tokens are now managed server-side
 */
export const getIfoodAccessToken = async (idRestaurante) => {
    const credentials = await getIfoodCredentials(idRestaurante);
    
    if (!credentials || !credentials.accessToken) {
        throw new Error("No access token available. Please authorize with iFood first.");
    }
    
    // Check if token is expired
    if (credentials.accessTokenExpiry) {
        const expiryDate = credentials.accessTokenExpiry.toDate ? 
            credentials.accessTokenExpiry.toDate() : 
            new Date(credentials.accessTokenExpiry);
        
        if (expiryDate <= new Date()) {
            throw new Error("Access token expired. Please reauthorize with iFood.");
        }
    }
    
    return credentials.accessToken;
};

/**
 * Get order details from iFood
 */
export const getIfoodOrder = async (orderId, accessToken) => {
    const response = await fetch(`${IFOOD_API_BASE_URL}/order/v1.0/orders/${orderId}`, {
        method: "GET",
        headers: {
            "Authorization": `Bearer ${accessToken}`,
            "accept": "application/json",
        },
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(`Failed to get order: ${error.message || response.statusText}`);
    }

    return await response.json();
};

/**
 * Confirm order to iFood
 */
export const confirmIfoodOrder = async (orderId, accessToken) => {
    const response = await fetch(`${IFOOD_API_BASE_URL}/order/v1.0/orders/${orderId}/confirm`, {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${accessToken}`,
            "Content-Type": "application/json",
            "accept": "application/json",
        },
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(`Failed to confirm order: ${error.message || response.statusText}`);
    }

    return await response.json();
};

/**
 * Request order cancellation to iFood
 */
export const cancelIfoodOrder = async (orderId, cancellationCode, accessToken) => {
    const response = await fetch(
        `${IFOOD_API_BASE_URL}/order/v1.0/orders/${orderId}/requestCancellation`,
        {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${accessToken}`,
                "Content-Type": "application/json",
                "accept": "application/json",
            },
            body: JSON.stringify({
                cancellationCode: cancellationCode,
            }),
        }
    );

    if (!response.ok) {
        const error = await response.json();
        throw new Error(`Failed to cancel order: ${error.message || response.statusText}`);
    }

    return response.status === 202; // Accepted
};

/**
 * Get cancellation reasons for an order
 */
export const getIfoodCancellationReasons = async (orderId, accessToken) => {
    const response = await fetch(
        `${IFOOD_API_BASE_URL}/order/v1.0/orders/${orderId}/cancellationReasons`,
        {
            method: "GET",
            headers: {
                "Authorization": `Bearer ${accessToken}`,
                "accept": "application/json",
            },
        }
    );

    if (!response.ok) {
        const error = await response.json();
        throw new Error(`Failed to get cancellation reasons: ${error.message || response.statusText}`);
    }

    return await response.json();
};

/**
 * Mark order as ready for pickup
 */
export const markIfoodOrderReady = async (orderId, accessToken) => {
    const response = await fetch(
        `${IFOOD_API_BASE_URL}/order/v1.0/orders/${orderId}/readyToPickup`,
        {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${accessToken}`,
                "accept": "application/json",
            },
        }
    );

    if (!response.ok) {
        const error = await response.json();
        throw new Error(`Failed to mark order as ready: ${error.message || response.statusText}`);
    }

    return true;
};

/**
 * Dispatch order (mark as picked up)
 */
export const dispatchIfoodOrder = async (orderId, accessToken) => {
    const response = await fetch(
        `${IFOOD_API_BASE_URL}/order/v1.0/orders/${orderId}/dispatch`,
        {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${accessToken}`,
                "accept": "application/json",
            },
        }
    );

    if (!response.ok) {
        const error = await response.json();
        throw new Error(`Failed to dispatch order: ${error.message || response.statusText}`);
    }

    return true;
};

/**
 * Save iFood order to Firestore
 */
export const saveIfoodOrderToFirestore = async (idRestaurante, orderId, orderData) => {
    const docRef = doc(db, "restaurantes", idRestaurante, "ifoodOrders", orderId);
    
    await setDoc(docRef, {
        ...orderData,
        syncedAt: serverTimestamp(),
    }, { merge: true });
};

/**
 * Get iFood order from Firestore
 */
export const getIfoodOrderFromFirestore = async (idRestaurante, orderId) => {
    const docRef = doc(db, "restaurantes", idRestaurante, "ifoodOrders", orderId);
    const docSnap = await getDoc(docRef);
    
    if (!docSnap.exists()) {
        return null;
    }
    
    return { id: docSnap.id, ...docSnap.data() };
};

/**
 * Get all iFood orders from Firestore
 */
export const getAllIfoodOrders = async (idRestaurante, statusFilter = null) => {
    const ordersRef = collection(db, "restaurantes", idRestaurante, "ifoodOrders");
    
    let q = ordersRef;
    if (statusFilter) {
        q = query(ordersRef, where("status", "==", statusFilter));
    }
    
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

/**
 * Update iFood order status in Firestore
 */
export const updateIfoodOrderStatus = async (idRestaurante, orderId, status, additionalData = {}) => {
    const docRef = doc(db, "restaurantes", idRestaurante, "ifoodOrders", orderId);
    
    await setDoc(docRef, {
        status,
        ...additionalData,
        updatedAt: serverTimestamp(),
    }, { merge: true });
};
