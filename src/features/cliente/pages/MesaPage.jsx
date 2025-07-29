import { useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { db } from "@/config/firebaseConfig";
import { doc, getDoc } from "firebase/firestore";
import { useSearchParams } from "react-router-dom";

export default function MesaPage() {
    const { slug } = useParams();
    const [searchParams] = useSearchParams();
    const idRestaurante = searchParams.get("restaurante");

    const [numeroStr, mesaId] = slug?.split("-") || [];
    const [mesa, setMesa] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const carregarMesa = async () => {
            if (!mesaId || !idRestaurante) return;
            const ref = doc(db, `restaurantes/${idRestaurante}/mesas/${mesaId}`);
            const snap = await getDoc(ref);
            if (snap.exists()) {
                setMesa({ id: mesaId, ...snap.data() });
            }
            setLoading(false);
        };

        carregarMesa();
    }, [mesaId, idRestaurante]);

    if (loading) return <p>Carregando...</p>;
    if (!mesa) return <p>Mesa não encontrada</p>;

    return (
        <div className="p-4">
            <h1 className="text-2xl font-semibold">Mesa {mesa.numero}</h1>
            {/* renderiza o restante da tela */}
        </div>
    );
}