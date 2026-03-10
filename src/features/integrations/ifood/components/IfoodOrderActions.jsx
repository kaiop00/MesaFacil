import { useState } from "react";
import { useToast } from "@/hooks/useToast";
import {
    confirmIfoodOrder,
    dispatchIfoodOrder,
    markIfoodOrderReadyToPickup,
    getIfoodCancellationReasons,
    requestIfoodOrderCancellation,
} from "../services/ifoodActionsService";
import { CheckboxCheck, Save, DownloadPackage, DeleteRow } from "react-coolicons";
import LoadingSpinnerDynamic from "@/components/LoadingSpinnerDynamic";
import { useIfoodRetry, formatRetryMessage } from "../hooks/useIfoodRetry";

/**
 * Component to display action buttons for iFood orders
 * @param {Object} props
 * @param {string} props.idRestaurante - Restaurant ID
 * @param {string} props.ifoodOrderId - iFood order ID
 * @param {string} props.currentStatus - Current iFood order status
 * @param {string} props.orderType - Order type (DELIVERY, TAKEOUT)
 * @param {Function} props.onActionComplete - Callback after action completes
 */
const IfoodOrderActions = ({ 
    idRestaurante, 
    ifoodOrderId, 
    currentStatus,
    orderType = "DELIVERY",
    onActionComplete 
}) => {
    const { notify } = useToast();
    const [showCancelModal, setShowCancelModal] = useState(false);
    const [cancellationReasons, setCancellationReasons] = useState([]);
    const [selectedReason, setSelectedReason] = useState(null);
    const [cancelReasonText, setCancelReasonText] = useState("");
    const [loadingReasons, setLoadingReasons] = useState(false);

    // Retry hooks for each action
    const confirmRetry = useIfoodRetry();
    const dispatchRetry = useIfoodRetry();
    const readyRetry = useIfoodRetry();
    const cancelRetry = useIfoodRetry();
    const reasonsRetry = useIfoodRetry();

    // Combined loading state
    const loading = confirmRetry.isExecuting || dispatchRetry.isExecuting || 
                   readyRetry.isExecuting || cancelRetry.isExecuting;

    // Determine which actions are available based on current status
    const canConfirm = currentStatus === "PLACED";
    const canDispatch = currentStatus === "CONFIRMED" && orderType === "DELIVERY";
    const canMarkReady = currentStatus === "CONFIRMED" && orderType === "TAKEOUT";
    const canCancel = ["PLACED", "CONFIRMED", "CANCELLATION_REQUEST_FAILED"].includes(currentStatus);
    const isCancellationRequested = currentStatus === "CANCELLATION_REQUESTED";
    const isCancellationFailed = currentStatus === "CANCELLATION_REQUEST_FAILED";

    const handleConfirm = async () => {
        if (!confirm("Confirmar o recebimento deste pedido no iFood?")) return;

        try {
            await confirmRetry.executeWithRetry(
                () => confirmIfoodOrder(idRestaurante, ifoodOrderId),
                {
                    actionName: "confirmação do pedido",
                    onSuccess: () => {
                        notify("Pedido confirmado com sucesso no iFood", "success");
                        if (onActionComplete) onActionComplete();
                    },
                    onRetry: ({ attempt, maxAttempts, nextAttemptIn }) => {
                        notify(
                            `Tentativa ${attempt}/${maxAttempts} falhou. Reenviando em ${nextAttemptIn}s...`,
                            "warning"
                        );
                    },
                    onError: (error) => {
                        notify(error.message || "Erro ao confirmar pedido", "error");
                    },
                }
            );
        } catch (error) {
            console.error("Error confirming order:", error);
        }
    };

    const handleDispatch = async () => {
        if (!confirm("Marcar este pedido como despachado/saiu para entrega?")) return;

        try {
            await dispatchRetry.executeWithRetry(
                () => dispatchIfoodOrder(idRestaurante, ifoodOrderId),
                {
                    actionName: "despacho do pedido",
                    onSuccess: () => {
                        notify("Pedido despachado com sucesso", "success");
                        if (onActionComplete) onActionComplete();
                    },
                    onRetry: ({ attempt, maxAttempts, nextAttemptIn }) => {
                        notify(
                            `Tentativa ${attempt}/${maxAttempts} falhou. Reenviando em ${nextAttemptIn}s...`,
                            "warning"
                        );
                    },
                    onError: (error) => {
                        notify(error.message || "Erro ao despachar pedido", "error");
                    },
                }
            );
        } catch (error) {
            console.error("Error dispatching order:", error);
        }
    };

    const handleMarkReady = async () => {
        if (!confirm("Marcar este pedido como pronto para retirada?")) return;

        try {
            await readyRetry.executeWithRetry(
                () => markIfoodOrderReadyToPickup(idRestaurante, ifoodOrderId),
                {
                    actionName: "marcação do pedido como pronto",
                    onSuccess: () => {
                        notify("Pedido marcado como pronto para retirada", "success");
                        if (onActionComplete) onActionComplete();
                    },
                    onRetry: ({ attempt, maxAttempts, nextAttemptIn }) => {
                        notify(
                            `Tentativa ${attempt}/${maxAttempts} falhou. Reenviando em ${nextAttemptIn}s...`,
                            "warning"
                        );
                    },
                    onError: (error) => {
                        notify(error.message || "Erro ao marcar pedido como pronto", "error");
                    },
                }
            );
        } catch (error) {
            console.error("Error marking order ready:", error);
        }
    };

    const handleOpenCancelModal = async () => {
        setShowCancelModal(true);
        setLoadingReasons(true);
        
        try {
            await reasonsRetry.executeWithRetry(
                () => getIfoodCancellationReasons(idRestaurante, ifoodOrderId),
                {
                    actionName: "busca de motivos de cancelamento",
                    onSuccess: (result) => {
                        setCancellationReasons(result.reasons || []);
                        if (result.reasons && result.reasons.length > 0) {
                            setSelectedReason(result.reasons[0].code);
                        }
                        setLoadingReasons(false);
                    },
                    onRetry: ({ attempt, maxAttempts, nextAttemptIn }) => {
                        notify(
                            `Tentativa ${attempt}/${maxAttempts} falhou. Reenviando em ${nextAttemptIn}s...`,
                            "warning"
                        );
                    },
                    onError: (error) => {
                        console.error("Error fetching cancellation reasons:", error);
                        notify("Erro ao buscar motivos de cancelamento", "error");
                        setShowCancelModal(false);
                        setLoadingReasons(false);
                    },
                }
            );
        } catch (error) {
            setLoadingReasons(false);
        }
    };

    const handleCancelOrder = async () => {
        if (!selectedReason) {
            notify("Selecione um motivo de cancelamento", "warning");
            return;
        }

        try {
            await cancelRetry.executeWithRetry(
                () => requestIfoodOrderCancellation(
                    idRestaurante, 
                    ifoodOrderId, 
                    selectedReason,
                    cancelReasonText
                ),
                {
                    actionName: "cancelamento do pedido",
                    onSuccess: () => {
                        notify("Cancelamento solicitado com sucesso", "success");
                        setShowCancelModal(false);
                        if (onActionComplete) onActionComplete();
                    },
                    onRetry: ({ attempt, maxAttempts, nextAttemptIn }) => {
                        notify(
                            `Tentativa ${attempt}/${maxAttempts} falhou. Reenviando em ${nextAttemptIn}s...`,
                            "warning"
                        );
                    },
                    onError: (error) => {
                        notify(error.message || "Erro ao cancelar pedido", "error");
                    },
                }
            );
        } catch (error) {
            console.error("Error cancelling order:", error);
        }
    };

    // Don't show anything if no actions are available
    if (!canConfirm && !canDispatch && !canMarkReady && !canCancel && !isCancellationRequested && !isCancellationFailed) {
        return null;
    }

    return (
        <div className="mt-3 space-y-2">
            <div className="border-t border-orange-200 pt-3">
                <p className="text-xs text-orange-700 mb-2 font-medium">Ações do Pedido:</p>
                
                {/* Cancellation Requested Banner — waiting for iFood response */}
                {isCancellationRequested && (
                    <div className="mb-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-800">
                        Cancelamento solicitado
                    </div>
                )}

                {/* Cancellation Request Failed Banner — iFood denied the request */}
                {isCancellationFailed && (
                    <div className="mb-2 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-800">
                        ❌ Cancelamento recusado pelo iFood — o pedido continua ativo. Você pode tentar cancelar novamente.
                    </div>
                )}
                
                {/* Retry Status Banner */}
                {(confirmRetry.isRetrying || dispatchRetry.isRetrying || readyRetry.isRetrying || cancelRetry.isRetrying) && (
                    <div className="mb-2 p-2 bg-orange-50 border border-orange-200 rounded text-xs text-orange-700">
                        <div className="flex items-center gap-2">
                            <LoadingSpinnerDynamic size={3} />
                            <span>
                                {confirmRetry.isRetrying && `Confirmando... Tentativa ${confirmRetry.currentAttempt}/${confirmRetry.maxAttempts}. Próxima em ${confirmRetry.countdown}s`}
                                {dispatchRetry.isRetrying && `Despachando... Tentativa ${dispatchRetry.currentAttempt}/${dispatchRetry.maxAttempts}. Próxima em ${dispatchRetry.countdown}s`}
                                {readyRetry.isRetrying && `Marcando pronto... Tentativa ${readyRetry.currentAttempt}/${readyRetry.maxAttempts}. Próxima em ${readyRetry.countdown}s`}
                                {cancelRetry.isRetrying && `Cancelando... Tentativa ${cancelRetry.currentAttempt}/${cancelRetry.maxAttempts}. Próxima em ${cancelRetry.countdown}s`}
                            </span>
                        </div>
                    </div>
                )}
                
                <div className="flex flex-wrap gap-2">
                    {canConfirm && (
                        <button
                            onClick={handleConfirm}
                            disabled={loading || confirmRetry.isRetrying}
                            className="flex items-center gap-1 px-3 py-1.5 bg-green-600 text-white text-sm rounded hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {confirmRetry.isExecuting ? (
                                <LoadingSpinnerDynamic size={4} />
                            ) : (
                                <CheckboxCheck size={16} />
                            )}
                            {confirmRetry.isRetrying ? `Aguardando (${confirmRetry.countdown}s)` : "Confirmar"}
                        </button>
                    )}

                    {canDispatch && (
                        <button
                            onClick={handleDispatch}
                            disabled={loading || dispatchRetry.isRetrying}
                            className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {dispatchRetry.isExecuting ? (
                                <LoadingSpinnerDynamic size={4} />
                            ) : (
                                <Save size={16} />
                            )}
                            {dispatchRetry.isRetrying ? `Aguardando (${dispatchRetry.countdown}s)` : "Despachar"}
                        </button>
                    )}

                    {canMarkReady && (
                        <button
                            onClick={handleMarkReady}
                            disabled={loading || readyRetry.isRetrying}
                            className="flex items-center gap-1 px-3 py-1.5 bg-purple-600 text-white text-sm rounded hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {readyRetry.isExecuting ? (
                                <LoadingSpinnerDynamic size={4} />
                            ) : (
                                <DownloadPackage size={16} />
                            )}
                            {readyRetry.isRetrying ? `Aguardando (${readyRetry.countdown}s)` : "Pronto"}
                        </button>
                    )}

                    {canCancel && (
                        <button
                            onClick={handleOpenCancelModal}
                            disabled={loading}
                            className="flex items-center gap-1 px-3 py-1.5 bg-red-600 text-white text-sm rounded hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? (
                                <LoadingSpinnerDynamic size={4} />
                            ) : (
                                <DeleteRow size={16} />
                            )}
                            Cancelar
                        </button>
                    )}
                </div>
            </div>

            {/* Cancel Modal */}
            {showCancelModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
                    <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
                        <h3 className="text-lg font-semibold mb-4">Cancelar Pedido iFood</h3>
                        
                        {loadingReasons ? (
                            <div className="flex justify-center py-8">
                                <LoadingSpinnerDynamic size={8} />
                            </div>
                        ) : (
                            <>
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Motivo do Cancelamento *
                                        </label>
                                        <select
                                            value={selectedReason || ""}
                                            onChange={(e) => setSelectedReason(e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-red-500"
                                        >
                                            {cancellationReasons.map((reason) => (
                                                <option key={reason.code} value={reason.code}>
                                                    {reason.description || reason.code}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Detalhes Adicionais (opcional)
                                        </label>
                                        <textarea
                                            value={cancelReasonText}
                                            onChange={(e) => setCancelReasonText(e.target.value)}
                                            placeholder="Ex: Item não disponível no momento"
                                            rows={3}
                                            className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-red-500"
                                        />
                                    </div>

                                    <div className="bg-yellow-50 border border-yellow-200 rounded p-3">
                                        <p className="text-xs text-yellow-800">
                                            ⚠️ Atenção: O cancelamento será enviado ao iFood e não poderá ser desfeito.
                                        </p>
                                    </div>
                                    
                                    {/* Retry Status in Modal */}
                                    {cancelRetry.isRetrying && (
                                        <div className="bg-orange-50 border border-orange-200 rounded p-3">
                                            <div className="flex items-center gap-2 text-xs text-orange-700">
                                                <LoadingSpinnerDynamic size={3} />
                                                <span>
                                                    Tentativa {cancelRetry.currentAttempt}/{cancelRetry.maxAttempts}. 
                                                    Próxima tentativa em {cancelRetry.countdown}s...
                                                </span>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <div className="flex gap-3 mt-6">
                                    <button
                                        onClick={() => setShowCancelModal(false)}
                                        disabled={cancelRetry.isExecuting}
                                        className="flex-1 px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 disabled:opacity-50"
                                    >
                                        Voltar
                                    </button>
                                    <button
                                        onClick={handleCancelOrder}
                                        disabled={cancelRetry.isExecuting || !selectedReason}
                                        className="flex-1 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {cancelRetry.isRetrying 
                                            ? `Aguardando (${cancelRetry.countdown}s)...` 
                                            : cancelRetry.isExecuting 
                                                ? "Cancelando..." 
                                                : "Confirmar Cancelamento"}
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default IfoodOrderActions;
