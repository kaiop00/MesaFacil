import { createContext, useContext, useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "@/config/firebaseConfig";
import {
  getStripeCustomerId,
  getStripeSubscriptionId,
} from "@/services/firebase/restaurantService";

// ✅ Cria o contexto
const AuthContext = createContext({
  user: null,
  role: null,
  idRestaurante: null,
  plan: null,
  stripeCustomerId: null,
  loading: true,
});

// ✅ Provider que centraliza user, role, idRestaurante, plan e loading
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  const [idRestaurante, setIdRestaurante] = useState(null);
  const [plan, setPlan] = useState(null);
  const [stripeCustomerId, setStripeCustomerId] = useState(null);
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
          
          // Get Stripe Customer ID from restaurant document instead of user document
          let customerId = null;
          if (restaurantId) {
            try {
              customerId = await getStripeCustomerId(restaurantId);
              setStripeCustomerId(customerId);
            } catch (error) {
              console.error("Error getting Stripe customer ID from restaurant:", error);
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
    <AuthContext.Provider value={{ user, role, idRestaurante, plan, stripeCustomerId, loading }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

// ✅ Hook padrão para consumir o contexto
export const useAuth = () => useContext(AuthContext);
