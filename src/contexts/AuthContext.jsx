import { createContext, useContext, useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "@/config/firebaseConfig";
import { getStripeSubscriptionId } from "@/services/firebase/restaurantService";

// ✅ Cria o contexto
const AuthContext = createContext({
  user: null,
  role: null,
  idRestaurante: null,
  plan: null,
  stripeCustomerId: null,
  subscription: null,
  accessBlocked: false,
  loading: true,
});

const toMillis = (value) => {
  if (!value) return null;
  if (typeof value.toMillis === "function") return value.toMillis();
  if (typeof value.toDate === "function") return value.toDate().getTime();
  const parsed = new Date(value).getTime();
  return Number.isNaN(parsed) ? null : parsed;
};

const isSubscriptionBlocked = (value) => {
  if (!value) return false;
  if (value.accessBlocked === true) return true;
  if (["unpaid", "canceled", "incomplete_expired"].includes(value.status)) return true;
  if (value.status === "past_due") {
    const graceUntil = toMillis(value.graceUntil);
    return !graceUntil || graceUntil <= Date.now();
  }
  if (["active", "trialing"].includes(value.status) && value.cancelAtPeriodEnd) {
    const periodEnd = toMillis(value.currentPeriodEnd);
    return Boolean(periodEnd && periodEnd <= Date.now());
  }
  return false;
};

// ✅ Provider que centraliza user, role, idRestaurante, plan e loading
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  const [idRestaurante, setIdRestaurante] = useState(null);
  const [plan, setPlan] = useState(null);
  const [stripeCustomerId, setStripeCustomerId] = useState(null);
  const [subscription, setSubscription] = useState(null);
  const [accessBlocked, setAccessBlocked] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let didResolve = false;
    const fallbackTimer = window.setTimeout(() => {
      if (!didResolve) {
        console.warn("[AuthContext] Auth state timeout reached; releasing UI to avoid infinite spinner.");
        setLoading(false);
      }
    }, 3000);

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      didResolve = true;
      window.clearTimeout(fallbackTimer);

      if (firebaseUser) {
        setUser(firebaseUser);

        try {
          const userDoc = await getDoc(doc(db, "users", firebaseUser.uid));
          const data = userDoc.exists() ? userDoc.data() : {};

          setRole(data.role || "user");
          const restaurantId = data.idRestaurante || null;
          setIdRestaurante(restaurantId);

          let customerId = null;
          let restaurantSubscription = null;
          if (restaurantId) {
            try {
              const restaurantDoc = await getDoc(doc(db, "restaurantes", restaurantId));
              if (restaurantDoc.exists()) {
                const restaurantData = restaurantDoc.data() || {};
                customerId = restaurantData.stripeCustomerId || null;
                restaurantSubscription = restaurantData.subscription || null;
              }
              setStripeCustomerId(customerId);
              setSubscription(restaurantSubscription);
              setAccessBlocked(isSubscriptionBlocked(restaurantSubscription));
            } catch (error) {
              console.error("Error getting restaurant subscription data:", error);
              setSubscription(null);
              setAccessBlocked(false);
            }
          }

          const subscriptionId = restaurantId
            ? await getStripeSubscriptionId(restaurantId)
            : null;

          if (customerId || subscriptionId) {
            // Fetch actual plan details from Stripe
            try {
              const stripeService = await import('@/services/stripeService').then(m => m.default);
              const stripePlan = await stripeService.getCurrentPlan(customerId);
              if (stripePlan) {
                setPlan(stripePlan);
              } else {
                // Fallback to free if Stripe returns no plan
                setPlan({ planId: 'free', status: 'active', expiresAt: null });
              }
            } catch (stripeError) {
              console.warn('Could not load plan from Stripe, using free plan:', stripeError);
              setPlan({ planId: 'free', status: 'active', expiresAt: null });
            }
          } else {
            setPlan({ planId: 'free', status: 'active', expiresAt: null });
          }
        } catch (error) {
          console.error("Error loading user data:", error);
          setRole("user");
          setIdRestaurante(null);
          setPlan({ planId: 'free', status: 'active', expiresAt: null });
        }
      } else {
        setUser(null);
        setRole(null);
        setIdRestaurante(null);
        setPlan(null);
        setStripeCustomerId(null);
        setSubscription(null);
        setAccessBlocked(false);
      }
      setLoading(false);
    });

    return () => {
      didResolve = true;
      window.clearTimeout(fallbackTimer);
      unsubscribe();
    };
  }, []);

  return (
    <AuthContext.Provider value={{
      user,
      role,
      idRestaurante,
      plan,
      stripeCustomerId,
      subscription,
      accessBlocked,
      loading,
    }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

// ✅ Hook padrão para consumir o contexto
export const useAuth = () => useContext(AuthContext);
