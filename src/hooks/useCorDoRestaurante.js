import { useEffect, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/config/firebaseConfig";
import { useAuth } from "@/contexts/AuthContext";

export function useCorDoRestaurante() {
    const { idRestaurante } = useAuth();
    const [corBase, setCorBase] = useState(null);

    useEffect(() => {
        async function fetchCor() {
            if (!idRestaurante) return;

            try {
                const restDoc = await getDoc(doc(db, "restaurantes", idRestaurante));
                if (restDoc.exists()) {
                    const data = restDoc.data();
                    setCorBase(data.cor_base || null);
                }
            } catch (error) {
                console.error("Erro ao buscar cor do restaurante:", error);
            }
        }

        fetchCor();
    }, [idRestaurante]);

    return corBase;
}
