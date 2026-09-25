/* eslint-env node */
/* eslint-disable no-undef */
const {setGlobalOptions} = require("firebase-functions");
const {onRequest} = require("firebase-functions/v2/https");
const {onSchedule} = require("firebase-functions/v2/scheduler");
const {onDocumentCreated} = require("firebase-functions/v2/firestore");
const {defineSecret} = require("firebase-functions/params");
const logger = require("firebase-functions/logger");
const admin = require("firebase-admin");
const {FieldValue} = require("firebase-admin/firestore");

// Load environment variables for local development
if (process.env.NODE_ENV !== "production") {
  require("dotenv").config({path: ".env.local"});
}

// Initialize Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp();
}

// Define secrets for Stripe (will be configured via Firebase CLI)
const stripeSecretKey = defineSecret("STRIPE_SECRET_KEY");
const stripeWebhookSecret = defineSecret("STRIPE_WEBHOOK_SECRET");

const SUBSCRIPTION_GRACE_DAYS = 3;
const SUBSCRIPTION_REMINDER_DAYS = [10, 5, 3, 1, 0];

// Helper function to get Stripe secret key
function getStripeSecretKey() {
  // For local development, use environment variable
  if (process.env.STRIPE_SECRET_KEY) {
    logger.info('Using STRIPE_SECRET_KEY from environment variable (local dev)');
    return process.env.STRIPE_SECRET_KEY;
  }
  // For production, use Firebase secret
  if (stripeSecretKey.value()) {
    logger.info('Using STRIPE_SECRET_KEY from Firebase secret (production)');
    return stripeSecretKey.value();
  }
  throw new Error('STRIPE_SECRET_KEY not configured');
}

// Set global options for cost control
setGlobalOptions({ maxInstances: 10 });

/**
 * CORS middleware for handling cross-origin requests
 */
const corsHandler = (req, res) => {
  res.set("Access-Control-Allow-Origin", "*");
  res.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
  
  if (req.method === "OPTIONS") {
    res.status(204).send("");
    return true; // Return true to indicate response was sent
  }
  
  return false; // Return false to continue processing
};


const getWebhookSecret = () => {
  if (process.env.STRIPE_WEBHOOK_SECRET) {
    return process.env.STRIPE_WEBHOOK_SECRET;
  }
  if (stripeWebhookSecret.value()) {
    return stripeWebhookSecret.value();
  }
  throw new Error("STRIPE_WEBHOOK_SECRET not configured");
};

const timestampFromSeconds = (seconds) => (
  seconds ? admin.firestore.Timestamp.fromMillis(Number(seconds) * 1000) : null
);

const timestampToMillis = (value) => {
  if (!value) return null;
  if (typeof value.toMillis === "function") return value.toMillis();
  if (typeof value.toDate === "function") return value.toDate().getTime();
  if (value instanceof Date) return value.getTime();
  const parsed = new Date(value).getTime();
  return Number.isNaN(parsed) ? null : parsed;
};

const isBlockedSubscriptionState = (subscription = {}, nowMs = Date.now()) => {
  if (subscription.accessBlocked === true) return true;

  const status = subscription.status;
  if (["unpaid", "canceled", "incomplete_expired"].includes(status)) return true;

  if (status === "past_due") {
    const graceUntilMs = timestampToMillis(subscription.graceUntil);
    return !graceUntilMs || graceUntilMs <= nowMs;
  }

  if (["active", "trialing"].includes(status) && subscription.cancelAtPeriodEnd) {
    const periodEndMs = timestampToMillis(subscription.currentPeriodEnd);
    return Boolean(periodEndMs && periodEndMs <= nowMs);
  }

  return false;
};

const addRestaurantNotificationIfMissing = async (idRestaurante, notificationId, data) => {
  if (!idRestaurante) return false;
  const ref = admin.firestore()
    .collection("restaurantes")
    .doc(idRestaurante)
    .collection("notificacoes")
    .doc(notificationId);

  const existing = await ref.get();
  if (existing.exists) return false;

  await ref.create({
    tipo: "assinatura",
    categoria: "cobranca",
    read: false,
    criadoEm: FieldValue.serverTimestamp(),
    ...data,
  });
  return true;
};

const findRestaurantByStripe = async ({idRestaurante, customerId, subscriptionId}) => {
  const restaurants = admin.firestore().collection("restaurantes");

  if (idRestaurante) {
    const direct = await restaurants.doc(idRestaurante).get();
    if (direct.exists) return direct;
  }

  if (subscriptionId) {
    const snapshot = await restaurants
      .where("stripeSubscriptionId", "==", subscriptionId)
      .limit(1)
      .get();
    if (!snapshot.empty) return snapshot.docs[0];
  }

  if (customerId) {
    const snapshot = await restaurants
      .where("stripeCustomerId", "==", customerId)
      .limit(1)
      .get();
    if (!snapshot.empty) return snapshot.docs[0];
  }

  return null;
};

const buildSubscriptionState = (subscription, previous = {}) => {
  const nowMs = Date.now();
  const status = subscription.status;
  const currentPeriodEnd = timestampFromSeconds(subscription.current_period_end);
  const currentPeriodStart = timestampFromSeconds(subscription.current_period_start);
  const cancelAtPeriodEnd = Boolean(subscription.cancel_at_period_end);

  let graceUntil = previous.graceUntil || null;
  if (status === "past_due" && !graceUntil) {
    graceUntil = admin.firestore.Timestamp.fromMillis(
      nowMs + SUBSCRIPTION_GRACE_DAYS * 24 * 60 * 60 * 1000,
    );
  }

  if (["active", "trialing"].includes(status)) {
    graceUntil = null;
  }

  const state = {
    status,
    stripeSubscriptionId: subscription.id,
    stripePriceId: subscription.items?.data?.[0]?.price?.id || null,
    planId: subscription.metadata?.planId || previous.planId || null,
    currentPeriodStart,
    currentPeriodEnd,
    cancelAtPeriodEnd,
    graceUntil,
    paymentFailedAt: previous.paymentFailedAt || null,
    accessBlocked: false,
    updatedAt: FieldValue.serverTimestamp(),
  };

  state.accessBlocked = isBlockedSubscriptionState(state, nowMs);
  if (["active", "trialing"].includes(status)) {
    state.paymentFailedAt = null;
    state.accessBlocked = false;
  }

  return state;
};

const syncRestaurantSubscription = async ({
  idRestaurante,
  customerId,
  subscription,
  reason = "stripe",
}) => {
  const restaurantDoc = await findRestaurantByStripe({
    idRestaurante,
    customerId,
    subscriptionId: subscription?.id,
  });

  if (!restaurantDoc || !subscription) return null;

  const restaurantData = restaurantDoc.data() || {};
  const previous = restaurantData.subscription || {};
  const previousBlocked = isBlockedSubscriptionState(previous);
  const previousHadPaymentIssue = previousBlocked || ["past_due", "unpaid"].includes(previous.status);
  const state = buildSubscriptionState(subscription, previous);
  const nextBlocked = state.accessBlocked;
  const restaurantRef = restaurantDoc.ref;

  const update = {
    stripeCustomerId: customerId || restaurantData.stripeCustomerId || null,
    stripeSubscriptionId: subscription.id,
    subscription: state,
    updatedAt: FieldValue.serverTimestamp(),
  };

  if (reason === "payment_failed") {
    update.subscription.paymentFailedAt = FieldValue.serverTimestamp();
  }

  await restaurantRef.set(update, {merge: true});

  if (previousHadPaymentIssue && !nextBlocked && ["active", "trialing"].includes(state.status)) {
    await addRestaurantNotificationIfMissing(
      restaurantDoc.id,
      `assinatura_restaurada_${subscription.id}_${subscription.current_period_end || Date.now()}`,
      {
        titulo: "Pagamento regularizado",
        mensagem: "Seu pagamento foi regularizado e o acesso ao MesaFácil foi restaurado automaticamente.",
        prioridade: "alta",
        stripeSubscriptionId: subscription.id,
      },
    );
  }

  if (!previousBlocked && nextBlocked) {
    await addRestaurantNotificationIfMissing(
      restaurantDoc.id,
      `assinatura_bloqueada_${subscription.id}_${subscription.current_period_end || Date.now()}`,
      {
        titulo: "Acesso bloqueado",
        mensagem: "O período de tolerância terminou ou a assinatura não está mais regularizada. Escolha um plano para restaurar o acesso.",
        prioridade: "alta",
        stripeSubscriptionId: subscription.id,
      },
    );
  }

  if (reason === "payment_failed") {
    await addRestaurantNotificationIfMissing(
      restaurantDoc.id,
      `assinatura_pagamento_falhou_${subscription.id}_${Date.now()}`,
      {
        titulo: "Falha no pagamento",
        mensagem: "Não conseguimos confirmar o pagamento da sua assinatura. Verifique seu meio de pagamento para evitar o bloqueio do acesso.",
        prioridade: "alta",
        stripeSubscriptionId: subscription.id,
      },
    );
  }

  if (previous.status !== "past_due" && state.status === "past_due") {
    const graceUntilDate = timestampToMillis(state.graceUntil);
    await addRestaurantNotificationIfMissing(
      restaurantDoc.id,
      `assinatura_graca_${subscription.id}_${subscription.current_period_end || Date.now()}`,
      {
        titulo: "Período de tolerância iniciado",
        mensagem: `Seu pagamento está pendente. Você tem ${SUBSCRIPTION_GRACE_DAYS} dias para regularizar a assinatura antes do bloqueio.`,
        prioridade: "alta",
        stripeSubscriptionId: subscription.id,
        graceUntil: graceUntilDate ? admin.firestore.Timestamp.fromMillis(graceUntilDate) : null,
      },
    );
  }

  return {restaurantId: restaurantDoc.id, state};
};

const processStripeWebhookEvent = async (event) => {
  const data = event.data?.object || {};

  switch (event.type) {
    case "checkout.session.completed": {
      if (data.mode !== "subscription" || !data.subscription) return;
      const customerId = typeof data.customer === "string" ? data.customer : data.customer?.id;
      const subscriptionId = typeof data.subscription === "string" ? data.subscription : data.subscription?.id;
      const idRestaurante = data.metadata?.idRestaurante || data.subscription_details?.metadata?.idRestaurante;
      if (!subscriptionId) return;

      const stripe = require("stripe")(getStripeSecretKey());
      const subscription = await stripe.subscriptions.retrieve(subscriptionId);
      await syncRestaurantSubscription({
        idRestaurante,
        customerId,
        subscription,
        reason: "checkout_completed",
      });
      return;
    }

    case "invoice.payment_failed": {
      const customerId = typeof data.customer === "string" ? data.customer : data.customer?.id;
      const subscriptionId = typeof data.subscription === "string" ? data.subscription : data.subscription?.id;
      if (!subscriptionId) return;
      const stripe = require("stripe")(getStripeSecretKey());
      const subscription = await stripe.subscriptions.retrieve(subscriptionId);
      await syncRestaurantSubscription({
        customerId,
        subscription,
        reason: "payment_failed",
      });
      return;
    }

    case "invoice.paid":
    case "invoice.payment_succeeded": {
      const customerId = typeof data.customer === "string" ? data.customer : data.customer?.id;
      const subscriptionId = typeof data.subscription === "string" ? data.subscription : data.subscription?.id;
      if (!subscriptionId) return;
      const stripe = require("stripe")(getStripeSecretKey());
      const subscription = await stripe.subscriptions.retrieve(subscriptionId);
      await syncRestaurantSubscription({customerId, subscription, reason: "payment_paid"});
      return;
    }

    case "customer.subscription.updated":
    case "customer.subscription.deleted": {
      const customerId = typeof data.customer === "string" ? data.customer : data.customer?.id;
      await syncRestaurantSubscription({customerId, subscription: data, reason: event.type});
      return;
    }

    default:
      logger.debug("Stripe webhook ignored", {type: event.type});
  }
};

const resolveStripePriceId = async (stripe, rawPriceId) => {
  const value = String(rawPriceId || "").trim();

  if (!value) {
    return null;
  }

  if (value.startsWith("price_")) {
    return value;
  }

  if (!value.startsWith("prod_")) {
    return value;
  }

  const product = await stripe.products.retrieve(value);

  if (product?.default_price) {
    return typeof product.default_price === "string"
      ? product.default_price
      : product.default_price.id;
  }

  const prices = await stripe.prices.list({
    product: value,
    active: true,
    limit: 1,
  });

  if (prices.data.length === 0) {
    throw new Error(`No active price found for product: ${value}`);
  }

  return prices.data[0].id;
};

const normalizeText = (value) => String(value ?? "").trim();

const safeLower = (value) => normalizeText(value).toLowerCase();

const resolveSetorFromItem = (item = {}, setores = []) => {
  const setorId = normalizeText(item?.setorId || item?.setor?.id || "");
  const setorNomeFallback = normalizeText(item?.setorNome || item?.setor?.nome || item?.setor || "Sem setor");

  if (setorId) {
    const setorPorId = setores.find((setor) => setor.id === setorId);
    if (setorPorId) {
      return {
        setorId: setorPorId.id,
        setorNome: normalizeText(setorPorId.nome || setorNomeFallback),
      };
    }
  }

  const categoriasItem = Array.isArray(item?.categorias)
    ? item.categorias.map((categoria) => safeLower(categoria)).filter(Boolean)
    : [];

  if (categoriasItem.length > 0) {
    const setorEncontrado = setores.find((setor) => {
      const categoriasSetor = Array.isArray(setor?.categorias)
        ? setor.categorias.map((categoria) => safeLower(categoria)).filter(Boolean)
        : [];
      return categoriasSetor.some((categoria) => categoriasItem.includes(categoria));
    });

    if (setorEncontrado) {
      return {
        setorId: setorEncontrado.id,
        setorNome: normalizeText(setorEncontrado.nome || setorNomeFallback),
      };
    }
  }

  return {
    setorId: setorId || "sem-setor",
    setorNome: setorNomeFallback,
  };
};

const groupItemsBySetor = (items = [], setores = []) => {
  const grupos = new Map();

  items.forEach((item, index) => {
    const resolved = resolveSetorFromItem(item, setores);
    const key = `${resolved.setorId}::${resolved.setorNome}`;

    if (!grupos.has(key)) {
      grupos.set(key, {
        setorId: resolved.setorId,
        setorNome: resolved.setorNome,
        items: [],
      });
    }

    grupos.get(key).items.push({
      ...item,
      __index: index,
      setorId: resolved.setorId,
      setorNome: resolved.setorNome,
    });
  });

  return Array.from(grupos.values());
};

const resolvePrinterName = (impressoras = [], setorId = "") => {
  const linkedPrinter = impressoras.find((item) => item?.setorId === setorId && item?.ativa !== false);
  const linkedName = normalizeText(linkedPrinter?.printerSystemName || linkedPrinter?.systemPrinter);
  if (linkedName) {
    return linkedName;
  }

  const fallbackPrinter = impressoras.find((item) => item?.ativa !== false);
  return normalizeText(fallbackPrinter?.printerSystemName || fallbackPrinter?.systemPrinter || "");
};

const buildPrintQueuePayload = ({
  pedidoId,
  mesaId,
  mesaNumero,
  setorId,
  setorNome,
  estabelecimentoNome,
  printerSystemName,
  items,
  observacoes,
}) => {
  const lines = [
    "------------------------------------------------",
    "MESA FACIL",
    estabelecimentoNome || "-",
    "TIPO: PEDIDO",
    `MESA: ${mesaNumero || mesaId || "-"}`,
    `SETOR: ${setorNome || "Sem setor"}`,
    "------------------------------------------------",
    ...(items || []).flatMap((item, index) => {
      const quantity = Number(item?.quantity || 0);
      const name = normalizeText(item?.nome || "Item").toUpperCase();
      const observation = normalizeText(item?.descricao || item?.itemObservation || item?.observacao || item?.observacoes || "");
      const rows = [`${String(index + 1).padStart(2, "0")}. ${quantity}X ${name}`];
      if (observation) {
        rows.push(`   OBS: ${observation.toUpperCase()}`);
      }
      return rows;
    }),
    "------------------------------------------------",
  ];

  if (observacoes) {
    lines.push(`OBS: ${normalizeText(observacoes).toUpperCase()}`);
  }

  return {
    pedidoId,
    mesaId,
    mesaNumero: mesaNumero || mesaId || "-",
    setorId,
    setorNome,
    printerSystemName: printerSystemName || "",
    total: Number((items || []).reduce((acc, item) => acc + Number(item.price || 0) * Number(item.quantity || 0), 0)),
    observacoes: observacoes || "",
    items: (items || []).map((item) => ({
      id: item.id,
      nome: item.nome,
      price: Number(item.price || 0),
      quantity: Number(item.quantity || 0),
      descricao: item.descricao || item.itemObservation || item.observacao || item.observacoes || "",
      itemObservation: item.itemObservation || item.observacao || item.observacoes || "",
      setorId: item.setorId || "",
      setorNome: item.setorNome || "",
    })),
    ticketText: lines.join("\n"),
  };
};

const isAutoPrintEligible = (pedidoData = {}) => {
  const orderOrigin = safeLower(pedidoData?.orderOrigin || "mesaconvencional");
  return orderOrigin !== "mesaconvencional";
};

async function enqueuePrintJobsForPedidoDoc({ idRestaurante, pedidoId, mesaId, mesaNumero, pedidoData = {} }) {
  const pedidoItems = Array.isArray(pedidoData.items) ? pedidoData.items : [];
  const [setoresSnapshot, impressorasSnapshot, restauranteSnapshot] = await Promise.all([
    admin.firestore().collection("restaurantes").doc(idRestaurante).collection("setoresProducao").get(),
    admin.firestore().collection("restaurantes").doc(idRestaurante).collection("impressorasSetor").get(),
    admin.firestore().collection("restaurantes").doc(idRestaurante).get(),
  ]);

  const setores = setoresSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  const impressoras = impressorasSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  const estabelecimentoNome = restauranteSnapshot.exists ? normalizeText(restauranteSnapshot.data()?.nome || "") : "";
  const grupos = groupItemsBySetor(pedidoItems, setores);

  if (grupos.length === 0) {
    logger.info("Pedido sem grupos de impressão", { idRestaurante, pedidoId });
    return [];
  }

  const queueCollection = admin.firestore().collection("restaurantes").doc(idRestaurante).collection("printQueue");
  const jobs = [];

  for (const grupo of grupos) {
    const setor = setores.find((item) => item.id === grupo.setorId);
    const printerSystemName = resolvePrinterName(impressoras, grupo.setorId);
    const payload = buildPrintQueuePayload({
      pedidoId,
      mesaId,
      mesaNumero,
      setorId: grupo.setorId,
      setorNome: setor?.nome || grupo.setorNome || "Sem setor",
      estabelecimentoNome,
      printerSystemName,
      items: grupo.items,
      observacoes: pedidoData.observacoes || "",
    });

    const queueId = `${pedidoId}_${grupo.setorId}`;
    await queueCollection.doc(queueId).set({
      pedidoId,
      mesaId,
      mesaNumero: mesaNumero || mesaId || "-",
      setorId: grupo.setorId,
      setorNome: setor?.nome || grupo.setorNome || "Sem setor",
      printerSystemName,
      tipo: "PEDIDO",
      status: "PENDENTE",
      tentativas: 0,
      payload,
      criadoEm: FieldValue.serverTimestamp(),
    }, { merge: true });

    jobs.push({ id: queueId, ...payload });
  }

  return jobs;
}

/**
 * Create Stripe Checkout Session
 * POST /createCheckoutSession
 */
exports.createCheckoutSession = onRequest(
  {secrets: [stripeSecretKey]},
  async (req, res) => {
    // Handle CORS
    if (corsHandler(req, res)) return;

    try {
      if (req.method !== "POST") {
        return res.status(405).json({error: "Method not allowed"});
      }

      const stripe = require("stripe")(getStripeSecretKey());
      const {
        priceId,
        customerEmail,
        metadata,
        successUrl,
        cancelUrl,
        promotionCodeId,
      } = req.body;

      // Validate required fields
      if (!priceId || !customerEmail || !successUrl || !cancelUrl) {
        return res.status(400).json({
          error: "Missing required fields: priceId, customerEmail, successUrl, cancelUrl",
        });
      }

      const resolvedPriceId = await resolveStripePriceId(stripe, priceId);

      if (!resolvedPriceId) {
        return res.status(400).json({error: "Price ID is required"});
      }

      // Create or retrieve existing customer
      let customer;
      const existingCustomers = await stripe.customers.list({
        email: customerEmail,
        limit: 1,
      });

      if (existingCustomers.data.length > 0) {
        customer = existingCustomers.data[0];
      } else {
        customer = await stripe.customers.create({
          email: customerEmail,
          metadata: {
            firebase_uid: metadata?.userId || "",
          },
        });
      }

      if (promotionCodeId && !String(promotionCodeId).startsWith("promo_")) {
        return res.status(400).json({
          error: "Invalid promotionCodeId. Expected Stripe ID starting with 'promo_'.",
        });
      }

      // If access was blocked because of an unpaid/past-due subscription,
      // close that old subscription before creating the replacement checkout.
      // This prevents the customer from ending up with two recurring subscriptions.
      const checkoutSource = metadata?.source || "";
      if (["blocked_access", "plan_selection"].includes(checkoutSource)) {
        const existingSubscriptions = await stripe.subscriptions.list({
          customer: customer.id,
          status: "all",
          limit: 20,
        });

        for (const existingSubscription of existingSubscriptions.data) {
          if (["past_due", "unpaid"].includes(existingSubscription.status)) {
            try {
              await stripe.subscriptions.cancel(existingSubscription.id);
              logger.info("Canceled previous delinquent subscription before new checkout", {
                customerId: customer.id,
                subscriptionId: existingSubscription.id,
              });
            } catch (cancelError) {
              logger.warn("Could not cancel previous delinquent subscription", {
                subscriptionId: existingSubscription.id,
                error: cancelError.message,
              });
            }
          }
        }
      }

      const checkoutPayload = {
        customer: customer.id,
        payment_method_types: ["card"],
        payment_method_collection: "if_required",
        line_items: [
          {
            price: resolvedPriceId,
            quantity: 1,
          },
        ],
        mode: "subscription",
        success_url: successUrl,
        cancel_url: cancelUrl,
        metadata: metadata || {},
        subscription_data: {
          metadata: metadata || {},
        },
        billing_address_collection: "required",
      };

      if (promotionCodeId) {
        checkoutPayload.discounts = [{promotion_code: promotionCodeId}];
      } else {
        checkoutPayload.allow_promotion_codes = true;
      }

      // Create checkout session
      const session = await stripe.checkout.sessions.create(checkoutPayload);

      res.json({id: session.id, url: session.url});
    } catch (error) {
      logger.error("Error creating checkout session", {error: error.message});
      res.status(500).json({error: error.message});
    }
  }
);

/**
 * Verify Checkout Session
 * GET /verifySession/:sessionId
 */
exports.verifySession = onRequest(
  {secrets: [stripeSecretKey]},
  async (req, res) => {
    // Handle CORS
    if (corsHandler(req, res)) return;

    try {
      if (req.method !== "GET") {
        return res.status(405).json({error: "Method not allowed"});
      }

      const stripe = require("stripe")(getStripeSecretKey());
      const sessionId = req.params[0]; // Get session ID from URL path

      if (!sessionId) {
        return res.status(400).json({error: "Session ID is required"});
      }

      // Retrieve the checkout session
      const session = await stripe.checkout.sessions.retrieve(sessionId, {
        expand: ["subscription", "customer"],
      });

      logger.info("Session verified", {
        sessionId: session.id,
        paymentStatus: session.payment_status,
      });

      res.json({
        id: session.id,
        payment_status: session.payment_status,
        customer: session.customer,
        subscription: session.subscription,
        metadata: session.metadata,
        amount_total: session.amount_total,
        currency: session.currency,
        created: session.created,
      });
    } catch (error) {
      logger.error("Error verifying session", {error: error.message});
      res.status(500).json({error: error.message});
    }
  }
);

/**
 * Activate User Plan
 * POST /activatePlan
 * 
 * Saves Stripe customer and subscription reference to restaurant's Firestore document.
 * Plan details are fetched from Stripe API on the frontend.
 */
exports.activatePlan = onRequest(
  {secrets: [stripeSecretKey]},
  async (req, res) => {
    // Handle CORS
    if (corsHandler(req, res)) return;

    try {
      if (req.method !== "POST") {
        return res.status(405).json({error: "Method not allowed"});
      }

      const stripe = require("stripe")(getStripeSecretKey());
      const {idRestaurante, stripeCustomerId, stripeSubscriptionId} = req.body;

      // Validate required fields
      if (!idRestaurante || !stripeCustomerId || !stripeSubscriptionId) {
        return res.status(400).json({
          error: "Missing required fields: idRestaurante, stripeCustomerId, stripeSubscriptionId",
        });
      }

      // Verify subscription exists in Stripe
      const subscription = await stripe.subscriptions.retrieve(stripeSubscriptionId);

      if (!subscription) {
        return res.status(404).json({error: "Subscription not found in Stripe"});
      }

      // Keep the restaurant document synchronized immediately. The webhook remains
      // the source of truth, but this makes the restoration instant after Checkout.
      await syncRestaurantSubscription({
        idRestaurante,
        customerId: stripeCustomerId,
        subscription,
        reason: "checkout_completed",
      });

      logger.info("Stripe subscription synchronized with restaurant", {idRestaurante, subscriptionId: stripeSubscriptionId});

      res.json({
        success: true,
        message: "Stripe references saved successfully to restaurant",
        subscriptionId: stripeSubscriptionId,
        customerId: stripeCustomerId,
      });
    } catch (error) {
      logger.error("Error saving Stripe references to restaurant", {error: error.message});
      res.status(500).json({error: error.message});
    }
  }
);

/**
 * Create Customer Portal Session
 * POST /createPortalSession
 */
exports.createPortalSession = onRequest(
  {secrets: [stripeSecretKey]},
  async (req, res) => {
    // Handle CORS
    if (corsHandler(req, res)) return;

    try {
      if (req.method !== "POST") {
        return res.status(405).json({error: "Method not allowed"});
      }

      const stripe = require("stripe")(getStripeSecretKey());
      const {customerId, returnUrl} = req.body;

      if (!customerId || !returnUrl) {
        return res.status(400).json({
          error: "Missing required fields: customerId, returnUrl",
        });
      }

      const portalSession = await stripe.billingPortal.sessions.create({
        customer: customerId,
        return_url: returnUrl,
      });

      logger.info("Portal session created", {customerId, portalUrl: portalSession.url});

      res.json({url: portalSession.url});
    } catch (error) {
      logger.error("Error creating portal session", {error: error.message});
      res.status(500).json({error: error.message});
    }
  }
);

/**
 * Get Customer Subscription
 * GET /getCustomerSubscription/:customerId
 */
exports.getCustomerSubscription = onRequest(
  {secrets: [stripeSecretKey]},
  async (req, res) => {
    // Handle CORS
    if (corsHandler(req, res)) return;

    try {
      if (req.method !== "GET") {
        return res.status(405).json({error: "Method not allowed"});
      }

      const stripe = require("stripe")(getStripeSecretKey());
      const customerId = req.params[0]; // Get customer ID from URL path

      if (!customerId) {
        return res.status(400).json({error: "Customer ID is required"});
      }

      logger.info("Fetching subscriptions for customer", {customerId});

      const subscriptions = await stripe.subscriptions.list({
        customer: customerId,
        status: "all",
        limit: 10,
      });

      if (subscriptions.data.length > 0) {
        const statusPriority = ["active", "trialing", "past_due", "incomplete", "unpaid", "canceled", "incomplete_expired"];
        const sorted = [...subscriptions.data].sort((a, b) => {
          const aPriority = statusPriority.indexOf(a.status);
          const bPriority = statusPriority.indexOf(b.status);

          if (aPriority !== bPriority) {
            return aPriority - bPriority;
          }

          return (b.created || 0) - (a.created || 0);
        });

        const subscription = sorted[0];
        res.json({
          subscription,
          status: subscription.status,
          currentPeriodEnd: subscription.current_period_end,
          currentPeriodStart: subscription.current_period_start,
        });
      } else {
        res.json({subscription: null});
      }
    } catch (error) {
      logger.error("Error getting customer subscription", {error: error.message});
      res.status(500).json({error: error.message});
    }
  }
);

/**
 * Cancel Subscription
 * POST /cancelSubscription/:subscriptionId
 */
exports.cancelSubscription = onRequest(
  {secrets: [stripeSecretKey]},
  async (req, res) => {
    // Handle CORS
    if (corsHandler(req, res)) return;

    try {
      if (req.method !== "POST") {
        return res.status(405).json({error: "Method not allowed"});
      }

      const stripe = require("stripe")(getStripeSecretKey());
      const subscriptionId = req.params[0]; // Get subscription ID from URL path

      if (!subscriptionId) {
        return res.status(400).json({error: "Subscription ID is required"});
      }

      const subscription = await stripe.subscriptions.update(subscriptionId, {
        cancel_at_period_end: true,
      });

      logger.info("Subscription cancellation scheduled", {subscriptionId});

      res.json({
        subscription,
        message: "Subscription will be canceled at the end of the current period",
      });
    } catch (error) {
      logger.error("Error canceling subscription", {error: error.message});
      res.status(500).json({error: error.message});
    }
  }
);

/**
 * iFood Integration Functions
 * Import and export iFood polling and distributed OAuth handlers
 */
const {ifoodPolling, ifoodPollManual} = require("./ifood-polling");
const {
  ifoodRequestUserCode,
  ifoodExchangeCode,
  ifoodRevokeAuth,
} = require("./ifood-auth-distributed");
const {ifoodGetCatalog} = require("./ifood-catalog");

// iFood Order Actions (confirm, dispatch, cancel, etc.)
const {
  ifoodConfirmOrder,
  ifoodDispatchOrder,
  ifoodMarkReadyToPickup,
  ifoodGetCancellationReasons,
  ifoodRequestCancellation,
  ifoodAcceptCancellation,
  ifoodDenyCancellation,
  ifoodAcceptDispute,
  ifoodRejectDispute,
  ifoodSelectDisputeAlternative,
} = require("./ifood-actions");

// NFC-e (Nota Fiscal de Consumidor Eletrônica) via Nuvem Fiscal
const {
  nfceRegistrarEmpresa,
  nfceConsultarEmpresa,
  nfceAlterarEmpresa,
  nfceDeletarEmpresa,
  nfceConfigurarEmpresa,
  nfceConsultarConfigNfce,
  nfceConsultarCertificado,
  nfceUploadCertificado,
  nfceDeletarCertificado,
  nfceConsultarCnpj,
  nfceConsultarCep,
  nfceEmitir,
  nfceConsultar,
  nfcePreviaPdfDanfce,
  nfceBaixarPdfDanfce,
  nfceListar,
  nfceCancelar,
  nfceConsultarCancelamento,
  nfceSincronizarCrt,
  nfceSincronizarDocumentos,
} = require("./nfce");


/**
 * Stripe webhook - source of truth for subscription status and access.
 * Configure this endpoint in Stripe as:
 * https://us-central1-projectmesafacil.cloudfunctions.net/stripeWebhook
 */
exports.stripeWebhook = onRequest(
  {secrets: [stripeSecretKey, stripeWebhookSecret]},
  async (req, res) => {
    if (req.method !== "POST") {
      return res.status(405).send("Method not allowed");
    }

    const signature = req.headers["stripe-signature"];
    if (!signature) {
      return res.status(400).send("Missing Stripe signature");
    }

    try {
      const stripe = require("stripe")(getStripeSecretKey());
      const event = stripe.webhooks.constructEvent(
        req.rawBody,
        signature,
        getWebhookSecret(),
      );

      const eventRef = admin.firestore().collection("stripeWebhookEvents").doc(event.id);
      const existingEvent = await eventRef.get();
      if (existingEvent.exists) {
        return res.json({received: true, duplicate: true});
      }

      await processStripeWebhookEvent(event);
      await eventRef.set({
        type: event.type,
        created: event.created,
        processedAt: FieldValue.serverTimestamp(),
      });

      return res.json({received: true});
    } catch (error) {
      logger.error("Stripe webhook error", {error: error.message});
      return res.status(400).send(`Webhook Error: ${error.message}`);
    }
  },
);

/**
 * Daily subscription reminders and automatic grace-period blocking.
 * Runs every day at 09:00 UTC (06:00 in Ceará).
 */
exports.subscriptionBillingMonitor = onSchedule(
  {
    schedule: "0 9 * * *",
    timeZone: "America/Fortaleza",
  },
  async () => {
    const snapshot = await admin.firestore().collection("restaurantes").get();
    const now = Date.now();

    for (const restaurantDoc of snapshot.docs) {
      const data = restaurantDoc.data() || {};
      const subscription = data.subscription;

      // Free-trial expiry reminders use the same notification center.
      if (!subscription?.stripeSubscriptionId) {
        const trialEndMs = timestampToMillis(data.freeTrial?.expiresAt);
        const trialExpired = Boolean(data.freeTrial?.isExpired) || Boolean(trialEndMs && trialEndMs <= now);
        if (trialEndMs && !trialExpired) {
          const diffDays = Math.round((trialEndMs - now) / (24 * 60 * 60 * 1000));
          if (SUBSCRIPTION_REMINDER_DAYS.includes(diffDays)) {
            await addRestaurantNotificationIfMissing(
              restaurantDoc.id,
              `teste_gratis_vencimento_${Math.floor(trialEndMs / 1000)}_${diffDays}`,
              {
                titulo: diffDays === 0 ? "Teste grátis termina hoje" : `Teste grátis termina em ${diffDays} dias`,
                mensagem: diffDays === 0
                  ? "Seu período de teste termina hoje. Escolha um plano para continuar usando o MesaFácil."
                  : `Seu período de teste termina em ${diffDays} dias. Escolha um plano pago para não interromper o acesso.`,
                prioridade: diffDays <= 3 ? "alta" : "normal",
              },
            );
          }
        }
        continue;
      }

      const status = subscription.status;
      const graceUntilMs = timestampToMillis(subscription.graceUntil);
      const periodEndMs = timestampToMillis(subscription.currentPeriodEnd);

      if (status === "past_due" && graceUntilMs && graceUntilMs <= now && subscription.accessBlocked !== true) {
        const blockedState = {
          ...subscription,
          accessBlocked: true,
          updatedAt: FieldValue.serverTimestamp(),
        };
        await restaurantDoc.ref.update({subscription: blockedState, updatedAt: FieldValue.serverTimestamp()});
        await addRestaurantNotificationIfMissing(
          restaurantDoc.id,
          `assinatura_bloqueada_graca_${subscription.stripeSubscriptionId}_${Math.floor(graceUntilMs / 1000)}`,
          {
            titulo: "Acesso bloqueado",
            mensagem: "Os 3 dias de tolerância terminaram sem regularização do pagamento. Escolha um plano para voltar a usar o MesaFácil.",
            prioridade: "alta",
            stripeSubscriptionId: subscription.stripeSubscriptionId,
          },
        );
      }

      if (["active", "trialing"].includes(status) && subscription.cancelAtPeriodEnd && periodEndMs && periodEndMs <= now && subscription.accessBlocked !== true) {
        await restaurantDoc.ref.update({
          "subscription.accessBlocked": true,
          "subscription.updatedAt": FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        });
        await addRestaurantNotificationIfMissing(
          restaurantDoc.id,
          `assinatura_bloqueada_expirada_${subscription.stripeSubscriptionId}_${Math.floor(periodEndMs / 1000)}`,
          {
            titulo: "Assinatura encerrada",
            mensagem: "O período contratado terminou. Escolha um novo plano para continuar usando o MesaFácil.",
            prioridade: "alta",
            stripeSubscriptionId: subscription.stripeSubscriptionId,
          },
        );
      }

      const effectiveBlocked = isBlockedSubscriptionState(subscription, now);
      if (effectiveBlocked) continue;

      if (periodEndMs) {
        const diffDays = Math.round((periodEndMs - now) / (24 * 60 * 60 * 1000));
        if (SUBSCRIPTION_REMINDER_DAYS.includes(diffDays)) {
          const label = diffDays === 0 ? "vence hoje" : `vence em ${diffDays} dias`;
          await addRestaurantNotificationIfMissing(
            restaurantDoc.id,
            `assinatura_vencimento_${subscription.stripeSubscriptionId}_${Math.floor(periodEndMs / 1000)}_${diffDays}`,
            {
              titulo: diffDays === 0 ? "Assinatura vence hoje" : `Assinatura ${label}`,
              mensagem: diffDays === 0
                ? "Sua assinatura vence hoje. Verifique o pagamento para evitar interrupção do acesso."
                : `Sua assinatura vence em ${diffDays} dias. Mantenha o pagamento regularizado para continuar usando o MesaFácil.`,
              prioridade: diffDays <= 3 ? "alta" : "normal",
              stripeSubscriptionId: subscription.stripeSubscriptionId,
              currentPeriodEnd: subscription.currentPeriodEnd || null,
            },
          );
        }
      }
    }
  },
);

exports.ifoodPolling = ifoodPolling;
exports.ifoodPollManual = ifoodPollManual;
exports.ifoodRequestUserCode = ifoodRequestUserCode;
exports.ifoodExchangeCode = ifoodExchangeCode;
exports.ifoodRevokeAuth = ifoodRevokeAuth;
exports.ifoodGetCatalog = ifoodGetCatalog;

// Export iFood Order Actions
exports.ifoodConfirmOrder = ifoodConfirmOrder;
exports.ifoodDispatchOrder = ifoodDispatchOrder;
exports.ifoodMarkReadyToPickup = ifoodMarkReadyToPickup;
exports.ifoodGetCancellationReasons = ifoodGetCancellationReasons;
exports.ifoodRequestCancellation = ifoodRequestCancellation;
exports.ifoodAcceptCancellation = ifoodAcceptCancellation;
exports.ifoodDenyCancellation = ifoodDenyCancellation;

// Export iFood Handshake (Dispute/Negotiation) Actions
exports.ifoodAcceptDispute = ifoodAcceptDispute;
exports.ifoodRejectDispute = ifoodRejectDispute;
exports.ifoodSelectDisputeAlternative = ifoodSelectDisputeAlternative;

// Export iFood Evidence Proxy
const {ifoodGetDisputeEvidence} = require("./ifood-actions");
exports.ifoodGetDisputeEvidence = ifoodGetDisputeEvidence;

// NFC-e
exports.nfceRegistrarEmpresa = nfceRegistrarEmpresa;
exports.nfceConsultarEmpresa = nfceConsultarEmpresa;
exports.nfceAlterarEmpresa = nfceAlterarEmpresa;
exports.nfceDeletarEmpresa = nfceDeletarEmpresa;
exports.nfceConfigurarEmpresa = nfceConfigurarEmpresa;
exports.nfceConsultarConfigNfce = nfceConsultarConfigNfce;
exports.nfceConsultarCertificado = nfceConsultarCertificado;
exports.nfceUploadCertificado = nfceUploadCertificado;
exports.nfceDeletarCertificado = nfceDeletarCertificado;
exports.nfceConsultarCnpj = nfceConsultarCnpj;
exports.nfceConsultarCep = nfceConsultarCep;
exports.nfceEmitir = nfceEmitir;
exports.nfceConsultar = nfceConsultar;
exports.nfcePreviaPdfDanfce = nfcePreviaPdfDanfce;
exports.nfceBaixarPdfDanfce = nfceBaixarPdfDanfce;
exports.nfceListar = nfceListar;
exports.nfceCancelar = nfceCancelar;
exports.nfceConsultarCancelamento = nfceConsultarCancelamento;
exports.nfceSincronizarCrt = nfceSincronizarCrt;
exports.nfceSincronizarDocumentos = nfceSincronizarDocumentos;

exports.enqueuePrintJobsForPedido = onDocumentCreated(
  "restaurantes/{idRestaurante}/mesas/{mesaId}/pedidos/{pedidoId}",
  async (event) => {
    const snapshot = event.data;
    if (!snapshot) {
      return;
    }

    const pedidoData = snapshot.data() || {};
    if (!isAutoPrintEligible(pedidoData)) {
      logger.info("Pedido administrativo não requer auto-impressão no backend", {
        idRestaurante: event.params.idRestaurante,
        mesaId: event.params.mesaId,
        pedidoId: event.params.pedidoId,
        orderOrigin: pedidoData.orderOrigin || "mesaconvencional",
      });
      return;
    }

    try {
      const jobs = await enqueuePrintJobsForPedidoDoc({
        idRestaurante: event.params.idRestaurante,
        mesaId: event.params.mesaId,
        pedidoId: event.params.pedidoId,
        mesaNumero: pedidoData?.mesaNumero || pedidoData?.mesaId || event.params.mesaId,
        pedidoData,
      });

      await snapshot.ref.set({
        backendPrintQueuedAt: FieldValue.serverTimestamp(),
        backendPrintJobsCount: jobs.length,
      }, { merge: true });

      logger.info("Pedido enfileirado para impressão automática", {
        idRestaurante: event.params.idRestaurante,
        mesaId: event.params.mesaId,
        pedidoId: event.params.pedidoId,
        jobs: jobs.length,
      });
    } catch (error) {
      logger.error("Falha ao enfileirar impressão automática", {
        idRestaurante: event.params.idRestaurante,
        mesaId: event.params.mesaId,
        pedidoId: event.params.pedidoId,
        error: error.message,
      });
      throw error;
    }
  }
);
