import { useState, useCallback, useRef, useEffect } from "react";

/**
 * Configuration for the retry mechanism
 */
const RETRY_CONFIG = {
    maxAttempts: 3,
    delayMs: 20000, // 20 seconds between retries
};

/**
 * Check if an error is retryable (403, INTERNAL, etc.)
 * @param {Error} error - The error to check
 * @returns {boolean} - True if the error is retryable
 */
const isRetryableError = (error) => {
    const errorMessage = error?.message?.toLowerCase() || "";
    const errorCode = error?.code?.toLowerCase() || "";
    
    return (
        errorMessage.includes("403") ||
        errorMessage.includes("forbidden") ||
        errorMessage.includes("internal") ||
        errorMessage.includes("access denied") ||
        errorMessage.includes("temporarily unavailable") ||
        errorCode.includes("internal") ||
        errorCode.includes("unavailable")
    );
};

/**
 * Hook for handling retryable iFood requests
 * Automatically retries requests that fail with 403/INTERNAL errors
 * 
 * @returns {Object} - Object with retry state and executeWithRetry function
 */
export const useIfoodRetry = () => {
    const [isExecuting, setIsExecuting] = useState(false);
    const [currentAttempt, setCurrentAttempt] = useState(0);
    const [countdown, setCountdown] = useState(0);
    const [lastError, setLastError] = useState(null);
    const [isRetrying, setIsRetrying] = useState(false);
    
    const countdownIntervalRef = useRef(null);
    const isCancelledRef = useRef(false);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (countdownIntervalRef.current) {
                clearInterval(countdownIntervalRef.current);
            }
            isCancelledRef.current = true;
        };
    }, []);

    /**
     * Start countdown timer
     * @param {number} seconds - Seconds to count down
     * @returns {Promise} - Resolves when countdown is complete
     */
    const startCountdown = useCallback((seconds) => {
        return new Promise((resolve) => {
            setCountdown(seconds);
            
            countdownIntervalRef.current = setInterval(() => {
                setCountdown((prev) => {
                    if (prev <= 1) {
                        clearInterval(countdownIntervalRef.current);
                        countdownIntervalRef.current = null;
                        resolve();
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
        });
    }, []);

    /**
     * Cancel the current operation and retry sequence
     */
    const cancel = useCallback(() => {
        isCancelledRef.current = true;
        if (countdownIntervalRef.current) {
            clearInterval(countdownIntervalRef.current);
            countdownIntervalRef.current = null;
        }
        setIsExecuting(false);
        setIsRetrying(false);
        setCurrentAttempt(0);
        setCountdown(0);
    }, []);

    /**
     * Execute a function with automatic retry logic
     * @param {Function} fn - The async function to execute
     * @param {Object} options - Options for the execution
     * @param {Function} options.onSuccess - Callback on success
     * @param {Function} options.onError - Callback on final error (after all retries)
     * @param {Function} options.onRetry - Callback when a retry is scheduled
     * @param {string} options.actionName - Name of the action (for error messages)
     * @returns {Promise<any>} - The result of the function or throws error
     */
    const executeWithRetry = useCallback(async (fn, options = {}) => {
        const { onSuccess, onError, onRetry, actionName = "operação" } = options;
        
        isCancelledRef.current = false;
        setIsExecuting(true);
        setLastError(null);
        setCurrentAttempt(1);
        setIsRetrying(false);

        let attempt = 1;

        while (attempt <= RETRY_CONFIG.maxAttempts) {
            if (isCancelledRef.current) {
                setIsExecuting(false);
                throw new Error("Operação cancelada");
            }

            setCurrentAttempt(attempt);
            
            try {
                const result = await fn();
                setIsExecuting(false);
                setIsRetrying(false);
                setCurrentAttempt(0);
                
                if (onSuccess) {
                    onSuccess(result);
                }
                
                return result;
            } catch (error) {
                console.error(`[useIfoodRetry] Attempt ${attempt} failed:`, error);
                setLastError(error);
                
                // Check if we should retry
                if (attempt < RETRY_CONFIG.maxAttempts && isRetryableError(error)) {
                    setIsRetrying(true);
                    
                    if (onRetry) {
                        onRetry({
                            attempt,
                            maxAttempts: RETRY_CONFIG.maxAttempts,
                            nextAttemptIn: RETRY_CONFIG.delayMs / 1000,
                            error,
                        });
                    }
                    
                    // Wait for the countdown
                    await startCountdown(RETRY_CONFIG.delayMs / 1000);
                    
                    if (isCancelledRef.current) {
                        setIsExecuting(false);
                        throw new Error("Operação cancelada");
                    }
                    
                    attempt++;
                    setIsRetrying(false);
                } else {
                    // No more retries or non-retryable error
                    setIsExecuting(false);
                    setIsRetrying(false);
                    setCurrentAttempt(0);
                    
                    if (onError) {
                        const finalError = attempt >= RETRY_CONFIG.maxAttempts && isRetryableError(error)
                            ? new Error(`Não foi possível completar a ${actionName} após ${RETRY_CONFIG.maxAttempts} tentativas. A API do iFood pode estar instável. Tente novamente mais tarde.`)
                            : error;
                        onError(finalError);
                    }
                    
                    throw error;
                }
            }
        }
    }, [startCountdown]);

    /**
     * Reset the state
     */
    const reset = useCallback(() => {
        cancel();
        setLastError(null);
    }, [cancel]);

    return {
        // State
        isExecuting,
        isRetrying,
        currentAttempt,
        countdown,
        lastError,
        maxAttempts: RETRY_CONFIG.maxAttempts,
        
        // Actions
        executeWithRetry,
        cancel,
        reset,
    };
};

/**
 * Format the retry status message
 * @param {Object} state - The state from useIfoodRetry
 * @returns {string|null} - The formatted message or null
 */
export const formatRetryMessage = (state) => {
    const { isRetrying, currentAttempt, countdown, maxAttempts } = state;
    
    if (!isRetrying) return null;
    
    return `Tentativa ${currentAttempt} de ${maxAttempts} falhou. Reenviando em ${countdown}s...`;
};

export default useIfoodRetry;
