import { useEffect, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "@/config/firebaseConfig";
import { normalizeCoverValue } from "../utils/pedidos";

const DEFAULT_COVER_STATE = {
    enabled: false,
    value: 0,
};

export function useCoverCharge(idRestaurante, { enabled = true } = {}) {
    const [cover, setCover] = useState(DEFAULT_COVER_STATE);
    const [loading, setLoading] = useState(Boolean(enabled && idRestaurante));
    const [error, setError] = useState(null);

    useEffect(() => {
        if (!enabled || !idRestaurante) {
            setCover(DEFAULT_COVER_STATE);
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
                    setCover(DEFAULT_COVER_STATE);
                    setLoading(false);
                    return;
                }

                const data = snapshot.data() || {};
                const raw = data?.couvert_artistico || {};
                const isEnabled = Boolean(raw?.ativo);
                const value = normalizeCoverValue(raw?.valor);

                setCover({
                    enabled: isEnabled && value > 0,
                    value,
                });
                setLoading(false);
            },
            (err) => {
                console.error("Erro ao carregar couvert artístico do restaurante", err);
                setCover(DEFAULT_COVER_STATE);
                setError("Não foi possível carregar o couvert artístico.");
                setLoading(false);
            }
        );

        return () => unsubscribe();
    }, [idRestaurante, enabled]);

    return {
        enabled: cover.enabled,
        value: cover.value,
        loading,
        error,
    };
}
