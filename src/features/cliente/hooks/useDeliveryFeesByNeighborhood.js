import { useEffect, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "@/config/firebaseConfig";

/**
 * Hook para obter as taxas de entrega por bairro
 * Busca a configuração do WhatsApp e retorna o array de bairros
 * 
 * @param {string} idRestaurante - ID do restaurante
 * @param {Object} options - Opções de configuração
 * @param {boolean} options.enabled - Se o hook deve buscar dados
 * @returns {Object} { bairros, loading, error, selectedBairro, setSelectedBairro }
 */
export function useDeliveryFeesByNeighborhood(idRestaurante, { enabled = true } = {}) {
    const [bairros, setBairros] = useState([]);
    const [loading, setLoading] = useState(Boolean(enabled && idRestaurante));
    const [error, setError] = useState(null);
    const [selectedBairro, setSelectedBairro] = useState(null);

    useEffect(() => {
        if (!enabled || !idRestaurante) {
            setBairros([]);
            setLoading(false);
            setError(null);
            return;
        }

        setLoading(true);
        setError(null);

        // Busca na configuração do WhatsApp
        const ref = doc(db, "restaurantes", idRestaurante, "config", "whatsapp");
        const unsubscribe = onSnapshot(
            ref,
            (snapshot) => {
                if (!snapshot.exists()) {
                    setBairros([]);
                    setLoading(false);
                    return;
                }

                const data = snapshot.data();
                const bairrosArray = Array.isArray(data?.bairros) ? data.bairros : [];
                setBairros(bairrosArray);
                
                // Define o primeiro bairro como selecionado, se houver
                if (bairrosArray.length > 0 && !selectedBairro) {
                    setSelectedBairro(bairrosArray[0]);
                }
                
                setLoading(false);
            },
            (err) => {
                console.error("Erro ao carregar bairros do restaurante", err);
                setBairros([]);
                setError("Não foi possível carregar os bairros.");
                setLoading(false);
            }
        );

        return () => unsubscribe();
    }, [idRestaurante, enabled]);

    return {
        bairros,
        loading,
        error,
        selectedBairro,
        setSelectedBairro,
    };
}
