import { createContext, useContext, useMemo } from "react";
import { useParams, useSearchParams } from "react-router-dom";

const ClienteContext = createContext();

export function ClienteProvider({ children }) {
    const { slug } = useParams();
    const [searchParams] = useSearchParams();
    const idRestaurante = searchParams.get("restaurante");

    const [numeroStr, mesaId] = slug?.split("-") || [];

    const value = useMemo(() => ({
        mesaId,
        numero: numeroStr,
        idRestaurante,
    }), [slug, idRestaurante]);

    return (
        <ClienteContext.Provider value={value}>
            {children}
        </ClienteContext.Provider>
    );
}

export function useCliente() {
    const context = useContext(ClienteContext);
    if (!context) throw new Error("useCliente deve ser usado dentro do ClienteProvider");
    return context;
}
