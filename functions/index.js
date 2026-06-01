/* eslint-env node */
/* eslint-disable no-undef */
const {setGlobalOptions} = require("firebase-functions");
const {onRequest} = require("firebase-functions/v2/https");
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
      const {priceId, customerEmail, metadata, successUrl, cancelUrl} = req.body;

      // Validate required fields
      if (!priceId || !customerEmail || !successUrl || !cancelUrl) {
        return res.status(400).json({
          error: "Missing required fields: priceId, customerEmail, successUrl, cancelUrl",
        });
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

      // Create checkout session
      const session = await stripe.checkout.sessions.create({
        customer: customer.id,
        payment_method_types: ["card"],
        payment_method_collection: "if_required",
        line_items: [
          {
            price: priceId,
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
        allow_promotion_codes: true,
        billing_address_collection: "required",
      });

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

      // Save only Stripe references to restaurant document in Firestore
      // Plan details will be fetched from Stripe API on the frontend
      await admin.firestore().collection("restaurantes").doc(idRestaurante).update({
        stripeCustomerId: stripeCustomerId,
        stripeSubscriptionId: stripeSubscriptionId,
        updatedAt: FieldValue.serverTimestamp(),
      });

      logger.info("Stripe references saved to restaurant", {idRestaurante, subscriptionId: stripeSubscriptionId});

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
        limit: 1,
      });

      if (subscriptions.data.length > 0) {
        const subscription = subscriptions.data[0];
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
