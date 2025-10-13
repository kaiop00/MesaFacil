import { useEffect, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "@/config/firebaseConfig";
import {
    DEFAULT_SERVICE_FEE_PERCENT,
    normalizeServicePercentage,
} from "../utils/pedidos";

export function useServiceFee(idRestaurante, { enabled = true } = {}) {
    const [percent, setPercent] = useState(DEFAULT_SERVICE_FEE_PERCENT);
    const [loading, setLoading] = useState(Boolean(enabled && idRestaurante));
    const [error, setError] = useState(null);

    useEffect(() => {
        if (!enabled || !idRestaurante) {
            setPercent(DEFAULT_SERVICE_FEE_PERCENT);
            setLoading(false);
            setError(null);
            return;
        }

        setLoading(true);
        setError(null);

        const ref = doc(db, "restaurantes", idRestaurante);
        const unsubscribe = onSnapshot(
            ref,
            (snapshot) => {
                if (!snapshot.exists()) {
                    setPercent(DEFAULT_SERVICE_FEE_PERCENT);
                    setLoading(false);
                    return;
                }

                const data = snapshot.data();
                const percentValue = normalizeServicePercentage(
                    data?.taxa_servico,
                    DEFAULT_SERVICE_FEE_PERCENT
                );
                setPercent(percentValue);
                setLoading(false);
            },
            (err) => {
                console.error("Erro ao carregar taxa de serviço do restaurante", err);
                setPercent(DEFAULT_SERVICE_FEE_PERCENT);
                setError("Não foi possível carregar a taxa de serviço.");
                setLoading(false);
            }
        );

        return () => unsubscribe();
    }, [idRestaurante, enabled]);

    return {
        percent,
        loading,
        error,
    };
}
