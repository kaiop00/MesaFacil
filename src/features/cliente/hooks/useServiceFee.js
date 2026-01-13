import { useEffect, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "@/config/firebaseConfig";
import {
    DEFAULT_SERVICE_FEE_PERCENT,
    normalizeServicePercentage,
} from "../utils/pedidos";

export function useServiceFee(idRestaurante, { enabled = true, orderOrigin = null } = {}) {
    const [percent, setPercent] = useState(DEFAULT_SERVICE_FEE_PERCENT);
    const [loading, setLoading] = useState(Boolean(enabled && idRestaurante));
    const [error, setError] = useState(null);
    const [isExempt, setIsExempt] = useState(false);

    useEffect(() => {
        // WhatsApp e iFood são isentos de taxa de serviço
        const shouldExempt = orderOrigin === 'whatsapp' || orderOrigin === 'ifood';
        setIsExempt(shouldExempt);
        
        if (shouldExempt) {
            setPercent(0);
            setLoading(false);
            setError(null);
            return;
        }

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
    }, [idRestaurante, enabled, orderOrigin]);

    return {
        percent,
        loading,
        error,
        isExempt,
    };
}
