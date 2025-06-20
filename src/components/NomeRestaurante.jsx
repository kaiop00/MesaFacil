import { useEffect, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from '@/config/firebaseConfig';
import { useAuth } from "@/contexts/AuthContext";

export default function NomeRestaurante() {
    const { idRestaurante } = useAuth();
    const [nome, setNome] = useState("");

    useEffect(() => {
        if (idRestaurante) {
            const docRef = doc(db, "restaurantes", idRestaurante);
            getDoc(docRef).then((snap) => {
                if (snap.exists()) setNome(snap.data().nome);
            });
        }
    }, [idRestaurante]);

    return <span>{nome}</span>;
}