import { useMemo, useState, useCallback } from "react";
import useCrudCategorias from "@/features/config/hooks/useCrudCategorias";

const ALL_ID = "all";

function slugify(s = "") {
    return String(s)
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)+/g, "");
}

export default function useCategoriasCliente({
    idRestaurante,
    includeAll = true,
    allLabel = "Todas",
    enabled = true,
} = {}) {
    const { categorias: rawCategorias, loading, error } = useCrudCategorias({
        idRestaurante,
        enabled: !!enabled && !!idRestaurante,
    });

    const categorias = useMemo(() => {
        const list = Array.isArray(rawCategorias) ? rawCategorias : [];
        return [...list]
            .filter((c) => c?.ativa !== false)
            .sort((a, b) => (a?.ordem ?? 999) - (b?.ordem ?? 999));
    }, [rawCategorias]);

    const tabs = useMemo(() => {
        const base = categorias.map((c) => ({ id: c.id, nome: c.nome }));
        return includeAll ? [{ id: ALL_ID, nome: allLabel }, ...base] : base;
    }, [categorias, includeAll, allLabel]);

    const [activeCategory, setActiveCategory] = useState(ALL_ID);

    // Mapa id -> { nomeLower, slug }
    const catMap = useMemo(() => {
        const m = new Map();
        categorias.forEach((c) => {
            const nomeLower = String(c?.nome || "").trim().toLowerCase();
            m.set(c.id, { nomeLower, slug: slugify(nomeLower) });
        });
        return m;
    }, [categorias]);

    const filterByCategory = useCallback(
        (items = []) => {
            if (!items.length) return [];
            if (activeCategory === ALL_ID) return items;

            const meta = catMap.get(activeCategory);
            const wantedName = meta?.nomeLower;
            const wantedSlug = meta?.slug;

            return items.filter((item) => {
                // 1) tenta por ID (se algum item tiver id salvo)
                const idSingle = item?.categoriaId ?? item?.categoria?.id ?? null;
                const idList =
                    (Array.isArray(item?.categoriaIds) && item.categoriaIds) ||
                    (Array.isArray(item?.categoryIds) && item.categoryIds) ||
                    [];

                if (String(idSingle) === String(activeCategory)) return true;
                if (idList.some((id) => String(id) === String(activeCategory))) return true;

                // 2) por NOME/SLUG (seu caso: item.categorias = ["Bebidas"])
                const nameCandidates = [];

                if (typeof item?.categoria === "string") nameCandidates.push(item.categoria);
                if (item?.categoriaNome) nameCandidates.push(item.categoriaNome);
                if (Array.isArray(item?.categorias)) nameCandidates.push(...item.categorias);
                if (Array.isArray(item?.categories)) nameCandidates.push(...item.categories);

                const namesLower = nameCandidates
                    .filter(Boolean)
                    .map((s) => String(s).trim().toLowerCase());

                if (wantedName && namesLower.includes(wantedName)) return true;

                if (wantedSlug) {
                    const slugs = namesLower.map(slugify);
                    if (slugs.includes(wantedSlug)) return true;
                }

                return false;
            });
        },
        [activeCategory, catMap]
    );

    return {
        loading,
        error,
        categorias,
        tabs,
        activeCategory,
        setActiveCategory,
        filterByCategory,
        ALL_ID,
    };
}
