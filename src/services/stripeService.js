// Import Stripe lazily inside init() to avoid blocking app load when
// external resources (m.stripe.com) are unreachable.

// Stripe toggle for maintenance windows.
// Fail-safe mode: Stripe stays disabled unless explicitly enabled with
// VITE_STRIPE_TEMPORARILY_DISABLED=false in the deployment environment.
export const STRIPE_TEMPORARILY_DISABLED = import.meta.env.VITE_STRIPE_TEMPORARILY_DISABLED !== 'false';

// Get Stripe publishable key from environment
const stripePublishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;

// Validate key exists
if (!stripePublishableKey && !STRIPE_TEMPORARILY_DISABLED) {
  console.error('⚠️ VITE_STRIPE_PUBLISHABLE_KEY is not configured in .env file');
}

// Note: do not initialize stripePromise at module load — use lazy import inside init()
let stripePromise = null;

if (STRIPE_TEMPORARILY_DISABLED) {
  console.warn('⚠️ STRIPE TEMPORARIAMENTE DESATIVADO - Todas as funcionalidades de plano estão liberadas');
}

/**
 * Stripe Service for handling payments and billing
 * This service uses Stripe's hosted solutions for security
 */
class StripeService {
  constructor() {
    this.stripe = null;
    this.apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';
    this.init();
  }

  async init() {
    if (STRIPE_TEMPORARILY_DISABLED) {
      console.warn('⚠️ Stripe init skipped - STRIPE_TEMPORARILY_DISABLED is true');
      return;
    }
    
    if (!stripePublishableKey) {
      console.error('Stripe cannot be initialized: Missing VITE_STRIPE_PUBLISHABLE_KEY');
      return;
    }

    try {
      // dynamic import ensures network requests are only attempted when needed
      const mod = await import(/* webpackChunkName: "stripe-js" */ '@stripe/stripe-js');
      stripePromise = mod.loadStripe(stripePublishableKey);
      this.stripe = await stripePromise;
    } catch (error) {
      console.error('❌ Error initializing Stripe (lazy):', error);
      // don't throw to avoid unhandled rejections that block app load
      this.stripe = null;
    }
  }

  /**
   * Create a checkout session for subscription
   * @param {string} priceId - Stripe Price ID
   * @param {string} customerEmail - Customer email
   * @param {Object} metadata - Additional metadata
   * @returns {Promise<Object>} Checkout session response
   */
  async createCheckoutSession(priceId, customerEmail, metadata = {}) {
    if (STRIPE_TEMPORARILY_DISABLED) {
      console.warn('⚠️ Stripe checkout session skipped - returning mock data');
      return {
        id: 'mock_session_' + Date.now(),
        url: '/payment-success?session_id=mock_disabled',
        mode: 'subscription',
        status: 'complete'
      };
    }
    
    try {
      const requestBody = {
        priceId,
        customerEmail,
        metadata: {
          ...metadata,
          source: 'mesafacil_app'
        },
        successUrl: `${window.location.origin}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
        cancelUrl: `${window.location.origin}/selecionar-plano?checkout_canceled=true`,
      };

      const response = await fetch(`${this.apiBaseUrl}/createCheckoutSession`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      const session = await response.json();

      if (!response.ok) {
        throw new Error(session.error || 'Failed to create checkout session');
      }

      return session;
    } catch (error) {
      console.error('❌ Error creating checkout session:', error);
      throw error;
    }
  }

  /**
   * Verify checkout session and get payment details
   * @param {string} sessionId - Stripe Checkout Session ID
   * @returns {Promise<Object>} Session verification response
   */
  async verifyCheckoutSession(sessionId) {
    if (STRIPE_TEMPORARILY_DISABLED) {
      console.warn('⚠️ Stripe session verification skipped - returning mock data');
      return {
        session: {
          id: sessionId,
          status: 'complete',
          customer: 'mock_customer_disabled',
          subscription: 'mock_subscription_disabled',
          mode: 'subscription'
        },
        customer: {
          id: 'mock_customer_disabled',
          email: 'disabled@stripe.com'
        },
        subscription: {
          id: 'mock_subscription_disabled',
          status: 'active',
          items: {
            data: [{
              price: { id: 'mock_price_premium' }
            }]
          },
          current_period_end: Math.floor(Date.now() / 1000) + (365 * 24 * 60 * 60), // 1 year from now
          created: Math.floor(Date.now() / 1000)
        }
      };
    }
    
    try {
      const response = await fetch(`${this.apiBaseUrl}/verifySession/${sessionId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const sessionData = await response.json();

      if (!response.ok) {
        throw new Error(sessionData.error || 'Failed to verify session');
      }

      return sessionData;
    } catch (error) {
      console.error('Error verifying checkout session:', error);
      throw error;
    }
  }

  /**
   * Redirect to Stripe Checkout
   * @param {string} priceId - Stripe Price ID
   * @param {string} customerEmail - Customer email
   * @param {Object} metadata - Additional metadata
   */
  async redirectToCheckout(priceId, customerEmail, metadata = {}) {
    if (STRIPE_TEMPORARILY_DISABLED) {
      console.warn('⚠️ Stripe checkout redirect skipped - Stripe is temporarily disabled');
      // Instead of redirecting to Stripe, just show a notification
      alert('Sistema de pagamento temporariamente desativado. Todas as funcionalidades estão liberadas.');
      return;
    }
    
    try {
      // Create checkout session (this returns the session URL)
      const session = await this.createCheckoutSession(priceId, customerEmail, metadata);

      if (!session || !session.url) {
        throw new Error('Failed to get checkout URL from session');
      }
      
      // Redirect directly to the Stripe Checkout URL
      // This is the new recommended approach in Stripe.js v8+
      window.location.href = session.url;
    } catch (error) {
      console.error('❌ Error redirecting to checkout:', error);
      throw error;
    }
  }

  /**
   * Create a billing portal session
   * @param {string} customerId - Stripe Customer ID
   * @returns {Promise<Object>} Portal session response
   */
  async createBillingPortalSession(customerId) {
    try {
      const response = await fetch(`${this.apiBaseUrl}/createPortalSession`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          customerId,
          returnUrl: `${window.location.origin}/home`,
        }),
      });

      const session = await response.json();

      if (!response.ok) {
        throw new Error(session.error || 'Failed to create portal session');
      }

      return session;
    } catch (error) {
      console.error('Error creating portal session:', error);
      throw error;
    }
  }

  /**
   * Redirect to Stripe Customer Portal
   * @param {string} customerId - Stripe Customer ID
   */
  async redirectToBillingPortal(customerId) {
    try {
      const session = await this.createBillingPortalSession(customerId);
      
      // Redirect to the portal URL
      window.location.href = session.url;
    } catch (error) {
      console.error('Error redirecting to billing portal:', error);
      throw error;
    }
  }

  /**
   * Get customer subscription info
   * @param {string} customerId - Stripe Customer ID
   * @returns {Promise<Object>} Customer subscription data
   */
  async getCustomerSubscription(customerId) {
    if (STRIPE_TEMPORARILY_DISABLED) {
      console.warn('⚠️ Stripe subscription fetch skipped - returning mock premium subscription');
      return {
        subscription: {
          id: 'mock_subscription_disabled',
          status: 'active',
          items: {
            data: [{
              price: { id: 'mock_price_premium' }
            }]
          },
          current_period_end: Math.floor(Date.now() / 1000) + (365 * 24 * 60 * 60), // 1 year from now
          created: Math.floor(Date.now() / 1000),
          cancel_at_period_end: false
        }
      };
    }
    
    try {
      const response = await fetch(`${this.apiBaseUrl}/getCustomerSubscription/${customerId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to get customer subscription');
      }

      return data;
    } catch (error) {
      console.error('Error getting customer subscription:', error);
      throw error;
    }
  }

  /**
   * Get current plan from Stripe subscription
   * Returns plan information mapped to internal plan structure
   * @param {string} customerId - Stripe Customer ID
   * @returns {Promise<Object>} Plan information
   */
  async getCurrentPlan(customerId) {
    if (STRIPE_TEMPORARILY_DISABLED) {
      console.warn('⚠️ Stripe plan fetch skipped - granting semiannual plan access');
      // Return a premium plan with long expiration
      return {
        planId: 'semiannual',
        status: 'active',
        expiresAt: new Date(Date.now() + (365 * 24 * 60 * 60 * 1000)), // 1 year from now
        createdAt: new Date(),
        cancelAtPeriodEnd: false,
        stripeSubscriptionId: 'mock_subscription_disabled',
        stripePriceId: 'mock_price_semiannual'
      };
    }
    
    try {
      if (!customerId) {
        return extractPlanFromSubscription(null);
      }

      const subscriptionData = await this.getCustomerSubscription(customerId);
      
      if (!subscriptionData.subscription) {
        return extractPlanFromSubscription(null);
      }

      return extractPlanFromSubscription(subscriptionData.subscription);
    } catch (error) {
      console.error('Error getting current plan:', error);
      // Return free plan on error
      return extractPlanFromSubscription(null);
    }
  }

  /**
   * Cancel subscription
   * @param {string} subscriptionId - Stripe Subscription ID
   * @returns {Promise<Object>} Cancellation response
   */
  async cancelSubscription(subscriptionId) {
    try {
      const response = await fetch(`${this.apiBaseUrl}/cancelSubscription/${subscriptionId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to cancel subscription');
      }

      return data;
    } catch (error) {
      console.error('Error canceling subscription:', error);
      throw error;
    }
  }

  /**
   * Get available products and prices
   * @returns {Promise<Array>} Products with prices
   */
  async getProducts() {
    try {
      const response = await fetch(`${this.apiBaseUrl}/api/stripe/products`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const products = await response.json();

      if (!response.ok) {
        throw new Error(products.error || 'Failed to get products');
      }

      return products;
    } catch (error) {
      console.error('Error getting products:', error);
      throw error;
    }
  }

  /**
   * Activate restaurant plan after successful payment
   * Saves Stripe customer and subscription references to restaurant's Firestore document
   * @param {string} idRestaurante - Restaurant ID
   * @param {string} stripeCustomerId - Stripe Customer ID
   * @param {string} stripeSubscriptionId - Stripe Subscription ID
   * @returns {Promise<Object>} Activation response
   */
  async activateUserPlan(idRestaurante, stripeCustomerId, stripeSubscriptionId) {
    try {
      const response = await fetch(`${this.apiBaseUrl}/activatePlan`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          idRestaurante,
          stripeCustomerId,
          stripeSubscriptionId
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to activate plan');
      }

      return result;
    } catch (error) {
      console.error('Error activating restaurant plan:', error);
      throw error;
    }
  }
}

// Create and export singleton instance
const stripeService = new StripeService();

export default stripeService;

// Export class for testing or multiple instances if needed
export { StripeService };

/**
 * Price ID mappings for environment variables
 * These map to your Stripe Price IDs in the dashboard
 */
export const STRIPE_PRICE_IDS = {
  monthly: import.meta.env.VITE_STRIPE_MONTHLY_PRICE_ID,
  bimonthly: import.meta.env.VITE_STRIPE_BIMONTHLY_PRICE_ID,
  semiannual: import.meta.env.VITE_STRIPE_SEMIANNUAL_PRICE_ID,
};

/**
 * Map Stripe Price ID to internal Plan ID
 * @param {string} stripePriceId - Stripe Price ID from subscription
 * @returns {string} Internal plan ID (free, monthly, bimonthly, semiannual)
 */
export const mapStripePriceToPlanId = (stripePriceId) => {
  if (!stripePriceId) return 'free';
  
  // Reverse mapping from price ID to plan ID
  for (const [planId, priceId] of Object.entries(STRIPE_PRICE_IDS)) {
    if (priceId === stripePriceId) {
      return planId;
    }
  }
  
  // If no match found, return free
  return 'free';
};

/**
 * Extract plan information from Stripe subscription
 * @param {Object} subscription - Stripe subscription object
 * @returns {Object} Plan information with planId, status, expiresAt, etc.
 */
export const extractPlanFromSubscription = (subscription) => {
  if (!subscription) {
    return {
      planId: 'free',
      status: 'active',
      expiresAt: null,
      stripeSubscriptionId: null,
      stripePriceId: null
    };
  }

  // Get the price ID from the subscription
  const stripePriceId = subscription.items?.data?.[0]?.price?.id || subscription.plan?.id;
  
  // Map to internal plan ID
  const planId = mapStripePriceToPlanId(stripePriceId);
  
  return {
    planId,
    status: subscription.status,
    expiresAt: subscription.current_period_end ? new Date(subscription.current_period_end * 1000) : null,
    createdAt: subscription.created ? new Date(subscription.created * 1000) : null,
    cancelAtPeriodEnd: subscription.cancel_at_period_end || false,
    stripeSubscriptionId: subscription.id,
    stripePriceId
  };
};

/**
 * Utility functions for plan management
 */
export const stripeUtils = {
  /**
   * Get Stripe Price ID for a plan
   * @param {string} planId - Plan identifier
   * @returns {string} Stripe Price ID
   */
  getPriceIdForPlan(planId) {
    return STRIPE_PRICE_IDS[planId] || null;
  },

  /**
   * Check if plan requires Stripe payment
   * @param {string} planId - Plan identifier
   * @returns {boolean} True if plan requires payment
   */
  isPaidPlan(planId) {
    return planId !== 'free' && Boolean(this.getPriceIdForPlan(planId));
  },

  /**
   * Format subscription status for display
   * @param {string} status - Stripe subscription status
   * @returns {Object} Formatted status with color and text
   */
  formatSubscriptionStatus(status) {
    const statusMap = {
      active: { text: 'Ativo', color: 'green' },
      past_due: { text: 'Pagamento Pendente', color: 'yellow' },
      canceled: { text: 'Cancelado', color: 'red' },
      incomplete: { text: 'Incompleto', color: 'yellow' },
      incomplete_expired: { text: 'Expirado', color: 'red' },
      trialing: { text: 'Período de Teste', color: 'blue' },
      unpaid: { text: 'Não Pago', color: 'red' },
    };

    return statusMap[status] || { text: 'Desconhecido', color: 'gray' };
  },
};