import React from "react";
import LoadingSpinner from "@/components/LoadingSpinner";
import { TrashFull } from "react-coolicons";
import { useTranslation } from "react-i18next";

export default function CategoriasTable({
    categorias = [],
    loading = false,      
    deletingIds,         
    onDelete,
}) {
    const { t } = useTranslation();

    return (
        <div className="overflow-x-auto rounded-lg border border-gray-200">
            <table className="min-w-full text-sm text-left">
                <thead className="bg-gray-100 text-gray-700 font-medium sticky top-0">
                    <tr>
                        <th className="px-4 py-2">{t("config:components.categoriasTable.headers.category")}</th>
                        <th className="px-4 py-2 text-center">{t("config:components.categoriasTable.headers.actions")}</th>
                    </tr>
                </thead>

                <tbody>
                    {loading && (
                        <tr>
                            <td colSpan={2} className="text-center py-4 text-gray-400">
                                {t("config:components.categoriasTable.loading")}
                            </td>
                        </tr>
                    )}

                    {!loading && categorias.length === 0 && (
                        <tr>
                            <td colSpan={2} className="text-center py-4 text-gray-500">
                                {t("config:components.categoriasTable.empty")}
                            </td>
                        </tr>
                    )}

                    {!loading &&
                        categorias.map((categoria, index) => {
                            const isDeleting = deletingIds?.has?.(categoria.id);
                            return (
                                <tr
                                    key={categoria.id || categoria.nome}
                                    className={`${index % 2 === 1 ? "bg-gray-50" : ""}`}
                                >
                                    <td className="px-4 py-2">{categoria.nome}</td>
                                    <td className="px-4 py-2">
                                        <div className="flex justify-center">
                                            <button
                                                type="button"
                                                onClick={() => onDelete?.(categoria)}
                                                disabled={isDeleting}
                                                className="text-red-600 hover:underline text-sm flex items-center gap-1 disabled:opacity-60"
                                                title={t("config:components.categoriasTable.deleteTitle")}
                                            >
                                                {isDeleting ? (
                                                    <LoadingSpinner />
                                                ) : (
                                                    <>
                                                        <TrashFull className="w-4 h-4" />
                                                        <span>{t("config:components.categoriasTable.deleteButton")}</span>
                                                    </>
                                                )}
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                </tbody>
            </table>
        </div>
    );
}
