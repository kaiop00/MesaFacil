import { loadStripe } from '@stripe/stripe-js';

// Get Stripe publishable key from environment
const stripePublishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;

// Validate key exists
if (!stripePublishableKey) {
  console.error('⚠️ VITE_STRIPE_PUBLISHABLE_KEY is not configured in .env file');
}

// Initialize Stripe with publishable key
const stripePromise = stripePublishableKey ? loadStripe(stripePublishableKey) : null;

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
    if (!stripePromise) {
      console.error('Stripe cannot be initialized: Missing VITE_STRIPE_PUBLISHABLE_KEY');
      return;
    }
    
    try {
      this.stripe = await stripePromise;
    } catch (error) {
      console.error('❌ Error initializing Stripe:', error);
      throw new Error('Failed to initialize Stripe payment system');
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
   * Activate user plan after successful payment
   * @param {string} userId - Firebase User ID
   * @param {string} planId - Plan identifier
   * @param {Object} stripeData - Stripe customer and subscription data
   * @returns {Promise<Object>} Activation response
   */
  async activateUserPlan(userId, planId, stripeData) {
    try {
      const response = await fetch(`${this.apiBaseUrl}/activatePlan`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          planId,
          stripeCustomerId: stripeData.customerId,
          stripeSubscriptionId: stripeData.subscriptionId,
          sessionId: stripeData.sessionId
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to activate plan');
      }

      return result;
    } catch (error) {
      console.error('Error activating user plan:', error);
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
  quarterly: import.meta.env.VITE_STRIPE_QUARTERLY_PRICE_ID,
  semiannual: import.meta.env.VITE_STRIPE_SEMIANNUAL_PRICE_ID,
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