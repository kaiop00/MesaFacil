import { Clock, CheckboxCheck, TriangleWarning, ArrowRightSm } from "react-coolicons";
import { formatIfoodStatus } from "@/features/integrations/ifood/services/ifoodStatusSyncService";

/**
 * Component to display iFood order status history timeline
 */
const IfoodStatusHistory = ({ statusHistory, currentStatus }) => {
    if (!statusHistory || statusHistory.length === 0) {
        return null;
    }

    // Sort history by timestamp (most recent first)
    const sortedHistory = [...statusHistory].sort((a, b) => {
        const timeA = a.changedAt?.toDate?.() || new Date(a.changedAt || 0);
        const timeB = b.changedAt?.toDate?.() || new Date(b.changedAt || 0);
        return timeB - timeA;
    });

    return (
        <div className="mt-3 pt-3 border-t border-orange-200">
            <div className="flex items-center gap-2 mb-2">
                <Clock className="text-orange-600" size={16} />
                <span className="text-sm font-semibold text-orange-900">
                    Histórico de Status
                </span>
            </div>
            
            <div className="space-y-2">
                {sortedHistory.map((entry, index) => {
                    const isCurrentStatus = entry.status === currentStatus;
                    const timestamp = entry.changedAt?.toDate?.() || new Date(entry.changedAt);
                    const timeStr = timestamp.toLocaleString('pt-BR', {
                        day: '2-digit',
                        month: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit'
                    });

                    return (
                        <div 
                            key={index} 
                            className={`flex items-start gap-2 text-sm ${
                                isCurrentStatus ? 'font-semibold' : ''
                            }`}
                        >
                            {isCurrentStatus ? (
                                <CheckboxCheck className="text-green-600 mt-0.5 flex-shrink-0" size={16} />
                            ) : entry.status === 'CANCELLED' ? (
                                <TriangleWarning className="text-red-600 mt-0.5 flex-shrink-0" size={16} />
                            ) : (
                                <ArrowRightSm className="text-gray-400 mt-0.5 flex-shrink-0" size={16} />
                            )}
                            
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between gap-2">
                                    <span className={`truncate ${
                                        isCurrentStatus ? 'text-green-700' : 'text-gray-700'
                                    }`}>
                                        {formatIfoodStatus(entry.status)}
                                    </span>
                                    <span className="text-xs text-gray-500 whitespace-nowrap">
                                        {timeStr}
                                    </span>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default IfoodStatusHistory;
