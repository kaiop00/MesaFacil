import { useEffect, useMemo, useState } from "react";
import { collection, onSnapshot, orderBy, query } from "firebase/firestore";
import { db } from "@/config/firebaseConfig";
import { useCliente } from "../context/ClienteContext";
import { computeSubtotal, computeTotalPedidos } from "../utils/pedidos";

export function usePedidosCliente() {
    const { mesaId, idRestaurante } = useCliente();
    const [pedidos, setPedidos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (!mesaId || !idRestaurante) {
            setPedidos([]);
            setLoading(false);
            return;
        }

        setLoading(true);
        setError(null);

        const pedidosRef = collection(
            db,
            "restaurantes",
            idRestaurante,
            "mesas",
            mesaId,
            "pedidos"
        );

        const pedidosQuery = query(pedidosRef, orderBy("criadoEm", "asc"));

        const unsubscribe = onSnapshot(
            pedidosQuery,
            (snapshot) => {
                const todosPedidos = snapshot.docs.map((doc) => {
                    const data = doc.data();
                    const items = Array.isArray(data.items) ? data.items : [];
                    const total = typeof data.total === "number" ? data.total : computeSubtotal(items);

                    return {
                        id: doc.id,
                        ...data,
                        items,
                        total,
                    };
                });

                setPedidos(todosPedidos);
                setLoading(false);
            },
            (err) => {
                console.error("Erro ao carregar pedidos da mesa", err);
                setError("Não foi possível carregar os pedidos no momento.");
                setPedidos([]);
                setLoading(false);
            }
        );

        return () => unsubscribe();
    }, [mesaId, idRestaurante]);

    const totalPedidos = useMemo(() => computeTotalPedidos(pedidos), [pedidos]);

    return {
        pedidos,
        loading,
        error,
        totalPedidos,
        mesaId,
        idRestaurante,
    };
}

