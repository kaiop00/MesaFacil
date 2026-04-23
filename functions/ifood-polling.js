/* eslint-env node */
/* eslint-disable no-undef */
const {onSchedule} = require("firebase-functions/v2/scheduler");
const {onCall, HttpsError} = require("firebase-functions/v2/https");
const {defineSecret} = require("firebase-functions/params");
const logger = require("firebase-functions/logger");
const admin = require("firebase-admin");

// iFood API configuration
const IFOOD_API_BASE_URL = "https://merchant-api.ifood.com.br";

/**
 * iFood status precedence map (higher = more advanced in lifecycle)
 * Used to prevent status regression when polling returns stale events
 */
const IFOOD_STATUS_PRECEDENCE = {
  "PLACED": 1,
  "INTEGRATED": 1,
  "PENDING": 1,
  "ACCEPTED": 2,
  "CONFIRMED": 3,
  "CANCELLATION_REQUESTED": 3,
  "CANCELLATION_REQUEST_FAILED": 3,
  "READY_TO_PICKUP": 4,
  "DISPATCHED": 4,
  "CONCLUDED": 5,
  "CANCELLED": 5,
  "REJECTED": 5,
};

// Define secrets for distributed app credentials
const ifoodClientId = defineSecret("IFOOD_CLIENT_ID");
const ifoodClientSecret = defineSecret("IFOOD_CLIENT_SECRET");

function extractMerchantIdFromResponse(payload) {
  if (!payload) return null;

  if (Array.isArray(payload)) {
    return payload[0]?.id || payload[0]?.merchantId || payload[0]?.merchant_id || null;
  }

  if (Array.isArray(payload.content)) {
    return payload.content[0]?.id || payload.content[0]?.merchantId || payload.content[0]?.merchant_id || null;
  }

  if (Array.isArray(payload.merchants)) {
    return payload.merchants[0]?.id || payload.merchants[0]?.merchantId || payload.merchants[0]?.merchant_id || null;
  }

  if (Array.isArray(payload.data)) {
    return payload.data[0]?.id || payload.data[0]?.merchantId || payload.data[0]?.merchant_id || null;
  }

  return payload.id || payload.merchantId || payload.merchant_id || null;
}

/**
 * Get OAuth access token using refresh token (for distributed apps)
 * @param {object} credentials - Restaurant credentials with refreshToken
 * @return {Promise<string>} - Access token
 */
async function refreshIfoodAccessToken(credentials) {
  try {
    logger.info("Attempting to refresh access token", {
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
      
      // Mark integration as needing reauthorization immediately
      const docRef = admin.firestore().doc(`restaurantes/${credentials.restaurantId}/integrations/ifood`);
      await docRef.update({
        needsReauthorization: true,
        lastError: `Failed to refresh token (${response.status}): ${response.statusText}`,
        lastErrorAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      
      throw new Error(`Failed to refresh token (${response.status}): ${response.statusText}. Por favor, reconecte com o iFood.`);
    }

    const data = await response.json();
    
    logger.info("Token refresh response received", {
      restaurantId: credentials.restaurantId,
      hasAccessToken: !!data.accessToken,
      hasRefreshToken: !!data.refreshToken,
      expiresIn: data.expiresIn,
    });
    
    // Save new tokens to Firestore
    const docRef = admin.firestore().doc(`restaurantes/${credentials.restaurantId}/integrations/ifood`);
    await docRef.update({
      accessToken: data.accessToken,
      refreshToken: data.refreshToken || credentials.refreshToken, // Some APIs don't return new refresh token
      accessTokenExpiry: admin.firestore.Timestamp.fromDate(new Date(Date.now() + (data.expiresIn * 1000))),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      needsReauthorization: false, // Clear flag on successful refresh
      lastError: null,
    });

    logger.info("Access token refreshed successfully", {
      restaurantId: credentials.restaurantId,
    });

    return data.accessToken;
  } catch (error) {
    logger.error("Error refreshing access token", {
      restaurantId: credentials.restaurantId,
      error: error.message,
    });
    
    // Mark integration as needing reauthorization
    const docRef = admin.firestore().doc(`restaurantes/${credentials.restaurantId}/integrations/ifood`);
    await docRef.update({
      enabled: false,
      needsReauthorization: true,
      lastError: error.message,
      lastErrorAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    
    throw error;
  }
}

/**
 * Get valid access token (refresh if needed)
 * @param {object} credentials - Restaurant credentials
 * @return {Promise<string>} - Valid access token
 */
async function getValidAccessToken(credentials) {
  // Check if token is still valid
  if (credentials.accessToken && credentials.accessTokenExpiry) {
    const expiryDate = credentials.accessTokenExpiry.toDate ? 
      credentials.accessTokenExpiry.toDate() : 
      new Date(credentials.accessTokenExpiry);
    
    const now = new Date();
    const timeUntilExpiry = expiryDate - now;
    
    logger.info("Checking token expiry", {
      restaurantId: credentials.restaurantId,
      expiryDate: expiryDate.toISOString(),
      now: now.toISOString(),
      timeUntilExpiryMinutes: Math.floor(timeUntilExpiry / 60000),
      isExpired: expiryDate <= now,
    });
    
    // Add 5 minute buffer before expiry
    if (expiryDate > new Date(Date.now() + 5 * 60 * 1000)) {
      logger.info("Using existing access token", {
        restaurantId: credentials.restaurantId,
      });
      return credentials.accessToken;
    }
    
    logger.info("Token expired or expiring soon, refreshing", {
      restaurantId: credentials.restaurantId,
    });
  } else {
    logger.warn("Access token or expiry missing", {
      restaurantId: credentials.restaurantId,
      hasToken: !!credentials.accessToken,
      hasExpiry: !!credentials.accessTokenExpiry,
    });
  }

  // Token expired or missing, refresh it
  return await refreshIfoodAccessToken(credentials);
}

/**
 * Resolve merchant ID from the iFood API when Firestore does not have it yet.
 * @param {string} accessToken - Valid iFood access token
 * @return {Promise<string|null>} - Merchant ID or null
 */
async function resolveMerchantIdFromIfood(accessToken) {
  try {
    const response = await fetch(`${IFOOD_API_BASE_URL}/merchant/v1.0/merchants`, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "accept": "application/json",
      },
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => "");
      logger.warn("Failed to resolve merchant ID from iFood", {
        status: response.status,
        statusText: response.statusText,
        error: errorText,
      });
      return null;
    }

    const payload = await response.json().catch(() => null);
    return extractMerchantIdFromResponse(payload);
  } catch (error) {
    logger.warn("Error resolving merchant ID from iFood", {
      error: error.message,
    });
    return null;
  }
}

/**
 * Fetch events from iFood polling endpoint
 * @param {Array<string>} merchantIds - Array of merchant IDs to poll
 * @param {string} accessToken - Access token
 * @return {Promise<Array>} - Array of events
 */
async function pollIfoodEvents(merchantIds, accessToken) {
  try {
    // Use x-polling-merchants header to fetch events for multiple merchants in one call
    const merchantIdsParam = merchantIds.join(",");
    
    const response = await fetch(
      `${IFOOD_API_BASE_URL}/events/v1.0/events:polling`,
      {
        method: "GET",
        headers: {
          "accept": "application/json",
          "x-polling-merchants": merchantIdsParam,
          "Authorization": `Bearer ${accessToken}`,
        },
      }
    );

    if (!response.ok) {
      const error = await response.text();
      logger.error("Failed to poll iFood events", {
        merchantIds,
        status: response.status,
        error: error,
      });
      
      // For 403 errors, throw to inform the caller
      if (response.status === 403) {
        throw new Error(`iFood API retornou erro 403 (Forbidden). O token pode estar expirado ou o merchant não tem permissão. Detalhes: ${JSON.stringify(error)}`);
      }

      throw new Error(`Falha ao consultar eventos do iFood (${response.status}): ${response.statusText}`);
    }

    // Handle 204 No Content - no events available
    if (response.status === 204) {
      logger.info("No events available (204 No Content)", {merchantIds});
      return [];
    }

    // Parse JSON response
    const data = await response.json();
    return data || [];
  } catch (error) {
    logger.error("Error polling iFood events", {
      merchantIds,
      error: error.message,
    });
    throw error;
  }
}

/**
 * Fetch full order details from iFood API
 * @param {string} orderId - iFood order ID
 * @param {string} accessToken - Access token
 * @return {Promise<object|null>} - Order data or null
 */
async function fetchIfoodOrder(orderId, accessToken) {
  try {
    const response = await fetch(
      `${IFOOD_API_BASE_URL}/order/v1.0/orders/${orderId}`,
      {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "accept": "application/json",
        },
      }
    );

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      logger.error("Failed to fetch iFood order", {orderId, error});
      return null;
    }

    return await response.json();
  } catch (error) {
    logger.error("Error fetching iFood order", {orderId, error: error.message});
    return null;
  }
}

/**
 * Acknowledge event to prevent it from appearing in future polls
 * @param {Array<object>} events - Array of event objects to acknowledge
 * @param {string} accessToken - Access token
 * @return {Promise<boolean>} - Success status
 */
async function acknowledgeIfoodEvents(events, accessToken) {
  try {
    // API expects array of event objects with at least { id: "..." }
    // We can send the full event payload or just the IDs wrapped in objects
    const eventPayload = events.map(event => {
      // If event is already an object with id, use it
      if (typeof event === 'object' && event.id) {
        return event;
      }
      // If event is just an ID string, wrap it
      return { id: event };
    });

    const response = await fetch(
      `${IFOOD_API_BASE_URL}/events/v1.0/events/acknowledgment`,
      {
        method: "POST",
        headers: {
          "accept": "application/json",
          "Content-Type": "application/json",
          "Authorization": `Bearer ${accessToken}`,
        },
        body: JSON.stringify(eventPayload),
      }
    );

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      
      // Se ACK já foi feito, não é erro crítico
      if (response.status === 409 || response.status === 404) {
        logger.warn("Events already acknowledged or not found", {
          eventCount: events.length,
          status: response.status,
        });
        return true; // Considera sucesso
      }
      
      logger.error("Failed to acknowledge events", {
        eventCount: events.length,
        error,
        statusCode: response.status,
      });
      return false;
    }

    logger.info("Events acknowledged successfully", {count: events.length});
    return true;
  } catch (error) {
    logger.error("Error acknowledging events", {
      eventCount: events.length,
      error: error.message,
    });
    return false;
  }
}

/**
 * Check if event has already been processed (deduplication)
 * @param {string} idRestaurante - Restaurant ID
 * @param {string} eventId - Event ID
 * @return {Promise<boolean>} - True if already processed
 */
async function isEventProcessed(idRestaurante, eventId) {
  const eventRef = admin.firestore()
    .collection("restaurantes")
    .doc(idRestaurante)
    .collection("ifoodEvents")
    .doc(eventId);
  
  const eventDoc = await eventRef.get();
  return eventDoc.exists;
}

/**
 * Mark event as processed
 * @param {string} idRestaurante - Restaurant ID
 * @param {object} event - Event data
 */
async function markEventAsProcessed(idRestaurante, event) {
  const eventRef = admin.firestore()
    .collection("restaurantes")
    .doc(idRestaurante)
    .collection("ifoodEvents")
    .doc(event.id);
  
  await eventRef.set({
    eventId: event.id,
    code: event.code || event.Code,
    fullCode: event.fullCode || event.fullcode,
    orderId: event.orderId,
    merchantId: event.merchantId,
    createdAt: event.createdAt || admin.firestore.FieldValue.serverTimestamp(),
    processedAt: admin.firestore.FieldValue.serverTimestamp(),
    rawEvent: event,
  });
}

/**
 * Get or create unified virtual table for all iFood orders
 * All order types (DELIVERY, TAKEOUT) share a single table
 * @param {string} idRestaurante - Restaurant ID
 * @param {string} orderType - Order type (kept for compatibility, not used for table selection)
 * @return {Promise<string>} - Table ID
 */
async function getOrCreateIfoodTable(idRestaurante) {
  const tableId = "ifood";
  const tableName = "iFood";
  const tableDescription = "Mesa virtual para pedidos do iFood";
  
  const tableRef = admin.firestore()
    .doc(`restaurantes/${idRestaurante}/mesas/${tableId}`);
  
  const tableDoc = await tableRef.get();
  
  if (!tableDoc.exists) {
    await tableRef.set({
      numero: tableName,
      nome: tableName,
      capacidade: 999,
      status: "livre",
      tipo: "virtual",
      descricao: tableDescription,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      isVirtual: true,
      source: "ifood",
    });
    logger.info("Created unified virtual table for iFood orders", {
      idRestaurante,
      tableId,
    });
  }
  
  return tableId;
}

/**
 * Apply ingredients for mapped items in an iFood order
 * This deducts ingredient quantities from stock
 * @param {string} idRestaurante - Restaurant ID
 * @param {string} pedidoId - Order ID
 * @param {Array} mappedItems - Array of mapped items with mesaFacilItemId
 */
async function applyIngredientsForIfoodOrder(idRestaurante, pedidoId, mappedItems) {
  const batch = admin.firestore().batch();
  const appliedIngredients = [];
  
  for (const item of mappedItems) {
    try {
      // Get item details including ingredients
      const itemDoc = await admin.firestore()
        .doc(`restaurantes/${idRestaurante}/cardapio/${item.mesaFacilItemId}`)
        .get();
      
      if (!itemDoc.exists) {
        logger.warn("Item not found for ingredient application", {
          itemId: item.mesaFacilItemId,
        });
        continue;
      }
      
      const itemData = itemDoc.data();
      const ingredientes = itemData.ingredientes || [];
      
      if (ingredientes.length === 0) {
        logger.info("No ingredients defined for item", {
          itemId: item.mesaFacilItemId,
          itemName: itemData.nome,
        });
        continue;
      }
      
      // Apply each ingredient
      for (const ingrediente of ingredientes) {
        const quantityToDeduct = (ingrediente.quantidade || 0) * item.quantity;
        
        if (quantityToDeduct === 0) {
          continue;
        }
        
        const ingredienteRef = admin.firestore()
          .doc(`restaurantes/${idRestaurante}/ingredientes/${ingrediente.id}`);
        
        // Deduct from stock using increment (negative value)
        batch.update(ingredienteRef, {
          quantidadeAtual: admin.firestore.FieldValue.increment(-quantityToDeduct),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        
        appliedIngredients.push({
          ingredienteId: ingrediente.id,
          nome: ingrediente.nome,
          quantidadeUsada: quantityToDeduct,
          itemId: item.mesaFacilItemId,
          itemNome: item.nome,
        });
        
        logger.info("Ingredient applied", {
          ingredienteId: ingrediente.id,
          nome: ingrediente.nome,
          quantityDeducted: quantityToDeduct,
          itemNome: item.nome,
        });
      }
    } catch (error) {
      logger.error("Error applying ingredients for item", {
        itemId: item.mesaFacilItemId,
        error: error.message,
      });
      // Continue with other items
    }
  }
  
  // Commit all ingredient updates
  if (appliedIngredients.length > 0) {
    await batch.commit();
    
    logger.info("Ingredients applied successfully", {
      idRestaurante,
      pedidoId,
      appliedCount: appliedIngredients.length,
      details: appliedIngredients,
    });
  }
}

/**
 * Get item mappings for iFood integration
 * @param {string} idRestaurante - Restaurant ID
 * @return {Promise<object>} - Mappings object
 */
async function getIfoodItemMappings(idRestaurante) {
  try {
    const mappingsDoc = await admin.firestore()
      .doc(`restaurantes/${idRestaurante}/integrations/ifood-item-mappings`)
      .get();
    
    if (!mappingsDoc.exists) {
      return {};
    }
    
    return mappingsDoc.data().mappings || {};
  } catch (error) {
    logger.error("Error getting item mappings", {
      idRestaurante,
      error: error.message,
    });
    return {};
  }
}

/**
 * Get MesaFacil item details by ID
 * @param {string} idRestaurante - Restaurant ID
 * @param {string} itemId - Item ID
 * @return {Promise<object|null>} - Item data or null
 */
async function getMesaFacilItemById(idRestaurante, itemId) {
  try {
    const itemDoc = await admin.firestore()
      .doc(`restaurantes/${idRestaurante}/cardapio/${itemId}`)
      .get();
    
    if (!itemDoc.exists) {
      return null;
    }
    
    return {id: itemDoc.id, ...itemDoc.data()};
  } catch (error) {
    logger.error("Error getting MesaFacil item", {
      idRestaurante,
      itemId,
      error: error.message,
    });
    return null;
  }
}

/**
 * Create MesaFacil order from iFood order data
 * @param {string} idRestaurante - Restaurant ID
 * @param {string} mesaId - Table ID
 * @param {object} orderData - iFood order data
 * @return {Promise<string>} - MesaFacil order ID
 */
async function createMesaFacilOrderFromIfood(idRestaurante, mesaId, orderData) {
  try {
    // Validate required fields from iFood API response
    if (!orderData.id) {
      throw new Error("ID do pedido iFood ausente - resposta inválida da API");
    }
    
    // Get item mappings
    const mappings = await getIfoodItemMappings(idRestaurante);
    
    // Transform items with mapping support
    const items = [];
    
    for (const item of orderData.items || []) {
      // Try to find mapping using externalCode or id
      const ifoodItemKey = item.externalCode || item.id;
      const mappedItemId = mappings[ifoodItemKey];
      
      let itemData;
      
      if (mappedItemId) {
        // Item is mapped - get MesaFacil item details
        const mesaFacilItem = await getMesaFacilItemById(idRestaurante, mappedItemId);
        
        if (mesaFacilItem) {
          logger.info("Using mapped item", {
            ifoodItemKey,
            mappedItemId,
            mesaFacilItemName: mesaFacilItem.nome,
          });
          
          itemData = {
            id: mesaFacilItem.id,
            nome: mesaFacilItem.nome || item.name,
            price: item.unitPrice || item.price || 0, // Use iFood price
            quantity: item.quantity || 1,
            categorias: mesaFacilItem.categorias || [],
            alergias: mesaFacilItem.alergias || [],
            descricao: item.observations || mesaFacilItem.descricao || "",
            imagemUrl: mesaFacilItem.imagemUrl || "",
            // Keep reference to mapped item
            mesaFacilItemId: mesaFacilItem.id,
            isMapped: true,
          };
        } else {
          logger.warn("Mapped item not found in cardapio", {
            ifoodItemKey,
            mappedItemId,
          });
          // Fallback to unmapped item
          itemData = {
            id: item.externalCode || item.id || "",
            nome: item.name || "Item sem nome",
            price: item.unitPrice || item.price || 0,
            quantity: item.quantity || 1,
            categorias: [],
            alergias: [],
            descricao: item.observations || "",
            imagemUrl: "",
            isMapped: false,
          };
        }
      } else {
        // Item not mapped - use iFood data directly
        logger.info("Using unmapped item", {
          ifoodItemKey,
          itemName: item.name,
        });
        
        itemData = {
          id: item.externalCode || item.id || "",
          nome: item.name || "Item sem nome",
          price: item.unitPrice || item.price || 0,
          quantity: item.quantity || 1,
          categorias: [],
          alergias: [],
          descricao: item.observations || "",
          imagemUrl: "",
          isMapped: false,
        };
      }

      // Only add ifoodData if we have valid data
      const ifoodData = {};
      if (item.id) ifoodData.id = item.id;
      if (item.externalCode) ifoodData.externalCode = item.externalCode;
      if (item.totalPrice !== undefined && item.totalPrice !== null) {
        ifoodData.totalPrice = item.totalPrice;
      }
      if (item.options && item.options.length > 0) {
        ifoodData.options = item.options;
      }

      // Only add ifoodData if it has properties
      if (Object.keys(ifoodData).length > 0) {
        itemData.ifoodData = ifoodData;
      }

      items.push(itemData);
    }
    
    // Calculate total
    const total = orderData.total?.orderAmount || 0;
    
    // Determine order type and timing
    const orderType = orderData.orderType || "DELIVERY";
    const orderTiming = orderData.orderTiming || "IMMEDIATE";
    const isTakeout = orderType === "TAKEOUT";
    const isScheduled = orderTiming === "SCHEDULED";
    
    // Create observations - filter out empty values
    // For TAKEOUT, we don't need delivery address
    const observationParts = [
      orderData.customer?.name ? `Cliente iFood: ${orderData.customer.name}` : "Cliente iFood",
      orderData.customer?.phone?.number ? `Tel: ${orderData.customer.phone.number}` : null,
    ];
    
    // Only add delivery address for DELIVERY orders
    if (!isTakeout && orderData.delivery?.deliveryAddress) {
      observationParts.push(
        `Endereço: ${orderData.delivery.deliveryAddress.formattedAddress || orderData.delivery.deliveryAddress.streetName || ""}`
      );
    }
    
    // Add delivery observations if present
    if (orderData.delivery?.observations) {
      observationParts.push(`Obs: ${orderData.delivery.observations}`);
    }
    
    // Add order type indicator
    if (isTakeout) {
      observationParts.push("🏪 PEDIDO PARA RETIRADA");
    }
    
    // Add scheduled time if applicable
    if (isScheduled && orderData.schedule?.deliveryDateTimeStart) {
      const scheduledDate = new Date(orderData.schedule.deliveryDateTimeStart);
      observationParts.push(`📅 Agendado para: ${scheduledDate.toLocaleString('pt-BR')}`);
    }
    
    observationParts.push(`Pedido iFood #${orderData.displayId || orderData.id}`);
    
    const observations = observationParts.filter(Boolean).join("\n");
    
    // Create order in MesaFacil
    const pedidosRef = admin.firestore()
      .collection(`restaurantes/${idRestaurante}/mesas/${mesaId}/pedidos`);
    
    const newPedidoRef = pedidosRef.doc();
    
    const initialIfoodStatus = orderData.orderStatus || "PLACED";

    const orderPayload = {
      items,
      total,
      observacoes: observations,
      status: "andamento",
      criadoEm: admin.firestore.FieldValue.serverTimestamp(),
      source: "ifood",
      orderOrigin: "ifood",
      
      // iFood status tracking — persisted on the mesa pedido for real-time UI
      ifoodStatus: initialIfoodStatus,
      ifoodStatusHistory: [{
        status: initialIfoodStatus,
        changedAt: new Date().toISOString(),
        source: "ifood",
      }],
      
      // Order type fields for TAKEOUT/DELIVERY support
      orderType: orderType,
      orderTiming: orderTiming,
      isTakeout: isTakeout,
      isScheduled: isScheduled,
      
      // Scheduled delivery time (if applicable)
      scheduledFor: isScheduled && orderData.schedule?.deliveryDateTimeStart 
        ? admin.firestore.Timestamp.fromDate(new Date(orderData.schedule.deliveryDateTimeStart))
        : null,
    };

    // ID e displayId são sempre presentes na resposta do iFood
    orderPayload.ifoodOrderId = orderData.id;
    orderPayload.ifoodDisplayId = orderData.displayId || orderData.id; // fallback para displayId
    
    await newPedidoRef.set(orderPayload);
    
    // Apply ingredients for mapped items
    const mappedItems = items.filter(item => item.isMapped && item.mesaFacilItemId);
    if (mappedItems.length > 0) {
      logger.info("Applying ingredients for mapped items", {
        idRestaurante,
        mappedItemCount: mappedItems.length,
        totalItems: items.length,
      });
      
      try {
        await applyIngredientsForIfoodOrder(idRestaurante, newPedidoRef.id, mappedItems);
      } catch (error) {
        logger.error("Error applying ingredients for iFood order", {
          idRestaurante,
          orderId: newPedidoRef.id,
          error: error.message,
        });
        // Don't throw - order was created successfully, ingredient application is secondary
      }
    } else {
      logger.info("No mapped items - skipping ingredient application", {
        idRestaurante,
        totalItems: items.length,
      });
    }
    
    // Update table status
    const tableRef = admin.firestore()
      .doc(`restaurantes/${idRestaurante}/mesas/${mesaId}`);
    await tableRef.update({
      status: "andamento",
      lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
    });
    
    logger.info("Created MesaFacil order from iFood", {
      idRestaurante,
      mesaId,
      mesaFacilOrderId: newPedidoRef.id,
      ifoodOrderId: orderData.id,
    });
    
    return newPedidoRef.id;
  } catch (error) {
    logger.error("Error creating MesaFacil order from iFood", {
      idRestaurante,
      error: error.message,
    });
    throw error;
  }
}

/**
 * Process iFood order and save to Firestore
 * Also sync status changes to MesaFacil order if it exists
 * @param {string} idRestaurante - Restaurant ID
 * @param {object} orderData - Order data from iFood
 * @return {Promise<boolean>} - Success status
 */
async function processIfoodOrder(idRestaurante, orderData) {
  try {
    const orderId = orderData.id;
    const orderRef = admin.firestore()
      .collection("restaurantes")
      .doc(idRestaurante)
      .collection("ifoodOrders")
      .doc(orderId);

    // Check if order already exists
    const existingOrder = await orderRef.get();
    const isNewOrder = !existingOrder.exists;
    const existingData = existingOrder.exists ? existingOrder.data() : null;
    
    // Check if status changed
    const statusChanged = existingData && 
      existingData.ifoodStatus !== orderData.orderStatus;
    
    // Prevent status regression: don't overwrite a more advanced status
    // with a stale event (e.g. don't go from CONFIRMED back to PLACED)
    // Exception: terminal statuses (CONCLUDED, CANCELLED) from iFood always win
    const incomingPrecedence = IFOOD_STATUS_PRECEDENCE[orderData.orderStatus] || 0;
    const existingPrecedence = IFOOD_STATUS_PRECEDENCE[existingData?.ifoodStatus] || 0;
    const isTerminalStatus = ["CONCLUDED", "CANCELLED", "REJECTED"].includes(orderData.orderStatus);
    const shouldSkipStatusUpdate = !isNewOrder && existingData && 
      incomingPrecedence < existingPrecedence && !isTerminalStatus;
    
    if (shouldSkipStatusUpdate) {
      logger.info("Skipping status regression", {
        idRestaurante,
        orderId,
        existingStatus: existingData.ifoodStatus,
        incomingStatus: orderData.orderStatus,
        existingPrecedence,
        incomingPrecedence,
      });
      // Still mark event as processed and ACK, but don't overwrite status
      // We override orderStatus to keep existing so the merge doesn't regress
      orderData = { ...orderData, orderStatus: existingData.ifoodStatus };
    }

    // Determine order timing
    const orderTiming = orderData.orderTiming || "IMMEDIATE";
    const isScheduled = orderTiming === "SCHEDULED";
    
    // Log warning if scheduled order is missing scheduledFor date
    if (isScheduled && !orderData.schedule?.deliveryDateTimeStart) {
      logger.warn("Scheduled order missing delivery date/time", {
        idRestaurante,
        orderId,
        orderTiming,
        schedule: orderData.schedule,
      });
    }

    // Transform iFood order to MesaFacil format
    const transformedOrder = {
      ifoodOrderId: orderId,
      displayId: orderData.displayId || orderId,
      createdAt: orderData.createdAt || admin.firestore.FieldValue.serverTimestamp(),
      orderType: orderData.orderType || "DELIVERY",
      orderTiming: orderTiming,
      
      // Scheduled order fields
      isScheduled: isScheduled,
      scheduledFor: isScheduled && orderData.schedule?.deliveryDateTimeStart
        ? admin.firestore.Timestamp.fromDate(new Date(orderData.schedule.deliveryDateTimeStart))
        : null,
      scheduledForEnd: isScheduled && orderData.schedule?.deliveryDateTimeEnd
        ? admin.firestore.Timestamp.fromDate(new Date(orderData.schedule.deliveryDateTimeEnd))
        : null,
      schedule: orderData.schedule || null,
      
      // Customer info (all fields from iFood Order Details API)
      customer: {
        id: orderData.customer?.id || "",
        name: orderData.customer?.name || "Cliente iFood",
        phone: orderData.customer?.phone?.number || "",
        phoneLocalizer: orderData.customer?.phone?.localizer || "",
        phoneLocalizerExpiration: orderData.customer?.phone?.localizerExpiration || "",
        documentNumber: orderData.customer?.documentNumber || "",
        documentType: orderData.customer?.documentType || "",
        ordersCountOnMerchant: orderData.customer?.ordersCountOnMerchant ?? null,
        segmentation: orderData.customer?.segmentation || "",
      },
      
      // Delivery info (all fields from iFood Order Details API)
      delivery: orderData.delivery ? {
        address: orderData.delivery.deliveryAddress || {},
        deliveredBy: orderData.delivery.deliveredBy || "IFOOD",
        observations: orderData.delivery.observations || "",
        mode: orderData.delivery.mode || "",
        description: orderData.delivery.description || "",
        pickupCode: orderData.delivery.pickupCode || "",
        deliveryDateTime: orderData.delivery.deliveryDateTime || "",
      } : null,
      
      // Takeout info
      takeout: orderData.takeout || null,
      
      // Items
      items: (orderData.items || []).map((item) => ({
        id: item.id,
        name: item.name,
        quantity: item.quantity || 1,
        price: item.price || 0,
        unitPrice: item.unitPrice || 0,
        totalPrice: item.totalPrice || (item.price * item.quantity),
        externalCode: item.externalCode || "",
        observations: item.observations || "",
        options: item.options || [],
      })),
      
      // Totals
      total: {
        subTotal: orderData.total?.subTotal || 0,
        deliveryFee: orderData.total?.deliveryFee || 0,
        benefits: orderData.total?.benefits || 0,
        orderAmount: orderData.total?.orderAmount || 0,
        additionalFees: orderData.total?.additionalFees || 0,
        discount: orderData.total?.discount || 0,
      },

      // Benefits/Coupons details (for iFood homologation)
      // Shows discount value, sponsor breakdown and campaign info
      benefits: (orderData.benefits || []).map(benefit => ({
        value: benefit.value || 0,
        target: benefit.target || "",            // "DELIVERY_FEE", "ITEM", "CART", "PROGRESSIVE_DISCOUNT_ITEM"
        targetId: benefit.targetId || null,       // ID of the target item (when target is ITEM)
        description: benefit.description || "",
        // Campaign info
        campaign: benefit.campaign ? {
          id: benefit.campaign.id || "",
          name: benefit.campaign.name || "",
          description: benefit.campaign.description || "",
        } : null,
        // Detailed sponsorship breakdown per sponsor
        sponsorshipValues: Array.isArray(benefit.sponsorshipValues)
          ? benefit.sponsorshipValues.map(sv => ({
              name: sv.name || "",    // "IFOOD", "MERCHANT", "EXTERNAL", "CHAIN"
              value: sv.value || 0,
              description: sv.description || "",
            }))
          : [],
        // Legacy flat fields (kept for backward compat)
        sponsorshipValue: benefit.sponsorshipValue || benefit.value || 0,
        sponsorshipType: benefit.sponsorshipType || "", // "IFOOD", "MERCHANT"
      })),

      // Additional fees (e.g. taxa de serviço do restaurante)
      additionalFees: (orderData.additionalFees || []).map(fee => ({
        type: fee.type || "",
        description: fee.description || fee.fullDescription || "",
        fullDescription: fee.fullDescription || fee.description || "",
        value: fee.value || 0,
        // Liability breakdown (who pays what)
        liabilities: Array.isArray(fee.liabilities)
          ? fee.liabilities.map(l => ({
              name: l.name || "",
              percentage: l.percentage || 0,
            }))
          : [],
      })),
      
      // Payments with detailed information
      // iFood returns payments as: { pending, prepaid, methods: [...] }
      payments: (() => {
        const paymentsData = orderData.payments;
        if (!paymentsData) return [];
        
        // Handle the iFood payment structure
        const methods = paymentsData.methods || paymentsData || [];
        if (!Array.isArray(methods)) return [];
        
        return methods.map((payment) => ({
          name: payment.name || payment.method || "Não especificado",
          code: payment.code || payment.method || "",
          value: payment.value || 0,
          prepaid: payment.prepaid || false,
          issuer: payment.issuer || "",
          currency: payment.currency || "BRL",
          // Additional payment details for homologation
          type: payment.type || "",            // "ONLINE", "OFFLINE"
          method: payment.method || "",        // "CASH", "CREDIT", "DEBIT", "PIX", etc.
          brand: payment.brand || payment.card?.brand || "",  // "VISA", "MASTERCARD", "ELO", etc.
          // Change for cash payments - can be in payment.cash.changeFor or payment.changeFor
          changeFor: payment.cash?.changeFor || payment.changeFor || 0,
          // Card details if present
          card: payment.card || null,
          // Collector info (for on-delivery payment)
          collector: payment.collector || "",
          // Transaction details
          transactionCode: payment.transactionCode || "",
          authorizationCode: payment.authorizationCode || "",
        }));
      })(),
      
      // Original payments object for reference
      paymentsRaw: orderData.payments || null,
      
      // Status
      status: orderData.orderStatus || "PLACED",
      ifoodStatus: orderData.orderStatus || "PLACED",
      previousIfoodStatus: existingData?.ifoodStatus || null,
      
      // Metadata
      source: "ifood",
      syncedAt: admin.firestore.FieldValue.serverTimestamp(),
      lastUpdatedAt: admin.firestore.FieldValue.serverTimestamp(),
      statusChangedAt: statusChanged ? admin.firestore.FieldValue.serverTimestamp() : existingData?.statusChangedAt || null,
      
      // Keep existing mesaFacilOrderId if it exists
      mesaFacilOrderId: existingData?.mesaFacilOrderId || null,
      
      // Raw data for reference
      rawData: orderData,
    };

    await orderRef.set(transformedOrder, {merge: true});

    // Log scheduled order info
    if (isScheduled) {
      logger.info("Processed scheduled iFood order", {
        idRestaurante,
        orderId,
        scheduledFor: transformedOrder.scheduledFor,
        isNewOrder,
      });
    }

    // If this is a new order, create MesaFacil order automatically
    if (isNewOrder || !existingData?.mesaFacilOrderId) {
      try {
        // Determine table based on order type (DELIVERY or TAKEOUT)
        const orderType = orderData.orderType || "DELIVERY";
        const mesaId = await getOrCreateIfoodTable(idRestaurante, orderType);
        const mesaFacilOrderId = await createMesaFacilOrderFromIfood(
          idRestaurante,
          mesaId,
          orderData
        );
        
        // Update iFood order with MesaFacil reference
        await orderRef.update({
          mesaFacilOrderId,
          syncedToMesaFacil: true,
          syncedToMesaFacilAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        
        logger.info("Created and linked MesaFacil order for new iFood order", {
          idRestaurante,
          ifoodOrderId: orderId,
          mesaFacilOrderId,
        });
      } catch (error) {
        logger.error("Error creating MesaFacil order for iFood order", {
          idRestaurante,
          ifoodOrderId: orderId,
          error: error.message,
        });
      }
    }
    
    // If status changed and order is synced to MesaFacil, update MesaFacil order.
    // Also check if the mesa pedido's ifoodStatus is out of sync (e.g., not yet propagated)
    const currentMesaFacilOrderId = transformedOrder.mesaFacilOrderId || existingData?.mesaFacilOrderId;
    if (currentMesaFacilOrderId && statusChanged) {
      await syncStatusToMesaFacilOrder(
        idRestaurante,
        currentMesaFacilOrderId,
        orderData.orderStatus,
        existingData.ifoodStatus
      );
      
      logger.info("iFood status change synced to MesaFacil", {
        idRestaurante,
        ifoodOrderId: orderId,
        mesaFacilOrderId: currentMesaFacilOrderId,
        oldStatus: existingData.ifoodStatus,
        newStatus: orderData.orderStatus,
      });
    } else if (currentMesaFacilOrderId && !isNewOrder && !statusChanged) {
      // Even if ifoodOrders status hasn't changed, the mesa pedido may be out of sync
      // (e.g., action was taken but mesa pedido wasn't updated due to earlier bug)
      // Do a lightweight check and repair if needed
      try {
        const pedidoRef = admin.firestore()
          .doc(`restaurantes/${idRestaurante}/mesas/ifood/pedidos/${currentMesaFacilOrderId}`);
        const pedidoDoc = await pedidoRef.get();
        if (pedidoDoc.exists) {
          const pedidoData = pedidoDoc.data();
          if (pedidoData.ifoodStatus !== orderData.orderStatus) {
            logger.info("Repairing out-of-sync mesa pedido ifoodStatus", {
              idRestaurante,
              mesaFacilOrderId: currentMesaFacilOrderId,
              mesaPedidoStatus: pedidoData.ifoodStatus,
              ifoodOrdersStatus: orderData.orderStatus,
            });
            await syncStatusToMesaFacilOrder(
              idRestaurante,
              currentMesaFacilOrderId,
              orderData.orderStatus,
              pedidoData.ifoodStatus || "PLACED"
            );
          }
        }
      } catch (repairError) {
        logger.error("Error during mesa pedido status repair", {
          idRestaurante,
          mesaFacilOrderId: currentMesaFacilOrderId,
          error: repairError.message,
        });
      }
    }

    logger.info("iFood order processed and saved", {
      idRestaurante,
      orderId,
      status: orderData.orderStatus,
      isNew: isNewOrder,
      statusChanged,
    });

    return true;
  } catch (error) {
    logger.error("Error processing iFood order", {
      idRestaurante,
      error: error.message,
    });
    return false;
  }
}

/**
 * Finaliza um pedido do iFood seguindo a mesma lógica de finalizarPedidoEspecifico
 * Salva no histórico e atualiza o status da mesa
 * @param {string} idRestaurante - Restaurant ID
 * @param {string} mesaFacilOrderId - MesaFacil order ID
 * @param {string} newIfoodStatus - New iFood status
 */
async function finalizarPedidoIfood(idRestaurante, mesaFacilOrderId, newIfoodStatus) {
  try {
    const mesaId = "ifood";
    const pedidoDocRef = admin.firestore()
      .doc(`restaurantes/${idRestaurante}/mesas/${mesaId}/pedidos/${mesaFacilOrderId}`);
    
    const pedidoSnapshot = await pedidoDocRef.get();
    
    if (!pedidoSnapshot.exists()) {
      throw new Error("Pedido não encontrado");
    }
    
    const pedidoData = pedidoSnapshot.data();
    
    // 1. Atualizar status do pedido para "entregue"
    const finalizadoEm = admin.firestore.FieldValue.serverTimestamp();
    
    await pedidoDocRef.update({
      status: "entregue",
      ifoodStatus: newIfoodStatus,
      finalizadoEm: finalizadoEm,
      lastSyncedFromIfood: admin.firestore.FieldValue.serverTimestamp(),
      ifoodStatusHistory: admin.firestore.FieldValue.arrayUnion({
        status: newIfoodStatus,
        changedAt: new Date().toISOString(),
        source: "ifood",
      }),
    });
    
    // 2. Salvar no histórico
    const historicoRef = admin.firestore()
      .doc(`restaurantes/${idRestaurante}/historicoPedidos/${mesaFacilOrderId}`);
    
    const total = pedidoData.total || 0;
    
    await historicoRef.set({
      pedidoId: mesaFacilOrderId,
      mesaId: mesaId,
      mesaNumero: "iFood",
      status: "entregue",
      total: total,
      observacoes: pedidoData.observacoes || "",
      items: pedidoData.items || [],
      criadoEm: pedidoData.criadoEm || admin.firestore.FieldValue.serverTimestamp(),
      finalizadoEm: finalizadoEm,
      archivedAt: admin.firestore.FieldValue.serverTimestamp(),
      source: "ifood",
      ifoodOrderId: pedidoData.ifoodOrderId || null,
      displayId: pedidoData.displayId || null,
    }, { merge: true });
    
    // 3. Verificar se há outros pedidos em andamento na mesa
    const pedidosRef = admin.firestore()
      .collection(`restaurantes/${idRestaurante}/mesas/${mesaId}/pedidos`);
    const snapshot = await pedidosRef.get();
    
    const pedidos = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    const temAndamento = pedidos.some(p => p.status === "andamento");
    
    // 4. Atualizar status da mesa
    const mesaDocRef = admin.firestore()
      .doc(`restaurantes/${idRestaurante}/mesas/${mesaId}`);
    
    if (!temAndamento) {
      // Soma total dos pedidos entregues
      const totalEntregue = pedidos
        .filter(p => p.status === "entregue")
        .reduce((acc, p) => acc + (p.total || 0), 0);
      
      await mesaDocRef.update({
        status: "entregue",
        entregueEm: admin.firestore.FieldValue.serverTimestamp(),
        total: totalEntregue,
      });
      
      logger.info("Mesa iFood marcada como entregue", {
        idRestaurante,
        mesaId,
        totalEntregue,
      });
    } else {
      // Garante que a mesa continua em andamento
      await mesaDocRef.update({ 
        status: "andamento",
        lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
      });
      
      logger.info("Mesa iFood permanece em andamento (outros pedidos ativos)", {
        idRestaurante,
        mesaId,
      });
    }
    
    logger.info("Pedido iFood finalizado com sucesso", {
      idRestaurante,
      mesaFacilOrderId,
      ifoodStatus: newIfoodStatus,
      mesaStatus: temAndamento ? "andamento" : "entregue",
    });
  } catch (error) {
    logger.error("Erro ao finalizar pedido iFood", {
      idRestaurante,
      mesaFacilOrderId,
      newIfoodStatus,
      error: error.message,
    });
    throw error;
  }
}

/**
 * Sync iFood status changes to MesaFacil order
 * @param {string} idRestaurante - Restaurant ID
 * @param {string} mesaFacilOrderId - MesaFacil order ID
 * @param {string} newIfoodStatus - New iFood status
 * @param {string} oldIfoodStatus - Previous iFood status
 */
async function syncStatusToMesaFacilOrder(
  idRestaurante,
  mesaFacilOrderId,
  newIfoodStatus,
  oldIfoodStatus
) {
  try {
    // Map iFood status to MesaFacil status
    const statusMap = {
      "INTEGRATED": "andamento",                 // Pedido integrado
      "PENDING": "andamento",                    // Pendente
      "PLACED": "andamento",                     // Pedido recebido
      "ACCEPTED": "andamento",                   // Aceito pelo restaurante
      "CONFIRMED": "andamento",                  // Confirmado pelo restaurante
      "READY_TO_PICKUP": "andamento",            // Pronto para retirada
      "DISPATCHED": "andamento",                 // Saiu para entrega
      "CANCELLATION_REQUESTED": "andamento",     // Cancelamento em análise
      "CANCELLATION_REQUEST_FAILED": "andamento",// Cancelamento recusado — pedido continua ativo
      "CONCLUDED": "entregue",                   // Concluído
      "CANCELLED": "cancelado",                  // Cancelado
      "REJECTED": "cancelado",                   // Rejeitado pelo restaurante
    };
    
    const mesaFacilStatus = statusMap[newIfoodStatus] || "andamento";
    const previousMesaFacilStatus = statusMap[oldIfoodStatus] || "andamento";
    const mesaFacilStatusChanged = mesaFacilStatus !== previousMesaFacilStatus;
    
    // If order is concluded, use finalizarPedidoIfood logic
    // This will handle the full finalization flow including history and table status
    if (newIfoodStatus === "CONCLUDED") {
      await finalizarPedidoIfood(idRestaurante, mesaFacilOrderId, newIfoodStatus);
      return;
    }
    
    // Always update ifoodStatus on the mesa pedido, even if MesaFacil status
    // doesn't change (e.g. PLACED→CONFIRMED both map to "andamento").
    // This ensures the UI shows the correct iFood status and action buttons.
    const orderRef = admin.firestore()
      .doc(`restaurantes/${idRestaurante}/mesas/ifood/pedidos/${mesaFacilOrderId}`);

    const updateData = {
      ifoodStatus: newIfoodStatus,
      lastSyncedFromIfood: admin.firestore.FieldValue.serverTimestamp(),
      // The iFood echo is always recorded — it is the authoritative confirmation
      // that the iFood platform received and processed the action. A prior entry
      // with source="mesafacil" for the same status is just the outgoing request;
      // the iFood entry here closes the loop. The UI deduplicates on display,
      // showing only the iFood (confirmed) entry when both are present.
      ifoodStatusHistory: admin.firestore.FieldValue.arrayUnion({
        status: newIfoodStatus,
        changedAt: new Date().toISOString(),
        source: "ifood",
      }),
    };

    // Only update MesaFacil status if it actually changes
    if (mesaFacilStatusChanged) {
      updateData.status = mesaFacilStatus;
    }
    
    // If order is cancelled, add cancellation timestamp
    if (mesaFacilStatus === "cancelado") {
      updateData.canceladoEm = admin.firestore.FieldValue.serverTimestamp();
    }
    
    await orderRef.update(updateData);
    
    // Update table status if needed
    if (mesaFacilStatusChanged) {
      await updateVirtualTableStatus(idRestaurante);
    }
    
    logger.info("MesaFacil order status updated from iFood", {
      idRestaurante,
      mesaFacilOrderId,
      newStatus: mesaFacilStatus,
      ifoodStatus: newIfoodStatus,
      mesaFacilStatusChanged,
    });
  } catch (error) {
    logger.error("Error syncing status to MesaFacil order", {
      idRestaurante,
      mesaFacilOrderId,
      newIfoodStatus,
      error: error.message,
    });
  }
}

/**
 * Update virtual table status based on active orders
 * @param {string} idRestaurante - Restaurant ID
 */
async function updateVirtualTableStatus(idRestaurante) {
  try {
    const pedidosRef = admin.firestore()
      .collection(`restaurantes/${idRestaurante}/mesas/ifood/pedidos`);
    
    const snapshot = await pedidosRef.get();
    
    const hasActiveOrders = snapshot.docs.some(doc => {
      const status = doc.data().status;
      return status === "andamento";
    });
    
    const hasDeliveredOrders = snapshot.docs.some(doc => {
      const status = doc.data().status;
      return status === "entregue";
    });
    
    const tableRef = admin.firestore()
      .doc(`restaurantes/${idRestaurante}/mesas/ifood`);
    
    let tableStatus = "livre";
    if (hasActiveOrders) {
      tableStatus = "andamento";
    } else if (hasDeliveredOrders) {
      tableStatus = "entregue";
    }
    
    await tableRef.update({
      status: tableStatus,
      lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
    });
    
    logger.info("Virtual table status updated", {
      idRestaurante,
      tableStatus,
    });
  } catch (error) {
    logger.error("Error updating virtual table status", {
      idRestaurante,
      error: error.message,
    });
  }
}

/**
 * Get restaurant ID by merchant ID
 * This function is kept for potential future use
 * @param {string} merchantId - iFood merchant ID
 * @return {Promise<string|null>} - Restaurant ID or null
 */
// eslint-disable-next-line no-unused-vars
async function getRestaurantByMerchantId(merchantId) {
  try {
    const restaurantesSnapshot = await admin.firestore()
      .collection("restaurantes")
      .get();

    for (const restaurantDoc of restaurantesSnapshot.docs) {
      const ifoodIntegrationDoc = await admin.firestore()
        .collection("restaurantes")
        .doc(restaurantDoc.id)
        .collection("integrations")
        .doc("ifood")
        .get();

      if (ifoodIntegrationDoc.exists) {
        const data = ifoodIntegrationDoc.data();
        if (data.merchantId === merchantId && data.enabled === true) {
          return restaurantDoc.id;
        }
      }
    }

    logger.warn("No restaurant found for merchant ID", {merchantId});
    return null;
  } catch (error) {
    logger.error("Error getting restaurant by merchant ID", {
      merchantId,
      error: error.message,
    });
    return null;
  }
}

/**
 * Get all enabled iFood integrations
 * @return {Promise<Array>} - Array of {restaurantId, merchantId, credentials}
 */
async function getEnabledIfoodIntegrations() {
  try {
    const restaurantesSnapshot = await admin.firestore()
      .collection("restaurantes")
      .get();

    const integrations = [];

    for (const restaurantDoc of restaurantesSnapshot.docs) {
      const ifoodIntegrationDoc = await admin.firestore()
        .collection("restaurantes")
        .doc(restaurantDoc.id)
        .collection("integrations")
        .doc("ifood")
        .get();

      if (ifoodIntegrationDoc.exists) {
        const data = ifoodIntegrationDoc.data();
        if (data.enabled === true && data.merchantId && data.refreshToken) {
          integrations.push({
            restaurantId: restaurantDoc.id,
            merchantId: data.merchantId,
            credentials: {
              ...data,
              restaurantId: restaurantDoc.id,
            },
          });
        }
      }
    }

    logger.info("Found enabled iFood integrations", {count: integrations.length});
    return integrations;
  } catch (error) {
    logger.error("Error getting enabled integrations", {error: error.message});
    return [];
  }
}

/**
 * Process a Handshake (negotiation) event from iFood
 * Handles HANDSHAKE_DISPUTE (new dispute) and HANDSHAKE_SETTLEMENT (dispute resolved)
 * @param {string} idRestaurante - Restaurant ID
 * @param {object} event - The handshake event from iFood polling
 */
/**
 * Handle CANCELLATION_REQUEST_FAILED (CARF) events.
 *
 * When the iFood platform rejects a cancellation request the order's
 * orderStatus stays as CANCELLATION_REQUESTED in the Order Details API.
 * The generic orderId processing branch therefore sees no status change
 * and never updates the pedido, leaving the UI stuck on
 * "aguardando resposta do iFood" indefinitely.
 *
 * This function explicitly updates both ifoodOrders and mesas/ifood/pedidos
 * with ifoodStatus = "CANCELLATION_REQUEST_FAILED" so the UI can reflect
 * the outcome immediately on the next real-time listener tick.
 *
 * @param {string} idRestaurante - Restaurant ID
 * @param {object} event - Raw CARF event from iFood polling
 */
async function processCancellationRequestFailed(idRestaurante, event) {
  const {orderId, metadata} = event;
  if (!orderId) return;

  try {
    const failedReason = metadata?.CANCELLATION_REQUEST_FAILED_REASON || null;
    const cancelCode = metadata?.CANCEL_CODE || null;

    // Update ifoodOrders document
    const ifoodOrderRef = admin.firestore()
      .doc(`restaurantes/${idRestaurante}/ifoodOrders/${orderId}`);

    const ifoodOrderDoc = await ifoodOrderRef.get();
    if (!ifoodOrderDoc.exists) {
      logger.warn("processCancellationRequestFailed: ifoodOrders doc not found", {
        idRestaurante,
        orderId,
      });
      return;
    }

    await ifoodOrderRef.update({
      ifoodStatus: "CANCELLATION_REQUEST_FAILED",
      cancellationRequestFailed: true,
      cancellationRequestFailedReason: failedReason,
      cancellationRequestFailedAt: admin.firestore.FieldValue.serverTimestamp(),
      lastUpdatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Update associated mesa pedido so the UI reflects the change immediately
    const mesaFacilOrderId = ifoodOrderDoc.data().mesaFacilOrderId;
    if (mesaFacilOrderId) {
      const pedidoRef = admin.firestore()
        .doc(`restaurantes/${idRestaurante}/mesas/ifood/pedidos/${mesaFacilOrderId}`);

      await pedidoRef.update({
        ifoodStatus: "CANCELLATION_REQUEST_FAILED",
        lastSyncedFromIfood: admin.firestore.FieldValue.serverTimestamp(),
        ifoodStatusHistory: admin.firestore.FieldValue.arrayUnion({
          status: "CANCELLATION_REQUEST_FAILED",
          changedAt: new Date().toISOString(),
          source: "ifood",
          reason: failedReason,
          cancelCode: cancelCode,
        }),
      });
    }

    logger.info("Cancellation request failed event processed", {
      idRestaurante,
      orderId,
      failedReason,
      mesaFacilOrderId: mesaFacilOrderId || null,
    });
  } catch (error) {
    logger.error("Error processing cancellation request failed event", {
      idRestaurante,
      orderId,
      error: error.message,
    });
  }
}

async function processHandshakeEvent(idRestaurante, event) {
  const {fullCode, orderId, metadata} = event;

  if (fullCode === "HANDSHAKE_DISPUTE") {
    const disputeId = metadata?.disputeId || event.id;
    const disputeRef = admin.firestore()
      .doc(`restaurantes/${idRestaurante}/ifoodDisputes/${disputeId}`);

    await disputeRef.set({
      disputeId,
      orderId: orderId || null,
      status: "PENDING",
      // iFood sends "action" (CANCELLATION, PARTIAL_CANCELLATION, PROPOSED_AMOUNT_REFUND, etc.)
      action: metadata?.action || "CANCELLATION",
      // Keep legacy "type" mapped from action for backward compat
      type: metadata?.action || metadata?.type || "CANCELLATION",
      // Customer's complaint message
      message: metadata?.message || null,
      // Handshake context
      handshakeType: metadata?.handshakeType || null,
      handshakeGroup: metadata?.handshakeGroup || null,
      timeoutAction: metadata?.timeoutAction || null,
      // Alternatives (REFUND, BENEFIT, ADDITIONAL_TIME)
      alternatives: metadata?.alternatives || [],
      // Nested metadata: evidences, items, garnishItems, acceptCancellationReasons
      disputeMetadata: metadata?.metadata || null,
      // Full raw metadata for reference
      metadata: metadata || {},
      expiresAt: metadata?.expiresAt ? new Date(metadata.expiresAt) : null,
      eventId: event.id,
      createdAt: metadata?.createdAt ? new Date(metadata.createdAt) : (event.createdAt ? new Date(event.createdAt) : admin.firestore.FieldValue.serverTimestamp()),
      receivedAt: admin.firestore.FieldValue.serverTimestamp(),
    }, {merge: true});

    // Mark the related iFood order as having an active dispute
    if (orderId) {
      const orderRef = admin.firestore()
        .doc(`restaurantes/${idRestaurante}/ifoodOrders/${orderId}`);
      const orderDoc = await orderRef.get();
      if (orderDoc.exists) {
        await orderRef.update({
          needsManualReview: true,
          activeDisputeId: disputeId,
          lastDisputeAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      }
    }

    logger.info("Handshake dispute saved", {idRestaurante, disputeId, orderId});
  } else if (fullCode === "HANDSHAKE_SETTLEMENT") {
    const disputeId = metadata?.disputeId || null;

    if (disputeId) {
      const disputeRef = admin.firestore()
        .doc(`restaurantes/${idRestaurante}/ifoodDisputes/${disputeId}`);
      const disputeDoc = await disputeRef.get();

      if (disputeDoc.exists) {
        await disputeRef.update({
          status: "SETTLED",
          settlement: metadata?.settlement || metadata || {},
          settledAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      }
    }

    // Clear the dispute flag from the order
    if (orderId) {
      const orderRef = admin.firestore()
        .doc(`restaurantes/${idRestaurante}/ifoodOrders/${orderId}`);
      const orderDoc = await orderRef.get();
      if (orderDoc.exists) {
        await orderRef.update({
          needsManualReview: false,
          activeDisputeId: null,
        });
      }
    }

    logger.info("Handshake settlement processed", {idRestaurante, disputeId, orderId});
  }
}

/**
 * Process a batch of events for a restaurant
 * @param {string} idRestaurante - Restaurant ID
 * @param {Array} events - Events to process
 * @param {string} accessToken - Access token
 */
async function processEventsForRestaurant(idRestaurante, events, accessToken) {
  const processedEvents = [];
  
  // Sort events by createdAt ascending to process in chronological order.
  // iFood docs: "A API pode entregar eventos fora de ordem.
  // Ordene os eventos pelo campo createdAt após recebe-los."
  const sortedEvents = [...events].sort((a, b) => {
    const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return timeA - timeB;
  });
  
  for (const event of sortedEvents) {
    try {
      // Check for duplicates
      const alreadyProcessed = await isEventProcessed(idRestaurante, event.id);
      if (alreadyProcessed) {
        logger.info("Event already processed, skipping", {
          idRestaurante,
          eventId: event.id,
        });
        // Even if already processed, we need to ACK it
        processedEvents.push(event);
        continue;
      }

      // Handle Handshake (dispute/negotiation) events
      // Normalize casing: iFood API sends "fullcode" (lowercase) inconsistently
      const eventFullCode = event.fullCode || event.fullcode;
      if (eventFullCode === "HANDSHAKE_DISPUTE" || eventFullCode === "HANDSHAKE_SETTLEMENT") {
        await processHandshakeEvent(idRestaurante, {...event, fullCode: eventFullCode});
      }
      // Handle cancellation request failed — iFood denied or failed to process
      // the cancellation. The order's orderStatus from the iFood API still reads
      // CANCELLATION_REQUESTED at this point, so the generic orderId branch would
      // detect no status change and leave the pedido stuck with "aguardando" forever.
      else if (eventFullCode === "CANCELLATION_REQUEST_FAILED") {
        await processCancellationRequestFailed(idRestaurante, event);
      }
      // For order events, fetch full order details
      else if (event.orderId) {
        const orderData = await fetchIfoodOrder(event.orderId, accessToken);
        if (orderData) {
          // The iFood Order Details API may lag behind the Events API, returning
          // a stale orderStatus (e.g. "PLACED" even after CFM/DSP/CON events).
          // The event's fullCode is the authoritative status transition — if it
          // represents a more advanced status than what the API returned, override
          // orderData.orderStatus so processIfoodOrder detects the change.
          const EVENT_FULLCODE_TO_STATUS = {
            "PLACED": "PLACED",
            "CONFIRMED": "CONFIRMED",
            "READY_TO_PICKUP": "READY_TO_PICKUP",
            "DISPATCHED": "DISPATCHED",
            "CONCLUDED": "CONCLUDED",
            "CANCELLED": "CANCELLED",
            "CANCELLATION_REQUESTED": "CANCELLATION_REQUESTED",
          };
          const eventStatus = EVENT_FULLCODE_TO_STATUS[eventFullCode];
          if (eventStatus) {
            const eventPrecedence = IFOOD_STATUS_PRECEDENCE[eventStatus] || 0;
            const apiPrecedence = IFOOD_STATUS_PRECEDENCE[orderData.orderStatus] || 0;
            if (eventPrecedence > apiPrecedence) {
              logger.info("Event fullCode more advanced than Order Details API status, overriding", {
                idRestaurante,
                orderId: event.orderId,
                eventFullCode,
                eventStatus,
                apiOrderStatus: orderData.orderStatus,
              });
              orderData.orderStatus = eventStatus;
            }
          }
          await processIfoodOrder(idRestaurante, orderData);
        }
      }

      // Mark event as processed
      await markEventAsProcessed(idRestaurante, event);
      processedEvents.push(event);

      logger.info("Event processed successfully", {
        idRestaurante,
        eventId: event.id,
        code: event.code,
        orderId: event.orderId,
      });
    } catch (error) {
      logger.error("Error processing event", {
        idRestaurante,
        eventId: event.id,
        error: error.message,
      });
    }
  }

  // Acknowledge all processed events (send full event objects, not just IDs)
  if (processedEvents.length > 0) {
    await acknowledgeIfoodEvents(processedEvents, accessToken);
  }
}

/**
 * Scheduled function to poll iFood events
 * Runs every 1 minute (minimum interval supported by Cloud Scheduler)
 */
exports.ifoodPolling = onSchedule(
  {
    schedule: "every 1 minutes",
    timeoutSeconds: 50,
    memory: "512MiB",
    secrets: [ifoodClientId, ifoodClientSecret],
  },
  async () => {
    try {
      logger.info("Starting iFood polling cycle");

      // Get all enabled integrations
      const integrations = await getEnabledIfoodIntegrations();
      
      if (integrations.length === 0) {
        logger.info("No enabled iFood integrations found");
        return;
      }

      // Process in batches to respect API rate limits
      const BATCH_SIZE = 10;
      const DELAY_BETWEEN_BATCHES = 6000; // 6 seconds
      
      logger.info("Processing integrations in batches", {
        totalIntegrations: integrations.length,
        batchSize: BATCH_SIZE,
        estimatedBatches: Math.ceil(integrations.length / BATCH_SIZE),
      });

      for (let i = 0; i < integrations.length; i += BATCH_SIZE) {
        const batch = integrations.slice(i, i + BATCH_SIZE);
        const batchNumber = Math.floor(i / BATCH_SIZE) + 1;
        const totalBatches = Math.ceil(integrations.length / BATCH_SIZE);
        
        logger.info("Processing batch", {
          batchNumber,
          totalBatches,
          batchSize: batch.length,
        });
        
        await Promise.all(batch.map(async (integration) => {
          try {
            // Get valid access token
            const accessToken = await getValidAccessToken(integration.credentials);
            
            // Poll events for this merchant
            const events = await pollIfoodEvents([integration.merchantId], accessToken);
            
            if (events.length === 0) {
              logger.info("No events for merchant", {
                merchantId: integration.merchantId,
                restaurantId: integration.restaurantId,
              });
              return;
            }

            logger.info("Received events for merchant", {
              merchantId: integration.merchantId,
              restaurantId: integration.restaurantId,
              eventCount: events.length,
            });

            // Process events for this restaurant
            await processEventsForRestaurant(
              integration.restaurantId,
              events,
              accessToken
            );
          } catch (error) {
            logger.error("Error processing integration", {
              restaurantId: integration.restaurantId,
              merchantId: integration.merchantId,
              error: error.message,
            });
          }
        }));
        
        // Delay between batches (except on the last batch)
        if (i + BATCH_SIZE < integrations.length) {
          logger.info("Waiting before next batch", {
            delayMs: DELAY_BETWEEN_BATCHES,
            nextBatch: batchNumber + 1,
          });
          await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_BATCHES));
        }
      }

      logger.info("iFood polling cycle completed");
    } catch (error) {
      logger.error("Error in ifoodPolling", {
        error: error.message,
        stack: error.stack,
      });
    }
  }
);

/**
 * Manual trigger for polling (for testing)
 * Can be called from frontend or for manual sync
 */
exports.ifoodPollManual = onCall(
  {
    secrets: [ifoodClientId, ifoodClientSecret],
    timeoutSeconds: 50,
    cors: true,
  },
  async (request) => {
    let idRestaurante = null;
    let failureStage = "start";

    try {
      ({idRestaurante} = request.data || {});

      if (!idRestaurante) {
        throw new HttpsError("invalid-argument", "idRestaurante is required");
      }

      failureStage = "load-integration";
      logger.info("Manual polling triggered", {idRestaurante});

      // Get integration for this restaurant
      const ifoodDoc = await admin.firestore()
        .doc(`restaurantes/${idRestaurante}/integrations/ifood`)
        .get();

      if (!ifoodDoc.exists) {
        throw new HttpsError("failed-precondition", "iFood integration not found");
      }

      const data = ifoodDoc.data();
      if (!data.refreshToken) {
        throw new HttpsError("failed-precondition", "iFood integration not properly configured: missing refresh token");
      }

      const credentials = {...data, restaurantId: idRestaurante};

      let accessToken;
      try {
        failureStage = "get-access-token";
        // Get valid access token
        accessToken = await getValidAccessToken(credentials);
      } catch (error) {
        const message = error?.message || "Failed to authenticate with iFood";
        logger.error("Authentication error in manual polling", {
          idRestaurante,
          error: message,
        });
        throw new HttpsError(
          "unauthenticated",
          "Falha de autenticacao com o iFood. Reconecte a integracao e tente novamente.",
          {originalMessage: message}
        );
      }

      let merchantId = data.merchantId;
      if (!merchantId) {
        failureStage = "resolve-merchant-id";
        merchantId = await resolveMerchantIdFromIfood(accessToken);

        if (merchantId) {
          await admin.firestore()
            .doc(`restaurantes/${idRestaurante}/integrations/ifood`)
            .set({
              merchantId,
              updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            }, {merge: true});
        }
      }

      if (!merchantId) {
        throw new HttpsError(
          "failed-precondition",
          "Não foi possível identificar o merchant do iFood. Reautorize a integração para gerar o merchantId.",
        );
      }

      let events;
      try {
        failureStage = "poll-events";
        // Poll events
        events = await pollIfoodEvents([merchantId], accessToken);
      } catch (error) {
        const message = error?.message || "Error polling iFood events";
        logger.error("Polling error in manual polling", {
          idRestaurante,
          merchantId,
          error: message,
        });

        const lowerMessage = message.toLowerCase();
        const isPermissionIssue = lowerMessage.includes("403") || lowerMessage.includes("forbidden");

        if (isPermissionIssue) {
          throw new HttpsError(
            "permission-denied",
            "iFood recusou a requisicao (403). Verifique permissao do merchant e reconecte a integracao.",
            {originalMessage: message}
          );
        }

        throw new HttpsError(
          "unavailable",
          "A API do iFood esta temporariamente indisponivel. Tente novamente em instantes.",
          {originalMessage: message}
        );
      }

      logger.info("Received events from manual poll", {
        idRestaurante,
        merchantId,
        eventCount: events.length,
      });

      // Process events
      failureStage = "process-events";
      await processEventsForRestaurant(idRestaurante, events, accessToken);

      await admin.firestore()
        .doc(`restaurantes/${idRestaurante}/integrations/ifood`)
        .set({
          lastError: admin.firestore.FieldValue.delete(),
          lastErrorAt: admin.firestore.FieldValue.delete(),
          lastErrorCode: admin.firestore.FieldValue.delete(),
          lastErrorStage: admin.firestore.FieldValue.delete(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        }, {merge: true});

      return {
        success: true,
        eventCount: events.length,
        message: `Processed ${events.length} events`,
      };
    } catch (error) {
      logger.error("Error in manual polling", {error: error.message, code: error.code});

      if (idRestaurante) {
        const normalizedCode = String(error?.code || "").replace(/^functions\//, "") || "internal";
        const originalMessage = error?.details?.originalMessage || error?.customData?.details?.originalMessage || error?.message || "Unknown error";

        await admin.firestore()
          .doc(`restaurantes/${idRestaurante}/integrations/ifood`)
          .set({
            lastError: `[${failureStage}] ${originalMessage}`,
            lastErrorCode: normalizedCode,
            lastErrorStage: failureStage,
            lastErrorAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          }, {merge: true});
      }

      if (error instanceof HttpsError) {
        throw error;
      }

      const knownHttpsCodes = new Set([
        "cancelled",
        "unknown",
        "invalid-argument",
        "deadline-exceeded",
        "not-found",
        "already-exists",
        "permission-denied",
        "resource-exhausted",
        "failed-precondition",
        "aborted",
        "out-of-range",
        "unimplemented",
        "internal",
        "unavailable",
        "data-loss",
        "unauthenticated",
      ]);

      const normalizedCode = String(error?.code || "").replace(/^functions\//, "");
      if (knownHttpsCodes.has(normalizedCode)) {
        throw new HttpsError(
          normalizedCode,
          error?.message || "Erro ao consultar pedidos do iFood.",
          error?.details || error?.customData?.details,
        );
      }

      throw new HttpsError(
        "internal",
        "Erro interno ao consultar pedidos do iFood.",
        {originalMessage: error?.message || "Unknown error"}
      );
    }
  }
);
