import React from "react";

export default function CategoryTabs({
    categories = [],
    activeId,
    onChange,
    className = "",
}) {
    return (
        <div className={`bg-white ${className}`}>
            <div className="relative -mx-4 px-4">
                <div
                    className="flex gap-8 overflow-x-auto whitespace-nowrap no-scrollbar"
                    role="tablist"
                    aria-label="Categorias do cardápio"
                >
                    {categories.map((c) => {
                        const active = c.id === activeId;
                        return (
                            <button
                                key={c.id}
                                role="tab"
                                aria-selected={active}
                                onClick={() => onChange && onChange(c.id)}
                                className={`relative py-3 text-sm font-medium border-b-2 transition-colors
                  ${active ? "text-amber-600 border-amber-600"
                                        : "text-gray-500 border-transparent hover:text-gray-700"}`}
                            >
                                {c.nome}
                            </button>
                        );
                    })}
                </div>

                {/* fades laterais (opcional) */}
                <div className="pointer-events-none absolute left-0 top-0 h-full w-6 bg-gradient-to-r from-white to-transparent" />
                <div className="pointer-events-none absolute right-0 top-0 h-full w-6 bg-gradient-to-l from-white to-transparent" />
            </div>
        </div>
    );
}
