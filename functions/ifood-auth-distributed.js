/* eslint-env node */
/* eslint-disable no-undef */
const {onCall} = require("firebase-functions/v2/https");
const {defineSecret} = require("firebase-functions/params");
const logger = require("firebase-functions/logger");
const admin = require("firebase-admin");

// iFood API configuration
const IFOOD_API_BASE_URL = "https://merchant-api.ifood.com.br";

// Define secrets for distributed app credentials
const ifoodClientId = defineSecret("IFOOD_CLIENT_ID");
const ifoodClientSecret = defineSecret("IFOOD_CLIENT_SECRET");

/**
 * Step 1: Request userCode from iFood
 * This is the first step in the distributed app authentication flow
 * Returns a userCode that the merchant will enter in the iFood Partner Portal
 * 
 * Docs: https://developer.ifood.com.br/en-US/docs/guides/authentication/distributed
 */
exports.ifoodRequestUserCode = onCall(
  {
    secrets: [ifoodClientId, ifoodClientSecret],
    timeoutSeconds: 60,
  },
  async (request) => {
    try {
      const {idRestaurante} = request.data;

      if (!idRestaurante) {
        throw new Error("idRestaurante is required");
      }

      logger.info("Requesting userCode from iFood", {idRestaurante});

      // Request userCode from iFood
      const requestBody = `clientId=${encodeURIComponent(ifoodClientId.value())}`;
      
      logger.info("Request details", {
        url: `${IFOOD_API_BASE_URL}/authentication/v1.0/oauth/userCode`,
        clientId: ifoodClientId.value().substring(0, 8) + '...', // Log only first 8 chars for security
      });

      const response = await fetch(`${IFOOD_API_BASE_URL}/authentication/v1.0/oauth/userCode`, {
        method: "POST",
        headers: {
          "Accept": "application/json",
          "Content-Type": "application/x-www-form-urlencoded",
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          "Accept-Language": "pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7",
          "Accept-Encoding": "gzip, deflate, br, zstd",
          "Connection": "keep-alive",
          "Origin": "https://portal.ifood.com.br",
          "Referer": "https://portal.ifood.com.br/",
          "Sec-Fetch-Dest": "empty",
          "Sec-Fetch-Mode": "cors",
          "Sec-Fetch-Site": "same-site",
        },
        body: requestBody,
      });

      logger.info("iFood API response", {
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries()),
      });

      if (!response.ok) {
        const errorText = await response.text();
        logger.error("Failed to get userCode from iFood", {
          status: response.status,
          statusText: response.statusText,
          error: errorText,
          clientIdPreview: ifoodClientId.value().substring(0, 8) + '...',
        });
        
        // Provide more specific error messages
        if (response.status === 403) {
          throw new Error("Acesso negado pela API do iFood. Verifique se o Client ID está correto e se a aplicação está aprovada no Portal do Desenvolvedor do iFood.");
        } else if (response.status === 401) {
          throw new Error("Client ID inválido. Verifique suas credenciais no Portal do Desenvolvedor do iFood.");
        } else {
          throw new Error(`Erro ao solicitar userCode: ${response.status} - ${errorText}`);
        }
      }

      const data = await response.json();

      logger.info("UserCode obtained successfully", {
        idRestaurante,
        userCode: data.userCode,
        expiresIn: data.expiresIn,
      });

      logger.info("Full iFood API response data", {
        responseData: data,
      });

      // Validate required fields from iFood API response
      if (!data.userCode || !data.authorizationCodeVerifier) {
        logger.error("Invalid response from iFood userCode API", {
          hasUserCode: !!data.userCode,
          hasAuthorizationCodeVerifier: !!data.authorizationCodeVerifier,
          responseData: data,
        });
        throw new Error("Resposta inválida da API do iFood. Campos obrigatórios ausentes.");
      }

      // Store verification codes in Firestore
      const docRef = admin.firestore().doc(`restaurantes/${idRestaurante}/integrations/ifood`);
      await docRef.set({
        userCode: data.userCode,
        authorizationCodeVerifier: data.authorizationCodeVerifier,
        verificationUrl: data.verificationUrl || null,
        verificationUrlComplete: data.verificationUrlComplete || null,
        userCodeExpiresAt: admin.firestore.Timestamp.fromDate(
          new Date(Date.now() + (data.expiresIn || 600) * 1000)
        ),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      }, {merge: true});

      return {
        userCode: data.userCode,
        verificationUrl: data.verificationUrl,
        verificationUrlComplete: data.verificationUrlComplete,
        authorizationCodeVerifier: data.authorizationCodeVerifier,
        expiresIn: data.expiresIn,
      };
    } catch (error) {
      logger.error("Error in ifoodRequestUserCode", {error: error.message});
      throw new Error(error.message);
    }
  }
);

/**
 * Step 2: Exchange authorization code for access tokens
 * After merchant authorizes in iFood Portal and provides the authorization code
 */
exports.ifoodExchangeCode = onCall(
  {
    secrets: [ifoodClientId, ifoodClientSecret],
    timeoutSeconds: 60,
  },
  async (request) => {
    try {
      const {idRestaurante, authorizationCode} = request.data;

      if (!idRestaurante || !authorizationCode) {
        throw new Error("idRestaurante and authorizationCode are required");
      }

      logger.info("Exchanging authorization code", {idRestaurante});

      // Get stored verification code
      const docRef = admin.firestore().doc(`restaurantes/${idRestaurante}/integrations/ifood`);
      const docSnap = await docRef.get();

      if (!docSnap.exists || !docSnap.data().authorizationCodeVerifier) {
        throw new Error("Verification code not found. Please request a new userCode.");
      }

      const {authorizationCodeVerifier} = docSnap.data();

      // Exchange authorization code for tokens
      const requestBody = [
        `grantType=authorization_code`,
        `clientId=${encodeURIComponent(ifoodClientId.value())}`,
        `clientSecret=${encodeURIComponent(ifoodClientSecret.value())}`,
        `authorizationCode=${encodeURIComponent(authorizationCode)}`,
        `authorizationCodeVerifier=${encodeURIComponent(authorizationCodeVerifier)}`,
      ].join('&');

      logger.info("Request details", {
        url: `${IFOOD_API_BASE_URL}/authentication/v1.0/oauth/token`,
        authCodeLength: authorizationCode.length,
        verifierLength: authorizationCodeVerifier.length,
      });

      const response = await fetch(`${IFOOD_API_BASE_URL}/authentication/v1.0/oauth/token`, {
        method: "POST",
        headers: {
          "Accept": "application/json",
          "Content-Type": "application/x-www-form-urlencoded",
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          "Accept-Language": "pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7",
          "Accept-Encoding": "gzip, deflate, br, zstd",
          "Connection": "keep-alive",
          "Origin": "https://portal.ifood.com.br",
          "Referer": "https://portal.ifood.com.br/",
          "Sec-Fetch-Dest": "empty",
          "Sec-Fetch-Mode": "cors",
          "Sec-Fetch-Site": "same-site",
        },
        body: requestBody,
      });

      logger.info("iFood API response", {
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries()),
      });

      if (!response.ok) {
        const errorText = await response.text();
        logger.error("Failed to exchange authorization code", {
          status: response.status,
          error: errorText,
        });
        throw new Error(`Failed to exchange code: ${response.statusText}`);
      }

      const tokenData = await response.json();

      logger.info("Tokens obtained successfully", {
        idRestaurante,
        expiresIn: tokenData.expiresIn,
      });

      // Fetch merchant information
      let merchantId = null;
      try {
        const merchantResponse = await fetch(`${IFOOD_API_BASE_URL}/merchant/v1.0/merchants`, {
          method: "GET",
          headers: {
            "Authorization": `Bearer ${tokenData.accessToken}`,
            "accept": "application/json",
          },
        });

        if (merchantResponse.ok) {
          const merchants = await merchantResponse.json();
          if (merchants && merchants.length > 0) {
            merchantId = merchants[0].id;
            logger.info("Merchant ID obtained", {idRestaurante, merchantId});
          }
        }
      } catch (error) {
        logger.warn("Could not fetch merchant ID", {error: error.message});
      }

      // Save tokens to Firestore
      await docRef.set({
        accessToken: tokenData.accessToken,
        refreshToken: tokenData.refreshToken,
        accessTokenExpiry: admin.firestore.Timestamp.fromDate(
          new Date(Date.now() + (tokenData.expiresIn * 1000))
        ),
        merchantId: merchantId,
        enabled: true,
        needsReauthorization: false,
        authorizedAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        // Clean up temporary codes
        authorizationCodeVerifier: admin.firestore.FieldValue.delete(),
        userCode: admin.firestore.FieldValue.delete(),
        userCodeExpiresAt: admin.firestore.FieldValue.delete(),
        verificationUrl: admin.firestore.FieldValue.delete(),
        verificationUrlComplete: admin.firestore.FieldValue.delete(),
        // Clean up error fields since authorization succeeded
        lastError: admin.firestore.FieldValue.delete(),
        lastErrorAt: admin.firestore.FieldValue.delete(),
      }, {merge: true});

      logger.info("iFood integration configured successfully", {idRestaurante, merchantId});

      return {
        success: true,
        merchantId,
        message: "iFood integration configured successfully",
      };
    } catch (error) {
      logger.error("Error in ifoodExchangeCode", {error: error.message});
      throw new Error(error.message);
    }
  }
);

/**
 * Revoke iFood authorization
 * Clears tokens from Firestore
 */
exports.ifoodRevokeAuth = onCall(
  {
    timeoutSeconds: 30,
  },
  async (request) => {
    try {
      const {idRestaurante} = request.data;

      if (!idRestaurante) {
        throw new Error("idRestaurante is required");
      }

      logger.info("Revoking iFood authorization", {idRestaurante});

      // Clear tokens from Firestore
      const docRef = admin.firestore().doc(`restaurantes/${idRestaurante}/integrations/ifood`);
      await docRef.update({
        accessToken: admin.firestore.FieldValue.delete(),
        refreshToken: admin.firestore.FieldValue.delete(),
        accessTokenExpiry: admin.firestore.FieldValue.delete(),
        enabled: false,
        revokedAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      logger.info("iFood authorization revoked", {idRestaurante});

      return {
        success: true,
        message: "Authorization revoked successfully",
      };
    } catch (error) {
      logger.error("Error revoking authorization", {error: error.message});
      throw new Error(error.message);
    }
  }
);
