import { createContext, useContext, useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "@/config/firebaseConfig";

// ✅ Cria o contexto
const AuthContext = createContext();

// ✅ Provider que centraliza user, role, idRestaurante e loading
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  const [idRestaurante, setIdRestaurante] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);

        const userDoc = await getDoc(doc(db, "users", firebaseUser.uid));
        const data = userDoc.exists() ? userDoc.data() : {};

        setRole(data.role || "user");
        setIdRestaurante(data.idRestaurante || null);
      } else {
        setUser(null);
        setRole(null);
        setIdRestaurante(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ user, role, idRestaurante, loading }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

// ✅ Hook padrão para consumir o contexto
export const useAuth = () => useContext(AuthContext);
