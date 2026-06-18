import { createContext, useContext, useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc, collection, query, where, getDocs, setDoc } from "firebase/firestore";
import { auth, db } from "@/config/firebaseConfig";
import stripeService, { STRIPE_TEMPORARILY_DISABLED } from "@/services/stripeService";
import { getStripeCustomerId, getRestaurant } from "@/services/firebase/restaurantService";

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
  const RESTAURANTE_ID_CACHE_KEY = "mesafacil:idRestaurante";
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
        console.log("[AuthContext] User logged in:", firebaseUser.uid, firebaseUser.email);

        try {
          const userDoc = await getDoc(doc(db, "users", firebaseUser.uid));
          const data = userDoc.exists() ? userDoc.data() : {};
          console.log("[AuthContext] User document data:", data);

          let resolvedRole = data.role || null;
          let restaurantId =
            data.idRestaurante ||
            data.idRestaurant ||
            data.restaurantId ||
            data.id_restaurante ||
            data?.restaurante?.id ||
            data?.restaurant?.id ||
            data.restauranteId ||
            null;

          // Cache local como fallback para contas legadas.
          if (!restaurantId) {
            const cachedRestaurantId = localStorage.getItem(RESTAURANTE_ID_CACHE_KEY);
            console.log("[AuthContext] Cached restaurant ID:", cachedRestaurantId);
            if (cachedRestaurantId) {
              restaurantId = cachedRestaurantId;
            }
          }

          // Se não há restaurant ID no usuário, tenta recuperar por múltiplas estratégias legadas.
          if (!restaurantId) {
            try {
              // Estratégia 1: em alguns ambientes, o id do restaurante é o próprio UID do usuário.
              const restaurantByUid = await getDoc(doc(db, "restaurantes", firebaseUser.uid));
              console.log("[AuthContext] Checking restaurantes/{uid}:", restaurantByUid.exists());
              if (restaurantByUid.exists()) {
                restaurantId = restaurantByUid.id;
                console.log("[AuthContext] Found restaurant by UID:", restaurantId);
              }

              const tryQueries = [];

              // Fluxos legados comuns por vínculo ao usuário
              tryQueries.push(
                query(collection(db, "restaurantes"), where("ownerUid", "==", firebaseUser.uid)),
                query(collection(db, "restaurantes"), where("uid", "==", firebaseUser.uid)),
                query(collection(db, "restaurantes"), where("userId", "==", firebaseUser.uid)),
                query(collection(db, "restaurantes"), where("createdBy", "==", firebaseUser.uid))
              );

              if (firebaseUser.email) {
                tryQueries.push(
                  query(collection(db, "restaurantes"), where("email", "==", firebaseUser.email)),
                  query(collection(db, "restaurantes"), where("ownerEmail", "==", firebaseUser.email))
                );
              }

              if (firebaseUser.displayName) {
                tryQueries.push(
                  query(collection(db, "restaurantes"), where("nome", "==", firebaseUser.displayName))
                );
              }

              for (const q of tryQueries) {
                if (restaurantId) break;
                const snapshot = await getDocs(q);
                if (!snapshot.empty) {
                  restaurantId = snapshot.docs[0].id;
                  console.log("[AuthContext] Found restaurant by query:", restaurantId);
                }
              }

              // Fallback adicional: algumas contas antigas foram recriadas no Auth,
              // mas mantiveram idRestaurante em outro documento de users com o mesmo e-mail.
              if (!restaurantId && firebaseUser.email) {
                const usersByEmail = await getDocs(
                  query(collection(db, "users"), where("email", "==", firebaseUser.email))
                );
                for (const userMatch of usersByEmail.docs) {
                  const legacyUser = userMatch.data() || {};
                  const legacyRestaurantId =
                    legacyUser.idRestaurante ||
                    legacyUser.idRestaurant ||
                    legacyUser.restaurantId ||
                    legacyUser.id_restaurante ||
                    legacyUser?.restaurante?.id ||
                    legacyUser?.restaurant?.id ||
                    legacyUser.restauranteId ||
                    null;
                  if (legacyRestaurantId) {
                    restaurantId = legacyRestaurantId;
                    console.log("[AuthContext] Found restaurant from legacy users:", restaurantId);
                    break;
                  }
                }
              }
            } catch (err) {
              console.warn("Could not recover legacy restaurant id:", err);
            }
          }

          // Normalização de role legado
          if (typeof resolvedRole === "string") {
            const normalized = resolvedRole.toLowerCase();
            if (normalized === "owner" || normalized === "proprietario" || normalized === "proprietário") {
              resolvedRole = "admin";
            }
          }

          // Conta antiga sem role explícita: assume admin para evitar bloqueio indevido.
          if (!resolvedRole) {
            resolvedRole = "admin";
          }

          // Persistir recuperação para estabilizar próximos logins.
          if (restaurantId && (!data.idRestaurante || !data.role)) {
            try {
              await setDoc(
                doc(db, "users", firebaseUser.uid),
                {
                  email: firebaseUser.email || data.email || null,
                  idRestaurante: restaurantId,
                  role: resolvedRole || "admin",
                  updatedAt: new Date(),
                },
                { merge: true }
              );
            } catch (err) {
              console.warn("Could not persist recovered user fields:", err);
            }
          }
          
          setRole(resolvedRole || "user");
          setIdRestaurante(restaurantId);

          if (restaurantId) {
            localStorage.setItem(RESTAURANTE_ID_CACHE_KEY, restaurantId);
            // Persistir também em users doc como fallback adicional
            try {
              await setDoc(
                doc(db, "users", firebaseUser.uid),
                {
                  idRestaurante: restaurantId,
                  lastSync: new Date(),
                },
                { merge: true }
              );
              console.log("[AuthContext] Persisted idRestaurante to users doc");
            } catch (err) {
              console.warn("[AuthContext] Could not persist idRestaurante:", err);
            }
          } else {
            console.error("[AuthContext] CRITICAL: Could not resolve idRestaurante for user", firebaseUser.uid);
          if (restaurantId) {
            try {
              customerId = await getStripeCustomerId(restaurantId);
              if (!customerId && data?.stripeCustomerId) {
                customerId = data.stripeCustomerId;
              }

              if (!customerId) {
                const restaurant = await getRestaurant(restaurantId);
                hasLegacySubscription = Boolean(restaurant?.stripeSubscriptionId);
              }

              setStripeCustomerId(customerId);
            } catch (error) {
              console.error("Error getting Stripe customer ID from restaurant:", error);
            }
          }

          // Fetch plan from Stripe API instead of Firestore
          if (customerId) {
            try {
              const planData = await stripeService.getCurrentPlan(customerId);
              setPlan(planData);
            } catch (error) {
              console.error("Error fetching plan from Stripe:", error);
              // Set free plan as fallback (or premium if Stripe is disabled)
              if (STRIPE_TEMPORARILY_DISABLED) {
                setPlan({ 
                  planId: 'monthly', 
                  status: 'active', 
                  expiresAt: new Date(Date.now() + (365 * 24 * 60 * 60 * 1000))
                });
              } else {
                setPlan({ planId: 'free', status: 'active', expiresAt: null });
              }
            }
          } else {
            // No Stripe customer - grant premium access if Stripe is disabled, otherwise free plan
            if (STRIPE_TEMPORARILY_DISABLED) {
              setPlan({ 
                planId: 'monthly', 
                status: 'active', 
                expiresAt: new Date(Date.now() + (365 * 24 * 60 * 60 * 1000))
              });
            } else if (hasLegacySubscription) {
              // Compatibilidade com contas antigas que possuem subscriptionId salvo,
              // mas ainda sem customerId em restaurante.
              setPlan({
                planId: 'monthly',
                status: 'active',
                expiresAt: null,
              });
            } else {
              setPlan({ planId: 'free', status: 'active', expiresAt: null });
            }
          }
        } catch (error) {
          console.error("Error loading user data:", error);
          setRole("user");
          setIdRestaurante(null);
          // Grant premium access if Stripe is disabled, otherwise free plan
          if (STRIPE_TEMPORARILY_DISABLED) {
            setPlan({ 
              planId: 'monthly', 
              status: 'active', 
              expiresAt: new Date(Date.now() + (365 * 24 * 60 * 60 * 1000))
            });
          } else {
            setPlan({ planId: 'free', status: 'active', expiresAt: null });
          }
        }
        } else {
          setUser(null);
          setRole(null);
          setIdRestaurante(null);
          setPlan(null);
          setStripeCustomerId(null);
          localStorage.removeItem(RESTAURANTE_ID_CACHE_KEY);
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
