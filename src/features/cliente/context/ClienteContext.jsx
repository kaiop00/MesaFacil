import { createContext, useContext, useMemo, useEffect, useRef } from "react";
import { useLocation, useParams, useSearchParams } from "react-router-dom";

const ClienteContext = createContext(null);

const STORAGE_KEY = "cliente:initial";
const STORAGE_TTL_MS = 6 * 60 * 60 * 1000; // 6h

function loadFromStorage() {
    try {
        const raw = sessionStorage.getItem(STORAGE_KEY);
        if (!raw) return null;
        const obj = JSON.parse(raw);
        if (obj?.expiresAt && Date.now() > obj.expiresAt) {
            sessionStorage.removeItem(STORAGE_KEY);
            return null;
        }
        return obj;
    } catch {
        return null;
    }
}

function saveToStorage(data) {
    try {
        const payload = {
            ...data,
            expiresAt: Date.now() + STORAGE_TTL_MS,
        };
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch { }
}

export function ClienteProvider({ children }) {
    const location = useLocation();
    const { slug } = useParams();
    const [searchParams] = useSearchParams();
    const idRestauranteFromUrl = searchParams.get("restaurante");
    const [numeroStrFromUrl, mesaIdFromUrl] = slug?.split("-") || [];
    const bootedRef = useRef(false);
    const initialRef = useRef(null);
    const saved = loadFromStorage();

    const numero = numeroStrFromUrl ?? saved?.numero ?? undefined;
    const mesaId = mesaIdFromUrl ?? saved?.mesaId ?? undefined;
    const idRestaurante = idRestauranteFromUrl ?? saved?.idRestaurante ?? undefined;

    const initialSearch = (idRestauranteFromUrl ? location.search : saved?.search) || "";
    const initialHref = (slug && idRestauranteFromUrl)
        ? (location.pathname + location.search)
        : (saved?.href || "");

    useEffect(() => {
        if (bootedRef.current) return;
        bootedRef.current = true;

        const hasUrlParams = Boolean(slug && idRestauranteFromUrl && mesaIdFromUrl);
        if (hasUrlParams) {
            saveToStorage({
                numero: numeroStrFromUrl,
                mesaId: mesaIdFromUrl,
                idRestaurante: idRestauranteFromUrl,
                href: location.pathname + location.search,
                search: location.search,
            });
            initialRef.current = {
                numero: numeroStrFromUrl,
                mesaId: mesaIdFromUrl,
                idRestaurante: idRestauranteFromUrl,
                href: location.pathname + location.search,
                search: location.search,
            };
        } else if (saved) {
            initialRef.current = saved;
        }
    }, []);

    useEffect(() => {
        const hasUrlParams = Boolean(slug && idRestauranteFromUrl && mesaIdFromUrl);
        if (!hasUrlParams) return;

        const changed =
            saved?.mesaId !== mesaIdFromUrl ||
            saved?.idRestaurante !== idRestauranteFromUrl ||
            saved?.numero !== numeroStrFromUrl ||
            saved?.href !== (location.pathname + location.search);

        if (changed) {
            saveToStorage({
                numero: numeroStrFromUrl,
                mesaId: mesaIdFromUrl,
                idRestaurante: idRestauranteFromUrl,
                href: location.pathname + location.search,
                search: location.search,
            });
            initialRef.current = {
                numero: numeroStrFromUrl,
                mesaId: mesaIdFromUrl,
                idRestaurante: idRestauranteFromUrl,
                href: location.pathname + location.search,
                search: location.search,
            };
        }
    }, [slug, idRestauranteFromUrl, mesaIdFromUrl, location.pathname, location.search]);

    const value = useMemo(() => ({
        mesaId,
        numero,
        idRestaurante,
        initialHref: initialHref || (initialRef.current?.href ?? ""),
        initialSearch: initialSearch || (initialRef.current?.search ?? ""),
        clearInitial: () => sessionStorage.removeItem(STORAGE_KEY),
    }), [mesaId, numero, idRestaurante, initialHref, initialSearch]);

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
