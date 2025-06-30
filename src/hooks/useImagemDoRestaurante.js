import { useEffect, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/config/firebaseConfig";
import { useAuth } from "@/contexts/AuthContext";

export function useImagemDoRestaurante() {
    const { idRestaurante } = useAuth();
    const [ imagemRestaurante, setImagemRestaurante ] = useState(null);

    useEffect(() => {
        async function fetchImagem() {
            if (!idRestaurante) return;

            try {
                const restDoc = await getDoc(doc(db, "restaurantes", idRestaurante));
                if (restDoc.exists()) {
                    const data = restDoc.data();
                    setImagemRestaurante(data.imagem_restaurante || null);
                }
            } catch (error) {
                console.error("erro ao buscar imagem do restaurante", error);
            }
        }
        fetchImagem();
    }, [idRestaurante]);
    return imagemRestaurante;
}