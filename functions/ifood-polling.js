/* eslint-env node */
/* eslint-disable no-undef */
const {onSchedule} = require("firebase-functions/v2/scheduler");
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
    const response = await fetch(`${IFOOD_API_BASE_URL}/authentication/v1.0/oauth/token`, {
      method: "POST",
      headers: {
        "Accept": "application/json",
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        grantType: "refresh_token",
        clientId: ifoodClientId.value(),
        clientSecret: ifoodClientSecret.value(),
        refreshToken: credentials.refreshToken,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      logger.error("Failed to refresh access token", {
        restaurantId: credentials.restaurantId,
        status: response.status,
        error: errorText,
      });
      throw new Error(`Failed to refresh token: ${response.statusText}`);
    }

    const data = await response.json();
    
    // Save new tokens to Firestore
    const docRef = admin.firestore().doc(`restaurantes/${credentials.restaurantId}/integrations/ifood`);
    await docRef.update({
      accessToken: data.accessToken,
      refreshToken: data.refreshToken || credentials.refreshToken, // Some APIs don't return new refresh token
      accessTokenExpiry: admin.firestore.Timestamp.fromDate(new Date(Date.now() + (data.expiresIn * 1000))),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
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
    
    // Add 5 minute buffer before expiry
    if (expiryDate > new Date(Date.now() + 5 * 60 * 1000)) {
      return credentials.accessToken;
    }
  }

  // Token expired or missing, refresh it
  return await refreshIfoodAccessToken(credentials);
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
      `${IFOOD_API_BASE_URL}/order/v1.0/events:polling`,
      {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "x-polling-merchants": merchantIdsParam,
          "accept": "application/json",
        },
      }
    );

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      logger.error("Failed to poll iFood events", {
        merchantIds,
        status: response.status,
        error,
      });
      return [];
    }

    const data = await response.json();
    return data || [];
  } catch (error) {
    logger.error("Error polling iFood events", {
      merchantIds,
      error: error.message,
    });
    return [];
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
 * @param {Array<string>} eventIds - Array of event IDs to acknowledge
 * @param {string} accessToken - Access token
 * @return {Promise<boolean>} - Success status
 */
async function acknowledgeIfoodEvents(eventIds, accessToken) {
  try {
    const response = await fetch(
      `${IFOOD_API_BASE_URL}/order/v1.0/events/acknowledgment`,
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Content-Type": "application/json",
          "accept": "application/json",
        },
        body: JSON.stringify(eventIds),
      }
    );

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      logger.error("Failed to acknowledge events", {eventIds, error});
      return false;
    }

    logger.info("Events acknowledged successfully", {count: eventIds.length});
    return true;
  } catch (error) {
    logger.error("Error acknowledging events", {eventIds, error: error.message});
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
    code: event.code,
    fullCode: event.fullCode,
    orderId: event.orderId,
    merchantId: event.merchantId,
    createdAt: event.createdAt || admin.firestore.FieldValue.serverTimestamp(),
    processedAt: admin.firestore.FieldValue.serverTimestamp(),
    rawEvent: event,
  });
}

/**
 * Process iFood order and save to Firestore
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

    // Transform iFood order to MesaFacil format
    const transformedOrder = {
      ifoodOrderId: orderId,
      displayId: orderData.displayId || orderId,
      createdAt: orderData.createdAt || admin.firestore.FieldValue.serverTimestamp(),
      orderType: orderData.orderType || "DELIVERY",
      orderTiming: orderData.orderTiming || "IMMEDIATE",
      
      // Customer info
      customer: {
        name: orderData.customer?.name || "Cliente iFood",
        phone: orderData.customer?.phone?.number || "",
        documentNumber: orderData.customer?.documentNumber || "",
      },
      
      // Delivery info
      delivery: orderData.delivery ? {
        address: orderData.delivery.deliveryAddress || {},
        deliveredBy: orderData.delivery.deliveredBy || "IFOOD",
        observations: orderData.delivery.observations || "",
      } : null,
      
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
      },
      
      // Payments
      payments: orderData.payments || [],
      
      // Status
      status: orderData.orderStatus || "PLACED",
      ifoodStatus: orderData.orderStatus || "PLACED",
      
      // Metadata
      source: "ifood",
      syncedAt: admin.firestore.FieldValue.serverTimestamp(),
      lastUpdatedAt: admin.firestore.FieldValue.serverTimestamp(),
      
      // Raw data for reference
      rawData: orderData,
    };

    await orderRef.set(transformedOrder, {merge: true});

    logger.info("iFood order processed and saved", {
      idRestaurante,
      orderId,
      status: orderData.orderStatus,
      isNew: isNewOrder,
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
 * Process a batch of events for a restaurant
 * @param {string} idRestaurante - Restaurant ID
 * @param {Array} events - Events to process
 * @param {string} accessToken - Access token
 */
async function processEventsForRestaurant(idRestaurante, events, accessToken) {
  const processedEventIds = [];
  
  for (const event of events) {
    try {
      // Check for duplicates
      const alreadyProcessed = await isEventProcessed(idRestaurante, event.id);
      if (alreadyProcessed) {
        logger.info("Event already processed, skipping", {
          idRestaurante,
          eventId: event.id,
        });
        processedEventIds.push(event.id);
        continue;
      }

      // For order events, fetch full order details
      if (event.orderId) {
        const orderData = await fetchIfoodOrder(event.orderId, accessToken);
        if (orderData) {
          await processIfoodOrder(idRestaurante, orderData);
        }
      }

      // Mark event as processed
      await markEventAsProcessed(idRestaurante, event);
      processedEventIds.push(event.id);

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

  // Acknowledge all processed events
  if (processedEventIds.length > 0) {
    await acknowledgeIfoodEvents(processedEventIds, accessToken);
  }
}

/**
 * Scheduled function to poll iFood events
 * Runs every 1 minute (minimum interval supported by Cloud Scheduler)
 */
exports.ifoodPolling = onSchedule(
  {
    schedule: "every 1 minutes",
    timeoutSeconds: 540,
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

      // Group integrations that can share the same token
      // For simplicity, we'll poll each restaurant separately
      // In production, you could optimize by grouping restaurants with the same credentials
      
      for (const integration of integrations) {
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
            continue;
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
    timeoutSeconds: 300,
  },
  async (request) => {
    try {
      const {idRestaurante} = request.data;

      if (!idRestaurante) {
        throw new Error("idRestaurante is required");
      }

      logger.info("Manual polling triggered", {idRestaurante});

      // Get integration for this restaurant
      const ifoodDoc = await admin.firestore()
        .doc(`restaurantes/${idRestaurante}/integrations/ifood`)
        .get();

      if (!ifoodDoc.exists) {
        throw new Error("iFood integration not found");
      }

      const data = ifoodDoc.data();
      if (!data.enabled || !data.merchantId || !data.refreshToken) {
        throw new Error("iFood integration not properly configured");
      }

      const credentials = {...data, restaurantId: idRestaurante};

      // Get valid access token
      const accessToken = await getValidAccessToken(credentials);

      // Poll events
      const events = await pollIfoodEvents([data.merchantId], accessToken);

      logger.info("Received events from manual poll", {
        idRestaurante,
        eventCount: events.length,
      });

      // Process events
      await processEventsForRestaurant(idRestaurante, events, accessToken);

      return {
        success: true,
        eventCount: events.length,
        message: `Processed ${events.length} events`,
      };
    } catch (error) {
      logger.error("Error in manual polling", {error: error.message});
      throw new Error(error.message);
    }
  }
);
