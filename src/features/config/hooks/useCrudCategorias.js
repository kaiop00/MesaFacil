import { useCallback, useEffect, useMemo, useState } from "react";
import {
    listenCategorias,
    addOrUpdateCategoria as svcAddOrUpdate,
    deleteCategoria as svcDelete,
} from "@/features/config/services/CategoriasService";

export default function useCrudCategorias({ idRestaurante, enabled = true }) {
    const [categorias, setCategorias] = useState([]);
    const [isListening, setIsListening] = useState(false);
    const [isSending, setIsSending] = useState(false);
    const [deletingIds, setDeletingIds] = useState(() => new Set());
    const [error, setError] = useState(null);

    useEffect(() => {
        if (!enabled || !idRestaurante) return;
        setIsListening(true);
        const unsub = listenCategorias(idRestaurante, (list) => {
            setCategorias(list);
            setIsListening(false);
        });
        return () => {
            setIsListening(false);
            unsub && unsub();
        };
    }, [enabled, idRestaurante]);

    const addCategoria = useCallback(
        async (nome) => {
            if (!idRestaurante) throw new Error("idRestaurante ausente");
            const trimmed = nome?.trim();
            if (!trimmed) return;
            setIsSending(true);
            setError(null);
            try {
                return await svcAddOrUpdate(idRestaurante, { nome: trimmed });
            } catch (e) {
                setError(e);
                throw e;
            } finally {
                setIsSending(false);
            }
        },
        [idRestaurante]
    );

    const updateCategoria = useCallback(
        async (id, patch) => {
            if (!idRestaurante) throw new Error("idRestaurante ausente");
            if (!id) throw new Error("id da categoria ausente");
            setIsSending(true);
            setError(null);
            try {
                return await svcAddOrUpdate(idRestaurante, { id, ...patch });
            } catch (e) {
                setError(e);
                throw e;
            } finally {
                setIsSending(false);
            }
        },
        [idRestaurante]
    );

    const deleteCategoria = useCallback(
        async (id) => {
            if (!idRestaurante) throw new Error("idRestaurante ausente");
            if (!id) throw new Error("id da categoria ausente");
            setError(null);
            // marca o id como “deletando”
            setDeletingIds((prev) => {
                const next = new Set(prev);
                next.add(id);
                return next;
            });
            try {
                return await svcDelete(idRestaurante, id);
            } catch (e) {
                setError(e);
                throw e;
            } finally {
                // desmarca o id
                setDeletingIds((prev) => {
                    const next = new Set(prev);
                    next.delete(id);
                    return next;
                });
            }
        },
        [idRestaurante]
    );

    const isDeleting = useCallback(
        (id) => deletingIds.has(id),
        [deletingIds]
    );

    const loading = useMemo(() => isListening || isSending, [isListening, isSending]);

    return {
        categorias,
        // loading geral útil em headers/disabled genéricos
        loading,
        // flags específicos:
        isListening,     // carrega a TABELA
        isSending,       // carrega o BOTÃO do form
        deletingIds,     // ids que estão deletando
        isDeleting,      // helper por id
        error,

        addCategoria,
        updateCategoria,
        deleteCategoria,
    };
}
