import { useState, useEffect } from "react";
import { getMesaById } from "../services/mesaService";
import { useCliente } from "../context/ClienteContext";

export const useMesa = () => {
    const { mesaId, idRestaurante } = useCliente();
    const [mesa, setMesa] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (!mesaId || !idRestaurante) return;

        const fetchMesa = async () => {
            try {
                const m = await getMesaById(idRestaurante, mesaId);
                if (!m) {
                    setError("Mesa não encontrada");
                }
                setMesa(m);
            } catch (err) {
                setError("Erro ao buscar a mesa");
            } finally {
                setLoading(false);
            }
        }
        fetchMesa();
    }, [mesaId, idRestaurante]);

      const listarItensCardapio = async () => {
        return await getAll(idRestaurante, 'cardapio', { orderByField: 'criadoEm', order: 'desc' });
      };

    return {
        mesa,
        loading,
        error,
    }
}