import React from "react";
import LoadingSpinner from "@/components/LoadingSpinner";
import { TrashFull } from "react-coolicons";

export default function CategoriasTable({
    categorias = [],
    loading = false,      
    deletingIds,         
    onDelete,
}) {
    return (
        <div className="overflow-x-auto rounded-lg border border-gray-200">
            <table className="min-w-full text-sm text-left">
                <thead className="bg-gray-100 text-gray-700 font-medium sticky top-0">
                    <tr>
                        <th className="px-4 py-2">Categoria</th>
                        <th className="px-4 py-2 text-center">Ações</th>
                    </tr>
                </thead>

                <tbody>
                    {loading && (
                        <tr>
                            <td colSpan={2} className="text-center py-4 text-gray-400">
                                Carregando categorias...
                            </td>
                        </tr>
                    )}

                    {!loading && categorias.length === 0 && (
                        <tr>
                            <td colSpan={2} className="text-center py-4 text-gray-500">
                                Nenhuma categoria cadastrada.
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
                                                title="Excluir categoria"
                                            >
                                                {isDeleting ? (
                                                    <LoadingSpinner />
                                                ) : (
                                                    <>
                                                        <TrashFull className="w-4 h-4" />
                                                        <span>Excluir</span>
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
