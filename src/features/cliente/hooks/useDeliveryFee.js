import { useEffect, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "@/config/firebaseConfig";
import {
    DEFAULT_DELIVERY_FEE,
    normalizeDeliveryFee,
} from "../utils/pedidos";

/**
 * Hook para obter a taxa de entrega do restaurante
 * A taxa de entrega só é aplicada a pedidos WhatsApp do tipo delivery
 * 
 * @param {string} idRestaurante - ID do restaurante
 * @param {Object} options - Opções de configuração
 * @param {boolean} options.enabled - Se o hook deve buscar dados
 * @param {string} options.orderOrigin - Origem do pedido (whatsapp, ifood, mesaconvencional)
 * @param {string} options.tipoEntrega - Tipo de entrega (delivery, retirada)
 * @param {string} options.bairro - Bairro selecionado no endereço de entrega
 * @returns {Object} { value, loading, error, isApplicable }
 */
export function useDeliveryFee(idRestaurante, { enabled = true, orderOrigin = null, tipoEntrega = null, bairro = '' } = {}) {
    const [value, setValue] = useState(DEFAULT_DELIVERY_FEE);
    const [loading, setLoading] = useState(Boolean(enabled && idRestaurante));
    const [error, setError] = useState(null);
    const [isApplicable, setIsApplicable] = useState(false);
    const [bairrosDisponiveis, setBairrosDisponiveis] = useState([]);

    useEffect(() => {
        // Taxa de entrega só se aplica a pedidos WhatsApp do tipo delivery
        const shouldApply = orderOrigin === 'whatsapp' && tipoEntrega === 'delivery';
        setIsApplicable(shouldApply);
        
        if (!shouldApply) {
            setValue(0);
            setBairrosDisponiveis([]);
            setLoading(false);
            setError(null);
            return;
        }

        if (!enabled || !idRestaurante) {
            setValue(DEFAULT_DELIVERY_FEE);
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
                    setValue(DEFAULT_DELIVERY_FEE);
                    setLoading(false);
                    return;
                }

                const data = snapshot.data();
                const taxasPorBairro = Array.isArray(data?.taxasPorBairro)
                    ? data.taxasPorBairro
                        .map((item) => {
                            const bairro = (item?.bairro || '').trim();
                            const valor = normalizeDeliveryFee(item?.valor);

                            if (!bairro) return null;

                            return { bairro, valor };
                        })
                        .filter(Boolean)
                    : [];

                setBairrosDisponiveis(taxasPorBairro.map((item) => item.bairro));

                const fixedDeliveryFee = normalizeDeliveryFee(data?.taxaEntrega);
                const normalizedBairro = (bairro || '').trim().toLowerCase();
                const hasNeighborhoodTable = taxasPorBairro.length > 0;
                const bairroMatch = taxasPorBairro.find(
                    (item) => item.bairro.trim().toLowerCase() === normalizedBairro
                );

                if (hasNeighborhoodTable) {
                    setValue(bairroMatch ? bairroMatch.valor : 0);
                } else {
                    setValue(fixedDeliveryFee);
                }
                setLoading(false);
            },
            (err) => {
                console.error("Erro ao carregar taxa de entrega do restaurante", err);
                setValue(DEFAULT_DELIVERY_FEE);
                setBairrosDisponiveis([]);
                setError("Não foi possível carregar a taxa de entrega.");
                setLoading(false);
            }
        );

        return () => unsubscribe();
    }, [idRestaurante, enabled, orderOrigin, tipoEntrega, bairro]);

    return {
        value,
        loading,
        error,
        isApplicable,
        bairrosDisponiveis,
    };
}
