import { useState, useEffect, useMemo, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useToast } from "@/hooks/useToast";
import {
    acceptIfoodDispute,
    rejectIfoodDispute,
    selectIfoodDisputeAlternative,
    getIfoodDisputeEvidence,
} from "../services/ifoodActionsService";
import { useIfoodRetry } from "../hooks/useIfoodRetry";
import { TriangleWarning, CheckboxCheck, CloseSm, ArrowReload02, TimerAdd } from "react-coolicons";
import LoadingSpinnerDynamic from "@/components/LoadingSpinnerDynamic";

// ─── Countdown hook ─────────────────────────────────────────
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
        const tick = () => setRemaining(Math.max(0, Math.floor((expiresMs - Date.now()) / 1000)));
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

// ─── Label maps ─────────────────────────────────────────────

const ACTION_LABELS = {
    CANCELLATION: "Cancelamento Total",
    PARTIAL_CANCELLATION: "Cancelamento Parcial",
    PROPOSED_AMOUNT_REFUND: "Proposta de Reembolso",
    PROPOSED_ADDITIONAL_TIME: "Proposta de Tempo Adicional",
    VOID: "Sem ação",
};

const HANDSHAKE_TYPE_LABELS = {
    AFTER_DELIVERY: "Após entrega",
    DELAY: "Atraso na entrega",
    PREPARATION_TIME: "Durante preparo",
    AFTER_DELIVERY_PARTIALLY: "Após entrega (parcial)",
};

const TIMEOUT_ACTION_LABELS = {
    ACCEPT_CANCELLATION: "Cancelamento será aceito automaticamente",
    REJECT_CANCELLATION: "Cancelamento será rejeitado automaticamente",
    VOID: "Nenhuma ação automática",
};

const HANDSHAKE_GROUP_LABELS = {
    CUSTOMER_ORDER_SUPPORT: "Reclamação do cliente sobre o pedido",
    DELAY: "Atraso na entrega",
    ITEM_UNAVAILABLE: "Item indisponível",
    PREPARATION_TIME: "Tempo de preparo",
    CONSUMER_CANCELLATION: "Cancelamento solicitado pelo cliente",
};

const ALTERNATIVE_TYPE_LABELS = {
    REFUND: "Propor Reembolso",
    BENEFIT: "Oferecer Benefício (cupom)",
    ADDITIONAL_TIME: "Negociar Tempo de Entrega",
};

const ALTERNATIVE_TYPE_DESCRIPTIONS = {
    REFUND: "Ofereça um reembolso parcial ao cliente para evitar o cancelamento do pedido.",
    BENEFIT: "Ofereça um cupom/benefício ao cliente para evitar o cancelamento.",
    ADDITIONAL_TIME: "Proponha um novo prazo de entrega ao cliente.",
};

const NEGOTIATION_REASON_LABELS = {
    HIGH_STORE_DEMAND: "Alta demanda na loja",
    STORE_SYSTEM_ISSUES: "Problemas de sistema na loja",
    STORE_INTERNAL_DIFFICULTIES: "Dificuldades internas da loja",
    LACK_OF_DRIVERS: "Falta de entregadores",
    OPERATIONAL_ISSUES: "Problemas operacionais",
    ORDER_OUT_FOR_DELIVERY: "Pedido saiu para entrega",
    DRIVER_IS_ALREADY_AT_THE_ADDRESS: "Entregador já está no endereço",
    OTHER_REASONS: "Outros motivos",
};

const STATUS_LABELS = {
    PENDING: "Aguardando resposta",
    ACCEPTED: "Aceita",
    REJECTED: "Rejeitada",
    ALTERNATIVE_SELECTED: "Contraproposta enviada",
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

// ─── Evidence Image Component ───────────────────────────────
function EvidenceImage({ evidenceUrl, idRestaurante, index }) {
    const [dataUri, setDataUri] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);
    const [expanded, setExpanded] = useState(false);

    useEffect(() => {
        let cancelled = false;
        setLoading(true);
        setError(false);
        getIfoodDisputeEvidence(idRestaurante, evidenceUrl)
            .then((result) => {
                if (!cancelled && result.dataUri) setDataUri(result.dataUri);
                else if (!cancelled) setError(true);
            })
            .catch(() => { if (!cancelled) setError(true); })
            .finally(() => { if (!cancelled) setLoading(false); });
        return () => { cancelled = true; };
    }, [evidenceUrl, idRestaurante]);

    if (loading) {
        return (
            <div className="w-24 h-24 rounded-lg border border-gray-200 bg-gray-50 flex items-center justify-center">
                <LoadingSpinnerDynamic size={5} />
            </div>
        );
    }

    if (error || !dataUri) {
        return (
            <div className="w-24 h-24 rounded-lg border border-gray-200 bg-gray-50 flex flex-col items-center justify-center text-gray-400">
                <span className="text-2xl">📷</span>
                <span className="text-[10px] mt-1">Erro ao carregar</span>
            </div>
        );
    }

    return (
        <>
            <button
                onClick={() => setExpanded(true)}
                className="w-24 h-24 rounded-lg border border-gray-200 overflow-hidden hover:opacity-90 transition-opacity cursor-pointer flex-shrink-0"
            >
                <img src={dataUri} alt={`Evidência ${index + 1}`} className="w-full h-full object-cover" />
            </button>
            {expanded && (
                <div
                    className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4 cursor-pointer"
                    onClick={() => setExpanded(false)}
                >
                    <img src={dataUri} alt={`Evidência ${index + 1}`} className="max-w-full max-h-full rounded-lg shadow-2xl" />
                </div>
            )}
        </>
    );
}

// ─── Confirm Action Modal ───────────────────────────────────
function DisputeConfirmModal({ isOpen, title, description, variant = "danger", children, onConfirm, onCancel, loading }) {
    if (!isOpen) return null;

    const variantStyles = {
        danger: { bg: "bg-red-600 hover:bg-red-700", icon: "text-red-600", border: "border-red-200" },
        success: { bg: "bg-green-600 hover:bg-green-700", icon: "text-green-600", border: "border-green-200" },
        info: { bg: "bg-blue-600 hover:bg-blue-700", icon: "text-blue-600", border: "border-blue-200" },
    };
    const styles = variantStyles[variant] || variantStyles.danger;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
            <div className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
                <div className={`p-4 border-b ${styles.border}`}>
                    <div className="flex items-center gap-2">
                        <TriangleWarning size={20} className={styles.icon} />
                        <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
                    </div>
                    {description && <p className="text-sm text-gray-600 mt-1">{description}</p>}
                </div>
                <div className="p-4 space-y-3">{children}</div>
                <div className="flex justify-end gap-2 p-4 border-t border-gray-100">
                    <button
                        onClick={onCancel}
                        disabled={loading}
                        className="px-4 py-2 text-sm text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-50"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={onConfirm}
                        disabled={loading}
                        className={`px-4 py-2 text-sm text-white rounded-lg disabled:opacity-50 flex items-center gap-2 ${styles.bg}`}
                    >
                        {loading && <LoadingSpinnerDynamic size={4} />}
                        Confirmar
                    </button>
                </div>
            </div>
        </div>
    );
}

// ─── Format iFood money (value in cents string) ─────────────
function formatIfoodMoney(value, currency = "BRL") {
    if (!value) return "-";
    return (Number(value) / 100).toLocaleString("pt-BR", { style: "currency", currency });
}

// ─── Main Component ─────────────────────────────────────────

const IfoodDisputeCard = ({ dispute, idRestaurante, onResolved }) => {
    const { t } = useTranslation();
    const { notify } = useToast();
    const remaining = useCountdown(dispute.expiresAt);
    const isExpired = remaining !== null && remaining <= 0;
    const isPending = dispute.status === "PENDING";
    const canAct = isPending && !isExpired;

    // ─── Confirmation modals state ──────────────────────────
    const [confirmAction, setConfirmAction] = useState(null); // "accept" | "reject" | null
    const [showAlternativeForm, setShowAlternativeForm] = useState(null);

    // Accept form state
    const [acceptReason, setAcceptReason] = useState("");
    const [acceptDetailReason, setAcceptDetailReason] = useState("");

    // Reject form state
    const [rejectionReason, setRejectionReason] = useState("");

    // Alternative form state
    const [refundAmount, setRefundAmount] = useState("");
    const [additionalTime, setAdditionalTime] = useState(null);
    const [additionalTimeReason, setAdditionalTimeReason] = useState("");

    const acceptRetry = useIfoodRetry();
    const rejectRetry = useIfoodRetry();
    const alternativeRetry = useIfoodRetry();
    const loading = acceptRetry.isExecuting || rejectRetry.isExecuting || alternativeRetry.isExecuting;

    // ─── Derived data ─────────────────────────────────────────
    const action = dispute.action || dispute.metadata?.action || dispute.type || "CANCELLATION";
    const message = dispute.message || dispute.metadata?.message;
    const handshakeType = dispute.handshakeType || dispute.metadata?.handshakeType;
    const timeoutAction = dispute.timeoutAction || dispute.metadata?.timeoutAction;
    const alternatives = dispute.alternatives || dispute.metadata?.alternatives || [];

    // Nested metadata: evidences, items, garnishItems, acceptCancellationReasons
    const nestedMeta = dispute.disputeMetadata || dispute.metadata?.metadata || {};
    const evidences = nestedMeta.evidences || [];
    const items = nestedMeta.items || [];
    const garnishItems = nestedMeta.garnishItems || [];
    const acceptCancellationReasons = nestedMeta.acceptCancellationReasons || [];

    const handshakeGroup = dispute.handshakeGroup || dispute.metadata?.handshakeGroup;
    const actionLabel = ACTION_LABELS[action] || action;
    const handshakeLabel = HANDSHAKE_TYPE_LABELS[handshakeType] || handshakeType;
    const handshakeGroupLabel = HANDSHAKE_GROUP_LABELS[handshakeGroup] || handshakeGroup;
    const timeoutLabel = TIMEOUT_ACTION_LABELS[timeoutAction] || timeoutAction;
    const statusLabel = STATUS_LABELS[dispute.status] || dispute.status;
    const statusColor = STATUS_COLORS[dispute.status] || STATUS_COLORS.PENDING;

    const createdAtLabel = (() => {
        try {
            const d = dispute.createdAt?.toDate ? dispute.createdAt.toDate() : new Date(dispute.createdAt);
            return d.toLocaleString("pt-BR");
        } catch {
            return "-";
        }
    })();

    // ─── Actions ──────────────────────────────────────────────
    const handleAccept = async () => {
        if (acceptCancellationReasons.length > 0 && !acceptReason) {
            notify("Selecione o motivo do aceite (obrigatório)", "error");
            return;
        }
        const options = {};
        if (acceptReason) options.reason = acceptReason;
        if (acceptDetailReason) options.detailReason = acceptDetailReason;

        try {
            await acceptRetry.executeWithRetry(
                () => acceptIfoodDispute(idRestaurante, dispute.disputeId, dispute.orderId, options),
                {
                    actionName: "aceitar disputa",
                    onSuccess: () => {
                        notify("Disputa aceita com sucesso", "success");
                        setConfirmAction(null);
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
        if (!rejectionReason.trim()) {
            notify("Informe o motivo da rejeição (obrigatório pelo iFood)", "error");
            return;
        }
        try {
            await rejectRetry.executeWithRetry(
                () => rejectIfoodDispute(idRestaurante, dispute.disputeId, dispute.orderId, rejectionReason),
                {
                    actionName: "rejeitar disputa",
                    onSuccess: () => {
                        notify("Disputa rejeitada. O iFood irá mediar a decisão final.", "success");
                        setConfirmAction(null);
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

    const handleSubmitAlternative = async (alt) => {
        let alternativeBody;
        const altMaxAmount = alt.maxAmount || alt.metadata?.maxAmount;

        if (alt.type === "REFUND" || alt.type === "BENEFIT") {
            const rawValue = refundAmount.replace(/[^0-9]/g, "");
            if (!rawValue || Number(rawValue) <= 0) {
                notify("Informe um valor válido para o reembolso", "error");
                return;
            }
            const maxValue = Number(altMaxAmount?.value || 0);
            if (maxValue > 0 && Number(rawValue) > maxValue) {
                notify(`Valor máximo permitido: ${formatIfoodMoney(maxValue)}`, "error");
                return;
            }
            alternativeBody = {
                type: alt.type,
                metadata: {
                    amount: {
                        value: String(rawValue),
                        currency: altMaxAmount?.currency || "BRL",
                    },
                },
            };
        } else if (alt.type === "ADDITIONAL_TIME") {
            if (!additionalTime) {
                notify("Selecione o tempo adicional", "error");
                return;
            }
            if (!additionalTimeReason) {
                notify("Selecione o motivo do atraso", "error");
                return;
            }
            alternativeBody = {
                type: "ADDITIONAL_TIME",
                metadata: {
                    additionalTimeInMinutes: Number(additionalTime),
                    additionalTimeReason,
                },
            };
        } else {
            alternativeBody = { type: alt.type, metadata: {} };
        }

        try {
            await alternativeRetry.executeWithRetry(
                () => selectIfoodDisputeAlternative(idRestaurante, dispute.disputeId, alt.id, dispute.orderId, alternativeBody),
                {
                    actionName: "enviar contraproposta",
                    onSuccess: () => {
                        notify("Contraproposta enviada com sucesso", "success");
                        setShowAlternativeForm(null);
                        setRefundAmount("");
                        setAdditionalTime(null);
                        setAdditionalTimeReason("");
                        onResolved?.();
                    },
                    onRetry: ({ attempt, maxAttempts, nextAttemptIn }) => {
                        notify(`Tentativa ${attempt}/${maxAttempts}. Reenviando em ${nextAttemptIn}s...`, "warning");
                    },
                    onError: (error) => {
                        notify(error.message || "Erro ao enviar contraproposta", "error");
                    },
                }
            );
        } catch (error) {
            console.error("Error submitting alternative:", error);
        }
    };

    return (
        <div className={`border rounded-xl overflow-hidden ${isPending ? "border-yellow-400 shadow-lg" : "border-gray-200"}`}>
            {/* ─── Header bar ─────────────────────────────── */}
            <div className={`flex items-center justify-between px-4 py-3 ${isPending ? "bg-yellow-50" : "bg-gray-50"}`}>
                <div className="flex items-center gap-2 min-w-0">
                    <TriangleWarning size={18} className={isPending ? "text-yellow-600" : "text-gray-400"} />
                    <span className="font-semibold text-sm text-gray-900 truncate">{actionLabel}</span>
                    {dispute.orderId && (
                        <span className="text-xs text-gray-500 font-mono flex-shrink-0">#{dispute.orderId?.slice(-8)}</span>
                    )}
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                    {isPending && remaining !== null && (
                        <div className={`flex items-center gap-1 text-sm font-mono font-bold ${isExpired ? "text-red-600" : remaining < 60 ? "text-orange-600" : "text-gray-700"}`}>
                            <TimerAdd size={14} />
                            {isExpired ? "Expirado" : formatCountdown(remaining)}
                        </div>
                    )}
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${statusColor}`}>
                        {statusLabel}
                    </span>
                </div>
            </div>

            {/* ─── Body ───────────────────────────────────── */}
            <div className="p-4 space-y-4">

                {/* Problem type / context */}
                {handshakeGroup && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                        <p className="text-xs text-red-600 font-medium uppercase tracking-wide mb-1">Tipo do problema</p>
                        <p className="text-sm font-medium text-red-900">{handshakeGroupLabel}</p>
                    </div>
                )}

                {/* Context badges */}
                <div className="flex flex-wrap gap-2">
                    {handshakeType && (
                        <span className="inline-flex items-center text-xs font-medium px-2 py-1 rounded-md bg-gray-100 text-gray-700">
                            {handshakeLabel}
                        </span>
                    )}
                    {timeoutAction && isPending && (
                        <span className="inline-flex items-center text-xs px-2 py-1 rounded-md bg-orange-50 text-orange-700 border border-orange-200">
                            Se expirar: {timeoutLabel}
                        </span>
                    )}
                </div>

                {/* Customer message */}
                {message && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                        <p className="text-xs text-blue-600 font-medium uppercase tracking-wide mb-1">Mensagem do cliente</p>
                        <p className="text-sm text-blue-900">{message}</p>
                    </div>
                )}

                {/* Evidence images */}
                {evidences.length > 0 && (
                    <div>
                        <p className="text-xs text-gray-500 font-medium uppercase tracking-wide mb-2">
                            Evidências do cliente ({evidences.length} {evidences.length === 1 ? "imagem" : "imagens"})
                        </p>
                        <div className="flex gap-2 flex-wrap">
                            {evidences.map((ev, i) => (
                                <EvidenceImage
                                    key={i}
                                    evidenceUrl={ev.url || ev}
                                    idRestaurante={idRestaurante}
                                    index={i}
                                />
                            ))}
                        </div>
                    </div>
                )}

                {/* Items being cancelled (PARTIAL_CANCELLATION) */}
                {items.length > 0 && (
                    <div>
                        <p className="text-xs text-gray-500 font-medium uppercase tracking-wide mb-2">
                            Itens contestados
                        </p>
                        <div className="border border-gray-200 rounded-lg divide-y divide-gray-100">
                            {items.map((item, i) => (
                                <div key={item.uniqueId || i} className="flex items-center justify-between px-3 py-2">
                                    <div className="min-w-0">
                                        <p className="text-sm text-gray-800 font-medium">
                                            {item.externalCode && <span className="text-gray-400 mr-1">#{item.externalCode}</span>}
                                            {item.quantity}x Item
                                        </p>
                                        {item.reason && (
                                            <p className="text-xs text-gray-500 mt-0.5 italic">&quot;{item.reason}&quot;</p>
                                        )}
                                    </div>
                                    {item.amount && (
                                        <span className="text-sm font-medium text-gray-700 flex-shrink-0 ml-2">
                                            {formatIfoodMoney(item.amount.value, item.amount.currency)}
                                        </span>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Garnish items being cancelled */}
                {garnishItems.length > 0 && (
                    <div>
                        <p className="text-xs text-gray-500 font-medium uppercase tracking-wide mb-2">
                            Complementos contestados
                        </p>
                        <div className="border border-gray-200 rounded-lg divide-y divide-gray-100">
                            {garnishItems.map((gi, i) => (
                                <div key={gi.id || i} className="flex items-center justify-between px-3 py-2">
                                    <div className="min-w-0">
                                        <p className="text-sm text-gray-800 font-medium">
                                            {gi.externalCode && <span className="text-gray-400 mr-1">#{gi.externalCode}</span>}
                                            {gi.quantity}x Complemento
                                        </p>
                                        {gi.reason && (
                                            <p className="text-xs text-gray-500 mt-0.5 italic">&quot;{gi.reason}&quot;</p>
                                        )}
                                    </div>
                                    {gi.amount && (
                                        <span className="text-sm font-medium text-gray-700 flex-shrink-0 ml-2">
                                            {formatIfoodMoney(gi.amount.value, gi.amount.currency)}
                                        </span>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Timestamp */}
                <div className="text-xs text-gray-400">Recebido em: {createdAtLabel}</div>

                {/* ─── Alternatives (Counter-proposals) ──── */}
                {canAct && alternatives.length > 0 && (
                    <div className="border border-blue-200 rounded-lg bg-blue-50/50 p-3 space-y-2">
                        <p className="text-xs text-blue-700 font-semibold uppercase tracking-wide">
                            Alternativas disponíveis (contrapropostas)
                        </p>
                        <p className="text-xs text-blue-600 mb-2">
                            Ao invés de aceitar ou rejeitar, você pode oferecer uma contraproposta ao cliente:
                        </p>
                        <div className="space-y-2">
                            {alternatives.map((alt) => (
                                <div key={alt.id} className="border rounded-lg overflow-hidden border-blue-200 bg-white">
                                    <button
                                        onClick={() => {
                                            setShowAlternativeForm(showAlternativeForm?.id === alt.id ? null : alt);
                                            setRefundAmount("");
                                            setAdditionalTime(null);
                                            setAdditionalTimeReason("");
                                        }}
                                        disabled={loading}
                                        className={`w-full text-left p-3 hover:bg-blue-50 transition-colors disabled:opacity-50 ${
                                            showAlternativeForm?.id === alt.id ? "bg-blue-50" : ""
                                        }`}
                                    >
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <p className="text-sm font-medium text-gray-800">
                                                    {ALTERNATIVE_TYPE_LABELS[alt.type] || alt.type}
                                                </p>
                                                <p className="text-xs text-gray-500 mt-0.5">
                                                    {ALTERNATIVE_TYPE_DESCRIPTIONS[alt.type]}
                                                </p>
                                                {(alt.maxAmount || alt.metadata?.maxAmount) && (
                                                    <p className="text-xs text-blue-600 font-medium mt-1">
                                                        Valor máximo: {formatIfoodMoney((alt.maxAmount || alt.metadata?.maxAmount).value, (alt.maxAmount || alt.metadata?.maxAmount).currency)}
                                                    </p>
                                                )}
                                            </div>
                                            <ArrowReload02 size={16} className="text-blue-500 flex-shrink-0 ml-2" />
                                        </div>
                                    </button>

                                    {/* REFUND / BENEFIT form */}
                                    {showAlternativeForm?.id === alt.id && (alt.type === "REFUND" || alt.type === "BENEFIT") && (() => {
                                        const formMaxAmount = alt.maxAmount || alt.metadata?.maxAmount;
                                        return (
                                        <div className="p-3 border-t border-blue-200 bg-blue-50 space-y-3">
                                            <label className="block text-sm font-medium text-gray-700">
                                                Valor do {alt.type === "REFUND" ? "reembolso" : "benefício"} (R$)
                                            </label>
                                            <input
                                                type="number"
                                                min="0.01"
                                                step="0.01"
                                                max={formMaxAmount ? Number(formMaxAmount.value) / 100 : undefined}
                                                value={refundAmount ? Number(refundAmount) / 100 : ""}
                                                onChange={(e) => {
                                                    const val = e.target.value;
                                                    setRefundAmount(val ? String(Math.round(Number(val) * 100)) : "");
                                                }}
                                                placeholder={formMaxAmount ? `Até ${(Number(formMaxAmount.value) / 100).toFixed(2)}` : "0,00"}
                                                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                                                disabled={loading}
                                            />
                                            <p className="text-xs text-gray-500">
                                                O cliente poderá aceitar ou recusar sua proposta de reembolso.
                                            </p>
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => handleSubmitAlternative(alt)}
                                                    disabled={loading}
                                                    className="flex items-center px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50"
                                                >
                                                    {alternativeRetry.isExecuting ? (
                                                        <LoadingSpinnerDynamic size={4} className="mr-2" />
                                                    ) : (
                                                        <ArrowReload02 size={16} className="mr-1" />
                                                    )}
                                                    Enviar proposta
                                                </button>
                                                <button
                                                    onClick={() => setShowAlternativeForm(null)}
                                                    disabled={loading}
                                                    className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 rounded-lg"
                                                >
                                                    Cancelar
                                                </button>
                                            </div>
                                        </div>
                                        );
                                    })()}

                                    {/* ADDITIONAL_TIME form */}
                                    {showAlternativeForm?.id === alt.id && alt.type === "ADDITIONAL_TIME" && (
                                        <div className="p-3 border-t border-blue-200 bg-blue-50 space-y-3">
                                            <label className="block text-sm font-medium text-gray-700">Quanto tempo adicional você precisa?</label>
                                            <div className="flex gap-2 flex-wrap">
                                                {(alt.allowedsAdditionalTimeInMinutes || alt.metadata?.allowedsAdditionalTimeInMinutes || []).map((min) => (
                                                    <button
                                                        key={min}
                                                        onClick={() => setAdditionalTime(min)}
                                                        disabled={loading}
                                                        className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${
                                                            additionalTime === min
                                                                ? "bg-blue-600 text-white border-blue-600"
                                                                : "bg-white text-gray-700 border-gray-300 hover:border-blue-300"
                                                        }`}
                                                    >
                                                        +{min} min
                                                    </button>
                                                ))}
                                            </div>
                                            <label className="block text-sm font-medium text-gray-700">Motivo do atraso</label>
                                            <select
                                                value={additionalTimeReason}
                                                onChange={(e) => setAdditionalTimeReason(e.target.value)}
                                                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                                                disabled={loading}
                                            >
                                                <option value="">Selecione o motivo...</option>
                                                {(alt.allowedsAdditionalTimeReasons || alt.metadata?.allowedsAdditionalTimeReasons || []).map((r) => (
                                                    <option key={r} value={r}>
                                                        {NEGOTIATION_REASON_LABELS[r] || r}
                                                    </option>
                                                ))}
                                            </select>
                                            <p className="text-xs text-gray-500">
                                                O cliente poderá aceitar ou recusar o novo prazo de entrega.
                                            </p>
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => handleSubmitAlternative(alt)}
                                                    disabled={loading}
                                                    className="flex items-center px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50"
                                                >
                                                    {alternativeRetry.isExecuting ? (
                                                        <LoadingSpinnerDynamic size={4} className="mr-2" />
                                                    ) : (
                                                        <ArrowReload02 size={16} className="mr-1" />
                                                    )}
                                                    Enviar proposta
                                                </button>
                                                <button
                                                    onClick={() => setShowAlternativeForm(null)}
                                                    disabled={loading}
                                                    className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 rounded-lg"
                                                >
                                                    Cancelar
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Settlement info */}
                {dispute.status === "SETTLED" && dispute.settlement && (
                    <div className="border border-gray-200 rounded-lg p-3 bg-gray-50">
                        <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Resolução</p>
                        <p className="text-sm text-gray-800">
                            {dispute.settlement.status && <span className="font-medium">{STATUS_LABELS[dispute.settlement.status] || dispute.settlement.status}</span>}
                            {dispute.settlement.reason && <span className="text-gray-600"> — {dispute.settlement.reason}</span>}
                        </p>
                    </div>
                )}

                {/* ─── Action buttons ────────────────────── */}
                {canAct && (
                    <div className="flex gap-2 pt-3 border-t border-gray-100">
                        <button
                            onClick={() => setConfirmAction("accept")}
                            disabled={loading}
                            className="flex items-center px-4 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 disabled:opacity-50 font-medium"
                        >
                            <CheckboxCheck size={16} className="mr-1.5" />
                            Aceitar
                        </button>
                        <button
                            onClick={() => setConfirmAction("reject")}
                            disabled={loading}
                            className="flex items-center px-4 py-2 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 disabled:opacity-50 font-medium"
                        >
                            <CloseSm size={16} className="mr-1.5" />
                            Rejeitar
                        </button>
                    </div>
                )}

                {/* Expired notice */}
                {isPending && isExpired && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 text-center font-medium">
                        Prazo expirado — {timeoutLabel || "aguardando decisão do iFood"}
                    </div>
                )}
            </div>

            {/* ─── Accept Confirmation Modal ──────────────── */}
            <DisputeConfirmModal
                isOpen={confirmAction === "accept"}
                title="Aceitar cancelamento"
                description={
                    action === "PARTIAL_CANCELLATION"
                        ? "Ao aceitar, você concorda com o cancelamento parcial dos itens listados. O cliente será reembolsado."
                        : "Ao aceitar, você concorda com o cancelamento do pedido. O cliente será reembolsado integralmente."
                }
                variant="success"
                loading={acceptRetry.isExecuting}
                onCancel={() => { setConfirmAction(null); setAcceptReason(""); setAcceptDetailReason(""); }}
                onConfirm={handleAccept}
            >
                {acceptCancellationReasons.length > 0 && (
                    <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-700">
                            Motivo do aceite <span className="text-red-500">*</span>
                        </label>
                        <select
                            value={acceptReason}
                            onChange={(e) => setAcceptReason(e.target.value)}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-300"
                        >
                            <option value="">Selecione o motivo...</option>
                            {acceptCancellationReasons.map((r) => (
                                <option key={r} value={r}>
                                    {NEGOTIATION_REASON_LABELS[r] || r}
                                </option>
                            ))}
                        </select>
                    </div>
                )}
                <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">
                        Detalhes adicionais (opcional)
                    </label>
                    <textarea
                        value={acceptDetailReason}
                        onChange={(e) => setAcceptDetailReason(e.target.value)}
                        placeholder="Explique brevemente por que está aceitando..."
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-green-300"
                        rows={2}
                        maxLength={250}
                    />
                </div>
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-2">
                    <p className="text-xs text-yellow-800">
                        <strong>Atenção:</strong> Esta ação não pode ser desfeita. Após aceitar, o cancelamento será processado pelo iFood.
                    </p>
                </div>
            </DisputeConfirmModal>

            {/* ─── Reject Confirmation Modal ──────────────── */}
            <DisputeConfirmModal
                isOpen={confirmAction === "reject"}
                title="Rejeitar cancelamento"
                description="Ao rejeitar, o iFood irá mediar a decisão final entre você e o cliente."
                variant="danger"
                loading={rejectRetry.isExecuting}
                onCancel={() => { setConfirmAction(null); setRejectionReason(""); }}
                onConfirm={handleReject}
            >
                <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">
                        Motivo da rejeição <span className="text-red-500">*</span>
                    </label>
                    <textarea
                        value={rejectionReason}
                        onChange={(e) => setRejectionReason(e.target.value)}
                        placeholder="Ex: O pedido foi entregue corretamente conforme descrito..."
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-red-300"
                        rows={3}
                        maxLength={250}
                    />
                    <p className="text-xs text-gray-400">{rejectionReason.length}/250 caracteres</p>
                </div>
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-2">
                    <p className="text-xs text-yellow-800">
                        <strong>Atenção:</strong> O iFood analisará sua justificativa e tomará a decisão final.
                        Forneça uma explicação clara e detalhada.
                    </p>
                </div>
            </DisputeConfirmModal>
        </div>
    );
};

export default IfoodDisputeCard;
