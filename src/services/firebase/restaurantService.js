import {
  getFirestore,
  doc,
  getDoc,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore";
import { app } from "@/config/firebaseConfig";

const db = getFirestore(app);

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
