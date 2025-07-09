import { CircleWarning, CloseLg } from "react-coolicons";
import LoadingSpinner from "@/components/LoadingSpinner";
import { useState } from "react";

export default function ConfirmModal({
    isOpen,
    onConfirm,
    onCancel,
    title,
    message,
}) {
    const [loadingConfirm, setLoadingConfirm] = useState(false);

    if (!isOpen) return null;

    const handleConfirm = async () => {
        setLoadingConfirm(true);
        await onConfirm();
        setLoadingConfirm(false);
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
            <div className="bg-white rounded-lg shadow-lg max-w-md w-full">
                <div className="flex items-center  justify-between p-4 border-b border-gray-200">
                    <div className="flex items-center gap-3">
                        <div className="bg-yellow-50 p-2 rounded-full">
                            <CircleWarning className="text-yellow-500 w-5 h-5" />
                        </div>
                        <h2 className="text-base font-semibold text-gray-900">{title}</h2>
                    </div>
                    <button onClick={onCancel}>
                        <CloseLg className="w-5 h-5 text-#7489A6 cursor-pointer" />
                    </button>
                </div>
                <div className="px-6 py-4 border-b border-gray-200">
                    <p className="text-sm text-gray-700">
                        {message}
                    </p>
                </div>
                <div className="flex justify-between gap-3 px-6 py-4">
                    <button
                        onClick={onCancel}
                        className="px-5 py-3 text-sm rounded-md bg-gray-100 cursor-pointer"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleConfirm}
                        className="px-5 py-3 text-sm rounded-md bg-primary-dynamic text-white cursor-pointer"
                    >
                        {loadingConfirm ? (
                            <LoadingSpinner size={4}/>
                        ) : (
                            "Confirmar"
                        )
                        }
                    </button>
                </div>
            </div>
        </div>
    );
}
