/* eslint-env node */
/* eslint-disable no-undef */
const {onCall} = require("firebase-functions/v2/https");
const {defineSecret} = require("firebase-functions/params");
const logger = require("firebase-functions/logger");
const admin = require("firebase-admin");

// iFood API configuration
const IFOOD_API_BASE_URL = "https://merchant-api.ifood.com.br";

// Standard headers for iFood API requests
// Using lowercase 'accept' and adding User-Agent to avoid WAF blocks
const IFOOD_API_HEADERS = {
  "accept": "application/json",
  "Content-Type": "application/json",
  "User-Agent": "MesaFacil/1.0 (Firebase Cloud Functions)",
};

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
        "accept": "application/json",
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent": "MesaFacil/1.0 (Firebase Cloud Functions)",
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
  // Support both field names: accessTokenExpiry (used by ifood-polling/auth) and tokenExpiresAt (legacy)
  const expiryField = integrationData.accessTokenExpiry || integrationData.tokenExpiresAt;
  const tokenExpiresAt = expiryField?.toMillis?.() || (expiryField?.toDate ? expiryField.toDate().getTime() : 0);
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

  // Update stored token - use accessTokenExpiry to match ifood-polling.js convention
  const expiresAt = new Date(now + (tokenData.expiresIn * 1000));
  await integrationRef.update({
    accessToken: tokenData.accessToken,
    accessTokenExpiry: admin.firestore.Timestamp.fromDate(expiresAt),
    refreshToken: tokenData.refreshToken || integrationData.refreshToken,
    lastTokenRefresh: admin.firestore.FieldValue.serverTimestamp(),
    needsReauthorization: false,
    lastError: null,
  });

  return tokenData.accessToken;
}

/**
 * iFood status precedence map (higher = more advanced in lifecycle)
 */
const IFOOD_STATUS_PRECEDENCE = {
  "PLACED": 1,
  "INTEGRATED": 1,
  "PENDING": 1,
  "ACCEPTED": 2,
  "CONFIRMED": 3,
  "READY_TO_PICKUP": 4,
  "DISPATCHED": 4,
  "CONCLUDED": 5,
  "CANCELLED": 5,
  "CANCELLATION_REQUESTED": 3,
  "REJECTED": 5,
};

/**
 * Map iFood status to MesaFacil status
 */
const IFOOD_TO_MESAFACIL_STATUS = {
  "INTEGRATED": "andamento",
  "PENDING": "andamento",
  "PLACED": "andamento",
  "ACCEPTED": "andamento",
  "CONFIRMED": "andamento",
  "READY_TO_PICKUP": "andamento",
  "DISPATCHED": "andamento",
  "CONCLUDED": "entregue",
  "CANCELLED": "cancelado",
  "CANCELLATION_REQUESTED": "andamento",
  "REJECTED": "cancelado",
};

/**
 * Sync iFood action status change to the MesaFacil order in mesas/ifood/pedidos.
 * This ensures that when an action (confirm, dispatch, etc.) is performed via MesaFacil,
 * the mesa pedido document is immediately updated — not just ifoodOrders.
 * 
 * @param {string} idRestaurante - Restaurant ID
 * @param {string} ifoodOrderId - iFood order ID (doc ID in ifoodOrders collection)
 * @param {string} newIfoodStatus - The new iFood status after the action
 * @param {string} actionBy - Who performed the action (uid or "system")
 */
async function syncActionToMesaFacilOrder(idRestaurante, ifoodOrderId, newIfoodStatus, actionBy) {
  try {
    // Get the ifoodOrders doc to find the linked mesaFacilOrderId
    const ifoodOrderRef = admin.firestore()
      .doc(`restaurantes/${idRestaurante}/ifoodOrders/${ifoodOrderId}`);
    const ifoodOrderDoc = await ifoodOrderRef.get();

    if (!ifoodOrderDoc.exists) {
      logger.warn("syncActionToMesaFacilOrder: ifoodOrders doc not found", {
        idRestaurante, ifoodOrderId,
      });
      return;
    }

    const mesaFacilOrderId = ifoodOrderDoc.data().mesaFacilOrderId;
    if (!mesaFacilOrderId) {
      logger.warn("syncActionToMesaFacilOrder: no mesaFacilOrderId linked", {
        idRestaurante, ifoodOrderId,
      });
      return;
    }

    const mesaFacilStatus = IFOOD_TO_MESAFACIL_STATUS[newIfoodStatus] || "andamento";

    const pedidoRef = admin.firestore()
      .doc(`restaurantes/${idRestaurante}/mesas/ifood/pedidos/${mesaFacilOrderId}`);

    const updateData = {
      ifoodStatus: newIfoodStatus,
      status: mesaFacilStatus,
      lastSyncedFromIfood: admin.firestore.FieldValue.serverTimestamp(),
      ifoodStatusHistory: admin.firestore.FieldValue.arrayUnion({
        status: newIfoodStatus,
        changedAt: new Date().toISOString(),
        source: "mesafacil",
        actionBy: actionBy || "system",
      }),
    };

    if (mesaFacilStatus === "cancelado") {
      updateData.canceladoEm = admin.firestore.FieldValue.serverTimestamp();
    }
    if (mesaFacilStatus === "entregue") {
      updateData.finalizadoEm = admin.firestore.FieldValue.serverTimestamp();
    }

    await pedidoRef.update(updateData);

    logger.info("syncActionToMesaFacilOrder: mesa pedido updated", {
      idRestaurante,
      ifoodOrderId,
      mesaFacilOrderId,
      newIfoodStatus,
      mesaFacilStatus,
    });
  } catch (error) {
    logger.error("syncActionToMesaFacilOrder: error", {
      idRestaurante,
      ifoodOrderId,
      newIfoodStatus,
      error: error.message,
    });
    // Don't throw — the iFood action itself succeeded; this is best-effort sync
  }
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
    region: "us-central1",
    cors: true,
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
            ...IFOOD_API_HEADERS,
            "Authorization": `Bearer ${accessToken}`,
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

      // Update local order status in ifoodOrders collection
      const orderRef = admin.firestore()
        .doc(`restaurantes/${idRestaurante}/ifoodOrders/${orderId}`);
      
      const orderDoc = await orderRef.get();
      if (orderDoc.exists) {
        await orderRef.update({
          ifoodStatus: "CONFIRMED",
          status: "CONFIRMED",
          confirmedAt: admin.firestore.FieldValue.serverTimestamp(),
          lastActionAt: admin.firestore.FieldValue.serverTimestamp(),
          lastActionBy: request.auth?.uid || "system",
        });
      }

      // Sync status to mesas/ifood/pedidos so UI reflects the change immediately
      await syncActionToMesaFacilOrder(
        idRestaurante, orderId, "CONFIRMED", request.auth?.uid || "system"
      );

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
    region: "us-central1",
    cors: true,
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
            ...IFOOD_API_HEADERS,
            "Authorization": `Bearer ${accessToken}`,
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

      // Update local order status in ifoodOrders collection
      const orderRef = admin.firestore()
        .doc(`restaurantes/${idRestaurante}/ifoodOrders/${orderId}`);
      
      const orderDoc = await orderRef.get();
      if (orderDoc.exists) {
        await orderRef.update({
          ifoodStatus: "DISPATCHED",
          status: "DISPATCHED",
          dispatchedAt: admin.firestore.FieldValue.serverTimestamp(),
          lastActionAt: admin.firestore.FieldValue.serverTimestamp(),
          lastActionBy: request.auth?.uid || "system",
        });
      }

      // Sync status to mesas/ifood/pedidos so UI reflects the change immediately
      await syncActionToMesaFacilOrder(
        idRestaurante, orderId, "DISPATCHED", request.auth?.uid || "system"
      );

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
    region: "us-central1",
    cors: true,
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
            ...IFOOD_API_HEADERS,
            "Authorization": `Bearer ${accessToken}`,
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

      // Update local order status in ifoodOrders collection
      const orderRef = admin.firestore()
        .doc(`restaurantes/${idRestaurante}/ifoodOrders/${orderId}`);
      
      const orderDoc = await orderRef.get();
      if (orderDoc.exists) {
        await orderRef.update({
          ifoodStatus: "READY_TO_PICKUP",
          status: "READY_TO_PICKUP",
          readyToPickupAt: admin.firestore.FieldValue.serverTimestamp(),
          lastActionAt: admin.firestore.FieldValue.serverTimestamp(),
          lastActionBy: request.auth?.uid || "system",
        });
      }

      // Sync status to mesas/ifood/pedidos so UI reflects the change immediately
      await syncActionToMesaFacilOrder(
        idRestaurante, orderId, "READY_TO_PICKUP", request.auth?.uid || "system"
      );

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
    region: "us-central1",
    cors: true,
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
            ...IFOOD_API_HEADERS,
            "Authorization": `Bearer ${accessToken}`,
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
      
      // Log detailed structure to debug field names
      logger.info("Motivos de cancelamento obtidos", {
        orderId,
        reasonCount: Array.isArray(reasons) ? reasons.length : 0,
        firstReason: Array.isArray(reasons) && reasons.length > 0 ? reasons[0] : null,
        allFields: Array.isArray(reasons) && reasons.length > 0 ? Object.keys(reasons[0]) : [],
      });

      // Normalize field names - iFood may use different field names
      // Possible fields: cancelCodeId, cancellationCode, code, cancelCode
      const normalizedReasons = Array.isArray(reasons) ? reasons.map(r => ({
        code: r.cancelCodeId || r.cancellationCode || r.code || r.cancelCode,
        description: r.description || r.cancelDescription || r.reason || '',
        // Keep original for debugging
        _original: r,
      })) : [];

      logger.info("Motivos normalizados", {
        orderId,
        normalizedCount: normalizedReasons.length,
        firstNormalized: normalizedReasons.length > 0 ? normalizedReasons[0] : null,
      });

      return {
        success: true,
        reasons: normalizedReasons,
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
    region: "us-central1",
    cors: true,
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
            ...IFOOD_API_HEADERS,
            "Authorization": `Bearer ${accessToken}`,
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

      // Update local order status in ifoodOrders collection
      const orderRef = admin.firestore()
        .doc(`restaurantes/${idRestaurante}/ifoodOrders/${orderId}`);
      
      const orderDoc = await orderRef.get();
      if (orderDoc.exists) {
        await orderRef.update({
          ifoodStatus: "CANCELLATION_REQUESTED",
          status: "CANCELLATION_REQUESTED",
          cancellationRequestedAt: admin.firestore.FieldValue.serverTimestamp(),
          cancellationCode: cancellationCode,
          cancellationReason: reason || null,
          lastActionAt: admin.firestore.FieldValue.serverTimestamp(),
          lastActionBy: request.auth?.uid || "system",
        });
      }

      // Sync status to mesas/ifood/pedidos so UI reflects the change immediately
      await syncActionToMesaFacilOrder(
        idRestaurante, orderId, "CANCELLATION_REQUESTED", request.auth?.uid || "system"
      );

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
    region: "us-central1",
    cors: true,
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
            ...IFOOD_API_HEADERS,
            "Authorization": `Bearer ${accessToken}`,
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

      // Update local order status in ifoodOrders collection
      const orderRef = admin.firestore()
        .doc(`restaurantes/${idRestaurante}/ifoodOrders/${orderId}`);
      
      const orderDoc = await orderRef.get();
      if (orderDoc.exists) {
        await orderRef.update({
          ifoodStatus: "CANCELLED",
          status: "CANCELLED",
          cancelledAt: admin.firestore.FieldValue.serverTimestamp(),
          cancellationAccepted: true,
          lastActionAt: admin.firestore.FieldValue.serverTimestamp(),
          lastActionBy: request.auth?.uid || "system",
        });
      }

      // Sync status to mesas/ifood/pedidos so UI reflects the change immediately
      await syncActionToMesaFacilOrder(
        idRestaurante, orderId, "CANCELLED", request.auth?.uid || "system"
      );

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
    region: "us-central1",
    cors: true,
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
            ...IFOOD_API_HEADERS,
            "Authorization": `Bearer ${accessToken}`,
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

      // Update local order status in ifoodOrders collection
      const orderRef = admin.firestore()
        .doc(`restaurantes/${idRestaurante}/ifoodOrders/${orderId}`);
      
      const orderDoc = await orderRef.get();
      if (orderDoc.exists) {
        const currentData = orderDoc.data();
        // Restore previous status since cancellation was denied
        const restoredStatus = currentData.previousIfoodStatus || currentData.ifoodStatus || "CONFIRMED";
        await orderRef.update({
          ifoodStatus: restoredStatus,
          status: restoredStatus,
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

// ===================================================================
// Handshake (Negotiation Platform) Functions
// ===================================================================

/**
 * Accept a Handshake dispute (agree with customer's cancellation request)
 * POST /order/v1.0/disputes/{disputeId}/accept
 *
 * @description Accepts the customer's dispute, agreeing to the cancellation/refund
 */
exports.ifoodAcceptDispute = onCall(
  {
    secrets: [ifoodClientId, ifoodClientSecret],
    timeoutSeconds: 60,
    region: "us-central1",
    cors: true,
  },
  async (request) => {
    try {
      const {idRestaurante, disputeId, orderId, reason, detailReason} = request.data;

      if (!idRestaurante || !disputeId) {
        throw new Error("idRestaurante e disputeId são obrigatórios");
      }

      logger.info("Aceitando disputa Handshake iFood", {idRestaurante, disputeId, orderId, reason});

      const accessToken = await getValidAccessToken(idRestaurante);

      // Build body — reason/detailReason required when acceptCancellationReasons present
      const body = {};
      if (reason) body.reason = reason;
      if (detailReason) body.detailReason = detailReason;

      const response = await fetch(
        `${IFOOD_API_BASE_URL}/order/v1.0/disputes/${disputeId}/accept`,
        {
          method: "POST",
          headers: {
            ...IFOOD_API_HEADERS,
            "Authorization": `Bearer ${accessToken}`,
          },
          body: Object.keys(body).length > 0 ? JSON.stringify(body) : undefined,
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

        logger.error("Erro ao aceitar disputa Handshake", {
          disputeId,
          status: response.status,
          error: errorData,
        });

        throw new Error(
          errorData.message || `Erro ao aceitar disputa: ${response.status}`
        );
      }

      logger.info("Disputa aceita com sucesso", {disputeId});

      // Update dispute in Firestore
      const disputeRef = admin.firestore()
        .doc(`restaurantes/${idRestaurante}/ifoodDisputes/${disputeId}`);
      const disputeDoc = await disputeRef.get();
      if (disputeDoc.exists) {
        await disputeRef.update({
          status: "ACCEPTED",
          respondedAt: admin.firestore.FieldValue.serverTimestamp(),
          respondedBy: request.auth?.uid || "system",
          responseType: "ACCEPTED",
        });
      }

      // Clear dispute flag from order
      if (orderId) {
        const orderRef = admin.firestore()
          .doc(`restaurantes/${idRestaurante}/ifoodOrders/${orderId}`);
        const orderDoc = await orderRef.get();
        if (orderDoc.exists) {
          await orderRef.update({
            needsManualReview: false,
            activeDisputeId: null,
            lastActionAt: admin.firestore.FieldValue.serverTimestamp(),
            lastActionBy: request.auth?.uid || "system",
          });
        }
      }

      return {
        success: true,
        message: "Disputa aceita com sucesso",
        disputeId,
        orderId,
      };
    } catch (error) {
      logger.error("Erro em ifoodAcceptDispute", {
        error: error.message,
        stack: error.stack,
      });
      throw new Error(error.message);
    }
  }
);

/**
 * Reject a Handshake dispute (disagree with customer's cancellation request)
 * POST /order/v1.0/disputes/{disputeId}/reject
 *
 * @description Rejects the customer's dispute. iFood mediates the final decision.
 */
exports.ifoodRejectDispute = onCall(
  {
    secrets: [ifoodClientId, ifoodClientSecret],
    timeoutSeconds: 60,
    region: "us-central1",
    cors: true,
  },
  async (request) => {
    try {
      const {idRestaurante, disputeId, orderId, reason} = request.data;

      if (!idRestaurante || !disputeId) {
        throw new Error("idRestaurante e disputeId são obrigatórios");
      }

      logger.info("Rejeitando disputa Handshake iFood", {
        idRestaurante,
        disputeId,
        orderId,
        hasReason: !!reason,
      });

      const accessToken = await getValidAccessToken(idRestaurante);

      const body = reason ? {reason} : {};

      const response = await fetch(
        `${IFOOD_API_BASE_URL}/order/v1.0/disputes/${disputeId}/reject`,
        {
          method: "POST",
          headers: {
            ...IFOOD_API_HEADERS,
            "Authorization": `Bearer ${accessToken}`,
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

        logger.error("Erro ao rejeitar disputa Handshake", {
          disputeId,
          status: response.status,
          error: errorData,
        });

        throw new Error(
          errorData.message || `Erro ao rejeitar disputa: ${response.status}`
        );
      }

      logger.info("Disputa rejeitada com sucesso", {disputeId});

      // Update dispute in Firestore
      const disputeRef = admin.firestore()
        .doc(`restaurantes/${idRestaurante}/ifoodDisputes/${disputeId}`);
      const disputeDoc = await disputeRef.get();
      if (disputeDoc.exists) {
        await disputeRef.update({
          status: "REJECTED",
          respondedAt: admin.firestore.FieldValue.serverTimestamp(),
          respondedBy: request.auth?.uid || "system",
          responseType: "REJECTED",
          rejectionReason: reason || null,
        });
      }

      // Update order — dispute still pending iFood mediation, keep flag
      if (orderId) {
        const orderRef = admin.firestore()
          .doc(`restaurantes/${idRestaurante}/ifoodOrders/${orderId}`);
        const orderDoc = await orderRef.get();
        if (orderDoc.exists) {
          await orderRef.update({
            lastActionAt: admin.firestore.FieldValue.serverTimestamp(),
            lastActionBy: request.auth?.uid || "system",
          });
        }
      }

      return {
        success: true,
        message: "Disputa rejeitada com sucesso. O iFood irá mediar a decisão final.",
        disputeId,
        orderId,
      };
    } catch (error) {
      logger.error("Erro em ifoodRejectDispute", {
        error: error.message,
        stack: error.stack,
      });
      throw new Error(error.message);
    }
  }
);

/**
 * Select an alternative for a Handshake dispute (counter-offer/partial refund)
 * POST /order/v1.0/disputes/{disputeId}/alternatives/{alternativeId}
 *
 * @description Selects one of the available alternatives proposed in the dispute
 */
exports.ifoodSelectDisputeAlternative = onCall(
  {
    secrets: [ifoodClientId, ifoodClientSecret],
    timeoutSeconds: 60,
    region: "us-central1",
    cors: true,
  },
  async (request) => {
    try {
      const {idRestaurante, disputeId, alternativeId, orderId, alternativeBody} = request.data;

      if (!idRestaurante || !disputeId || !alternativeId) {
        throw new Error("idRestaurante, disputeId e alternativeId são obrigatórios");
      }

      if (!alternativeBody || !alternativeBody.type) {
        throw new Error("alternativeBody com type é obrigatório");
      }

      logger.info("Selecionando alternativa para disputa Handshake iFood", {
        idRestaurante,
        disputeId,
        alternativeId,
        orderId,
        alternativeType: alternativeBody.type,
      });

      const accessToken = await getValidAccessToken(idRestaurante);

      const response = await fetch(
        `${IFOOD_API_BASE_URL}/order/v1.0/disputes/${disputeId}/alternatives/${alternativeId}`,
        {
          method: "POST",
          headers: {
            ...IFOOD_API_HEADERS,
            "Authorization": `Bearer ${accessToken}`,
          },
          body: JSON.stringify(alternativeBody),
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

        logger.error("Erro ao selecionar alternativa da disputa", {
          disputeId,
          alternativeId,
          status: response.status,
          error: errorData,
        });

        throw new Error(
          errorData.message || `Erro ao selecionar alternativa: ${response.status}`
        );
      }

      logger.info("Alternativa selecionada com sucesso", {disputeId, alternativeId});

      // Update dispute in Firestore
      const disputeRef = admin.firestore()
        .doc(`restaurantes/${idRestaurante}/ifoodDisputes/${disputeId}`);
      const disputeDoc = await disputeRef.get();
      if (disputeDoc.exists) {
        await disputeRef.update({
          status: "ALTERNATIVE_SELECTED",
          respondedAt: admin.firestore.FieldValue.serverTimestamp(),
          respondedBy: request.auth?.uid || "system",
          responseType: "ALTERNATIVE",
          selectedAlternativeId: alternativeId,
        });
      }

      // Clear dispute flag from order
      if (orderId) {
        const orderRef = admin.firestore()
          .doc(`restaurantes/${idRestaurante}/ifoodOrders/${orderId}`);
        const orderDoc = await orderRef.get();
        if (orderDoc.exists) {
          await orderRef.update({
            needsManualReview: false,
            activeDisputeId: null,
            lastActionAt: admin.firestore.FieldValue.serverTimestamp(),
            lastActionBy: request.auth?.uid || "system",
          });
        }
      }

      return {
        success: true,
        message: "Alternativa selecionada com sucesso",
        disputeId,
        alternativeId,
        orderId,
      };
    } catch (error) {
      logger.error("Erro em ifoodSelectDisputeAlternative", {
        error: error.message,
        stack: error.stack,
      });
      throw new Error(error.message);
    }
  }
);

/**
 * Proxy iFood cancellation evidence images (requires iFood auth)
 * Returns the image as base64 data URI so the frontend can display it.
 *
 * @param {string} idRestaurante - Restaurant ID
 * @param {string} evidenceUrl - Full evidence URL from iFood
 * @returns {Promise<{success: boolean, dataUri: string}>}
 */
exports.ifoodGetDisputeEvidence = onCall(
  {
    secrets: [ifoodClientId, ifoodClientSecret],
    timeoutSeconds: 30,
    region: "us-central1",
    cors: true,
  },
  async (request) => {
    try {
      const {idRestaurante, evidenceUrl} = request.data;

      if (!idRestaurante || !evidenceUrl) {
        throw new Error("idRestaurante e evidenceUrl são obrigatórios");
      }

      // Only allow iFood merchant-api URLs to prevent SSRF
      if (!evidenceUrl.startsWith("https://merchant-api.ifood.com.br/")) {
        throw new Error("URL de evidência inválida");
      }

      const accessToken = await getValidAccessToken(idRestaurante);

      const response = await fetch(evidenceUrl, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "User-Agent": "MesaFacil/1.0 (Firebase Cloud Functions)",
        },
      });

      if (!response.ok) {
        throw new Error(`Erro ao buscar evidência: ${response.status}`);
      }

      const contentType = response.headers.get("content-type") || "image/jpeg";
      const arrayBuffer = await response.arrayBuffer();
      const base64 = Buffer.from(arrayBuffer).toString("base64");
      const dataUri = `data:${contentType};base64,${base64}`;

      return {success: true, dataUri};
    } catch (error) {
      logger.error("Erro em ifoodGetDisputeEvidence", {
        error: error.message,
      });
      throw new Error(error.message);
    }
  }
);
