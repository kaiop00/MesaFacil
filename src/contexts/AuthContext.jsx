import { createContext, useContext, useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "@/config/firebaseConfig";
import stripeService from "@/services/stripeService";

// ✅ Cria o contexto
const AuthContext = createContext();

// ✅ Provider que centraliza user, role, idRestaurante, plan e loading
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  const [idRestaurante, setIdRestaurante] = useState(null);
  const [plan, setPlan] = useState(null);
  const [stripeCustomerId, setStripeCustomerId] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);

        try {
          const userDoc = await getDoc(doc(db, "users", firebaseUser.uid));
          const data = userDoc.exists() ? userDoc.data() : {};

          setRole(data.role || "user");
          setIdRestaurante(data.idRestaurante || null);
          
          // Get Stripe Customer ID from Firestore
          const customerId = data.stripeCustomerId || null;
          setStripeCustomerId(customerId);

          // Fetch plan from Stripe API instead of Firestore
          if (customerId) {
            try {
              const planData = await stripeService.getCurrentPlan(customerId);
              setPlan(planData);
            } catch (error) {
              console.error("Error fetching plan from Stripe:", error);
              // Set free plan as fallback
              setPlan({ planId: 'free', status: 'active', expiresAt: null });
            }
          } else {
            // No Stripe customer, set free plan
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

    return () => unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ user, role, idRestaurante, plan, stripeCustomerId, loading }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

// ✅ Hook padrão para consumir o contexto
export const useAuth = () => useContext(AuthContext);
