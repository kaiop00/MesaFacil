import { useState } from "react";
import { useIfoodRetry } from "../hooks/useIfoodRetry";
import LoadingSpinnerDynamic from "@/components/LoadingSpinnerDynamic";

/**
 * A button component that automatically handles iFood request retries
 * Shows loading state, countdown timer, and retry information
 * 
 * @param {Object} props
 * @param {Function} props.onClick - The async function to execute when clicked
 * @param {Function} props.onSuccess - Callback on success
 * @param {Function} props.onError - Callback on error (receives the error)
 * @param {string} props.actionName - Name of the action for error messages
 * @param {string} props.children - Button text/content
 * @param {string} props.className - Additional CSS classes
 * @param {string} props.loadingText - Text to show while loading (optional)
 * @param {boolean} props.disabled - Whether the button is disabled
 * @param {React.ReactNode} props.icon - Icon to show in the button
 * @param {boolean} props.showConfirm - Whether to show confirmation dialog before executing
 * @param {string} props.confirmMessage - Confirmation message to show
 */
const IfoodRetryableButton = ({
    onClick,
    onSuccess,
    onError,
    actionName = "operação",
    children,
    className = "",
    loadingText,
    disabled = false,
    icon,
    showConfirm = false,
    confirmMessage = "Tem certeza que deseja continuar?",
    ...rest
}) => {
    const {
        isExecuting,
        isRetrying,
        currentAttempt,
        countdown,
        maxAttempts,
        executeWithRetry,
    } = useIfoodRetry();

    const [showRetryInfo, setShowRetryInfo] = useState(false);

    const handleClick = async () => {
        if (showConfirm && !confirm(confirmMessage)) {
            return;
        }

        setShowRetryInfo(false);

        try {
            await executeWithRetry(onClick, {
                actionName,
                onSuccess: (result) => {
                    setShowRetryInfo(false);
                    if (onSuccess) onSuccess(result);
                },
                onRetry: () => {
                    setShowRetryInfo(true);
                },
                onError: (error) => {
                    setShowRetryInfo(true);
                    if (onError) onError(error);
                },
            });
        } catch {
            // Error already handled via onError callback
        }
    };

    const isDisabled = disabled || isExecuting;
    // Determine what to display
    const getButtonContent = () => {
        if (isRetrying && countdown > 0) {
            return (
                <span className="flex items-center gap-2">
                    <LoadingSpinnerDynamic size={4} />
                    <span>Reenviando em {countdown}s...</span>
                </span>
            );
        }
        
        if (isExecuting) {
            return (
                <span className="flex items-center gap-2">
                    <LoadingSpinnerDynamic size={4} />
                    <span>{loadingText || children}</span>
                </span>
            );
        }

        return (
            <span className="flex items-center gap-1">
                {icon}
                {children}
            </span>
        );
    };

    return (
        <div className="inline-flex flex-col">
            <button
                onClick={handleClick}
                disabled={isDisabled}
                className={`${className} disabled:opacity-50 disabled:cursor-not-allowed`}
                {...rest}
            >
                {getButtonContent()}
            </button>
            
            {/* Retry Info Banner */}
            {isRetrying && (
                <div className="mt-1 text-xs text-orange-600 bg-orange-50 px-2 py-1 rounded">
                    <span className="font-medium">
                        Tentativa {currentAttempt}/{maxAttempts}
                    </span>
                    {countdown > 0 && (
                        <span className="ml-1">
                            - Próxima tentativa em {countdown}s
                        </span>
                    )}
                </div>
            )}
            
            {/* Final Error Message */}
            {showRetryInfo && !isExecuting && currentAttempt === 0 && (
                <div className="mt-1 text-xs text-red-600 bg-red-50 px-2 py-1 rounded">
                    A API do iFood pode estar instável. Tente novamente mais tarde.
                </div>
            )}
        </div>
    );
};

export default IfoodRetryableButton;
