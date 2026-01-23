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
 * Get OAuth access token using refresh token (for distributed apps)
 * @param {object} credentials - Restaurant credentials with refreshToken
 * @return {Promise<string>} - Access token
 */
async function refreshIfoodAccessToken(credentials) {
  try {
    logger.info("Attempting to refresh access token for actions", {
      restaurantId: credentials.restaurantId,
      hasRefreshToken: !!credentials.refreshToken,
    });

    const params = [
      `grantType=refresh_token`,
      `clientId=${encodeURIComponent(ifoodClientId.value())}`,
      `clientSecret=${encodeURIComponent(ifoodClientSecret.value())}`,
      `refreshToken=${encodeURIComponent(credentials.refreshToken)}`,
    ].join('&');

    const response = await fetch(`${IFOOD_API_BASE_URL}/authentication/v1.0/oauth/token`, {
      method: "POST",
      headers: {
        "Accept": "application/json",
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params,
    });

    if (!response.ok) {
      const errorText = await response.text();
      logger.error("Failed to refresh access token", {
        restaurantId: credentials.restaurantId,
        status: response.status,
        statusText: response.statusText,
        error: errorText,
      });
      throw new Error(`Token refresh failed: ${response.status} - ${errorText}`);
    }

    const tokenData = await response.json();
    
    logger.info("Access token refreshed successfully", {
      restaurantId: credentials.restaurantId,
      expiresIn: tokenData.expiresIn,
    });

    return tokenData;
  } catch (error) {
    logger.error("Error refreshing access token", {
      restaurantId: credentials.restaurantId,
      error: error.message,
    });
    throw error;
  }
}

/**
 * Get valid access token for a restaurant
 * Checks if current token is valid, refreshes if needed
 * @param {string} idRestaurante - Restaurant ID
 * @return {Promise<string>} - Valid access token
 */
async function getValidAccessToken(idRestaurante) {
  const integrationRef = admin.firestore()
    .doc(`restaurantes/${idRestaurante}/integrations/ifood`);
  const integrationDoc = await integrationRef.get();

  if (!integrationDoc.exists) {
    throw new Error("Integração iFood não encontrada");
  }

  const integrationData = integrationDoc.data();

  if (!integrationData.enabled) {
    throw new Error("Integração iFood não está ativa");
  }

  if (!integrationData.refreshToken) {
    throw new Error("Token de autenticação iFood não configurado");
  }

  // Check if token needs refresh (expires in less than 5 minutes)
  const now = Date.now();
  const tokenExpiresAt = integrationData.tokenExpiresAt?.toMillis() || 0;
  const fiveMinutes = 5 * 60 * 1000;

  if (integrationData.accessToken && tokenExpiresAt > now + fiveMinutes) {
    logger.info("Using existing valid access token", {idRestaurante});
    return integrationData.accessToken;
  }

  // Refresh the token
  logger.info("Token expired or expiring soon, refreshing", {idRestaurante});
  
  const tokenData = await refreshIfoodAccessToken({
    restaurantId: idRestaurante,
    refreshToken: integrationData.refreshToken,
  });

  // Update stored token
  const expiresAt = new Date(now + (tokenData.expiresIn * 1000));
  await integrationRef.update({
    accessToken: tokenData.accessToken,
    tokenExpiresAt: admin.firestore.Timestamp.fromDate(expiresAt),
    lastTokenRefresh: admin.firestore.FieldValue.serverTimestamp(),
  });

  return tokenData.accessToken;
}

/**
 * Confirmar pedido no iFood
 * POST /order/v1.0/orders/{orderId}/confirm
 * 
 * @description Confirma o recebimento e aceite do pedido pelo restaurante
 */
exports.ifoodConfirmOrder = onCall(
  {
    secrets: [ifoodClientId, ifoodClientSecret],
    timeoutSeconds: 60,
    region: "southamerica-east1",
  },
  async (request) => {
    try {
      const {idRestaurante, orderId} = request.data;

      if (!idRestaurante || !orderId) {
        throw new Error("idRestaurante e orderId são obrigatórios");
      }

      logger.info("Confirmando pedido iFood", {idRestaurante, orderId});

      // Get valid access token
      const accessToken = await getValidAccessToken(idRestaurante);

      // Confirm order in iFood API
      const response = await fetch(
        `${IFOOD_API_BASE_URL}/order/v1.0/orders/${orderId}/confirm`,
        {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${accessToken}`,
            "Accept": "application/json",
          },
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        let errorData = {};
        try {
          errorData = JSON.parse(errorText);
        } catch {
          errorData = {message: errorText};
        }
        
        logger.error("Erro ao confirmar pedido iFood", {
          orderId,
          status: response.status,
          error: errorData,
        });
        
        throw new Error(
          errorData.message || `Erro ao confirmar pedido: ${response.status}`
        );
      }

      logger.info("Pedido confirmado com sucesso no iFood", {orderId});

      // Update local order status
      const orderRef = admin.firestore()
        .doc(`restaurantes/${idRestaurante}/ifoodOrders/${orderId}`);
      
      const orderDoc = await orderRef.get();
      if (orderDoc.exists) {
        await orderRef.update({
          ifoodStatus: "CONFIRMED",
          confirmedAt: admin.firestore.FieldValue.serverTimestamp(),
          lastActionAt: admin.firestore.FieldValue.serverTimestamp(),
          lastActionBy: request.auth?.uid || "system",
        });
      }

      return {
        success: true,
        message: "Pedido confirmado com sucesso",
        orderId,
      };
    } catch (error) {
      logger.error("Erro em ifoodConfirmOrder", {
        error: error.message,
        stack: error.stack,
      });
      throw new Error(error.message);
    }
  }
);

/**
 * Despachar pedido (marcar como saiu para entrega)
 * POST /order/v1.0/orders/{orderId}/dispatch
 * 
 * @description Marca o pedido como despachado/saiu para entrega
 */
exports.ifoodDispatchOrder = onCall(
  {
    secrets: [ifoodClientId, ifoodClientSecret],
    timeoutSeconds: 60,
    region: "southamerica-east1",
  },
  async (request) => {
    try {
      const {idRestaurante, orderId} = request.data;

      if (!idRestaurante || !orderId) {
        throw new Error("idRestaurante e orderId são obrigatórios");
      }

      logger.info("Despachando pedido iFood", {idRestaurante, orderId});

      // Get valid access token
      const accessToken = await getValidAccessToken(idRestaurante);

      // Dispatch order in iFood API
      const response = await fetch(
        `${IFOOD_API_BASE_URL}/order/v1.0/orders/${orderId}/dispatch`,
        {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${accessToken}`,
            "Accept": "application/json",
          },
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        let errorData = {};
        try {
          errorData = JSON.parse(errorText);
        } catch {
          errorData = {message: errorText};
        }
        
        logger.error("Erro ao despachar pedido iFood", {
          orderId,
          status: response.status,
          error: errorData,
        });
        
        throw new Error(
          errorData.message || `Erro ao despachar pedido: ${response.status}`
        );
      }

      logger.info("Pedido despachado com sucesso no iFood", {orderId});

      // Update local order status
      const orderRef = admin.firestore()
        .doc(`restaurantes/${idRestaurante}/ifoodOrders/${orderId}`);
      
      const orderDoc = await orderRef.get();
      if (orderDoc.exists) {
        await orderRef.update({
          ifoodStatus: "DISPATCHED",
          dispatchedAt: admin.firestore.FieldValue.serverTimestamp(),
          lastActionAt: admin.firestore.FieldValue.serverTimestamp(),
          lastActionBy: request.auth?.uid || "system",
        });
      }

      return {
        success: true,
        message: "Pedido despachado com sucesso",
        orderId,
      };
    } catch (error) {
      logger.error("Erro em ifoodDispatchOrder", {
        error: error.message,
        stack: error.stack,
      });
      throw new Error(error.message);
    }
  }
);

/**
 * Marcar pedido como pronto para retirada
 * POST /order/v1.0/orders/{orderId}/readyToPickup
 * 
 * @description Para pedidos TAKEOUT, marca como pronto para o cliente retirar
 */
exports.ifoodMarkReadyToPickup = onCall(
  {
    secrets: [ifoodClientId, ifoodClientSecret],
    timeoutSeconds: 60,
    region: "southamerica-east1",
  },
  async (request) => {
    try {
      const {idRestaurante, orderId} = request.data;

      if (!idRestaurante || !orderId) {
        throw new Error("idRestaurante e orderId são obrigatórios");
      }

      logger.info("Marcando pedido como pronto para retirada", {idRestaurante, orderId});

      // Get valid access token
      const accessToken = await getValidAccessToken(idRestaurante);

      // Mark order as ready to pickup in iFood API
      const response = await fetch(
        `${IFOOD_API_BASE_URL}/order/v1.0/orders/${orderId}/readyToPickup`,
        {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${accessToken}`,
            "Accept": "application/json",
          },
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        let errorData = {};
        try {
          errorData = JSON.parse(errorText);
        } catch {
          errorData = {message: errorText};
        }
        
        logger.error("Erro ao marcar pedido como pronto", {
          orderId,
          status: response.status,
          error: errorData,
        });
        
        throw new Error(
          errorData.message || `Erro ao marcar como pronto: ${response.status}`
        );
      }

      logger.info("Pedido marcado como pronto para retirada", {orderId});

      // Update local order status
      const orderRef = admin.firestore()
        .doc(`restaurantes/${idRestaurante}/ifoodOrders/${orderId}`);
      
      const orderDoc = await orderRef.get();
      if (orderDoc.exists) {
        await orderRef.update({
          ifoodStatus: "READY_TO_PICKUP",
          readyToPickupAt: admin.firestore.FieldValue.serverTimestamp(),
          lastActionAt: admin.firestore.FieldValue.serverTimestamp(),
          lastActionBy: request.auth?.uid || "system",
        });
      }

      return {
        success: true,
        message: "Pedido marcado como pronto para retirada",
        orderId,
      };
    } catch (error) {
      logger.error("Erro em ifoodMarkReadyToPickup", {
        error: error.message,
        stack: error.stack,
      });
      throw new Error(error.message);
    }
  }
);

/**
 * Buscar motivos de cancelamento disponíveis
 * GET /order/v1.0/orders/{orderId}/cancellationReasons
 * 
 * @description Retorna a lista de motivos de cancelamento disponíveis para o pedido
 * IMPORTANTE: Deve ser chamado antes de solicitar cancelamento
 */
exports.ifoodGetCancellationReasons = onCall(
  {
    secrets: [ifoodClientId, ifoodClientSecret],
    timeoutSeconds: 60,
    region: "southamerica-east1",
  },
  async (request) => {
    try {
      const {idRestaurante, orderId} = request.data;

      if (!idRestaurante || !orderId) {
        throw new Error("idRestaurante e orderId são obrigatórios");
      }

      logger.info("Buscando motivos de cancelamento iFood", {idRestaurante, orderId});

      // Get valid access token
      const accessToken = await getValidAccessToken(idRestaurante);

      // Get cancellation reasons from iFood API
      const response = await fetch(
        `${IFOOD_API_BASE_URL}/order/v1.0/orders/${orderId}/cancellationReasons`,
        {
          method: "GET",
          headers: {
            "Authorization": `Bearer ${accessToken}`,
            "Accept": "application/json",
          },
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        let errorData = {};
        try {
          errorData = JSON.parse(errorText);
        } catch {
          errorData = {message: errorText};
        }
        
        logger.error("Erro ao buscar motivos de cancelamento", {
          orderId,
          status: response.status,
          error: errorData,
        });
        
        throw new Error(
          errorData.message || `Erro ao buscar motivos: ${response.status}`
        );
      }

      const reasons = await response.json();
      
      logger.info("Motivos de cancelamento obtidos", {
        orderId,
        reasonCount: Array.isArray(reasons) ? reasons.length : 0,
      });

      return {
        success: true,
        reasons: reasons,
        orderId,
      };
    } catch (error) {
      logger.error("Erro em ifoodGetCancellationReasons", {
        error: error.message,
        stack: error.stack,
      });
      throw new Error(error.message);
    }
  }
);

/**
 * Solicitar cancelamento de pedido
 * POST /order/v1.0/orders/{orderId}/requestCancellation
 * 
 * @description Solicita o cancelamento do pedido com um motivo válido
 * IMPORTANTE: Consulte os motivos disponíveis com ifoodGetCancellationReasons antes
 */
exports.ifoodRequestCancellation = onCall(
  {
    secrets: [ifoodClientId, ifoodClientSecret],
    timeoutSeconds: 60,
    region: "southamerica-east1",
  },
  async (request) => {
    try {
      const {idRestaurante, orderId, cancellationCode, reason} = request.data;

      if (!idRestaurante || !orderId || !cancellationCode) {
        throw new Error("idRestaurante, orderId e cancellationCode são obrigatórios");
      }

      logger.info("Solicitando cancelamento de pedido iFood", {
        idRestaurante,
        orderId,
        cancellationCode,
        hasReason: !!reason,
      });

      // Get valid access token
      const accessToken = await getValidAccessToken(idRestaurante);

      // Build request body
      const body = {
        cancellationCode: cancellationCode,
      };

      // Reason is optional but recommended
      if (reason) {
        body.reason = reason;
      }

      // Request cancellation in iFood API
      const response = await fetch(
        `${IFOOD_API_BASE_URL}/order/v1.0/orders/${orderId}/requestCancellation`,
        {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${accessToken}`,
            "Accept": "application/json",
            "Content-Type": "application/json",
          },
          body: JSON.stringify(body),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        let errorData = {};
        try {
          errorData = JSON.parse(errorText);
        } catch {
          errorData = {message: errorText};
        }
        
        logger.error("Erro ao solicitar cancelamento", {
          orderId,
          cancellationCode,
          status: response.status,
          error: errorData,
        });
        
        throw new Error(
          errorData.message || `Erro ao cancelar pedido: ${response.status}`
        );
      }

      logger.info("Cancelamento solicitado com sucesso", {
        orderId,
        cancellationCode,
      });

      // Update local order status
      const orderRef = admin.firestore()
        .doc(`restaurantes/${idRestaurante}/ifoodOrders/${orderId}`);
      
      const orderDoc = await orderRef.get();
      if (orderDoc.exists) {
        await orderRef.update({
          ifoodStatus: "CANCELLATION_REQUESTED",
          cancellationRequestedAt: admin.firestore.FieldValue.serverTimestamp(),
          cancellationCode: cancellationCode,
          cancellationReason: reason || null,
          lastActionAt: admin.firestore.FieldValue.serverTimestamp(),
          lastActionBy: request.auth?.uid || "system",
        });
      }

      return {
        success: true,
        message: "Cancelamento solicitado com sucesso",
        orderId,
        cancellationCode,
      };
    } catch (error) {
      logger.error("Erro em ifoodRequestCancellation", {
        error: error.message,
        stack: error.stack,
      });
      throw new Error(error.message);
    }
  }
);

/**
 * Aceitar solicitação de cancelamento do cliente
 * POST /order/v1.0/orders/{orderId}/acceptCancellation
 * 
 * @description Aceita uma solicitação de cancelamento feita pelo cliente
 */
exports.ifoodAcceptCancellation = onCall(
  {
    secrets: [ifoodClientId, ifoodClientSecret],
    timeoutSeconds: 60,
    region: "southamerica-east1",
  },
  async (request) => {
    try {
      const {idRestaurante, orderId} = request.data;

      if (!idRestaurante || !orderId) {
        throw new Error("idRestaurante e orderId são obrigatórios");
      }

      logger.info("Aceitando cancelamento de pedido iFood", {idRestaurante, orderId});

      // Get valid access token
      const accessToken = await getValidAccessToken(idRestaurante);

      // Accept cancellation in iFood API
      const response = await fetch(
        `${IFOOD_API_BASE_URL}/order/v1.0/orders/${orderId}/acceptCancellation`,
        {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${accessToken}`,
            "Accept": "application/json",
          },
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        let errorData = {};
        try {
          errorData = JSON.parse(errorText);
        } catch {
          errorData = {message: errorText};
        }
        
        logger.error("Erro ao aceitar cancelamento", {
          orderId,
          status: response.status,
          error: errorData,
        });
        
        throw new Error(
          errorData.message || `Erro ao aceitar cancelamento: ${response.status}`
        );
      }

      logger.info("Cancelamento aceito com sucesso", {orderId});

      // Update local order status
      const orderRef = admin.firestore()
        .doc(`restaurantes/${idRestaurante}/ifoodOrders/${orderId}`);
      
      const orderDoc = await orderRef.get();
      if (orderDoc.exists) {
        await orderRef.update({
          ifoodStatus: "CANCELLED",
          cancelledAt: admin.firestore.FieldValue.serverTimestamp(),
          cancellationAccepted: true,
          lastActionAt: admin.firestore.FieldValue.serverTimestamp(),
          lastActionBy: request.auth?.uid || "system",
        });
      }

      return {
        success: true,
        message: "Cancelamento aceito com sucesso",
        orderId,
      };
    } catch (error) {
      logger.error("Erro em ifoodAcceptCancellation", {
        error: error.message,
        stack: error.stack,
      });
      throw new Error(error.message);
    }
  }
);

/**
 * Negar solicitação de cancelamento do cliente
 * POST /order/v1.0/orders/{orderId}/denyCancellation
 * 
 * @description Nega uma solicitação de cancelamento feita pelo cliente
 */
exports.ifoodDenyCancellation = onCall(
  {
    secrets: [ifoodClientId, ifoodClientSecret],
    timeoutSeconds: 60,
    region: "southamerica-east1",
  },
  async (request) => {
    try {
      const {idRestaurante, orderId, reason} = request.data;

      if (!idRestaurante || !orderId) {
        throw new Error("idRestaurante e orderId são obrigatórios");
      }

      logger.info("Negando cancelamento de pedido iFood", {
        idRestaurante,
        orderId,
        hasReason: !!reason,
      });

      // Get valid access token
      const accessToken = await getValidAccessToken(idRestaurante);

      // Build request body (reason is optional)
      const body = reason ? {reason} : {};

      // Deny cancellation in iFood API
      const response = await fetch(
        `${IFOOD_API_BASE_URL}/order/v1.0/orders/${orderId}/denyCancellation`,
        {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${accessToken}`,
            "Accept": "application/json",
            "Content-Type": "application/json",
          },
          body: JSON.stringify(body),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        let errorData = {};
        try {
          errorData = JSON.parse(errorText);
        } catch {
          errorData = {message: errorText};
        }
        
        logger.error("Erro ao negar cancelamento", {
          orderId,
          status: response.status,
          error: errorData,
        });
        
        throw new Error(
          errorData.message || `Erro ao negar cancelamento: ${response.status}`
        );
      }

      logger.info("Cancelamento negado com sucesso", {orderId});

      // Update local order status
      const orderRef = admin.firestore()
        .doc(`restaurantes/${idRestaurante}/ifoodOrders/${orderId}`);
      
      const orderDoc = await orderRef.get();
      if (orderDoc.exists) {
        await orderRef.update({
          cancellationDenied: true,
          cancellationDeniedAt: admin.firestore.FieldValue.serverTimestamp(),
          cancellationDeniedReason: reason || null,
          lastActionAt: admin.firestore.FieldValue.serverTimestamp(),
          lastActionBy: request.auth?.uid || "system",
        });
      }

      return {
        success: true,
        message: "Cancelamento negado com sucesso",
        orderId,
      };
    } catch (error) {
      logger.error("Erro em ifoodDenyCancellation", {
        error: error.message,
        stack: error.stack,
      });
      throw new Error(error.message);
    }
  }
);
