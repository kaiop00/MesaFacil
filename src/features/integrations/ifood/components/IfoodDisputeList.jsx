import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useIfoodDisputes } from "../hooks/useIfoodDisputes";
import IfoodDisputeCard from "./IfoodDisputeCard";
import LoadingSpinnerDynamic from "@/components/LoadingSpinnerDynamic";
import { TriangleWarning } from "react-coolicons";

/**
 * List of iFood Handshake disputes with tabs for PENDING / ALL
 * Designed to be embedded inside IfoodIntegrationPage or a standalone route.
 */
const IfoodDisputeList = () => {
    const { idRestaurante } = useAuth();
    const [tab, setTab] = useState("pending"); // "pending" | "all"

    const {
        disputes: pendingDisputes,
        loading: pendingLoading,
        error: pendingError,
    } = useIfoodDisputes(idRestaurante);

    const {
        disputes: allDisputes,
        loading: allLoading,
        error: allError,
    } = useIfoodDisputes(idRestaurante, { allStatuses: true });

    const disputes = tab === "pending" ? pendingDisputes : allDisputes;
    const loading = tab === "pending" ? pendingLoading : allLoading;
    const error = tab === "pending" ? pendingError : allError;

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <TriangleWarning size={20} className="text-yellow-600" />
                    <h2 className="text-xl font-semibold text-gray-900">Negociações iFood</h2>
                    {pendingDisputes.length > 0 && (
                        <span className="ml-1 min-w-5 h-5 px-1.5 bg-yellow-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
                            {pendingDisputes.length}
                        </span>
                    )}
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 border-b border-gray-200">
                <button
                    onClick={() => setTab("pending")}
                    className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                        tab === "pending"
                            ? "border-yellow-500 text-yellow-700"
                            : "border-transparent text-gray-500 hover:text-gray-700"
                    }`}
                >
                    Pendentes
                    {pendingDisputes.length > 0 && (
                        <span className="ml-1.5 inline-flex items-center justify-center min-w-4 h-4 px-1 bg-yellow-500 text-white text-[10px] rounded-full">
                            {pendingDisputes.length}
                        </span>
                    )}
                </button>
                <button
                    onClick={() => setTab("all")}
                    className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                        tab === "all"
                            ? "border-gray-500 text-gray-700"
                            : "border-transparent text-gray-500 hover:text-gray-700"
                    }`}
                >
                    Todas
                </button>
            </div>

            {/* Content */}
            {loading ? (
                <div className="flex justify-center py-8">
                    <LoadingSpinnerDynamic size={8} />
                </div>
            ) : error ? (
                <div className="text-center py-8 text-red-600 text-sm">
                    Erro ao carregar negociações: {error}
                </div>
            ) : disputes.length === 0 ? (
                <div className="text-center py-8 text-gray-500 text-sm">
                    {tab === "pending"
                        ? "Nenhuma negociação pendente"
                        : "Nenhuma negociação encontrada"}
                </div>
            ) : (
                <div className="space-y-3">
                    {disputes.map((dispute) => (
                        <IfoodDisputeCard
                            key={dispute.id}
                            dispute={dispute}
                            idRestaurante={idRestaurante}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};

export default IfoodDisputeList;
