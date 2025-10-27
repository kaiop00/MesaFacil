/* eslint-env node */
/* eslint-disable no-undef */
const {setGlobalOptions} = require("firebase-functions");
const {onRequest} = require("firebase-functions/v2/https");
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
