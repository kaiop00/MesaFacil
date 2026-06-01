import { createContext, useContext, useState, useEffect, useMemo, useCallback } from "react";
import { getMesasPorStatus } from "@/features/config/services/mesaService"; // Adapte o caminho conforme necessário
import { useAuth } from "@/contexts/AuthContext";

const MesasContext = createContext();

export const MesasProvider = ({ children }) => {
    const { idRestaurante } = useAuth();
    const [mesas, setMesas] = useState([]);
    const [loading, setLoading] = useState(true);

    const carregarMesas = useCallback(async () => {
        try {
            const mesasData = await getMesasPorStatus(idRestaurante); // Buscando mesas do restaurante
            setMesas(mesasData);
        } catch (err) {
            console.error("Erro ao carregar mesas:", err);
        } finally {
            setLoading(false);
        }
    }, [idRestaurante]);
    
    useEffect(() => {
        carregarMesas();
    }, [carregarMesas]); // Recarregar se o idRestaurante ou função mudarem

    const value = useMemo(() => ({ mesas, loading, carregarMesas }), [mesas, loading, carregarMesas]);

    return (
        <MesasContext.Provider value={value}>
            {children}
        </MesasContext.Provider>
    );
};

export const useMesasContext = () => {
    const context = useContext(MesasContext);
    if (!context) {
        throw new Error("useMesasContext deve ser usado dentro de MesasProvider");
    }
    return context;
};
