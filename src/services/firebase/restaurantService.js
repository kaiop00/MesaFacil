import {
  getFirestore,
  doc,
  getDoc,
  updateDoc,
  Timestamp,
  serverTimestamp,
} from "firebase/firestore";
import { app } from "@/config/firebaseConfig";

const db = getFirestore(app);
const FREE_TRIAL_DAYS = 30;

const addDays = (baseDate, days) => {
  const date = new Date(baseDate);
  date.setDate(date.getDate() + days);
  return date;
};

const normalizeFirestoreDate = (value) => {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof value.toDate === "function") return value.toDate();

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

/**
 * Restaurant Service
 * Handles restaurant-specific operations including Stripe subscription data
 */

/**
 * Get restaurant document by ID
 * @param {string} idRestaurante - Restaurant ID
 * @returns {Promise<Object|null>} Restaurant data or null if not found
 */
export async function getRestaurant(idRestaurante) {
  if (!idRestaurante) {
    throw new Error("Restaurant ID is required");
  }

  try {
    const restaurantRef = doc(db, "restaurantes", idRestaurante);
    const restaurantSnap = await getDoc(restaurantRef);

    if (restaurantSnap.exists()) {
      return { id: restaurantSnap.id, ...restaurantSnap.data() };
    }

    return null;
  } catch (error) {
    console.error("Error getting restaurant:", error);
    throw error;
  }
}

/**
 * Get Stripe Customer ID from restaurant document
 * @param {string} idRestaurante - Restaurant ID
 * @returns {Promise<string|null>} Stripe Customer ID or null
 */
export async function getStripeCustomerId(idRestaurante) {
  if (!idRestaurante) {
    return null;
  }

  try {
    const restaurant = await getRestaurant(idRestaurante);
    return restaurant?.stripeCustomerId || null;
  } catch (error) {
    console.error("Error getting Stripe customer ID:", error);
    return null;
  }
}

/**
 * Get Stripe Subscription ID from restaurant document
 * @param {string} idRestaurante - Restaurant ID
 * @returns {Promise<string|null>} Stripe Subscription ID or null
 */
export async function getStripeSubscriptionId(idRestaurante) {
  if (!idRestaurante) {
    return null;
  }

  try {
    const restaurant = await getRestaurant(idRestaurante);
    return restaurant?.stripeSubscriptionId || null;
  } catch (error) {
    console.error("Error getting Stripe subscription ID:", error);
    return null;
  }
}

/**
 * Update restaurant's Stripe customer and subscription IDs
 * @param {string} idRestaurante - Restaurant ID
 * @param {string} stripeCustomerId - Stripe Customer ID
 * @param {string} stripeSubscriptionId - Stripe Subscription ID (optional)
 * @returns {Promise<void>}
 */
export async function updateStripeData(
  idRestaurante,
  stripeCustomerId,
  stripeSubscriptionId = null
) {
  if (!idRestaurante || !stripeCustomerId) {
    throw new Error("Restaurant ID and Stripe Customer ID are required");
  }

  try {
    const restaurantRef = doc(db, "restaurantes", idRestaurante);
    const updateData = {
      stripeCustomerId,
      updatedAt: serverTimestamp(),
    };

    if (stripeSubscriptionId) {
      updateData.stripeSubscriptionId = stripeSubscriptionId;
    }

    await updateDoc(restaurantRef, updateData);
  } catch (error) {
    console.error("Error updating Stripe data:", error);
    throw error;
  }
}

/**
 * Get both Stripe Customer ID and Subscription ID
 * @param {string} idRestaurante - Restaurant ID
 * @returns {Promise<Object>} Object with customerId and subscriptionId
 */
export async function getStripeData(idRestaurante) {
  if (!idRestaurante) {
    return { customerId: null, subscriptionId: null };
  }

  try {
    const restaurant = await getRestaurant(idRestaurante);
    return {
      customerId: restaurant?.stripeCustomerId || null,
      subscriptionId: restaurant?.stripeSubscriptionId || null,
    };
  } catch (error) {
    console.error("Error getting Stripe data:", error);
    return { customerId: null, subscriptionId: null };
  }
}

/**
 * Clear Stripe data from restaurant (useful for downgrades/cancellations)
 * @param {string} idRestaurante - Restaurant ID
 * @returns {Promise<void>}
 */
export async function clearStripeData(idRestaurante) {
  if (!idRestaurante) {
    throw new Error("Restaurant ID is required");
  }

  try {
    const restaurantRef = doc(db, "restaurantes", idRestaurante);
    await updateDoc(restaurantRef, {
      stripeCustomerId: null,
      stripeSubscriptionId: null,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error("Error clearing Stripe data:", error);
    throw error;
  }
}

/**
 * Get free trial metadata from restaurant document
 * @param {string} idRestaurante - Restaurant ID
 * @returns {Promise<Object>} Trial metadata
 */
export async function getFreeTrialData(idRestaurante) {
  if (!idRestaurante) {
    return {
      startedAt: null,
      expiresAt: null,
      isExpired: false,
      hasStarted: false,
    };
  }

  try {
    const restaurant = await getRestaurant(idRestaurante);
    const trial = restaurant?.freeTrial || {};
    const startedAt = normalizeFirestoreDate(trial.startedAt);
    const expiresAt = normalizeFirestoreDate(trial.expiresAt);
    const now = new Date();
    const isExpired = Boolean(trial.isExpired) || (expiresAt ? now > expiresAt : false);

    return {
      startedAt,
      expiresAt,
      isExpired,
      hasStarted: Boolean(startedAt),
    };
  } catch (error) {
    console.error("Error getting free trial data:", error);
    return {
      startedAt: null,
      expiresAt: null,
      isExpired: false,
      hasStarted: false,
    };
  }
}

/**
 * Initialize free trial data if it doesn't exist yet
 * @param {string} idRestaurante - Restaurant ID
 * @returns {Promise<Object>} Initialized or existing trial metadata
 */
export async function initializeFreeTrialIfNeeded(idRestaurante) {
  if (!idRestaurante) {
    throw new Error("Restaurant ID is required");
  }

  const existing = await getFreeTrialData(idRestaurante);
  if (existing.hasStarted) {
    return existing;
  }

  try {
    const restaurantRef = doc(db, "restaurantes", idRestaurante);
    const expiresAt = addDays(new Date(), FREE_TRIAL_DAYS);

    await updateDoc(restaurantRef, {
      freeTrial: {
        startedAt: serverTimestamp(),
        expiresAt: Timestamp.fromDate(expiresAt),
        isExpired: false,
      },
      updatedAt: serverTimestamp(),
    });

    return {
      startedAt: new Date(),
      expiresAt,
      isExpired: false,
      hasStarted: true,
    };
  } catch (error) {
    console.error("Error initializing free trial:", error);
    throw error;
  }
}

/**
 * Mark free trial as expired in Firestore
 * @param {string} idRestaurante - Restaurant ID
 * @returns {Promise<void>}
 */
export async function markFreeTrialAsExpired(idRestaurante) {
  if (!idRestaurante) {
    throw new Error("Restaurant ID is required");
  }

  try {
    const restaurantRef = doc(db, "restaurantes", idRestaurante);
    await updateDoc(restaurantRef, {
      "freeTrial.isExpired": true,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error("Error marking free trial as expired:", error);
    throw error;
  }
}
