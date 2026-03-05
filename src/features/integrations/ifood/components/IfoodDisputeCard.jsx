import { useState, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useToast } from "@/hooks/useToast";
import {
    acceptIfoodDispute,
    rejectIfoodDispute,
    selectIfoodDisputeAlternative,
} from "../services/ifoodActionsService";
import { useIfoodRetry } from "../hooks/useIfoodRetry";
import { TriangleWarning, CheckboxCheck, CloseSm, ArrowReload02 } from "react-coolicons";
import LoadingSpinnerDynamic from "@/components/LoadingSpinnerDynamic";

/**
 * Countdown timer hook — returns remaining seconds until expiration
 */
function useCountdown(expiresAt) {
    const expiresMs = useMemo(() => {
        if (!expiresAt) return null;
        if (expiresAt?.toDate) return expiresAt.toDate().getTime();
        if (expiresAt?.seconds) return expiresAt.seconds * 1000;
        return new Date(expiresAt).getTime();
    }, [expiresAt]);

    const [remaining, setRemaining] = useState(() => {
        if (!expiresMs) return null;
        return Math.max(0, Math.floor((expiresMs - Date.now()) / 1000));
    });

    useEffect(() => {
        if (!expiresMs) return;
        const tick = () => {
            const r = Math.max(0, Math.floor((expiresMs - Date.now()) / 1000));
            setRemaining(r);
        };
        tick();
        const interval = setInterval(tick, 1000);
        return () => clearInterval(interval);
    }, [expiresMs]);

    return remaining;
}

function formatCountdown(seconds) {
    if (seconds == null) return "--:--";
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
}

/**
 * Maps dispute type codes to human-readable Portuguese labels
 */
const DISPUTE_TYPE_LABELS = {
    CANCELLATION: "Cancelamento",
    PARTIAL_REFUND: "Reembolso Parcial",
    FULL_REFUND: "Reembolso Total",
};

const STATUS_LABELS = {
    PENDING: "Aguardando resposta",
    ACCEPTED: "Aceita",
    REJECTED: "Rejeitada",
    ALTERNATIVE_SELECTED: "Alternativa selecionada",
    SETTLED: "Resolvida",
    EXPIRED: "Expirada",
};

const STATUS_COLORS = {
    PENDING: "bg-yellow-100 text-yellow-800 border-yellow-300",
    ACCEPTED: "bg-green-100 text-green-800 border-green-300",
    REJECTED: "bg-red-100 text-red-800 border-red-300",
    ALTERNATIVE_SELECTED: "bg-blue-100 text-blue-800 border-blue-300",
    SETTLED: "bg-gray-100 text-gray-800 border-gray-300",
    EXPIRED: "bg-gray-100 text-gray-500 border-gray-300",
};

/**
 * Dispute card — shows dispute details with countdown, evidence, and action buttons
 * @param {Object} props
 * @param {Object} props.dispute - Dispute document from Firestore
 * @param {string} props.idRestaurante - Restaurant ID
 * @param {Function} [props.onResolved] - Callback when dispute is resolved
 */
const IfoodDisputeCard = ({ dispute, idRestaurante, onResolved }) => {
    const { t } = useTranslation();
    const { notify } = useToast();
    const remaining = useCountdown(dispute.expiresAt);
    const isExpired = remaining !== null && remaining <= 0;
    const isPending = dispute.status === "PENDING";
    const canAct = isPending && !isExpired;

    const [showRejectForm, setShowRejectForm] = useState(false);
    const [rejectionReason, setRejectionReason] = useState("");
    const [selectedAlternative, setSelectedAlternative] = useState(null);

    const acceptRetry = useIfoodRetry();
    const rejectRetry = useIfoodRetry();
    const alternativeRetry = useIfoodRetry();

    const loading = acceptRetry.isExecuting || rejectRetry.isExecuting || alternativeRetry.isExecuting;

    // ─── Actions ──────────────────────────────────────────────
    const handleAccept = async () => {
        if (!confirm("Tem certeza que deseja ACEITAR esta disputa? O pedido será cancelado/reembolsado.")) return;
        try {
            await acceptRetry.executeWithRetry(
                () => acceptIfoodDispute(idRestaurante, dispute.disputeId, dispute.orderId),
                {
                    actionName: "aceitar disputa",
                    onSuccess: () => {
                        notify("Disputa aceita com sucesso", "success");
                        onResolved?.();
                    },
                    onRetry: ({ attempt, maxAttempts, nextAttemptIn }) => {
                        notify(`Tentativa ${attempt}/${maxAttempts}. Reenviando em ${nextAttemptIn}s...`, "warning");
                    },
                    onError: (error) => {
                        notify(error.message || "Erro ao aceitar disputa", "error");
                    },
                }
            );
        } catch (error) {
            console.error("Error accepting dispute:", error);
        }
    };

    const handleReject = async () => {
        try {
            await rejectRetry.executeWithRetry(
                () => rejectIfoodDispute(idRestaurante, dispute.disputeId, dispute.orderId, rejectionReason || undefined),
                {
                    actionName: "rejeitar disputa",
                    onSuccess: () => {
                        notify("Disputa rejeitada. O iFood irá mediar a decisão final.", "success");
                        setShowRejectForm(false);
                        setRejectionReason("");
                        onResolved?.();
                    },
                    onRetry: ({ attempt, maxAttempts, nextAttemptIn }) => {
                        notify(`Tentativa ${attempt}/${maxAttempts}. Reenviando em ${nextAttemptIn}s...`, "warning");
                    },
                    onError: (error) => {
                        notify(error.message || "Erro ao rejeitar disputa", "error");
                    },
                }
            );
        } catch (error) {
            console.error("Error rejecting dispute:", error);
        }
    };

    const handleSelectAlternative = async (altId) => {
        if (!confirm("Confirmar a seleção desta alternativa?")) return;
        try {
            await alternativeRetry.executeWithRetry(
                () => selectIfoodDisputeAlternative(idRestaurante, dispute.disputeId, altId, dispute.orderId),
                {
                    actionName: "selecionar alternativa",
                    onSuccess: () => {
                        notify("Alternativa selecionada com sucesso", "success");
                        setSelectedAlternative(null);
                        onResolved?.();
                    },
                    onRetry: ({ attempt, maxAttempts, nextAttemptIn }) => {
                        notify(`Tentativa ${attempt}/${maxAttempts}. Reenviando em ${nextAttemptIn}s...`, "warning");
                    },
                    onError: (error) => {
                        notify(error.message || "Erro ao selecionar alternativa", "error");
                    },
                }
            );
        } catch (error) {
            console.error("Error selecting alternative:", error);
        }
    };

    // ─── Derived data ─────────────────────────────────────────
    const reason = dispute.reason;
    const alternatives = dispute.alternatives || [];
    const statusLabel = STATUS_LABELS[dispute.status] || dispute.status;
    const statusColor = STATUS_COLORS[dispute.status] || STATUS_COLORS.PENDING;
    const typeLabel = DISPUTE_TYPE_LABELS[dispute.type] || dispute.type || "Disputa";

    const createdAtLabel = (() => {
        try {
            const d = dispute.createdAt?.toDate ? dispute.createdAt.toDate() : new Date(dispute.createdAt);
            return d.toLocaleString("pt-BR");
        } catch {
            return "-";
        }
    })();

    return (
        <div className={`border rounded-lg overflow-hidden ${isPending ? "border-yellow-400 shadow-md" : "border-gray-200"}`}>
            {/* Header bar */}
            <div className={`flex items-center justify-between px-4 py-2 ${isPending ? "bg-yellow-50" : "bg-gray-50"}`}>
                <div className="flex items-center gap-2">
                    <TriangleWarning size={18} className={isPending ? "text-yellow-600" : "text-gray-400"} />
                    <span className="font-semibold text-sm text-gray-900">{typeLabel}</span>
                    {dispute.orderId && (
                        <span className="text-xs text-gray-500 font-mono">#{dispute.orderId?.slice(-8)}</span>
                    )}
                </div>
                <div className="flex items-center gap-3">
                    {/* Countdown */}
                    {isPending && remaining !== null && (
                        <span className={`text-sm font-mono font-bold ${isExpired ? "text-red-600" : remaining < 60 ? "text-orange-600" : "text-gray-700"}`}>
                            {isExpired ? "Expirado" : formatCountdown(remaining)}
                        </span>
                    )}
                    {/* Status badge */}
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${statusColor}`}>
                        {statusLabel}
                    </span>
                </div>
            </div>

            {/* Body */}
            <div className="p-4 space-y-3">
                {/* Reason */}
                {reason && (
                    <div>
                        <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Motivo</p>
                        <p className="text-sm text-gray-800">
                            {reason.description || reason.code || JSON.stringify(reason)}
                        </p>
                    </div>
                )}

                {/* Customer */}
                {dispute.customerName && (
                    <div className="text-sm text-gray-600">
                        <span className="text-gray-500">Cliente:</span> {dispute.customerName}
                    </div>
                )}

                {/* Created at */}
                <div className="text-xs text-gray-400">Recebido em: {createdAtLabel}</div>

                {/* Evidence images from metadata */}
                {dispute.metadata?.evidences && dispute.metadata.evidences.length > 0 && (
                    <div>
                        <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Evidências</p>
                        <div className="flex gap-2 flex-wrap">
                            {dispute.metadata.evidences.map((ev, i) => (
                                <a
                                    key={i}
                                    href={ev.url || ev}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="block w-20 h-20 rounded border overflow-hidden hover:opacity-80"
                                >
                                    <img src={ev.url || ev} alt={`Evidência ${i + 1}`} className="w-full h-full object-cover" />
                                </a>
                            ))}
                        </div>
                    </div>
                )}

                {/* Alternatives */}
                {canAct && alternatives.length > 0 && (
                    <div>
                        <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Alternativas disponíveis</p>
                        <div className="space-y-2">
                            {alternatives.map((alt) => (
                                <button
                                    key={alt.id}
                                    onClick={() => handleSelectAlternative(alt.id)}
                                    disabled={loading}
                                    className={`w-full text-left border rounded-lg p-3 hover:bg-blue-50 hover:border-blue-300 transition-colors disabled:opacity-50 ${
                                        selectedAlternative === alt.id ? "border-blue-400 bg-blue-50" : "border-gray-200"
                                    }`}
                                >
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-sm font-medium text-gray-800">{alt.description || alt.type}</p>
                                            {alt.amount && (
                                                <p className="text-xs text-gray-500">
                                                    Valor: {new Intl.NumberFormat("pt-BR", { style: "currency", currency: alt.amount.currency || "BRL" }).format(alt.amount.value)}
                                                </p>
                                            )}
                                        </div>
                                        <ArrowReload02 size={16} className="text-blue-500" />
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* Reject form */}
                {showRejectForm && canAct && (
                    <div className="border border-red-200 rounded-lg p-3 bg-red-50 space-y-2">
                        <p className="text-sm font-medium text-red-800">Motivo da rejeição (opcional)</p>
                        <textarea
                            value={rejectionReason}
                            onChange={(e) => setRejectionReason(e.target.value)}
                            placeholder="Explique por que você discorda desta solicitação..."
                            className="w-full border border-gray-300 rounded px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-red-300"
                            rows={3}
                            disabled={loading}
                        />
                        <div className="flex gap-2">
                            <button
                                onClick={handleReject}
                                disabled={loading}
                                className="flex items-center px-3 py-1.5 bg-red-600 text-white text-sm rounded hover:bg-red-700 disabled:opacity-50"
                            >
                                {rejectRetry.isExecuting ? (
                                    <LoadingSpinnerDynamic size={4} className="mr-2" />
                                ) : (
                                    <CloseSm size={16} className="mr-1" />
                                )}
                                Confirmar Rejeição
                            </button>
                            <button
                                onClick={() => { setShowRejectForm(false); setRejectionReason(""); }}
                                disabled={loading}
                                className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800"
                            >
                                Cancelar
                            </button>
                        </div>
                    </div>
                )}

                {/* Settlement info */}
                {dispute.status === "SETTLED" && dispute.settlement && (
                    <div className="border border-gray-200 rounded-lg p-3 bg-gray-50">
                        <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Resolução</p>
                        <p className="text-sm text-gray-800">
                            {dispute.settlement.type || dispute.settlement.description || JSON.stringify(dispute.settlement)}
                        </p>
                    </div>
                )}

                {/* Action buttons */}
                {canAct && !showRejectForm && (
                    <div className="flex gap-2 pt-2 border-t border-gray-100">
                        <button
                            onClick={handleAccept}
                            disabled={loading}
                            className="flex items-center px-4 py-2 bg-green-600 text-white text-sm rounded hover:bg-green-700 disabled:opacity-50"
                        >
                            {acceptRetry.isExecuting ? (
                                <LoadingSpinnerDynamic size={4} className="mr-2" />
                            ) : (
                                <CheckboxCheck size={16} className="mr-1" />
                            )}
                            Aceitar
                        </button>
                        <button
                            onClick={() => setShowRejectForm(true)}
                            disabled={loading}
                            className="flex items-center px-4 py-2 bg-red-600 text-white text-sm rounded hover:bg-red-700 disabled:opacity-50"
                        >
                            <CloseSm size={16} className="mr-1" />
                            Rejeitar
                        </button>
                    </div>
                )}

                {/* Expired notice */}
                {isPending && isExpired && (
                    <div className="p-2 bg-red-50 border border-red-200 rounded text-sm text-red-700 text-center">
                        Prazo expirado — aguardando decisão do iFood
                    </div>
                )}
            </div>
        </div>
    );
};

export default IfoodDisputeCard;
