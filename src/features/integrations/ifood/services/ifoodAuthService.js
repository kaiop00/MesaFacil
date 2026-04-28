import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { db, functions } from "@/config/firebaseConfig";

const IFOOD_API_BASE_URL = "https://merchant-api.ifood.com.br";

/**
 * Step 1: Request a userCode from iFood
 * This generates a code that the merchant will use in the iFood Partner Portal
 */
export const requestIfoodUserCode = async (idRestaurante, clientId) => {
    const requestUserCode = httpsCallable(functions, 'ifoodRequestUserCode');
    
    const result = await requestUserCode({ 
        idRestaurante,
        clientId,
    });
    
    const data = result.data;
    
    return {
        userCode: data.userCode,
        verificationCode: data.verificationCode,
        authorizationCodeVerifier: data.authorizationCodeVerifier,
        expiresIn: data.expiresIn,
    };
};

/**
 * Step 2: Exchange authorization code for tokens
 * After merchant enters the code in iFood Portal and provides the authorization code
 */
export const exchangeAuthorizationCode = async (idRestaurante, authorizationCode, clientId) => {
    const exchangeCode = httpsCallable(functions, 'ifoodExchangeCode');
    
    const result = await exchangeCode({ 
        idRestaurante,
        authorizationCode,
        clientId,
    });
    
    return result.data;
};

/**
 * Get iFood integration status for a restaurant
 */
export const getIfoodIntegrationStatus = async (idRestaurante) => {
    const docRef = doc(db, "restaurantes", idRestaurante, "integrations", "ifood");
    const docSnap = await getDoc(docRef);
    
    if (!docSnap.exists()) {
        return {
            enabled: false,
            isAuthorized: false,
            needsReauthorization: false,
        };
    }
    
    const data = docSnap.data();
    
    // Check if tokens exist and integration is not marked for reauth
    const hasTokens = !!(data.accessToken && data.refreshToken);
    const hasMerchantId = !!data.merchantId;
    const isAuthorized = hasTokens && !data.needsReauthorization;
    
    return {
        enabled: data.enabled ?? false,
        isAuthorized,
        hasMerchantId,
        needsReauthorization: data.needsReauthorization ?? false,
        clientId: data.clientId,
        merchantId: data.merchantId,
        authorizedAt: data.authorizedAt,
        lastError: data.lastError,
        lastErrorAt: data.lastErrorAt,
    };
};

/**
 * Revoke iFood authorization
 */
export const revokeIfoodAuth = async (idRestaurante) => {
    const revokeAuth = httpsCallable(functions, 'ifoodRevokeAuth');
    
    const result = await revokeAuth({ 
        idRestaurante 
    });
    
    return result.data;
};

/**
 * Enable/disable iFood integration
 */
export const setIfoodIntegrationEnabled = async (idRestaurante, enabled) => {
    const docRef = doc(db, "restaurantes", idRestaurante, "integrations", "ifood");
    
    await setDoc(docRef, {
        enabled,
        updatedAt: serverTimestamp(),
    }, { merge: true });
};

/**
 * Clear error messages from iFood integration
 * Useful when errors are resolved or integration is working again
 */
export const clearIfoodErrors = async (idRestaurante) => {
    const docRef = doc(db, "restaurantes", idRestaurante, "integrations", "ifood");
    
    await setDoc(docRef, {
        lastError: null,
        lastErrorAt: null,
        needsReauthorization: false,
        updatedAt: serverTimestamp(),
    }, { merge: true });
};

/**
 * Save the Client ID used in the iFood integration flow
 */
export const saveIfoodClientId = async (idRestaurante, clientId) => {
    const docRef = doc(db, "restaurantes", idRestaurante, "integrations", "ifood");

    await setDoc(docRef, {
        clientId: clientId?.trim() || null,
        updatedAt: serverTimestamp(),
    }, { merge: true });
};

/**
 * Save merchantId manually (emergency fallback when iFood merchant discovery fails)
 */
export const saveIfoodMerchantId = async (idRestaurante, merchantId) => {
    const docRef = doc(db, "restaurantes", idRestaurante, "integrations", "ifood");

    await setDoc(docRef, {
        merchantId: merchantId?.trim() || null,
        enabled: true,
        needsReauthorization: false,
        updatedAt: serverTimestamp(),
    }, { merge: true });
};

/**
 * Trigger manual polling for iFood orders
 * Calls the Cloud Function to immediately poll for new orders
 */
export const triggerManualIfoodPoll = async (idRestaurante) => {
    const pollManual = httpsCallable(functions, 'ifoodPollManual');
    
    const result = await pollManual({ 
        idRestaurante 
    });

    const data = result.data;

    // If the function returned a structured failure, throw to let UI show it
    if (data && data.success === false) {
        throw new Error(data.message || 'Erro ao buscar pedidos manualmente');
    }

    return data;
};
