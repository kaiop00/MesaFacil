import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { db, functions } from "@/config/firebaseConfig";

const IFOOD_API_BASE_URL = "https://merchant-api.ifood.com.br";

const getCallableErrorMessage = (error, fallbackMessage) => {
    const firebaseCode = error?.code || "";
    const details = error?.details || error?.customData?.details;
    const originalMessage = details?.originalMessage;

    if (typeof details === "string" && details.trim()) {
        return details;
    }

    if (typeof originalMessage === "string" && originalMessage.trim()) {
        return originalMessage;
    }

    if (firebaseCode.includes("failed-precondition")) {
        return "Integração iFood não configurada corretamente. Reconecte a conta e tente novamente.";
    }

    if (firebaseCode.includes("permission-denied")) {
        return "iFood recusou a operação (permissão negada). Verifique o merchant e reconecte a integração.";
    }

    if (firebaseCode.includes("unauthenticated")) {
        return "Falha de autenticação com o iFood. Reconecte a integração e tente novamente.";
    }

    if (firebaseCode.includes("unavailable")) {
        return "A API do iFood está temporariamente indisponível. Tente novamente em instantes.";
    }

    const rawMessage = (error?.message || "").trim();
    if (rawMessage) {
        const internalPrefixPattern = /^\[?internal\]?[:\s-]*/i;
        const withoutInternalPrefix = rawMessage.replace(internalPrefixPattern, "").trim();

        if (withoutInternalPrefix && withoutInternalPrefix !== rawMessage) {
            return withoutInternalPrefix;
        }

        return rawMessage;
    }

    return fallbackMessage;
};

/**
 * Step 1: Request a userCode from iFood
 * This generates a code that the merchant will use in the iFood Partner Portal
 */
export const requestIfoodUserCode = async (idRestaurante) => {
    const requestUserCode = httpsCallable(functions, 'ifoodRequestUserCode');
    
    const result = await requestUserCode({ 
        idRestaurante 
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
export const exchangeAuthorizationCode = async (idRestaurante, authorizationCode) => {
    const exchangeCode = httpsCallable(functions, 'ifoodExchangeCode');
    
    const result = await exchangeCode({ 
        idRestaurante,
        authorizationCode 
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
    
    // Check if tokens exist and are valid
    const hasTokens = !!(data.accessToken && data.refreshToken);
    const isAuthorized = hasTokens && !data.needsReauthorization;
    
    return {
        enabled: data.enabled ?? false,
        isAuthorized,
        needsReauthorization: data.needsReauthorization ?? false,
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
 * Trigger manual polling for iFood orders
 * Calls the Cloud Function to immediately poll for new orders
 */
export const triggerManualIfoodPoll = async (idRestaurante) => {
    const pollManual = httpsCallable(functions, 'ifoodPollManual');

    try {
        const result = await pollManual({
            idRestaurante
        });

        return result.data;
    } catch (error) {
        throw new Error(
            getCallableErrorMessage(error, "Erro interno ao buscar pedidos do iFood. Verifique os logs da função.")
        );
    }
};
