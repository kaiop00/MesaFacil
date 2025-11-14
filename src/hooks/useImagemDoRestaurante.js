import { useEffect, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "@/config/firebaseConfig";
import { useAuth } from "@/contexts/AuthContext";

export function useImagemDoRestaurante() {
    const { idRestaurante } = useAuth();
    const [imagemRestaurante, setImagemRestaurante] = useState(null);

    useEffect(() => {
        if (!idRestaurante) {
            setImagemRestaurante(null);
            return;
        }

        const unsubscribe = onSnapshot(
            doc(db, "restaurantes", idRestaurante),
            (snapshot) => {
                if (!snapshot.exists()) {
                    setImagemRestaurante(null);
                    return;
                }
                const data = snapshot.data();
                setImagemRestaurante(data.imagem_restaurante || null);
            },
            (error) => {
                console.error("erro ao buscar imagem do restaurante", error);
            }
        );

        return () => unsubscribe();
    }, [idRestaurante]);

    return imagemRestaurante;
}
